import sequelize from './database.mjs';
import { QueryTypes } from 'sequelize';

(async () => {
  try {
    await sequelize.authenticate();
    console.log('\n=== Checking Video Library Tables ===\n');

    const videoLibTables = await sequelize.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public'
       AND table_name IN ('exercise_library', 'exercise_videos', 'video_analytics')
       ORDER BY table_name`,
      { type: QueryTypes.SELECT }
    );

    console.log('✅ Video Library tables:');
    videoLibTables.forEach(t => console.log('  -', t.table_name));

    if (videoLibTables.length === 3) {
      console.log('\n🎉 All Video Library tables created successfully!');

      // Check exercise count
      const [exercises] = await sequelize.query(
        `SELECT COUNT(*) as count FROM exercise_library WHERE "deletedAt" IS NULL`,
        { type: QueryTypes.SELECT }
      );

      console.log(`\n📋 Seeded exercises: ${exercises.count} foundational NASM exercises`);
    } else {
      console.log(`\n⚠️  Expected 3 tables, found ${videoLibTables.length}`);
    }

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
