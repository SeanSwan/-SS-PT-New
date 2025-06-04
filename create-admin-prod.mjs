#!/usr/bin/env node

/**
 * Create/Update Admin User in Production Database
 * ==============================================
 * 
 * Creates admin user with credentials: admin / admin123
 * Connects directly to production PostgreSQL database
 */

import bcrypt from 'bcrypt';
import { Sequelize, DataTypes } from 'sequelize';

// Production database URL from environment
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://swanadmin:NOAkH30o3nFKgpAxFXHEY2UlZ236FdA1@dpg-cv1qga1u0jms738nc8lg-a.oregon-postgres.render.com/swanstudios';

console.log('🔧 Creating Admin User in Production Database');
console.log('===============================================\n');

// Initialize Sequelize connection
const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: false, // Disable SQL logging for cleaner output
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

// Define User model (simplified for this operation)
const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('user', 'client', 'trainer', 'admin'),
    defaultValue: 'user'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  emailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'users',
  timestamps: true
});

async function createAdminUser() {
  try {
    console.log('🔌 Connecting to production database...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful\n');

    console.log('🔍 Checking for existing admin user...');
    
    // Check if admin user already exists
    const existingAdmin = await User.findOne({
      where: {
        $or: [
          { username: 'admin' },
          { email: 'admin@swanstudios.com' }
        ]
      }
    });

    const adminData = {
      username: 'admin',
      email: 'admin@swanstudios.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isActive: true,
      emailVerified: true
    };

    // Hash the password
    console.log('🔒 Hashing password...');
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash('admin123', saltRounds);
    adminData.password = hashedPassword;

    if (existingAdmin) {
      console.log('👤 Admin user found, updating credentials...');
      
      // Update existing user
      await existingAdmin.update({
        password: hashedPassword,
        role: 'admin',
        isActive: true,
        emailVerified: true
      });
      
      console.log('✅ Admin user updated successfully!');
      console.log(`   ID: ${existingAdmin.id}`);
      console.log(`   Username: ${existingAdmin.username}`);
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Role: ${existingAdmin.role}`);
      
    } else {
      console.log('➕ No admin user found, creating new one...');
      
      // Create new admin user
      const newAdmin = await User.create(adminData);
      
      console.log('✅ Admin user created successfully!');
      console.log(`   ID: ${newAdmin.id}`);
      console.log(`   Username: ${newAdmin.username}`);
      console.log(`   Email: ${newAdmin.email}`);
      console.log(`   Role: ${newAdmin.role}`);
    }

    console.log('\n🎯 ADMIN CREDENTIALS:');
    console.log('=====================');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('');

    console.log('🧪 Testing password hash...');
    const testPassword = await bcrypt.compare('admin123', hashedPassword);
    console.log(`Password verification: ${testPassword ? '✅ PASS' : '❌ FAIL'}`);

    console.log('\n✅ Admin user setup complete!');
    console.log('You can now test login at: https://sswanstudios.com');

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    
    if (error.name === 'SequelizeConnectionError') {
      console.log('\n💡 Connection troubleshooting:');
      console.log('1. Check if DATABASE_URL is correct');
      console.log('2. Verify PostgreSQL database is running');
      console.log('3. Check firewall/network connectivity');
    } else if (error.name === 'SequelizeUniqueConstraintError') {
      console.log('\n💡 Uniqueness error - user might already exist');
      console.log('Try running: node show-all-users.mjs');
    } else if (error.name === 'SequelizeDatabaseError') {
      console.log('\n💡 Database error - might be schema issue');
      console.log('Check if users table exists and has correct structure');
    }
    
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the script
createAdminUser();
