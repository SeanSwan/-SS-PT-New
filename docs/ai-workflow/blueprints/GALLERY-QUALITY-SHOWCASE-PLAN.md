# Gallery Quality Showcase Card — Client-Facing Photo Quality Comparison
## SwanStudios — Show Clients the True Quality of Your Equipment

---

## Problem Statement

Clients don't understand the difference between RAW, Q95, Q92, and web-quality images. The photographer (owner) uses professional Sony equipment that captures incredible detail, but clients have no way to see or appreciate the quality difference. This leads to:
1. Clients not understanding why they might want RAW files
2. No visual proof of equipment quality for marketing/trust-building
3. No way for clients to make an informed decision about which quality tier they need

## Solution: Quality Showcase Card

A **permanent comparison card** at the top of each gallery event page (or globally). The admin uploads ONE showcase photo (e.g., a team photo or hero shot), and the system auto-generates multiple quality variants. Clients see them side-by-side with file sizes and can zoom/compare.

### User Experience Flow
```
Client opens gallery event → sees Quality Showcase card pinned at top
  → Card shows ONE photo rendered at 5 quality levels
  → Each level shows: quality label, file size, visual preview
  → Client can tap each to zoom in and compare detail
  → "Want the RAW file?" CTA → contact/request form
  → Below the card: normal photo grid (thumbnails as usual)
```

---

## Part 1: Backend — Showcase Photo Upload & Variant Generation

### New Endpoint: Upload Showcase Photo

```
POST /api/admin/gallery/events/:id/showcase-photo
Body: multipart (single file "photo")
```

**Processing pipeline:**
1. Accept the uploaded photo (JPEG or RAW)
2. Convert RAW → JPEG Q95 if needed (existing pipeline)
3. Generate **5 quality variants** from the Q95 master:

| Variant | Sharp Quality | Est. Size (6000×4000) | Label for Client | Key Suffix |
|---------|-------------|---------------------|------------------|------------|
| `q95` | Q95 | 8-12MB | "Studio Master" | `_showcase_q95.jpg` |
| `q94` | Q94 | 7-10MB | "Premium Print" | `_showcase_q94.jpg` |
| `q93` | Q93 | 6-9MB | "High Quality" | `_showcase_q93.jpg` |
| `q92` | Q92 | 4-6MB | "Gallery Standard" | `_showcase_q92.jpg` |
| `q80` | Q80, 1200px | 200-400KB | "Web Preview" | `_showcase_q80.jpg` |

4. Also generate a **crop comparison** — a 400×400 center crop at each quality level so clients can see detail differences without downloading the full image:

| Variant | Processing | Est. Size | Key Suffix |
|---------|-----------|-----------|------------|
| `crop_q95` | Center crop 800×800, serve at 400px | ~80KB | `_showcase_crop_q95.jpg` |
| `crop_q92` | Center crop 800×800, serve at 400px | ~50KB | `_showcase_crop_q92.jpg` |
| `crop_q80` | Center crop 800×800, serve at 400px | ~25KB | `_showcase_crop_q80.jpg` |

5. Upload all variants to R2
6. Store metadata in new `showcase_photos` table OR as a JSONB field on GalleryEvent

### Sharp Processing Code

