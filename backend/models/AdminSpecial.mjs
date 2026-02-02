import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const AdminSpecial = sequelize.define(
    'AdminSpecial',
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
      tableName: 'admin_specials',
      timestamps: true,
      paranoid: true,
      indexes: [{ fields: ['isActive'] }, { fields: ['startDate', 'endDate'] }]
    }
  );

  AdminSpecial.associate = (models) => {
    AdminSpecial.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });
  };

  // Class methods
  AdminSpecial.getActiveSpecials = async function () {
    const now = new Date();
    return this.findAll({
      where: {
        isActive: true,
        startDate: { [sequelize.Sequelize.Op.lte]: now },
        endDate: { [sequelize.Sequelize.Op.gte]: now }
      },
      order: [['endDate', 'ASC']]
    });
  };

  AdminSpecial.getSpecialsForPackage = async function (packageId) {
    const activeSpecials = await this.getActiveSpecials();
    return activeSpecials.filter(
      (special) =>
        !special.applicablePackageIds?.length ||
        special.applicablePackageIds.includes(packageId)
    );
  };

  return AdminSpecial;
};
