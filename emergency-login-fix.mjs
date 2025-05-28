// EMERGENCY PRODUCTION FIX: Add deletedAt column and create test users
// This script fixes the "column deletedAt does not exist" error

import dotenv from 'dotenv';
dotenv.config();

const fixProductionLogin = async () => {
  console.log('🚨 EMERGENCY PRODUCTION LOGIN FIX');
  console.log('=' .repeat(50));
  
  try {
    // Import required modules
    const { Sequelize } = await import('sequelize');
    const bcrypt = await import('bcryptjs');
    
    console.log('🔗 Connecting to production database...');
    
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.error('❌ DATABASE_URL not found in .env file!');
      return;
    }
    
    // Create production connection
    const sequelize = new Sequelize(databaseUrl, {
      dialect: 'postgres',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      },
      logging: false, // Reduce noise
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      }
    });
    
    await sequelize.authenticate();
    console.log('✅ Connected to production database');
    
    // STEP 1: Check if deletedAt column exists
    console.log('🔍 Checking for deletedAt column...');
    const [columns] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'deletedAt';
    `);
    
    if (columns.length === 0) {
      console.log('➕ Adding missing deletedAt column...');
      
      await sequelize.query(`
        ALTER TABLE users 
        ADD COLUMN "deletedAt" TIMESTAMP WITH TIME ZONE;
      `);
      
      console.log('✅ deletedAt column added successfully');
    } else {
      console.log('✅ deletedAt column already exists');
    }
    
    // STEP 2: Check and create test users
    console.log('👥 Checking for test users...');
    
    const [existingUsers] = await sequelize.query(`
      SELECT username, email, role 
      FROM users 
      WHERE username IN ('admin', 'trainer', 'client', 'user')
      ORDER BY username;
    `);
    
    console.log(`Found ${existingUsers.length} existing test users`);
    
    // Create test users if they don't exist
    const testUsers = [
      {
        username: 'admin',
        email: 'admin@test.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        password: 'admin123'
      },
      {
        username: 'trainer',
        email: 'trainer@test.com',
        firstName: 'Test',
        lastName: 'Trainer',
        role: 'trainer',
        password: 'admin123'
      },
      {
        username: 'client',
        email: 'client@test.com',
        firstName: 'Test',
        lastName: 'Client',
        role: 'client',
        password: 'admin123'
      }
    ];
    
    for (const user of testUsers) {
      const existingUser = existingUsers.find(u => u.username === user.username);
      
      if (!existingUser) {
        console.log(`➕ Creating ${user.username} user...`);
        
        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(user.password, salt);
        
        await sequelize.query(`
          INSERT INTO users (
            "firstName", "lastName", email, username, password, role, 
            "isActive", "availableSessions", points, level, 
            "createdAt", "updatedAt"
          ) VALUES (
            :firstName, :lastName, :email, :username, :password, :role,
            true, 0, 0, 1,
            NOW(), NOW()
          )
        `, {
          replacements: {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            username: user.username,
            password: hashedPassword,
            role: user.role
          }
        });
        
        console.log(`✅ ${user.username} user created successfully`);
      } else {
        console.log(`✅ ${user.username} user already exists`);
      }
    }
    
    // STEP 3: Verify the fix worked
    console.log('🧪 Testing login functionality...');
    
    const [testLogin] = await sequelize.query(`
      SELECT id, username, email, role, 
             CASE WHEN password IS NOT NULL THEN 'HAS_PASSWORD' ELSE 'NO_PASSWORD' END as pwd_status
      FROM users 
      WHERE username = 'admin' AND "deletedAt" IS NULL
      LIMIT 1;
    `);
    
    if (testLogin.length > 0) {
      console.log('🎉 SUCCESS! Login should now work');
      console.log('✅ Test this login:');
      console.log('   Username: admin');
      console.log('   Password: admin123');
      console.log('   URL: https://ss-pt-new.onrender.com');
    } else {
      console.log('❌ Test login query failed - something is still wrong');
    }
    
    await sequelize.close();
    console.log('🔚 Database connection closed');
    
  } catch (error) {
    console.error('❌ Emergency fix failed:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    
    if (error.message.includes('column "deletedAt" does not exist')) {
      console.log('💡 deletedAt column still missing - check migration');
    }
  }
};

// Run the emergency fix
console.log('🚀 Starting emergency production login fix...');
fixProductionLogin().catch(console.error);
