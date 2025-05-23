// backend/models/Contact.js
import { DataTypes, Model } from "sequelize";
import sequelize from "../database.mjs";

class Contact extends Model {}

Contact.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    // UserID as foreign key to User model
    userId: {
      type: DataTypes.UUID,
      allowNull: true, // Nullable since contacts might be from non-registered users
    },
  },
  {
    sequelize,
    modelName: "Contact",
    tableName: "contacts",
    timestamps: true,
  }
);

export default Contact;
