// backend/scripts/setup-complete.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// Get directory name equivalent in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const projectRootDir = path.resolve(rootDir, '..');

// Load the .env file from the project root directory
const envPath = path.resolve(projectRootDir, '.env');
if (fs.existsSync(envPath)) {
  console.log(`Loading environment variables from: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.warn(`Warning: .env file not found at ${envPath}`);
  // Fallback to the backend directory .env if it exists
  const backendEnvPath = path.resolve(rootDir, '.env');
  if (fs.existsSync(backendEnvPath)) {
    console.log(`Loading environment variables from: ${backendEnvPath}`);
    dotenv.config({ path: backendEnvPath });
  } else {
    console.warn('Warning: No .env file found. Using default environment variables.');
    dotenv.config(); // Try default location as a last resort
  }
}

// Promisify exec
const execAsync = promisify(exec);

// Import database and models
import sequelize from '../database.mjs';
import User from '../models/User.mjs';
import StorefrontItem from '../models/StorefrontItem.mjs';
import '../setupAssociations.mjs';

/**
 * Complete setup script that:
 * 1. Resets the database using model-based sync
 * 2. Creates admin user directly
 * 3. Seeds storefront items directly
 */
async function setupComplete() {
  try {
    console.log('===== COMPLETE DATABASE SETUP =====');
    
    // 1. Test database connection
    console.log('1. Testing database connection...');
    try {
      await sequelize.authenticate();
      console.log('✅ Database connection established successfully.');
    } catch (error) {
      console.error(`❌ Unable to connect to the database: ${error.message}`);
      throw new Error(`Database connection failed: ${error.message}`);
    }
    
    // 2. Drop and recreate all tables based on model definitions
    console.log('2. Dropping and recreating ALL tables based on model definitions...');
    try {
      await sequelize.sync({ force: true });
      console.log('✅ All tables dropped and recreated successfully based on model definitions.');
      console.log('   Tables created include:');
      console.log('   - users table with UUID primary key and isActive column');
      console.log('   - storefront_items table with FLOAT data type for price fields');
    } catch (error) {
      console.error(`❌ Error dropping and recreating tables: ${error.message}`);
      throw error;
    }
    
    // 3. Create admin user directly
    console.log('3. Creating admin user...');
    try {
      // Generate UUID
      const userId = uuidv4();
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('55555', salt);
      
      // Create admin user
      const admin = await User.create({
        id: userId,
        username: 'admin',
        email: 'admin@swanstudios.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isActive: true,
        emailNotifications: true,
        smsNotifications: true,
        preferences: JSON.stringify({
          theme: 'dark',
          language: 'en',
          dashboardLayout: 'default'
        })
      });
      
      console.log('✅ Admin user created successfully!');
      console.log(`   ID: ${admin.id}`);
      console.log(`   Username: admin`);
      console.log(`   Password: 55555`);
    } catch (error) {
      console.error(`❌ Error creating admin user: ${error.message}`);
      throw error;
    }
    
    // 4. Create storefront items
    console.log('4. Creating storefront items...');
    try {
      // Fixed packages
      const fixedPackages = [
        {
          id: 1,
          packageType: 'fixed',
          sessions: 8,
          pricePerSession: 175,
          totalCost: 1400,
          price: 1400,
          name: "Gold Glimmer",
          description: "An introductory 8-session package to ignite your transformation.",
          theme: 'cosmic',
          isActive: true
        },
        {
          id: 2,
          packageType: 'fixed',
          sessions: 20,
          pricePerSession: 165,
          totalCost: 3300,
          price: 3300,
          name: "Platinum Pulse",
          description: "Elevate your performance with 20 dynamic sessions.",
          theme: 'purple',
          isActive: true
        },
        {
          id: 3,
          packageType: 'fixed',
          sessions: 50,
          pricePerSession: 150,
          totalCost: 7500,
          price: 7500,
          name: "Rhodium Rise",
          description: "Unleash your inner champion with 50 premium sessions.",
          theme: 'emerald',
          isActive: true
        },
      ];

      // Monthly packages
      const monthlyPackages = [
        { 
          id: 4,
          packageType: 'monthly',
          months: 3, 
          sessionsPerWeek: 4, 
          pricePerSession: 155,
          totalSessions: 48,
          totalCost: 7440,
          price: 7440,
          name: 'Silver Storm', 
          description: 'High intensity 3-month program at 4 sessions per week.',
          theme: 'cosmic',
          isActive: true
        },
        { 
          id: 6,
          packageType: 'monthly',
          months: 6, 
          sessionsPerWeek: 4, 
          pricePerSession: 145,
          totalSessions: 96,
          totalCost: 13920,
          price: 13920,
          name: 'Gold Grandeur', 
          description: 'Maximize your potential with 6 months at 4 sessions per week.',
          theme: 'purple',
          isActive: true
        },
        { 
          id: 9,
          packageType: 'monthly',
          months: 9, 
          sessionsPerWeek: 4, 
          pricePerSession: 140,
          totalSessions: 144,
          totalCost: 20160,
          price: 20160,
          name: 'Platinum Prestige', 
          description: 'The best value – 9 months at 4 sessions per week.',
          theme: 'ruby',
          isActive: true
        },
        { 
          id: 12,
          packageType: 'monthly',
          months: 12, 
          sessionsPerWeek: 4, 
          pricePerSession: 135,
          totalSessions: 192,
          totalCost: 25920,
          price: 25920,
          name: 'Rhodium Reign', 
          description: 'The ultimate value – 12 months at 4 sessions per week at an unbeatable rate.',
          theme: 'emerald',
          isActive: true
        },
      ];

      // Combine all packages
      const allPackages = [...fixedPackages, ...monthlyPackages];

      // Create all packages
      for (const pkg of allPackages) {
        await StorefrontItem.create(pkg);
        console.log(`✅ Created storefront item: ${pkg.name}`);
      }

      console.log('✅ All storefront items created successfully!');
    } catch (error) {
      console.error(`❌ Error creating storefront items: ${error.message}`);
      throw error;
    }
    
    // 5. Create SequelizeMeta table manually to avoid migration errors
    console.log('5. Creating SequelizeMeta table manually...');
    try {
      const createMetaTableSQL = `
      CREATE TABLE IF NOT EXISTS "SequelizeMeta" (
        "name" character varying(255) NOT NULL,
        PRIMARY KEY ("name")
      );
      `;
      await sequelize.query(createMetaTableSQL);
      console.log('✅ SequelizeMeta table created successfully.');
      
      // Add migration records to make Sequelize CLI happy
      const migrations = [
        '20250212060728-create-user-table.cjs',
        '20250213192601-create-storefront-items.cjs'
      ];
      
      for (const migration of migrations) {
        await sequelize.query(`
          INSERT INTO "SequelizeMeta" ("name")
          VALUES ('${migration}')
          ON CONFLICT ("name") DO NOTHING;
        `);
      }
      
      console.log('✅ Migration records added to SequelizeMeta.');
    } catch (error) {
      console.warn(`⚠️ Warning: Error creating SequelizeMeta table: ${error.message}`);
      console.warn('   Continuing anyway as this is not critical.');
    }
    
    console.log('===== COMPLETE DATABASE SETUP SUCCESSFUL =====');
    console.log('');
    console.log('✅ The database has been completely set up with:');
    console.log('   - All tables created based on models');
    console.log('   - Admin user created (username: admin, password: 55555)');
    console.log('   - Storefront items created');
    console.log('   - SequelizeMeta table created');
    console.log('');
    console.log('✅ You can now start the application:');
    console.log('   npm start');
    console.log('');
    console.log('✅ Log in with:');
    console.log('   Username: admin');
    console.log('   Password: 55555');
    
  } catch (error) {
    console.error(`❌ Complete database setup failed: ${error.message}`);
    if (error.stack) {
      console.error(`Stack trace: ${error.stack}`);
    }
    throw error;
  } finally {
    // Close the database connection
    await sequelize.close();
    console.log('Database connection closed.');
  }
}

// Execute the complete setup
setupComplete().catch(error => {
  console.error(`Fatal error during complete database setup: ${error.message}`);
  process.exit(1);
});
