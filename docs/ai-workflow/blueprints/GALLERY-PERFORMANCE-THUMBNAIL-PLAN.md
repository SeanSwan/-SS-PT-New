# Gallery Performance & Thumbnail Generation Plan
## SwanStudios — Fast Gallery Loading with HQ JPEG-Only Pipeline

---

## Problem Statement

The gallery page loads **72 photos at ~8-12MB each** (full JPEG Q95), totaling **~720MB** of image data for one event. This causes:
1. **30-60+ second page load times** — browser downloads every full-size image for the grid view
2. **Mobile unusability** — cellular connections can't handle 720MB of images
3. **No thumbnails exist** — `thumbnailUrl === url` (both point to the same full-size JPEG)
4. **RAW files were uploaded** — while they're converted to JPEG Q95 on upload, the resulting 8-12MB files are served directly in the grid
5. **Width/height not extracted** — causes layout shift (CLS) as images pop in at unknown sizes

### Current Architecture (Broken for Performance)
```
Upload: RAW/JPEG → convert to JPEG Q95 → watermark → R2 (single file)
Serve:  Grid view loads full 8-12MB JPEG per photo
        Detail modal loads same 8-12MB JPEG
        No thumbnail, no responsive sizing
```

### Target Architecture
```
Upload: RAW/JPEG → convert to JPEG Q95 → watermark → R2 (full-size)
                 → generate thumbnail (400px wide, Q80) → R2 (thumbnail)
                 → generate medium (1200px wide, Q85) → R2 (medium)
                 → extract width/height → save to DB
Serve:  Grid view loads 30-60KB thumbnail per photo (400px wide)
        Detail modal loads 200-400KB medium (1200px wide)
        Download button serves original full-size JPEG
        72 photos: ~720MB → ~3.6MB grid load (200x improvement)
```

---

## Part 1: Thumbnail Generation on Upload

### New Image Processing Pipeline

For every photo uploaded (via any of the 3 upload paths), generate 3 variants:

| Variant | Max Width | Quality | Est. Size | Use Case |
|---------|-----------|---------|-----------|----------|
| `thumb` | 400px | Q80 | 30-60KB | Grid view, event cards |
| `medium` | 1200px | Q85 | 200-400KB | Detail modal, lightbox |
| `full` | Original | Q95 | 5-12MB | Download, print, client request |

### R2 Storage Keys
```
gallery/{slug}/{photoNumber}.jpg          ← full (existing, unchanged)
gallery/{slug}/{photoNumber}_thumb.jpg    ← NEW: thumbnail
gallery/{slug}/{photoNumber}_medium.jpg   ← NEW: medium
```

### Sharp Processing Code
```javascript
import sharp from 'sharp';

async function generateVariants(inputBuffer, storageKeyBase) {
  const metadata = await sharp(inputBuffer).metadata();
  const { width, height } = metadata;

  // Thumbnail: 400px wide, Q80, progressive JPEG
  const thumbBuffer = await sharp(inputBuffer)
    .resize(400, null, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80, progressive: true, mozjpeg: true })
    .toBuffer();

  // Medium: 1200px wide, Q85, progressive JPEG
  const mediumBuffer = await sharp(inputBuffer)
    .resize(1200, null, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85, progressive: true, mozjpeg: true })
    .toBuffer();

  return {
    thumb: { buffer: thumbBuffer, key: `${storageKeyBase}_thumb.jpg` },
    medium: { buffer: mediumBuffer, key: `${storageKeyBase}_medium.jpg` },
    width,
    height,
  };
}
```

### Database Schema Updates
```sql
-- Add columns to GalleryPhoto
ALTER TABLE "GalleryPhotos" ADD COLUMN "mediumKey" VARCHAR(500);
ALTER TABLE "GalleryPhotos" ADD COLUMN "mediumUrl" TEXT;
ALTER TABLE "GalleryPhotos" ADD COLUMN "thumbKey" VARCHAR(500);
-- width and height columns already exist but are always null
-- thumbnailKey and thumbnailUrl already exist but equal storageKey/url
```

### Upload Path Modifications

All 3 upload paths need the same post-processing:

```javascript
// After converting to JPEG Q95 and watermarking:
const variants = await generateVariants(processedBuffer, storageKeyBase);

// Upload all 3 to R2
await Promise.all([
  uploadToR2(storageKeyBase + '.jpg', processedBuffer),          // full
  uploadToR2(storageKeyBase + '_thumb.jpg', variants.thumb.buffer),  // thumb
  uploadToR2(storageKeyBase + '_medium.jpg', variants.medium.buffer), // medium
]);

// Save to DB with correct URLs
await GalleryPhoto.create({
  ...photoData,
  url: fullUrl,
  thumbnailUrl: thumbUrl,        // NOW different from url
  thumbnailKey: thumbKey,
  mediumUrl: mediumUrl,
  mediumKey: mediumKey,
  width: variants.width,
  height: variants.height,
});
```

