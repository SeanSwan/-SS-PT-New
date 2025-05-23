/**
 * Manual Update Role Enum
 * This script adds the 'user' value to the role enum using a more comprehensive approach
 * that works even when there's data in the table.
 */

import sequelize from '../database.mjs';
import logger from '../utils/logger.mjs';

async function updateRoleEnum() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('Starting manual update of role enum...');
    
    // Step 1: Create a new enum type with the desired values
    await sequelize.query(
      `CREATE TYPE "enum_users_role_new" AS ENUM ('user', 'client', 'trainer', 'admin')`,
      { transaction }
    );
    
    // Step 2: Create a new column with the new enum type
    await sequelize.query(
      `ALTER TABLE "users" ADD COLUMN "role_new" "enum_users_role_new" DEFAULT 'client'`,
      { transaction }
    );
    
    // Step 3: Migrate data from old column to new column
    await sequelize.query(
      `UPDATE "users" SET "role_new" = "role"::text::"enum_users_role_new"`,
      { transaction }
    );
    
    // Step 4: Drop the old column
    await sequelize.query(
      `ALTER TABLE "users" DROP COLUMN "role"`,
      { transaction }
    );
    
    // Step 5: Rename the new column to the original name
    await sequelize.query(
      `ALTER TABLE "users" RENAME COLUMN "role_new" TO "role"`,
      { transaction }
    );
    
    // Step 6: Create NOT NULL constraint if needed
    await sequelize.query(
      `ALTER TABLE "users" ALTER COLUMN "role" SET NOT NULL`,
      { transaction }
    );
    
    // Step 7: Drop the old enum type (might not be possible if it's still referenced)
    try {
      await sequelize.query(
        `DROP TYPE "enum_users_role"`,
        { transaction }
      );
    } catch (error) {
      console.warn('Could not drop old enum type. This is expected if it is still referenced elsewhere.');
    }
    
    // Commit transaction
    await transaction.commit();
    console.log('Successfully updated role enum with manual method!');
    
    return { success: true, message: 'Role enum updated using manual method' };
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating role enum:', error);
    return { success: false, message: 'Failed to update role enum', error: error.message };
  }
}

// Run the function if this script is executed directly
if (process.argv[1].includes('manual-update-role-enum.mjs')) {
  updateRoleEnum()
    .then(result => {
      console.log('Result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error('Unexpected error:', err);
      process.exit(1);
    });
}

export default updateRoleEnum;
