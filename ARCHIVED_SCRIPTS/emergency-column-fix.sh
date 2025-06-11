#!/bin/bash

echo "🚨 EMERGENCY COLUMN FIX: SwanStudios Users Table"
echo "=============================================="

echo "📍 Running emergency bypass migration to add missing columns..."

# Run ONLY the emergency bypass migration first
npx sequelize-cli db:migrate --config config/config.cjs --env production --to 20250528000008-emergency-bypass-missing-columns.cjs

if [ $? -eq 0 ]; then
    echo "✅ Emergency bypass completed successfully!"
    echo "🚀 Now running all remaining migrations..."
    
    # Now run all remaining migrations
    npx sequelize-cli db:migrate --config config/config.cjs --env production
    
    if [ $? -eq 0 ]; then
        echo "🎉 ALL MIGRATIONS COMPLETED SUCCESSFULLY!"
        echo "✅ Authentication should now work"
        echo "📧 Test login: admin@test.com / admin123"
    else
        echo "❌ Some migrations may have failed, but the critical fix is applied"
        echo "📧 Try testing login anyway: admin@test.com / admin123"
    fi
else
    echo "❌ Emergency bypass failed - check the error above"
fi
