#!/usr/bin/env node
/**
 * pre-deploy-backup.mjs
 * =====================
 * Dumps critical payment and session data before a deploy.
 * Output: JSON file with completed carts and user session counts.
 *
 * Usage:
 *   node backend/scripts/pre-deploy-backup.mjs
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import sequelize from '../database.mjs';
import { initializeModelsCache, getShoppingCart, getUser } from '../models/index.mjs';

async function main() {
  console.log('=== Pre-Deploy Backup ===');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  try {
    await sequelize.authenticate();
    console.log('Database connected.');

    await initializeModelsCache();
    console.log('Models initialized.');

    const ShoppingCart = getShoppingCart();
    const User = getUser();

    // Dump completed carts
    const completedCarts = await ShoppingCart.findAll({
      where: { status: 'completed' },
      attributes: ['id', 'userId', 'status', 'total', 'sessionsGranted', 'paymentStatus', 'completedAt', 'checkoutSessionId'],
      raw: true,
    });

    // Dump users with session balances
    const users = await User.findAll({
      attributes: ['id', 'email', 'availableSessions', 'role'],
      raw: true,
    });

    const totalSessions = users.reduce((sum, u) => sum + (u.availableSessions || 0), 0);
    const grantedCarts = completedCarts.filter(c => c.sessionsGranted === true).length;
    const ungrantedCarts = completedCarts.filter(c => c.sessionsGranted === false).length;

    const backup = {
      timestamp: new Date().toISOString(),
      summary: {
        totalUsers: users.length,
        totalCompletedCarts: completedCarts.length,
        grantedCarts,
        ungrantedCarts,
        totalAvailableSessions: totalSessions,
      },
      completedCarts,
      users,
    };

    // Write to file
    const outputDir = path.resolve(__dirname, '../../backups');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const outputPath = path.join(outputDir, `pre-deploy-${timestamp}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(backup, null, 2));

    console.log('');
    console.log('Summary:');
    console.log(`  Users: ${users.length}`);
    console.log(`  Completed carts: ${completedCarts.length} (${grantedCarts} granted, ${ungrantedCarts} ungranted)`);
    console.log(`  Total available sessions: ${totalSessions}`);
    console.log('');
    console.log(`Backup written to: ${outputPath}`);

  } catch (err) {
    console.error('Fatal error:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
