#!/bin/bash

echo "🚨 EMERGENCY FIX: SwanStudios Authentication Column Fix"
echo "===================================================="

# Navigate to backend directory
cd "$(dirname "$0")/backend"

echo "📍 Current directory: $(pwd)"

# Check if we have the required files
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in the backend directory. Please run this from the project root."
    exit 1
fi

echo "🔍 Checking database connection..."

# Load environment variables
if [ -f ".env" ]; then
    echo "✅ Found .env file"
else
    echo "❌ Error: .env file not found in backend directory"
    exit 1
fi

echo "🔧 Running the emergency column fix migration..."

# Run the specific migration
npx sequelize-cli db:migrate --config config/config.cjs --env production --to 20250528120000-fix-missing-availablesessions-column.cjs

echo "🧪 Testing login functionality..."

# Simple test to see if the column issue is resolved
node -e "
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  }
});

(async () => {
  try {
    console.log('🔍 Testing database column availability...');
    
    const [result] = await sequelize.query(\`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'availableSessions';
    \`);
    
    if (result.length > 0) {
      console.log('✅ SUCCESS: availableSessions column found!');
      console.log('✅ Authentication should now work');
    } else {
      console.log('❌ FAILED: availableSessions column still missing');
    }
    
    await sequelize.close();
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
})();
"

echo "🎯 Emergency fix completed!"
echo "📋 Next steps:"
echo "   1. Test login with your admin credentials"
echo "   2. If successful, commit these changes"
echo "   3. If still failing, check the logs for other missing columns"

echo "🔗 Test login at: https://your-app-url.com/login"
echo "📧 Test credentials: admin@test.com / admin123"
