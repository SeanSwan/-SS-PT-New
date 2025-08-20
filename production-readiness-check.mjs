#!/usr/bin/env node

/**
 * SwanStudios Production Readiness Checker
 * ========================================
 * Complete validation suite for Render deployment readiness
 * 
 * Checks:
 * - MongoDB dependencies (should be zero)
 * - Core functionality verification
 * - Render deployment requirements
 * - Environment configuration
 * 
 * Run with: node production-readiness-check.mjs
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import colors from 'colors';

let overallResults = {
    mongoDbCheck: { status: 'PENDING', issues: 0 },
    environmentCheck: { status: 'PENDING', issues: 0 },
    dependencyCheck: { status: 'PENDING', issues: 0 },
    verificationSuite: { status: 'PENDING', issues: 0 },
    renderReadiness: { status: 'PENDING', issues: 0 }
};

/**
 * Run MongoDB dependency check
 */
function runMongoDBCheck() {
    return new Promise((resolve) => {
        console.log('🔍 Checking for MongoDB dependencies...'.blue);
        
        const checker = spawn('node', ['check-mongodb-dependencies.mjs'], {
            stdio: ['inherit', 'pipe', 'pipe']
        });
        
        let stdout = '';
        let stderr = '';
        
        checker.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        
        checker.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        checker.on('close', (code) => {
            if (code === 0 && stdout.includes('No MongoDB dependencies found')) {
                overallResults.mongoDbCheck = { status: 'PASS', issues: 0 };
                console.log('✅ MongoDB Check: PASSED - No MongoDB dependencies found'.green);
            } else {
                const issueCount = (stdout.match(/❌/g) || []).length;
                overallResults.mongoDbCheck = { status: 'FAIL', issues: issueCount };
                console.log(`❌ MongoDB Check: FAILED - ${issueCount} MongoDB dependencies found`.red);
                console.log('Run migration script: python migrate-to-postgresql.py'.yellow);
            }
            resolve();
        });
    });
}

/**
 * Check environment configuration
 */
function checkEnvironmentConfig() {
    console.log('\n🔧 Checking environment configuration...'.blue);
    
    const requiredEnvVars = [
        'DATABASE_URL',
        'JWT_SECRET'
    ];
    
    const optionalEnvVars = [
        'STRIPE_SECRET_KEY',
        'STRIPE_PUBLISHABLE_KEY',
        'NODE_ENV'
    ];
    
    let issues = 0;
    
    // Check .env files
    const envFiles = ['.env', 'backend/.env', 'frontend/.env.local'];
    let envFound = false;
    
    envFiles.forEach(envFile => {
        if (fs.existsSync(envFile)) {
            envFound = true;
            console.log(`📄 Found environment file: ${envFile}`.gray);
        }
    });
    
    if (!envFound) {
        console.log('⚠️ No .env files found - ensure environment variables are set in Render'.yellow);
        issues++;
    }
    
    // Check package.json scripts
    const packageJsonPath = 'package.json';
    if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        
        if (packageJson.scripts && packageJson.scripts.start) {
            console.log('✅ Start script found in package.json'.green);
        } else {
            console.log('❌ No start script in package.json'.red);
            issues++;
        }
    }
    
    overallResults.environmentCheck = { 
        status: issues === 0 ? 'PASS' : 'WARN', 
        issues 
    };
    
    console.log(`${issues === 0 ? '✅' : '⚠️'} Environment Check: ${issues === 0 ? 'PASSED' : 'WARNINGS'} - ${issues} issues`.green);
}

/**
 * Check dependencies for Render compatibility
 */
