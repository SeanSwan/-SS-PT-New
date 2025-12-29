import sequelize from './database.mjs';

const newPasswordHash = '$2a$12$xp34/k16Cuy0N0HGdN2ENeYmPTNSc2A//Ot6n6ilNjNkC13/Z.o3m';

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Connected to database');
    
    const [results] = await sequelize.query(
      'UPDATE "Users" SET password = $1 WHERE id = 2 RETURNING id, username, email',
      { bind: [newPasswordHash] }
    );
    
    console.log('Updated user:', results[0]);
    
    // Also get the username to confirm
    const [users] = await sequelize.query(
      'SELECT id, username, email FROM "Users" WHERE id = 2'
    );
    console.log('User details:', users[0]);
    
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
