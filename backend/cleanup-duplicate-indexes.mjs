import sequelize from './database.mjs';

console.log('Cleaning up duplicate indexes on users table...\n');

(async () => {
  try {
    // Check existing indexes first
    const [existingIndexes] = await sequelize.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'users'
      ORDER BY indexname;
    `);

    console.log(`Found ${existingIndexes.length} indexes on users table:`);
    existingIndexes.forEach(idx => console.log(`  - ${idx.indexname}`));
    console.log('');

    // Count duplicates
    const emailDuplicates = existingIndexes.filter(idx =>
      idx.indexname.startsWith('users_email_key') && idx.indexname !== 'users_email_key'
    );
    const usernameDuplicates = existingIndexes.filter(idx =>
      idx.indexname.startsWith('users_username_key') && idx.indexname !== 'users_username_key'
    );

    console.log(`Email duplicates to remove: ${emailDuplicates.length}`);
    console.log(`Username duplicates to remove: ${usernameDuplicates.length}\n`);

    // Remove duplicate email constraints
    if (emailDuplicates.length > 0) {
      console.log('Removing duplicate email constraints...');
      for (const idx of emailDuplicates) {
        console.log(`  Dropping constraint ${idx.indexname}...`);
        await sequelize.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS ${idx.indexname};`);
      }
      console.log(`✓ Removed ${emailDuplicates.length} duplicate email constraints\n`);
    } else {
      console.log('✓ No duplicate email constraints found\n');
    }

    // Remove duplicate username constraints
    if (usernameDuplicates.length > 0) {
      console.log('Removing duplicate username constraints...');
      for (const idx of usernameDuplicates) {
        console.log(`  Dropping constraint ${idx.indexname}...`);
        await sequelize.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS ${idx.indexname};`);
      }
      console.log(`✓ Removed ${usernameDuplicates.length} duplicate username constraints\n`);
    } else {
      console.log('✓ No duplicate username constraints found\n');
    }

    // Verify cleanup
    const [finalIndexes] = await sequelize.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'users'
      ORDER BY indexname;
    `);

    console.log(`Final indexes on users table (${finalIndexes.length} total):`);
    finalIndexes.forEach(idx => {
      console.log(`  - ${idx.indexname}`);
    });

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    await sequelize.close();
    process.exit(1);
  }
})();
