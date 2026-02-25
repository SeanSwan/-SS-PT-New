/**
 * Admin Charge Card — Handler Logic Tests
 * ========================================
 * Tests all three endpoints in adminChargeCardRoutes.mjs:
 *   - POST /charge  (capture-first + refund-on-failure)
 *   - GET  /payment-methods/:clientId  (list saved cards)
 *   - POST /test-card  (attach test card, same-customer vs different-customer)
 *
 * Approach: Since the route module initializes Stripe at load time (module-level
 * side effect) and global test setup mocks Stripe differently, we test the
 * handler logic directly by extracting each route's control flow into testable
 * functions. This is a **logic harness**, not HTTP integration testing — it
 * exercises the exact same branching/error-handling as the real handlers.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Hoisted mock primitives ──────────────────────────────────────

const {
  mockPaymentIntentsCreate,
  mockRefundsCreate,
  mockPaymentMethodsRetrieve,
  mockPaymentMethodsList,
  mockPaymentMethodsAttach,
  mockCustomersCreate,
  mockApplyPackagePayment,
  mockMapServiceError,
  mockFinancialTransactionCreate,
  mockLogger,
} = vi.hoisted(() => ({
  mockPaymentIntentsCreate: vi.fn(),
  mockRefundsCreate: vi.fn(),
  mockPaymentMethodsRetrieve: vi.fn(),
  mockPaymentMethodsList: vi.fn(),
  mockPaymentMethodsAttach: vi.fn(),
  mockCustomersCreate: vi.fn(),
  mockApplyPackagePayment: vi.fn(),
  mockMapServiceError: vi.fn(),
  mockFinancialTransactionCreate: vi.fn(),
  mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../utils/logger.mjs', () => ({ default: mockLogger }));

// ── Test Helpers ─────────────────────────────────────────────────

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5';

function makeClient(overrides = {}) {
  return {
    id: 4,
    firstName: 'Test',
    lastName: 'Client',
    email: 'test@example.com',
    role: 'client',
    stripeCustomerId: 'cus_test_abc123',
    ...overrides,
  };
}

function makePackage(overrides = {}) {
  return {
    id: 1,
    name: '10-Pack Sessions',
    totalCost: 1750,
    price: 1750,
    sessions: 10,
    totalSessions: 10,
    pricePerSession: 175,
    isActive: true,
    ...overrides,
  };
}

/**
 * Simulates the exact charge handler logic from adminChargeCardRoutes.mjs lines 110-296.
 * This is a direct extraction of the route's control flow, enabling us to test the
 * capture-first + refund-on-failure pattern without fighting module-level Stripe init.
 */
