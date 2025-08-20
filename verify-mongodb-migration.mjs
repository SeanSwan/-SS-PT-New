#!/usr/bin/env node

/**
 * MongoDB to PostgreSQL Migration Verification
 * ============================================
 * Verifies that SwanStudios migration is complete
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🔍 VERIFYING MONGODB TO POSTGRESQL MIGRATION');
console.log('============================================\n');

let issues = [];

// Check 1: Verify MongoDB files are removed
console.log('✅ CHECK 1: MongoDB Files Removed');
const mongoFiles = [
    'backend/mongodb.mjs',
    'backend/mongodb-connect.mjs',
    'backend/mcp_server/workout_mcp_server/utils/mongodb.py'
];

mongoFiles.forEach(file => {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
        issues.push(`❌ MongoDB file still exists: ${file}`);
        console.log(`   ❌ ${file} - Still exists`);
    } else {
        console.log(`   ✅ ${file} - Removed successfully`);
    }
});

// Check 2: Verify Python requirements updated
console.log('\n✅ CHECK 2: Python Requirements Updated');
const reqPath = path.join(__dirname, 'backend/mcp_server/workout_requirements.txt');
if (fs.existsSync(reqPath)) {
    const content = fs.readFileSync(reqPath, 'utf8');
    if (content.includes('pymongo')) {
        issues.push('❌ pymongo still in workout_requirements.txt');
        console.log('   ❌ pymongo dependency still exists');
    } else {
        console.log('   ✅ pymongo dependency removed');
    }
    
    if (content.includes('psycopg2-binary')) {
        console.log('   ✅ psycopg2-binary dependency added');
    } else {
        issues.push('❌ psycopg2-binary not found in workout_requirements.txt');
        console.log('   ❌ psycopg2-binary dependency missing');
    }
} else {
    issues.push('❌ workout_requirements.txt not found');
}

// Check 3: Verify PostgreSQL connection file created
console.log('\n✅ CHECK 3: PostgreSQL Connection Module');
const pgPath = path.join(__dirname, 'backend/mcp_server/workout_mcp_server/utils/postgresql.py');
if (fs.existsSync(pgPath)) {
    console.log('   ✅ postgresql.py connection module created');
} else {
    issues.push('❌ postgresql.py connection module not found');
    console.log('   ❌ postgresql.py connection module missing');
}

// Check 4: Verify package.json updated
console.log('\n✅ CHECK 4: Package.json Dependencies');
const packagePath = path.join(__dirname, 'backend/package.json');
if (fs.existsSync(packagePath)) {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const deps = {...packageJson.dependencies, ...packageJson.devDependencies};
    
    const mongoDeps = ['mongodb', 'mongoose', 'pymongo', 'connect-mongo'];
    mongoDeps.forEach(dep => {
        if (deps[dep]) {
            issues.push(`❌ MongoDB dependency still in package.json: ${dep}`);
            console.log(`   ❌ ${dep} dependency still exists`);
        } else {
            console.log(`   ✅ ${dep} dependency removed`);
        }
    });
    
    // Check PostgreSQL dependencies
    const pgDeps = ['pg', 'sequelize'];
    pgDeps.forEach(dep => {
        if (deps[dep]) {
            console.log(`   ✅ ${dep} dependency exists`);
        } else {
            issues.push(`❌ PostgreSQL dependency missing: ${dep}`);
            console.log(`   ❌ ${dep} dependency missing`);
        }
    });
} else {
    issues.push('❌ backend/package.json not found');
}

// Check 5: Verify models are PostgreSQL-based
console.log('\n✅ CHECK 5: Database Models');
const modelsPath = path.join(__dirname, 'backend/models');
const databasePath = path.join(__dirname, 'backend/database.mjs');

if (fs.existsSync(databasePath)) {
    const dbContent = fs.readFileSync(databasePath, 'utf8');
    if (dbContent.includes('Sequelize') && dbContent.includes('postgresql')) {
        console.log('   ✅ database.mjs configured for PostgreSQL with Sequelize');
    } else {
        issues.push('❌ database.mjs not properly configured for PostgreSQL');
        console.log('   ❌ database.mjs not properly configured');
    }
} else {
    issues.push('❌ database.mjs not found');
}

if (fs.existsSync(modelsPath)) {
    const modelFiles = fs.readdirSync(modelsPath).filter(f => f.endsWith('.mjs'));
    console.log(`   ✅ Found ${modelFiles.length} Sequelize model files`);
} else {
    issues.push('❌ models directory not found');
}

// Final Results
console.log('\n' + '='.repeat(50));
console.log('📋 MIGRATION VERIFICATION RESULTS');
console.log('='.repeat(50));

if (issues.length === 0) {
    console.log('🎉 SUCCESS: MongoDB to PostgreSQL migration is COMPLETE!');
    console.log('✅ All MongoDB dependencies removed');
    console.log('✅ All PostgreSQL dependencies in place');
    console.log('✅ SwanStudios is ready for PostgreSQL-only deployment');
    console.log('\n🚀 NEXT STEPS:');
    console.log('1. Deploy to Render with single PostgreSQL database');
    console.log('2. Update environment variables to remove MongoDB configs');
    console.log('3. Test all API endpoints with PostgreSQL');
    console.log('4. Verify Python MCP server connects to PostgreSQL');
} else {
    console.log('❌ MIGRATION INCOMPLETE - Issues found:');
    issues.forEach(issue => console.log(`   ${issue}`));
    console.log('\n🔧 Please fix the issues above and re-run verification');
}

console.log('\n' + '='.repeat(50));
