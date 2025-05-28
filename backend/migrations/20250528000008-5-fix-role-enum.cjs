'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔧 FIXING ROLE ENUM: Adding missing trainer role...');
    
    try {
      await queryInterface.sequelize.transaction(async (t) => {
        
        // First, check what values are currently in the enum
        const [currentValues] = await queryInterface.sequelize.query(`
          SELECT enumlabel 
          FROM pg_enum 
          WHERE enumtypid = (
            SELECT oid 
            FROM pg_type 
            WHERE typname = 'enum_users_role'
          );
        `, { transaction: t });
        
        const existingValues = currentValues.map(row => row.enumlabel);
        console.log('📋 Current role enum values:', existingValues.join(', '));
        
        // Define all roles that should exist
        const requiredRoles = ['user', 'client', 'trainer', 'admin'];
        
        // Add missing roles one by one
        for (const role of requiredRoles) {
          if (!existingValues.includes(role)) {
            try {
              await queryInterface.sequelize.query(`
                ALTER TYPE "enum_users_role" ADD VALUE '${role}';
              `, { transaction: t });
              console.log(`✅ Added role: ${role}`);
            } catch (error) {
              console.log(`⚠️  Could not add role ${role}: ${error.message}`);
            }
          } else {
            console.log(`✓ Role ${role} already exists`);
          }
        }
        
        // Verify the final enum state
        const [finalValues] = await queryInterface.sequelize.query(`
          SELECT enumlabel 
          FROM pg_enum 
          WHERE enumtypid = (
            SELECT oid 
            FROM pg_type 
            WHERE typname = 'enum_users_role'
          )
          ORDER BY enumlabel;
        `, { transaction: t });
        
        const finalRoles = finalValues.map(row => row.enumlabel);
        console.log('🎯 FINAL ROLE ENUM VALUES:', finalRoles.join(', '));
        
        // Check if we have all required roles
        const missingRoles = requiredRoles.filter(role => !finalRoles.includes(role));
        if (missingRoles.length === 0) {
          console.log('✅ ALL REQUIRED ROLES ARE NOW AVAILABLE!');
          console.log('✅ Test user creation should now work');
        } else {
          console.log(`⚠️  Still missing roles: ${missingRoles.join(', ')}`);
        }
        
      });
      
    } catch (error) {
      console.error('❌ Role enum fix failed:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Rolling back role enum changes...');
    console.log('⚠️  Cannot remove enum values in PostgreSQL - manual intervention required');
  }
};
