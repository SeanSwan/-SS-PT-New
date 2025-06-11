#!/usr/bin/env node
/**
 * SPA Routing Fix Verification Script
 * ==================================
 * Comprehensive verification of the SPA routing fix implementation
 * Master Prompt v28 aligned - The Swan Alchemist
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Console styling
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  title: (msg) => console.log(`${colors.bold}${colors.cyan}🌟 ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.magenta}🔧 ${msg}${colors.reset}`)
};

/**
 * Verification checks for SPA routing implementation
 */
class SPARoutingVerifier {
  constructor() {
    this.issues = [];
    this.successes = [];
    this.warnings = [];
  }

  /**
   * Check if file exists and log result
   */
  checkFile(filePath, description) {
    const exists = fs.existsSync(filePath);
    if (exists) {
      this.successes.push(`${description} exists`);
      log.success(`${description} found at: ${filePath}`);
      return true;
    } else {
      this.issues.push(`${description} missing at: ${filePath}`);
      log.error(`${description} NOT found at: ${filePath}`);
      return false;
    }
  }

  /**
   * Check file content for specific patterns
   */
  checkFileContent(filePath, patterns, description) {
    if (!fs.existsSync(filePath)) {
      this.issues.push(`Cannot check ${description} - file missing: ${filePath}`);
      return false;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const results = [];

      for (const [name, pattern] of Object.entries(patterns)) {
        const found = typeof pattern === 'string' 
          ? content.includes(pattern)
          : pattern.test(content);
        
        if (found) {
          results.push(`✅ ${name}`);
        } else {
          results.push(`❌ ${name}`);
          this.issues.push(`${description}: Missing ${name}`);
        }
      }

      log.info(`${description} content check:`);
      results.forEach(result => console.log(`   ${result}`));
      
      return results.every(r => r.startsWith('✅'));
    } catch (error) {
      this.issues.push(`Error reading ${description}: ${error.message}`);
      log.error(`Error reading ${description}: ${error.message}`);
      return false;
    }
  }

  /**
   * Verify frontend build exists
   */
  verifyFrontendBuild() {
    log.step('Checking frontend build...');
    
    const frontendDistPath = path.join(__dirname, 'frontend', 'dist');
    const indexPath = path.join(frontendDistPath, 'index.html');
    const assetsPath = path.join(frontendDistPath, 'assets');

    this.checkFile(frontendDistPath, 'Frontend dist directory');
    this.checkFile(indexPath, 'Frontend index.html');
    this.checkFile(assetsPath, 'Frontend assets directory');

    // Check if build is recent
    if (fs.existsSync(indexPath)) {
      const stats = fs.statSync(indexPath);
      const buildAge = Date.now() - stats.mtime.getTime();
      const hoursAgo = Math.floor(buildAge / (1000 * 60 * 60));
      
      if (hoursAgo < 24) {
        log.success(`Frontend build is recent (${hoursAgo} hours ago)`);
        this.successes.push('Frontend build is recent');
      } else {
        log.warning(`Frontend build is ${hoursAgo} hours old - consider rebuilding`);
        this.warnings.push(`Frontend build is ${hoursAgo} hours old`);
      }
    }

    return fs.existsSync(indexPath);
  }

  /**
   * Verify backend SPA routing configuration
   */
  verifyBackendSPAConfig() {
    log.step('Checking backend SPA routing configuration...');

    const middlewarePath = path.join(__dirname, 'backend', 'core', 'middleware', 'index.mjs');
    const routesPath = path.join(__dirname, 'backend', 'core', 'routes.mjs');

    // Check middleware static file serving
    const middlewarePatterns = {
      'Robust path resolution': 'possibleFrontendPaths',
      'Global path storage': 'global.FRONTEND_DIST_PATH',
      'Production check': 'if (isProduction)',
      'Static file serving': 'express.static',
      'Cache headers': 'Cache-Control'
    };

    this.checkFileContent(middlewarePath, middlewarePatterns, 'Middleware static file serving');

    // Check routes SPA fallback
    const routesPatterns = {
      'SPA fallback routing': 'SPA FALLBACK ROUTING',
      'Global path usage': 'global.FRONTEND_DIST_PATH',
      'API route exclusion': 'req.path.startsWith(\'/api\')',
      'Static asset exclusion': 'staticAssetPattern',
      'Index.html serving': 'res.sendFile(indexPath)',
      'Production check': 'if (isProduction)'
    };

    this.checkFileContent(routesPath, routesPatterns, 'Routes SPA fallback');
  }

  /**
   * Verify React Router configuration
   */
  verifyReactRouterConfig() {
    log.step('Checking React Router configuration...');

    const appPath = path.join(__dirname, 'frontend', 'src', 'App.tsx');
    const mainRoutesPath = path.join(__dirname, 'frontend', 'src', 'routes', 'main-routes.tsx');
    const viteConfigPath = path.join(__dirname, 'frontend', 'vite.config.js');

    // Check App.tsx for proper router setup
    const appPatterns = {
      'Browser Router': 'createBrowserRouter',
      'Router Provider': 'RouterProvider',
      'Routes import': 'MainRoutes'
    };

    this.checkFileContent(appPath, appPatterns, 'App.tsx router setup');

    // Check main routes configuration
    const routesPatterns = {
      'Route definitions': 'RouteObject',
      'Lazy loading': 'lazy(',
      'Protected routes': 'ProtectedRoute',
      'Fallback route': 'path: \'*\''
    };

    this.checkFileContent(mainRoutesPath, routesPatterns, 'Main routes configuration');

    // Check Vite configuration
    const vitePatterns = {
      'History API fallback': 'historyApiFallback',
      'React plugin': '@vitejs/plugin-react',
      'Build configuration': 'build:'
    };

    this.checkFileContent(viteConfigPath, vitePatterns, 'Vite configuration');
  }

