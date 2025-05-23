/**
 * Add 'user' Role to ENUM
 * This script modifies the enum_users_role type to include 'user' as a valid value
 */

import sequelize from '../database.mjs';
import logger from '../utils/logger.mjs';

async function addUserRole() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('Starting to add user role to enum...');
    
    // Check if the enum already has the 'user' value
    const checkQuery = `
      SELECT e.enumlabel
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'enum_users_role'
    `;
    
    const [enumValues] = await sequelize.query(checkQuery, { transaction });
    console.log('Current enum values:', enumValues.map(v => v.enumlabel));
    
    if (enumValues.some(v => v.enumlabel === 'user')) {
      console.log('The enum already includes the "user" value. No changes needed.');
      await transaction.commit();
      return { success: true, message: 'Enum already includes user value' };
    }
    
    // Add the 'user' value to the enum
    console.log('Adding "user" to the enum_users_role type...');
    await sequelize.query(
      `ALTER TYPE "enum_users_role" ADD VALUE 'user'`,
      { transaction }
    );
    
    // Commit transaction
    await transaction.commit();
    console.log('Successfully added "user" role to enum!');
    
    return { success: true, message: 'User role added to enum' };
  } catch (error) {
    await transaction.rollback();
    
    console.error('Error adding user role to enum:', error);
    
    // Provide more specific error guidance
    if (error.message.includes('cannot add value to enum type')) {
      console.error('Special handling required. Try these steps:');
      console.error('1. Create a new column with the updated enum type');
      console.error('2. Copy data from old column to new column');
      console.error('3. Drop the old column');
      console.error('4. Rename the new column to the original name');
      
      return { 
        success: false, 
        message: 'Cannot add value to enum type in use',
        error: error.message,
        solution: 'Manual migration required'
      };
    }
    
    return { success: false, message: 'Failed to add user role', error: error.message };
  }
}

// Run the function if this script is executed directly
if (process.argv[1].includes('add-user-role.mjs')) {
  addUserRole()
    .then(result => {
      console.log('Result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error('Unexpected error:', err);
      process.exit(1);
    });
}

export default addUserRole;
