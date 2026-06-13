// backend/models/OrderItem.mjs
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class OrderItem extends Model {}

OrderItem.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    storefrontItemId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    productVariantId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    itemType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    fulfillmentStatus: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'not_required',
    },
    fulfilledAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    fulfilledBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    fulfillmentNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'OrderItem',
    tableName: 'order_items',
    timestamps: true,
  }
);

export default OrderItem;
