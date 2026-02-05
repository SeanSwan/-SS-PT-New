/**
 * Test Script: Phase E - Late Cancel Warning Endpoint
 * ====================================================
 * Verifies endpoint registration and patterns for late cancellation warnings
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== TESTING PHASE E: LATE CANCEL WARNING ENDPOINT ===\n');

let passed = 0;
let failed = 0;

function test(name, condition) {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ ${name}`);
    failed++;
  }
}

// Read the sessionRoutes file
const routesPath = path.join(__dirname, 'routes', 'sessionRoutes.mjs');
const routesContent = fs.readFileSync(routesPath, 'utf8');

// Test 1: Route Registration
console.log('[TEST 1] Checking cancel-warning endpoint registration...');
test('GET /:sessionId/cancel-warning endpoint found',
  routesContent.includes('router.get("/:sessionId/cancel-warning"') ||
  routesContent.includes("router.get('/:sessionId/cancel-warning'"));

// Test 2: Late Cancellation Detection
console.log('\n[TEST 2] Verifying late cancellation detection...');
test('isLateCancellation variable found', routesContent.includes('isLateCancellation'));
test('24-hour threshold check found', routesContent.includes('hoursUntilSession < 24') || routesContent.includes('< 24'));
test('hoursUntilSession calculation found', routesContent.includes('hoursUntilSession'));

// Test 3: Authorization Check
console.log('\n[TEST 3] Verifying authorization...');
test('Admin role check found', routesContent.includes("role === 'admin'") || routesContent.includes('role === "admin"'));
test('Trainer session ownership check found', routesContent.includes('session.trainerId === req.user.id'));
test('Client session ownership check found', routesContent.includes('session.userId === req.user.id'));
test('protect middleware applied', routesContent.includes('/:sessionId/cancel-warning", protect'));

// Test 4: Response Fields
console.log('\n[TEST 4] Verifying response structure...');
test('canCancel field in response', routesContent.includes('canCancel'));
test('isLateCancellation in response', routesContent.includes('isLateCancellation'));
test('hoursUntilSession in response', routesContent.includes('hoursUntilSession:'));
test('cancellationPolicy object in response', routesContent.includes('cancellationPolicy'));
test('lateFeeAmount in response', routesContent.includes('lateFeeAmount'));
test('warningMessage in response', routesContent.includes('warningMessage'));
test('sessionDateFormatted in response', routesContent.includes('sessionDateFormatted'));
test('confirmationRequired field found', routesContent.includes('confirmationRequired'));

// Test 5: Status Validation
console.log('\n[TEST 5] Verifying cancellable status check...');
test('Scheduled status check found', routesContent.includes("'scheduled'"));
test('Confirmed status check found', routesContent.includes("'confirmed'"));
test('Requested status check found', routesContent.includes("'requested'"));
test('Status array validation found', routesContent.includes("['scheduled', 'confirmed', 'requested']"));

// Test 6: Fee Configuration
console.log('\n[TEST 6] Verifying fee configuration...');
test('defaultLateFee defined', routesContent.includes('defaultLateFee'));
test('requiredNoticeHours policy defined', routesContent.includes('requiredNoticeHours'));
test('creditRestored policy defined', routesContent.includes('creditRestored'));

// Test 7: Existing Cancel Endpoints (unchanged)
console.log('\n[TEST 7] Verifying existing cancel endpoints still exist...');
test('DELETE /cancel/:sessionId still exists', routesContent.includes('router.delete("/cancel/:sessionId"'));
test('PATCH /:sessionId/cancel still exists', routesContent.includes('router.patch("/:sessionId/cancel"'));

// Test 8: Frontend Component
console.log('\n[TEST 8] Checking frontend component patterns...');
const frontendPath = path.join(__dirname, '..', 'frontend', 'src', 'components', 'UniversalMasterSchedule', 'SessionDetailModal.tsx');
const frontendContent = fs.readFileSync(frontendPath, 'utf8');

test('showLateCancelWarning state found', frontendContent.includes('showLateCancelWarning'));
test('lateCancelWarning state found', frontendContent.includes('lateCancelWarning'));
test('fetchCancelWarning function found', frontendContent.includes('fetchCancelWarning'));
test('handleConfirmLateCancellation function found', frontendContent.includes('handleConfirmLateCancellation'));
test('LateCancelWarningPanel styled component found', frontendContent.includes('LateCancelWarningPanel'));
test('Late fee display found', frontendContent.includes('Late Cancellation Fee'));
test('Free cancellation message found', frontendContent.includes('Free Cancellation'));

// Summary
console.log('\n=== TEST SUMMARY ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}`);

if (failed === 0) {
  console.log('\n✅ ALL TESTS PASSED');
  process.exit(0);
} else {
  console.log('\n❌ SOME TESTS FAILED');
  process.exit(1);
}
