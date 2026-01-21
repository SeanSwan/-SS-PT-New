import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class AutomationSequence extends Model {}

AutomationSequence.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    triggerEvent: {
      type: DataTypes.STRING,
      allowNull: false
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    steps: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: []
    }
  },
  {
    sequelize,
    modelName: 'AutomationSequence',
    tableName: 'automation_sequences',
    timestamps: true,
    indexes: [
      { fields: ['triggerEvent'] },
      { fields: ['isActive'] }
    ]
  }
);

AutomationSequence.associate = (models) => {
  AutomationSequence.hasMany(models.AutomationLog, {
    foreignKey: 'sequenceId',
    as: 'logs'
  });
};

export default AutomationSequence;
