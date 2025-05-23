# StoreFront API Scripts Backup

These scripts have been moved to this backup directory as they are no longer needed.

The StoreFront component now uses hardcoded packages directly in the component code, eliminating the need for API and database interaction for package data.

Files were moved here on May 19, 2025 as part of the cleanup process to simplify the system architecture and eliminate API dependency for package data.

The modified approach offers several benefits:
1. No database dependency for package display
2. Consistent package pricing and details
3. Eliminated API errors and filtering issues
4. Better performance without API calls
5. Simplified maintenance - just update the component code to change packages

If you need to restore the API-driven package functionality, you can:
1. Move these MJS files back to the root directory
2. Move the seeders from backend/seeders/backup to backend/seeders
3. Move the scripts from backend/scripts/backup to backend/scripts
4. Restore the original StoreFront.component.tsx from frontend/src/pages/shop/backup

Note: This is only relevant for package data - the API itself is still active and used for other functionality.
