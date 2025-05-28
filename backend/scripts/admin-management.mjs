/**
 * Admin Management Script
 * Use this script to manage admin passwords and delete test users
 * Run with: node admin-management.mjs
 */

import bcrypt from 'bcryptjs';
import User from '../models/User.mjs';
import sequelize from '../database.mjs';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function changeAdminPassword() {
  try {
    console.log('🔐 Change Admin Password');
    console.log('========================');
    
    const email = await question('Enter admin email or username: ');
    const newPassword = await question('Enter new password: ');
    const confirmPassword = await question('Confirm new password: ');
    
    if (newPassword !== confirmPassword) {
      console.log('❌ Passwords do not match!');
      return;
    }
    
    if (newPassword.length < 8) {
      console.log('❌ Password must be at least 8 characters!');
      return;
    }
    
    // Find admin user
    const admin = await User.findOne({
      where: {
        [sequelize.Op.or]: [
          { email: email },
          { username: email }
        ],
        role: 'admin'
      }
    });
    
    if (!admin) {
      console.log('❌ Admin user not found!');
      return;
    }
    
    // Update password (will be automatically hashed by model hook)
    admin.password = newPassword;
    await admin.save();
    
    console.log('✅ Admin password updated successfully!');
    console.log(`👤 Admin: ${admin.firstName} ${admin.lastName} (${admin.email})`);
    
  } catch (error) {
    console.error('❌ Error changing admin password:', error.message);
  }
}

async function deleteTestUsers() {
  try {
    console.log('🗑️  Delete Test Users');
    console.log('=====================');
    
    // Find all test users
    const testUsers = await User.findAll({
      where: {
        [sequelize.Op.or]: [
          { email: { [sequelize.Op.in]: ['admin@test.com', 'trainer@test.com', 'client@test.com', 'user@test.com'] } },
          { bio: { [sequelize.Op.like]: '%DELETE AFTER TESTING%' } }
        ]
      }
    });
    
    if (testUsers.length === 0) {
      console.log('✅ No test users found to delete.');
      return;
    }
    
    console.log(`Found ${testUsers.length} test users:`);
    testUsers.forEach(user => {
      console.log(`  - ${user.firstName} ${user.lastName} (${user.email}) [${user.role}]`);
    });
    
    const confirm = await question('\n⚠️  Are you sure you want to delete these test users? (yes/no): ');
    
    if (confirm.toLowerCase() !== 'yes') {
      console.log('❌ Deletion cancelled.');
      return;
    }
    
    // Delete test users
    const deletedCount = await User.destroy({
      where: {
        id: { [sequelize.Op.in]: testUsers.map(u => u.id) }
      }
    });
    
    console.log(`✅ Successfully deleted ${deletedCount} test users!`);
    
  } catch (error) {
    console.error('❌ Error deleting test users:', error.message);
  }
}

async function listUsers() {
  try {
    console.log('👥 Current Users');
    console.log('================');
    
    const users = await User.findAll({
      attributes: ['id', 'firstName', 'lastName', 'email', 'username', 'role', 'isActive', 'createdAt'],
      order: [['role', 'ASC'], ['firstName', 'ASC']]
    });
    
    if (users.length === 0) {
      console.log('No users found.');
      return;
    }
    
    console.log(`\nTotal users: ${users.length}\n`);
    
    let currentRole = '';
    users.forEach(user => {
      if (user.role !== currentRole) {
        currentRole = user.role;
        console.log(`\n${currentRole.toUpperCase()}S:`);
        console.log('-'.repeat(20));
      }
      
      const status = user.isActive ? '🟢' : '🔴';
      const testMarker = user.email.includes('@test.com') ? ' [TEST]' : '';
      console.log(`  ${status} ${user.firstName} ${user.lastName} (${user.email})${testMarker}`);
    });
    
  } catch (error) {
    console.error('❌ Error listing users:', error.message);
  }
}

async function main() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected successfully!\n');
    
    while (true) {
      console.log('\n🦢 SwanStudios Admin Management');
      console.log('================================');
      console.log('1. Change Admin Password');
      console.log('2. Delete Test Users');
      console.log('3. List All Users');
      console.log('4. Exit');
      
      const choice = await question('\nSelect an option (1-4): ');
      
      switch (choice) {
        case '1':
          await changeAdminPassword();
          break;
        case '2':
          await deleteTestUsers();
          break;
        case '3':
          await listUsers();
          break;
        case '4':
          console.log('👋 Goodbye!');
          process.exit(0);
        default:
          console.log('❌ Invalid option. Please select 1-4.');
      }
      
      await question('\nPress Enter to continue...');
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Goodbye!');
  rl.close();
  process.exit(0);
});

main();
