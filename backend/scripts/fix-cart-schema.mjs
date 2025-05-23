// backend/scripts/fix-cart-schema.mjs
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

// Import database and models
import sequelize from '../database.mjs';
import { QueryTypes } from 'sequelize';

/**
 * Fixes database schema issues with cart and storefront tables
 */
async function fixCartSchema() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('----- Database Schema Fix Script -----');
    
    // 1. Test database connection
    console.log('1. Testing database connection...');
    try {
      await sequelize.authenticate();
      console.log('✅ Database connection established successfully.');
    } catch (error) {
      console.error(`❌ Unable to connect to the database: ${error.message}`);
      throw new Error(`Database connection failed: ${error.message}`);
    }
    
    // 2. Check if shopping_carts table exists
    console.log('2. Checking if shopping_carts table exists...');
    const tables = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';",
      { type: QueryTypes.SELECT, transaction }
    );
    
    const tableNames = tables.map(t => t.table_name);
    console.log('Existing tables:', tableNames.join(', '));
    
    if (!tableNames.includes('shopping_carts')) {
      console.log('Creating shopping_carts table from scratch...');
      await sequelize.query(`
        CREATE TABLE shopping_carts (
          id SERIAL PRIMARY KEY,
          status VARCHAR(255) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
          "userId" UUID NOT NULL,
          "checkoutSessionId" VARCHAR(255),
          "paymentStatus" VARCHAR(255),
          "completedAt" TIMESTAMP WITH TIME ZONE,
          "lastActivityAt" TIMESTAMP WITH TIME ZONE,
          "checkoutSessionExpired" BOOLEAN DEFAULT FALSE NOT NULL,
          "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
          "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
        );
      `, { transaction });
      console.log('✅ shopping_carts table created successfully.');
    } else {
      // Check the datatype of userId
      console.log('Checking userId datatype in shopping_carts table...');
      const columns = await sequelize.query(
        "SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name = 'shopping_carts';",
        { type: QueryTypes.SELECT, transaction }
      );
      
      const userIdColumn = columns.find(c => c.column_name === 'userId');
      console.log('userId column type:', userIdColumn?.data_type);
      
      // Change userId to UUID if it's not already
      if (userIdColumn && userIdColumn.data_type !== 'uuid') {
        console.log('Altering userId column to UUID type...');
        
        // Drop existing shopping carts (since we can't easily convert IDs)
        await sequelize.query(`DELETE FROM shopping_carts;`, { transaction });
        console.log('Removed existing shopping cart data.');
        
        // Drop the foreign key constraint if it exists
        try {
          // Get constraint name
          const constraints = await sequelize.query(
            `SELECT tc.constraint_name 
             FROM information_schema.table_constraints tc 
             JOIN information_schema.constraint_column_usage cu ON tc.constraint_name = cu.constraint_name 
             WHERE tc.table_name = 'shopping_carts' AND cu.column_name = 'userId' 
             AND tc.constraint_type = 'FOREIGN KEY';`,
            { type: QueryTypes.SELECT, transaction }
          );
          
          if (constraints.length > 0) {
            const constraintName = constraints[0].constraint_name;
            await sequelize.query(
              `ALTER TABLE shopping_carts DROP CONSTRAINT "${constraintName}";`,
              { transaction }
            );
            console.log(`Dropped foreign key constraint: ${constraintName}`);
          }
        } catch (err) {
          console.warn('No foreign key constraints to drop or error:', err.message);
        }
        
        // Alter the column type
        await sequelize.query(
          `ALTER TABLE shopping_carts ALTER COLUMN "userId" TYPE UUID USING "userId"::text::uuid;`,
          { transaction }
        );
        console.log('✅ Modified userId to UUID type.');
      } else {
        console.log('✅ userId is already of type UUID.');
      }
      
      // Add missing columns if needed
      const columnNames = columns.map(c => c.column_name);
      
      const missingColumns = [
        { name: 'checkoutSessionId', type: 'VARCHAR(255)' },
        { name: 'paymentStatus', type: 'VARCHAR(255)' },
        { name: 'completedAt', type: 'TIMESTAMP WITH TIME ZONE' },
        { name: 'lastActivityAt', type: 'TIMESTAMP WITH TIME ZONE' },
        { name: 'checkoutSessionExpired', type: 'BOOLEAN DEFAULT FALSE NOT NULL' }
      ];
      
      for (const column of missingColumns) {
        if (!columnNames.includes(column.name)) {
          console.log(`Adding missing column: ${column.name}`);
          await sequelize.query(
            `ALTER TABLE shopping_carts ADD COLUMN "${column.name}" ${column.type};`,
            { transaction }
          );
          console.log(`✅ Added ${column.name} column.`);
        }
      }
    }
    
    // 3. Check cart_items table
    console.log('3. Checking if cart_items table exists...');
    
    if (!tableNames.includes('cart_items')) {
      console.log('Creating cart_items table from scratch...');
      await sequelize.query(`
        CREATE TABLE cart_items (
          id SERIAL PRIMARY KEY,
          quantity INTEGER NOT NULL DEFAULT 1,
          price FLOAT NOT NULL,
          "cartId" INTEGER NOT NULL,
          "storefrontItemId" INTEGER NOT NULL,
          "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
          "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
        );
      `, { transaction });
      console.log('✅ cart_items table created successfully.');
    } else {
      console.log('✅ cart_items table already exists.');
    }
    
    // 4. Check storefront_items table
    console.log('4. Checking storefront_items table...');
    
    if (!tableNames.includes('storefront_items')) {
      console.log('Storefront items table does not exist. Creating it...');
      await sequelize.query(`
        CREATE TABLE storefront_items (
          id SERIAL PRIMARY KEY,
          "packageType" VARCHAR(255) NOT NULL DEFAULT 'fixed',
          name VARCHAR(255) NOT NULL,
          description TEXT,
          price FLOAT,
          sessions INTEGER,
          "pricePerSession" FLOAT NOT NULL,
          months INTEGER,
          "sessionsPerWeek" INTEGER,
          "totalSessions" INTEGER,
          "totalCost" FLOAT,
          "imageUrl" VARCHAR(255),
          theme VARCHAR(255) DEFAULT 'cosmic',
          "stripeProductId" VARCHAR(255),
          "stripePriceId" VARCHAR(255),
          "isActive" BOOLEAN DEFAULT TRUE NOT NULL,
          "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
          "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
        );
      `, { transaction });
      console.log('✅ storefront_items table created successfully.');
    } else {
      console.log('✅ storefront_items table already exists.');
    }
    
    // Commit transaction
    await transaction.commit();
    console.log('✅ All schema fixes applied successfully.');
    console.log('----- Schema Fix Complete -----');
    
  } catch (error) {
    // Rollback transaction on error
    await transaction.rollback();
    console.error(`❌ Schema fix failed: ${error.message}`);
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

// Execute the schema fix
fixCartSchema().catch(error => {
  console.error(`Fatal error during schema fix: ${error.message}`);
  process.exit(1);
});
