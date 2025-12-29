import sequelize from './database.mjs';

console.log('Fixing client_trainer_assignments table schema...\n');

(async () => {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('Dropping existing table...');
    await sequelize.query(`
      DROP TABLE IF EXISTS client_trainer_assignments CASCADE;
    `, { transaction });
    
    console.log('Creating table with correct schema...');
    
    await sequelize.query(`
      CREATE TABLE client_trainer_assignments (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL,
        trainer_id INTEGER NOT NULL,
        assigned_by INTEGER NOT NULL,
        status VARCHAR(255) NOT NULL DEFAULT 'active',
        start_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        end_date TIMESTAMP WITH TIME ZONE,
        notes TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (trainer_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
      );
    `, { transaction });
    
    console.log('Creating indexes...');
    
    await sequelize.query(`
      CREATE INDEX idx_client_trainer_client ON client_trainer_assignments(client_id);
    `, { transaction });
    
    await sequelize.query(`
      CREATE INDEX idx_client_trainer_trainer ON client_trainer_assignments(trainer_id);
    `, { transaction });
    
    await sequelize.query(`
      CREATE INDEX idx_client_trainer_status ON client_trainer_assignments(status);
    `, { transaction });
    
    await transaction.commit();
    console.log('\nTable fixed successfully!');
    
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    await transaction.rollback();
    console.error('Error:', err.message);
    await sequelize.close();
    process.exit(1);
  }
})();
