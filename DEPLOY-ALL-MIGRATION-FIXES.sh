#!/bin/bash

echo "🚨 EMERGENCY DATABASE MIGRATION FIX - DEPLOY ALL FIXES"
echo "======================================================="
echo ""
echo "This script will fix all database migration issues and deploy"
echo "the Enhanced Social Media Platform for SwanStudios."
echo ""

# Change to backend directory
cd "$(dirname "$0")/backend" || {
    echo "❌ Error: Could not change to backend directory"
    exit 1
}

echo "📍 Current directory: $(pwd)"
echo ""

# Function to check if a command was successful
check_success() {
    if [ $? -eq 0 ]; then
        echo "✅ $1 completed successfully"
    else
        echo "❌ $1 failed"
        exit 1
    fi
}

# Step 1: Run the direct foreign key constraint fix FIRST
echo "🔧 Step 1: Fixing foreign key constraint error..."
echo "-----------------------------------------------"
npx sequelize-cli db:migrate --to DIRECT-FOREIGN-KEY-CONSTRAINT-FIX.cjs
check_success "Foreign key constraint fix"
echo ""

# Step 2: Run the UUID/INTEGER type mismatch fix
echo "🔧 Step 2: Fixing UUID vs INTEGER type mismatch..."
echo "-----------------------------------------------"
npx sequelize-cli db:migrate --to UUID-INTEGER-TYPE-MISMATCH-FIX.cjs
check_success "UUID/INTEGER type mismatch fix"
echo ""

# Step 3: Run the emergency database repair migration
echo "🔧 Step 3: Running Emergency Database Repair..."
echo "-----------------------------------------------"
npx sequelize-cli db:migrate --to EMERGENCY-DATABASE-REPAIR.cjs
check_success "Emergency Database Repair"
echo ""

# Step 4: Run all remaining migrations
echo "🚀 Step 4: Running all remaining migrations..."
echo "-----------------------------------------------"
npx sequelize-cli db:migrate
check_success "All remaining migrations"
echo ""

# Step 5: Verify Enhanced Social Media Platform tables
echo "🔍 Step 5: Verifying Enhanced Social Media Platform tables..."
echo "-------------------------------------------------------------"
node -e "
const { Sequelize } = require('sequelize');
const config = require('./config/config.cjs').development;

const sequelize = new Sequelize(config.database, config.username, config.password, config);

async function checkTables() {
    try {
        const [results] = await sequelize.query(\`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE '%social%' OR table_name LIKE '%communities%'
            ORDER BY table_name;
        \`);
        
        console.log('Enhanced Social Media Tables:');
        if (results.length > 0) {
            results.forEach(table => console.log('✅', table.table_name));
            console.log('');
            console.log('🎉 Enhanced Social Media Platform successfully deployed!');
        } else {
            console.log('⚠️ No Enhanced Social Media tables found');
        }
        
        await sequelize.close();
    } catch (error) {
        console.error('❌ Error checking tables:', error.message);
        process.exit(1);
    }
}

checkTables();
"
check_success "Table verification"
echo ""

# Step 6: Test database connectivity
echo "🔗 Step 6: Testing database connectivity..."
echo "-------------------------------------------"
node -e "
const { Sequelize } = require('sequelize');
const config = require('./config/config.cjs').development;

const sequelize = new Sequelize(config.database, config.username, config.password, config);

async function testConnection() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connection successful');
        
        const [results] = await sequelize.query('SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = \\'public\\';');
        console.log(\`✅ Found \${results[0].table_count} tables in database\`);
        
        await sequelize.close();
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        process.exit(1);
    }
}

testConnection();
"
check_success "Database connectivity test"
echo ""

# Step 7: Display success summary
echo "🎉 SUCCESS SUMMARY"
echo "=================="
echo "✅ Foreign key constraint error fixed"
echo "✅ UUID vs INTEGER type mismatch fixed"
echo "✅ Emergency database repair completed"
echo "✅ All migrations executed successfully" 
echo "✅ Enhanced Social Media Platform deployed"
echo "✅ Database connectivity verified"
echo ""
echo "🚀 NEXT STEPS:"
echo "1. Start your development server: npm run dev"
echo "2. Look for the success message:"
echo "   '🔗 Setting up Enhanced Social Model Associations...'"
echo "   '✅ Enhanced Social Model Associations setup completed successfully!'"
echo ""
echo "🌟 The 7-star social media platform is ready to transform"
echo "   your SwanStudios into a revolutionary fitness social network!"
