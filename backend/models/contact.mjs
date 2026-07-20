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
      // Server-side backstop. The public contact endpoint is reachable by direct POST, and the v-next form sets
      // `noValidate` (so the browser's native type="email" check never runs there) — without this, malformed
      // addresses reach the CRM and the owner has no way to reply. Validation must not live only in one branch
      // of a flag gate.
      validate: {
        isEmail: { msg: 'A valid email address is required.' },
      },
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
    // Admin tracking
    viewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When admin viewed this contact'
    },
    respondedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When admin responded to this contact'
    },
    priority: {
      type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
      allowNull: false,
      defaultValue: 'normal',
      comment: 'Contact priority level'
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