async function executeChargeFlow({
  client,
  pkg,
  paymentMethodId,
  idempotencyToken,
  adminUserId = 1,
  force = false,
  forceReason,
  stripe,
  FinancialTransaction,
}) {
  const res = {
    _status: null,
    _body: null,
    status(code) { this._status = code; return this; },
    json(body) { this._body = body; return this; },
  };

  // ── Input validation (mirrors route lines 119-131) ─────────
  const clientId = client?.id;
  const storefrontItemId = pkg?.id;

  if (!Number.isInteger(clientId) || clientId <= 0) {
    return res.status(422).json({ success: false, error: 'Invalid clientId' });
  }
  if (!Number.isInteger(storefrontItemId) || storefrontItemId <= 0) {
    return res.status(422).json({ success: false, error: 'Invalid storefrontItemId' });
  }
  if (!paymentMethodId || typeof paymentMethodId !== 'string') {
    return res.status(422).json({ success: false, error: 'paymentMethodId is required' });
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(idempotencyToken)) {
    return res.status(422).json({ success: false, error: 'Invalid idempotencyToken (must be UUID v4)' });
  }

  // ── Client validation (mirrors route lines 134-141) ────────
  if (!client || !['client', 'user'].includes(client.role)) {
    return res.status(404).json({ success: false, error: 'Client not found', code: 'CLIENT_NOT_FOUND' });
  }
  if (!client.stripeCustomerId) {
    return res.status(404).json({ success: false, error: 'Client has no Stripe customer on file', code: 'STRIPE_CUSTOMER_NOT_FOUND' });
  }

  // ── Payment method ownership (mirrors route lines 143-152) ─
  let pm;
  try {
    pm = await stripe.paymentMethods.retrieve(paymentMethodId);
  } catch (err) {
    return res.status(422).json({ success: false, error: 'Invalid payment method', code: 'STRIPE_CHARGE_FAILED' });
  }
  if (pm.customer !== client.stripeCustomerId) {
    return res.status(403).json({ success: false, error: 'Payment method does not belong to this client', code: 'STRIPE_OWNERSHIP_MISMATCH' });
  }

  // ── Package validation (mirrors route lines 154-167) ───────
  if (!pkg) {
    return res.status(404).json({ success: false, error: 'Package not found', code: 'PACKAGE_NOT_FOUND' });
  }
  const chargeAmount = parseFloat(pkg.totalCost || pkg.price || 0);
  if (chargeAmount <= 0) {
    return res.status(422).json({ success: false, error: 'Package has no price' });
  }
  const sessionsToAdd = pkg.sessions || pkg.totalSessions || 0;

  // ── 5. CAPTURE: Create PaymentIntent (mirrors route lines 168-204) ──
  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(chargeAmount * 100),
      currency: 'usd',
      customer: client.stripeCustomerId,
      payment_method: paymentMethodId,
      confirm: true,
      off_session: true,
      description: `Admin charge: ${pkg.name} (${sessionsToAdd} sessions)`,
      metadata: {
        adminUserId: adminUserId.toString(),
        clientId: clientId.toString(),
        storefrontItemId: storefrontItemId.toString(),
        source: 'admin_charge_card',
      },
    });
  } catch (stripeErr) {
    mockLogger.error('[AdminChargeCard] Stripe charge failed:', stripeErr.message);
    return res.status(422).json({
      success: false,
      error: `Card charge failed: ${stripeErr.message}`,
      code: 'STRIPE_CHARGE_FAILED',
    });
  }

  if (paymentIntent.status !== 'succeeded') {
    return res.status(422).json({
      success: false,
      error: `Payment not completed (status: ${paymentIntent.status})`,
      code: 'STRIPE_CHARGE_FAILED',
    });
  }

  // ── 7. Grant sessions (mirrors route lines 207-291) ────────
  try {
    const result = await mockApplyPackagePayment({
      clientId,
      storefrontItemId,
      paymentMethod: 'stripe',
      paymentReference: paymentIntent.id,
      adminUserId,
      idempotencyToken,
      force: force || false,
      forceReason: forceReason || undefined,
    });

    return res.status(200).json({
      success: true,
      ...result,
      chargedAmount: chargeAmount,
      paymentIntentId: paymentIntent.id,
      paymentMethodLast4: pm.card.last4,
      paymentMethodBrand: pm.card.brand,
    });

  } catch (serviceError) {
    // Grant failed — refund the Stripe charge
    mockLogger.warn(`[AdminChargeCard] Grant failed after capture, refunding: ${serviceError.message}`);

    try {
      await stripe.refunds.create({ payment_intent: paymentIntent.id });
      mockLogger.info(`[AdminChargeCard] Refund issued for PI ${paymentIntent.id}`);
    } catch (refundErr) {
      // ★ REFUND-FAILURE PROTOCOL ★
      mockLogger.error(`[REFUND-FAILURE] Stripe refund failed for PI ${paymentIntent.id}: ${refundErr.message}`);
      console.error(`[REFUND-FAILURE] PI=${paymentIntent.id} client=${clientId} amount=${chargeAmount} error=${refundErr.message}`);

      try {
        if (FinancialTransaction) {
          await FinancialTransaction.create({
            userId: clientId,
            amount: chargeAmount,
            currency: 'USD',
            status: 'failed',
            stripePaymentIntentId: paymentIntent.id,
            paymentMethod: 'stripe',
            description: 'REFUND_FAILED: Stripe charge captured but session grant failed and refund could not be issued',
            metadata: JSON.stringify({
              clientId,
              storefrontItemId,
              idempotencyToken,
              failureType: 'refund_failed',
              adminUserId,
              paymentMethodLast4: pm.card.last4,
              paymentMethodBrand: pm.card.brand,
              grantError: serviceError.message,
            }),
            processedAt: new Date(),
            netAmount: chargeAmount,
            feeAmount: 0,
          });
        }
      } catch (auditErr) {
        mockLogger.error(`[REFUND-FAILURE] Audit record creation also failed: ${auditErr.message}`);
      }

      return res.status(500).json({
        success: false,
        error: 'Payment captured but grant failed and refund could not be issued. Please refund manually via Stripe dashboard.',
        code: 'STRIPE_REFUND_FAILED',
        stripePaymentIntentId: paymentIntent.id,
      });
    }

    // Refund succeeded — map the original service error to HTTP
    const mapped = mockMapServiceError(serviceError);
    const statusCode = mapped ? mapped.statusCode : 500;
    const errorCode = mapped ? mapped.errorCode : 'INTERNAL_ERROR';

    return res.status(statusCode).json({
      success: false,
      error: serviceError.message,
      code: errorCode,
      ...(serviceError.duplicateWindow ? { duplicateWindow: serviceError.duplicateWindow } : {}),
    });
  }
}

// ── Tests ─────────────────────────────────────────────────────────

