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
    // UserID as foreign key to User model.
    // INTEGER, not UUID: "Users".id is an integer serial, so the old UUID declaration
    // could never hold a real user id — writing `userId: req.user.id` would have thrown
    // `invalid input syntax for type uuid` and 500'd the public contact form. Retyped and
    // given a real FK by migration 20260804060000 (drift round 5, 2026-08-04).
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true, // Nullable since contacts might be from non-registered users
      references: { model: 'Users', key: 'id' },
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
