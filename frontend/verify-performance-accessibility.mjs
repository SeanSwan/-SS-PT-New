#!/usr/bin/env node

/**
 * Performance & Accessibility Verification Script
 * ==============================================
 * Tests load times, responsiveness, accessibility compliance,
 * and overall performance of the SwanStudios platform
 * 
 * Run with: node verify-performance-accessibility.mjs
 */

import puppeteer from 'puppeteer';
import lighthouse from 'lighthouse';
import colors from 'colors';
import fs from 'fs';
import path from 'path';

// Configuration
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const CHROME_FLAGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-accelerated-2d-canvas',
  '--no-first-run',
  '--no-zygote',
  '--single-process',
  '--disable-gpu'
];

// Test pages to analyze
const TEST_PAGES = [
  { name: 'Homepage', url: '/', requiresAuth: false },
  { name: 'Login Page', url: '/login', requiresAuth: false },
  { name: 'Store Page', url: '/store', requiresAuth: false },
  { name: 'Admin Dashboard', url: '/dashboard', requiresAuth: true },
  { name: 'Universal Master Schedule', url: '/dashboard/admin/master-schedule', requiresAuth: true },
  { name: 'Style Guide', url: '/style-guide', requiresAuth: true }
];

// Device presets for responsive testing
const DEVICES = [
  { name: 'Desktop', width: 1920, height: 1080 },
  { name: 'Laptop', width: 1366, height: 768 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Mobile Large', width: 414, height: 896 },
  { name: 'Mobile Medium', width: 375, height: 667 },
  { name: 'Mobile Small', width: 320, height: 568 }
];

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
  
  const statusColor = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : status === 'WARN' ? 'yellow' : 'cyan';
  console.log(`[${status}] ${testName} - ${message}`[statusColor]);
  
  if (details && process.env.VERBOSE === 'true') {
    console.log(`  Details: ${JSON.stringify(details, null, 2)}`.gray);
  }
}

/**
 * Initialize browser
 */
async function setupBrowser() {
  try {
    console.log('\n🚀 Initializing browser for performance testing...'.blue);
    
    browser = await puppeteer.launch({
      headless: process.env.HEADLESS !== 'false',
      args: CHROME_FLAGS
    });
    
    page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Enable request interception for performance monitoring
    await page.setRequestInterception(true);
    
    const requests = [];
    const responses = [];
    
    page.on('request', (request) => {
      requests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
        timestamp: Date.now()
      });
      request.continue();
    });
    
    page.on('response', (response) => {
      responses.push({
        url: response.url(),
        status: response.status(),
        size: response.headers()['content-length'] || 0,
        timestamp: Date.now()
      });
    });
    
    // Store for analysis
    page.requests = requests;
    page.responses = responses;
    
    addResult('Browser Setup', 'PASS', 'Browser initialized with performance monitoring');
    return true;
  } catch (error) {
    addResult('Browser Setup', 'FAIL', `Failed to initialize browser: ${error.message}`);
    return false;
  }
}

/**
 * Test page load performance
 */