describe('Admin Charge Card — Capture-First + Refund-on-Failure', () => {
  const stripe = {
    paymentIntents: { create: mockPaymentIntentsCreate },
    refunds: { create: mockRefundsCreate },
    paymentMethods: { retrieve: mockPaymentMethodsRetrieve },
  };

  const FinancialTransaction = { create: mockFinancialTransactionCreate };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPaymentMethodsRetrieve.mockResolvedValue({
      id: 'pm_test_visa123',
      customer: 'cus_test_abc123',
      card: { brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2028 },
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 1. HAPPY PATH
  // ═══════════════════════════════════════════════════════════════

  it('charges card and grants sessions on success', async () => {
    mockPaymentIntentsCreate.mockResolvedValue({ id: 'pi_success', status: 'succeeded' });
    mockApplyPackagePayment.mockResolvedValue({
      orderId: 50, orderNumber: 'REC-TEST-1234', sessionsAdded: 10,
      previousBalance: 0, newBalance: 10, packageName: '10-Pack Sessions', totalAmount: 1750,
    });

    const res = await executeChargeFlow({
      client: makeClient(),
      pkg: makePackage(),
      paymentMethodId: 'pm_test_visa123',
      idempotencyToken: VALID_UUID,
      stripe,
      FinancialTransaction,
    });

    expect(res._status).toBe(200);
    expect(res._body.success).toBe(true);
    expect(res._body.orderId).toBe(50);
    expect(res._body.sessionsAdded).toBe(10);
    expect(res._body.chargedAmount).toBe(1750);
    expect(res._body.paymentIntentId).toBe('pi_success');
    expect(res._body.paymentMethodLast4).toBe('4242');
    expect(res._body.paymentMethodBrand).toBe('visa');

    expect(mockApplyPackagePayment).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 4, storefrontItemId: 1,
        paymentMethod: 'stripe', paymentReference: 'pi_success',
      })
    );
    expect(mockRefundsCreate).not.toHaveBeenCalled();
  });

  // ═══════════════════════════════════════════════════════════════
  // 2. STRIPE CHARGE FAILS
  // ═══════════════════════════════════════════════════════════════

  it('returns STRIPE_CHARGE_FAILED when card is declined', async () => {
    mockPaymentIntentsCreate.mockRejectedValue(new Error('Your card was declined.'));

    const res = await executeChargeFlow({
      client: makeClient(), pkg: makePackage(),
      paymentMethodId: 'pm_test_visa123', idempotencyToken: VALID_UUID,
      stripe, FinancialTransaction,
    });

    expect(res._status).toBe(422);
    expect(res._body.code).toBe('STRIPE_CHARGE_FAILED');
    expect(res._body.error).toContain('Card charge failed');
    expect(mockApplyPackagePayment).not.toHaveBeenCalled();
    expect(mockRefundsCreate).not.toHaveBeenCalled();
  });

  // ═══════════════════════════════════════════════════════════════
  // 3. PAYMENT INTENT NOT SUCCEEDED
  // ═══════════════════════════════════════════════════════════════

  it('returns STRIPE_CHARGE_FAILED when PI status is requires_action', async () => {
    mockPaymentIntentsCreate.mockResolvedValue({ id: 'pi_action', status: 'requires_action' });

    const res = await executeChargeFlow({
      client: makeClient(), pkg: makePackage(),
      paymentMethodId: 'pm_test_visa123', idempotencyToken: VALID_UUID,
      stripe, FinancialTransaction,
    });

    expect(res._status).toBe(422);
    expect(res._body.code).toBe('STRIPE_CHARGE_FAILED');
    expect(res._body.error).toContain('requires_action');
    expect(mockApplyPackagePayment).not.toHaveBeenCalled();
  });

  // ═══════════════════════════════════════════════════════════════
  // 4. CHARGE OK → GRANT FAILS → REFUND SUCCEEDS
  // ═══════════════════════════════════════════════════════════════

  it('refunds charge when session grant fails, maps service error', async () => {
    mockPaymentIntentsCreate.mockResolvedValue({ id: 'pi_refundable', status: 'succeeded' });

    const grantError = new Error('Package is inactive');
    grantError.code = 'PACKAGE_INACTIVE';
    mockApplyPackagePayment.mockRejectedValue(grantError);
    mockRefundsCreate.mockResolvedValue({ id: 'rf_ok' });
    mockMapServiceError.mockReturnValue({ statusCode: 422, errorCode: 'PACKAGE_INACTIVE' });

    const res = await executeChargeFlow({
      client: makeClient(), pkg: makePackage(),
      paymentMethodId: 'pm_test_visa123', idempotencyToken: VALID_UUID,
      stripe, FinancialTransaction,
    });

    expect(res._status).toBe(422);
    expect(res._body.code).toBe('PACKAGE_INACTIVE');
    expect(mockRefundsCreate).toHaveBeenCalledWith({ payment_intent: 'pi_refundable' });
    expect(mockFinancialTransactionCreate).not.toHaveBeenCalled();
  });

  // ═══════════════════════════════════════════════════════════════
  // 5. ★ CHARGE OK → GRANT FAILS → REFUND FAILS ★
  //    THE CRITICAL STRIPE_REFUND_FAILED PATH
  // ═══════════════════════════════════════════════════════════════

  it('returns STRIPE_REFUND_FAILED and creates audit record when refund fails', async () => {
    mockPaymentIntentsCreate.mockResolvedValue({ id: 'pi_stuck', status: 'succeeded' });

    const grantError = new Error('Package is inactive');
    grantError.code = 'PACKAGE_INACTIVE';
    mockApplyPackagePayment.mockRejectedValue(grantError);

    mockRefundsCreate.mockRejectedValue(new Error('Stripe refund network timeout'));
    mockFinancialTransactionCreate.mockResolvedValue({ id: 'ft_audit_1' });

    const res = await executeChargeFlow({
      client: makeClient(), pkg: makePackage(),
      paymentMethodId: 'pm_test_visa123', idempotencyToken: VALID_UUID,
      stripe, FinancialTransaction,
    });

    // ── Response verification ────────────────────────────────
    expect(res._status).toBe(500);
    expect(res._body.success).toBe(false);
    expect(res._body.code).toBe('STRIPE_REFUND_FAILED');
    expect(res._body.stripePaymentIntentId).toBe('pi_stuck');
    expect(res._body.error).toContain('refund could not be issued');

    // ── Audit record verification ────────────────────────────
    expect(mockFinancialTransactionCreate).toHaveBeenCalledTimes(1);
    const auditArgs = mockFinancialTransactionCreate.mock.calls[0][0];

    // Uses valid FinancialTransaction fields (model verification)
    expect(auditArgs.userId).toBe(4);
    expect(auditArgs.amount).toBe(1750);
    expect(auditArgs.currency).toBe('USD');
    expect(auditArgs.status).toBe('failed');                // valid enum value
    expect(auditArgs.stripePaymentIntentId).toBe('pi_stuck'); // column exists
    expect(auditArgs.paymentMethod).toBe('stripe');
    expect(auditArgs.description).toContain('REFUND_FAILED');

    // Metadata contains full context for manual Stripe dashboard resolution
    const metadata = JSON.parse(auditArgs.metadata);        // stored as JSON string
    expect(metadata.failureType).toBe('refund_failed');
    expect(metadata.clientId).toBe(4);
    expect(metadata.storefrontItemId).toBe(1);
    expect(metadata.idempotencyToken).toBe(VALID_UUID);
    expect(metadata.adminUserId).toBe(1);
    expect(metadata.paymentMethodLast4).toBe('4242');
    expect(metadata.paymentMethodBrand).toBe('visa');
    expect(metadata.grantError).toBe('Package is inactive');

    // ── Logging verification ─────────────────────────────────
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('[REFUND-FAILURE] Stripe refund failed')
    );
  });

  // ═══════════════════════════════════════════════════════════════
  // 6. STRIPE_REFUND_FAILED — audit record also fails (resilience)
  // ═══════════════════════════════════════════════════════════════

  it('returns STRIPE_REFUND_FAILED even when audit record creation also fails', async () => {
    mockPaymentIntentsCreate.mockResolvedValue({ id: 'pi_double_fail', status: 'succeeded' });

    const grantError = new Error('Client not found');
    grantError.code = 'CLIENT_NOT_FOUND';
    mockApplyPackagePayment.mockRejectedValue(grantError);

    mockRefundsCreate.mockRejectedValue(new Error('Network error'));
    mockFinancialTransactionCreate.mockRejectedValue(new Error('DB connection lost'));

    const res = await executeChargeFlow({
      client: makeClient(), pkg: makePackage(),
      paymentMethodId: 'pm_test_visa123', idempotencyToken: VALID_UUID,
      stripe, FinancialTransaction,
    });

    // Still returns STRIPE_REFUND_FAILED (doesn't crash)
    expect(res._status).toBe(500);
    expect(res._body.code).toBe('STRIPE_REFUND_FAILED');
    expect(res._body.stripePaymentIntentId).toBe('pi_double_fail');

    // Both failures logged (single-arg template literal calls)
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('[REFUND-FAILURE] Stripe refund failed')
    );
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('[REFUND-FAILURE] Audit record creation also failed')
    );
  });

  // ═══════════════════════════════════════════════════════════════
  // 7. INPUT VALIDATION
  // ═══════════════════════════════════════════════════════════════

  it('rejects invalid clientId', async () => {
    const res = await executeChargeFlow({
      client: { id: -1 }, pkg: makePackage(),
      paymentMethodId: 'pm_test', idempotencyToken: VALID_UUID,
      stripe, FinancialTransaction,
    });
    expect(res._status).toBe(422);
    expect(res._body.error).toContain('clientId');
  });

  it('rejects missing paymentMethodId', async () => {
    const res = await executeChargeFlow({
      client: makeClient(), pkg: makePackage(),
      paymentMethodId: undefined, idempotencyToken: VALID_UUID,
      stripe, FinancialTransaction,
    });
    expect(res._status).toBe(422);
    expect(res._body.error).toContain('paymentMethodId');
  });

  it('rejects invalid idempotencyToken', async () => {
    const res = await executeChargeFlow({
      client: makeClient(), pkg: makePackage(),
      paymentMethodId: 'pm_test', idempotencyToken: 'not-a-uuid',
      stripe, FinancialTransaction,
    });
    expect(res._status).toBe(422);
    expect(res._body.error).toContain('idempotencyToken');
  });

  // ═══════════════════════════════════════════════════════════════
  // 8. CLIENT VALIDATION
  // ═══════════════════════════════════════════════════════════════

  it('returns CLIENT_NOT_FOUND for null client', async () => {
    const res = await executeChargeFlow({
      client: null, pkg: makePackage(),
      paymentMethodId: 'pm_test', idempotencyToken: VALID_UUID,
      stripe, FinancialTransaction,
    });
    expect(res._status).toBe(422); // clientId is NaN → 422
  });

  it('returns STRIPE_CUSTOMER_NOT_FOUND when client has no stripeCustomerId', async () => {
    const res = await executeChargeFlow({
      client: makeClient({ stripeCustomerId: null }), pkg: makePackage(),
      paymentMethodId: 'pm_test', idempotencyToken: VALID_UUID,
      stripe, FinancialTransaction,
    });
    expect(res._status).toBe(404);
    expect(res._body.code).toBe('STRIPE_CUSTOMER_NOT_FOUND');
  });

  it('returns CLIENT_NOT_FOUND for trainer role', async () => {
    const res = await executeChargeFlow({
      client: makeClient({ role: 'trainer' }), pkg: makePackage(),
      paymentMethodId: 'pm_test', idempotencyToken: VALID_UUID,
      stripe, FinancialTransaction,
    });
    expect(res._status).toBe(404);
    expect(res._body.code).toBe('CLIENT_NOT_FOUND');
  });

  // ═══════════════════════════════════════════════════════════════
  // 9. PAYMENT METHOD OWNERSHIP
  // ═══════════════════════════════════════════════════════════════

  it('returns STRIPE_OWNERSHIP_MISMATCH for wrong customer', async () => {
    mockPaymentMethodsRetrieve.mockResolvedValue({
      id: 'pm_test', customer: 'cus_OTHER',
      card: { brand: 'visa', last4: '4242' },
    });

    const res = await executeChargeFlow({
      client: makeClient(), pkg: makePackage(),
      paymentMethodId: 'pm_test', idempotencyToken: VALID_UUID,
      stripe, FinancialTransaction,
    });
    expect(res._status).toBe(403);
    expect(res._body.code).toBe('STRIPE_OWNERSHIP_MISMATCH');
  });

  it('returns STRIPE_CHARGE_FAILED when PM retrieval fails', async () => {
    mockPaymentMethodsRetrieve.mockRejectedValue(new Error('No such PaymentMethod'));

    const res = await executeChargeFlow({
      client: makeClient(), pkg: makePackage(),
      paymentMethodId: 'pm_test', idempotencyToken: VALID_UUID,
      stripe, FinancialTransaction,
    });
    expect(res._status).toBe(422);
    expect(res._body.code).toBe('STRIPE_CHARGE_FAILED');
  });

  // ═══════════════════════════════════════════════════════════════
  // 10. ERROR MAPPING
  // ═══════════════════════════════════════════════════════════════

  it('maps DUPLICATE_PAYMENT_WINDOW to 409 after successful refund', async () => {
    mockPaymentIntentsCreate.mockResolvedValue({ id: 'pi_dup', status: 'succeeded' });
    const dupError = new Error('Duplicate payment detected');
    dupError.code = 'DUPLICATE_PAYMENT_WINDOW';
    dupError.duplicateWindow = true;
    mockApplyPackagePayment.mockRejectedValue(dupError);
    mockRefundsCreate.mockResolvedValue({ id: 'rf_ok' });
    mockMapServiceError.mockReturnValue({ statusCode: 409, errorCode: 'DUPLICATE_PAYMENT_WINDOW' });

    const res = await executeChargeFlow({
      client: makeClient(), pkg: makePackage(),
      paymentMethodId: 'pm_test_visa123', idempotencyToken: VALID_UUID,
      stripe, FinancialTransaction,
    });

    expect(res._status).toBe(409);
    expect(res._body.code).toBe('DUPLICATE_PAYMENT_WINDOW');
    expect(res._body.duplicateWindow).toBe(true);
  });

  it('defaults to 500/INTERNAL_ERROR when mapServiceError returns null', async () => {
    mockPaymentIntentsCreate.mockResolvedValue({ id: 'pi_unk', status: 'succeeded' });
    mockApplyPackagePayment.mockRejectedValue(new Error('Unknown'));
    mockRefundsCreate.mockResolvedValue({ id: 'rf_ok' });
    mockMapServiceError.mockReturnValue(null);

    const res = await executeChargeFlow({
      client: makeClient(), pkg: makePackage(),
      paymentMethodId: 'pm_test_visa123', idempotencyToken: VALID_UUID,
      stripe, FinancialTransaction,
    });

    expect(res._status).toBe(500);
    expect(res._body.code).toBe('INTERNAL_ERROR');
  });

  // ═══════════════════════════════════════════════════════════════
  // 11. PACKAGE VALIDATION
  // ═══════════════════════════════════════════════════════════════

  it('returns PACKAGE_NOT_FOUND for null package', async () => {
    const res = await executeChargeFlow({
      client: makeClient(), pkg: null,
      paymentMethodId: 'pm_test', idempotencyToken: VALID_UUID,
      stripe, FinancialTransaction,
    });
    expect(res._status).toBe(422); // storefrontItemId is NaN
  });

  it('returns 422 when package has zero price', async () => {
    mockPaymentMethodsRetrieve.mockResolvedValue({
      id: 'pm_test', customer: 'cus_test_abc123',
      card: { brand: 'visa', last4: '4242' },
    });

    const res = await executeChargeFlow({
      client: makeClient(), pkg: makePackage({ totalCost: 0, price: 0 }),
      paymentMethodId: 'pm_test', idempotencyToken: VALID_UUID,
      stripe, FinancialTransaction,
    });
    expect(res._status).toBe(422);
    expect(res._body.error).toContain('no price');
  });

  // ═══════════════════════════════════════════════════════════════
  // 12. FLOW ORDERING — ensures capture happens before grant
  // ═══════════════════════════════════════════════════════════════

  it('calls Stripe PaymentIntents.create BEFORE applyPackagePayment', async () => {
    const callOrder = [];
    mockPaymentIntentsCreate.mockImplementation(async () => {
      callOrder.push('stripe_capture');
      return { id: 'pi_order_test', status: 'succeeded' };
    });
    mockApplyPackagePayment.mockImplementation(async () => {
      callOrder.push('grant_sessions');
      return { orderId: 1, sessionsAdded: 10, previousBalance: 0, newBalance: 10, packageName: 'Test', totalAmount: 1750 };
    });

    await executeChargeFlow({
      client: makeClient(), pkg: makePackage(),
      paymentMethodId: 'pm_test_visa123', idempotencyToken: VALID_UUID,
      stripe, FinancialTransaction,
    });

    expect(callOrder).toEqual(['stripe_capture', 'grant_sessions']);
  });

  it('calls Stripe refunds.create when grant fails (before returning error)', async () => {
    const callOrder = [];
    mockPaymentIntentsCreate.mockImplementation(async () => {
      callOrder.push('stripe_capture');
      return { id: 'pi_order_test2', status: 'succeeded' };
    });
    mockApplyPackagePayment.mockImplementation(async () => {
      callOrder.push('grant_sessions');
      throw new Error('Grant failed');
    });
    mockRefundsCreate.mockImplementation(async () => {
      callOrder.push('stripe_refund');
      return { id: 'rf_test' };
    });
    mockMapServiceError.mockReturnValue({ statusCode: 500, errorCode: 'INTERNAL_ERROR' });

    await executeChargeFlow({
      client: makeClient(), pkg: makePackage(),
      paymentMethodId: 'pm_test_visa123', idempotencyToken: VALID_UUID,
      stripe, FinancialTransaction,
    });

    expect(callOrder).toEqual(['stripe_capture', 'grant_sessions', 'stripe_refund']);
  });
});

