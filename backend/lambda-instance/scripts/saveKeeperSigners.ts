import * as fs from 'fs';
import { SecretKeyManager } from '../crypto';

const KEEPER_KEYS = [
  'KP_OPTIONS_MARKET',
  'KP_POSITION_PROCESSOR',
  'KP_SETTLE_OPERATOR',
  'KP_PV_FEEDER',
  'KP_SPOT_FEEDER',
  'KP_FEE_DISTRIBUTOR',
  'KP_CLEARING_HOUSE',
  'KP_OLP_PROCESSOR',
] as const;

interface KeeperSignersData {
  [key: string]: string;
}

const loadDataFromEnvFile = (): KeeperSignersData => {
  const envFiles = ['.env.keepers'];
  let envFile: string | null = null;
  
  for (const file of envFiles) {
    if (fs.existsSync(file)) {
      envFile = file;
      break;
    }
  }
  
  if (!envFile) {
    throw new Error('No .env file found. Create .env file with keeper signer keys.');
  }
  
  // Check file permissions (should be 600 for security)
  const stats = fs.statSync(envFile);
  const mode = stats.mode & parseInt('777', 8);
  if (mode > parseInt('600', 8)) {
    console.warn(`⚠️  Warning: .env file permissions are ${mode.toString(8)}, should be 600 for security`);
    console.warn(`   Run: chmod 600 ${envFile}`);
  }
  
  const content = fs.readFileSync(envFile, 'utf-8');
  const data: KeeperSignersData = {};
  
  // Parse .env file (key=value format)
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const equalIndex = trimmed.indexOf('=');
    if (equalIndex === -1) continue;
    
    const key = trimmed.substring(0, equalIndex).trim();
    const value = trimmed.substring(equalIndex + 1).trim().replace(/^["']|["']$/g, '');
    
    if (KEEPER_KEYS.includes(key as any)) {
      data[key] = value;
    }
  }
  
  // Validate that all required keys exist (allow empty string)
  const missingKeys = KEEPER_KEYS.filter(key => {
    const value = data[key];
    return value === undefined || value === null;
  });
  
  if (missingKeys.length > 0) {
    throw new Error(`Missing required keys in ${envFile}: ${missingKeys.join(', ')}\n   Use empty string "" for values not yet set.`);
  }
  
  // Warn about empty values
  const emptyKeys = KEEPER_KEYS.filter(key => data[key] === '');
  
  if (emptyKeys.length > 0) {
    console.warn(`⚠️  Warning: Found empty values for: ${emptyKeys.join(', ')}`);
    console.warn('   These will be saved but may not work in production.');
  }
  
  return data;
};

const main = async () => {
  const region = process.argv[2];
  const secretPath = process.argv[3];

  if (!region || !secretPath) {
    console.error('❌ Error: Both region and secret path are required');
    console.error('');
    console.error('Usage:');
    console.error('  npm run save-keeper-signers -- <REGION> <SECRET_PATH>');
    console.error('');
    console.error('Examples:');
    console.error('  npm run save-keeper-signers -- ap-southeast-1 /dev/base');
    console.error('  npm run save-keeper-signers -- ap-southeast-1 /prod/base');
    console.error('  npm run save-keeper-signers -- ap-southeast-1 /dev/arbitrumOne');
    process.exit(1);
  }

  console.log('🔐 Saving keeper signers...');
  console.log(`Region: ${region}`);
  console.log(`Secret Path: ${secretPath}`);
  console.log(`Key Name: keeper_signers`);
  console.log('');

  // Load from .env file
  console.log('📁 Loading from .env file...');
  const keeperData = loadDataFromEnvFile();
  
  console.log('Keys loaded:');
  KEEPER_KEYS.forEach(key => {
    const value = keeperData[key];
    const displayValue = value === '' 
      ? '(empty)' 
      : `${value.substring(0, 6)}...${value.substring(value.length - 4)}`;
    console.log(`  ✓ ${key}: ${displayValue}`);
  });
  console.log('');

  // Save to Secrets Manager
  const manager = new SecretKeyManager({
    region,
    DEFAULT_PATH: secretPath,
  });

  try {
    await manager.encryptAndSave({
      keyName: 'keeper_signers',
      data: keeperData,
    });
    console.log('✅ Keeper signers saved successfully!');
    console.log(`   Path: ${secretPath}keeper_signers`);
    console.log('');
    console.log('🔒 Keys are now encrypted and stored securely in AWS Secrets Manager');
  } catch (error: any) {
    console.error('');
    console.error('❌ Error saving keeper signers:', error.message);
    process.exit(1);
  }
};

main();
