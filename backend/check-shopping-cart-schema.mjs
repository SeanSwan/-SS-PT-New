import sequelize from './database.mjs';

console.log('Checking shopping_carts table schema...\n');

(async () => {
  try {
    // Check if table exists
    const [tables] = await sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'shopping_carts';
    `);

    if (tables.length === 0) {
      console.log('❌ shopping_carts table does not exist\n');
      await sequelize.close();
      process.exit(0);
    }

    console.log('✓ shopping_carts table exists\n');

    // Check the status column type and default
    const [columns] = await sequelize.query(`
      SELECT
        column_name,
        data_type,
        udt_name,
        column_default,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'shopping_carts' AND column_name = 'status';
    `);

    if (columns.length > 0) {
      console.log('Status column details:');
      console.log(`  Data type: ${columns[0].data_type}`);
      console.log(`  UDT name: ${columns[0].udt_name}`);
      console.log(`  Default: ${columns[0].column_default}`);
      console.log(`  Nullable: ${columns[0].is_nullable}\n`);
    }

    // Check what enum values exist
    const [enumValues] = await sequelize.query(`
      SELECT enumlabel
      FROM pg_enum
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
      WHERE pg_type.typname = 'enum_shopping_carts_status'
      ORDER BY enumsortorder;
    `);

    if (enumValues.length > 0) {
      console.log('Current enum values:');
      enumValues.forEach(val => console.log(`  - ${val.enumlabel}`));
      console.log('');
    } else {
      console.log('⚠️  enum_shopping_carts_status type does not exist\n');
    }

    // Check for any existing data
    const [rowCount] = await sequelize.query(`
      SELECT COUNT(*) as count FROM shopping_carts;
    `);

    console.log(`Total rows in shopping_carts: ${rowCount[0].count}\n`);

    // If there are rows, check what status values are being used
    if (rowCount[0].count > 0) {
      const [statusValues] = await sequelize.query(`
        SELECT status, COUNT(*) as count
        FROM shopping_carts
        GROUP BY status
        ORDER BY count DESC;
      `);

      console.log('Status values in use:');
      statusValues.forEach(row => {
        console.log(`  - ${row.status}: ${row.count} rows`);
      });
    }

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    await sequelize.close();
    process.exit(1);
  }
})();
