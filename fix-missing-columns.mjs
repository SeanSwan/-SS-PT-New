// Fix Missing Database Columns
// Addresses: ShoppingCart.checkoutSessionId and other missing columns

import dotenv from 'dotenv';
import sequelize from './backend/database.mjs';
import { QueryTypes } from 'sequelize';

dotenv.config();

const fixMissingColumns = async () => {
  try {
    console.log('🔧 FIXING MISSING DATABASE COLUMNS');
    console.log('===================================');
    
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    // Check existing columns in shopping_carts
    console.log('\n🔍 CHECKING SHOPPING_CARTS COLUMNS:');
    const shoppingCartColumns = await sequelize.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'shopping_carts'
      ORDER BY ordinal_position;
    `, { type: QueryTypes.SELECT });
    
    console.log('📋 Current shopping_carts columns:');
    shoppingCartColumns.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
    });
    
    // Define required columns
    const requiredColumns = [
      {
        name: 'checkoutSessionId',
        sql: `ALTER TABLE shopping_carts ADD COLUMN IF NOT EXISTS "checkoutSessionId" VARCHAR(255);`
      },
      {
        name: 'paymentStatus', 
        sql: `ALTER TABLE shopping_carts ADD COLUMN IF NOT EXISTS "paymentStatus" VARCHAR(50);`
      },
      {
        name: 'completedAt',
        sql: `ALTER TABLE shopping_carts ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP WITH TIME ZONE;`
      },
      {
        name: 'lastActivityAt',
        sql: `ALTER TABLE shopping_carts ADD COLUMN IF NOT EXISTS "lastActivityAt" TIMESTAMP WITH TIME ZONE;`
      },
      {
        name: 'checkoutSessionExpired',
        sql: `ALTER TABLE shopping_carts ADD COLUMN IF NOT EXISTS "checkoutSessionExpired" BOOLEAN DEFAULT false;`
      }
    ];
    
    console.log('\n➕ ADDING MISSING COLUMNS:');
    let addedColumns = 0;
    
    for (const col of requiredColumns) {
      const exists = shoppingCartColumns.some(existing => existing.column_name === col.name);
      
      if (!exists) {
        try {
          await sequelize.query(col.sql);
          console.log(`✅ Added: ${col.name}`);
          addedColumns++;
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log(`ℹ️ Already exists: ${col.name}`);
          } else {
            console.log(`❌ Error adding ${col.name}: ${error.message}`);
          }
        }
      } else {
        console.log(`ℹ️ Already exists: ${col.name}`);
      }
    }
    
    // Check other critical tables and columns
    console.log('\n🔍 CHECKING OTHER CRITICAL TABLES:');
    
    // Check if cart_items table exists and has correct columns
    const cartItemsExists = await sequelize.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name = 'cart_items';
    `, { type: QueryTypes.SELECT });
    
    if (cartItemsExists.length === 0) {
      console.log('🆕 Creating cart_items table...');
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS cart_items (
          id SERIAL PRIMARY KEY,
          quantity INTEGER NOT NULL DEFAULT 1,
          price DECIMAL(10,2) NOT NULL,
          "cartId" INTEGER NOT NULL,
          "storefrontItemId" INTEGER NOT NULL,
          "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
      `);
      console.log('✅ Created cart_items table');
    } else {
      console.log('✅ cart_items table exists');
    }
    
    // Check if storefront_items table exists
    const storefrontExists = await sequelize.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name = 'storefront_items';
    `, { type: QueryTypes.SELECT });
    
    if (storefrontExists.length === 0) {
      console.log('🆕 Creating storefront_items table...');
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS storefront_items (
          id SERIAL PRIMARY KEY,
          "packageType" VARCHAR(255) NOT NULL DEFAULT 'fixed',
          name VARCHAR(255) NOT NULL,
          description TEXT,
          price DECIMAL(10,2),
          sessions INTEGER,
          "pricePerSession" DECIMAL(10,2) NOT NULL,
          months INTEGER,
          "sessionsPerWeek" INTEGER,
          "totalSessions" INTEGER,
          "totalCost" DECIMAL(10,2),
          "imageUrl" VARCHAR(255),
          "stripeProductId" VARCHAR(255),
          "stripePriceId" VARCHAR(255),
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "displayOrder" INTEGER DEFAULT 0,
          "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
      `);
      console.log('✅ Created storefront_items table');
    } else {
      console.log('✅ storefront_items table exists');
    }
    
    // Verify the fixes
    console.log('\n🔍 VERIFICATION:');
    const updatedColumns = await sequelize.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'shopping_carts' AND column_name = 'checkoutSessionId';
    `, { type: QueryTypes.SELECT });
    
    if (updatedColumns.length > 0) {
      console.log('✅ checkoutSessionId column now exists');
    } else {
      console.log('❌ checkoutSessionId column still missing');
      return false;
    }
    
    console.log(`\n🎉 Successfully added ${addedColumns} missing columns`);
    return true;
    
  } catch (error) {
    console.error('💥 Error fixing columns:', error.message);
    return false;
  } finally {
    await sequelize.close();
  }
};

fixMissingColumns().then(success => {
  console.log(`\n🎯 COLUMN FIX: ${success ? 'SUCCESS' : 'FAILED'}`);
});
