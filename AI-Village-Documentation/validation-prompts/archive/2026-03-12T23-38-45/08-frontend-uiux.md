# Frontend UI/UX Expert — Validation Report

> **Status:** PASS | **Model:** google/gemini-3.1-pro-preview | **Duration:** 35.7s
> **Files:** docs/ai-workflow/blueprints/GALLERY-PERFORMANCE-THUMBNAIL-PLAN.md
> **Generated:** 3/12/2026, 4:38:45 PM

---

As the Lead UI/UX Architect and Co-Orchestrator for SwanStudios, I have reviewed the `GALLERY-PERFORMANCE-THUMBNAIL-PLAN.md`. 

From a backend and systems architecture perspective, this plan is a massive win. Reducing a 720MB payload to 3.6MB is non-negotiable for a premium SaaS. However, **the frontend execution outlined in Part 3 is far too basic.** Simply swapping the `src` attribute and adding an `aspect-ratio` style to a raw `<img>` tag is functional, but it is *not* premium. 

Progressive JPEGs, while technically fast, visually load in blocky, low-fidelity chunks. In a luxury fitness platform, that looks broken. We need deliberate loading choreography, glassmorphic overlays, and fluid micro-interactions that utilize the **Crystalline Swan** design system.

Here are my authoritative design directives for Claude to implement alongside the backend changes.

---

## 1. DESIGN VISION & INDEPENDENT ANALYSIS

