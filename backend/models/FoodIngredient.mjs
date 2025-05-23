// backend/models/FoodIngredient.mjs
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

/**
 * Food Ingredient Model
 * Stores information about food ingredients, their health ratings, and potential health impacts
 */
class FoodIngredient extends Model {}

FoodIngredient.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Health rating: 'good', 'bad', 'okay'
    healthRating: {
      type: DataTypes.ENUM('good', 'bad', 'okay'),
      allowNull: false,
      defaultValue: 'okay',
    },
    // Category: e.g., 'preservative', 'artificial color', 'natural sweetener', etc.
    category: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Potential health concerns associated with this ingredient
    healthConcerns: {
      type: DataTypes.JSON, // Array of potential health issues
      allowNull: true,
    },
    // Alternative ingredients that are healthier
    healthierAlternatives: {
      type: DataTypes.JSON, // Array of healthier alternatives
      allowNull: true,
    },
    // Whether the ingredient is typically GMO
    isGMO: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    // Whether the ingredient is considered processed
    isProcessed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    // Optional URL to research or evidence
    researchUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // References to scientific papers or studies (optional)
    scientificReferences: {
      type: DataTypes.JSON, // Array of reference strings
      allowNull: true,
    },
    // Notes for internal use
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'FoodIngredient',
    tableName: 'food_ingredients',
    timestamps: true,
  }
);

export default FoodIngredient;