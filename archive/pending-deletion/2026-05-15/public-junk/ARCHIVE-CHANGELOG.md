# Public Junk Archive - 2026-05-15

## Scope

Moved deployable public-folder files that are not part of the Render/Vite production runtime into archive so they no longer ship with the site.

## Archived Files

- `frontend/public/.htaccess` - Apache-only config; Render/Vite does not use it.
- `frontend/public/clear-cache.js` - ad hoc cache utility, not a production app asset.
- `frontend/public/emergency-bootstrap.html` - standalone emergency page outside the route tree.
- `frontend/public/react.svg` - Vite starter asset.
- `frontend/public/test-routing.html` - standalone routing test page.
- `frontend/public/vercel.json` - Vercel config in a Render deployment.
- `frontend/public/VIDEO_POSTER_MISSING.md` - note file, not a public asset.
- `frontend/public/vite.svg` - Vite starter asset.

## Kept In Place

Production public assets, favicons, metadata, service worker files, `_headers`, and `_redirects` remain in `frontend/public`.
