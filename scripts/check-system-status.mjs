#!/usr/bin/env node
/**
 * System Status Check Script
 * Comprehensive analysis of the SwanStudios authentication and routing system
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

const log = {
  success: (msg) => console.log(chalk.green('✓'), msg),
  error: (msg) => console.log(chalk.red('✗'), msg),
  info: (msg) => console.log(chalk.blue('ℹ'), msg),
  warn: (msg) => console.log(chalk.yellow('⚠'), msg),
  header: (msg) => console.log(chalk.bgBlue.white.bold(`\n ${msg} `))
};

function checkFileExists(filePath, description) {
  const exists = fs.existsSync(filePath);
  if (exists) {
    log.success(`${description}: Found`);
  } else {
    log.error(`${description}: Missing - ${filePath}`);
  }
  return exists;
}

function checkFileContent(filePath, searchTerms, description) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const results = {};
    
    searchTerms.forEach(term => {
      results[term] = content.includes(term);
    });
    
    const allFound = Object.values(results).every(Boolean);
    const foundCount = Object.values(results).filter(Boolean).length;
    
    if (allFound) {
      log.success(`${description}: All required elements found (${foundCount}/${searchTerms.length})`);
    } else {
      log.warn(`${description}: Some elements missing (${foundCount}/${searchTerms.length})`);
      Object.entries(results).forEach(([term, found]) => {
        if (!found) {
          log.error(`  Missing: ${term}`);
        }
      });
    }
    
    return allFound;
  } catch (error) {
    log.error(`${description}: Error reading file - ${error.message}`);
    return false;
  }
}

async function checkSystemStatus() {
  log.header('SwanStudios System Status Check');
  
  const frontendPath = 'C:/Users/ogpsw/Desktop/quick-pt/SS-PT/frontend/src';
  const backendPath = 'C:/Users/ogpsw/Desktop/quick-pt/SS-PT/backend';
  
  const results = {
    authSystem: {},
    routing: {},
    dashboards: {},
    backend: {}
  };
  
  // Check Authentication System
  log.header('Authentication System Check');
  
  results.authSystem.context = checkFileExists(
    path.join(frontendPath, 'context/AuthContext.tsx'),
    'Enhanced AuthContext'
  );
  
  if (results.authSystem.context) {
    results.authSystem.contextContent = checkFileContent(
    path.join(frontendPath, 'context/AuthContext.tsx'),
    [
    'checkPermission',
    'export interface User',
    'ROLE_PERMISSIONS',
    'refreshToken',
    'AuthContextType'
    ],
    'AuthContext features'
    );
  }
  
  results.authSystem.protectedRoute = checkFileExists(
    path.join(frontendPath, 'routes/protected-route.tsx'),
    'Enhanced ProtectedRoute'
  );
  
  results.authSystem.adminRoute = checkFileExists(
    path.join(frontendPath, 'routes/admin-route.tsx'),
    'Enhanced AdminRoute'
  );
  
  // Check Admin Dashboard
  log.header('Admin Dashboard Check');
  
  results.dashboards.adminLayout = checkFileExists(
    path.join(frontendPath, 'components/DashBoard/AdminDashboardLayout.tsx'),
    'Admin Dashboard Layout'
  );
  
  if (results.dashboards.adminLayout) {
    results.dashboards.adminSecurity = checkFileContent(
      path.join(frontendPath, 'components/DashBoard/AdminDashboardLayout.tsx'),
      [
        'auth.checkPermission',
        'verifyAdminAccess',
        'You do not have administrative privileges'
      ],
      'Admin security implementation'
    );
    
    // Check that the security bypass is removed
    const adminContent = fs.readFileSync(
      path.join(frontendPath, 'components/DashBoard/AdminDashboardLayout.tsx'),
      'utf8'
    );
    
    const hasBypass = adminContent.includes('ogpswan') || 
                     adminContent.includes('BYPASSING ERROR CHECK');
    
    if (hasBypass) {
      log.error('Security bypass still present in AdminDashboardLayout');
      results.dashboards.securityBypass = false;
    } else {
      log.success('Security bypass successfully removed');
      results.dashboards.securityBypass = true;
    }
  }
  
  // Check Backend Authentication
  log.header('Backend Authentication Check');
  
  results.backend.authRoutes = checkFileExists(
    path.join(backendPath, 'routes/authRoutes.mjs'),
    'Authentication routes'
  );
  
  results.backend.authController = checkFileExists(
    path.join(backendPath, 'controllers/authController.mjs'),
    'Authentication controller'
  );
  
  results.backend.authMiddleware = checkFileExists(
    path.join(backendPath, 'middleware/authMiddleware.mjs'),
    'Authentication middleware'
  );
  
  // Check package.json scripts
  log.header('Package Scripts Check');
  
  const mainPackagePath = path.join(backendPath, '../package.json');
  if (fs.existsSync(mainPackagePath)) {
    const packageJson = JSON.parse(fs.readFileSync(mainPackagePath, 'utf8'));
    const hasStartScript = packageJson.scripts && packageJson.scripts.start;
    const hasDevScript = packageJson.scripts && packageJson.scripts.dev;
    
    results.scripts = {
      start: hasStartScript,
      dev: hasDevScript
    };
    
    if (hasStartScript) {
      log.success('Start script found');
    } else {
      log.error('Start script missing');
    }
    
    if (hasDevScript) {
      log.success('Dev script found');
    } else {
      log.error('Dev script missing');
    }
  }
  
  // Check routing structure
  log.header('Routing System Check');
  
  results.routing.mainRoutes = checkFileExists(
    path.join(frontendPath, 'routes/main-routes.tsx'),
    'Main routes configuration'
  );
  
  results.routing.adminRoutes = checkFileExists(
    path.join(frontendPath, 'components/DashBoard/internal-routes.tsx'),
    'Admin internal routes'
  );
  
  // Generate report
  log.header('System Status Report');
  
  console.log(chalk.bold('\nAuthentication System:'));
  console.log(`  AuthContext: ${results.authSystem.context ? chalk.green('✓') : chalk.red('✗')}`);
  console.log(`  ProtectedRoute: ${results.authSystem.protectedRoute ? chalk.green('✓') : chalk.red('✗')}`);
  console.log(`  AdminRoute: ${results.authSystem.adminRoute ? chalk.green('✓') : chalk.red('✗')}`);
  
  console.log(chalk.bold('\nDashboard System:'));
  console.log(`  Admin Layout: ${results.dashboards.adminLayout ? chalk.green('✓') : chalk.red('✗')}`);
  console.log(`  Security Implementation: ${results.dashboards.adminSecurity ? chalk.green('✓') : chalk.red('✗')}`);
  console.log(`  Security Bypass Removed: ${results.dashboards.securityBypass ? chalk.green('✓') : chalk.red('✗')}`);
  
  console.log(chalk.bold('\nBackend System:'));
  console.log(`  Auth Routes: ${results.backend.authRoutes ? chalk.green('✓') : chalk.red('✗')}`);
  console.log(`  Auth Controller: ${results.backend.authController ? chalk.green('✓') : chalk.red('✗')}`);
  console.log(`  Auth Middleware: ${results.backend.authMiddleware ? chalk.green('✓') : chalk.red('✗')}`);
  
  console.log(chalk.bold('\nRouting System:'));
  console.log(`  Main Routes: ${results.routing.mainRoutes ? chalk.green('✓') : chalk.red('✗')}`);
  console.log(`  Admin Routes: ${results.routing.adminRoutes ? chalk.green('✓') : chalk.red('✗')}`);
  
  // Overall assessment
  const criticalIssues = [
    !results.authSystem.context,
    !results.dashboards.securityBypass,
    !results.backend.authRoutes
  ].filter(Boolean).length;
  
  const totalIssues = Object.values(results).reduce((count, category) => {
    return count + Object.values(category).filter(result => result === false).length;
  }, 0);
  
  console.log(chalk.bold('\nOverall Assessment:'));
  
  if (criticalIssues === 0) {
    log.success('No critical security issues found');
  } else {
    log.error(`${criticalIssues} critical security issues detected`);
  }
  
  if (totalIssues === 0) {
    log.success('All systems operational');
  } else {
    log.warn(`${totalIssues} total issues detected`);
  }
  
  // Next steps
  log.header('Next Steps');
  
  if (criticalIssues > 0) {
    log.error('IMMEDIATE ACTION REQUIRED:');
    console.log('  1. Security vulnerabilities must be addressed immediately');
    console.log('  2. Run authentication tests to verify fixes');
    console.log('  3. Restart services after fixes');
  } else if (totalIssues > 0) {
    log.warn('Recommended Actions:');
    console.log('  1. Address remaining configuration issues');
    console.log('  2. Run full system tests');
    console.log('  3. Monitor system performance');
  } else {
    log.success('System Status: HEALTHY');
    console.log('  1. Run authentication tests to verify functionality');
    console.log('  2. Begin user acceptance testing');
    console.log('  3. Prepare for production deployment');
  }
  
  console.log('\nTest Commands:');
  console.log(chalk.green('  node scripts/test-auth-system.mjs') + ' - Test authentication system');
  console.log(chalk.green('  npm run start') + ' - Start all services');
  console.log(chalk.green('  npm run dev') + ' - Start in development mode');
}

checkSystemStatus().catch(error => {
  log.error(`System check error: ${error.message}`);
  process.exit(1);
});
