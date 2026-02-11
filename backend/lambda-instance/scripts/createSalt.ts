import { SecretKeyManager } from '../crypto';

const main = async () => {
  const region = process.argv[2];
  const saltPath = '/common/salt';

  if (!region) {
    console.error('❌ Error: Region is required');
    console.error('');
    console.error('Usage:');
    console.error('  npm run create-salt -- <REGION> [SALT_PATH]');
    console.error('');
    console.error('Examples:');
    console.error('  npm run create-salt -- ap-southeast-1');
    process.exit(1);
  }

  console.log('🔐 Creating salt...');
  console.log(`Region: ${region}`);
  console.log(`Salt Path: ${saltPath}`);
  console.log('');

  const manager = new SecretKeyManager({
    region,
    DEFAULT_PATH: '/dummy', // Not used for salt creation
    SALT_PATH: saltPath,
  });

  try {
    const saltData = await manager.createSalt();
    console.log('');
    console.log('✅ Salt creation completed!');
    console.log('');
    console.log('⚠️  IMPORTANT: Save SALT1 securely!');
    console.log('   You need SALT1 to encrypt secrets.');
    console.log('');
    console.log('Salt data:');
    console.log(JSON.stringify(saltData, null, 2));
  } catch (error: any) {
    console.error('❌ Error creating salt:', error.message);
    process.exit(1);
  }
};

main();

