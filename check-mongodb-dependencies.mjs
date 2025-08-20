#!/usr/bin/env node

/**
 * MongoDB Dependency Checker
 * =========================
 * Scans SwanStudios codebase for MongoDB dependencies that need PostgreSQL migration
 * 
 * Run with: node check-mongodb-dependencies.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// MongoDB-related patterns to search for
const MONGODB_PATTERNS = [
    /mongodb/gi,
    /pymongo/gi,
    /MongoClient/gi,
    /mongoose/gi,
    /\.find\(\)/gi,  // Common MongoDB query pattern
    /\.insertOne/gi,
    /\.insertMany/gi,
    /\.updateOne/gi,
    /\.deleteOne/gi,
    /\.aggregate/gi,
    /collection\(/gi,
    /db\./gi,
    /mongo_/gi
];

// File extensions to check
const FILE_EXTENSIONS = ['.js', '.mjs', '.py', '.json', '.txt', '.md'];

// Directories to exclude
const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build', '__pycache__'];

let foundIssues = [];

/**
 * Check if file should be scanned
 */
function shouldScanFile(filePath) {
    const ext = path.extname(filePath);
    return FILE_EXTENSIONS.includes(ext);
}

/**
 * Check if directory should be scanned
 */
function shouldScanDirectory(dirName) {
    return !EXCLUDE_DIRS.includes(dirName);
}

/**
 * Scan file for MongoDB patterns
 */
function scanFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, lineNumber) => {
            MONGODB_PATTERNS.forEach(pattern => {
                const matches = line.match(pattern);
                if (matches) {
                    foundIssues.push({
                        file: filePath,
                        line: lineNumber + 1,
                        content: line.trim(),
                        pattern: pattern.source,
                        type: 'MongoDB Usage'
                    });
                }
            });
        });
    } catch (error) {
        // Ignore binary files or read errors
    }
}

/**
 * Recursively scan directory
 */
function scanDirectory(dirPath) {
    try {
        const items = fs.readdirSync(dirPath);
        
        for (const item of items) {
            const itemPath = path.join(dirPath, item);
            const stat = fs.statSync(itemPath);
            
            if (stat.isDirectory() && shouldScanDirectory(item)) {
                scanDirectory(itemPath);
            } else if (stat.isFile() && shouldScanFile(itemPath)) {
                scanFile(itemPath);
            }
        }
    } catch (error) {
        console.warn(`Warning: Could not scan ${dirPath}: ${error.message}`);
    }
}

/**
 * Check package.json files for MongoDB dependencies
 */
function checkPackageDependencies() {
    const packagePaths = [
        path.join(__dirname, 'package.json'),
        path.join(__dirname, 'frontend', 'package.json'),
        path.join(__dirname, 'backend', 'package.json')
    ];
    
    packagePaths.forEach(packagePath => {
        if (fs.existsSync(packagePath)) {
            try {
                const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
                const allDeps = {
                    ...packageJson.dependencies,
                    ...packageJson.devDependencies
                };
                
                Object.keys(allDeps).forEach(dep => {
                    if (dep.toLowerCase().includes('mongo')) {
                        foundIssues.push({
                            file: packagePath,
                            line: 'dependencies',
                            content: `"${dep}": "${allDeps[dep]}"`,
                            pattern: 'MongoDB Package',
                            type: 'Package Dependency'
                        });
                    }
                });
            } catch (error) {
                console.warn(`Warning: Could not parse ${packagePath}: ${error.message}`);
            }
        }
    });
}

/**
 * Check Python requirements files
 */
function checkPythonRequirements() {
    const reqPaths = [
        path.join(__dirname, 'backend', 'mcp_server', 'requirements.txt'),
        path.join(__dirname, 'backend', 'mcp_server', 'workout_requirements.txt'),
        path.join(__dirname, 'backend', 'mcp_server', 'yolo_mcp_server', 'requirements.txt'),
        path.join(__dirname, 'backend', 'mcp_server', 'gamification_mcp_server', 'requirements.txt')
    ];
    
    reqPaths.forEach(reqPath => {
        if (fs.existsSync(reqPath)) {
            try {
                const content = fs.readFileSync(reqPath, 'utf8');
                const lines = content.split('\n');
                
                lines.forEach((line, index) => {
                    if (line.toLowerCase().includes('mongo') || line.toLowerCase().includes('pymongo')) {
                        foundIssues.push({
                            file: reqPath,
                            line: index + 1,
                            content: line.trim(),
                            pattern: 'MongoDB Python Package',
                            type: 'Python Dependency'
                        });
                    }
                });
            } catch (error) {
                console.warn(`Warning: Could not read ${reqPath}: ${error.message}`);
            }
        }
    });
}

