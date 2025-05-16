@echo off
echo Seeding SwanStudios Storefront Items...

cd backend

REM Run the storefront seeder
node seeders/20250516-storefront-items.mjs

echo Storefront seeding complete!

REM Confirm packages were created
echo Checking created packages...
node -e "import StorefrontItem from './models/StorefrontItem.mjs'; import './models/index.mjs'; StorefrontItem.findAll().then(items => { console.log(`Found ${items.length} storefront items:`); items.forEach(item => { console.log(`- ${item.name}: $${item.price} (${item.theme} theme)`); }); process.exit(0); }).catch(err => { console.error('Error checking packages:', err); process.exit(1); });"

pause