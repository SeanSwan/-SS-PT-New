import sequelize from './database.mjs';

console.log('Creating client_trainer_assignments table...\n');

(async () => {
  const transaction = await sequelize.transaction();
  
  try {
    const tableCheckResult = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_name = 'client_trainer_assignments'",
      { transaction }
    );
    
    const tables = tableCheckResult[0];
    
    if (tables && tables.length > 0) {
      console.log('Table already exists!');
      await transaction.rollback();
      process.exit(0);
    }
    
    console.log('Creating table...');
    
    await sequelize.query(`
      CREATE TABLE client_trainer_assignments (
        id SERIAL PRIMARY KEY,
        "clientId" INTEGER NOT NULL,
        "trainerId" INTEGER NOT NULL,
        "assignedBy" INTEGER NOT NULL,
        status VARCHAR(255) NOT NULL DEFAULT 'active',
        "startDate" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "endDate" TIMESTAMP WITH TIME ZONE,
        notes TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("clientId") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY ("trainerId") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY ("assignedBy") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
      );
    `, { transaction });
    
    console.log('Creating indexes...');
    
    await sequelize.query(`
      CREATE INDEX idx_client_trainer_client ON client_trainer_assignments("clientId");
    `, { transaction });
    
    await sequelize.query(`
      CREATE INDEX idx_client_trainer_trainer ON client_trainer_assignments("trainerId");
    `, { transaction });
    
    await sequelize.query(`
      CREATE INDEX idx_client_trainer_status ON client_trainer_assignments(status);
    `, { transaction });
    
    await transaction.commit();
    console.log('\nTable created successfully!');
    
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    await transaction.rollback();
    console.error('Error:', err.message);
    await sequelize.close();
    process.exit(1);
  }
})();
