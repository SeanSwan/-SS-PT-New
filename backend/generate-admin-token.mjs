import sequelize from './database.mjs';
import { QueryTypes } from 'sequelize';
import jwt from 'jsonwebtoken';

(async () => {
  try {
    // Get the actual admin user from database
    const [admin] = await sequelize.query(
      `SELECT id, username, role FROM "Users" WHERE role = 'admin' LIMIT 1`,
      { type: QueryTypes.SELECT }
    );

    if (!admin) {
      console.error('❌ No admin user found in database');
      process.exit(1);
    }

    console.log('✅ Found admin user:', admin.username, `(${admin.id})`);

    // Generate token with REAL admin ID
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    const token = jwt.sign(
      {
        id: admin.id,
        username: admin.username,
        role: admin.role,
        tokenType: 'access'
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('✅ Generated token for real admin user:');
    console.log(token);

    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