*   **The Aesthetic:** The gallery should feel like stepping into a deep-ocean luxury vault. Images shouldn't just "pop" in; they should materialize smoothly. 
*   **Token Utilization:** We will use `Royal Depth` (#003080) as the skeleton/placeholder background, ensuring the grid looks beautiful even before the 30KB thumbnails arrive. Interactive states will utilize `Wing Purple` (#8B5CF6) for subtle, magical glows, and `Ice Wing` (#60C0F0) for sharp, accessible focus states.
*   **Micro-animations:** Thumbnails must respond to hover with a smooth, physics-based scale and a slight lift, revealing the "Captured in RAW" badge (if applicable) and download actions.
*   **Modal Experience:** The lightbox cannot just be a centered image. It needs a heavy backdrop blur, Framer Motion spring physics for the entrance, and crisp typography for the metadata.

---

## 2. DESIGN DIRECTIVES FOR CLAUDE

Claude, implement the following UI/UX specifications exactly as written when you execute the frontend portion of this plan.

### DIRECTIVE 1: Premium Image Component (The `<PhotoImg>` Replacement)
**Severity:** CRITICAL
**File & Location:** `frontend/src/pages/GalleryPage.tsx` (or a new component `frontend/src/components/gallery/GalleryThumbnail.tsx`)
**Design Problem:** Raw `<img>` tags with progressive JPEGs look blocky and cheap while loading.
**Design Solution:** Create a dedicated `GalleryThumbnail` styled-component that handles its own loading state, utilizing a smooth opacity fade-in over a branded skeleton background.

**Implementation Notes for Claude:**
1. Create a wrapper `div` that enforces the aspect ratio.
2. Set the wrapper's background to a pulsing `Royal Depth` (#003080).
3. Use React's `onLoad` event on the `<img>` to trigger a state change (`isLoaded`).
4. Apply the following styled-components CSS:

```typescript
import styled, { keyframes } from 'styled-components';

const pulse = keyframes`
  0% { background-color: #002060; } /* Midnight Sapphire */
  50% { background-color: #003080; } /* Royal Depth */
  100% { background-color: #002060; }
`;

export const ThumbnailWrapper = styled.div<{ $aspectRatio: number }>`
  position: relative;
  width: 100%;
  aspect-ratio: ${({ $aspectRatio }) => $aspectRatio};
  border-radius: 12px;
  overflow: hidden;
  background: #002060;
  animation: ${pulse} 2s infinite ease-in-out;
  cursor: pointer;
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease;
  
  /* Focus state for Accessibility */
  &:focus-visible {
    outline: 2px solid #60C0F0; /* Ice Wing */
    outline-offset: 4px;
  }

  /* Hover micro-interaction */
  &:hover {
    transform: scale(1.02) translateY(-4px);
    box-shadow: 0 12px 24px rgba(0, 32, 96, 0.4), 0 0 16px rgba(139, 92, 246, 0.2); /* Wing Purple glow */
  }
`;

export const StyledImage = styled.img<{ $isLoaded: boolean }>`
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: ${({ $isLoaded }) => ($isLoaded ? 1 : 0)};
  transition: opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1);
  will-change: opacity;
`;
```

### DIRECTIVE 2: "Captured in RAW" Luxury Badge
**Severity:** HIGH
**File & Location:** `frontend/src/components/gallery/GalleryThumbnail.tsx`
**Design Problem:** The plan mentions a "Captured in RAW" badge to justify the JPEG-only policy, but provides no design. It must look premium, not like a cheap bootstrap label.
**Design Solution:** A glassmorphic pill badge positioned at the bottom-left of the thumbnail, using `Gilded Fern` for a touch of luxury.

**Implementation Notes for Claude:**
1. Render this conditionally if `photo.sourceType === 'RAW'`.
2. Use the following exact CSS:

```typescript
export const RawBadge = styled.div`
  position: absolute;
  bottom: 12px;
  left: 12px;
  padding: 4px 10px;
  background: rgba(0, 32, 96, 0.65); /* Midnight Sapphire transparent */
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(198, 168, 75, 0.3); /* Gilded Fern border */
  border-radius: 20px;
  
  /* Typography */
  color: #C6A84B; /* Gilded Fern */
  font-family: 'Sora', sans-serif;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  
  /* Initial state (hidden until hover on desktop, always visible on mobile) */
  opacity: 1;
  
  @media (min-width: 1024px) {
    opacity: 0;
    transform: translateY(10px);
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    
    ${ThumbnailWrapper}:hover & {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;
```

### DIRECTIVE 3: Grid Layout Architecture
**Severity:** HIGH
**File & Location:** `frontend/src/pages/GalleryPage.tsx`
**Design Problem:** The plan doesn't specify the grid layout. A standard flexbox will result in jagged edges if aspect ratios differ.
**Design Solution:** Implement a responsive CSS Grid with dense packing or a Masonry layout if aspect ratios vary wildly. Assuming standard mixed landscape/portrait, use a strict CSS Grid.

**Implementation Notes for Claude:**
1. Use CSS Grid with `auto-fill`.
2. Implement the following responsive matrix:

```typescript
export const GalleryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  width: 100%;
  padding: 16px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 16px;
    padding: 24px;
  }

  @media (min-width: 1280px) {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 24px;
    padding: 40px;
  }
`;
```

### DIRECTIVE 4: Detail Modal (Lightbox) Choreography
**Severity:** CRITICAL
**File & Location:** `frontend/src/pages/gallery/PhotoDetailModal.tsx`
**Design Problem:** The modal needs to feel immersive and cinematic. A standard white background or basic dimming is unacceptable.
**Design Solution:** Deep space/ocean backdrop using `Midnight Sapphire` with a heavy blur. Framer Motion for the image entrance.

**Implementation Notes for Claude:**
1. Wrap the modal in Framer Motion's `<AnimatePresence>`.
2. The backdrop must be: `background: rgba(0, 32, 96, 0.85); backdrop-filter: blur(16px);`
3. The image itself (`mediumUrl`) should animate in using these Framer Motion specs:
   `initial={{ opacity: 0, scale: 0.9, y: 20 }}`
   `animate={{ opacity: 1, scale: 1, y: 0 }}`
   `transition={{ type: "spring", damping: 25, stiffness: 300 }}`
4. The "Download Full Resolution" button must be styled as a primary action:
   * Background: `Ice Wing` (#60C0F0)
   * Text Color: `Midnight Sapphire` (#002060)
   * Font: `Sora`, 14px, SemiBold.
   * Hover: `transform: translateY(-2px); box-shadow: 0 4px 12px rgba(96, 192, 240, 0.4);`

### DIRECTIVE 5: Empty State Design
**Severity:** MEDIUM
**File & Location:** `frontend/src/pages/GalleryPage.tsx`
**Design Problem:** The plan ignores what happens if an event has 0 photos.
**Design Solution:** A beautifully crafted empty state using the `Swan Lavender` and `Frost White` tokens.

**Implementation Notes for Claude:**
1. If `photos.length === 0`, render an empty state container.
2. Center align content.
3. Icon: A feather or camera icon in `Swan Lavender` (#4070C0), 48px.
4. Heading: "No Captures Yet" - `Plus Jakarta Sans`, 24px, `Frost White` (#E0ECF4).
5. Subtext: "Photos for this session are currently being processed in the vault." - `Cormorant Garamond Italic`, 18px, `Arctic Cyan` (#50A0F0).

---

### Final Note to Claude:
The backend logic you've outlined in the markdown is excellent and approved for execution. When you build the frontend components to consume these new `thumbnailUrl` and `mediumUrl` endpoints, **you must apply the styled-components and Framer Motion specs I have provided above.** Do not default to unstyled HTML elements. We are building a luxury product.

---

*Part of SwanStudios 7-Brain Validation System*