/**
 * Generate migration suggestions
 */
function generateMigrationSuggestions() {
    const suggestions = [
        {
            category: 'Python Dependencies',
            action: 'Replace pymongo with psycopg2-binary',
            files: ['workout_requirements.txt'],
            before: 'pymongo==4.5.0',
            after: 'psycopg2-binary>=2.9.1'
        },
        {
            category: 'Database Connections',
            action: 'Update database connection code',
            files: ['workout_mcp_server/*.py'],
            before: 'MongoClient(connection_string)',
            after: 'psycopg2.connect(DATABASE_URL)'
        },
        {
            category: 'Database Queries',
            action: 'Replace MongoDB queries with SQL/Sequelize',
            files: ['*.py', '*.js'],
            before: 'collection.find({})',
            after: 'SELECT * FROM table'
        }
    ];
    
    return suggestions;
}

/**
 * Main execution
 */
function main() {
    console.log('🔍 SwanStudios MongoDB Dependency Checker');
    console.log('==========================================');
    console.log('Scanning for MongoDB dependencies that need PostgreSQL migration...\n');
    
    // Check package dependencies
    checkPackageDependencies();
    
    // Check Python requirements
    checkPythonRequirements();
    
    // Scan source code
    scanDirectory(__dirname);
    
    // Generate report
    console.log('📊 SCAN RESULTS:');
    console.log('================');
    
    if (foundIssues.length === 0) {
        console.log('✅ SUCCESS: No MongoDB dependencies found!');
        console.log('🎉 Your SwanStudios platform is ready for PostgreSQL-only deployment on Render!');
        return;
    }
    
    // Group issues by type
    const issuesByType = {};
    foundIssues.forEach(issue => {
        if (!issuesByType[issue.type]) {
            issuesByType[issue.type] = [];
        }
        issuesByType[issue.type].push(issue);
    });
    
    // Display issues
    Object.entries(issuesByType).forEach(([type, issues]) => {
        console.log(`\n❌ ${type} (${issues.length} found):`);
        console.log('-'.repeat(50));
        
        issues.forEach(issue => {
            const relativePath = path.relative(__dirname, issue.file);
            console.log(`📄 ${relativePath}:${issue.line}`);
            console.log(`   ${issue.content}`);
            console.log(`   Pattern: ${issue.pattern}\n`);
        });
    });
    
    // Migration suggestions
    console.log('\n🔧 MIGRATION SUGGESTIONS:');
    console.log('=========================');
    
    const suggestions = generateMigrationSuggestions();
    suggestions.forEach((suggestion, index) => {
        console.log(`\n${index + 1}. ${suggestion.category}:`);
        console.log(`   Action: ${suggestion.action}`);
        console.log(`   Files: ${suggestion.files.join(', ')}`);
        console.log(`   Before: ${suggestion.before}`);
        console.log(`   After: ${suggestion.after}`);
    });
    
    // Summary
    console.log('\n📋 MIGRATION SUMMARY:');
    console.log('=====================');
    console.log(`Total MongoDB dependencies found: ${foundIssues.length}`);
    console.log(`Files that need updates: ${new Set(foundIssues.map(i => i.file)).size}`);
    console.log('\n🎯 Next Steps:');
    console.log('1. Update Python requirements files to remove pymongo');
    console.log('2. Replace MongoDB connections with PostgreSQL');
    console.log('3. Update database queries to use SQL/Sequelize');
    console.log('4. Test locally with PostgreSQL only');
    console.log('5. Deploy to Render with single PostgreSQL database');
    
    console.log('\n🚀 Once migration is complete, re-run this script to verify zero MongoDB dependencies!');
}

// Run the checker
main();
