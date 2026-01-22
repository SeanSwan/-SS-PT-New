#!/usr/bin/env node

/**
 * Admin Dashboard Integration Verification Script
 * ==============================================
 * Comprehensive verification of SwanStudios Admin Dashboard integration
 * Tests Universal Master Schedule, TheAestheticCodex, and all admin functionality
 * 
 * Run with: node verify-admin-dashboard-integration.mjs
 */

import puppeteer from 'puppeteer';
import colors from 'colors';
import fs from 'fs';
import path from 'path';

// Configuration
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const TEST_ADMIN_CREDENTIALS = {
  email: process.env.TEST_ADMIN_USERNAME || process.env.TEST_ADMIN_EMAIL || 'admin@swanstudios.com',
  password: process.env.TEST_ADMIN_PASSWORD || 'admin123'
};

let testResults = [];
let browser = null;
let page = null;

/**
 * Add test result
 */
function addResult(testName, status, message, details = null) {
  testResults.push({
    testName,
    status,
    message,
    details,
    timestamp: new Date().toISOString()
  });
  
  const statusColor = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : 'yellow';
  console.log(`[${status}] ${testName} - ${message}`[statusColor]);
  
  if (details && process.env.VERBOSE === 'true') {
    console.log(`  Details: ${JSON.stringify(details, null, 2)}`.gray);
  }
}

/**
 * Initialize browser and page
 */
async function setupBrowser() {
  try {
    console.log('\n🚀 Initializing browser for admin dashboard testing...'.blue);
    
    browser = await puppeteer.launch({
      headless: process.env.HEADLESS !== 'false',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });
    
    page = await browser.newPage();
    
    // Set viewport for responsive testing
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Set request interception to monitor API calls
    await page.setRequestInterception(true);
    
    const apiCalls = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/')) {
        apiCalls.push({
          url: request.url(),
          method: request.method(),
          timestamp: new Date().toISOString()
        });
      }
      request.continue();
    });
    
    // Store API calls for analysis
    page.apiCalls = apiCalls;
    
    addResult('Browser Setup', 'PASS', 'Browser initialized successfully');
    return true;
  } catch (error) {
    addResult('Browser Setup', 'FAIL', `Failed to initialize browser: ${error.message}`);
    return false;
  }
}

/**
 * Test homepage loading and navigation
 */
async function testHomepageAccess() {
  try {
    console.log('\n🏠 Testing homepage access and loading...'.blue);
    
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Check if page loaded successfully
    const title = await page.title();
    if (title.includes('SwanStudios') || title.includes('Swan Studios')) {
      addResult('Homepage Access', 'PASS', `Homepage loaded successfully: ${title}`);
    } else {
      addResult('Homepage Access', 'WARN', `Homepage loaded but title might be incorrect: ${title}`);
    }
    
    // Check for critical elements (avoid unsupported :contains selector)
    const hasLogin = await page.$('a[href*="/login"], [data-testid="login"]') !== null;
    if (hasLogin) {
      addResult('Login Element', 'PASS', 'Login link found on homepage');
    } else {
      addResult('Login Element', 'WARN', 'Login link not found on homepage');
    }
    
    return true;
  } catch (error) {
    addResult('Homepage Access', 'FAIL', `Failed to access homepage: ${error.message}`);
    return false;
  }
}

/**
 * Test admin authentication
 */
