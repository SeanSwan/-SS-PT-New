@echo off
echo Starting StoreFront package updates...

cd backend

echo Running storefront seeder...
node seeders\20250516-storefront-items.mjs

echo.
echo Package updates completed!
echo.
echo Summary of changes:
echo - Session packages (1, 8, 20, 50) now in their own section
echo - Monthly packages (3, 6, 9, 12) now in their own section  
echo - Fixed double dollar sign issue
echo - Updated price display with bold formatting
echo - Corrected shimmer animation (right-top to left-bottom diagonal, 5 second interval)
echo - Removed duplicate packages
echo - Added displayOrder for proper sorting
echo.
echo Please restart the frontend to see the changes!
pause