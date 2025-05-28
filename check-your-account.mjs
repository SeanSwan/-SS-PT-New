// Check for specific user credentials in production database
import dotenv from 'dotenv';
dotenv.config();

const checkSpecificUser = async () => {
  console.log('🔍 CHECKING FOR YOUR PERSONAL CREDENTIALS');
  console.log('=' .repeat(50));
  
  // You can modify these to check your specific info
  const emailToCheck = process.argv[2]; // Pass email as argument
  const usernameToCheck = process.argv[3]; // Pass username as argument
  
  if (!emailToCheck) {
    console.log('Usage: node check-your-account.mjs your-email@gmail.com your-username');
    console.log('Example: node check-your-account.mjs john@gmail.com john123');
    return;
  }
  
  try {
    const { Sequelize } = await import('sequelize');
    
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
    
    // Check if email exists
    const [emailCheck] = await sequelize.query(`
      SELECT id, username, email, role, "firstName", "lastName",
             "createdAt", "isActive"
      FROM users 
      WHERE email = :email AND "deletedAt" IS NULL;
    `, {
      replacements: { email: emailToCheck }
    });
    
    // Check if username exists
    let usernameCheck = [];
    if (usernameToCheck) {
      const [result] = await sequelize.query(`
        SELECT id, username, email, role, "firstName", "lastName",
               "createdAt", "isActive"
        FROM users 
        WHERE username = :username AND "deletedAt" IS NULL;
      `, {
        replacements: { username: usernameToCheck }
      });
      usernameCheck = result;
    }
    
    console.log(`🔍 Checking email: ${emailToCheck}`);
    if (emailCheck.length > 0) {
      const user = emailCheck[0];
      console.log('❌ EMAIL ALREADY EXISTS!');
      console.log(`   User: ${user.firstName} ${user.lastName}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Created: ${new Date(user.createdAt).toLocaleDateString()}`);
      console.log(`   Active: ${user.isActive}`);
      console.log('');
      console.log('💡 SOLUTION OPTIONS:');
      console.log('   1. LOGIN instead of register (your account exists!)');
      console.log('   2. Use password reset if you forgot password');
      console.log('   3. Use a different email address');
    } else {
      console.log('✅ Email is available for registration');
    }
    
    if (usernameToCheck) {
      console.log(`🔍 Checking username: ${usernameToCheck}`);
      if (usernameCheck.length > 0) {
        const user = usernameCheck[0];
        console.log('❌ USERNAME ALREADY EXISTS!');
        console.log(`   User: ${user.firstName} ${user.lastName}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Created: ${new Date(user.createdAt).toLocaleDateString()}`);
        console.log('');
        console.log('💡 SOLUTION: Try a different username');
      } else {
        console.log('✅ Username is available for registration');
      }
    }
    
    // Show all non-test users for context
    console.log('');
    console.log('📋 ALL NON-TEST USERS IN DATABASE:');
    const [allUsers] = await sequelize.query(`
      SELECT username, email, "firstName", "lastName", role, "createdAt"
      FROM users 
      WHERE username NOT IN ('admin', 'trainer', 'client')
      AND "deletedAt" IS NULL
      ORDER BY "createdAt" DESC;
    `);
    
    if (allUsers.length === 0) {
      console.log('   None found (only test users exist)');
    } else {
      allUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.firstName} ${user.lastName} (${user.username} / ${user.email})`);
      });
    }
    
    await sequelize.close();
    
  } catch (error) {
    console.error('❌ Error checking credentials:', error.message);
  }
};

checkSpecificUser().catch(console.error);
