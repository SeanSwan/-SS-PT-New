// This can be a separate file (e.g., /backend/scripts/initDatabase.mjs) 
// or integrated into your server startup process

import StorefrontItem from "./models/StorefrontItem.mjs";
import dotenv from "dotenv";
import sequelize from "./database.mjs";
import setupAssociations from "./setupAssociations.mjs";

// Load environment variables
dotenv.config();

/**
 * Initialize the database with required data
 * This ensures the frontend has matching data in the backend
 */
const initDatabase = async () => {
  try {
    // Set up model associations
    setupAssociations();
    console.log('✅ Model associations set up successfully');
    
    // Check database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully');
    
    // Synchronize database models with database
    await sequelize.sync({ alter: process.env.NODE_ENV !== 'production' });
    console.log('✅ Database synced successfully');
    
    // Seed the database with storefront items that match frontend IDs
    const seeded = await StorefrontItem.seedPackages();
    if (seeded) {
      console.log('✅ StorefrontItems seeded successfully');
    } else {
      console.warn('⚠️ Issue seeding StorefrontItems');
    }
    
    console.log('✅ Database initialization complete');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error; // Rethrow to handle at higher level
  }
};

// Run this during server startup
export default initDatabase;