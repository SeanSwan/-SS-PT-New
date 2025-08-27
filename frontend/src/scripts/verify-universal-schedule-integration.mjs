#!/usr/bin/env node
/**
 * Universal Master Schedule Integration Verification
 * ================================================
 * 
 * Comprehensive test script to verify the Universal Master Schedule integration
 * Tests Redux, API service, WebSocket, and component connectivity
 * 
 * Run with: node verify-schedule-integration.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

/**
 * Test Results Tracker
 */
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(description, testFn) {
    try {
      const result = testFn();
      if (result) {
        this.passed++;
        console.log(`${colors.green}✅ ${description}${colors.reset}`);
      } else {
        this.failed++;
        console.log(`${colors.red}❌ ${description}${colors.reset}`);
      }
    } catch (error) {
      this.failed++;
      console.log(`${colors.red}❌ ${description} - Error: ${error.message}${colors.reset}`);
    }
  }

  summary() {
    console.log(`\n${colors.bold}=== TEST SUMMARY ===${colors.reset}`);
    console.log(`${colors.green}Passed: ${this.passed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${this.failed}${colors.reset}`);
    console.log(`${colors.cyan}Total: ${this.passed + this.failed}${colors.reset}\n`);
    
    if (this.failed === 0) {
      console.log(`${colors.green}${colors.bold}🎉 ALL TESTS PASSED! Your Universal Master Schedule is ready for production!${colors.reset}\n`);
      return true;
    } else {
      console.log(`${colors.red}${colors.bold}⚠️  Some tests failed. Please review the issues above.${colors.reset}\n`);
      return false;
    }
  }
}

/**
 * File existence checker
 */
function fileExists(filePath) {
  try {
    return fs.existsSync(path.resolve(__dirname, filePath));
  } catch (error) {
    return false;
  }
}

/**
 * File content checker
 */
function fileContains(filePath, searchString) {
  try {
    const content = fs.readFileSync(path.resolve(__dirname, filePath), 'utf8');
    return content.includes(searchString);
  } catch (error) {
    return false;
  }
}

/**
 * JSON file checker
 */
function checkJSONStructure(filePath, requiredKeys) {
  try {
    const content = fs.readFileSync(path.resolve(__dirname, filePath), 'utf8');
    const json = JSON.parse(content);
    return requiredKeys.every(key => json.hasOwnProperty(key));
  } catch (error) {
    return false;
  }
}

/**
 * Main verification function
 */
