@echo off
echo "=== SwanStudios StoreFront Component Update ==="
echo.

cd /d "C:\Users\ogpsw\Desktop\quick-pt\SS-PT"

echo "Creating backup of original StoreFront component..."
copy "frontend\src\pages\shop\StoreFront.component.tsx" "frontend\src\pages\shop\StoreFront.component.tsx.backup"

echo.
echo "Replacing StoreFront component with API version..."
copy "frontend\src\pages\shop\StoreFrontAPI.component.tsx" "frontend\src\pages\shop\StoreFront.component.tsx"

echo.
echo "StoreFront component successfully updated!"
echo "The new component will now fetch packages from the database."
echo.
echo "Remember to:"
echo "1. Run the database seeder first: npm run db:seed -- --seed 20241212000001-storefront-packages.cjs"
echo "2. Start the backend and frontend servers"
echo.
pause