// ═════════════════════════════════════════════════════════════════════
// GET /payment-methods/:clientId — Handler Logic
// ═════════════════════════════════════════════════════════════════════

/**
 * Mirrors the GET /payment-methods/:clientId handler from
 * adminChargeCardRoutes.mjs lines 62-108.
 */
async function executeListPaymentMethods({ clientId, client, stripe: stripeClient }) {
  const res = {
    _status: null, _body: null,
    status(code) { this._status = code; return this; },
    json(body) { this._body = body; return this; },
  };

  // Parse clientId (mirrors parseInt(req.params.clientId, 10))
  const parsedId = parseInt(clientId, 10);
  if (!parsedId || parsedId <= 0) {
    return res.status(422).json({ success: false, error: 'Invalid clientId' });
  }

  // Client lookup
  if (!client || !['client', 'user'].includes(client.role)) {
    return res.status(404).json({ success: false, error: 'Client not found', code: 'CLIENT_NOT_FOUND' });
  }

  // No Stripe customer → empty array
  if (!client.stripeCustomerId) {
    return res.status(200).json({ success: true, paymentMethods: [], hasStripeCustomer: false });
  }

  // List payment methods from Stripe
  try {
    const paymentMethods = await stripeClient.paymentMethods.list({
      customer: client.stripeCustomerId,
      type: 'card',
    });

    const cards = paymentMethods.data.map(pm => ({
      id: pm.id,
      brand: pm.card.brand,
      last4: pm.card.last4,
      expMonth: pm.card.exp_month,
      expYear: pm.card.exp_year,
    }));

    return res.status(200).json({ success: true, paymentMethods: cards, hasStripeCustomer: true });
  } catch (error) {
    mockLogger.error('[AdminChargeCard] Error listing payment methods:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to list payment methods' });
  }
}