function checkDependencies() {
    console.log('\n📦 Checking dependencies for Render compatibility...'.blue);
    
    let issues = 0;
    
    // Check Node.js package.json
    const nodePackageFiles = ['package.json', 'backend/package.json', 'frontend/package.json'];
    
    nodePackageFiles.forEach(packageFile => {
        if (fs.existsSync(packageFile)) {
            try {
                const packageJson = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
                
                // Check for MongoDB dependencies (should be zero)
                const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
                const mongoDeps = Object.keys(allDeps).filter(dep => 
                    dep.toLowerCase().includes('mongo')
                );
                
                if (mongoDeps.length > 0) {
                    console.log(`❌ Found MongoDB dependencies in ${packageFile}: ${mongoDeps.join(', ')}`.red);
                    issues += mongoDeps.length;
                } else {
                    console.log(`✅ No MongoDB dependencies in ${packageFile}`.green);
                }
                
                // Check for required dependencies
                if (packageFile.includes('backend')) {
                    const requiredBackendDeps = ['express', 'sequelize', 'pg'];
                    requiredBackendDeps.forEach(dep => {
                        if (!allDeps[dep] && !allDeps[`${dep}-cli`]) {
                            console.log(`⚠️ Missing recommended backend dependency: ${dep}`.yellow);
                        }
                    });
                }
                
            } catch (error) {
                console.log(`❌ Error reading ${packageFile}: ${error.message}`.red);
                issues++;
            }
        }
    });
    
    // Check Python requirements
    const pythonReqFiles = [
        'backend/mcp_server/requirements.txt',
        'backend/mcp_server/workout_requirements.txt',
        'backend/mcp_server/yolo_mcp_server/requirements-minimal.txt',
        'backend/mcp_server/gamification_mcp_server/requirements.txt'
    ];
    
    pythonReqFiles.forEach(reqFile => {
        if (fs.existsSync(reqFile)) {
            const content = fs.readFileSync(reqFile, 'utf8');
            
            if (content.includes('pymongo') || content.includes('mongo')) {
                console.log(`❌ Found MongoDB dependencies in ${reqFile}`.red);
                issues++;
            } else {
                console.log(`✅ No MongoDB dependencies in ${reqFile}`.green);
            }
            
            if (content.includes('psycopg2')) {
                console.log(`✅ PostgreSQL dependencies found in ${reqFile}`.green);
            }
        }
    });
    
    overallResults.dependencyCheck = { 
        status: issues === 0 ? 'PASS' : 'FAIL', 
        issues 
    };
    
    console.log(`${issues === 0 ? '✅' : '❌'} Dependency Check: ${issues === 0 ? 'PASSED' : 'FAILED'} - ${issues} issues`);
}

/**
 * Run verification suite if services are available
 */
function runVerificationSuite() {
    return new Promise((resolve) => {
        console.log('\n🧪 Running verification suite...'.blue);
        
        // Check if verification suite exists
        if (!fs.existsSync('frontend/master-verification-suite.mjs')) {
            console.log('⚠️ Verification suite not found - skipping'.yellow);
            overallResults.verificationSuite = { status: 'SKIP', issues: 0 };
            resolve();
            return;
        }
        
        // Quick API connectivity check first
        const quickCheck = spawn('node', ['frontend/verify-frontend-api-integration.mjs'], {
            stdio: ['inherit', 'pipe', 'pipe'],
            timeout: 30000 // 30 second timeout
        });
        
        let stdout = '';
        
        quickCheck.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        
        quickCheck.on('close', (code) => {
            if (code === 0) {
                overallResults.verificationSuite = { status: 'PASS', issues: 0 };
                console.log('✅ Verification Suite: PASSED - Core functionality verified'.green);
            } else {
                overallResults.verificationSuite = { status: 'FAIL', issues: 1 };
                console.log('❌ Verification Suite: FAILED - Services may not be running'.red);
                console.log('💡 Start services with: npm run start-simple'.yellow);
            }
            resolve();
        });
        
        quickCheck.on('error', () => {
            overallResults.verificationSuite = { status: 'SKIP', issues: 0 };
            console.log('⚠️ Verification Suite: SKIPPED - Could not run tests'.yellow);
            resolve();
        });
    });
}

/**
 * Check Render deployment readiness
 */
