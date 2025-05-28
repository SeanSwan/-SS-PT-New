// PRODUCTION DATABASE VERIFICATION SCRIPT
// Run this to check if production database has the required users and structure

import dotenv from 'dotenv';
dotenv.config();

const checkProductionDatabase = async () => {
  console.log('🔍 PRODUCTION DATABASE VERIFICATION');
  console.log('=' .repeat(50));
  
  try {
    // Import with proper error handling
    console.log('📦 Importing Sequelize...');
    const { Sequelize } = await import('sequelize');
    
    console.log('🗄️ Connecting to production database...');
    
    // Use the production DATABASE_URL from your .env
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      console.error('❌ DATABASE_URL not found in .env file!');
      console.log('💡 Make sure your .env has the production DATABASE_URL');
      return;
    }
    
    console.log('🔗 Database URL found (hidden for security)');
    
    // Create production connection
    const sequelize = new Sequelize(databaseUrl, {
      dialect: 'postgres',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      },
      logging: console.log, // Show all SQL queries
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      }
    });
    
    // Test connection
    console.log('🔌 Testing connection...');
    await sequelize.authenticate();
    console.log('✅ Production database connection successful!');
    
    // Check users table exists
    console.log('📋 Checking users table...');
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'users';
    `);
    
    if (tables.length === 0) {
      console.error('❌ users table does not exist in production database!');
      console.log('💡 You may need to run migrations in production');
      return;
    }
    
    console.log('✅ users table exists');
    
    // Check table structure
    console.log('🏗️ Checking table structure...');
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY column_name;
    `);
    
    console.log(`📊 Found ${columns.length} columns in users table`);
    
    // Check for critical columns
    const criticalColumns = ['id', 'username', 'email', 'password', 'role'];
    const existingColumns = columns.map(col => col.column_name);
    
    for (const col of criticalColumns) {
      if (existingColumns.includes(col)) {
        console.log(`✅ ${col} column exists`);
      } else {
        console.log(`❌ ${col} column MISSING!`);
      }
    }
    
    // Check users exist
    console.log('👥 Checking for test users...');
    const [users] = await sequelize.query(`
      SELECT id, username, email, role, 
             CASE WHEN password IS NOT NULL THEN 'HAS_PASSWORD' ELSE 'NO_PASSWORD' END as pwd_status
      FROM users 
      WHERE username IN ('admin', 'trainer', 'client', 'user')
      ORDER BY username;
    `);
    
    if (users.length === 0) {
      console.log('❌ NO TEST USERS FOUND in production database!');
      console.log('💡 You need to create test users in production');
      console.log('💡 This explains why login fails - no users exist!');
    } else {
      console.log(`✅ Found ${users.length} test users:`);
      users.forEach(user => {
        console.log(`  - ${user.username} (${user.email}) - ${user.role} - ${user.pwd_status}`);
      });
    }
    
    // Check enum values
    console.log('🎭 Checking role enum...');
    const [enumValues] = await sequelize.query(`
      SELECT enumlabel as role_value
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'enum_users_role'
      )
      ORDER BY enumlabel;
    `);
    
    if (enumValues.length > 0) {
      console.log('✅ Role enum values:', enumValues.map(e => e.role_value).join(', '));
    } else {
      console.log('❌ Role enum not found or empty');
    }
    
    await sequelize.close();
    console.log('🔚 Database connection closed');
    
  } catch (error) {
    console.error('❌ Production database check failed:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    
    if (error.message.includes('connect ECONNREFUSED')) {
      console.log('💡 Database connection refused - check DATABASE_URL');
    } else if (error.message.includes('authentication failed')) {
      console.log('💡 Database authentication failed - check credentials');
    } else if (error.message.includes('database') && error.message.includes('does not exist')) {
      console.log('💡 Database does not exist - check DATABASE_URL');
    }
  }
};

// Run the check
checkProductionDatabase().catch(console.error);