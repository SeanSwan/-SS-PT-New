// Check what users exist in production database
import dotenv from 'dotenv';
dotenv.config();

const checkExistingUsers = async () => {
  console.log('🔍 CHECKING EXISTING USERS IN PRODUCTION');
  console.log('=' .repeat(50));
  
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
    
    // Get all users
    const [users] = await sequelize.query(`
      SELECT id, username, email, role, "firstName", "lastName",
             "createdAt", "isActive"
      FROM users 
      WHERE "deletedAt" IS NULL
      ORDER BY "createdAt" DESC;
    `);
    
    if (users.length === 0) {
      console.log('📭 No users found in database');
    } else {
      console.log(`👥 Found ${users.length} existing users:`);
      console.log('');
      
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.firstName} ${user.lastName}`);
        console.log(`   Username: ${user.username}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Active: ${user.isActive}`);
        console.log(`   Created: ${new Date(user.createdAt).toLocaleDateString()}`);
        console.log('');
      });
    }
    
    console.log('💡 TO AVOID CONFLICTS:');
    console.log('   Use a different username AND email when signing up');
    console.log('   Example: username="myname123", email="myname@gmail.com"');
    
    await sequelize.close();
    
  } catch (error) {
    console.error('❌ Error checking users:', error.message);
  }
};

checkExistingUsers().catch(console.error);
