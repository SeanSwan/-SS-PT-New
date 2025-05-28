// EMERGENCY: Create production users directly
import dotenv from 'dotenv';
dotenv.config();

const createProductionUsers = async () => {
  console.log('🚨 EMERGENCY PRODUCTION USER CREATION');
  console.log('=' .repeat(50));
  
  try {
    const { Sequelize } = await import('sequelize');
    const bcrypt = await import('bcryptjs');
    
    const sequelize = new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      },
      logging: false
    });
    
    await sequelize.authenticate();
    console.log('✅ Connected to production database');
    
    // Create hashed password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    // Create admin user directly with SQL
    console.log('👑 Creating admin user...');
    
    try {
      await sequelize.query(`
        INSERT INTO users (
          "firstName", "lastName", email, username, password, role, 
          "isActive", "emailNotifications", "smsNotifications", 
          "createdAt", "updatedAt"
        ) VALUES (
          'Test', 'Admin', 'admin@test.com', 'admin', :password, 'admin',
          true, true, true, NOW(), NOW()
        ) ON CONFLICT (email) DO NOTHING;
      `, {
        replacements: { password: hashedPassword }
      });
      
      console.log('✅ Admin user created successfully');
      
      // Verify user exists
      const [adminUser] = await sequelize.query(`
        SELECT id, username, email, role FROM users WHERE username = 'admin';
      `);
      
      if (adminUser.length > 0) {
        console.log('✅ Admin user verified:', adminUser[0]);
        console.log('🔑 Login credentials: admin / admin123');
      } else {
        console.log('❌ Admin user creation failed');
      }
      
    } catch (insertError) {
      console.error('❌ User creation error:', insertError.message);
    }
    
    await sequelize.close();
    
  } catch (error) {
    console.error('❌ Emergency user creation failed:', error.message);
  }
};

createProductionUsers().catch(console.error);