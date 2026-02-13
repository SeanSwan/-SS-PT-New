/**
 * Simple Admin Check
 */

import User from '../models/User.mjs';
import sequelize from '../database.mjs';

async function checkAdmin() {
  try {
    const admin = await User.findOne({
      where: { username: 'admin' }
    });
    
    if (!admin) {
      console.log('❌ Admin user not found');
      return;
    }
    
    console.log('✅ Admin user found:');
    console.log('  Username:', admin.username);
    console.log('  Email:', admin.email);
    console.log('  Role:', admin.role);
    console.log('  Role type:', typeof admin.role);
    console.log('  Is role admin?', admin.role === 'admin');
    
    // Test password
    const passwordValid = await admin.checkPassword('admin123');
    console.log('  Password valid:', passwordValid);
    
    return admin;
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkAdmin();
