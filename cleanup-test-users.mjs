// Clean up test users to allow fresh registration
import dotenv from 'dotenv';
dotenv.config();

const cleanupTestUsers = async () => {
  console.log('🧹 CLEANING UP TEST USERS');
  console.log('=' .repeat(50));
  console.log('⚠️  This will DELETE test users: admin, trainer, client');
  console.log('⚠️  You can then register with those usernames/emails');
  console.log('');
  
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
    
    // Show users before deletion
    const [beforeUsers] = await sequelize.query(`
      SELECT username, email, role FROM users 
      WHERE username IN ('admin', 'trainer', 'client')
      AND "deletedAt" IS NULL;
    `);
    
    if (beforeUsers.length === 0) {
      console.log('📭 No test users found to delete');
      return;
    }
    
    console.log(`🎯 Found ${beforeUsers.length} test users to delete:`);
    beforeUsers.forEach(user => {
      console.log(`   - ${user.username} (${user.email}) - ${user.role}`);
    });
    console.log('');
    
    // Delete test users
    const [result] = await sequelize.query(`
      DELETE FROM users 
      WHERE username IN ('admin', 'trainer', 'client');
    `);
    
    console.log(`✅ Deleted ${beforeUsers.length} test users`);
    console.log('');
    console.log('🎉 You can now register with:');
    console.log('   - Username: admin, Email: admin@test.com');
    console.log('   - Username: trainer, Email: trainer@test.com');
    console.log('   - Username: client, Email: client@test.com');
    console.log('   - Or any other username/email you prefer');
    
    await sequelize.close();
    
  } catch (error) {
    console.error('❌ Error cleaning up users:', error.message);
  }
};

cleanupTestUsers().catch(console.error);
