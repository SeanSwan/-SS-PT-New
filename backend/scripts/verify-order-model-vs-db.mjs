#!/usr/bin/env node
/**
 * Verify Order/OrderItem model attributes against the real DB columns.
 * Read-only. Structural output only. One-shot verification for the
 * 2026-07-13 Order-model reconcile slice.
 */

import 'dotenv/config';
import sequelize from '../database.mjs';
import Order from '../models/Order.mjs';
import OrderItem from '../models/OrderItem.mjs';

async function compare(model, tableName) {
  const [cols] = await sequelize.query(
    `SELECT column_name AS cname FROM information_schema.columns
     WHERE table_schema='public' AND table_name = '${tableName}'`
  );
  const dbCols = new Set(cols.map((c) => c.cname));
  const modelCols = new Set(
    Object.values(model.rawAttributes).map((a) => a.field || a.fieldName)
  );

  const missingInModel = [...dbCols].filter((c) => !modelCols.has(c));
  const missingInDb = [...modelCols].filter((c) => !dbCols.has(c));
  console.log(`\n== ${tableName} ==`);
  console.log(`db=${dbCols.size} model=${modelCols.size}`);
  console.log('DB cols not in model:', missingInModel.join(', ') || 'NONE');
  console.log('Model cols not in DB:', missingInDb.join(', ') || 'NONE');
  return missingInModel.length === 0 && missingInDb.length === 0;
}

const okOrders = await compare(Order, 'orders');
const okItems = await compare(OrderItem, 'order_items');
console.log(`\nRESULT: ${okOrders && okItems ? 'MATCH' : 'DRIFT REMAINS'}`);
await sequelize.close();
process.exit(okOrders && okItems ? 0 : 1);
