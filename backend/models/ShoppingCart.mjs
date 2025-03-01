// backend/models/ShoppingCart.js
import { DataTypes, Model } from 'sequelize';
import sequelize from './../database.js';

class ShoppingCart extends Model {}

ShoppingCart.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    // Status: 'active' for an open cart, 'completed' after checkout
    status: {
      type: DataTypes.ENUM('active', 'completed'),
      defaultValue: 'active',
      allowNull: false,
    },
    // Associate the cart with a user via userId (foreign key)
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'ShoppingCart',
    tableName: 'shopping_carts',
    timestamps: true,
  }
);

export default ShoppingCart;
