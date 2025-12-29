import sequelize from './database.mjs';

console.log('Adding missing indexes to client_trainer_assignments...\n');

(async () => {
  try {
    // Check existing indexes first
    const [existingIndexes] = await sequelize.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'client_trainer_assignments';
    `);
    
    console.log('Existing indexes:');
    existingIndexes.forEach(idx => console.log(`  - ${idx.indexname}`));
    console.log('');
    
    const indexesToCreate = [
      {
        name: 'idx_client_trainer_assigned_by',
        column: 'assigned_by',
        sql: 'CREATE INDEX IF NOT EXISTS idx_client_trainer_assigned_by ON client_trainer_assignments(assigned_by);'
      },
      {
        name: 'idx_client_trainer_last_modified',
        column: 'last_modified_by',
        sql: 'CREATE INDEX IF NOT EXISTS idx_client_trainer_last_modified ON client_trainer_assignments(last_modified_by);'
      }
    ];
    
    for (const index of indexesToCreate) {
      const exists = existingIndexes.some(idx => idx.indexname === index.name);
      
      if (exists) {
        console.log(`✓ Index ${index.name} already exists`);
      } else {
        console.log(`Creating index ${index.name} on ${index.column}...`);
        await sequelize.query(index.sql);
        console.log(`✓ Created ${index.name}`);
      }
    }
    
    // Verify all indexes were created
    const [finalIndexes] = await sequelize.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'client_trainer_assignments'
      ORDER BY indexname;
    `);
    
    console.log('\nFinal indexes on client_trainer_assignments:');
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
