// Comprehensive Foreign Key Reference Fix
// Fixes all "Users" -> "users" table reference issues

import dotenv from 'dotenv';
import sequelize from './backend/database.mjs';
import { QueryTypes } from 'sequelize';

dotenv.config();

const fixAllForeignKeyReferences = async () => {
  try {
    console.log('🔧 FIXING ALL FOREIGN KEY REFERENCES');
    console.log('=====================================');
    
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    // Drop problematic foreign key constraints that reference "Users" instead of "users"
    console.log('\n🗑️ Dropping problematic foreign key constraints...');
    
    const dropConstraints = [
      `ALTER TABLE IF EXISTS "Gamifications" DROP CONSTRAINT IF EXISTS "Gamifications_userId_fkey";`,
      `ALTER TABLE IF EXISTS "UserAchievements" DROP CONSTRAINT IF EXISTS "UserAchievements_userId_fkey";`,
      `ALTER TABLE IF EXISTS "UserRewards" DROP CONSTRAINT IF EXISTS "UserRewards_userId_fkey";`,
      `ALTER TABLE IF EXISTS "UserMilestones" DROP CONSTRAINT IF EXISTS "UserMilestones_userId_fkey";`,
      `ALTER TABLE IF EXISTS "PointTransactions" DROP CONSTRAINT IF EXISTS "PointTransactions_userId_fkey";`,
      `ALTER TABLE IF EXISTS "Friendships" DROP CONSTRAINT IF EXISTS "Friendships_requesterId_fkey";`,
      `ALTER TABLE IF EXISTS "Friendships" DROP CONSTRAINT IF EXISTS "Friendships_recipientId_fkey";`,
      `ALTER TABLE IF EXISTS "shopping_carts" DROP CONSTRAINT IF EXISTS "shopping_carts_userId_fkey";`,
      `ALTER TABLE IF EXISTS "cart_items" DROP CONSTRAINT IF EXISTS "cart_items_userId_fkey";`,
      `ALTER TABLE IF EXISTS "Sessions" DROP CONSTRAINT IF EXISTS "Sessions_userId_fkey";`,
      `ALTER TABLE IF EXISTS "Sessions" DROP CONSTRAINT IF EXISTS "Sessions_trainerId_fkey";`,
      `ALTER TABLE IF EXISTS "ClientProgresses" DROP CONSTRAINT IF EXISTS "ClientProgresses_userId_fkey";`
    ];
    
    for (const sql of dropConstraints) {
      try {
        await sequelize.query(sql);
        console.log(`✅ Executed: ${sql.split(' ')[3]} constraint drop`);
      } catch (error) {
        // Ignore errors for non-existent constraints
        if (!error.message.includes('does not exist')) {
          console.log(`⚠️ Warning: ${error.message}`);
        }
      }
    }
    
    // Add missing columns if they don't exist
    console.log('\n➕ Adding missing columns...');
    
    const addColumns = [
      {
        table: 'shopping_carts',
        column: 'checkoutSessionId',
        sql: `ALTER TABLE shopping_carts ADD COLUMN IF NOT EXISTS "checkoutSessionId" VARCHAR(255);`
      },
      {
        table: 'shopping_carts', 
        column: 'paymentStatus',
        sql: `ALTER TABLE shopping_carts ADD COLUMN IF NOT EXISTS "paymentStatus" VARCHAR(50);`
      },
      {
        table: 'shopping_carts',
        column: 'completedAt', 
        sql: `ALTER TABLE shopping_carts ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP WITH TIME ZONE;`
      },
      {
        table: 'shopping_carts',
        column: 'lastActivityAt',
        sql: `ALTER TABLE shopping_carts ADD COLUMN IF NOT EXISTS "lastActivityAt" TIMESTAMP WITH TIME ZONE;`
      },
      {
        table: 'shopping_carts',
        column: 'checkoutSessionExpired',
        sql: `ALTER TABLE shopping_carts ADD COLUMN IF NOT EXISTS "checkoutSessionExpired" BOOLEAN DEFAULT false;`
      }
    ];
    
    for (const col of addColumns) {
      try {
        await sequelize.query(col.sql);
        console.log(`✅ Added column: ${col.table}.${col.column}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`ℹ️ Column already exists: ${col.table}.${col.column}`);
        } else {
          console.log(`❌ Error adding ${col.table}.${col.column}: ${error.message}`);
        }
      }
    }
    
    // Recreate foreign key constraints with correct table reference
    console.log('\n🔗 Creating correct foreign key constraints...');
    
    const createConstraints = [
      `ALTER TABLE "shopping_carts" ADD CONSTRAINT "shopping_carts_userId_fkey" 
       FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;`,
       
      `ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cartId_fkey" 
       FOREIGN KEY ("cartId") REFERENCES "shopping_carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;`,
       
      `ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_storefrontItemId_fkey" 
       FOREIGN KEY ("storefrontItemId") REFERENCES "storefront_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;`
    ];
    
    for (const sql of createConstraints) {
      try {
        await sequelize.query(sql);
        console.log(`✅ Created constraint: ${sql.split('"')[1]}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`ℹ️ Constraint already exists`);
        } else {
          console.log(`❌ Error creating constraint: ${error.message}`);
        }
      }
    }
    
    // Verify foreign key constraints
    console.log('\n🔍 Verifying foreign key constraints...');
    const constraints = await sequelize.query(`
      SELECT 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        tc.constraint_name
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
      WHERE constraint_type = 'FOREIGN KEY' 
        AND tc.table_name IN ('shopping_carts', 'cart_items')
      ORDER BY tc.table_name;
    `, { type: QueryTypes.SELECT });
    
    console.log('📎 Current foreign key constraints:');
    constraints.forEach(fk => {
      console.log(`  ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}`);
    });
    
    console.log('\n✅ Foreign key fixes completed');
    return { success: true, constraints: constraints.length };
    
  } catch (error) {
    console.error('💥 Error fixing foreign keys:', error.message);
    return { success: false, error: error.message };
  } finally {
    await sequelize.close();
  }
};

fixAllForeignKeyReferences().then(result => {
  console.log('\n🎯 RESULT:', JSON.stringify(result, null, 2));
});
