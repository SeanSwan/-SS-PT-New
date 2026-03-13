# Gallery Strategy — Revised Holistic Plan
## SwanStudios — Fast Upload, Maximum Quality, Smart Cropping

---

## The Rethink: What We Got Wrong

### Problem #1: RAW Files Don't Belong in the Web Pipeline
- RAW files (ARW, CR2) are **editing source files for photographers**, not deliverables for clients
- XnConvert, dcraw, and similar tools produce washed-out, oversized JPEGs because they don't apply the camera's color science (Sony's "Creative Look" profiles, lens corrections, white balance adjustments)
- **Only Lightroom, Capture One, or DxO** properly interpret RAW color data
- Uploading RAW to the web app was the wrong approach — it's slow (120-150MB per file), the server-side conversion produces inferior results, and clients don't need or want RAW
- **Decision: DROP all RAW upload support from the gallery.** RAW stays on the photographer's local drive for editing only.

### Problem #2: The Quality Comparison Card Is Unnecessary
- 99% of clients cannot distinguish Q95 from Q92 JPEG — the difference is invisible at screen viewing sizes
- A quality comparison card serves photographers, not clients
- It adds complexity (showcase upload flow, 5 variants per photo, extra UI) with no business value
- **Decision: DROP the Quality Showcase feature.** Instead, simply deliver excellent photos and let clients request prints/edits through the existing enhancement request system.

### Problem #3: The Real Value of 61 Megapixels
The Sony A7R4 captures 9504×6336 pixels. This means:
- A group shot can be cropped to 5+ individual portraits, each still 20MP+ (enough for a 16×20" print)
- A wide event shot can become 3 different compositions
- The photographer's skill is in the EDITING and CROPPING, not in delivering RAW files
- **Decision: The gallery should showcase the FINAL edited product, not the source material.**

---

## The Correct Gallery Workflow

### Photographer's Local Workflow (Before Upload)
```
1. Shoot event → Sony A7R4 saves .ARW RAW files to SD card
2. Import into Lightroom Classic
3. Cull (pick best shots, reject blurry/duplicates)
4. Edit: color grade, crop, exposure, white balance
5. CROP MAGIC: Extract multiple compositions from high-res shots
   - Group photo → individual headshots
   - Wide shot → 3 tight crops
   - Full body → portrait crop + detail crop
6. Export: JPEG Q95, sRGB, max 4000px long edge
   - 4000px gives excellent quality for screen + prints up to 13×19"
   - At Q95: ~3-8MB per photo (not 120MB RAW)
   - sRGB ensures consistent color on all screens
7. Batch rename: EVENT-001.jpg, EVENT-002.jpg, etc.
```

### Why 4000px Long Edge?
| Max Width | Screen Use | Print Quality | File Size (Q95) |
|-----------|-----------|---------------|-----------------|
| 6000px+ | Overkill for web | 20×30" @ 300dpi | 8-15MB |
| **4000px** | **Perfect for 4K displays** | **13×19" @ 300dpi** | **3-8MB** |
| 2000px | Good for HD screens | 6×9" @ 300dpi | 1-3MB |
| 1200px | Adequate for web | Too small for prints | 200-500KB |

**4000px is the sweet spot** — beautiful on any screen, printable at large sizes, and 3-8MB uploads instead of 120MB.

### Upload to SwanStudios Gallery
```
1. Admin opens Gallery → Event → Upload
2. Drag & drop batch of edited JPEGs (already 3-8MB each from Lightroom)
3. Backend processes each JPEG:
   a. Apply watermark (logo + sswanstudios.com) → Q92 full
   b. Generate thumbnail (400px, Q80, progressive) → ~40KB
   c. Generate medium (1200px, Q85, progressive) → ~200KB
   d. Extract width/height for CLS prevention
   e. Upload 3 variants to R2
   f. Save to DB
4. Processing time: ~2-5 seconds per photo (no RAW conversion!)
5. 153 photos × 4s avg = ~10 minutes total upload time
```

### Client Views Gallery
```
1. Grid view: loads 400px thumbnails (~40KB each)
   - 153 photos × 40KB = 6MB total (loads in ~5s on 4G)
2. Click photo → Modal: loads 1200px medium (~200KB)
   - Instant display, perfect for screen viewing
3. "Download Original" button → streams full watermarked JPEG (3-8MB)
   - Client gets print-quality file with watermark
4. "Request Enhancement" → admin notification
   - For clients who want: watermark removed, different crop, retouching
   - Admin goes back to Lightroom, makes the edit, re-exports, uploads replacement
```

---

## What Changes from the Current Setup

### Backend Changes Needed

#### 1. REMOVE RAW Upload Support (Simplify)
The dcraw pipeline in `adminGalleryRoutes.mjs` should be removed or bypassed. RAW files should be rejected with a helpful message:

```javascript
// Instead of attempting dcraw conversion:
if (isRaw) {
  return res.status(422).json({
    success: false,
    error: 'RAW files are not accepted. Please export from Lightroom as JPEG Q95, 4000px max.',
    hint: 'Lightroom Export: Quality 95%, sRGB, Long Edge 4000px, File Naming: Custom Name-Sequence',
  });
}
```

This eliminates:
- dcraw binary dependency
- 30-60s server-side RAW conversion
- Washed-out color from bad RAW processing
- OOM risk from 150MB file processing
- The entire RAW pipeline complexity

#### 2. KEEP Thumbnail Pipeline (Already Built)
The `imageVariantService.mjs` we just created is exactly right:
- Thumb (400px, Q80) for grid
- Medium (1200px, Q85) for modal
- Full (original upload, watermarked Q92) for download
- Width/height extraction for CLS

#### 3. REDUCE Max Upload Size
Since we're only accepting JPEGs now:
```javascript
// Before: 150MB (for RAW files)
limits: { fileSize: 150 * 1024 * 1024 }

// After: 25MB (generous for 4000px Q95 JPEG)
limits: { fileSize: 25 * 1024 * 1024 }
```

#### 4. Validate JPEG Quality on Upload
Optionally warn if uploaded JPEG is too low quality:
```javascript
const metadata = await sharp(inputBuffer).metadata();
if (metadata.width < 2000 || metadata.height < 2000) {
  logger.warn(`[AdminGallery] Low-res upload: ${metadata.width}×${metadata.height} — consider re-exporting at higher resolution`);
}
```

### Frontend Changes Needed

#### 1. Admin Upload Interface — Add Lightroom Export Guide
Show a permanent help card in the upload area:

```
╔══════════════════════════════════════════════════════╗
║ 📷 Lightroom Export Settings for Best Results        ║
║                                                      ║
║  Format:        JPEG                                 ║
║  Quality:       95                                   ║
║  Color Space:   sRGB                                 ║
║  Long Edge:     4000 pixels                          ║
║  Sharpening:    Screen, Standard                     ║
║  File Naming:   Custom Name - Sequence               ║
║                                                      ║
║  These settings produce 3-8MB files that look        ║
║  stunning on any screen and print beautifully.       ║
╚══════════════════════════════════════════════════════╝
```

#### 2. Client Gallery — Clean, Simple, Fast
- Grid loads thumbnails (already implemented)
- Modal shows medium (already implemented)
- "Download" button gives watermarked full-size
- "Request Enhancement" for special edits/crops/watermark removal
- NO quality comparison, NO RAW download, NO confusing options
- Just beautiful photos, fast loading, simple UX

#### 3. Enhancement Request Flow (Existing, Keep As-Is)
When client requests enhancement:
```
Client clicks "Request Enhancement" on a photo
  → Creates EnhancementRequest in DB
  → Admin gets notification in Business Intelligence Alerts
  → Admin options:
    a. Remove watermark + deliver (free tier: X per event)
    b. Custom crop/edit in Lightroom (paid tier)
    c. Full retouching (premium tier)
  → Admin uploads enhanced version → shows in gallery with "Enhanced" badge
```

---

## The Cropping Superpower — Future Feature Idea

Since the A7R4 gives 61MP, a future feature could let the admin:
1. Upload one wide shot
2. Use an in-browser crop tool to define 2-5 crop regions
3. System generates individual photos from each crop
4. Each crop is still 10-20MP — more than enough for any use

This would let one event photo become 5 gallery photos, all from the same exposure. But this is a **future feature**, not needed for the current gallery fix.

---

## Revised File Changes Summary

### Files to Modify (from thumbnail pipeline, already done)
| File | Status | Change |
|------|--------|--------|
| `backend/services/imageVariantService.mjs` | ✅ DONE | Generates thumb + medium |
| `backend/models/GalleryPhoto.mjs` | ✅ DONE | Added mediumKey, mediumUrl, thumbKey |
| `backend/migrations/20260312000002-add-gallery-thumbnail-variants.cjs` | ✅ DONE | DB migration |
| `backend/routes/adminGalleryRoutes.mjs` | ✅ DONE | Upload endpoints generate variants |
| `backend/routes/galleryRoutes.mjs` | ✅ DONE | API returns mediumUrl |
| `frontend/src/pages/GalleryPage.tsx` | ✅ DONE | mediumUrl in interface, aspect ratios |
| `frontend/src/pages/gallery/PhotoDetailModal.tsx` | ✅ DONE | Modal uses mediumUrl |
| `scripts/generate-gallery-thumbnails.mjs` | ✅ DONE | Retroactive thumbnail migration |

### Additional Changes (this plan)
| File | Change |
|------|--------|
| `backend/routes/adminGalleryRoutes.mjs` | Reject RAW uploads with helpful message, reduce max file size to 25MB |
| `frontend/src/pages/GalleryPage.tsx` (admin upload area) | Add Lightroom export guide card |

### Files NOT Needed (dropped)
| File | Reason |
|------|--------|
| ~~`backend/services/showcaseService.mjs`~~ | Quality showcase dropped |
| ~~`frontend/src/pages/gallery/QualityShowcaseCard.tsx`~~ | Quality showcase dropped |
| ~~Showcase migration~~ | Not needed |

---

## Execution Plan

| Step | Action | Time |
|------|--------|------|
| 1 | Commit + deploy thumbnail pipeline (already built) | 5 min |
| 2 | Run retroactive thumbnail script on existing 72 photos | ~5 min |
| 3 | Reject RAW uploads with Lightroom export hint | 5 min |
| 4 | Reduce max file size to 25MB | 1 min |
| 5 | Add Lightroom export guide to admin upload UI | 10 min |
| 6 | Re-export existing RAW originals from Lightroom as JPEG Q95 4000px | Manual (photographer) |
| 7 | Re-upload the properly exported JPEGs | Manual (photographer) |
| 8 | Verify: gallery loads in <5s on mobile | QA |

---

## Performance Projections (Revised)

### Upload Speed (Per Photo)
| Scenario | Before (RAW) | After (LR Export) | Improvement |
|----------|-------------|-------------------|-------------|
| File size | 120-150MB | 3-8MB | 15-50x smaller |
| Upload time | 30-90s | 2-5s | 15x faster |
| Server processing | 30-60s (dcraw) | 2-4s (watermark + variants) | 15x faster |
| **Total per photo** | **60-150s** | **4-9s** | **15x faster** |

### Batch Upload (153 Photos)
| Scenario | Before | After |
|----------|--------|-------|
| Total upload time | 2.5-6 hours | 10-23 minutes |
| Server memory peak | 200MB+ (RAW buffer) | 30MB (JPEG buffer) |
| R2 storage per event | 720MB (full only) | ~1.2GB (full + thumb + medium) |

### Gallery Load (Client View)
| Metric | Before | After |
|--------|--------|-------|
| Grid (153 photos) | ~1.2GB | ~6MB (thumbnails) |
| Load time (4G) | 10+ min | ~5s |
| Modal (single photo) | 8-12MB | ~200KB |
| Download (single photo) | 8-12MB | 3-8MB |

---

## Summary: The Right Approach

1. **Shoot RAW** (for editing flexibility)
2. **Edit in Lightroom** (proper color science, cropping, retouching)
3. **Export JPEG Q95, 4000px, sRGB** (the sweet spot)
4. **Upload to SwanStudios** (fast, 3-8MB per photo)
5. **System auto-generates thumbnails** (grid loads in seconds)
6. **Clients see beautiful photos** (no confusing quality options)
7. **Enhancement requests** for special needs (watermark removal, custom crops, retouching)
8. **RAW stays on your drive** (for re-edits, different crops, future use)

This is how professional photography galleries (SmugMug, Pixieset, ShootProof) work. The photographer does the editing, the gallery shows the finished product.
