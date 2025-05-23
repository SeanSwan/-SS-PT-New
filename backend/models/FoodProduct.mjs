// backend/models/FoodProduct.mjs
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

/**
 * Food Product Model
 * Stores information about food products identified by barcodes
 */
class FoodProduct extends Model {}

FoodProduct.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    // UPC/EAN barcode number (unique identifier)
    barcode: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    // Product name
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    // Brand name
    brand: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Product description
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // List of ingredients (as provided on packaging)
    ingredientsList: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Parsed ingredients (references to FoodIngredient records)
    ingredients: {
      type: DataTypes.JSON, // Array of ingredient IDs
      allowNull: true,
    },
    // Nutritional information
    nutritionalInfo: {
      type: DataTypes.JSON, // Structured nutritional data
      allowNull: true,
    },
    // Overall health rating: 'good', 'bad', 'okay'
    overallRating: {
      type: DataTypes.ENUM('good', 'bad', 'okay'),
      allowNull: false,
      defaultValue: 'okay',
    },
    // Reasons for the rating
    ratingReasons: {
      type: DataTypes.JSON, // Array of reason strings
      allowNull: true,
    },
    // Health concerns identified in this product
    healthConcerns: {
      type: DataTypes.JSON, // Array of health concern objects
      allowNull: true,
    },
    // Whether the product is certified organic
    isOrganic: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    // Whether the product is certified non-GMO
    isNonGMO: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    // Category (e.g., dairy, snacks, beverage)
    category: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Image URL
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Recommendations for healthier alternatives
    healthierAlternatives: {
      type: DataTypes.JSON, // Array of alternative product IDs or descriptions
      allowNull: true,
    },
    // Source of the data (e.g., API name, manual entry)
    dataSource: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // When the data was last verified or updated
    lastVerified: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Count of how many times this product has been scanned
    scanCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: 'FoodProduct',
    tableName: 'food_products',
    timestamps: true,
  }
);

export default FoodProduct;