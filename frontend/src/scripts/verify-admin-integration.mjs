#!/usr/bin/env node

/**
 * Admin Dashboard Integration Verification Script
 * ==============================================
 * 
 * Verifies that all Phase 1 comprehensive sections and Universal Master Schedule
 * are properly integrated and working with backend APIs.
 * 
 * Usage: node src/scripts/verify-admin-integration.mjs
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const FRONTEND_ROOT = path.resolve(__dirname, '..');
const SECTIONS_PATH = path.join(FRONTEND_ROOT, 'components/DashBoard/Pages/admin-dashboard/sections');
const SERVICES_PATH = path.join(FRONTEND_ROOT, 'services');
const LAYOUT_PATH = path.join(FRONTEND_ROOT, 'components/DashBoard/UnifiedAdminDashboardLayout.tsx');

// Test results storage
const testResults = [];

/**
 * Add test result
 */
function addResult(test, status, message, details = null) {
  testResults.push({
    test,
    status,
    message,
    details,
    timestamp: new Date().toISOString()
  });
  
  const statusSymbol = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${statusSymbol} ${test}: ${message}`);
  
  if (details) {
    console.log(`   ${details}`);
  }
}

/**
 * Check if comprehensive sections exist
 */
async function verifyComprehensiveSections() {
  console.log('\\n🔍 Verifying Comprehensive Admin Sections...');
  
  const expectedSections = [
    'ClientsManagementSection.tsx',
    'PackagesManagementSection.tsx', 
    'ContentModerationSection.tsx',
    'NotificationsSection.tsx',
    'MCPServersSection.tsx',
    'AdminSettingsSection.tsx',
    'index.ts',
    'README.md'
  ];
  
  try {
    const sectionFiles = await fs.readdir(SECTIONS_PATH);
    
    for (const expectedFile of expectedSections) {
      if (sectionFiles.includes(expectedFile)) {
        addResult(`Section: ${expectedFile}`, 'PASS', 'File exists');
      } else {
        addResult(`Section: ${expectedFile}`, 'FAIL', 'File missing');
      }
    }
    
    // Check if index.ts exports all sections
    const indexContent = await fs.readFile(path.join(SECTIONS_PATH, 'index.ts'), 'utf-8');
    const expectedExports = [
      'ClientsManagementSection',
      'PackagesManagementSection',
      'ContentModerationSection', 
      'NotificationsSection',
      'MCPServersSection',
      'AdminSettingsSection'
    ];
    
    let allExportsFound = true;
    for (const exportName of expectedExports) {
      if (indexContent.includes(exportName)) {
        addResult(`Export: ${exportName}`, 'PASS', 'Properly exported');
      } else {
        addResult(`Export: ${exportName}`, 'FAIL', 'Missing export');
        allExportsFound = false;
      }
    }
    
    if (allExportsFound) {
      addResult('Sections Index', 'PASS', 'All sections properly exported');
    }
    
  } catch (error) {
    addResult('Comprehensive Sections', 'FAIL', `Error checking sections: ${error.message}`);
  }
}

/**
 * Check if routing is properly configured
 */
async function verifyRouting() {
  console.log('\\n🛣️ Verifying Admin Routing Integration...');
  
  try {
    const layoutContent = await fs.readFile(LAYOUT_PATH, 'utf-8');
    
    // Check for comprehensive section imports
    const expectedImports = [
      'ClientsManagementSection',
      'PackagesManagementSection',
      'ContentModerationSection',
      'NotificationsSection', 
      'MCPServersSection',
      'AdminSettingsSection'
    ];
    
    let importsFound = 0;
    for (const importName of expectedImports) {
      if (layoutContent.includes(importName)) {
        addResult(`Import: ${importName}`, 'PASS', 'Properly imported');
        importsFound++;
      } else {
        addResult(`Import: ${importName}`, 'FAIL', 'Missing import');
      }
    }
    
    // Check for route definitions
    const expectedRoutes = [
      'path="/clients"',
      'path="/packages"',
      'path="/content"',
      'path="/notifications"',
      'path="/mcp-servers"',
      'path="/settings"'
    ];
    
    let routesFound = 0;
    for (const route of expectedRoutes) {
      if (layoutContent.includes(route)) {
        addResult(`Route: ${route}`, 'PASS', 'Route configured');
        routesFound++;
      } else {
        addResult(`Route: ${route}`, 'FAIL', 'Route missing');
      }
    }
    
    // Summary
    addResult('Routing Integration', 
      importsFound === expectedImports.length && routesFound === expectedRoutes.length ? 'PASS' : 'WARN',
      `Found ${importsFound}/${expectedImports.length} imports, ${routesFound}/${expectedRoutes.length} routes`
    );
    
  } catch (error) {
    addResult('Routing Verification', 'FAIL', `Error checking routing: ${error.message}`);
  }
}

/**
 * Check if services are properly configured
 */
async function verifyServices() {
  console.log('\\n⚡ Verifying Backend Service Integration...');
  
  const expectedServices = [
    'universal-master-schedule-service.ts',
    'session-service.ts',
    'adminClientService.ts',
    'sessionService.ts'
  ];
  
  try {
    const serviceFiles = await fs.readdir(SERVICES_PATH);
    
    for (const expectedFile of expectedServices) {
      if (serviceFiles.includes(expectedFile)) {
        addResult(`Service: ${expectedFile}`, 'PASS', 'Service file exists');
        
        // Check if service has proper API integration
        const serviceContent = await fs.readFile(path.join(SERVICES_PATH, expectedFile), 'utf-8');
        
        if (serviceContent.includes('API_BASE_URL') || serviceContent.includes('axiosInstance')) {
          addResult(`API Integration: ${expectedFile}`, 'PASS', 'API integration configured');
        } else {
          addResult(`API Integration: ${expectedFile}`, 'WARN', 'API integration may be missing');
        }
        
      } else {
        addResult(`Service: ${expectedFile}`, 'FAIL', 'Service file missing');
      }
    }
    
  } catch (error) {
    addResult('Services Verification', 'FAIL', `Error checking services: ${error.message}`);
  }
}

/**
 * Check Universal Master Schedule integration
 */
async function verifyUniversalMasterSchedule() {
  console.log('\\n📅 Verifying Universal Master Schedule Integration...');
  
  const umsPath = path.join(FRONTEND_ROOT, 'components/UniversalMasterSchedule');
  
  try {
    const umsFiles = await fs.readdir(umsPath);
    
    const expectedFiles = [
      'UniversalMasterSchedule.tsx',
      'AdminScheduleIntegration.tsx',
      'types.ts',
      'index.ts'
    ];
    
    for (const expectedFile of expectedFiles) {
      if (umsFiles.includes(expectedFile)) {
        addResult(`UMS: ${expectedFile}`, 'PASS', 'Component exists');
      } else {
        addResult(`UMS: ${expectedFile}`, 'FAIL', 'Component missing');
      }
    }
    
    // Check if UniversalMasterSchedule is using real services
    const umsContent = await fs.readFile(path.join(umsPath, 'UniversalMasterSchedule.tsx'), 'utf-8');
    
    if (umsContent.includes('universal-master-schedule-service') || umsContent.includes('sessionService')) {
      addResult('UMS Service Integration', 'PASS', 'Real services are being used');
    } else {
      addResult('UMS Service Integration', 'WARN', 'May still be using mock data');
    }
    
  } catch (error) {
    addResult('Universal Master Schedule', 'FAIL', `Error checking UMS: ${error.message}`);
  }
}

/**
 * Generate summary report
 */
function generateSummaryReport() {
  console.log('\\n📊 INTEGRATION VERIFICATION SUMMARY');
  console.log('=====================================');
  
  const passCount = testResults.filter(r => r.status === 'PASS').length;
  const failCount = testResults.filter(r => r.status === 'FAIL').length;
  const warnCount = testResults.filter(r => r.status === 'WARN').length;
  const totalTests = testResults.length;
  
  console.log(`Total Tests: ${totalTests}`);
  console.log(`✅ Passed: ${passCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`⚠️ Warnings: ${warnCount}`);
  
  const successRate = Math.round((passCount / totalTests) * 100);
  console.log(`\\nSuccess Rate: ${successRate}%`);
  
  if (failCount === 0) {
    console.log('\\n🎉 All critical components are properly integrated!');
  } else {
    console.log('\\n⚠️ Some components need attention. Check the failed tests above.');
  }
  
  // Show next steps
  console.log('\\n🚀 NEXT STEPS:');
  if (failCount > 0) {
    console.log('1. Fix any failed component integrations');
    console.log('2. Verify service connections are working');
    console.log('3. Test admin dashboard functionality');
  } else {
    console.log('1. Run frontend build to verify compilation');
    console.log('2. Test admin dashboard in browser');
    console.log('3. Verify backend API connections');
  }
}

/**
 * Main verification function
 */
async function main() {
  console.log('🔧 SwanStudios Admin Dashboard Integration Verification');
  console.log('======================================================');
  
  await verifyComprehensiveSections();
  await verifyRouting();
  await verifyServices();
  await verifyUniversalMasterSchedule();
  
  generateSummaryReport();
}

// Run the verification
main().catch(error => {
  console.error('❌ Verification script failed:', error);
  process.exit(1);
});
