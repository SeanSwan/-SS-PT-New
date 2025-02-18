// backend/models/User.js
import { DataTypes, Model } from 'sequelize';
import sequelize from './../database.js';
import bcrypt from 'bcryptjs';

/**
 * User Model Definition
 * Supports both client and admin users.
 */
class User extends Model {
  /**
   * Compares a provided password with the stored hashed password.
   * @param {string} password - The plain text password.
   * @returns {Promise<boolean>} True if the password matches.
   */
  async checkPassword(password) {
    return await bcrypt.compare(password, this.password);
  }
}

User.init(
  {
    // Primary key: auto-incremented ID
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    // Basic personal details
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true, // Must be unique
      validate: {
        isEmail: { msg: 'Must be a valid email address.' },
      },
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true, // Must be unique
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    // Optional fields for clients
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    gender: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    weight: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    height: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    fitnessGoal: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    trainingExperience: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    healthConcerns: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    emergencyContact: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Role field to distinguish between client and admin
    role: {
      type: DataTypes.ENUM('user', 'admin'),
      defaultValue: 'user',
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
  }
);

// Hook to hash the password before creating a new user.
User.beforeCreate(async (user, options) => {
  try {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
  } catch (err) {
    console.error("Error in beforeCreate hook:", err);
    throw err;
  }
});

// Hook to hash the password before updating the user if the password has changed.
User.beforeUpdate(async (user, options) => {
  try {
    if (user.changed('password')) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(user.password, salt);
    }
  } catch (err) {
    console.error("Error in beforeUpdate hook:", err);
    throw err;
  }
});

export default User;
