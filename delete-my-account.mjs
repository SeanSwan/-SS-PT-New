// Delete your existing account so you can register fresh
import dotenv from 'dotenv';
dotenv.config();

const deleteMyAccount = async () => {
  console.log('🗑️  DELETE YOUR EXISTING ACCOUNT');
  console.log('=' .repeat(50));
  console.log('⚠️  This will PERMANENTLY DELETE your account');
  console.log('⚠️  You can then register fresh with the same email/username');
  console.log('');
  
  const emailToDelete = process.argv[2];
  
  if (!emailToDelete) {
    console.log('❌ Please provide your email address');
    console.log('Usage: node delete-my-account.mjs your-email@gmail.com');
    console.log('Example: node delete-my-account.mjs john@gmail.com');
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
    
    // First, show the account that will be deleted
    const [userCheck] = await sequelize.query(`
      SELECT id, username, email, "firstName", "lastName", role, "createdAt"
      FROM users 
      WHERE email = :email AND "deletedAt" IS NULL;
    `, {
      replacements: { email: emailToDelete }
    });
    
    if (userCheck.length === 0) {
      console.log(`❌ No account found with email: ${emailToDelete}`);
      console.log('💡 Your email might not be registered, try signing up!');
      return;
    }
    
    const user = userCheck[0];
    console.log('🎯 FOUND YOUR ACCOUNT:');
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Created: ${new Date(user.createdAt).toLocaleDateString()}`);
    console.log('');
    
    // Prevent deletion of test users accidentally
    if (['admin', 'trainer', 'client'].includes(user.username)) {
      console.log('⚠️  This is a test user account');
      console.log('⚠️  Are you sure you want to delete it?');
    }
    
    console.log('🗑️  DELETING ACCOUNT...');
    
    // Delete the user
    const [deleteResult] = await sequelize.query(`
      DELETE FROM users WHERE email = :email;
    `, {
      replacements: { email: emailToDelete }
    });
    
    console.log('✅ Account deleted successfully!');
    console.log('');
    console.log('🎉 You can now register fresh with:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Username: ${user.username}`);
    console.log('   (or any other credentials you prefer)');
    
    await sequelize.close();
    
  } catch (error) {
    console.error('❌ Error deleting account:', error.message);
  }
};

deleteMyAccount().catch(console.error);
