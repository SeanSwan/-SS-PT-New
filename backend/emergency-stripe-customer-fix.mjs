/**
 * EMERGENCY STRIPE CUSTOMER ID FIX
 * ================================
 * 
 * This script directly adds the stripeCustomerId column to bypass
 * the problematic social media migration and restore payment functionality.
 * 
 * Run this on Render: node emergency-stripe-customer-fix.mjs
 */

import { Sequelize } from 'sequelize';
import fs from 'fs';
import path from 'path';

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: console.log,
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  }
});

async function addStripeCustomerIdColumn() {
  try {
    console.log('🚀 Emergency Stripe Customer ID Column Addition...');
    
    // Check if column already exists
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='Users' AND column_name='stripeCustomerId';
    `);
    
    if (results.length > 0) {
      console.log('✅ stripeCustomerId column already exists');
      return;
    }
    
    // Add the column (PostgreSQL compatible)
    await sequelize.query(`
      ALTER TABLE "Users" 
      ADD COLUMN "stripeCustomerId" VARCHAR(255) NULL;
    `);
    
    // Add comment separately (PostgreSQL syntax)
    await sequelize.query(`
      COMMENT ON COLUMN "Users"."stripeCustomerId" IS 'Stripe customer ID for payment processing';
    `);
    
    console.log('✅ stripeCustomerId column added successfully');
    
    // Mark migration as completed to prevent future conflicts
    await sequelize.query(`
      INSERT INTO "SequelizeMeta" (name) 
      VALUES ('20250709000000-add-stripe-customer-id-to-users.cjs')
      ON CONFLICT (name) DO NOTHING;
    `);
    
    console.log('✅ Migration marked as completed');
    console.log('🎉 Payment system should now work correctly!');
    
  } catch (error) {
    console.error('❌ Emergency fix failed:', error.message);
    throw error;
  } finally {
    await sequelize.close();
  }
}

addStripeCustomerIdColumn()
  .then(() => {
    console.log('✅ Emergency fix completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Emergency fix failed:', error);
    process.exit(1);
  });