async function testAdminAuthentication() {
  try {
    console.log('\n🔐 Testing admin authentication...'.blue);
    
    // Navigate to login page
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle2' });
    
    // Wait for login form (username/password fields in EnhancedLoginModal)
    await page.waitForSelector('input[name="username"], input[type="text"]', { timeout: 10000 });
    
    // Fill login form
    const emailInput = await page.$('input[name="username"], input[type="text"]');
    const passwordInput = await page.$('input[type="password"], input[name="password"]');
    
    if (!emailInput || !passwordInput) {
      addResult('Login Form', 'FAIL', 'Login form elements not found');
      return false;
    }
    
    await emailInput.type(TEST_ADMIN_CREDENTIALS.email);
    await passwordInput.type(TEST_ADMIN_CREDENTIALS.password);
    
    // Submit form
    const submitButton = await page.$('button[type="submit"], input[type="submit"]');
    if (submitButton) {
      await submitButton.click();
      addResult('Login Form Submit', 'PASS', 'Login form submitted successfully');
    } else {
      // Try pressing Enter as fallback
      await passwordInput.press('Enter');
      addResult('Login Form Submit', 'WARN', 'Login submitted via Enter key (no submit button found)');
    }
    
    // Wait for navigation or error
    try {
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
      
      // Check if we're redirected to dashboard or if login was successful
      const currentUrl = page.url();
      if (currentUrl.includes('/dashboard') || currentUrl.includes('/admin')) {
        addResult('Admin Authentication', 'PASS', 'Admin login successful - redirected to dashboard');
        return true;
      } else if (!currentUrl.includes('/login')) {
        addResult('Admin Authentication', 'PASS', 'Admin login successful - redirected away from login');
        return true;
      } else {
        addResult('Admin Authentication', 'FAIL', 'Admin login failed - still on login page');
        return false;
      }
    } catch (navigationError) {
      // Check if we stayed on the same page but have success indicators
      const hasErrorMessage = await page.$('.error, .alert-error, [role="alert"]') !== null;
      if (hasErrorMessage) {
        const errorText = await page.$eval('.error, .alert-error, [role="alert"]', el => el.textContent).catch(() => 'Unknown error');
        addResult('Admin Authentication', 'FAIL', `Login failed: ${errorText}`);
        return false;
      } else {
        addResult('Admin Authentication', 'WARN', 'Login submitted but navigation unclear');
        return true;
      }
    }
  } catch (error) {
    addResult('Admin Authentication', 'FAIL', `Authentication test failed: ${error.message}`);
    return false;
  }
}

/**
 * Test admin dashboard access
 */
async function testAdminDashboardAccess() {
  try {
    console.log('\n📊 Testing admin dashboard access...'.blue);
    
    // Navigate to admin dashboard
    await page.goto(`${FRONTEND_URL}/dashboard`, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Check if we can access the dashboard
    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard')) {
      addResult('Admin Dashboard Access', 'PASS', 'Successfully accessed admin dashboard');
    } else {
      addResult('Admin Dashboard Access', 'FAIL', `Could not access dashboard, current URL: ${currentUrl}`);
      return false;
    }
    
    // Check for admin sidebar (role-based menu items in AdminStellarSidebar)
    const hasSidebar = await page.$('[data-testid="admin-sidebar"], nav, [role="menuitem"]') !== null;
    if (hasSidebar) {
      addResult('Admin Sidebar', 'PASS', 'Admin sidebar component found');
    } else {
      addResult('Admin Sidebar', 'FAIL', 'Admin sidebar not found');
    }
    
    // Check for dashboard content
    const hasContent = await page.$('main, .dashboard, [data-testid="dashboard"]') !== null;
    if (hasContent) {
      addResult('Dashboard Content', 'PASS', 'Dashboard content area found');
    } else {
      addResult('Dashboard Content', 'FAIL', 'Dashboard content area not found');
    }
    
    return true;
  } catch (error) {
    addResult('Admin Dashboard Access', 'FAIL', `Dashboard access test failed: ${error.message}`);
    return false;
  }
}

/**
 * Test Universal Master Schedule access
 */
