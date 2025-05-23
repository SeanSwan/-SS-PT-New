'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create food_ingredients table
    await queryInterface.createTable('food_ingredients', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      healthRating: {
        type: Sequelize.ENUM('good', 'bad', 'okay'),
        allowNull: false,
        defaultValue: 'okay'
      },
      category: {
        type: Sequelize.STRING,
        allowNull: true
      },
      healthConcerns: {
        type: Sequelize.JSON,
        allowNull: true
      },
      healthierAlternatives: {
        type: Sequelize.JSON,
        allowNull: true
      },
      isGMO: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      isProcessed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      researchUrl: {
        type: Sequelize.STRING,
        allowNull: true
      },
      scientificReferences: {
        type: Sequelize.JSON,
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
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
      }
    });

    // Create food_products table
    await queryInterface.createTable('food_products', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      barcode: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      brand: {
        type: Sequelize.STRING,
        allowNull: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      ingredientsList: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      ingredients: {
        type: Sequelize.JSON,
        allowNull: true
      },
      nutritionalInfo: {
        type: Sequelize.JSON,
        allowNull: true
      },
      overallRating: {
        type: Sequelize.ENUM('good', 'bad', 'okay'),
        allowNull: false,
        defaultValue: 'okay'
      },
      ratingReasons: {
        type: Sequelize.JSON,
        allowNull: true
      },
      healthConcerns: {
        type: Sequelize.JSON,
        allowNull: true
      },
      isOrganic: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      isNonGMO: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      category: {
        type: Sequelize.STRING,
        allowNull: true
      },
      imageUrl: {
        type: Sequelize.STRING,
        allowNull: true
      },
      healthierAlternatives: {
        type: Sequelize.JSON,
        allowNull: true
      },
      dataSource: {
        type: Sequelize.STRING,
        allowNull: true
      },
      lastVerified: {
        type: Sequelize.DATE,
        allowNull: true
      },
      scanCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
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
      }
    });

    // Create food_scan_history table
    await queryInterface.createTable('food_scan_history', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      productId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'food_products',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      barcode: {
        type: Sequelize.STRING,
        allowNull: false
      },
      scanDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('now')
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      userRating: {
        type: Sequelize.INTEGER,
        allowNull: true,
        validate: {
          min: 1,
          max: 5
        }
      },
      isFavorite: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      wasConsumed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      location: {
        type: Sequelize.JSON,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true
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
      }
    });

    // Add indexes for performance
    await queryInterface.addIndex('food_ingredients', ['name']);
    await queryInterface.addIndex('food_ingredients', ['healthRating']);
    await queryInterface.addIndex('food_ingredients', ['category']);
    
    await queryInterface.addIndex('food_products', ['barcode']);
    await queryInterface.addIndex('food_products', ['name']);
    await queryInterface.addIndex('food_products', ['brand']);
    await queryInterface.addIndex('food_products', ['overallRating']);
    await queryInterface.addIndex('food_products', ['category']);
    await queryInterface.addIndex('food_products', ['isOrganic']);
    await queryInterface.addIndex('food_products', ['isNonGMO']);
    
    await queryInterface.addIndex('food_scan_history', ['userId']);
    await queryInterface.addIndex('food_scan_history', ['productId']);
    await queryInterface.addIndex('food_scan_history', ['barcode']);
    await queryInterface.addIndex('food_scan_history', ['scanDate']);
    await queryInterface.addIndex('food_scan_history', ['isFavorite']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('food_scan_history');
    await queryInterface.dropTable('food_products');
    await queryInterface.dropTable('food_ingredients');
  }
};