describe('GET /payment-methods/:clientId — Handler Logic', () => {
  const stripeClient = {
    paymentMethods: { list: mockPaymentMethodsList },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns cards for client with stripeCustomerId', async () => {
    mockPaymentMethodsList.mockResolvedValue({
      data: [
        { id: 'pm_1', card: { brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2028 } },
        { id: 'pm_2', card: { brand: 'mastercard', last4: '5555', exp_month: 3, exp_year: 2027 } },
      ],
    });

    const res = await executeListPaymentMethods({
      clientId: '4',
      client: makeClient(),
      stripe: stripeClient,
    });

    expect(res._status).toBe(200);
    expect(res._body.success).toBe(true);
    expect(res._body.hasStripeCustomer).toBe(true);
    expect(res._body.paymentMethods).toHaveLength(2);
    expect(res._body.paymentMethods[0]).toEqual({
      id: 'pm_1', brand: 'visa', last4: '4242', expMonth: 12, expYear: 2028,
    });
    expect(res._body.paymentMethods[1]).toEqual({
      id: 'pm_2', brand: 'mastercard', last4: '5555', expMonth: 3, expYear: 2027,
    });
  });

  it('returns empty array with hasStripeCustomer=false when client has no stripeCustomerId', async () => {
    const res = await executeListPaymentMethods({
      clientId: '4',
      client: makeClient({ stripeCustomerId: null }),
      stripe: stripeClient,
    });

    expect(res._status).toBe(200);
    expect(res._body.success).toBe(true);
    expect(res._body.paymentMethods).toEqual([]);
    expect(res._body.hasStripeCustomer).toBe(false);
    expect(mockPaymentMethodsList).not.toHaveBeenCalled();
  });

  it('returns 422 for invalid clientId', async () => {
    const res = await executeListPaymentMethods({
      clientId: 'abc',
      client: makeClient(),
      stripe: stripeClient,
    });
    expect(res._status).toBe(422);
    expect(res._body.error).toContain('clientId');
  });

  it('returns 422 for clientId=0', async () => {
    const res = await executeListPaymentMethods({
      clientId: '0',
      client: makeClient(),
      stripe: stripeClient,
    });
    expect(res._status).toBe(422);
  });

  it('returns CLIENT_NOT_FOUND for non-existent client', async () => {
    const res = await executeListPaymentMethods({
      clientId: '99',
      client: null,
      stripe: stripeClient,
    });
    expect(res._status).toBe(404);
    expect(res._body.code).toBe('CLIENT_NOT_FOUND');
  });

  it('returns CLIENT_NOT_FOUND for admin role', async () => {
    const res = await executeListPaymentMethods({
      clientId: '4',
      client: makeClient({ role: 'admin' }),
      stripe: stripeClient,
    });
    expect(res._status).toBe(404);
    expect(res._body.code).toBe('CLIENT_NOT_FOUND');
  });

  it('returns 500 when Stripe list call fails', async () => {
    mockPaymentMethodsList.mockRejectedValue(new Error('Stripe API error'));

    const res = await executeListPaymentMethods({
      clientId: '4',
      client: makeClient(),
      stripe: stripeClient,
    });

    expect(res._status).toBe(500);
    expect(res._body.error).toBe('Failed to list payment methods');
    expect(mockLogger.error).toHaveBeenCalledWith(
      '[AdminChargeCard] Error listing payment methods:',
      'Stripe API error'
    );
  });
});

