// Test the specific part of the login that might be failing
import dotenv from 'dotenv';
import sequelize, { Op } from './backend/database.mjs';
import User from './backend/models/User.mjs';

// Load environment variables
dotenv.config();

const testSpecificLogin = async () => {
  console.log('🔍 Testing the specific User.findOne query that might be failing...\n');
  
  try {
    // Test database connection first
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Test the exact query that's used in the login function
    console.log('🔍 Testing User.findOne with Op.or...');
    
    // This is the exact query from the login function
    const user = await User.findOne({ 
      where: { 
        [Op.or]: [
          { username: 'admin' },
          { email: 'admin' } // Allow login with email too
        ]
      }
    });
    
    if (user) {
      console.log('✅ User found successfully!');
      console.log(`- ID: ${user.id}`);
      console.log(`- Username: ${user.username}`);
      console.log(`- Email: ${user.email}`);
      console.log(`- Role: ${user.role}`);
    } else {
      console.log('❌ No user found with username or email "admin"');
      
      // Check if any users exist
      const userCount = await User.count();
      console.log(`Total users in database: ${userCount}`);
      
      if (userCount > 0) {
        console.log('📋 Available users:');
        const allUsers = await User.findAll({
          attributes: ['id', 'username', 'email', 'role'],
          limit: 5
        });
        allUsers.forEach(u => {
          console.log(`  - ${u.username} (${u.email}) - ${u.role}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Query failed with error:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    if (error.original) {
      console.error('Original database error:', error.original.message);
    }
    console.error('Stack trace:', error.stack);
  } finally {
    await sequelize.close();
    console.log('\n🔚 Database connection closed');
  }
};

// Run the test
testSpecificLogin().catch(console.error);