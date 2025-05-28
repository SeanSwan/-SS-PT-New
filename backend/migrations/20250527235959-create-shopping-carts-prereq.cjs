'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🚨 IMMEDIATE FIX: Creating missing shopping_carts table first...');
    
    try {
      // Check if shopping_carts table exists
      const [cartsTableCheck] = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'shopping_carts'
        );
      `);
      
      if (!cartsTableCheck[0].exists) {
        console.log('📋 Creating shopping_carts table...');
        
        // Create the shopping_carts table with INTEGER userId to match users.id
        await queryInterface.createTable('shopping_carts', {
          id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER,
          },
          status: {
            type: Sequelize.ENUM('active', 'completed'),
            allowNull: false,
            defaultValue: 'active',
          },
          userId: {
            type: Sequelize.INTEGER, // INTEGER to match users.id
            allowNull: false,
            references: { 
              model: 'users', 
              key: 'id' 
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
          },
          createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.fn('now')
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.fn('now')
          },
        });
        
        console.log('✅ Shopping_carts table created successfully');
        
        // Add index for performance
        await queryInterface.addIndex('shopping_carts', ['userId']);
        await queryInterface.addIndex('shopping_carts', ['status']);
        
        console.log('✅ Indexes added to shopping_carts');
      } else {
        console.log('✅ Shopping_carts table already exists');
      }
      
    } catch (error) {
      console.error('❌ Error creating shopping_carts table:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Dropping shopping_carts table...');
    await queryInterface.dropTable('shopping_carts', { cascade: true });
    
    // Drop the ENUM type
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_shopping_carts_status";');
  }
};
