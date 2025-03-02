// backend/models/CartItem.js
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';
import ShoppingCart from './ShoppingCart.mjs';
import StorefrontItem from './StorefrontItem.mjs';

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
    },
    // Store the price at the time of purchase.
    price: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'CartItem',
    tableName: 'cart_items',
    timestamps: true,
  }
);

// Define associations:
// A shopping cart has many cart items.
ShoppingCart.hasMany(CartItem, { foreignKey: 'cartId', as: 'items' });
CartItem.belongsTo(ShoppingCart, { foreignKey: 'cartId', as: 'cart' });

// Associate CartItem with a StorefrontItem so you can reference package details.
StorefrontItem.hasMany(CartItem, { foreignKey: 'storefrontItemId', as: 'cartItems' });
CartItem.belongsTo(StorefrontItem, { foreignKey: 'storefrontItemId', as: 'storefrontItem' });

export default CartItem;
