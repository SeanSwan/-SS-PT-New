// backend/models/CartItem.mjs
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class CartItem extends Model {}

CartItem.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false,
      validate: {
        min: 1
      }
    },
    // Store the price at the time of purchase.
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    // These foreign keys are defined by the associations in setupAssociations.mjs
    cartId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    storefrontItemId: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  },
  {
    sequelize,
    modelName: 'CartItem',
    tableName: 'cart_items',
    timestamps: true,
  }
);

// IMPORTANT: Associations are handled in setupAssociations.mjs
// This prevents circular dependencies and keeps all associations in one place

export default CartItem;