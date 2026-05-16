# Root Orphaned Launchers Archive - 2026-05-15

Moved `run-seeder.bat` out of the repo root because it called
`restore-swan-packages.mjs`, which is not present in the repository.

The active backend storefront seed command is now:

`cd backend && npm run seed-storefront`
