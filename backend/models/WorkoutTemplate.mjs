import { DataTypes, Model } from 'sequelize';

export default (sequelize) => {
  class WorkoutTemplate extends Model {}

  WorkoutTemplate.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    templateName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    exercises: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      comment: 'Array of exercise objects with sets, reps, weight',
    },
    estimatedDuration: {
      type: DataTypes.INTEGER,
      comment: 'Duration in minutes',
    },
    targetIntensity: {
      type: DataTypes.INTEGER,
      validate: {
        min: 1,
        max: 10,
      },
    },
    category: {
      type: DataTypes.STRING,
      comment: 'e.g., Upper Body, Lower Body, Full Body, Cardio',
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'If true, other users can see and use this template',
    },
    useCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Number of times this template has been used',
    },
    lastUsed: {
      type: DataTypes.DATE,
    },
  }, {
    sequelize,
    modelName: 'WorkoutTemplate',
    tableName: 'workout_templates',
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['templateName'] },
      { fields: ['category'] },
      { fields: ['isPublic'] },
    ],
  });

  return WorkoutTemplate;
};