async function testPageLoadPerformance() {
  console.log('\n⚡ Testing page load performance...'.blue);
  
  for (const testPage of TEST_PAGES) {
    if (testPage.requiresAuth) {
      // Skip auth-required pages for now in performance testing
      addResult(`Load Time - ${testPage.name}`, 'SKIP', 'Requires authentication (skipped for performance test)');
      continue;
    }
    
    try {
      // Clear previous data
      page.requests.length = 0;
      page.responses.length = 0;
      
      const startTime = Date.now();
      
      await page.goto(`${FRONTEND_URL}${testPage.url}`, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      const loadTime = Date.now() - startTime;
      
      // Analyze performance
      const totalRequests = page.requests.length;
      const failedRequests = page.responses.filter(r => r.status >= 400).length;
      
      // Performance thresholds
      if (loadTime < 2000) {
        addResult(`Load Time - ${testPage.name}`, 'PASS', `Excellent load time: ${loadTime}ms`);
      } else if (loadTime < 4000) {
        addResult(`Load Time - ${testPage.name}`, 'PASS', `Good load time: ${loadTime}ms`);
      } else if (loadTime < 6000) {
        addResult(`Load Time - ${testPage.name}`, 'WARN', `Slow load time: ${loadTime}ms`);
      } else {
        addResult(`Load Time - ${testPage.name}`, 'FAIL', `Very slow load time: ${loadTime}ms`);
      }
      
      // Request analysis
      addResult(`Requests - ${testPage.name}`, 'INFO', `${totalRequests} requests, ${failedRequests} failed`, {
        totalRequests,
        failedRequests,
        loadTime
      });
      
    } catch (error) {
      addResult(`Load Time - ${testPage.name}`, 'FAIL', `Load test failed: ${error.message}`);
    }
  }
}

/**
 * Test responsive design across devices
 */
async function testResponsiveDesign() {
  console.log('\n📱 Testing responsive design...'.blue);
  
  const testUrl = `${FRONTEND_URL}/`;
  
  for (const device of DEVICES) {
    try {
      await page.setViewport({
        width: device.width,
        height: device.height
      });
      
      await page.goto(testUrl, { waitUntil: 'networkidle2' });
      
      // Check for responsive elements
      const hasContent = await page.$('body *') !== null;
      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      
      // Check for mobile menu on smaller devices
      let hasMobileMenu = false;
      if (device.width <= 768) {
        hasMobileMenu = await page.$('.mobile-menu, .hamburger, [data-testid="mobile-menu"]') !== null;
      }
      
      if (hasContent && !hasOverflow) {
        addResult(`Responsive - ${device.name}`, 'PASS', `${device.width}x${device.height} renders correctly`);
      } else if (hasContent) {
        addResult(`Responsive - ${device.name}`, 'WARN', `${device.width}x${device.height} has horizontal overflow`);
      } else {
        addResult(`Responsive - ${device.name}`, 'FAIL', `${device.width}x${device.height} failed to render`);
      }
      
      // Mobile-specific tests
      if (device.width <= 768 && !hasMobileMenu) {
        addResult(`Mobile Menu - ${device.name}`, 'WARN', 'Mobile navigation not detected');
      } else if (device.width <= 768) {
        addResult(`Mobile Menu - ${device.name}`, 'PASS', 'Mobile navigation found');
      }
      
    } catch (error) {
      addResult(`Responsive - ${device.name}`, 'FAIL', `Responsive test failed: ${error.message}`);
    }
  }
  
  // Reset to desktop
  await page.setViewport({ width: 1920, height: 1080 });
}

/**
 * Test accessibility compliance
 */
async function testAccessibility() {
  console.log('\n♿ Testing accessibility compliance...'.blue);
  
  const testUrl = `${FRONTEND_URL}/`;
  
  try {
    await page.goto(testUrl, { waitUntil: 'networkidle2' });
    
    // Check for semantic HTML elements
    const hasMain = await page.$('main') !== null;
    const hasNav = await page.$('nav') !== null;
    const hasHeader = await page.$('header') !== null;
    const hasFooter = await page.$('footer') !== null;
    
    if (hasMain) addResult('Semantic HTML - Main', 'PASS', 'Main element found');
    else addResult('Semantic HTML - Main', 'FAIL', 'Main element missing');
    
    if (hasNav) addResult('Semantic HTML - Nav', 'PASS', 'Nav element found');
    else addResult('Semantic HTML - Nav', 'WARN', 'Nav element missing');
    
    if (hasHeader) addResult('Semantic HTML - Header', 'PASS', 'Header element found');
    else addResult('Semantic HTML - Header', 'WARN', 'Header element missing');
    
    // Check for alt attributes on images
    const images = await page.$$('img');
    let imagesWithAlt = 0;
    
    for (const img of images) {
      const alt = await img.evaluate((el) => el.getAttribute('alt'));
      if (alt !== null) imagesWithAlt++;
    }
    
    if (images.length === 0) {
      addResult('Image Alt Text', 'INFO', 'No images found to test');
    } else if (imagesWithAlt === images.length) {
      addResult('Image Alt Text', 'PASS', `All ${images.length} images have alt text`);
    } else {
      addResult('Image Alt Text', 'FAIL', `${images.length - imagesWithAlt} of ${images.length} images missing alt text`);
    }
    
    // Check for form labels
    const inputs = await page.$$('input:not([type="hidden"])');
    let inputsWithLabels = 0;
    
    for (const input of inputs) {
      const id = await input.evaluate((el) => el.getAttribute('id'));
      const ariaLabel = await input.evaluate((el) => el.getAttribute('aria-label'));
      const ariaLabelledBy = await input.evaluate((el) => el.getAttribute('aria-labelledby'));
      
      if (id) {
        const label = await page.$(`label[for="${id}"]`);
        if (label || ariaLabel || ariaLabelledBy) inputsWithLabels++;
      } else if (ariaLabel || ariaLabelledBy) {
        inputsWithLabels++;
      }
    }
    
    if (inputs.length === 0) {
      addResult('Form Labels', 'INFO', 'No form inputs found to test');
    } else if (inputsWithLabels === inputs.length) {
      addResult('Form Labels', 'PASS', `All ${inputs.length} inputs have labels`);
    } else {
      addResult('Form Labels', 'FAIL', `${inputs.length - inputsWithLabels} of ${inputs.length} inputs missing labels`);
    }
    
    // Check for heading hierarchy
    const headings = await page.$$('h1, h2, h3, h4, h5, h6');
    const headingLevels = [];
    
    for (const heading of headings) {
      const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
      headingLevels.push(parseInt(tagName.charAt(1)));
    }
    
    let validHierarchy = true;
    for (let i = 1; i < headingLevels.length; i++) {
      if (headingLevels[i] - headingLevels[i-1] > 1) {
        validHierarchy = false;
        break;
      }
    }
    
    if (headingLevels.length === 0) {
      addResult('Heading Hierarchy', 'WARN', 'No headings found');
    } else if (validHierarchy) {
      addResult('Heading Hierarchy', 'PASS', `Proper heading hierarchy (${headingLevels.length} headings)`);
    } else {
      addResult('Heading Hierarchy', 'FAIL', 'Invalid heading hierarchy detected');
    }
    
    // Check for skip links
    const skipLink = await page.$('a[href="#main"], a[href="#content"], .skip-link');
    if (skipLink) {
      addResult('Skip Links', 'PASS', 'Skip link found');
    } else {
      addResult('Skip Links', 'WARN', 'Skip link not found');
    }
    
  } catch (error) {
    addResult('Accessibility Test', 'FAIL', `Accessibility test failed: ${error.message}`);
  }
}

/**
 * Test SwanStudios-specific functionality
 */
async function testSwanStudiosFeatures() {
  console.log('\n🌟 Testing SwanStudios-specific features...'.blue);
  
  try {
    const testUrl = `${FRONTEND_URL}/`;
    await page.goto(testUrl, { waitUntil: 'networkidle2' });
    
    // Check for SwanStudios branding
    const title = await page.title();
    if (title.toLowerCase().includes('swan')) {
      addResult('SwanStudios Branding', 'PASS', `Correct branding in title: ${title}`);
    } else {
      addResult('SwanStudios Branding', 'WARN', `Title may need branding update: ${title}`);
    }
    
    // Check for theme integration
    const hasThemeProvider = await page.evaluate(() => {
      return window.getComputedStyle && 
             window.getComputedStyle(document.body).getPropertyValue('--swan-primary') !== '';
    });
    
    if (hasThemeProvider) {
      addResult('Theme Integration', 'PASS', 'SwanStudios theme variables detected');
    } else {
      addResult('Theme Integration', 'INFO', 'Theme variables not detected (may use different approach)');
    }
    
    // Check for Galaxy/Swan theme elements
    const hasGalaxyTheme = await page.$('.galaxy, .stellar, .cosmic, .swan') !== null;
    if (hasGalaxyTheme) {
      addResult('Galaxy Theme Elements', 'PASS', 'Galaxy/Swan theme elements found');
    } else {
      addResult('Galaxy Theme Elements', 'INFO', 'Galaxy theme elements not detected');
    }
    
    // Test store functionality
    try {
      await page.goto(`${FRONTEND_URL}/store`, { waitUntil: 'networkidle2' });
      const hasProducts = await page.$('.product, .item, [data-testid="product"]') !== null;
      
      if (hasProducts) {
        addResult('Store Functionality', 'PASS', 'Store page loads with products');
      } else {
        addResult('Store Functionality', 'WARN', 'Store page loads but no products detected');
      }
    } catch (error) {
      addResult('Store Functionality', 'FAIL', `Store test failed: ${error.message}`);
    }
    
  } catch (error) {
    addResult('SwanStudios Features', 'FAIL', `Feature test failed: ${error.message}`);
  }
}

/**
 * Run Lighthouse performance audit
 */
async function runLighthouseAudit() {
  console.log('\n🏠 Running Lighthouse performance audit...'.blue);
  
  try {
    if (process.env.SKIP_LIGHTHOUSE === 'true') {
      addResult('Lighthouse Audit', 'WARN', 'Lighthouse audit skipped (SKIP_LIGHTHOUSE=true)');
      return;
    }

    // Use the browser's WebSocket endpoint
    const browserWSEndpoint = browser.wsEndpoint();
    
    const lighthouseResults = await lighthouse(FRONTEND_URL, {
      port: (new URL(browserWSEndpoint)).port,
      output: 'json',
      logLevel: 'info',
      onlyCategories: ['performance', 'accessibility', 'best-practices']
    });
    
    const report = typeof lighthouseResults.report === 'string'
      ? JSON.parse(lighthouseResults.report)
      : lighthouseResults.report;
    const scores = report?.categories;
    if (!scores) {
      addResult('Lighthouse Audit', 'WARN', 'Lighthouse report missing categories');
      return;
    }
    
    // Performance score
    const performanceScore = Math.round(scores.performance.score * 100);
    if (performanceScore >= 90) {
      addResult('Lighthouse Performance', 'PASS', `Excellent performance: ${performanceScore}/100`);
    } else if (performanceScore >= 70) {
      addResult('Lighthouse Performance', 'PASS', `Good performance: ${performanceScore}/100`);
    } else if (performanceScore >= 50) {
      addResult('Lighthouse Performance', 'WARN', `Needs improvement: ${performanceScore}/100`);
    } else {
      addResult('Lighthouse Performance', 'FAIL', `Poor performance: ${performanceScore}/100`);
    }
    
    // Accessibility score
    const accessibilityScore = Math.round(scores.accessibility.score * 100);
    if (accessibilityScore >= 95) {
      addResult('Lighthouse Accessibility', 'PASS', `Excellent accessibility: ${accessibilityScore}/100`);
    } else if (accessibilityScore >= 80) {
      addResult('Lighthouse Accessibility', 'PASS', `Good accessibility: ${accessibilityScore}/100`);
    } else {
      addResult('Lighthouse Accessibility', 'FAIL', `Poor accessibility: ${accessibilityScore}/100`);
    }
    
    // Best practices score
    const bestPracticesScore = Math.round(scores['best-practices'].score * 100);
    if (bestPracticesScore >= 90) {
      addResult('Lighthouse Best Practices', 'PASS', `Excellent practices: ${bestPracticesScore}/100`);
    } else if (bestPracticesScore >= 70) {
      addResult('Lighthouse Best Practices', 'PASS', `Good practices: ${bestPracticesScore}/100`);
    } else {
      addResult('Lighthouse Best Practices', 'WARN', `Needs improvement: ${bestPracticesScore}/100`);
    }
    
  } catch (error) {
    const message = error?.message || 'Unknown error';
    if (message.includes('NO_FCP') || message.includes('did not paint')) {
      addResult('Lighthouse Audit', 'WARN', `Lighthouse audit skipped: ${message}`);
    } else {
      addResult('Lighthouse Audit', 'FAIL', `Lighthouse audit failed: ${message}`);
    }
  }
}

/**
 * Test console errors and warnings
 */
async function testConsoleErrors() {
  console.log('\n🐛 Testing for console errors...'.blue);
  
  const consoleMessages = [];
  
  page.on('console', (message) => {
    consoleMessages.push({
      type: message.type(),
      text: message.text(),
      location: message.location()
    });
  });
  
  try {
    // Visit main pages and collect console messages
    const pagesToTest = ['/', '/store', '/login'];
    
    for (const pageUrl of pagesToTest) {
      consoleMessages.length = 0; // Clear previous messages
      
      await page.goto(`${FRONTEND_URL}${pageUrl}`, { waitUntil: 'networkidle2' });
      
      // Wait a bit for any delayed errors
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      const errors = consoleMessages.filter(m => m.type === 'error');
      const warnings = consoleMessages.filter(m => m.type === 'warning');
      
      if (errors.length === 0) {
        addResult(`Console Errors - ${pageUrl}`, 'PASS', 'No console errors');
      } else {
        addResult(`Console Errors - ${pageUrl}`, 'FAIL', `${errors.length} console errors found`, errors);
      }
      
      if (warnings.length === 0) {
        addResult(`Console Warnings - ${pageUrl}`, 'PASS', 'No console warnings');
      } else if (warnings.length <= 3) {
        addResult(`Console Warnings - ${pageUrl}`, 'WARN', `${warnings.length} console warnings`, warnings);
      } else {
        addResult(`Console Warnings - ${pageUrl}`, 'FAIL', `${warnings.length} console warnings (too many)`, warnings);
      }
    }
    
  } catch (error) {
    addResult('Console Error Test', 'FAIL', `Console test failed: ${error.message}`);
  }
}

/**
 * Generate comprehensive report
 */
async function generateReport() {
  console.log('\n📄 Generating performance & accessibility report...'.blue);
  
  const report = {
    testSuite: 'SwanStudios Performance & Accessibility',
    timestamp: new Date().toISOString(),
    environment: {
      frontendUrl: FRONTEND_URL,
      nodeEnv: process.env.NODE_ENV || 'development',
      userAgent: await page.evaluate(() => navigator.userAgent)
    },
    testConfiguration: {
      devices: DEVICES.map(d => `${d.name} (${d.width}x${d.height})`),
      testPages: TEST_PAGES.map(p => `${p.name} (${p.url})`)
    },
    summary: {
      totalTests: testResults.length,
      passed: testResults.filter(r => r.status === 'PASS').length,
      failed: testResults.filter(r => r.status === 'FAIL').length,
      warnings: testResults.filter(r => r.status === 'WARN').length,
      skipped: testResults.filter(r => r.status === 'SKIP').length,
      info: testResults.filter(r => r.status === 'INFO').length
    },
    categories: {
      performance: testResults.filter(r => r.testName.includes('Load Time') || r.testName.includes('Performance')),
      responsive: testResults.filter(r => r.testName.includes('Responsive') || r.testName.includes('Mobile')),
      accessibility: testResults.filter(r => r.testName.includes('Accessibility') || r.testName.includes('Semantic') || r.testName.includes('Alt') || r.testName.includes('Labels')),
      lighthouse: testResults.filter(r => r.testName.includes('Lighthouse')),
      swanStudios: testResults.filter(r => r.testName.includes('SwanStudios') || r.testName.includes('Theme') || r.testName.includes('Store'))
    },
    results: testResults
  };
  
  // Write report to file
  const reportPath = path.join(process.cwd(), 'performance-accessibility-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // Console summary
  console.log('\n=== PERFORMANCE & ACCESSIBILITY SUMMARY ==='.yellow);
  console.log(`✅ Passed: ${report.summary.passed}`.green);
  console.log(`❌ Failed: ${report.summary.failed}`.red);
  console.log(`⚠️  Warnings: ${report.summary.warnings}`.yellow);
  console.log(`⏭️  Skipped: ${report.summary.skipped}`.blue);
  console.log(`ℹ️  Info: ${report.summary.info}`.cyan);
  console.log(`📊 Total Tests: ${report.summary.totalTests}`.blue);
  console.log(`📄 Report saved to: ${reportPath}`.gray);
  
  // Category breakdown
  console.log('\n--- Category Breakdown ---'.cyan);
  Object.entries(report.categories).forEach(([category, tests]) => {
    const passed = tests.filter(t => t.status === 'PASS').length;
    const total = tests.length;
    console.log(`${category}: ${passed}/${total} passed`.gray);
  });
  
  return report.summary.failed === 0;
}

/**
 * Main test execution
 */
async function runVerification() {
  console.log('🚀 SwanStudios Performance & Accessibility Verification'.rainbow);
  console.log('='.repeat(70).gray);
  
  try {
    // Setup
    const browserSetup = await setupBrowser();
    if (!browserSetup) return false;
    
    // Run test suite
    await testPageLoadPerformance();
    await testResponsiveDesign();
    await testAccessibility();
    await testSwanStudiosFeatures();
    await testConsoleErrors();
    
    // Run Lighthouse audit if available
    try {
      await runLighthouseAudit();
    } catch (error) {
      addResult('Lighthouse Setup', 'WARN', 'Lighthouse unavailable, skipping audit');
    }
    
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