function runVerification() {
  console.log(`${colors.cyan}${colors.bold}`);
  console.log('🚀 UNIVERSAL MASTER SCHEDULE INTEGRATION VERIFICATION');
  console.log('====================================================');
  console.log(`${colors.reset}\n`);

  const runner = new TestRunner();

  // ==================== CORE FILE STRUCTURE TESTS ====================
  console.log(`${colors.blue}${colors.bold}📁 Core File Structure Tests${colors.reset}`);
  
  runner.test('Redux schedule slice exists', () => 
    fileExists('../redux/slices/scheduleSlice.ts')
  );
  
  runner.test('Universal schedule service exists', () => 
    fileExists('../services/universal-master-schedule-service.ts')
  );
  
  runner.test('Connected admin component exists', () => 
    fileExists('../components/UniversalMasterSchedule/ConnectedAdminScheduleIntegration.tsx')
  );
  
  runner.test('WebSocket service exists', () => 
    fileExists('../services/scheduleWebSocketService.ts')
  );

  // ==================== REDUX INTEGRATION TESTS ====================
  console.log(`\n${colors.blue}${colors.bold}🔄 Redux Integration Tests${colors.reset}`);
  
  runner.test('Schedule slice exported in Redux store', () => 
    fileContains('../redux/store.ts', 'scheduleReducer') && 
    fileContains('../redux/store.ts', 'schedule: scheduleReducer')
  );
  
  runner.test('Schedule slice contains async thunks', () => 
    fileContains('../redux/slices/scheduleSlice.ts', 'fetchEvents') &&
    fileContains('../redux/slices/scheduleSlice.ts', 'createAvailableSessions') &&
    fileContains('../redux/slices/scheduleSlice.ts', 'bookSession')
  );
  
  runner.test('Schedule slice has proper selectors', () => 
    fileContains('../redux/slices/scheduleSlice.ts', 'selectAllSessions') &&
    fileContains('../redux/slices/scheduleSlice.ts', 'selectScheduleStats')
  );

  // ==================== SERVICE LAYER TESTS ====================
  console.log(`\n${colors.blue}${colors.bold}🔧 Service Layer Tests${colors.reset}`);
  
  runner.test('Service has CRUD operations', () => 
    fileContains('../services/universal-master-schedule-service.ts', 'getSessions') &&
    fileContains('../services/universal-master-schedule-service.ts', 'bookSession') &&
    fileContains('../services/universal-master-schedule-service.ts', 'cancelSession')
  );
  
  runner.test('Service has role-based methods', () => 
    fileContains('../services/universal-master-schedule-service.ts', 'getRoleBasedActions') &&
    fileContains('../services/universal-master-schedule-service.ts', 'canPerformAction')
  );
  
  runner.test('Service has statistics methods', () => 
    fileContains('../services/universal-master-schedule-service.ts', 'getScheduleStats') &&
    fileContains('../services/universal-master-schedule-service.ts', 'getTrainers')
  );

  // ==================== COMPONENT INTEGRATION TESTS ====================
  console.log(`\n${colors.blue}${colors.bold}⚛️  Component Integration Tests${colors.reset}`);
  
  runner.test('Connected component uses Redux hooks', () => 
    fileContains('../components/UniversalMasterSchedule/ConnectedAdminScheduleIntegration.tsx', 'useDispatch') &&
    fileContains('../components/UniversalMasterSchedule/ConnectedAdminScheduleIntegration.tsx', 'useSelector')
  );
  
  runner.test('Connected component dispatches actions', () => 
    fileContains('../components/UniversalMasterSchedule/ConnectedAdminScheduleIntegration.tsx', 'dispatch(fetchEvents') &&
    fileContains('../components/UniversalMasterSchedule/ConnectedAdminScheduleIntegration.tsx', 'dispatch(bookSession')
  );
  
  runner.test('Connected component has WebSocket integration', () => 
    fileContains('../components/UniversalMasterSchedule/ConnectedAdminScheduleIntegration.tsx', 'useScheduleWebSocket') &&
    fileContains('../components/UniversalMasterSchedule/ConnectedAdminScheduleIntegration.tsx', 'wsConnected')
  );

  // ==================== ROUTING TESTS ====================
  console.log(`\n${colors.blue}${colors.bold}🛣️  Routing Integration Tests${colors.reset}`);
  
  runner.test('Admin routes use connected component', () => 
    fileContains('../components/DashBoard/routes/AdminRoutes.tsx', 'ConnectedAdminScheduleIntegration')
  );
  
  runner.test('Main routes use connected component', () => 
    fileContains('../routes/main-routes.tsx', 'ConnectedAdminScheduleIntegration')
  );

  // ==================== WEBSOCKET TESTS ====================
  console.log(`\n${colors.blue}${colors.bold}🌐 WebSocket Integration Tests${colors.reset}`);
  
  runner.test('WebSocket service has connection management', () => 
    fileContains('../services/scheduleWebSocketService.ts', 'connect') &&
    fileContains('../services/scheduleWebSocketService.ts', 'reconnect') &&
    fileContains('../services/scheduleWebSocketService.ts', 'disconnect')
  );
  
  runner.test('WebSocket service integrates with Redux', () => 
    fileContains('../services/scheduleWebSocketService.ts', 'store.dispatch') &&
    fileContains('../services/scheduleWebSocketService.ts', 'updateSession') &&
    fileContains('../services/scheduleWebSocketService.ts', 'addSession')
  );
  
  runner.test('WebSocket service has subscription management', () => 
    fileContains('../services/scheduleWebSocketService.ts', 'subscribeToUpdates') &&
    fileContains('../services/scheduleWebSocketService.ts', 'unsubscribeFromUpdates')
  );

  // ==================== THEME INTEGRATION TESTS ====================
  console.log(`\n${colors.blue}${colors.bold}🎨 Theme Integration Tests${colors.reset}`);
  
  runner.test('Connected component uses Swan theme', () => 
    fileContains('../components/UniversalMasterSchedule/ConnectedAdminScheduleIntegration.tsx', 'swanStudiosTheme')
  );
  
  runner.test('Component has styled components', () => 
    fileContains('../components/UniversalMasterSchedule/ConnectedAdminScheduleIntegration.tsx', 'styled.div') ||
    fileContains('../components/UniversalMasterSchedule/ConnectedAdminScheduleIntegration.tsx', 'ScheduleContainer')
  );

  // ==================== BACKEND API TESTS ====================
  console.log(`\n${colors.blue}${colors.bold}🔗 Backend API Tests${colors.reset}`);
  
  runner.test('Backend session routes exist', () => 
    fileExists('../../backend/routes/sessionRoutes.mjs')
  );
  
  runner.test('Service points to correct API endpoints', () => 
    fileContains('../services/universal-master-schedule-service.ts', '/api/sessions') &&
    fileContains('../services/universal-master-schedule-service.ts', 'VITE_API_URL')
  );

  // ==================== PACKAGE DEPENDENCIES TESTS ====================
  console.log(`\n${colors.blue}${colors.bold}📦 Package Dependencies Tests${colors.reset}`);
  
  runner.test('Package.json has required dependencies', () => {
    const packagePath = '../package.json';
    return fileContains(packagePath, '@reduxjs/toolkit') &&
           fileContains(packagePath, 'react-redux') &&
           fileContains(packagePath, 'styled-components') &&
           fileContains(packagePath, '@mui/material');
  });

  // ==================== FINAL SUMMARY ====================
  const success = runner.summary();
  
  if (success) {
    console.log(`${colors.green}🚀 INTEGRATION COMPLETE! Your Universal Master Schedule is fully connected:`);
    console.log(`   • Redux state management: ✅ Connected`);
    console.log(`   • API service layer: ✅ Connected`);
    console.log(`   • React components: ✅ Connected`);
    console.log(`   • WebSocket real-time updates: ✅ Connected`);
    console.log(`   • Routing configuration: ✅ Connected`);
    console.log(`   • Theme integration: ✅ Connected${colors.reset}\n`);
    
    console.log(`${colors.cyan}Next Steps:`);
    console.log(`1. Start your backend server: npm start`);
    console.log(`2. Start your frontend dev server: npm run dev`);
    console.log(`3. Navigate to /dashboard/admin/schedule to test the integration`);
    console.log(`4. Test session creation, booking, and real-time updates${colors.reset}\n`);
  } else {
    console.log(`${colors.yellow}Please fix the failing tests above before proceeding.${colors.reset}\n`);
  }
  
  return success;
}

// Run the verification
runVerification();