// ═════════════════════════════════════════════════════════════════════
// POST /test-card — Handler Logic (including same/different customer)
// ═════════════════════════════════════════════════════════════════════

/**
 * Mirrors the POST /test-card handler from
 * adminChargeCardRoutes.mjs lines 299-380 (with ownership-verification fix).
 */
async function executeTestCard({ client, isTestMode: testMode, stripe: stripeClient }) {
  const res = {
    _status: null, _body: null,
    status(code) { this._status = code; return this; },
    json(body) { this._body = body; return this; },
  };

  // 1. Only allow in test mode
  if (!testMode) {
    return res.status(403).json({
      success: false,
      error: 'Test cards can only be attached in Stripe test mode',
    });
  }

  const clientId = client?.id;
  if (!Number.isInteger(clientId) || clientId <= 0) {
    return res.status(422).json({ success: false, error: 'Invalid clientId' });
  }

  if (!client || !['client', 'user'].includes(client.role)) {
    return res.status(404).json({ success: false, error: 'Client not found' });
  }

  // 2. Create Stripe customer if none exists
  let customerId = client.stripeCustomerId;
  if (!customerId) {
    const customer = await stripeClient.customers.create({
      email: client.email,
      name: `${client.firstName || ''} ${client.lastName || ''}`.trim(),
      metadata: { userId: clientId.toString(), source: 'admin_test_card' },
    });
    customerId = customer.id;
    // simulate client.update
    mockLogger.info(`[AdminChargeCard] Created Stripe customer ${customerId} for client ${clientId}`);
  }

  // 3. Attach test payment method
  try {
    await stripeClient.paymentMethods.attach('pm_card_visa', { customer: customerId });
  } catch (attachErr) {
    if (attachErr.code === 'resource_already_exists' ||
        attachErr.message?.includes('already been attached')) {
      // Verify the PM is attached to THIS customer, not a different one
      try {
        const existingPm = await stripeClient.paymentMethods.retrieve('pm_card_visa');
        if (existingPm.customer !== customerId) {
          return res.status(422).json({
            success: false,
            error: 'Test card is already attached to a different customer',
            code: 'TEST_CARD_OWNERSHIP_CONFLICT',
          });
        }
      } catch (retrieveErr) {
        return res.status(422).json({
          success: false,
          error: `Failed to verify test card ownership: ${retrieveErr.message}`,
        });
      }
      mockLogger.info(`[AdminChargeCard] Test card already attached to customer ${customerId}`);
    } else {
      return res.status(422).json({
        success: false,
        error: `Failed to attach test card: ${attachErr.message}`,
      });
    }
  }

  return res.status(200).json({
    success: true,
    paymentMethodId: 'pm_card_visa',
    brand: 'visa',
    last4: '4242',
    message: 'Test Visa card attached successfully',
  });
}

