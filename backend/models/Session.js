import { DataTypes, Model } from 'sequelize';
import sequelize from './../database.js';
import User from './User.js';

class Session extends Model {}

Session.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    // Date/time when the session is scheduled to start.
    sessionDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    // Duration in minutes (optional).
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 60,
    },
    // Status includes: available, requested, scheduled, completed, cancelled.
    status: {
      type: DataTypes.ENUM('available', 'requested', 'scheduled', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'available',
    },
    // Additional session details (e.g., notes)
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Flag to indicate whether the session has been confirmed by admin.
    confirmed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: 'Session',
    tableName: 'sessions',
    timestamps: true,
  }
);

// Associations: A User can have many Sessions; a Session belongs to a User.
User.hasMany(Session, { foreignKey: 'userId', as: 'sessions' });
Session.belongsTo(User, { foreignKey: 'userId', as: 'user' });

export default Session;
