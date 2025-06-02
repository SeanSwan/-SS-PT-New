// Database Connection Troubleshooting Tool
// =======================================

const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');

async function troubleshootDatabaseConnection() {
  console.log('🔍 DATABASE CONNECTION TROUBLESHOOTING');
  console.log('=' .repeat(50));
  console.log('');
  
  try {
    // 1. Check if config file exists
    const configPath = './backend/config/config.cjs';
    console.log('📋 1. Checking configuration file...');
    
    if (!fs.existsSync(configPath)) {
      console.log('❌ Configuration file not found at:', configPath);
      console.log('💡 Expected location: backend/config/config.cjs');
      return false;
    }
    
    console.log('✅ Configuration file found');
    
    // 2. Load and display config (safely)
    console.log('');
    console.log('📋 2. Loading database configuration...');
    
    let config;
    try {
      config = require(configPath).development;
      console.log('✅ Configuration loaded successfully');
      
      // Display config (hide password)
      console.log('');
      console.log('🔧 Current database configuration:');
      console.log(`   Database: ${config.database || 'NOT SET'}`);
      console.log(`   Username: ${config.username || 'NOT SET'}`);
      console.log(`   Password: ${config.password ? '***HIDDEN***' : 'NOT SET'}`);
      console.log(`   Host: ${config.host || 'localhost'}`);
      console.log(`   Port: ${config.port || '5432'}`);
      console.log(`   Dialect: ${config.dialect || 'NOT SET'}`);
      
    } catch (error) {
      console.log('❌ Error loading configuration:', error.message);
      return false;
    }
    
    // 3. Test database connection
    console.log('');
    console.log('📋 3. Testing database connection...');
    
    const sequelize = new Sequelize(config.database, config.username, config.password, {
      host: config.host,
      dialect: config.dialect,
      port: config.port,
      logging: false // Disable SQL logging for cleaner output
    });
    
    try {
      await sequelize.authenticate();
      console.log('✅ Database connection successful!');
      await sequelize.close();
      return true;
      
    } catch (error) {
      console.log('❌ Database connection failed:', error.message);
      console.log('');
      
      // Provide specific troubleshooting based on error
      if (error.message.includes('password authentication failed')) {
        console.log('🔐 PASSWORD AUTHENTICATION ERROR');
        console.log('   Possible causes:');
        console.log('   1. Incorrect password in config file');
        console.log('   2. User "swanadmin" does not exist');
        console.log('   3. Password was changed in PostgreSQL');
        console.log('');
        console.log('🔧 Solutions to try:');
        console.log('   1. Check your .env file for correct password');
        console.log('   2. Update config/config.cjs with correct credentials');
        console.log('   3. Reset PostgreSQL password for swanadmin user');
        console.log('   4. Create swanadmin user if it doesn\'t exist');
        
      } else if (error.message.includes('database') && error.message.includes('does not exist')) {
        console.log('🗄️ DATABASE DOES NOT EXIST');
        console.log('   Solution: Create the database first');
        
      } else if (error.message.includes('connection refused')) {
        console.log('🔌 CONNECTION REFUSED');
        console.log('   Possible causes:');
        console.log('   1. PostgreSQL server is not running');
        console.log('   2. Wrong host/port configuration');
        console.log('   3. Firewall blocking connection');
        
      } else if (error.message.includes('timeout')) {
        console.log('⏰ CONNECTION TIMEOUT');
        console.log('   Possible causes:');
        console.log('   1. PostgreSQL server is slow to respond');
        console.log('   2. Network connectivity issues');
        console.log('   3. Wrong host configuration');
      }
      
      await sequelize.close();
      return false;
    }
    
  } catch (error) {
    console.log('❌ Troubleshooting failed:', error.message);
    return false;
  }
}

// 4. Check environment files
async function checkEnvironmentFiles() {
  console.log('');
  console.log('📋 4. Checking environment files...');
  
  const envFiles = [
    './backend/.env',
    './.env',
    './backend/.env.local',
    './.env.local'
  ];
  
  let foundEnv = false;
  
  for (const envFile of envFiles) {
    if (fs.existsSync(envFile)) {
      console.log(`✅ Found environment file: ${envFile}`);
      foundEnv = true;
      
      try {
        const envContent = fs.readFileSync(envFile, 'utf8');
        const hasDbUrl = envContent.includes('DATABASE_URL');
        const hasDbPassword = envContent.includes('DB_PASSWORD') || envContent.includes('DATABASE_PASSWORD');
        
        console.log(`   - Contains DATABASE_URL: ${hasDbUrl ? 'Yes' : 'No'}`);
        console.log(`   - Contains DB_PASSWORD: ${hasDbPassword ? 'Yes' : 'No'}`);
        
      } catch (error) {
        console.log(`   - Error reading file: ${error.message}`);
      }
    }
  }
  
  if (!foundEnv) {
    console.log('⚠️ No environment files found');
    console.log('💡 You may need to create a .env file with database credentials');
  }
}

// Run troubleshooting
console.log('Starting database connection troubleshooting...');
console.log('');

troubleshootDatabaseConnection()
  .then(async (success) => {
    await checkEnvironmentFiles();
    
    console.log('');
    console.log('🎯 TROUBLESHOOTING SUMMARY');
    console.log('=' .repeat(30));
    
    if (success) {
      console.log('✅ Database connection is working properly!');
      console.log('🚀 You can now run the foreign key fix');
      console.log('');
      console.log('Next steps:');
      console.log('1. node fix-cancelled-by-column.cjs');
      console.log('2. cd backend && npx sequelize-cli db:migrate');
    } else {
      console.log('❌ Database connection issues found');
      console.log('');
      console.log('🔧 Recommended actions:');
      console.log('1. Check your database credentials');
      console.log('2. Ensure PostgreSQL is running');
      console.log('3. Verify database and user exist');
      console.log('4. Update config/config.cjs if needed');
      console.log('');
      console.log('🆘 Need help? Try:');
      console.log('- node database-connection-helper.cjs (creating this next)');
      console.log('- Check PostgreSQL logs for more details');
    }
  })
  .catch(error => {
    console.error('💥 Troubleshooting script error:', error.message);
  });
