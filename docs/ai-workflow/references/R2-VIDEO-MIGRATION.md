# R2 Video Migration & Git History Purge

> **Date:** 2026-04-04 | **Status:** Complete (pending R2 credential setup)

## Overview

All MP4 video assets were migrated from git-tracked files to Cloudflare R2 CDN hosting. Git history was purged of all large binary files (MP4s, badge PNGs, logs, caches), reducing the repo from **1.8GB to 509MB**.

## Architecture

### Video Config: `frontend/src/config/videoAssets.ts`

Central `VIDEO` object maps keys to full URLs:

```ts
import { VIDEO } from '../config/videoAssets';

// In JSX:
<source src={VIDEO.swans} type="video/mp4" />
<ParallaxHero videoSrc={VIDEO.swan} />
<SectionVideoBackground src={VIDEO.galaxy1} />
```

**How it works:**
- Reads `VITE_R2_VIDEO_URL` env var at build time
- If set: `VIDEO.swan` → `https://pub-xxx.r2.dev/swan.mp4`
- If not set (local dev): `VIDEO.swan` → `/swan.mp4` (served from `frontend/public/`)

### Available Video Keys

| Key | File | Used In |
|-----|------|---------|
| `VIDEO.swan` | swan.mp4 (26MB) | Waiver, Contact, HeroSection |
| `VIDEO.swans` | Swans.mp4 (18MB) | HomePage hero (V3-V5), Store, Signup |
| `VIDEO.run` | Run.mp4 (20MB) | PackageCard (cardio match) |
| `VIDEO.smoke` | smoke.mp4 (38MB) | ParallaxSection, HomePage beyond-gym |
| `VIDEO.forest` | forest.mp4 (77MB) | PackageCard (nature match) |
| `VIDEO.waves` | Waves.mp4 (7MB) | About pages, Login, Newsletter, Dashboard |
| `VIDEO.fish` | fish.mp4 (8MB) | PackageCard (aqua match) |
| `VIDEO.galaxy1` | galaxy1.mp4 (8MB) | TrainerProfilesSection |
| `VIDEO.swanGolden` | swan-golden.mp4 (9MB) | Store package sections |
| `VIDEO.swanSilver` | swan-silver.mp4 (6MB) | (available, not currently used) |
| `VIDEO.swanMov2` | Swan-mov-2.mp4 (1MB) | (available, not currently used) |

### Upload Script: `scripts/upload-videos-to-r2.mjs`

```bash
# Upload all videos to R2 (requires env vars in .env)
node scripts/upload-videos-to-r2.mjs
```

Required env vars: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`

## Adding a New Video

1. Place the MP4 in `frontend/public/` (for local dev — gitignored)
2. Add a key to `VIDEO` object in `frontend/src/config/videoAssets.ts`:
   ```ts
   export const VIDEO = {
     ...existing,
     myNewVideo: video('my-new-video.mp4'),
   };
   ```
3. Add the filename to `ALL_VIDEO_FILES` array in the same file
4. Add the filename to `VIDEO_FILES` array in `scripts/upload-videos-to-r2.mjs`
5. Reference as `VIDEO.myNewVideo` in components
6. Run `node scripts/upload-videos-to-r2.mjs` to upload

## R2 Setup Steps (if not yet configured)

1. **Cloudflare Dashboard** → R2 → Create bucket `swanstudios-videos`
2. **Create API Token** → R2 → Manage R2 API Tokens → Create token with read/write
3. **Local .env:**
   ```env
   R2_ACCOUNT_ID=your_cloudflare_account_id
   R2_ACCESS_KEY_ID=your_r2_access_key
   R2_SECRET_ACCESS_KEY=your_r2_secret_key
   R2_BUCKET_NAME=swanstudios-videos
   ```
4. **Upload:** `node scripts/upload-videos-to-r2.mjs`
5. **Enable public access:** Cloudflare Dashboard → R2 → swanstudios-videos → Settings → Public access → Enable
6. **Copy the public URL** (e.g., `https://pub-abc123.r2.dev`)
7. **Render env var:** Add `VITE_R2_VIDEO_URL=https://pub-abc123.r2.dev`
8. **Redeploy** on Render

## .gitignore Rules

```gitignore
# Large media files — hosted on Cloudflare R2, not in git
frontend/public/*.mp4
frontend/src/assets/*.mp4
frontend/public/badges/
qa-audit/
```

## Git History Purge Record

Ran `git filter-repo` on 2026-04-04 to remove:
- All `*.mp4` files from every commit
- `backend/combined.log` (61MB runtime log)
- `backend/error.log`
- `frontend/.vite-cache/` (MUI sourcemaps, ~242MB)
- `archive/` directory
- `qa-screenshots/` directory
- `frontend/public/badges/` (750 PNGs, ~1.2GB)

**All commit hashes were rewritten.** Required `git push --force origin main`.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Videos blank in production | Check `VITE_R2_VIDEO_URL` is set in Render env vars and bucket has public access enabled |
| Videos blank locally | Ensure MP4 files exist in `frontend/public/` on disk |
| New video not in R2 | Add filename to both `videoAssets.ts` and `upload-videos-to-r2.mjs`, then run upload script |
| Badge images missing | Badges were purged from git — need separate R2 migration (same pattern) |
| `git push` rejected | Expected after filter-repo — use `git push --force origin main` |
| Build error about mp4 import | Change `import x from '...assets/x.mp4'` to use `VIDEO.x` from config |

## Badge Migration (TODO)

750 badge PNGs (~1.2GB) were purged from git but still exist on disk in `frontend/public/badges/`. They need the same R2 treatment:
1. Upload to R2 bucket
2. Create badge URL config (similar to videoAssets.ts)
3. Update badge references in gamification components
4. Badge files remain on disk locally but are gitignored
