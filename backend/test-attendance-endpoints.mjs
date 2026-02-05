/**
 * Test Script: Phase D - Check-In/Attendance Endpoints
 * =====================================================
 * Verifies endpoint registration and patterns for attendance tracking
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== TESTING PHASE D: ATTENDANCE/CHECK-IN ENDPOINTS ===\n');

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
console.log('[TEST 1] Checking attendance endpoint registration...');
test('PATCH /:sessionId/attendance endpoint found', routesContent.includes('router.patch("/:sessionId/attendance"') || routesContent.includes("router.patch('/:sessionId/attendance'"));
test('GET /attendance-report endpoint found', routesContent.includes('router.get("/attendance-report"') || routesContent.includes("router.get('/attendance-report'"));

// Test 2: Attendance Status Validation
console.log('\n[TEST 2] Verifying attendance status handling...');
test('attendanceStatus field reference found', routesContent.includes('attendanceStatus'));
test('Present status handling found', routesContent.includes("'present'") || routesContent.includes('"present"'));
test('No-show status handling found', routesContent.includes("'no_show'") || routesContent.includes('"no_show"'));
test('Late status handling found', routesContent.includes("'late'") || routesContent.includes('"late"'));

// Test 3: Check-in Time Tracking
console.log('\n[TEST 3] Verifying check-in time tracking...');
test('checkInTime field reference found', routesContent.includes('checkInTime'));
test('checkOutTime field reference found', routesContent.includes('checkOutTime'));
test('attendanceRecordedAt field reference found', routesContent.includes('attendanceRecordedAt'));

// Test 4: Role Authorization
console.log('\n[TEST 4] Verifying role-based authorization...');
test('Trainer role check found', routesContent.includes("role === 'trainer'") || routesContent.includes('role === "trainer"'));
test('Admin role check found', routesContent.includes("role === 'admin'") || routesContent.includes('role === "admin"'));
test('markedPresentBy tracking found', routesContent.includes('markedPresentBy'));

// Test 5: No-Show Handling
console.log('\n[TEST 5] Verifying no-show handling...');
test('noShowReason field reference found', routesContent.includes('noShowReason'));

// Test 6: Real-time Broadcasting
console.log('\n[TEST 6] Verifying real-time integration...');
test('realTimeScheduleService import found', routesContent.includes('realTimeScheduleService'));
test('broadcastSessionUpdate call found', routesContent.includes('broadcastSessionUpdate'));

// Test 7: Notification Service
console.log('\n[TEST 7] Verifying notification integration...');
test('sendEmailNotification import found', routesContent.includes('sendEmailNotification'));
test('No-show notification email sent', routesContent.includes("subject: 'Missed Session Notification'") || routesContent.includes('subject: "Missed Session Notification"'));

// Test 8: Migration File
console.log('\n[TEST 8] Verifying migration file exists...');
const migrationPath = path.join(__dirname, 'migrations', '20260205000000-add-session-attendance-fields.cjs');
const migrationExists = fs.existsSync(migrationPath);
test('Migration file exists', migrationExists);

if (migrationExists) {
  const migrationContent = fs.readFileSync(migrationPath, 'utf8');
  test('Migration adds attendanceStatus column', migrationContent.includes("addColumn('sessions', 'attendanceStatus'") || migrationContent.includes('addColumn("sessions", "attendanceStatus"'));
  test('Migration adds checkInTime column', migrationContent.includes("addColumn('sessions', 'checkInTime'") || migrationContent.includes('addColumn("sessions", "checkInTime"'));
  test('Migration adds markedPresentBy column', migrationContent.includes("addColumn('sessions', 'markedPresentBy'") || migrationContent.includes('addColumn("sessions", "markedPresentBy"'));
  test('Migration has rollback support', migrationContent.includes('async down'));
}

// Test 9: Session Model Update
console.log('\n[TEST 9] Checking Session model fields...');
const modelPath = path.join(__dirname, 'models', 'Session.mjs');
const modelContent = fs.readFileSync(modelPath, 'utf8');
test('Session model has attendanceStatus field', modelContent.includes('attendanceStatus'));
test('Session model has checkInTime field', modelContent.includes('checkInTime'));
test('Session model has attendanceRecordedAt field', modelContent.includes('attendanceRecordedAt'));
test('Session model has validation for attendance values', modelContent.includes('present') && modelContent.includes('no_show') && modelContent.includes('late'));

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
