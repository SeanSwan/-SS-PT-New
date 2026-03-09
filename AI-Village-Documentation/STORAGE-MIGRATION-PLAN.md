# Storage Migration Plan: Move All Uploads to Cloudflare R2

## The Problem

Render uses **ephemeral disk** — any file written to the local filesystem is **deleted on every deploy**. Three upload features currently write to local disk, meaning user content disappears whenever the site redeploys.

## Current State (March 2026)

| Feature | Storage | Persists? | File |
|---------|---------|-----------|------|
| Profile photos | **R2** | Yes | `backend/routes/profileRoutes.mjs` |
| Banner photos | **R2** | Yes | `backend/routes/profileRoutes.mjs` |
| Measurement photos | **R2** | Yes | `backend/routes/bodyMeasurementRoutes.mjs` |
| **Social post images** | **Local disk** | **NO** | `backend/routes/social/posts.mjs` |
| **Challenge images** | **Local disk** | **NO** | `backend/routes/social/challenges.mjs` |
| **Exercise videos** | **Local disk** | **NO** | `backend/routes/videoLibraryRoutes.mjs` |

## Why Cloudflare R2 Is the Cheapest Option

| | Cloudflare R2 | AWS S3 | Render Persistent Disk |
|---|---|---|---|
| Storage | $0.015/GB/mo | $0.023/GB/mo | $0.25/GB/mo |
| Bandwidth (egress) | **FREE** | $0.09/GB after 100GB | Included but slow |
| 10GB photos cost | $0.15/mo | $0.23/mo + egress | $2.50/mo |
| 100GB videos cost | $1.50/mo | $2.30/mo + egress | $25/mo |

R2's free egress is the killer feature. A fitness/social platform serves the same photos and videos over and over — that bandwidth cost adds up fast on S3 but stays $0 on R2.

