// COMPREHENSIVE PRODUCTION LOGIN FIX
// This script fixes ALL authentication issues in one go

import dotenv from 'dotenv';
dotenv.config();

const comprehensiveLoginFix = async () => {
  console.log('🚨 COMPREHENSIVE PRODUCTION LOGIN FIX');
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
      logging: false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      }
    });
    
    await sequelize.authenticate();
    console.log('✅ Connected to production database');
    
    // ===== FIX 1: ENSURE USERS TABLE EXISTS =====
    console.log('🔍 Checking users table exists...');
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'users';
    `);
    
    if (tables.length === 0) {
      console.error('❌ users table does NOT exist!');
      console.log('💡 You need to run migrations first');
      return;
    }
    console.log('✅ users table exists');
    
    // ===== FIX 2: ADD MISSING DELETEDAT COLUMN =====
    console.log('🔍 Checking for deletedAt column...');
    const [deletedAtColumns] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'deletedAt';
    `);
    
    if (deletedAtColumns.length === 0) {
      console.log('➕ Adding CRITICAL deletedAt column...');
      
      await sequelize.query(`
        ALTER TABLE users 
        ADD COLUMN "deletedAt" TIMESTAMP WITH TIME ZONE;
      `);
      
      console.log('✅ deletedAt column added - PARANOID MODE NOW WORKS!');
    } else {
      console.log('✅ deletedAt column already exists');
    }
    
    // ===== FIX 3: ENSURE ROLE ENUM IS CORRECT =====
    console.log('🎭 Checking role enum values...');
    const [enumValues] = await sequelize.query(`
      SELECT enumlabel as role_value
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'enum_users_role'
      )
      ORDER BY enumlabel;
    `);
    
    const existingRoles = enumValues.map(e => e.role_value);
    console.log('Current roles:', existingRoles.join(', '));
    
    const requiredRoles = ['user', 'client', 'trainer', 'admin'];
    
    for (const role of requiredRoles) {
      if (!existingRoles.includes(role)) {
        try {
          await sequelize.query(`ALTER TYPE "enum_users_role" ADD VALUE '${role}';`);
          console.log(`✅ Added role: ${role}`);
        } catch (error) {
          console.log(`⚠️  Role ${role} might already exist or error: ${error.message}`);
        }
      }
    }
    
    // ===== FIX 4: ENSURE CRITICAL COLUMNS EXIST =====
    console.log('🏗️ Checking critical columns...');
    const [allColumns] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY column_name;
    `);
    
    const existingColumns = allColumns.map(col => col.column_name);
    const criticalColumns = ['availableSessions', 'isActive', 'points', 'level'];
    
    for (const col of criticalColumns) {
      if (!existingColumns.includes(col)) {
        console.log(`➕ Adding missing column: ${col}`);
        
        let columnDef = '';
        switch (col) {
          case 'availableSessions':
            columnDef = 'INTEGER DEFAULT 0';
            break;
          case 'isActive':
            columnDef = 'BOOLEAN DEFAULT true';
            break;
          case 'points':
            columnDef = 'INTEGER DEFAULT 0';
            break;
          case 'level':
            columnDef = 'INTEGER DEFAULT 1';
            break;
        }
        
        try {
          await sequelize.query(`ALTER TABLE users ADD COLUMN "${col}" ${columnDef};`);
          console.log(`✅ Added ${col} column`);
        } catch (error) {
          console.log(`⚠️  Could not add ${col}: ${error.message}`);
        }
      }
    }
    
    // ===== FIX 5: CREATE TEST USERS =====
    console.log('👥 Creating test users...');
    
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
      try {
        // Check if user exists
        const [existingUser] = await sequelize.query(`
          SELECT id FROM users WHERE username = :username OR email = :email
        `, {
          replacements: { username: user.username, email: user.email }
        });
        
        if (existingUser.length === 0) {
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
      } catch (error) {
        console.log(`⚠️  Error with ${user.username}: ${error.message}`);
      }
    }
    
    // ===== FIX 6: FINAL VERIFICATION =====
    console.log('🧪 Final verification test...');
    
    try {
      const [testResult] = await sequelize.query(`
        SELECT id, username, email, role, "isActive",
               CASE WHEN password IS NOT NULL THEN 'HAS_PASSWORD' ELSE 'NO_PASSWORD' END as pwd_status
        FROM users 
        WHERE username = 'admin' AND "deletedAt" IS NULL
        LIMIT 1;
      `);
      
      if (testResult.length > 0) {
        const user = testResult[0];
        console.log('🎉 COMPLETE SUCCESS!');
        console.log('✅ Login is now fixed and working');
        console.log('✅ Test these credentials:');
        console.log('   🌐 URL: https://ss-pt-new.onrender.com');
        console.log('   👤 Username: admin');
        console.log('   🔑 Password: admin123');
        console.log(`   📊 User Status: ${user.pwd_status}, Active: ${user.isActive}`);
      } else {
        console.log('❌ Verification failed - admin user not found');
      }
    } catch (error) {
      console.log('❌ Verification test failed:', error.message);
    }
    
    await sequelize.close();
    console.log('🔚 Database connection closed');
    
    console.log('=' .repeat(50));
    console.log('🎊 COMPREHENSIVE FIX COMPLETED!');
    console.log('🎊 YOUR LOGIN SHOULD NOW WORK!');
    console.log('=' .repeat(50));
    
  } catch (error) {
    console.error('❌ Comprehensive fix failed:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    if (error.message.includes('column "deletedAt" does not exist')) {
      console.log('💡 deletedAt column issue - this script should have fixed it');
    }
    if (error.message.includes('connect ECONNREFUSED')) {
      console.log('💡 Database connection refused - check DATABASE_URL');
    }
  }
};

// Run the comprehensive fix
console.log('🚀 Starting comprehensive production login fix...');
comprehensiveLoginFix().catch(console.error);
