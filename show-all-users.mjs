// Show ALL users in the database so you can see if your info already exists
import dotenv from 'dotenv';
dotenv.config();

const showAllUsers = async () => {
  console.log('👥 ALL USERS IN PRODUCTION DATABASE');
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
      SELECT id, username, email, "firstName", "lastName", role, 
             "createdAt", "isActive"
      FROM users 
      WHERE "deletedAt" IS NULL
      ORDER BY "createdAt" DESC;
    `);
    
    if (users.length === 0) {
      console.log('📭 No users found in database');
    } else {
      console.log(`Found ${users.length} total users:`);
      console.log('');
      
      users.forEach((user, index) => {
        const createdDate = new Date(user.createdAt).toLocaleDateString();
        const isTestUser = ['admin', 'trainer', 'client'].includes(user.username);
        const userType = isTestUser ? '(TEST USER)' : '(REAL USER)';
        
        console.log(`${index + 1}. ${user.firstName} ${user.lastName} ${userType}`);
        console.log(`   📧 Email: ${user.email}`);
        console.log(`   👤 Username: ${user.username}`);
        console.log(`   🎭 Role: ${user.role}`);
        console.log(`   📅 Created: ${createdDate}`);
        console.log(`   ✅ Active: ${user.isActive}`);
        console.log('');
      });
      
      // Separate test users from real users
      const testUsers = users.filter(u => ['admin', 'trainer', 'client'].includes(u.username));
      const realUsers = users.filter(u => !['admin', 'trainer', 'client'].includes(u.username));
      
      console.log('📊 SUMMARY:');
      console.log(`   Test Users: ${testUsers.length}`);
      console.log(`   Real Users: ${realUsers.length}`);
      console.log('');
      
      if (realUsers.length > 0) {
        console.log('⚠️  IF YOUR EMAIL/USERNAME IS ABOVE:');
        console.log('   ✅ You already have an account - try LOGGING IN instead');
        console.log('   🔑 Use password reset if you forgot your password');
        console.log('   📧 Or register with a different email/username');
      } else {
        console.log('💡 No personal accounts found - safe to register!');
      }
    }
    
    await sequelize.close();
    
  } catch (error) {
    console.error('❌ Error checking users:', error.message);
  }
};

showAllUsers().catch(console.error);
