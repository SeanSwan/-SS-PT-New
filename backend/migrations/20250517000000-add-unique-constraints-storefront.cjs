/**
 * Migration: Add unique constraints to storefront_items table
 * Prevents duplicate packages with same name and type
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      console.log('Adding unique constraints to storefront_items table...');
      
      // Check if first constraint already exists before adding it
      const existingNameTypeConstraint = await queryInterface.sequelize.query(
        `SELECT constraint_name FROM information_schema.table_constraints 
         WHERE table_name = 'storefront_items' AND constraint_name = 'unique_package_name_type'`,
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      
      if (existingNameTypeConstraint.length === 0) {
        // Add composite unique constraint on (name, packageType)
        await queryInterface.addConstraint('storefront_items', {
          fields: ['name', 'packageType'],
          type: 'unique',
          name: 'unique_package_name_type'
        });
        console.log('✅ Successfully added unique constraint on (name, packageType)');
      } else {
        console.log('⚠️ Unique constraint on (name, packageType) already exists, skipping');
      }
      
      // Check if second constraint already exists before adding it
      const existingDisplayOrderConstraint = await queryInterface.sequelize.query(
        `SELECT constraint_name FROM information_schema.table_constraints 
         WHERE table_name = 'storefront_items' AND constraint_name = 'unique_display_order'`,
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      
      if (existingDisplayOrderConstraint.length === 0) {
        // Fix duplicate displayOrder values before adding unique constraint
        console.log('Updating duplicate displayOrder values...');
        
        // Get all storefront items and assign unique displayOrder values
        const items = await queryInterface.sequelize.query(
          'SELECT id FROM storefront_items ORDER BY id',
          { type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        
        // Update each item with a unique displayOrder value
        for (let i = 0; i < items.length; i++) {
          await queryInterface.sequelize.query(
            'UPDATE storefront_items SET "displayOrder" = :displayOrder WHERE id = :id',
            {
              replacements: { displayOrder: i + 1, id: items[i].id },
              type: queryInterface.sequelize.QueryTypes.UPDATE
            }
          );
        }
        
        console.log(`✅ Updated ${items.length} items with unique displayOrder values`);
        
        // Now add unique constraint on displayOrder to prevent ordering conflicts
        await queryInterface.addConstraint('storefront_items', {
          fields: ['displayOrder'],
          type: 'unique',
          name: 'unique_display_order'
        });
        
        console.log('✅ Successfully added unique constraint on displayOrder');
      } else {
        console.log('⚠️ Unique constraint on displayOrder already exists, skipping');
      }
      
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