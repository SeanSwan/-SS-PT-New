// backend/scripts/create-comprehensive-env.mjs
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function createComprehensiveEnv() {
  console.log('🔧 Creating comprehensive .env file with MongoDB support...\n');
  
  // Path to the original .env file in SS-PT folder
  const originalEnvPath = path.resolve(__dirname, '../../.env');
  // Path where the new .env file will be created (backend directory)
  const newEnvPath = path.resolve(__dirname, '../.env');
  
  try {
    // Read the original .env file
    console.log('📖 Reading original .env file...');
    const originalContent = await readFile(originalEnvPath, 'utf8');
    console.log('✅ Original .env file found and read');
    
    // Parse the content and clean it up
    console.log('🧹 Cleaning up and organizing content...');
    const lines = originalContent.split('\n');
    const cleanedVars = {};
    const comments = [];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines
      if (!trimmedLine) continue;
      
      // Handle comments
      if (trimmedLine.startsWith('#')) {
        // Keep important comments, skip temporary ones
        if (!trimmedLine.includes('TODO') && 
            !trimmedLine.includes('TEMP') && 
            !trimmedLine.includes('TEST')) {
          comments.push(trimmedLine);
        }
        continue;
      }
      
      // Parse environment variables
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=');
        cleanedVars[key.trim()] = value.trim();
      }
    }
    
    // Add MongoDB configuration
    console.log('🍃 Adding MongoDB configuration...');
    const mongoConfig = {
      'MONGODB_URI': 'mongodb://localhost:27017/swanstudios',
      'MONGODB_HOST': 'localhost',
      'MONGODB_PORT': '27017',
      'MONGODB_DB': 'swanstudios',
      'MONGODB_FALLBACK_URI': 'mongodb://localhost:27017/swanstudios',
      'MONGODB_FALLBACK_PORT': '27017'
    };
    
    // Add MongoDB configs if they don't exist
    for (const [key, value] of Object.entries(mongoConfig)) {
      if (!cleanedVars[key]) {
        cleanedVars[key] = value;
      }
    }
    
    // Ensure all required PostgreSQL variables are present
    console.log('🗃️ Ensuring PostgreSQL configuration...');
    const pgConfig = {
      'PG_HOST': 'localhost',
      'PG_PORT': '5432',
      'PG_DB': 'swanstudios',
      'PG_USER': 'swanadmin',
      'PG_PASSWORD': 'swanadmin123'
    };
    
    for (const [key, value] of Object.entries(pgConfig)) {
      if (!cleanedVars[key] || cleanedVars[key] === '') {
        cleanedVars[key] = value;
        console.log(`  Added missing: ${key}`);
      }
    }
    
    // Organize variables by category
    console.log('📁 Organizing variables by category...');
    const organizedEnv = `# SwanStudios Environment Configuration
# Generated on ${new Date().toISOString()}
# ================================================

# Application Settings
NODE_ENV=${cleanedVars.NODE_ENV || 'development'}
PORT=${cleanedVars.PORT || '5000'}
${cleanedVars.FRONTEND_ORIGINS ? `FRONTEND_ORIGINS=${cleanedVars.FRONTEND_ORIGINS}` : ''}

# PostgreSQL Database Configuration
PG_HOST=${cleanedVars.PG_HOST}
PG_PORT=${cleanedVars.PG_PORT}
PG_DB=${cleanedVars.PG_DB}
PG_USER=${cleanedVars.PG_USER}
PG_PASSWORD=${cleanedVars.PG_PASSWORD}

# MongoDB Configuration
MONGODB_URI=${cleanedVars.MONGODB_URI}
MONGODB_HOST=${cleanedVars.MONGODB_HOST}
MONGODB_PORT=${cleanedVars.MONGODB_PORT}
MONGODB_DB=${cleanedVars.MONGODB_DB}
MONGODB_FALLBACK_URI=${cleanedVars.MONGODB_FALLBACK_URI}
MONGODB_FALLBACK_PORT=${cleanedVars.MONGODB_FALLBACK_PORT}

# Authentication & Security
${cleanedVars.JWT_SECRET ? `JWT_SECRET=${cleanedVars.JWT_SECRET}` : '# JWT_SECRET=your_jwt_secret_here'}
${cleanedVars.BCRYPT_ROUNDS ? `BCRYPT_ROUNDS=${cleanedVars.BCRYPT_ROUNDS}` : ''}

# Email Configuration
${cleanedVars.SMTP_HOST ? `SMTP_HOST=${cleanedVars.SMTP_HOST}` : ''}
${cleanedVars.SMTP_PORT ? `SMTP_PORT=${cleanedVars.SMTP_PORT}` : ''}
${cleanedVars.SMTP_USER ? `SMTP_USER=${cleanedVars.SMTP_USER}` : ''}
${cleanedVars.SMTP_PASS ? `SMTP_PASS=${cleanedVars.SMTP_PASS}` : ''}
${cleanedVars.EMAIL_FROM ? `EMAIL_FROM=${cleanedVars.EMAIL_FROM}` : ''}

# SendGrid Configuration
${cleanedVars.SENDGRID_API_KEY ? `SENDGRID_API_KEY=${cleanedVars.SENDGRID_API_KEY}` : ''}
${cleanedVars.SENDGRID_FROM_EMAIL ? `SENDGRID_FROM_EMAIL=${cleanedVars.SENDGRID_FROM_EMAIL}` : ''}

# Stripe Configuration
${cleanedVars.STRIPE_PUBLISHABLE_KEY ? `STRIPE_PUBLISHABLE_KEY=${cleanedVars.STRIPE_PUBLISHABLE_KEY}` : ''}
${cleanedVars.STRIPE_SECRET_KEY ? `STRIPE_SECRET_KEY=${cleanedVars.STRIPE_SECRET_KEY}` : ''}
${cleanedVars.STRIPE_WEBHOOK_SECRET ? `STRIPE_WEBHOOK_SECRET=${cleanedVars.STRIPE_WEBHOOK_SECRET}` : ''}

# Twilio Configuration
${cleanedVars.TWILIO_ACCOUNT_SID ? `TWILIO_ACCOUNT_SID=${cleanedVars.TWILIO_ACCOUNT_SID}` : ''}
${cleanedVars.TWILIO_AUTH_TOKEN ? `TWILIO_AUTH_TOKEN=${cleanedVars.TWILIO_AUTH_TOKEN}` : ''}
${cleanedVars.TWILIO_PHONE_NUMBER ? `TWILIO_PHONE_NUMBER=${cleanedVars.TWILIO_PHONE_NUMBER}` : ''}

# OpenAI Configuration
${cleanedVars.OPENAI_API_KEY ? `OPENAI_API_KEY=${cleanedVars.OPENAI_API_KEY}` : ''}

# Development Settings
${cleanedVars.AUTO_SYNC ? `AUTO_SYNC=${cleanedVars.AUTO_SYNC}` : ''}
${cleanedVars.USE_SQLITE_FALLBACK ? `USE_SQLITE_FALLBACK=${cleanedVars.USE_SQLITE_FALLBACK}` : ''}

# Additional Variables
${Object.entries(cleanedVars)
  .filter(([key]) => !key.startsWith('PG_') && 
                     !key.startsWith('MONGODB_') && 
                     !['NODE_ENV', 'PORT', 'JWT_SECRET', 'BCRYPT_ROUNDS', 
                       'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM',
                       'SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL',
                       'STRIPE_PUBLISHABLE_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET',
                       'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER',
                       'OPENAI_API_KEY', 'AUTO_SYNC', 'USE_SQLITE_FALLBACK', 'FRONTEND_ORIGINS'].includes(key))
  .map(([key, value]) => `${key}=${value}`)
  .join('\n')}

# ================================================
# End of Configuration
`;
    
    // Write the new .env file
    console.log('💾 Writing new .env file...');
    await writeFile(newEnvPath, organizedEnv);
    console.log(`✅ New .env file created at: ${newEnvPath}`);
    
    // Create a backup of the organized version
    const backupPath = path.resolve(__dirname, '../.env.comprehensive');
    await writeFile(backupPath, organizedEnv);
    console.log(`✅ Backup created at: ${backupPath}`);
    
    // Display summary
    console.log('\n📊 Summary:');
    console.log(`  📁 Original file: ${originalEnvPath}`);
    console.log(`  📁 New file: ${newEnvPath}`);
    console.log(`  📁 Backup: ${backupPath}`);
    console.log(`  📈 Variables processed: ${Object.keys(cleanedVars).length}`);
    
    // Display key configurations
    console.log('\n🔍 Key Configurations:');
    console.log('  📊 PostgreSQL:');
    console.log(`    Host: ${cleanedVars.PG_HOST}`);
    console.log(`    Database: ${cleanedVars.PG_DB}`);
    console.log(`    User: ${cleanedVars.PG_USER}`);
    console.log('  🍃 MongoDB:');
    console.log(`    URI: ${cleanedVars.MONGODB_URI}`);
    console.log(`    Host: ${cleanedVars.MONGODB_HOST}`);
    console.log(`    Database: ${cleanedVars.MONGODB_DB}`);
    
    console.log('\n🎉 Comprehensive .env file created successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Review the new .env file');
    console.log('2. Update any API keys/secrets as needed');
    console.log('3. Test the application: npm run dev');
    console.log('4. Test databases: node scripts/test-postgres-connection.mjs');
    
  } catch (error) {
    console.error('❌ Error creating comprehensive .env file:', error);
    console.log('\n🔧 Manual steps:');
    console.log('1. Locate your original .env file in the SS-PT folder');
    console.log('2. Copy it to the backend directory');
    console.log('3. Add the following MongoDB configuration:');
    console.log(`
MONGODB_URI=mongodb://localhost:27017/swanstudios
MONGODB_HOST=localhost
MONGODB_PORT=27017
MONGODB_DB=swanstudios
MONGODB_FALLBACK_URI=mongodb://localhost:27017/swanstudios
MONGODB_FALLBACK_PORT=27017
`);
  }
}

createComprehensiveEnv().catch(console.error);