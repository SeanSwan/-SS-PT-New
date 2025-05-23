#!/bin/bash

# Clean Development Server Launcher
# This script ensures a clean startup without any interference from the problematic scripts

echo "🧹 CLEANING ENVIRONMENT..."

# Clear any problematic localStorage items that might interfere
echo "🔄 Clearing browser localStorage flags..."

# Create a simple HTML page to clear localStorage
cat > clear-storage.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Clearing Storage</title>
</head>
<body>
    <h1>Clearing problematic localStorage...</h1>
    <script>
        // Clear all the problematic flags
        const keysToRemove = [
            'bypass_admin_verification',
            'use_emergency_admin_route', 
            'admin_emergency_mode',
            'skip_hooks_verification',
            'circuit_breaker_active',
            'emergency_fallback_mode',
            'hooks_recovery_active',
            'breaking_hooks_loop',
            'fixing_hooks_error'
        ];
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            console.log('Removed:', key);
        });
        
        console.log('✅ localStorage cleaned');
        document.body.innerHTML += '<p>✅ localStorage cleaned successfully!</p>';
        document.body.innerHTML += '<p>You can now close this tab and start the development server.</p>';
    </script>
</body>
</html>
EOF

echo "📄 Created clear-storage.html - Open this in your browser first to clear problematic flags"
echo ""
echo "🚀 To start the development server:"
echo "   1. Open clear-storage.html in your browser"
echo "   2. Run: npm run dev"
echo ""
echo "✅ The admin dashboard should now load without infinite loops!"
