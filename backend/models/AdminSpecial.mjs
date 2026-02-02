import { DataTypes, Model, Op } from 'sequelize';
import sequelize from '../database.mjs';

class AdminSpecial extends Model {
  static async getActiveSpecials() {
    const now = new Date();
    return this.findAll({
      where: {
        isActive: true,
        startDate: { [Op.lte]: now },
        endDate: { [Op.gte]: now }
      },
      order: [['endDate', 'ASC']]
    });
  }

  static async getSpecialsForPackage(packageId) {
    const activeSpecials = await this.getActiveSpecials();
    return activeSpecials.filter(
      (special) =>
        !special.applicablePackageIds?.length ||
        special.applicablePackageIds.includes(packageId)
    );
  }
}

AdminSpecial.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 100]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    bonusSessions: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    bonusDuration: {
      type: DataTypes.INTEGER,
      defaultValue: 60,
      validate: {
        min: 15
      }
    },
    applicablePackageIds: {
      type: DataTypes.ARRAY(DataTypes.INTEGER),
      allowNull: true,
      defaultValue: []
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isAfterStart(value) {
          if (this.startDate && value <= this.startDate) {
            throw new Error('End date must be after start date');
          }
        }
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  },
  {
    sequelize,
    modelName: 'AdminSpecial',
    tableName: 'admin_specials',
    timestamps: true,
    paranoid: true,
    indexes: [{ fields: ['isActive'] }, { fields: ['startDate', 'endDate'] }]
  }
);

export default AdminSpecial;
