// Fix password hash for a specific user
import dotenv from 'dotenv';
dotenv.config();

const fixUserPassword = async () => {
  console.log('🔧 FIX USER PASSWORD HASH');
  console.log('=' .repeat(50));
  
  const usernameToFix = process.argv[2];
  const newPassword = process.argv[3];
  
  if (!usernameToFix || !newPassword) {
    console.log('Usage: node fix-user-password.mjs username newpassword');
    console.log('Example: node fix-user-password.mjs Swanstudios mynewpassword123');
    console.log('');
    console.log('⚠️  This will reset the password for the specified user');
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
    
    // Find the user
    const [users] = await sequelize.query(`
      SELECT id, username, email, "firstName", "lastName"
      FROM users 
      WHERE (username = :username OR email = :username) 
      AND "deletedAt" IS NULL;
    `, {
      replacements: { username: usernameToFix }
    });
    
    if (users.length === 0) {
      console.log('❌ USER NOT FOUND!');
      console.log(`   No user found with username/email: ${usernameToFix}`);
      return;
    }
    
    const user = users[0];
    console.log('✅ USER FOUND!');
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Email: ${user.email}`);
    console.log('');
    
    console.log('🔐 CREATING NEW PASSWORD HASH...');
    
    // Create proper bcrypt hash
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    console.log(`   New hash: ${hashedPassword.substring(0, 20)}...`);
    console.log(`   Hash length: ${hashedPassword.length} characters`);
    
    // Update the password
    await sequelize.query(`
      UPDATE users 
      SET password = :hashedPassword,
          "failedLoginAttempts" = 0,
          "isLocked" = false,
          "updatedAt" = NOW()
      WHERE id = :userId;
    `, {
      replacements: { 
        hashedPassword: hashedPassword,
        userId: user.id 
      }
    });
    
    console.log('✅ PASSWORD UPDATED SUCCESSFULLY!');
    console.log('');
    console.log('🎉 You can now login with:');
    console.log(`   Username: ${user.username}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Password: ${newPassword}`);
    console.log('');
    console.log('   Also reset failed login attempts and unlocked account');
    
    // Test the new password
    console.log('🧪 TESTING NEW PASSWORD...');
    const testMatch = await bcrypt.compare(newPassword, hashedPassword);
    
    if (testMatch) {
      console.log('✅ Password verification test PASSED!');
      console.log('   Login should now work perfectly');
    } else {
      console.log('❌ Password verification test FAILED!');
      console.log('   Something went wrong with the hash');
    }
    
    await sequelize.close();
    
  } catch (error) {
    console.error('❌ Error fixing password:', error.message);
  }
};

fixUserPassword().catch(console.error);
