// Diagnose login issue for specific user
import dotenv from 'dotenv';
dotenv.config();

const diagnoseLoginIssue = async () => {
  console.log('🔍 DIAGNOSING LOGIN ISSUE');
  console.log('=' .repeat(50));
  
  const usernameToCheck = process.argv[2];
  const passwordToTest = process.argv[3];
  
  if (!usernameToCheck) {
    console.log('Usage: node diagnose-login.mjs username password');
    console.log('Example: node diagnose-login.mjs Swanstudios mypassword123');
    console.log('');
    console.log('⚠️  This will show if your account exists and test password verification');
    return;
  }
  
  try {
    const { Sequelize } = await import('sequelize');
    const bcrypt = await import('bcryptjs');
    
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.error('❌ DATABASE_URL not found in .env file!');
      return;
    }
    
    const sequelize = new Sequelize(databaseUrl, {
      dialect: 'postgres',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      },
      logging: false
    });
    
    await sequelize.authenticate();
    console.log('✅ Connected to production database');
    
    // Find the user (same logic as login controller)
    const [users] = await sequelize.query(`
      SELECT id, username, email, "firstName", "lastName", password, role,
             "isActive", "isLocked", "failedLoginAttempts", "lastLogin", "createdAt"
      FROM users 
      WHERE (username = :username OR email = :username) 
      AND "deletedAt" IS NULL;
    `, {
      replacements: { username: usernameToCheck }
    });
    
    if (users.length === 0) {
      console.log('❌ USER NOT FOUND!');
      console.log(`   No user found with username/email: ${usernameToCheck}`);
      console.log('');
      console.log('💡 POSSIBLE SOLUTIONS:');
      console.log('   1. Check spelling of username/email');
      console.log('   2. Try your email address instead of username');
      console.log('   3. Check if account was deleted');
      return;
    }
    
    const user = users[0];
    console.log('✅ USER FOUND!');
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Active: ${user.isActive}`);
    console.log(`   Locked: ${user.isLocked}`);
    console.log(`   Failed Attempts: ${user.failedLoginAttempts || 0}`);
    console.log(`   Last Login: ${user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}`);
    console.log(`   Created: ${new Date(user.createdAt).toLocaleString()}`);
    console.log('');
    
    // Check account status
    if (!user.isActive) {
      console.log('❌ ACCOUNT INACTIVE!');
      console.log('   Your account is marked as inactive');
      return;
    }
    
    if (user.isLocked) {
      console.log('❌ ACCOUNT LOCKED!');
      console.log('   Your account has been locked due to failed login attempts');
      console.log('   Contact support or wait for unlock');
      return;
    }
    
    // Test password if provided
    if (passwordToTest) {
      console.log('🔐 TESTING PASSWORD...');
      console.log(`   Password length: ${passwordToTest.length} characters`);
      console.log(`   Stored hash length: ${user.password ? user.password.length : 0} characters`);
      console.log(`   Hash starts with: ${user.password ? user.password.substring(0, 10) + '...' : 'NULL'}`);
      
      if (!user.password) {
        console.log('❌ NO PASSWORD HASH STORED!');
        console.log('   The user record has no password hash');
        console.log('   This explains why login fails');
        return;
      }
      
      // Test bcrypt comparison
      try {
        const isMatch = await bcrypt.compare(passwordToTest, user.password);
        
        if (isMatch) {
          console.log('✅ PASSWORD MATCHES!');
          console.log('   Your password is correct - login should work');
          console.log('   If login still fails, there may be another issue');
        } else {
          console.log('❌ PASSWORD DOES NOT MATCH!');
          console.log('   Your password is incorrect');
          console.log('   Try a different password or reset your password');
        }
      } catch (hashError) {
        console.log('❌ PASSWORD HASH ERROR!');
        console.log(`   Error: ${hashError.message}`);
        console.log('   The password hash may be corrupted');
        
        // Check if it's a bcrypt hash
        if (user.password.startsWith('$2')) {
          console.log('   Hash appears to be bcrypt format');
        } else {
          console.log('   Hash does NOT appear to be bcrypt format');
          console.log('   This explains the login failure');
        }
      }
    } else {
      console.log('⚠️  No password provided for testing');
      console.log('   Run with: node diagnose-login.mjs username password');
    }
    
    // Check for common issues
    console.log('');
    console.log('🔍 COMMON ISSUES CHECK:');
    
    // Username case sensitivity
    if (user.username !== usernameToCheck && user.email !== usernameToCheck) {
      console.log(`   ⚠️  Username case mismatch: stored="${user.username}", entered="${usernameToCheck}"`);
    }
    
    // Recent registration
    const createdTime = new Date(user.createdAt).getTime();
    const now = new Date().getTime();
    const ageMinutes = (now - createdTime) / (1000 * 60);
    
    if (ageMinutes < 5) {
      console.log(`   ℹ️  Very recent registration (${Math.round(ageMinutes)} minutes ago)`);
      console.log('   Try waiting a moment and logging in again');
    }
    
    await sequelize.close();
    
  } catch (error) {
    console.error('❌ Error diagnosing login:', error.message);
  }
};

diagnoseLoginIssue().catch(console.error);
