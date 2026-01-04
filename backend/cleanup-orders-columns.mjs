import sequelize from './database.mjs';

async function cleanupOrdersTable() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database');

    // List of columns that might have been partially added
    const columnsToRemove = [
      'trainer_id',
      'lead_source',
      'tax_amount',
      'tax_rate_applied',
      'tax_charged_to_client',
      'client_state',
      'business_cut',
      'trainer_cut',
      'grant_reason',
      'sessions_granted',
      'credits_granted_at'
    ];

    // Check which columns exist
    const [existingColumns] = await sequelize.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name='orders'
      AND column_name IN (${columnsToRemove.map(c => `'${c}'`).join(',')})
    `);

    console.log(`\nFound ${existingColumns.length} columns to remove:`, existingColumns.map(c => c.column_name));

    // Drop each existing column
    for (const col of existingColumns) {
      await sequelize.query(`ALTER TABLE orders DROP COLUMN IF EXISTS ${col.column_name} CASCADE`);
      console.log(`✅ Dropped column: ${col.column_name}`);
    }

    console.log('\n✅ Cleanup complete');
    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

cleanupOrdersTable();
