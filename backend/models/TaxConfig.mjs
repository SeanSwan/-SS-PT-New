// backend/models/TaxConfig.mjs
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class TaxConfig extends Model {}

TaxConfig.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    stateCode: {
      type: DataTypes.STRING(2),
      allowNull: false,
      unique: true,
      field: 'state_code',
    },
    stateName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'state_name',
    },
    taxRate: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: false,
      field: 'tax_rate',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      field: 'is_active',
    },
    effectiveDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'effective_date',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'TaxConfig',
    tableName: 'tax_config',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default TaxConfig;