```javascript
async function generateShowcaseVariants(inputBuffer) {
  const metadata = await sharp(inputBuffer).metadata();
  const { width, height } = metadata;

  // Full-size at different quality levels
  const qualities = [
    { key: 'q95', quality: 95, label: 'Studio Master' },
    { key: 'q94', quality: 94, label: 'Premium Print' },
    { key: 'q93', quality: 93, label: 'High Quality' },
    { key: 'q92', quality: 92, label: 'Gallery Standard' },
    { key: 'q80', quality: 80, label: 'Web Preview', maxWidth: 1200 },
  ];

  const variants = {};
  for (const q of qualities) {
    let pipeline = sharp(inputBuffer);
    if (q.maxWidth) {
      pipeline = pipeline.resize(q.maxWidth, null, { fit: 'inside', withoutEnlargement: true });
    }
    const buffer = await pipeline
      .jpeg({ quality: q.quality, progressive: true, mozjpeg: true })
      .toBuffer();
    variants[q.key] = { buffer, size: buffer.length, label: q.label, quality: q.quality };
  }

  // Center crops for detail comparison (800×800 from center, served at 400px)
  const cropSize = Math.min(800, width, height);
  const cropLeft = Math.round((width - cropSize) / 2);
  const cropTop = Math.round((height - cropSize) / 2);

  const cropQualities = [
    { key: 'crop_q95', quality: 95 },
    { key: 'crop_q92', quality: 92 },
    { key: 'crop_q80', quality: 80 },
  ];

  for (const q of cropQualities) {
    const buffer = await sharp(inputBuffer)
      .extract({ left: cropLeft, top: cropTop, width: cropSize, height: cropSize })
      .resize(400, 400)
      .jpeg({ quality: q.quality, progressive: true })
      .toBuffer();
    variants[q.key] = { buffer, size: buffer.length, quality: q.quality };
  }

  return { variants, width, height };
}
```

### Database Schema

**Option A: JSONB on GalleryEvent** (simpler, recommended)
```sql
ALTER TABLE gallery_events ADD COLUMN showcase_data JSONB;
```

The `showcase_data` field stores:
```json
{
  "enabled": true,
  "originalFilename": "team-photo-2026.ARW",
  "sourceType": "raw",
  "width": 6000,
  "height": 4000,
  "rawAvailable": true,
  "variants": {
    "q95": { "url": "https://r2.../showcase_q95.jpg", "key": "gallery/slug/showcase_q95.jpg", "size": 9500000, "label": "Studio Master" },
    "q94": { "url": "...", "key": "...", "size": 8200000, "label": "Premium Print" },
    "q93": { "url": "...", "key": "...", "size": 7100000, "label": "High Quality" },
    "q92": { "url": "...", "key": "...", "size": 5300000, "label": "Gallery Standard" },
    "q80": { "url": "...", "key": "...", "size": 320000, "label": "Web Preview" }
  },
  "crops": {
    "crop_q95": { "url": "...", "size": 82000 },
    "crop_q92": { "url": "...", "size": 51000 },
    "crop_q80": { "url": "...", "size": 24000 }
  },
  "uploadedAt": "2026-03-12T..."
}
```

### API Endpoints

```
POST   /api/admin/gallery/events/:id/showcase-photo   — Upload showcase photo (admin)
DELETE /api/admin/gallery/events/:id/showcase-photo   — Remove showcase (admin)
GET    /api/gallery/:slug/showcase                     — Get showcase data (public, requires gallery access)
```

### Files to Create/Modify

| File | Change |
|------|--------|
| `backend/services/showcaseService.mjs` (NEW) | `generateShowcaseVariants()` function |
| `backend/routes/adminGalleryRoutes.mjs` | Add POST/DELETE showcase endpoints |
| `backend/routes/galleryRoutes.mjs` | Add GET showcase endpoint |
| `backend/models/GalleryEvent.mjs` | Add `showcaseData` JSONB column |
| `backend/migrations/XXXX-add-showcase-to-gallery-events.cjs` | Migration |

---

## Part 2: Frontend — Quality Showcase Card Component

### Design (Crystalline Swan Theme)

The card sits **pinned at the top** of the photo grid, spanning full width. It uses the luxury vault aesthetic:

