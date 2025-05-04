// backend/models/associations.mjs
import User from './User.mjs';
import ClientProgress from './ClientProgress.mjs';
import Exercise from './Exercise.mjs';
import WorkoutPlan from './WorkoutPlan.mjs';
import WorkoutSession from './WorkoutSession.mjs';

// Import any other existing models
// import YourOtherModel from './YourOtherModel.mjs';

// Define associations

// User to ClientProgress (one-to-one)
User.hasOne(ClientProgress, {
  foreignKey: 'userId',
  as: 'progress',
  onDelete: 'CASCADE',
});
ClientProgress.belongsTo(User, {
  foreignKey: 'userId',
  as: 'client',
});

// User (client) to WorkoutPlan (one-to-many)
User.hasMany(WorkoutPlan, {
  foreignKey: 'clientId',
  as: 'workoutPlans',
  onDelete: 'CASCADE',
});
WorkoutPlan.belongsTo(User, {
  foreignKey: 'clientId',
  as: 'client',
});

// User (trainer) to WorkoutPlan (one-to-many)
User.hasMany(WorkoutPlan, {
  foreignKey: 'trainerId',
  as: 'createdWorkoutPlans',
});
WorkoutPlan.belongsTo(User, {
  foreignKey: 'trainerId',
  as: 'trainer',
});

// User (client) to WorkoutSession (one-to-many)
User.hasMany(WorkoutSession, {
  foreignKey: 'clientId',
  as: 'workoutSessions',
  onDelete: 'CASCADE',
});
WorkoutSession.belongsTo(User, {
  foreignKey: 'clientId',
  as: 'client',
});

// User (trainer) to WorkoutSession (one-to-many)
User.hasMany(WorkoutSession, {
  foreignKey: 'trainerId',
  as: 'conductedSessions',
});
WorkoutSession.belongsTo(User, {
  foreignKey: 'trainerId',
  as: 'trainer',
});

// WorkoutPlan to WorkoutSession (one-to-many)
WorkoutPlan.hasMany(WorkoutSession, {
  foreignKey: 'workoutPlanId',
  as: 'sessions',
});
WorkoutSession.belongsTo(WorkoutPlan, {
  foreignKey: 'workoutPlanId',
  as: 'workoutPlan',
});

// Exercise to Exercise (prerequisite relationship - self-referential many-to-many)
// This is handled in the model using JSON arrays for simplicity

// Add any additional associations from your existing models
// YourOtherModel.hasMany(...)

export {
  User,
  ClientProgress,
  Exercise,
  WorkoutPlan,
  WorkoutSession,
  // Include other models here
  // YourOtherModel,
};