**R2 is already configured on this project.** The env vars are set on Render:
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`

## How the Working Pattern Looks (Profile/Banner Photos)

This is the pattern that already works in production:

```
1. Frontend sends file via FormData POST
2. Multer uses memoryStorage() to hold file in RAM as a Buffer
3. Route handler calls photoStorageService.uploadPhoto(buffer, opts)
4. photoStorageService uploads buffer to R2 via @aws-sdk/client-s3
5. Returns URL: /api/serve-photo/photos/{category}/{userId}/{YYYY-MM}/{uuid}.ext
6. URL is stored in the database
7. When browser requests that URL, the /api/serve-photo/* route:
   - Generates a presigned R2 GET URL (1-hour expiry)
   - 302 redirects the browser to it
   - Browser loads image directly from R2's CDN
```

Key files:
- `backend/services/photoStorageService.mjs` — upload/delete logic
- `backend/services/r2StorageService.mjs` — R2 client, presigned URL generation
- `backend/core/routes.mjs` (line 360) — `/api/serve-photo/*` proxy route

## What Needs to Change

### Fix 1: Social Post Images (CRITICAL — user-facing)

**File:** `backend/routes/social/posts.mjs` (~line 183-213)

**Current (broken):**
```javascript
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.cwd(), 'uploads', 'social');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });
```

**Change to:**
```javascript
import { uploadPhoto } from '../../services/photoStorageService.mjs';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    cb(null, allowed.includes(file.mimetype));
  }
});
```

**Then in the route handler**, replace the local file path with an R2 upload:
```javascript
// OLD: mediaUrl = `/uploads/social/${req.file.filename}`;
// NEW:
const result = await uploadPhoto(req.file.buffer, {
  userId: req.user.id,
  category: 'social',
  originalFilename: req.file.originalname,
  contentType: req.file.mimetype,
});
const mediaUrl = result.url; // "/api/serve-photo/photos/social/57/2026-03/uuid.jpg"
```

**Also update:**
- `photoStorageService.mjs` — add `'social'` to the category list
- `routes.mjs` line 365 — add `'social'` to the allowed categories array:
  ```javascript
  if (!['profiles', 'banners', 'measurements', 'social', 'challenges'].includes(category))
  ```

### Fix 2: Challenge Images (same pattern)

**File:** `backend/routes/social/challenges.mjs` (~line 18-47)

Same change: `multer.diskStorage()` → `multer.memoryStorage()` + `uploadPhoto()` with `category: 'challenges'`.

### Fix 3: Exercise Videos (larger files — different approach)

**File:** `backend/routes/videoLibraryRoutes.mjs` (~line 52-65)

Videos can be up to 500MB. Buffering that in server RAM is dangerous. Two options:

**Option A: Presigned Upload URL (recommended for large files)**
1. Frontend requests a presigned PUT URL from the backend
2. Frontend uploads directly to R2 using that URL (bypasses server entirely)
3. Frontend tells backend the upload is complete
4. Backend verifies the object exists in R2 and stores the URL

This is what `r2StorageService.mjs` already supports via `generateUploadUrl()`.

**Option B: Stream through server (simpler but uses more RAM)**
Use multer's memoryStorage with a higher limit, upload the buffer to R2. Only viable for smaller videos (<50MB).

## Serve Route Update

The `/api/serve-photo/*` route in `routes.mjs` needs the category whitelist expanded:

```javascript
// Line 365 in routes.mjs — add 'social' and 'challenges'
if (!['profiles', 'banners', 'measurements', 'social', 'challenges'].includes(category) ||
```

## Verification Checklist

After making changes:

- [ ] Upload a social post with an image — verify it appears in the feed
- [ ] Redeploy the backend — verify the image still loads after redeploy
- [ ] Upload a challenge image — verify it persists after redeploy
- [ ] Check R2 bucket in Cloudflare dashboard — confirm objects appear under `photos/social/` and `photos/challenges/`
- [ ] Test delete post — verify the R2 object is cleaned up (best-effort)
- [ ] Check no local files accumulate in `/uploads/social/` or `/uploads/challenges/`

## R2 Bucket Structure After Migration

```
swanstudios/
├── photos/
│   ├── profiles/     ← profile photos (working)
│   │   └── {userId}/{YYYY-MM}/{uuid}.jpg
│   ├── banners/      ← banner photos (working)
│   │   └── {userId}/{YYYY-MM}/{uuid}.jpg
│   ├── measurements/ ← body measurement photos (working)
│   │   └── {userId}/{YYYY-MM}/{uuid}.jpg
│   ├── social/       ← NEW: social post images
│   │   └── {userId}/{YYYY-MM}/{uuid}.jpg
│   └── challenges/   ← NEW: challenge images
│       └── {userId}/{YYYY-MM}/{uuid}.jpg
├── videos/           ← exercise/admin videos (r2StorageService)
│   └── {creatorId}/{YYYY-MM}/{uuid}.mp4
└── thumbnails/       ← video thumbnails (r2StorageService)
    └── {videoId}/{uuid}.jpg
```

## Priority Order

1. **Social post images** — users will upload these daily, most visible impact
2. **Challenge images** — less frequent but still user-facing
3. **Exercise videos** — admin-only uploads, can use presigned URL pattern

## Estimated Monthly R2 Cost

For a small-to-medium fitness platform:
- 500 social post images (~2MB avg) = 1GB → $0.015/mo
- 50 profile/banner photos = 0.1GB → negligible
- 10 exercise videos (~100MB avg) = 1GB → $0.015/mo
- Bandwidth to serve all of this = **$0.00**
- **Total: ~$0.03/month** until you scale to thousands of users

---

## Cloudflare Domain Setup (sswanstudios.com)

You're in the process of moving `sswanstudios.com` DNS to Cloudflare. This is separate from R2 storage — it puts Cloudflare's CDN and DDoS protection in front of your entire site. Here's what's happening and what you need to do.

### What Cloudflare Is Asking

Cloudflare needs you to change your domain's **nameservers** at your registrar (wherever you bought `sswanstudios.com` — GoDaddy, Namecheap, Google Domains, etc.) to point to Cloudflare's nameservers instead.

### Step-by-Step

**1. Find Your Cloudflare Nameservers**

On the Cloudflare dashboard for `sswanstudios.com`, click **"Show nameserver instructions"**. It will show you two nameservers like:
```
ns1.cloudflare.com   (example — yours will be specific to your account)
ns2.cloudflare.com
```

**2. Update Nameservers at Your Registrar**

Log in to your domain registrar and find the nameserver settings:

| Registrar | Where to find it |
|-----------|-----------------|
| **GoDaddy** | My Products → Domain → DNS → Nameservers → Change |
| **Namecheap** | Domain List → Manage → Nameservers → Custom DNS |
| **Google Domains** | My domains → DNS → Custom name servers |
| **Squarespace Domains** | Domains → DNS Settings → Nameservers |

Replace the existing nameservers with the two Cloudflare gave you. Save.

**3. Wait for Propagation (1-24 hours)**

Cloudflare says 1-2 hours typical, up to 24 hours. You'll get an email from Cloudflare when it's active. **Your site will stay live during this time** — DNS propagation is gradual.

**4. After Activation — Configure These Settings**

Once Cloudflare confirms the domain is active:

**SSL/TLS Settings:**
- Go to **SSL/TLS** → Set mode to **"Full (strict)"**
  - This means: Browser → Cloudflare (HTTPS) → Render (HTTPS)
  - Your Render service already has SSL, so "Full (strict)" is correct
  - Do NOT use "Flexible" — that would send unencrypted traffic to Render

**DNS Records to Verify:**
- Go to **DNS** → Make sure these records exist:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| CNAME | `sswanstudios.com` | Your Render static site URL (e.g., `swanstudios-frontend.onrender.com`) | Proxied (orange cloud) |
| CNAME | `www` | `sswanstudios.com` | Proxied (orange cloud) |

- The **orange cloud icon** (Proxied) means traffic flows through Cloudflare's CDN — this is what you want
- If it shows a **grey cloud** (DNS only), click it to toggle to Proxied

**Page Rules (optional but recommended):**
- `http://sswanstudios.com/*` → Always Use HTTPS
- `http://www.sswanstudios.com/*` → Always Use HTTPS

**Caching:**
- Cloudflare will automatically cache static assets (JS, CSS, images)
- Your API calls (`/api/*`) won't be cached because they return `application/json`
- R2 presigned URL redirects will work fine — the 302 redirect itself passes through, and the browser fetches directly from R2

### What This Gets You (Free Plan)

- **CDN** — static assets served from Cloudflare edge (faster for users worldwide)
- **DDoS protection** — automatic, always-on
- **Free SSL certificate** — auto-renewed
- **Analytics** — basic traffic stats in Cloudflare dashboard
- **Bot protection** — basic bot filtering

### Important: Don't Enable These Yet

- **Under Attack Mode** — Only turn this on if you're actually getting attacked. It shows a challenge page to every visitor which hurts UX.
- **Rocket Loader** — Can break React apps. Leave it OFF.
- **Auto Minify** — Your Vite build already minifies. Leave it OFF to avoid double-minification bugs.
- **Email Obfuscation** — Can break mailto: links in your React app. Test carefully before enabling.

### Your Cloudflare Account IDs (for reference)

```
Zone ID:    e83a2263111ed62dbce8242ee51f564b
Account ID: 00062863da686214f49dcee63174ac13
```

These are NOT secrets — they identify your zone/account but can't be used to make changes without an API token. They're already used in your R2 configuration.

### How This Relates to R2

Your R2 bucket is already under this same Cloudflare account (Account ID `00062863da686214f49dcee63174ac13`). Once the domain is on Cloudflare, you could optionally:

1. **Set R2_PUBLIC_URL** — Create a custom domain for your R2 bucket (e.g., `media.sswanstudios.com`) via Cloudflare dashboard → R2 → Settings → Custom Domains
2. This would let photos load directly from `media.sswanstudios.com/photos/...` instead of going through the `/api/serve-photo/` proxy
3. **This is optional** — the current proxy approach works fine and is simpler. The main benefit of a custom domain would be slightly faster image loads (no 302 redirect hop)

### Troubleshooting

**Site goes down after nameserver change:**
- Check DNS records in Cloudflare match your old records
- Make sure CNAME for root domain points to Render's URL
- Check SSL mode is "Full (strict)", not "Flexible"

**API calls fail with 522/524 errors:**
- Cloudflare can't reach your Render backend
- Check that the backend service is running on Render
- These are timeout errors — Render's free tier can cold-start

**Images/R2 photos stop loading:**
- Check CSP headers allow Cloudflare domains
- The current CSP already allows `https://*.r2.cloudflarestorage.com` and `https://*.r2.dev`
- If you add a custom R2 domain, add it to CSP too