```
╔══════════════════════════════════════════════════════════════════════╗
║  📷 EQUIPMENT QUALITY SHOWCASE                                      ║
║  Shot with Sony A7 series · SwanStudios Professional Photography    ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            ║
║  │ CROP Q95 │  │ CROP Q92 │  │ CROP Q80 │  │ ORIGINAL │            ║
║  │ (detail) │  │ (detail) │  │ (detail) │  │  (zoom)  │            ║
║  └──────────┘  └──────────┘  └──────────┘  └──────────┘            ║
║                                                                      ║
║  ┌─────────────────────────────────────────────────────────────┐    ║
║  │                    QUALITY COMPARISON                        │    ║
║  │                                                              │    ║
║  │  Studio Master (Q95)    ████████████████████████  9.5 MB    │    ║
║  │  Premium Print (Q94)    ███████████████████████   8.2 MB    │    ║
║  │  High Quality (Q93)     ██████████████████████    7.1 MB    │    ║
║  │  Gallery Standard (Q92) █████████████████████     5.3 MB    │    ║
║  │  Web Preview (Q80)      ██                        320 KB    │    ║
║  │                                                              │    ║
║  └─────────────────────────────────────────────────────────────┘    ║
║                                                                      ║
║  "All gallery photos are delivered in Gallery Standard (Q92)         ║
║   quality with SwanStudios watermark. Need higher quality or         ║
║   the original RAW file? Request below."                             ║
║                                                                      ║
║  [ 🔽 Download Q95 Sample ]  [ 📧 Request RAW File ]               ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
```

### Component: `QualityShowcaseCard.tsx`

Key features:
- **Crop comparison row**: 3 center crops (Q95, Q92, Q80) side-by-side so clients can see detail degradation — these are tiny (~50KB each) so they load instantly
- **File size comparison bars**: Visual bars showing relative file sizes with labels
- **Tap-to-zoom**: Tap any crop to see it larger in a mini-lightbox
- **Download Q95 sample**: Let clients download the Q95 version to see full quality on their device
- **Request RAW CTA**: Links to contact form or triggers an enhancement request
- **Mobile responsive**: Crops stack vertically on 375px, bars stay readable
- **Crystalline Swan styling**: Midnight Sapphire card, Gilded Fern accent on quality labels, Ice Wing glow on the "Studio Master" tier

### Frontend Files

| File | Purpose |
|------|---------|
| `frontend/src/pages/gallery/QualityShowcaseCard.tsx` (NEW) | The showcase card component |
| `frontend/src/pages/GalleryPage.tsx` | Render showcase card above photo grid |

---

## Part 3: Admin Upload Interface

### Admin Gallery Panel Addition

In the admin gallery event detail view, add a "Quality Showcase" section:

```
┌─────────────────────────────────────────┐
│ 📷 Quality Showcase                      │
│                                          │
│ [No showcase photo set]                  │
│                                          │
│ Upload a sample photo to show clients    │
│ the quality difference between formats.  │
│                                          │
│ [ Choose File ] [ Upload Showcase ]      │
│                                          │
│ ☑ Mark RAW as available for this event   │
└─────────────────────────────────────────┘
```

After upload:
```
┌─────────────────────────────────────────┐
│ 📷 Quality Showcase ✅                   │
│                                          │
│ team-photo-2026.ARW → 5 variants        │
│ Q95: 9.5MB | Q94: 8.2MB | Q93: 7.1MB   │
│ Q92: 5.3MB | Q80: 320KB                 │
│ + 3 detail crops                         │
│                                          │
│ [ Replace Photo ] [ Remove Showcase ]    │
└─────────────────────────────────────────┘
```

---

## Part 4: RAW File Request Flow

When a client clicks "Request RAW File":
1. Creates an `EnhancementRequest` with type `'raw_request'`
2. Sends admin notification (via existing Business Intelligence Alerts)
3. Admin can then manually share the RAW file (from their local archive) or upload it per-client
4. This avoids storing 150MB RAW files in R2 for every photo

---

## Performance Considerations

- Showcase crops are ~50-80KB each — load instantly
- Full-size variants are only downloaded on explicit "Download" click
- Showcase data is fetched in a single API call (JSONB field)
- No impact on regular gallery grid performance

## Verification Checklist
- [ ] Admin can upload a showcase photo (JPEG or RAW)
- [ ] System generates 5 quality variants + 3 crops automatically
- [ ] Client gallery shows showcase card above photo grid
- [ ] Crop comparison loads instantly (<100ms)
- [ ] File size bars render correctly with accurate sizes
- [ ] "Download Q95 Sample" works (streams from R2)
- [ ] "Request RAW File" creates enhancement request + admin alert
- [ ] Admin can replace or remove showcase photo
- [ ] Mobile responsive at 375px (crops stack, bars readable)
- [ ] Showcase card uses Crystalline Swan theme tokens