  /**
   * Check hosting platform configurations
   */
  verifyHostingConfigs() {
    log.step('Checking hosting platform configurations...');

    const frontendDir = path.join(__dirname, 'frontend');
    
    // Check various hosting configs
    const configs = [
      { file: path.join(frontendDir, '_redirects'), name: 'Netlify _redirects' },
      { file: path.join(frontendDir, 'vercel.json'), name: 'Vercel configuration' },
      { file: path.join(frontendDir, 'dist', '.htaccess'), name: 'Apache .htaccess' }
    ];

    configs.forEach(config => {
      if (fs.existsSync(config.file)) {
        log.success(`${config.name} found`);
        this.successes.push(`${config.name} exists`);
      } else {
        log.warning(`${config.name} not found (may not be needed)`);
      }
    });
  }

  /**
   * Test possible frontend paths that backend will check
   */
  testFrontendPaths() {
    log.step('Testing frontend path resolution...');

    const possiblePaths = [
      path.join(__dirname, 'frontend/dist'),
      path.join(__dirname, 'dist'),
      '/app/frontend/dist',
      '/app/dist'
    ];

    let foundPath = null;
    for (const testPath of possiblePaths) {
      const indexPath = path.join(testPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        log.success(`Valid frontend path: ${testPath}`);
        foundPath = testPath;
        this.successes.push(`Frontend found at: ${testPath}`);
        break;
      } else {
        log.info(`Path not found: ${testPath}`);
      }
    }

    if (!foundPath) {
      this.issues.push('No valid frontend path found');
      log.error('No valid frontend paths found!');
    }

    return foundPath !== null;
  }

  /**
   * Generate actionable recommendations
   */
  generateRecommendations() {
    log.title('SPA ROUTING FIX RECOMMENDATIONS');

    if (this.issues.length === 0) {
      log.success('🎉 All SPA routing checks passed! Your configuration should work correctly.');
      
      console.log(`
${colors.cyan}📋 DEPLOYMENT CHECKLIST:${colors.reset}

1. ${colors.green}✅ Build frontend:${colors.reset}
   cd frontend && npm run build

2. ${colors.green}✅ Test locally:${colors.reset}
   npm run start (development)
   or
   npm run preview (test production build)

3. ${colors.green}✅ Deploy to production:${colors.reset}
   git add .
   git commit -m "🔧 Fix SPA routing - Enhanced path resolution and fallback"
   git push origin main

4. ${colors.green}✅ Verify in production:${colors.reset}
   Visit https://your-domain.com/client-dashboard
   Refresh the page - should NOT get 404
      `);
      
      return true;
    }

    // Generate specific recommendations based on issues
    console.log(`\n${colors.red}🚨 ISSUES FOUND (${this.issues.length}):${colors.reset}`);
    this.issues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue}`);
    });

    console.log(`\n${colors.yellow}📋 RECOMMENDED FIXES:${colors.reset}`);

    // Frontend build issues
    if (this.issues.some(issue => issue.includes('Frontend'))) {
      console.log(`
${colors.yellow}1. REBUILD FRONTEND:${colors.reset}
   cd frontend
   npm run build
   
   This will create the dist directory with all built assets.`);
    }

    // Backend configuration issues
    if (this.issues.some(issue => issue.includes('backend') || issue.includes('SPA'))) {
      console.log(`
${colors.yellow}2. BACKEND CONFIGURATION:${colors.reset}
   The backend files have been updated with robust SPA routing.
   Ensure the server restarts to pick up changes.`);
    }

    // Path resolution issues
    if (this.issues.some(issue => issue.includes('path'))) {
      console.log(`
${colors.yellow}3. PATH RESOLUTION:${colors.reset}
   The enhanced backend now tries multiple possible paths.
   Make sure frontend/dist exists with index.html inside.`);
    }

    return false;
  }

  /**
   * Run all verification checks
   */
  async runFullVerification() {
    log.title('SPA ROUTING FIX VERIFICATION');
    console.log('Comprehensive check of SPA routing implementation...\n');

    // Run all checks
    this.verifyFrontendBuild();
    this.verifyBackendSPAConfig();
    this.verifyReactRouterConfig();
    this.verifyHostingConfigs();
    this.testFrontendPaths();

    // Summary
    console.log(`\n${colors.bold}=== VERIFICATION SUMMARY ===${colors.reset}`);
    log.success(`Successes: ${this.successes.length}`);
    log.warning(`Warnings: ${this.warnings.length}`);
    log.error(`Issues: ${this.issues.length}`);

    // Generate recommendations
    const allGood = this.generateRecommendations();
    
    if (allGood) {
      process.exit(0);
    } else {
      console.log(`\n${colors.red}Please fix the issues above before deploying.${colors.reset}`);
      process.exit(1);
    }
  }
}

// Run verification
const verifier = new SPARoutingVerifier();
verifier.runFullVerification().catch(error => {
  log.error(`Verification failed: ${error.message}`);
  process.exit(1);
});
