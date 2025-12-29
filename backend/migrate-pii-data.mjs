import sequelize from './database.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔒 Migrating client PII data from markdown to database...\n');

// Client data extracted from CLIENT-REGISTRY.md
const clients = [
  {
    client_id: 'PT-10001',
    real_name: 'Alexandra Panter',
    spirit_name: 'GOLDEN HAWK',
    status: 'active',
    start_date: '2021-11-10',
    current_program: 'Metabolic Shred (Aggressive Fat Loss)',
    special_notes: 'Ankle stability work, naturally thick build, fat-burning zone focus',
    master_prompt_path: 'docs/ai-workflow/personal-training/clients/PT-10001-golden-hawk.json',
    privacy_level: 'standard'
  },
  {
    client_id: 'PT-10002',
    real_name: 'Johnna',
    spirit_name: 'SILVER CRANE',
    status: 'active',
    start_date: '2024-08-01',
    current_program: 'Shoulder-Safe Strength',
    special_notes: 'CRITICAL - Shoulder impingement, NO overhead press, NO standard push-ups',
    master_prompt_path: 'docs/ai-workflow/personal-training/clients/PT-10002-silver-crane.json',
    privacy_level: 'standard'
  },
  {
    client_id: 'PT-10003',
    real_name: 'Jacqueline Sammons',
    spirit_name: 'THUNDER PHOENIX',
    status: 'active',
    start_date: '2024-01-01',
    current_program: 'High-Energy Circuit Training',
    special_notes: 'Prefers 30-min "Beachbody style" workouts, focus on triceps/legs/abs',
    master_prompt_path: 'docs/ai-workflow/personal-training/clients/PT-10003-thunder-phoenix.json',
    privacy_level: 'standard'
  },
  {
    client_id: 'PT-10004',
    real_name: 'Ajay',
    spirit_name: 'MOUNTAIN BEAR',
    status: 'active',
    start_date: '2024-09-01',
    current_program: 'Core Mastery & Mobility',
    special_notes: 'Pelvic floor tightness, avoid Kegels, referred to specialist',
    master_prompt_path: 'docs/ai-workflow/personal-training/clients/PT-10004-mountain-bear.json',
    privacy_level: 'standard'
  },
  {
    client_id: 'PT-10005',
    real_name: 'Cindy Basadar',
    spirit_name: 'RISING EAGLE',
    status: 'active',
    start_date: '2024-09-20',
    current_program: 'Full Body Strength & Stability',
    special_notes: 'Age 50+, extremely tight (glutes/back/hips), triceps + fat loss goals',
    master_prompt_path: 'docs/ai-workflow/personal-training/clients/PT-10005-rising-eagle.json',
    privacy_level: 'standard'
  },
  {
    client_id: 'PT-10006',
    real_name: 'Cindy Bruner',
    spirit_name: 'WISE OWL',
    status: 'active',
    start_date: '2024-09-24',
    current_program: 'Body Mastery & Dynamic Balance',
    special_notes: 'Age 65+, does yoga but poor dynamic balance, complements heavy lifting elsewhere',
    master_prompt_path: 'docs/ai-workflow/personal-training/clients/PT-10006-wise-owl.json',
    privacy_level: 'standard'
  },
  {
    client_id: 'PT-10007',
    real_name: 'Umair Syed',
    spirit_name: 'STONE BISON',
    status: 'active',
    start_date: '2024-09-24',
    current_program: 'Foundational Movement ("Level Zero")',
    special_notes: 'Age ~60-70, extremely tight, postural imbalances, "You Go I Go" format with PT-10008',
    master_prompt_path: 'docs/ai-workflow/personal-training/clients/PT-10007-stone-bison.json',
    privacy_level: 'standard'
  },
  {
    client_id: 'PT-10008',
    real_name: 'Usmaan Syed',
    spirit_name: 'YOUNG FALCON',
    status: 'active',
    start_date: '2024-09-24',
    current_program: 'Foundational Movement ("Level Zero")',
    special_notes: 'Age ~40-50, partner training with PT-10007, "You Go I Go" format',
    master_prompt_path: 'docs/ai-workflow/personal-training/clients/PT-10008-young-falcon.json',
    privacy_level: 'standard'
  }
];

(async () => {
  try {
    // Check if data already exists
    const [existingCount] = await sequelize.query(`
      SELECT COUNT(*) as count FROM clients_pii;
    `);

    if (existingCount[0].count > 0) {
      console.log(`⚠️  Found ${existingCount[0].count} existing records in clients_pii table`);
      console.log('Skipping migration to avoid duplicates.\n');
      console.log('If you want to re-migrate, first run:');
      console.log('  DELETE FROM clients_pii;\n');
      await sequelize.close();
      process.exit(0);
    }

    console.log(`Migrating ${clients.length} client records...\n`);

    let successCount = 0;
    for (const client of clients) {
      try {
        await sequelize.query(`
          INSERT INTO clients_pii (
            client_id, real_name, spirit_name, status,
            start_date, current_program, special_notes,
            master_prompt_path, privacy_level, created_by
          ) VALUES (
            :client_id, :real_name, :spirit_name, :status,
            :start_date, :current_program, :special_notes,
            :master_prompt_path, :privacy_level, NULL
          )
        `, {
          replacements: client
        });

        console.log(`✓ Migrated ${client.client_id} - ${client.spirit_name}`);
        successCount++;
      } catch (err) {
        console.error(`✗ Failed to migrate ${client.client_id}:`, err.message);
      }
    }

    console.log(`\n✅ Successfully migrated ${successCount}/${clients.length} client records\n`);

    // Verify the migration
    const [finalCount] = await sequelize.query(`
      SELECT COUNT(*) as count FROM clients_pii;
    `);

    console.log(`Final record count in clients_pii: ${finalCount[0].count}`);

    // Show sample records (spirit names only - no real names)
    const [sampleRecords] = await sequelize.query(`
      SELECT client_id, spirit_name, status, start_date
      FROM clients_pii
      ORDER BY client_id
      LIMIT 5;
    `);

    console.log('\nSample records (spirit names):');
    sampleRecords.forEach(record => {
      console.log(`  - ${record.client_id}: ${record.spirit_name} (${record.status})`);
    });

    console.log('\n🔒 PII data migration complete!');
    console.log('\n⚠️  NEXT STEPS:');
    console.log('1. Verify data integrity in database');
    console.log('2. Delete CLIENT-REGISTRY.md file');
    console.log('3. Remove CLIENT-REGISTRY.md from git history');
    console.log('4. Create secure API endpoint for admin access');
    console.log('5. Add audit logging for all PII access\n');

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);
    await sequelize.close();
    process.exit(1);
  }
})();
