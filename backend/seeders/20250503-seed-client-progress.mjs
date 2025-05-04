// backend/seeders/20250503-seed-client-progress.mjs
import { v4 as uuidv4 } from 'uuid';

/**
 * Seeds initial client progress data for demonstration
 * Creates sample progress records for existing client users
 */
export async function up(queryInterface, Sequelize) {
  const now = new Date();
  
  // First, find existing client users to use their IDs
  const clientUsers = await queryInterface.sequelize.query(
    `SELECT id FROM users WHERE role = 'client' LIMIT 5`,
    { type: Sequelize.QueryTypes.SELECT }
  );
  
  // If no client users exist, we can't create progress records
  if (clientUsers.length === 0) {
    console.log('No client users found, skipping client progress seeding');
    return;
  }
  
  // Create sample progress data for each client
  const clientProgressRecords = clientUsers.map((client, index) => {
    // Calculate different levels based on the index to make varied data
    const baseLevel = 10 + (index * 5);
    
    // Create a progression of achievements for demo purposes
    const achievements = [];
    const achievementDates = {};
    
    if (baseLevel >= 10) {
      achievements.push('core-10');
      achievementDates['core-10'] = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)).toISOString(); // 30 days ago
    }
    
    if (baseLevel >= 15) {
      achievements.push('balance-10');
      achievementDates['balance-10'] = new Date(now.getTime() - (25 * 24 * 60 * 60 * 1000)).toISOString(); // 25 days ago
    }
    
    if (baseLevel >= 20) {
      achievements.push('flexibility-10');
      achievementDates['flexibility-10'] = new Date(now.getTime() - (20 * 24 * 60 * 60 * 1000)).toISOString(); // 20 days ago
      
      achievements.push('calisthenics-10');
      achievementDates['calisthenics-10'] = new Date(now.getTime() - (15 * 24 * 60 * 60 * 1000)).toISOString(); // 15 days ago
    }
    
    if (baseLevel >= 25) {
      achievements.push('squats-10');
      achievementDates['squats-10'] = new Date(now.getTime() - (10 * 24 * 60 * 60 * 1000)).toISOString(); // 10 days ago
      
      achievements.push('lunges-10');
      achievementDates['lunges-10'] = new Date(now.getTime() - (5 * 24 * 60 * 60 * 1000)).toISOString(); // 5 days ago
    }
    
    return {
      id: uuidv4(),
      userId: client.id,
      overallLevel: baseLevel,
      experiencePoints: 50, // Half way to next level
      // NASM protocol categories
      coreLevel: baseLevel + (index % 3), // Vary by small amount
      balanceLevel: baseLevel - (index % 4),
      stabilityLevel: baseLevel + (index % 2),
      flexibilityLevel: baseLevel - (index % 3),
      calisthenicsLevel: baseLevel + (index % 5),
      isolationLevel: baseLevel - (index % 2),
      stabilizersLevel: baseLevel - 2,
      injuryPreventionLevel: baseLevel - 5,
      injuryRecoveryLevel: baseLevel - 7,
      // Body part levels
      glutesLevel: baseLevel + 2,
      calfsLevel: baseLevel - 1,
      shouldersLevel: baseLevel,
      hamstringsLevel: baseLevel + 1,
      absLevel: baseLevel + 3,
      chestLevel: baseLevel - 2,
      bicepsLevel: baseLevel,
      tricepsLevel: baseLevel - 1,
      tibialisAnteriorLevel: baseLevel - 5,
      serratusAnteriorLevel: baseLevel - 4,
      latissimusDorsiLevel: baseLevel - 3,
      hipsLevel: baseLevel,
      lowerBackLevel: baseLevel - 1,
      wristsForearmLevel: baseLevel - 6,
      neckLevel: baseLevel - 7,
      // Key exercises
      squatsLevel: baseLevel + 5, // Higher for key exercise
      lungesLevel: baseLevel + 3,
      planksLevel: baseLevel + 4,
      reversePlanksLevel: baseLevel,
      // Other progress data
      achievements: JSON.stringify(achievements),
      achievementDates: JSON.stringify(achievementDates),
      progressNotes: `Client is making steady progress. ${baseLevel > 20 ? 'Showing good form in compound movements.' : 'Still developing proper form for basic movements.'}`,
      unlockedExercises: JSON.stringify([]),
      lastAssessmentDate: new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)), // 1 week ago
      // Metrics
      workoutsCompleted: 10 + (index * 2),
      totalExercisesPerformed: 120 + (index * 15),
      streakDays: index + 1,
      totalMinutes: 300 + (index * 30),
      createdAt: now,
      updatedAt: now
    };
  });
  
  // Insert all the client progress records
  return queryInterface.bulkInsert('client_progress', clientProgressRecords, {});
}

/**
 * Rollback seed
 */
export async function down(queryInterface, Sequelize) {
  // Remove all seeded client progress records
  return queryInterface.bulkDelete('client_progress', null, {});
}
