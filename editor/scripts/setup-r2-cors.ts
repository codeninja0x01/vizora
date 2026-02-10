import { R2StorageService } from '../src/lib/r2';
import 'dotenv/config';

async function setupR2Cors() {
  console.log('🔧 Setting up R2 CORS configuration...');

  const r2 = new R2StorageService({
    bucketName: process.env.R2_BUCKET_NAME || '',
    accountId: process.env.R2_ACCOUNT_ID || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    cdn: process.env.R2_PUBLIC_DOMAIN || '',
  });

  try {
    await r2.setupCors();
    console.log('✅ CORS configuration applied successfully!');
    console.log('');
    console.log('CORS Rules:');
    console.log(
      '  - Allowed Origins:',
      process.env.ALLOWED_ORIGINS || 'http://localhost:3000 (default)'
    );
    console.log('  - Allowed Methods: GET, HEAD');
    console.log('  - Allowed Headers: * (all)');
    console.log('  - Max Age: 3600 seconds');
    console.log('');
    console.log('Your R2 bucket is now configured to allow browser requests.');
    console.log('');
    console.log(
      '💡 Tip: Set ALLOWED_ORIGINS environment variable to configure allowed origins.'
    );
    console.log(
      '   Example: ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com'
    );
  } catch (error) {
    console.error('❌ Failed to setup CORS:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    process.exit(1);
  }
}

setupR2Cors();
