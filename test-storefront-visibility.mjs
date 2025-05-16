#!/usr/bin/env node

// Simple script to test if packages are visible in the frontend

import puppeteer from 'puppeteer';
import path from 'path';

async function testStorefrontVisibility() {
  const browser = await puppeteer.launch({ 
    headless: false, // Set to true for headless testing
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Enable console logging from the page
    page.on('console', msg => {
      console.log('PAGE LOG:', msg.text());
    });
    
    // Enable error logging
    page.on('pageerror', error => {
      console.log('PAGE ERROR:', error.message);
    });
    
    console.log('🚀 Opening storefront page...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
    
    // Wait for the page to load
    await page.waitForTimeout(3000);
    
    // Check if we can navigate to storefront
    try {
      await page.click('a[href*="storefront"], a[href*="shop"], button:contains("View Packages")');
      await page.waitForTimeout(2000);
    } catch (e) {
      console.log('Could not find storefront link, trying direct navigation...');
      await page.goto('http://localhost:5173/storefront', { waitUntil: 'networkidle0' });
    }
    
    // Wait for packages to load
    console.log('⏳ Waiting for packages to load...');
    await page.waitForTimeout(5000);
    
    // Check for package cards
    const packageCards = await page.$$eval('[class*="CardContainer"]', cards => {
      return cards.map(card => ({
        visible: card.offsetParent !== null,
        hasContent: card.textContent.includes('Session') || card.textContent.includes('Month'),
        zIndex: window.getComputedStyle(card).zIndex,
        position: window.getComputedStyle(card).position,
        display: window.getComputedStyle(card).display,
        opacity: window.getComputedStyle(card).opacity,
        bounds: card.getBoundingClientRect()
      }));
    });
    
    console.log(`📦 Found ${packageCards.length} package cards`);
    
    packageCards.forEach((card, index) => {
      console.log(`Card ${index + 1}:`);
      console.log(`  Visible: ${card.visible}`);
      console.log(`  Has Content: ${card.hasContent}`);
      console.log(`  Z-Index: ${card.zIndex}`);
      console.log(`  Position: ${card.position}`);
      console.log(`  Display: ${card.display}`);
      console.log(`  Opacity: ${card.opacity}`);
      console.log(`  Bounds: ${JSON.stringify(card.bounds)}`);
      console.log('');
    });
    
    // Take a screenshot
    const screenshotPath = path.join(process.cwd(), 'storefront-screenshot.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Screenshot saved to: ${screenshotPath}`);
    
    // Check API calls
    const apiCalls = [];
    page.on('request', request => {
      if (request.url().includes('/api/storefront')) {
        apiCalls.push(request.url());
      }
    });
    
    // Refresh to catch API calls
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForTimeout(3000);
    
    console.log(`🔗 API calls made: ${apiCalls.length}`);
    apiCalls.forEach(call => console.log(`  ${call}`));
    
    // Check for mock mode indicators
    const mockIndicators = await page.evaluate(() => {
      const logs = [];
      if (window.console._logs) {
        logs.push(...window.console._logs.filter(log => 
          log.includes('mock') || log.includes('Mock')
        ));
      }
      return logs;
    });
    
    console.log('🔍 Mock mode indicators:', mockIndicators);
    
    const visibleCards = packageCards.filter(card => card.visible);
    const result = {
      totalCards: packageCards.length,
      visibleCards: visibleCards.length,
      apiCallsMade: apiCalls.length,
      success: visibleCards.length > 0
    };
    
    console.log('');
    console.log('📊 Test Results:');
    console.log(`  Total Cards Found: ${result.totalCards}`);
    console.log(`  Visible Cards: ${result.visibleCards}`);
    console.log(`  API Calls Made: ${result.apiCallsMade}`);
    console.log(`  Test Success: ${result.success ? '✅' : '❌'}`);
    
    return result;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return { success: false, error: error.message };
  } finally {
    await browser.close();
  }
}

// Run the test
console.log('🧪 Starting StoreFront Visibility Test');
testStorefrontVisibility()
  .then(result => {
    if (result.success) {
      console.log('🎉 Test completed successfully!');
      process.exit(0);
    } else {
      console.log('❌ Test failed!');
      if (result.error) console.log('Error:', result.error);
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Test setup failed:', error);
    process.exit(1);
  });