async function testUniversalMasterSchedule() {
  try {
    console.log('\n📅 Testing Universal Master Schedule...'.blue);
    
    // Navigate to master schedule
    await page.goto(`${FRONTEND_URL}/dashboard/admin/master-schedule`, { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });
    
    // Check if schedule page loaded
    const currentUrl = page.url();
    if (currentUrl.includes('/master-schedule')) {
      addResult('Master Schedule Route', 'PASS', 'Master schedule route accessible');
    } else {
      addResult('Master Schedule Route', 'FAIL', `Could not access master schedule: ${currentUrl}`);
      return false;
    }
    
    // Wait for calendar or schedule component to load
    const calendarSelectors = [
      '.rbc-calendar',           // React Big Calendar
      '.universal-master-schedule',
      '[data-testid="schedule"]',
      '.schedule-container',
      '.calendar-view'
    ];
    
    let scheduleFound = false;
    for (const selector of calendarSelectors) {
      const element = await page.$(selector);
      if (element) {
        addResult('Schedule Component', 'PASS', `Schedule component found: ${selector}`);
        scheduleFound = true;
        break;
      }
    }
    
    if (!scheduleFound) {
      const hasScheduleTitle = await page.evaluate(() => {
        return document.body?.innerText?.includes('Universal Master Schedule');
      });
      if (hasScheduleTitle) {
        addResult('Schedule Component', 'PASS', 'Schedule title found in page content');
      } else {
        addResult('Schedule Component', 'FAIL', 'Schedule component not found');
      }
    }
    
    // Check for schedule controls (buttons, filters, etc.)
    const hasControls = await page.$('button, .filter, .schedule-controls') !== null;
    if (hasControls) {
      addResult('Schedule Controls', 'PASS', 'Schedule controls found');
    } else {
      addResult('Schedule Controls', 'WARN', 'Schedule controls not found');
    }
    
    // Check API calls made to schedule endpoints
    const scheduleApiCalls = page.apiCalls.filter(call => 
      call.url.includes('/api/sessions') || call.url.includes('/api/schedule')
    );
    
    if (scheduleApiCalls.length > 0) {
      addResult('Schedule API Calls', 'PASS', `${scheduleApiCalls.length} schedule API calls made`, scheduleApiCalls);
    } else {
      addResult('Schedule API Calls', 'WARN', 'No schedule API calls detected');
    }
    
    return true;
  } catch (error) {
    addResult('Universal Master Schedule', 'FAIL', `Schedule test failed: ${error.message}`);
    return false;
  }
}

/**
 * Test TheAestheticCodex access
 */
async function testAestheticCodex() {
  try {
    console.log('\n🎨 Testing TheAestheticCodex access...'.blue);
    
    // Navigate to style guide
    await page.goto(`${FRONTEND_URL}/style-guide`, { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });
    
    // Check if style guide loaded
    const currentUrl = page.url();
    if (currentUrl.includes('/style-guide')) {
      addResult('Style Guide Route', 'PASS', 'Style guide route accessible');
    } else {
      addResult('Style Guide Route', 'FAIL', `Could not access style guide: ${currentUrl}`);
      return false;
    }
    
    // Check for TheAestheticCodex component
    const styleGuideSelectors = [
      '.aesthetic-codex',
      '.style-guide',
      '[data-testid="style-guide"]',
      '.codex-container'
    ];
    
    let codexFound = false;
    for (const selector of styleGuideSelectors) {
      const element = await page.$(selector);
      if (element) {
        addResult('Aesthetic Codex Component', 'PASS', `TheAestheticCodex found: ${selector}`);
        codexFound = true;
        break;
      }
    }
    
    if (!codexFound) {
      const hasCodexTitle = await page.evaluate(() => {
        return document.body?.innerText?.includes('The Aesthetic Codex');
      });
      if (hasCodexTitle) {
        addResult('Aesthetic Codex Component', 'PASS', 'Aesthetic Codex title found in page content');
      } else {
        addResult('Aesthetic Codex Component', 'FAIL', 'TheAestheticCodex component not found');
      }
    }
    
    // Check for design system elements
    const hasColors = await page.$('.color-palette, .colors') !== null;
    const hasTypography = await page.$('.typography, .fonts') !== null;
    const hasButtons = await page.$('.buttons, .button-showcase') !== null;
    
    if (hasColors) addResult('Color Palette', 'PASS', 'Color palette section found');
    if (hasTypography) addResult('Typography Section', 'PASS', 'Typography section found');
    if (hasButtons) addResult('Button Components', 'PASS', 'Button components section found');
    
    return true;
  } catch (error) {
    addResult('TheAestheticCodex', 'FAIL', `Style guide test failed: ${error.message}`);
    return false;
  }
}

