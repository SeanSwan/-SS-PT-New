import sequelize from './database.mjs';

console.log('Adding NOT NULL constraints to client_trainer_assignments...\n');

(async () => {
  try {
    // First, check if there are any NULL values in the columns
    const [nullChecks] = await sequelize.query(`
      SELECT
        COUNT(*) FILTER (WHERE status IS NULL) as null_status_count,
        COUNT(*) FILTER (WHERE "createdAt" IS NULL) as null_created_at_count,
        COUNT(*) as total_rows
      FROM client_trainer_assignments;
    `);

    console.log('Current data status:');
    console.log(`  Total rows: ${nullChecks[0].total_rows}`);
    console.log(`  Rows with NULL status: ${nullChecks[0].null_status_count}`);
    console.log(`  Rows with NULL createdAt: ${nullChecks[0].null_created_at_count}\n`);

    // If there are NULL values, we need to fix them first
    if (nullChecks[0].null_status_count > 0) {
      console.log('⚠️  Found NULL values in status column. Setting to "active" as default...');
      await sequelize.query(`
        UPDATE client_trainer_assignments
        SET status = 'active'
        WHERE status IS NULL;
      `);
      console.log('✓ Updated NULL status values\n');
    }

    if (nullChecks[0].null_created_at_count > 0) {
      console.log('⚠️  Found NULL values in createdAt column. Setting to CURRENT_TIMESTAMP...');
      await sequelize.query(`
        UPDATE client_trainer_assignments
        SET "createdAt" = CURRENT_TIMESTAMP
        WHERE "createdAt" IS NULL;
      `);
      console.log('✓ Updated NULL createdAt values\n');
    }

    // Now add the constraints
    console.log('Adding NOT NULL constraint to status column...');
    await sequelize.query(`
      ALTER TABLE client_trainer_assignments
      ALTER COLUMN status SET NOT NULL;
    `);
    console.log('✓ Added NOT NULL constraint to status\n');

    console.log('Adding DEFAULT CURRENT_TIMESTAMP to createdAt column...');
    await sequelize.query(`
      ALTER TABLE client_trainer_assignments
      ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
    `);
    console.log('✓ Added DEFAULT CURRENT_TIMESTAMP to createdAt\n');

    console.log('Adding NOT NULL constraint to createdAt column...');
    await sequelize.query(`
      ALTER TABLE client_trainer_assignments
      ALTER COLUMN "createdAt" SET NOT NULL;
    `);
    console.log('✓ Added NOT NULL constraint to createdAt\n');

    // Verify the constraints were added
    const [constraints] = await sequelize.query(`
      SELECT
        column_name,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'client_trainer_assignments'
        AND column_name IN ('status', 'createdAt')
      ORDER BY column_name;
    `);

    console.log('Final column constraints:');
    constraints.forEach(col => {
      console.log(`  - ${col.column_name}:`);
      console.log(`      Nullable: ${col.is_nullable}`);
      console.log(`      Default: ${col.column_default || 'none'}`);
    });

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    await sequelize.close();
    process.exit(1);
  }
})();
