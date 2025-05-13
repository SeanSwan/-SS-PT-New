@echo off
echo "=== SwanStudios Package Database Seeder ==="
echo.

cd /d "C:\Users\ogpsw\Desktop\quick-pt\SS-PT"

echo "Running database seeder for storefront packages..."
echo.

npx sequelize-cli db:seed --seed 20241212000001-storefront-packages.cjs

echo.
echo "=== Seeding Complete ==="
pause
