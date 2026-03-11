/**
 * Configure R2 CORS
 * =================
 * Sets CORS rules on the R2 bucket to allow browser uploads from sswanstudios.com.
 * Run once: node backend/scripts/configure-r2-cors.mjs
 */
import { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME,
} = process.env;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
  console.error('Missing R2 env vars. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME');
  process.exit(1);
}

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const CORS_RULES = [
  {
    AllowedOrigins: [
      'https://sswanstudios.com',
      'https://www.sswanstudios.com',
      'http://localhost:5173',
      'http://localhost:3000',
    ],
    AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
    AllowedHeaders: ['*'],
    ExposeHeaders: ['ETag', 'Content-Length', 'Content-Type'],
    MaxAgeSeconds: 3600,
  },
];

async function main() {
  console.log(`Configuring CORS for R2 bucket: ${R2_BUCKET_NAME}`);
  console.log('Allowed origins:', CORS_RULES[0].AllowedOrigins.join(', '));

  try {
    await client.send(new PutBucketCorsCommand({
      Bucket: R2_BUCKET_NAME,
      CORSConfiguration: { CORSRules: CORS_RULES },
    }));
    console.log('CORS rules applied successfully!');
  } catch (err) {
    console.error('Failed to set CORS:', err.message);
    console.log('\nIf this fails, set CORS manually in the Cloudflare R2 dashboard:');
    console.log('  1. Go to Cloudflare Dashboard → R2 → Your Bucket → Settings');
    console.log('  2. Under CORS Policy, add:');
    console.log(JSON.stringify(CORS_RULES, null, 2));
    process.exit(1);
  }

  // Verify
  try {
    const result = await client.send(new GetBucketCorsCommand({ Bucket: R2_BUCKET_NAME }));
    console.log('\nCurrent CORS rules:');
    console.log(JSON.stringify(result.CORSRules, null, 2));
  } catch (err) {
    console.log('Could not verify CORS (may be expected):', err.message);
  }
}

main();
