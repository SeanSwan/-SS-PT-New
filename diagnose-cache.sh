#!/bin/bash

echo "=== SwanStudios Cache Diagnosis ==="
echo "Timestamp: $(date)"

# Check current directory structure
echo ""
echo "1. Current working directory:"
pwd

echo ""
echo "2. Project structure:"
find . -name "*.js" -o -name "*.html" -o -name "index.html" | head -20

echo ""
echo "3. Frontend dist directory contents:"
if [ -d "frontend/dist" ]; then
    echo "✓ frontend/dist exists"
    ls -la frontend/dist/
    echo ""
    echo "JavaScript files:"
    find frontend/dist -name "*.js" -exec basename {} \;
else
    echo "✗ frontend/dist does not exist"
fi

echo ""
echo "4. Backend static file paths being checked:"
cd backend
node -e "
const path = require('path');
const fs = require('fs');
const __dirname = process.cwd();
const possiblePaths = [
    path.join(__dirname, '..', 'frontend', 'dist'),
    path.join(__dirname, '..', '..', 'frontend', 'dist'),
    path.join(__dirname, 'frontend', 'dist'),
    '/opt/render/project/src/frontend/dist'
];

possiblePaths.forEach(p => {
    console.log(\`Checking: \${p}\`);
    console.log(\`Exists: \${fs.existsSync(p)}\`);
    if (fs.existsSync(p)) {
        console.log(\`Contents: \${fs.readdirSync(p).join(', ')}\`);
    }
    console.log('---');
});
"

echo ""
echo "5. Environment check:"
echo "NODE_ENV: $NODE_ENV"
echo "PWD: $PWD"

echo "=== End Diagnosis ==="
