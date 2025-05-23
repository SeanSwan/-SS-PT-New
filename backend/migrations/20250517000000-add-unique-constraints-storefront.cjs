/**
 * Migration: Add unique constraints to storefront_items table
 * Prevents duplicate packages with same name and type
 */

export async function up(queryInterface, Sequelize) {
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
}

export async function down(queryInterface, Sequelize) {
  try {
    console.log('Removing unique constraints from storefront_items table...');
    
    // Remove the constraints
    await queryInterface.removeConstraint('storefront_items', 'unique_package_name_type');
    console.log('✅ Removed unique constraint on (name, packageType)');
    
    await queryInterface.removeConstraint('storefront_items', 'unique_display_order');
    console.log('✅ Removed unique constraint on displayOrder');
    
  } catch (error) {
    console.error('❌ Error removing unique constraints:', error);
    throw error;
  }
}