/**
 * Database Setup Script
 * Runs initial database setup and creates admin user
 */
import sequelize from './database.mjs';
import User from './models/User.mjs';
import Achievement from './models/Achievement.mjs';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

// Load environment variables
dotenv.config();

// Admin user credentials (default if not provided in env)
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'ogpswan';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Password123!';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@swanstudios.com';

async function setupDatabase() {
  try {
    console.log('Starting database setup...');
    
    // Create the achievements table first to resolve the foreign key issue
    console.log('Creating Achievement model...');
    await Achievement.sync({ alter: true });
    console.log('Achievement model created successfully.');
    
    // Create a default achievement
    const defaultAchievement = await Achievement.findOrCreate({
      where: { name: 'New Member' },
      defaults: {
        description: 'Welcome to the platform!',
        category: 'onboarding',
        requiredPoints: 0,
        iconUrl: '/images/badges/new-member.png',
        isActive: true
      }
    });
    console.log('Default achievement created or found:', defaultAchievement[0].id);
    
    // Sync all other models with database
    console.log('Syncing database models...');
    await sequelize.sync({ alter: true });
    console.log('Database models synced successfully.');
    
    // Check if admin user exists
    const adminExists = await User.findOne({ 
      where: { 
        username: ADMIN_USERNAME,
        role: 'admin'
      } 
    });
    
    if (adminExists) {
      console.log(`Admin user '${ADMIN_USERNAME}' already exists.`);
    } else {
      // Create admin user
      console.log(`Creating admin user '${ADMIN_USERNAME}'...`);
      
      // Hash password manually (not relying on hooks)
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);
      
      const admin = await User.create({
        firstName: 'Admin',
        lastName: 'User',
        username: ADMIN_USERNAME,
        email: ADMIN_EMAIL,
        password: hashedPassword, // Use pre-hashed password
        role: 'admin',
        isActive: true
      });
      
      console.log(`Admin user created with ID: ${admin.id}`);
    }
    
    console.log('Database setup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error during database setup:', error);
    process.exit(1);
  }
}

// Run setup
setupDatabase();