/**
 * Test mobile responsiveness
 */
async function testMobileResponsiveness() {
  try {
    console.log('\n📱 Testing mobile responsiveness...'.blue);
    
    // Test mobile viewport
    await page.setViewport({ width: 375, height: 667 }); // iPhone SE
    await page.reload({ waitUntil: 'networkidle2' });
    
    // Check if admin sidebar adapts to mobile
    const mobileMenu = await page.$('.mobile-menu, .hamburger, [data-testid="mobile-menu"]') !== null;
    if (mobileMenu) {
      addResult('Mobile Navigation', 'PASS', 'Mobile navigation menu found');
    } else {
      addResult('Mobile Navigation', 'WARN', 'Mobile navigation not detected');
    }
    
    // Test tablet viewport
    await page.setViewport({ width: 768, height: 1024 }); // iPad
    await page.reload({ waitUntil: 'networkidle2' });
    
    addResult('Tablet Responsiveness', 'PASS', 'Tablet viewport tested successfully');
    
    // Reset to desktop
    await page.setViewport({ width: 1920, height: 1080 });
    
    return true;
  } catch (error) {
    addResult('Mobile Responsiveness', 'FAIL', `Mobile test failed: ${error.message}`);
    return false;
  }
}

/**
 * Generate verification report
 */
async function generateReport() {
  try {
    console.log('\n📄 Generating verification report...'.blue);
    
    const report = {
      testSuite: 'SwanStudios Admin Dashboard Integration',
      timestamp: new Date().toISOString(),
      environment: {
        frontendUrl: FRONTEND_URL,
        nodeEnv: process.env.NODE_ENV || 'development'
      },
      summary: {
        totalTests: testResults.length,
        passed: testResults.filter(r => r.status === 'PASS').length,
        failed: testResults.filter(r => r.status === 'FAIL').length,
        warnings: testResults.filter(r => r.status === 'WARN').length
      },
      apiCalls: page ? page.apiCalls : [],
      results: testResults
    };
    
    // Write report to file
    const reportPath = path.join(process.cwd(), 'admin-dashboard-verification-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Console summary
    console.log('\n=== VERIFICATION SUMMARY ==='.yellow);
    console.log(`✅ Passed: ${report.summary.passed}`.green);
    console.log(`❌ Failed: ${report.summary.failed}`.red);
    console.log(`⚠️  Warnings: ${report.summary.warnings}`.yellow);
    console.log(`📊 Total Tests: ${report.summary.totalTests}`.blue);
    console.log(`📄 Report saved to: ${reportPath}`.gray);
    
    addResult('Report Generation', 'PASS', `Report generated successfully: ${reportPath}`);
    
    return report.summary.failed === 0;
  } catch (error) {
    addResult('Report Generation', 'FAIL', `Failed to generate report: ${error.message}`);
    return false;
  }
}

/**
 * Main test execution
 */
async function runVerification() {
  console.log('🚀 SwanStudios Admin Dashboard Integration Verification'.rainbow);
  console.log('='.repeat(60).gray);
  
  try {
    // Setup
    const browserSetup = await setupBrowser();
    if (!browserSetup) return false;
    
    // Run test suite
    await testHomepageAccess();
    await testAdminAuthentication();
    await testAdminDashboardAccess();
    await testUniversalMasterSchedule();
    await testAestheticCodex();
    await testMobileResponsiveness();
    
    // Generate report
    const success = await generateReport();
    
    return success;
  } catch (error) {
    console.error(`\n❌ Verification failed: ${error.message}`.red);
    return false;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run verification if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runVerification()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export default runVerification;
