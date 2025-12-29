import sequelize from './database.mjs';

console.log('Fixing shopping_carts status column to use proper ENUM...\n');

(async () => {
  try {
    // Step 1: Drop the existing default (varchar-based)
    console.log('Step 1: Removing varchar default...');
    await sequelize.query(`
      ALTER TABLE shopping_carts
      ALTER COLUMN status DROP DEFAULT;
    `);
    console.log('✓ Default removed\n');

    // Step 2: Check if the new enum type already exists, create if not
    const [existingEnumNew] = await sequelize.query(`
      SELECT typname
      FROM pg_type
      WHERE typname = 'enum_shopping_carts_status_new';
    `);

    if (existingEnumNew.length === 0) {
      console.log('Step 2: Creating new enum type with all status values...');
      await sequelize.query(`
        CREATE TYPE enum_shopping_carts_status_new AS ENUM (
          'active',
          'pending_payment',
          'completed',
          'cancelled'
        );
      `);
      console.log('✓ New enum type created\n');
    } else {
      console.log('Step 2: New enum type already exists\n');
    }

    // Step 3: Convert column from varchar to new enum type
    console.log('Step 3: Converting status column to enum type...');
    await sequelize.query(`
      ALTER TABLE shopping_carts
      ALTER COLUMN status TYPE enum_shopping_carts_status_new
      USING status::text::enum_shopping_carts_status_new;
    `);
    console.log('✓ Column converted to enum\n');

    // Step 4: Drop old enum type and rename new one
    console.log('Step 4: Cleaning up enum types...');
    await sequelize.query(`
      DROP TYPE IF EXISTS enum_shopping_carts_status;
    `);
    await sequelize.query(`
      ALTER TYPE enum_shopping_carts_status_new RENAME TO enum_shopping_carts_status;
    `);
    console.log('✓ Enum types cleaned up\n');

    // Step 5: Add back the default value (now as enum)
    console.log('Step 5: Setting default value to active...');
    await sequelize.query(`
      ALTER TABLE shopping_carts
      ALTER COLUMN status SET DEFAULT 'active'::enum_shopping_carts_status;
    `);
    console.log('✓ Default value set\n');

    // Verify the final state
    const [finalColumn] = await sequelize.query(`
      SELECT
        column_name,
        data_type,
        udt_name,
        column_default,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'shopping_carts' AND column_name = 'status';
    `);

    console.log('Final status column configuration:');
    console.log(`  Data type: ${finalColumn[0].data_type}`);
    console.log(`  UDT name: ${finalColumn[0].udt_name}`);
    console.log(`  Default: ${finalColumn[0].column_default}`);
    console.log(`  Nullable: ${finalColumn[0].is_nullable}\n`);

    const [finalEnumValues] = await sequelize.query(`
      SELECT enumlabel
      FROM pg_enum
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
      WHERE pg_type.typname = 'enum_shopping_carts_status'
      ORDER BY enumsortorder;
    `);

    console.log('Available enum values:');
    finalEnumValues.forEach(val => console.log(`  - ${val.enumlabel}`));

    console.log('\n✅ Shopping cart status enum fixed successfully!');

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);
    await sequelize.close();
    process.exit(1);
  }
})();
