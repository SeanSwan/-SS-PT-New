// backend/scripts/migrate-cart-data.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

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
  dotenv.config(); // Try default location as a last resort
}

// Import models directly
import sequelize from '../database.mjs';
import User from '../models/User.mjs';
import ShoppingCart from '../models/ShoppingCart.mjs';
import CartItem from '../models/CartItem.mjs';
import StorefrontItem from '../models/StorefrontItem.mjs';
import setupAssociations from '../setupAssociations.mjs';

/**
 * Migrates data from old cart schema to new schema and performs data checks
 */
async function migrateCartData() {
  try {
    console.log('----- Cart Data Migration Script -----');
    
    // Setup associations first
    setupAssociations();
    console.log('Model associations set up.');
    
    // 1. Test database connection
    console.log('1. Testing database connection...');
    try {
      await sequelize.authenticate();
      console.log('✅ Database connection established successfully.');
    } catch (error) {
      console.error(`❌ Unable to connect to the database: ${error.message}`);
      throw new Error(`Database connection failed: ${error.message}`);
    }
    
    // 2. Check User model data exists
    console.log('2. Checking for user data...');
    const users = await User.findAll();
    
    if (users.length === 0) {
      console.warn('⚠️ No users found in the database.');
      console.log('Please run the fix-admin script to create an admin user.');
    } else {
      console.log(`✅ Found ${users.length} users in the database.`);
      
      // 3. Remove any old active carts that might have the wrong userId format
      console.log('3. Resetting active carts for all users...');
      await ShoppingCart.destroy({ where: { status: 'active' } });
      console.log('✅ All existing active carts removed.');
      
      // 4. Create fresh carts for all users
      console.log('4. Creating fresh active carts for all users...');
      for (const user of users) {
        await ShoppingCart.create({
          userId: user.id,
          status: 'active',
          lastActivityAt: new Date()
        });
        console.log(`✅ Created fresh cart for user: ${user.username}`);
      }
    }
    
    // 5. Check storefront items
    console.log('5. Checking storefront items...');
    const items = await StorefrontItem.findAll();
    
    if (items.length === 0) {
      console.warn('⚠️ No storefront items found in the database.');
      console.log('Please run the seed-storefront script to add storefront items.');
    } else {
      console.log(`✅ Found ${items.length} storefront items.`);
    }
    
    // 6. Create a sample cart item for testing (only if admin exists)
    const adminUser = users.find(u => u.role === 'admin');
    if (adminUser && items.length > 0) {
      console.log('6. Creating sample cart item for admin user...');
      
      // Find admin's active cart
      const adminCart = await ShoppingCart.findOne({
        where: { 
          userId: adminUser.id,
          status: 'active'
        }
      });
      
      if (adminCart) {
        // Check if the cart already has items
        const existingItems = await CartItem.findAll({
          where: { cartId: adminCart.id }
        });
        
        if (existingItems.length === 0) {
          // Add a sample item to the cart
          const sampleItem = items[0]; // Using the first storefront item
          await CartItem.create({
            cartId: adminCart.id,
            storefrontItemId: sampleItem.id,
            quantity: 1,
            price: sampleItem.price || sampleItem.totalCost || 1000 // Fallback price
          });
          console.log(`✅ Added sample item "${sampleItem.name}" to admin's cart.`);
        } else {
          console.log(`✅ Admin cart already has ${existingItems.length} items.`);
        }
      } else {
        console.warn('⚠️ Could not find active cart for admin user.');
      }
    }
    
    console.log('✅ Cart data migration completed successfully!');
    console.log('----- Cart Data Migration Complete -----');
    
  } catch (error) {
    console.error(`❌ Cart data migration failed: ${error.message}`);
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

// Execute the data migration
migrateCartData().catch(error => {
  console.error(`Fatal error during cart data migration: ${error.message}`);
  process.exit(1);
});
