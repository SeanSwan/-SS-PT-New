import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('payment order number entropy', () => {
  it('uses crypto-backed order numbers for checkout and cart order routes', () => {
    const achSource = readFileSync(resolve(__dirname, '../../routes/achPaymentRoutes.mjs'), 'utf8');
    const offlineSource = readFileSync(resolve(__dirname, '../../routes/offlinePaymentRoutes.mjs'), 'utf8');
    const orderSource = readFileSync(resolve(__dirname, '../../routes/orderRoutes.mjs'), 'utf8');
    const orderControllerSource = readFileSync(resolve(__dirname, '../../controllers/orderController.mjs'), 'utf8');
    const helperSource = readFileSync(resolve(__dirname, '../../utils/orderNumber.mjs'), 'utf8');

    expect(achSource).toContain("from '../utils/orderNumber.mjs'");
    expect(offlineSource).toContain("from '../utils/orderNumber.mjs'");
    expect(orderSource).toContain("from '../controllers/orderController.mjs'");
    expect(orderControllerSource).toContain("from '../utils/orderNumber.mjs'");
    expect(helperSource).toContain("from 'node:crypto'");
    expect(achSource).not.toContain('Math.random');
    expect(offlineSource).not.toContain('Math.random');
    expect(orderSource).not.toContain('Math.random');
    expect(orderControllerSource).not.toContain('Math.random');
  });
});
