import sequelize from './database.mjs';

(async () => {
  try {
    await sequelize.authenticate();
    console.log('\n=== Checking LOCAL database users ===\n');
    
    const [users] = await sequelize.query(
      'SELECT id, username, email, role FROM "Users" ORDER BY id LIMIT 10'
    );
    
    if (users.length === 0) {
      console.log('No users found in local database');
    } else {
      console.log('Found users:');
      users.forEach(user => {
        console.log(`  ID ${user.id}: ${user.username} (${user.email}) - Role: ${user.role}`);
      });
    }
    
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
