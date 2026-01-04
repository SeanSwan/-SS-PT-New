import { DataTypes, Model } from 'sequelize';

export default (sequelize) => {
  class ProgressReport extends Model {}

  ProgressReport.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id',
      },
    },
    reportPeriod: {
      type: DataTypes.ENUM('monthly', 'quarterly', 'bi_annual', 'annual'),
      allowNull: false,
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    baselineMeasurementId: {
      type: DataTypes.UUID,
      references: {
        model: 'body_measurements',
        key: 'id',
      },
    },
    latestMeasurementId: {
      type: DataTypes.UUID,
      references: {
        model: 'body_measurements',
        key: 'id',
      },
    },
    summaryData: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
    chartData: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
    generatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    sentToClient: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    sentAt: {
      type: DataTypes.DATE,
    },
    clientViewed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    clientViewedAt: {
      type: DataTypes.DATE,
    },
    reviewedByTrainer: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    trainerNotes: {
      type: DataTypes.TEXT,
    },
    actionItemsForNextPeriod: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    triggeredRenewal: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    clientResigned: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    resignedAt: {
      type: DataTypes.DATE,
    },
  }, {
    sequelize,
    modelName: 'ProgressReport',
    tableName: 'progress_reports',
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['reportPeriod'] },
      { fields: ['startDate', 'endDate'] },
      { fields: ['generatedAt'] },
    ],
  });

  return ProgressReport;
};