### Files to Modify
| File | Change |
|------|--------|
| `backend/routes/adminGalleryRoutes.mjs` | Add variant generation after JPEG conversion in all 3 upload paths |
| `backend/models/GalleryPhoto.mjs` | Add `mediumKey`, `mediumUrl`, `thumbKey` columns |
| `backend/migrations/XXXX-add-gallery-thumbnail-columns.cjs` | New migration for schema |

---

## Part 2: Retroactive Thumbnail Generation (Existing 72 Photos)

### One-Time Migration Script

Process all existing photos that have `thumbnailUrl === url` (no real thumbnail):

```javascript
// scripts/generate-gallery-thumbnails.mjs
import sharp from 'sharp';
import { GalleryPhoto } from '../backend/models/index.mjs';

async function migrateExistingPhotos() {
  const photos = await GalleryPhoto.findAll({
    where: {
      // Photos without real thumbnails
      [Op.or]: [
        { thumbnailUrl: { [Op.eq]: Sequelize.col('url') } },
        { thumbnailUrl: null },
        { mediumUrl: null },
      ]
    }
  });

  console.log(`Found ${photos.length} photos to process`);

  for (const photo of photos) {
    try {
      // Download full image from R2
      const fullBuffer = await downloadFromR2(photo.storageKey);

      // Generate variants
      const storageKeyBase = photo.storageKey.replace('.jpg', '');
      const variants = await generateVariants(fullBuffer, storageKeyBase);

      // Upload thumb + medium to R2
      await uploadToR2(`${storageKeyBase}_thumb.jpg`, variants.thumb.buffer);
      await uploadToR2(`${storageKeyBase}_medium.jpg`, variants.medium.buffer);

      // Update DB
      await photo.update({
        thumbnailUrl: buildUrl(`${storageKeyBase}_thumb.jpg`),
        thumbnailKey: `${storageKeyBase}_thumb.jpg`,
        mediumUrl: buildUrl(`${storageKeyBase}_medium.jpg`),
        mediumKey: `${storageKeyBase}_medium.jpg`,
        width: variants.width,
        height: variants.height,
      });

      console.log(`✅ ${photo.displayName} → thumb: ${variants.thumb.buffer.length}B, medium: ${variants.medium.buffer.length}B`);
    } catch (err) {
      console.error(`❌ ${photo.displayName}: ${err.message}`);
    }
  }
}
```

### Memory-Safe Processing
- Process **one photo at a time** (not parallel) to stay within Render's 512MB limit
- Each full image ~12MB in memory, variants ~2MB = ~14MB peak per photo
- Explicit `gc()` after every 10 photos
- Total time estimate: 72 photos × ~3s each = ~4 minutes

---

## Part 3: Frontend — Serve Thumbnails in Grid, Medium in Modal

### Grid View Changes (GalleryPage.tsx)

```tsx
// BEFORE: loads full 8-12MB image in grid
<PhotoImg src={photo.thumbnailUrl || photo.url} />

// AFTER: loads 30-60KB thumbnail in grid
<PhotoImg
  src={photo.thumbnailUrl || photo.url}  // thumbnailUrl NOW points to _thumb.jpg
  width={photo.width || undefined}
  height={photo.height || undefined}
  style={{ aspectRatio: photo.width && photo.height ? `${photo.width}/${photo.height}` : undefined }}
/>
```

Since `thumbnailUrl` will now actually point to the thumbnail (not the full image), the existing `src={photo.thumbnailUrl || photo.url}` code will automatically serve thumbnails. No frontend grid changes needed beyond adding aspect ratio.

### Detail Modal Changes (PhotoDetailModal.tsx)

```tsx
// BEFORE: loads same full image as grid
<img src={photo.url} />

// AFTER: loads medium (200-400KB) for viewing, full only for download
<img src={photo.mediumUrl || photo.url} />

// Download button still serves full
<a href={photo.url} download>Download Full Resolution</a>
```

### Files to Modify
| File | Change |
|------|--------|
| `frontend/src/pages/GalleryPage.tsx` | Add width/height for CLS prevention, aspect ratio |
| `frontend/src/pages/gallery/PhotoDetailModal.tsx` | Use mediumUrl for display, url for download |