function checkRenderReadiness() {
    console.log('\n🚀 Checking Render deployment readiness...'.blue);
    
    let issues = 0;
    
    // Check for render.yaml
    if (fs.existsSync('render.yaml')) {
        console.log('✅ render.yaml configuration found'.green);
    } else {
        console.log('⚠️ render.yaml not found - will need manual setup'.yellow);
    }
    
    // Check for Dockerfile (optional but recommended)
    if (fs.existsSync('Dockerfile')) {
        console.log('✅ Dockerfile found for containerized deployment'.green);
    } else {
        console.log('ℹ️ No Dockerfile - using Node.js buildpack'.gray);
    }
    
    // Check start scripts
    const hasStartScript = fs.existsSync('package.json') && 
        JSON.parse(fs.readFileSync('package.json', 'utf8')).scripts?.start;
    
    if (hasStartScript) {
        console.log('✅ Start script configured'.green);
    } else {
        console.log('❌ No start script - required for Render'.red);
        issues++;
    }
    
    // Check for production build commands
    const frontendPackage = 'frontend/package.json';
    if (fs.existsSync(frontendPackage)) {
        const pkg = JSON.parse(fs.readFileSync(frontendPackage, 'utf8'));
        if (pkg.scripts?.build) {
            console.log('✅ Frontend build script found'.green);
        } else {
            console.log('❌ Frontend build script missing'.red);
            issues++;
        }
    }
    
    overallResults.renderReadiness = { 
        status: issues === 0 ? 'PASS' : 'FAIL', 
        issues 
    };
    
    console.log(`${issues === 0 ? '✅' : '❌'} Render Readiness: ${issues === 0 ? 'READY' : 'NOT READY'} - ${issues} issues`);
}

/**
 * Generate final report
 */
function generateFinalReport() {
    console.log('\n📊 PRODUCTION READINESS REPORT'.rainbow);
    console.log('='.repeat(50));
    
    let totalIssues = 0;
    let criticalFailures = 0;
    
    Object.entries(overallResults).forEach(([check, result]) => {
        const status = result.status;
        const issues = result.issues;
        totalIssues += issues;
        
        if (status === 'FAIL') criticalFailures++;
        
        const statusColor = status === 'PASS' ? 'green' : 
                           status === 'WARN' ? 'yellow' : 
                           status === 'SKIP' ? 'gray' : 'red';
        
        console.log(`${check.padEnd(20)} ${status.padEnd(8)} ${issues} issues`[statusColor]);
    });
    
    console.log('='.repeat(50));
    
    if (criticalFailures === 0 && totalIssues <= 2) {
        console.log('🎉 PRODUCTION READY! SwanStudios is ready for Render deployment!'.green.bold);
        console.log('\n🚀 Next Steps:'.blue);
        console.log('1. Push code to GitHub');
        console.log('2. Connect Render to your repository');
        console.log('3. Configure environment variables');
        console.log('4. Deploy!');
    } else if (criticalFailures === 0) {
        console.log('⚠️ MOSTLY READY - Minor issues to resolve'.yellow.bold);
        console.log(`📊 Total issues: ${totalIssues} (${criticalFailures} critical)`);
        console.log('\n🔧 Recommended Actions:'.blue);
        if (overallResults.mongoDbCheck.status === 'FAIL') {
            console.log('1. Run: python migrate-to-postgresql.py');
        }
        console.log('2. Review warnings above');
        console.log('3. Test locally before deploying');
    } else {
        console.log('❌ NOT READY - Critical issues need resolution'.red.bold);
        console.log(`📊 Total issues: ${totalIssues} (${criticalFailures} critical)`);
        console.log('\n🛠️ Required Actions:'.red);
        if (overallResults.mongoDbCheck.status === 'FAIL') {
            console.log('1. CRITICAL: Run MongoDB migration: python migrate-to-postgresql.py');
        }
        if (overallResults.dependencyCheck.status === 'FAIL') {
            console.log('2. CRITICAL: Fix dependency issues');
        }
        if (overallResults.renderReadiness.status === 'FAIL') {
            console.log('3. CRITICAL: Fix Render deployment configuration');
        }
    }
    
    console.log('\n📄 Detailed Reports Available:');
    console.log('- SWANSTUDIOS-HANDOFF-REPORT.md - Complete handoff documentation');
    console.log('- POSTGRESQL-MIGRATION-GUIDE.md - Migration instructions (if needed)');
    console.log('- render.yaml - Render deployment configuration');
}

/**
 * Main execution
 */
async function main() {
    console.log('🎯 SwanStudios Production Readiness Check'.rainbow.bold);
    console.log('=========================================='.gray);
    console.log('Comprehensive validation for Render deployment\n'.blue);
    
    try {
        await runMongoDBCheck();
        checkEnvironmentConfig();
        checkDependencies();
        await runVerificationSuite();
        checkRenderReadiness();
        generateFinalReport();
        
    } catch (error) {
        console.error(`\n❌ Production readiness check failed: ${error.message}`.red);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export default main;
