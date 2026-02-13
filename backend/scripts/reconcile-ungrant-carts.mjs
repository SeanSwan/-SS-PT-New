#!/usr/bin/env node
/**
 * reconcile-ungrant-carts.mjs
 * ===========================
 * Finds carts where status='completed' but sessionsGranted=false
 * (the exact race condition fixed by SessionGrantService)
 * and grants sessions using the shared service.
 *
 * Usage:
 *   node backend/scripts/reconcile-ungrant-carts.mjs           # dry-run (report only)
 *   node backend/scripts/reconcile-ungrant-carts.mjs --execute  # actually grant sessions
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import sequelize from '../database.mjs';
import { initializeModelsCache } from '../models/index.mjs';
import { grantSessionsForCart } from '../services/SessionGrantService.mjs';

const DRY_RUN = !process.argv.includes('--execute');

async function main() {
  console.log('=== Cart Reconciliation Script ===');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (add --execute to apply)' : 'EXECUTE'}`);
  console.log('');

  try {
    // Connect and initialize models
    await sequelize.authenticate();
    console.log('Database connected.');

    await initializeModelsCache();
    console.log('Models initialized.');
    console.log('');

    // Find ungranted completed carts
    const { getShoppingCart, getCartItem, getStorefrontItem, getUser } = await import('../models/index.mjs');
    const ShoppingCart = getShoppingCart();
    const CartItem = getCartItem();
    const StorefrontItem = getStorefrontItem();
    const User = getUser();

    const ungrantedCarts = await ShoppingCart.findAll({
      where: {
        status: 'completed',
        sessionsGranted: false,
      },
      include: [
        {
          model: CartItem,
          as: 'cartItems',
          include: [{ model: StorefrontItem, as: 'storefrontItem' }],
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'firstName', 'lastName', 'availableSessions'],
        },
      ],
    });

    console.log(`Found ${ungrantedCarts.length} ungranted completed cart(s).`);
    console.log('');

    if (ungrantedCarts.length === 0) {
      console.log('No action needed. All completed carts have sessions granted.');
      process.exit(0);
    }

    // Report
    let totalSessionsToGrant = 0;
    for (const cart of ungrantedCarts) {
      const sessions = cart.cartItems.reduce((sum, item) => {
        return sum + ((item.storefrontItem?.sessions || 0) * (item.quantity || 0));
      }, 0);
      totalSessionsToGrant += sessions;

      console.log(`  Cart #${cart.id} | User: ${cart.user?.email || cart.userId} | Sessions: ${sessions} | Status: ${cart.status} | sessionsGranted: ${cart.sessionsGranted}`);
    }
    console.log('');
    console.log(`Total sessions to grant: ${totalSessionsToGrant}`);
    console.log('');

    if (DRY_RUN) {
      console.log('DRY RUN complete. No changes made.');
      console.log('Re-run with --execute to grant sessions.');
      process.exit(0);
    }

    // Execute grants
    let granted = 0;
    let failed = 0;
    for (const cart of ungrantedCarts) {
      try {
        const result = await grantSessionsForCart(cart.id, cart.userId, 'reconciliation');
        if (result.granted) {
          console.log(`  GRANTED: Cart #${cart.id} -> ${result.sessionsAdded} sessions`);
          granted++;
        } else {
          console.log(`  SKIPPED: Cart #${cart.id} (already processed)`);
        }
      } catch (err) {
        console.error(`  FAILED: Cart #${cart.id} -> ${err.message}`);
        failed++;
      }
    }

    console.log('');
    console.log(`=== Results: ${granted} granted, ${failed} failed, ${ungrantedCarts.length - granted - failed} skipped ===`);

  } catch (err) {
    console.error('Fatal error:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
