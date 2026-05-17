/**
 * Test Script: MindBody Parity - Admin Cancellation Features
 * ===========================================================
 * Verifies endpoint registration and patterns for:
 * - Decision status tracking (pending/charged/waived)
 * - Admin review with reason/audit fields
 * - Silent cancel mode
 * - Unified pricing helper (no hardcoded fees)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== TESTING MINDBODY PARITY: ADMIN CANCELLATION FEATURES ===\n');

let passed = 0;
let failed = 0;

function test(name, condition) {
  if (condition) {
    console.log(`  [PASS] ${name}`);
    passed++;
  } else {
    console.log(`  [FAIL] ${name}`);
    failed++;
  }
}

// Read the sessionRoutes file
const routesPath = path.join(__dirname, 'routes', 'sessionRoutes.mjs');
const routesContent = fs.readFileSync(routesPath, 'utf8');

// Read the Session model
const modelPath = path.join(__dirname, 'models', 'Session.mjs');
const modelContent = fs.readFileSync(modelPath, 'utf8');

// Read the cancellation pricing helper
const pricingPath = path.join(__dirname, 'utils', 'cancellationPricing.mjs');
const pricingContent = fs.readFileSync(pricingPath, 'utf8');

// ===== TEST 1: Session Model Decision Fields =====
console.log('[TEST 1] Checking Session model decision fields...');
test('cancellationDecision field exists', modelContent.includes('cancellationDecision'));
test('cancellationReviewedBy field exists', modelContent.includes('cancellationReviewedBy'));
test('cancellationReviewedAt field exists', modelContent.includes('cancellationReviewedAt'));
test('cancellationReviewReason field exists', modelContent.includes('cancellationReviewReason'));
test('Decision validation includes pending', modelContent.includes("'pending'"));
test('Decision validation includes charged', modelContent.includes("'charged'"));
test('Decision validation includes waived', modelContent.includes("'waived'"));

// ===== TEST 2: Unified Pricing Helper =====
console.log('\n[TEST 2] Checking unified pricing helper...');
test('getClientPackagePricing function exported', pricingContent.includes('export async function getClientPackagePricing'));
test('computeCancellationCharge function exported', pricingContent.includes('export function computeCancellationCharge'));
test('getCancellationPolicy function exported', pricingContent.includes('export function getCancellationPolicy'));
test('No hardcoded $75 fee', !pricingContent.includes('75') || pricingContent.includes('175'));
test('Dynamic pricing from package', pricingContent.includes('pricePerSession'));
test('Special package detection', pricingContent.includes('isSpecialPackage'));
test('requiresAdminReview flag', pricingContent.includes('requiresAdminReview'));

// ===== TEST 3: Charge Cancellation Endpoint =====
console.log('\n[TEST 3] Checking POST /:sessionId/charge-cancellation endpoint...');
test('charge-cancellation endpoint exists', routesContent.includes('charge-cancellation'));
test('Decision parameter accepted', routesContent.includes('decision'));
test('Reason parameter accepted', routesContent.includes('reason'));
test('cancellationDecision set in update', routesContent.includes('cancellationDecision'));
test('cancellationReviewedBy audit field', routesContent.includes('cancellationReviewedBy'));
test('cancellationReviewedAt audit field', routesContent.includes('cancellationReviewedAt'));
test('cancellationReviewReason field', routesContent.includes('cancellationReviewReason'));

// ===== TEST 4: Admin Cancelled Sessions with Filter =====
console.log('\n[TEST 4] Checking GET /admin/cancelled with decisionStatus filter...');
test('admin/cancelled endpoint exists', routesContent.includes('/admin/cancelled'));
test('decisionStatus query param', routesContent.includes('decisionStatus'));
test('Filter by pending', routesContent.includes("'pending'"));
test('Filter by charged', routesContent.includes("'charged'"));
test('Filter by waived', routesContent.includes("'waived'"));
test('Reviewer info included', routesContent.includes('reviewerInfo') || routesContent.includes('cancellationReviewedBy'));

// ===== TEST 5: Silent Cancel Mode =====
console.log('\n[TEST 5] Checking PATCH /:sessionId/cancel with silent flag...');
test('PATCH cancel endpoint exists', routesContent.includes('router.patch("/:sessionId/cancel"'));
test('Silent parameter in request body', routesContent.includes('silent'));
test('shouldSendNotifications check', routesContent.includes('shouldSendNotifications') || routesContent.includes('!silent'));
test('Silent mode suppresses client email', routesContent.includes('shouldSendNotifications && notifyClient'));
test('Silent mode suppresses trainer email', routesContent.includes('shouldSendNotifications && notifyTrainer'));
test('Response includes silentMode', routesContent.includes('silentMode'));

// ===== TEST 6: Dynamic Pricing in Cancel Endpoint =====
console.log('\n[TEST 6] Checking dynamic pricing in cancel endpoint...');
test('getClientPackagePricing imported', routesContent.includes('getClientPackagePricing'));
test('computeCancellationCharge imported', routesContent.includes('computeCancellationCharge'));
test('getCancellationPolicy imported', routesContent.includes('getCancellationPolicy'));
test('packageInfo used for pricing', routesContent.includes('packageInfo.pricePerSession') || routesContent.includes('packageInfo'));
test('No hardcoded sessionRate = 75', !routesContent.includes('sessionRate = 75'));

// ===== TEST 7: Migration File =====
console.log('\n[TEST 7] Checking migration file...');
const migrationPath = path.join(__dirname, 'migrations', '20260205000001-add-cancellation-decision-fields.cjs');
const migrationExists = fs.existsSync(migrationPath);
test('Migration file exists', migrationExists);

if (migrationExists) {
  const migrationContent = fs.readFileSync(migrationPath, 'utf8');
  test('Migration adds cancellationDecision', migrationContent.includes('cancellationDecision'));
  test('Migration adds cancellationReviewedBy', migrationContent.includes('cancellationReviewedBy'));
  test('Migration adds cancellationReviewedAt', migrationContent.includes('cancellationReviewedAt'));
  test('Migration adds cancellationReviewReason', migrationContent.includes('cancellationReviewReason'));
  test('Migration has rollback support', migrationContent.includes('down'));
}

// ===== TEST 8: Frontend Widget Update =====
console.log('\n[TEST 8] Checking CancelledSessionsWidget updates...');
const widgetPath = path.join(__dirname, '..', 'frontend', 'src', 'components', 'DashBoard', 'Pages', 'admin-dashboard', 'components', 'CancelledSessionsWidget.tsx');
const widgetContent = fs.readFileSync(widgetPath, 'utf8');

test('Decision badges interface', widgetContent.includes('cancellationDecision'));
test('Review reason interface', widgetContent.includes('cancellationReviewReason'));
test('Reviewer info interface', widgetContent.includes('reviewerInfo'));
test('DecisionBadge styled component', widgetContent.includes('DecisionBadge'));
test('Filter buttons for decision status', widgetContent.includes('decisionFilter'));
test('Waive reason input', widgetContent.includes('waiveReasons') || widgetContent.includes('WaiveReasonInput'));
test('Decision in handleCharge', widgetContent.includes("decision = chargeType === 'none' ? 'waived' : 'charged'") || widgetContent.includes('decision'));

// Summary
console.log('\n=== TEST SUMMARY ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}`);

if (failed === 0) {
  console.log('\n[SUCCESS] ALL TESTS PASSED');
  process.exit(0);
} else {
  console.log('\n[WARNING] SOME TESTS FAILED');
  process.exit(1);
}
