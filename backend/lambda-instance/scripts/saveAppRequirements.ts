import * as fs from 'fs';
import { SecretKeyManager } from '../crypto';

const APP_KEYS = [
  'APP_REDIS_HOST',
  'APP_REDIS_PASSWORD',
  'APP_REDIS_GLOBAL_HOST',
  'APP_REDIS_GLOBAL_PASSWORD',
  'TWITTER_CLIENT_ID',
  'TWITTER_CLIENT_SECRET',
  'TWITTER_BEARER_TOKEN',
  'GOOGLE_SPREADSHEET_ID',
  'SLACK_BOT_TOKEN',
  'SLACK_NOTIFICATION_CHANNEL_ID',
  'SLACK_ALERT_CHANNEL_ID',
  'SLACK_TRADE_CHANNEL_ID',
  'MAX_POSITION_PROCESS_ITEMS',
  'MAX_SETTLE_POSITION_PROCESS_ITEMS',
  'MAX_OLP_QUEUE_EXECUTE_ITEMS',
  'DEADLINE_SECONDS',
  'TX_SERVICE_URL',
  'IV_CURVE_BATCH_URL',
  'APP_EXECUTE_API_BASE_URL',
  'APP_URL',
  'APP_CLOUDFRONT_DISTRIBUTION_ID',
  'DUNE_API_KEY',
  'DUNE_QUERY_ID_FEES_AND_RP',
  'DUNE_QUERY_ID_NOTIONAL_VOLUME',
  'DUNE_QUERY_ID_PNL',
  'DUNE_QUERY_ID_DISTRIBUTED_ETH_REWARD',
  'DUNE_QUERY_ID_OLP_INFO',
] as const;

interface AppRequirementsData {
  [key: string]: string;
}

const loadDataFromEnvFile = (): AppRequirementsData => {
  const envFiles = ['.env.requirements'];
  let envFile: string | null = null;
  
  for (const file of envFiles) {
    if (fs.existsSync(file)) {
      envFile = file;
      break;
    }
  }
  
  if (!envFile) {
    throw new Error('No .env file found. Create .env file with app lambda requirements.');
  }
  
  // Check file permissions (should be 600 for security)
  const stats = fs.statSync(envFile);
  const mode = stats.mode & parseInt('777', 8);
  if (mode > parseInt('600', 8)) {
    console.warn(`⚠️  Warning: .env file permissions are ${mode.toString(8)}, should be 600 for security`);
    console.warn(`   Run: chmod 600 ${envFile}`);
  }
  
  const content = fs.readFileSync(envFile, 'utf-8');
  const data: AppRequirementsData = {};
  
  // Parse .env file (key=value format)
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const equalIndex = trimmed.indexOf('=');
    if (equalIndex === -1) continue;
    
    const key = trimmed.substring(0, equalIndex).trim();
    const value = trimmed.substring(equalIndex + 1).trim().replace(/^["']|["']$/g, '');
    
    if (APP_KEYS.includes(key as any)) {
      data[key] = value;
    }
  }
  
  // Validate that all required keys exist (allow empty string)
  const missingKeys = APP_KEYS.filter(key => {
    const value = data[key];
    return value === undefined || value === null;
  });
  
  if (missingKeys.length > 0) {
    throw new Error(`Missing required keys in ${envFile}: ${missingKeys.join(', ')}\n   Use empty string "" for values not yet set.`);
  }
  
  // Warn about empty values
  const emptyKeys = APP_KEYS.filter(key => data[key] === '');
  
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
    console.error('  npm run save-app-requirements -- <REGION> <SECRET_PATH>');
    console.error('');
    console.error('Examples:');
    console.error('  npm run save-app-requirements -- ap-southeast-1 /dev/base');
    console.error('  npm run save-app-requirements -- ap-southeast-1 /prod/base');
    console.error('  npm run save-app-requirements -- ap-southeast-1 /dev/arbitrumOne');
    process.exit(1);
  }

  console.log('🔐 Saving app lambda requirements...');
  console.log(`Region: ${region}`);
  console.log(`Secret Path: ${secretPath}`);
  console.log(`Key Name: app_lambda_requirements`);
  console.log('');

  // Load from .env file
  console.log('📁 Loading from .env file...');
  const appData = loadDataFromEnvFile();
  
  console.log('Keys loaded:');
  APP_KEYS.forEach(key => {
    const value = appData[key];
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
      keyName: 'app_lambda_requirements',
      data: appData,
    });
    console.log('✅ App lambda requirements saved successfully!');
    console.log(`   Path: ${secretPath}app_lambda_requirements`);
    console.log('');
    console.log('🔒 Keys are now encrypted and stored securely in AWS Secrets Manager');
  } catch (error: any) {
    console.error('');
    console.error('❌ Error saving app lambda requirements:', error.message);
    process.exit(1);
  }
};

main();