---

## Part 4: RAW File Policy — HQ JPEG Only

### Owner's Decision: No RAW storage unless client requests

**Policy:**
- Accept RAW uploads → convert to JPEG Q95 → store JPEG only (current behavior)
- Do NOT store the original RAW file in R2 (saves massive storage costs)
- `sourceType` column tracks original format for display ("Captured in RAW" badge)
- If a client requests RAW: re-upload from photographer's local archive

### Upload Size Reduction
| Current (RAW upload) | After (JPEG-only policy) |
|---------------------|------------------------|
| Upload: 120-150MB RAW file | Upload: 5-15MB HQ JPEG |
| Server process: 30-60s (dcraw → sharp) | Server process: 2-5s (sharp resize only) |
| R2 storage: 8-12MB processed JPEG | R2 storage: 8-12MB full + 400KB thumb + medium |
| Bandwidth per grid photo: 8-12MB | Bandwidth per grid photo: 30-60KB |

### Recommendation for Photographer Workflow
1. Export from Lightroom/Capture One as JPEG Q95, max 4000px wide
2. Upload the HQ JPEG (not the RAW)
3. System generates thumb + medium automatically
4. Result: 5-8s upload per photo vs 30-60s for RAW

---

## Part 5: Additional Performance Enhancements

### 5A: Progressive JPEG (Already in Plan)
All generated variants use `progressive: true` in sharp options. Progressive JPEGs render a blurry preview immediately, then sharpen — much better perceived performance.

### 5B: Cache Headers on R2
```
Cache-Control: public, max-age=31536000, immutable
```
Photos don't change after upload — aggressive caching is safe.

### 5C: Blurhash Placeholders (Optional Future)
Generate a 4×3 blurhash string during upload, store in DB. Frontend renders instant color placeholder while image loads.

### 5D: WebP/AVIF (Optional Future)
Cloudflare can auto-convert JPEG→WebP/AVIF at the edge via Image Resizing. This would cut sizes another 30-50% with no code changes.

---

## Performance Impact Projections

### Gallery Grid Load (72 Photos)
| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Total download | ~720MB | ~3.6MB | **200x smaller** |
| Load time (50Mbps) | ~115s | ~0.6s | **190x faster** |
| Load time (4G/10Mbps) | ~576s | ~2.9s | **200x faster** |
| Memory usage | ~1.5GB | ~50MB | **30x less** |
| CLS score | Poor (no dimensions) | Good (aspect ratios) | Eliminates shift |

### Detail Modal (Single Photo)
| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Image download | 8-12MB | 200-400KB | **25x smaller** |
| Time to display | 1-3s | 0.1-0.3s | **10x faster** |

### Upload Time (Per Photo)
| Metric | RAW Upload | HQ JPEG Upload | Improvement |
|--------|-----------|----------------|-------------|
| Upload size | 120-150MB | 5-15MB | **10x smaller** |
| Server processing | 30-60s | 2-5s | **12x faster** |
| Total per photo | 45-75s | 3-8s | **10x faster** |

---

## Execution Order

| Phase | Task | Est. Time |
|-------|------|-----------|
| 1 | Add DB migration for mediumKey, mediumUrl, thumbKey | 5 min |
| 2 | Create `generateVariants()` utility function | 15 min |
| 3 | Wire into upload-single endpoint | 15 min |
| 4 | Wire into legacy batch endpoint | 15 min |
| 5 | Create retroactive migration script | 20 min |
| 6 | Run migration on existing 72 photos | ~5 min runtime |
| 7 | Update PhotoDetailModal to use mediumUrl | 5 min |
| 8 | Add width/height aspect ratio to grid | 5 min |
| 9 | Test + deploy | 10 min |

---

## Verification Checklist
- [ ] New uploads generate 3 variants (thumb, medium, full)
- [ ] Existing 72 photos have thumbnails generated
- [ ] Grid view loads ~30-60KB thumbnails (not 8-12MB full images)
- [ ] Detail modal loads ~200-400KB medium (not 8-12MB full)
- [ ] Download button still serves full-size JPEG
- [ ] Width/height stored in DB, aspect ratios prevent CLS
- [ ] Progressive JPEG renders blurry-then-sharp
- [ ] Upload of HQ JPEG (not RAW) takes <8s per photo
- [ ] Gallery page loads in <3s on 4G connection
- [ ] R2 storage keys follow pattern: `{base}.jpg`, `{base}_thumb.jpg`, `{base}_medium.jpg`
