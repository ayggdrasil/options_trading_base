import { SecretKeyManager } from '../crypto';

const maskValue = (value: string, showFull: boolean = false): string => {
  if (showFull) {
    return value;
  }
  if (value.length <= 10) {
    return '***';
  }
  return `${value.substring(0, 6)}...${value.substring(value.length - 4)}`;
};

const main = async () => {
  const region = process.argv[2];
  const secretPath = process.argv[3];
  const keyName = process.argv[4];
  const showFull = process.argv.includes('--full') || process.argv.includes('-f');

  if (!region || !secretPath || !keyName) {
    console.error('❌ Error: Region, secret path, and key name are required');
    console.error('');
    console.error('Usage:');
    console.error('  npm run read-secret -- <REGION> <SECRET_PATH> <KEY_NAME> [--full]');
    console.error('');
    console.error('Options:');
    console.error('  --full, -f    Show full values (use with caution)');
    console.error('');
    console.error('Examples:');
    console.error('  npm run read-secret -- ap-southeast-1 /dev/base/ keeper_signers');
    console.error('  npm run read-secret -- ap-southeast-1 /dev/base/ app_lambda_requirements');
    console.error('  npm run read-secret -- ap-southeast-1 /dev/base/ keeper_signers --full');
    process.exit(1);
  }

  if (showFull) {
    console.warn('⚠️  WARNING: Showing full secret values!');
    console.warn('   Make sure you are in a secure environment.');
    console.warn('   Do not share or log these values.');
    console.log('');
  }

  console.log('🔍 Reading secret...');
  console.log(`Region: ${region}`);
  console.log(`Secret Path: ${secretPath}`);
  console.log(`Key Name: ${keyName}`);
  console.log('');

  const manager = new SecretKeyManager({
    region,
    DEFAULT_PATH: secretPath,
  });

  try {
    const decrypted = await manager.decrypt({ keyName });
    const data = JSON.parse(decrypted);

    console.log(`✅ Secret loaded successfully!`);
    console.log(`   Path: ${secretPath}${keyName}`);
    console.log('');
    console.log('📋 Secret values:');
    console.log('');

    const keys = Object.keys(data).sort();
    keys.forEach(key => {
      const value = data[key];
      const displayValue = maskValue(value, showFull);
      console.log(`  ${key}: ${displayValue}`);
    });

    console.log('');
    if (!showFull) {
      console.log('💡 Tip: Use --full flag to see complete values (use with caution)');
    }
    console.log('🔒 Values are decrypted from AWS Secrets Manager');
  } catch (error: any) {
    console.error('');
    console.error('❌ Error reading secret:', error.message);
    if (error.message.includes('ResourceNotFoundException')) {
      console.error('   Secret may not exist at the specified path.');
    }
    process.exit(1);
  }
};

main();