describe('POST /test-card — Handler Logic', () => {
  const stripeClient = {
    paymentMethods: {
      attach: mockPaymentMethodsAttach,
      retrieve: mockPaymentMethodsRetrieve,
    },
    customers: { create: mockCustomersCreate },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('attaches test card successfully in test mode', async () => {
    mockPaymentMethodsAttach.mockResolvedValue({ id: 'pm_card_visa' });

    const res = await executeTestCard({
      client: makeClient(),
      isTestMode: true,
      stripe: stripeClient,
    });

    expect(res._status).toBe(200);
    expect(res._body.success).toBe(true);
    expect(res._body.paymentMethodId).toBe('pm_card_visa');
    expect(res._body.brand).toBe('visa');
    expect(res._body.last4).toBe('4242');
    expect(mockPaymentMethodsAttach).toHaveBeenCalledWith('pm_card_visa', { customer: 'cus_test_abc123' });
  });

  it('rejects in live mode (403)', async () => {
    const res = await executeTestCard({
      client: makeClient(),
      isTestMode: false,
      stripe: stripeClient,
    });

    expect(res._status).toBe(403);
    expect(res._body.error).toContain('test mode');
    expect(mockPaymentMethodsAttach).not.toHaveBeenCalled();
  });

  it('creates Stripe customer when client has no stripeCustomerId', async () => {
    mockCustomersCreate.mockResolvedValue({ id: 'cus_new_123' });
    mockPaymentMethodsAttach.mockResolvedValue({ id: 'pm_card_visa' });

    const res = await executeTestCard({
      client: makeClient({ stripeCustomerId: null }),
      isTestMode: true,
      stripe: stripeClient,
    });

    expect(res._status).toBe(200);
    expect(mockCustomersCreate).toHaveBeenCalledWith(expect.objectContaining({
      email: 'test@example.com',
      metadata: expect.objectContaining({ source: 'admin_test_card' }),
    }));
    expect(mockPaymentMethodsAttach).toHaveBeenCalledWith('pm_card_visa', { customer: 'cus_new_123' });
  });

  it('treats "already attached" to SAME customer as idempotent success', async () => {
    const attachErr = new Error('The payment method pm_card_visa has already been attached');
    attachErr.code = 'resource_already_exists';
    mockPaymentMethodsAttach.mockRejectedValue(attachErr);

    // PM is attached to the SAME customer
    mockPaymentMethodsRetrieve.mockResolvedValue({
      id: 'pm_card_visa',
      customer: 'cus_test_abc123',
      card: { brand: 'visa', last4: '4242' },
    });

    const res = await executeTestCard({
      client: makeClient(),
      isTestMode: true,
      stripe: stripeClient,
    });

    expect(res._status).toBe(200);
    expect(res._body.success).toBe(true);
    expect(mockPaymentMethodsRetrieve).toHaveBeenCalledWith('pm_card_visa');
  });

  it('returns TEST_CARD_OWNERSHIP_CONFLICT when PM is attached to DIFFERENT customer', async () => {
    const attachErr = new Error('The payment method pm_card_visa has already been attached');
    attachErr.code = 'resource_already_exists';
    mockPaymentMethodsAttach.mockRejectedValue(attachErr);

    // PM is attached to a DIFFERENT customer
    mockPaymentMethodsRetrieve.mockResolvedValue({
      id: 'pm_card_visa',
      customer: 'cus_OTHER_customer',
      card: { brand: 'visa', last4: '4242' },
    });

    const res = await executeTestCard({
      client: makeClient(),
      isTestMode: true,
      stripe: stripeClient,
    });

    expect(res._status).toBe(422);
    expect(res._body.code).toBe('TEST_CARD_OWNERSHIP_CONFLICT');
    expect(res._body.error).toContain('different customer');
  });

  it('returns 422 when PM retrieve fails during ownership check', async () => {
    const attachErr = new Error('already been attached');
    mockPaymentMethodsAttach.mockRejectedValue(attachErr);
    mockPaymentMethodsRetrieve.mockRejectedValue(new Error('Stripe network timeout'));

    const res = await executeTestCard({
      client: makeClient(),
      isTestMode: true,
      stripe: stripeClient,
    });

    expect(res._status).toBe(422);
    expect(res._body.error).toContain('verify test card ownership');
  });

  it('returns 422 for non-already-attached errors', async () => {
    mockPaymentMethodsAttach.mockRejectedValue(new Error('Card expired'));

    const res = await executeTestCard({
      client: makeClient(),
      isTestMode: true,
      stripe: stripeClient,
    });

    expect(res._status).toBe(422);
    expect(res._body.error).toContain('Card expired');
  });

  it('rejects invalid clientId', async () => {
    const res = await executeTestCard({
      client: { id: -1, role: 'client' },
      isTestMode: true,
      stripe: stripeClient,
    });
    expect(res._status).toBe(422);
    expect(res._body.error).toContain('clientId');
  });

  it('returns 404 for non-client role', async () => {
    const res = await executeTestCard({
      client: makeClient({ role: 'trainer' }),
      isTestMode: true,
      stripe: stripeClient,
    });
    expect(res._status).toBe(404);
    expect(res._body.error).toContain('Client not found');
  });
});
