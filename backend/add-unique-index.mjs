import sequelize from './database.mjs';

console.log('Adding partial unique index to client_trainer_assignments...\n');

(async () => {
  try {
    // Check if index already exists
    const [existingIndexes] = await sequelize.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'client_trainer_assignments' 
      AND indexname = 'unique_active_assignment';
    `);
    
    if (existingIndexes.length > 0) {
      console.log('Index already exists!');
      await sequelize.close();
      process.exit(0);
    }
    
    console.log('Creating partial unique index...');
    
    await sequelize.query(`
      CREATE UNIQUE INDEX unique_active_assignment 
      ON client_trainer_assignments (client_id, trainer_id) 
      WHERE status = 'active';
    `);
    
    console.log('Index created successfully!');
    
    // Verify it was created
    const [verify] = await sequelize.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'client_trainer_assignments' 
      AND indexname = 'unique_active_assignment';
    `);
    
    if (verify.length > 0) {
      console.log('\nVerified index:');
      console.log('Name:', verify[0].indexname);
      console.log('Definition:', verify[0].indexdef);
    }
    
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    await sequelize.close();
    process.exit(1);
  }
})();
