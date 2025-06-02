/**
 * Migration: Add unique constraints to storefront_items table
 * Prevents duplicate packages with same name and type
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      console.log('Adding unique constraints to storefront_items table...');
      
      // Add composite unique constraint on (name, packageType)
      // This prevents duplicate packages with the same name and type
      await queryInterface.addConstraint('storefront_items', {
        fields: ['name', 'packageType'],
        type: 'unique',
        name: 'unique_package_name_type'
      });
      
      console.log('✅ Successfully added unique constraint on (name, packageType)');
      
      // Add unique constraint on displayOrder to prevent ordering conflicts
      await queryInterface.addConstraint('storefront_items', {
        fields: ['displayOrder'],
        type: 'unique',
        name: 'unique_display_order'
      });
      
      console.log('✅ Successfully added unique constraint on displayOrder');
      
    } catch (error) {
      console.error('❌ Error adding unique constraints:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      console.log('Removing unique constraints from storefront_items table...');
      
      // Check if constraints exist before removing them
      const constraintQueries = [
        {
          name: 'unique_package_name_type',
          description: 'unique constraint on (name, packageType)'
        },
        {
          name: 'unique_display_order',
          description: 'unique constraint on displayOrder'
        }
      ];
      
      for (const constraint of constraintQueries) {
        try {
          // Check if constraint exists
          const constraintExists = await queryInterface.sequelize.query(
            `SELECT constraint_name FROM information_schema.table_constraints 
             WHERE table_name = 'storefront_items' AND constraint_name = :constraintName`,
            {
              replacements: { constraintName: constraint.name },
              type: queryInterface.sequelize.QueryTypes.SELECT
            }
          );
          
          if (constraintExists.length > 0) {
            await queryInterface.removeConstraint('storefront_items', constraint.name);
            console.log(`✅ Removed ${constraint.description}`);
          } else {
            console.log(`⚠️ Constraint ${constraint.name} does not exist, skipping removal`);
          }
        } catch (constraintError) {
          console.log(`⚠️ Could not remove constraint ${constraint.name}:`, constraintError.message);
          // Continue with other constraints rather than failing completely
        }
      }
      
    } catch (error) {
      console.error('❌ Error removing unique constraints:', error);
      throw error;
    }
  }
};