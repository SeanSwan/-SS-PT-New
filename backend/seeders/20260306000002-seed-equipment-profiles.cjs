'use strict';

/**
 * Seed default equipment profiles for all trainers/admins.
 * Creates 4 built-in profiles: Move Fitness, Park / Outdoor, Home Gym, Client Home.
 * Park profile pre-populated with bodyweight exercises.
 * Home Gym pre-populated with common home equipment.
 * Idempotent — skips if profiles already exist for a trainer.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Find all trainers/admins
    const [trainers] = await queryInterface.sequelize.query(
      `SELECT id FROM "Users" WHERE role IN ('admin', 'trainer') ORDER BY "createdAt" ASC;`
    );

    if (!trainers.length) {
      console.log('No trainers/admins found -- skipping equipment profile seed.');
      return;
    }

    const now = new Date().toISOString();

    const DEFAULT_PROFILES = [
      {
        name: 'Move Fitness',
        locationType: 'gym',
        description: 'Sean\'s primary gym — full commercial equipment',
        isDefault: true,
      },
      {
        name: 'Park / Outdoor',
        locationType: 'park',
        description: 'Minimal/no equipment — bodyweight-focused workouts',
        isDefault: true,
      },
      {
        name: 'Home Gym',
        locationType: 'home',
        description: 'Basic home setup — dumbbells, bands, bench, pull-up bar',
        isDefault: true,
      },
      {
        name: 'Client Home',
        locationType: 'client_home',
        description: 'Varies per client — assessed on first visit',
        isDefault: true,
      },
    ];

    // Pre-populated equipment for Park profile
    const PARK_EQUIPMENT = [
      { name: 'Pull-Up Bar (Outdoor)', category: 'pull_up_bar', resistanceType: 'bodyweight', description: 'Outdoor pull-up bar at the park' },
      { name: 'Park Bench', category: 'bench', resistanceType: 'bodyweight', description: 'Standard park bench for step-ups, incline push-ups, tricep dips' },
      { name: 'Parallel Bars', category: 'bodyweight', resistanceType: 'bodyweight', description: 'Parallel dip bars for dips, L-sits, and bodyweight exercises' },
      { name: 'Open Ground', category: 'bodyweight', resistanceType: 'bodyweight', description: 'Flat ground for sprints, burpees, lunges, and agility drills' },
    ];

    // Pre-populated equipment for Home Gym profile
    const HOME_EQUIPMENT = [
      { name: 'Adjustable Dumbbells', category: 'dumbbell', resistanceType: 'dumbbell', description: 'Adjustable dumbbell set (5-50 lbs)' },
      { name: 'Resistance Bands Set', category: 'resistance_band', resistanceType: 'band', description: 'Loop and tube resistance bands (light to heavy)' },
      { name: 'Flat/Incline Bench', category: 'bench', resistanceType: 'bodyweight', description: 'Adjustable bench for presses, rows, and step-ups' },
      { name: 'Pull-Up Bar (Doorway)', category: 'pull_up_bar', resistanceType: 'bodyweight', description: 'Doorway-mounted pull-up bar' },
      { name: 'Yoga Mat', category: 'other', resistanceType: 'bodyweight', description: 'Exercise mat for floor work, stretching, and core exercises' },
      { name: 'Foam Roller', category: 'foam_roller', resistanceType: 'bodyweight', description: 'Standard density foam roller for myofascial release' },
      { name: 'Stability Ball', category: 'stability_ball', resistanceType: 'bodyweight', description: '65cm stability ball for core work and stretching' },
    ];

    for (const trainer of trainers) {
      const trainerId = trainer.id;

      // Check if default profiles already exist for this trainer
      const [existing] = await queryInterface.sequelize.query(
        `SELECT COUNT(*) as cnt FROM equipment_profiles WHERE "trainerId" = ${trainerId} AND "isDefault" = true;`
      );

      if (existing[0].cnt > 0) {
        console.log(`Trainer ${trainerId} already has default profiles -- skipping.`);
        continue;
      }

      // Insert default profiles
      await queryInterface.bulkInsert('equipment_profiles', DEFAULT_PROFILES.map(p => ({
        ...p,
        trainerId,
        isActive: true,
        equipmentCount: 0,
        createdAt: now,
        updatedAt: now,
      })));

      console.log(`Created 4 default equipment profiles for trainer ${trainerId}.`);

      // Get the Park and Home Gym profile IDs we just created
      const [parkProfiles] = await queryInterface.sequelize.query(
        `SELECT id FROM equipment_profiles WHERE "trainerId" = ${trainerId} AND name = 'Park / Outdoor' LIMIT 1;`
      );
      const [homeProfiles] = await queryInterface.sequelize.query(
        `SELECT id FROM equipment_profiles WHERE "trainerId" = ${trainerId} AND name = 'Home Gym' LIMIT 1;`
      );

      // Seed Park equipment
      if (parkProfiles.length) {
        const parkId = parkProfiles[0].id;
        await queryInterface.bulkInsert('equipment_items', PARK_EQUIPMENT.map(e => ({
          ...e,
          profileId: parkId,
          approvalStatus: 'manual',
          isActive: true,
          quantity: 1,
          createdAt: now,
          updatedAt: now,
        })));
        await queryInterface.sequelize.query(
          `UPDATE equipment_profiles SET "equipmentCount" = ${PARK_EQUIPMENT.length} WHERE id = ${parkId};`
        );
        console.log(`Seeded ${PARK_EQUIPMENT.length} items for Park profile.`);
      }

      // Seed Home Gym equipment
      if (homeProfiles.length) {
        const homeId = homeProfiles[0].id;
        await queryInterface.bulkInsert('equipment_items', HOME_EQUIPMENT.map(e => ({
          ...e,
          profileId: homeId,
          approvalStatus: 'manual',
          isActive: true,
          quantity: 1,
          createdAt: now,
          updatedAt: now,
        })));
        await queryInterface.sequelize.query(
          `UPDATE equipment_profiles SET "equipmentCount" = ${HOME_EQUIPMENT.length} WHERE id = ${homeId};`
        );
        console.log(`Seeded ${HOME_EQUIPMENT.length} items for Home Gym profile.`);
      }
    }

    console.log('Equipment profile seeding complete.');
  },

  async down(queryInterface) {
    // Remove seeded equipment items from default profiles
    await queryInterface.sequelize.query(
      `DELETE FROM equipment_items WHERE "profileId" IN (SELECT id FROM equipment_profiles WHERE "isDefault" = true);`
    );
    // Remove default profiles
    await queryInterface.sequelize.query(
      `DELETE FROM equipment_profiles WHERE "isDefault" = true;`
    );
  },
};
