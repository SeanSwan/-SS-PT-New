import sequelize from './database.mjs';
import './models/ClientTrainerAssignment.mjs';

console.log('Syncing ClientTrainerAssignment model to database...\n');

(async () => {
  try {
    // Drop and recreate the table
    await sequelize.models.ClientTrainerAssignment.sync({ force: true });
    console.log('✅ Table synced successfully!');
    
    // Verify columns
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'client_trainer_assignments'
      ORDER BY ordinal_position;
    `);
    
    console.log('\nTable columns:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });
    
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    await sequelize.close();
    process.exit(1);
  }
})();
