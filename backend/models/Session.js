// backend/models/Session.js
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
    // Date/time when the session is scheduled.
    sessionDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    // Status can be 'scheduled', 'completed', or 'cancelled'.
    status: {
      type: DataTypes.ENUM('scheduled', 'completed', 'cancelled'),
      defaultValue: 'scheduled',
      allowNull: false,
    },
    // Additional details (e.g., notes or type of session)
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Session',
    tableName: 'sessions',
    timestamps: true,
  }
);

// Associate sessions with users.
User.hasMany(Session, { foreignKey: 'userId', as: 'sessions' });
Session.belongsTo(User, { foreignKey: 'userId', as: 'user' });

export default Session;
