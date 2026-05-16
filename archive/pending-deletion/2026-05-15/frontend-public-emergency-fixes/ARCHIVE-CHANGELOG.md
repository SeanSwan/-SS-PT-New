# Public Emergency Fixes Archive

Archived during the 2026-05-15 cleanup pass.

## Why These Files Moved

`frontend/public/emergency-fixes/` was no longer referenced by `frontend/index.html` or active source files. Keeping disabled emergency scripts in `public/` risks shipping stale patch code with the site and confusing future debugging.

## Files

- `emergency-fixes/admin-dashboard-emergency-fix.js`

## Restore Rule

Do not restore as public static code. If a fix is still needed, rebuild it as typed source code and mount it through the normal application route/component tree.
