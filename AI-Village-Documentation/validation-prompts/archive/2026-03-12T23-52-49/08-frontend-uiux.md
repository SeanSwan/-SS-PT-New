# Frontend UI/UX Expert — Validation Report

> **Status:** PASS | **Model:** google/gemini-3.1-pro-preview | **Duration:** 45.6s
> **Files:** docs/ai-workflow/blueprints/GALLERY-QUALITY-SHOWCASE-PLAN.md
> **Generated:** 3/12/2026, 4:52:49 PM

---

As the Lead UI/UX Architect and Co-Orchestrator for SwanStudios, I have reviewed the `GALLERY-QUALITY-SHOWCASE-PLAN.md` blueprint. 

The backend architecture and data pipeline are solid, but the frontend design proposed in the ASCII mockup is far too utilitarian. We are selling a premium, high-end service. This component cannot look like a standard IT dashboard; it must feel like a **Luxury Vault** opening to reveal a **Crystalline Masterpiece**. 

We will leverage our *Enchanted Apex: Crystalline Swan* theme to create a highly tactile, visually striking comparison tool that makes the client *desire* the RAW/Q95 files purely based on the interface's premium feel.

Here are my authoritative design directives for Claude to implement.

---

### 1. The "Luxury Vault" Card Architecture
- **Severity:** CRITICAL
- **File & Location:** `frontend/src/pages/gallery/QualityShowcaseCard.tsx` (Main Container)
- **Design Problem:** The proposed ASCII layout is flat and lacks the depth required for a premium SaaS. It doesn't utilize our surface tokens effectively.
- **Design Solution:** The card must use a deep, rich gradient background with a subtle glowing border to separate it from the standard photo grid. It should feel like a premium inset panel.
- **Implementation Notes for Claude:**
  1. Create a `ShowcaseContainer` styled-component.
  2. Apply the following exact CSS specifications:
```typescript
const ShowcaseContainer = styled.section`
  background: linear-gradient(145deg, #003080 0%, #002060 100%); /* Royal Depth to Midnight Sapphire */
  border: 1px solid rgba(198, 168, 75, 0.2); /* Gilded Fern subtle border */
  border-top: 2px solid #C6A84B; /* Gilded Fern accent top */
  border-radius: 16px;
  box-shadow: 
    0 12px 40px rgba(0, 32, 96, 0.5), /* Deep shadow */
    inset 0 1px 0 rgba(224, 236, 244, 0.1); /* Frost White inner highlight */
  padding: 32px;
  margin-bottom: 48px;
  display: flex;
  flex-direction: column;
  gap: 32px;
  position: relative;
  overflow: hidden;

  /* Subtle background glow effect */
  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle at 50% 0%, rgba(96, 192, 240, 0.05) 0%, transparent 50%); /* Ice Wing glow */
    pointer-events: none;
  }
`;
```

### 2. Typography & The "Drama" Hook
- **Severity:** HIGH
- **File & Location:** `frontend/src/pages/gallery/QualityShowcaseCard.tsx` (Headers and Descriptions)
- **Design Problem:** The blueprint lacks emotional resonance. We need to use our typography stack to create a sense of artistry and precision.
- **Design Solution:** Use `Plus Jakarta Sans` for the authoritative header, but inject `Cormorant Garamond Italic` for the descriptive text to add a "fine art" feel.
- **Implementation Notes for Claude:**
  1. Implement the header and description using these exact styles:
```typescript
const ShowcaseHeader = styled.h2`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 700;
  font-size: 1.5rem;
  color: #E0ECF4; /* Frost White */
  letter-spacing: -0.02em;
  display: flex;
  align-items: center;
  gap: 12px;

  svg {
    color: #C6A84B; /* Gilded Fern */
  }
`;

const ShowcaseDramaText = styled.p`
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: 1.25rem;
  color: #C6A84B; /* Gilded Fern */
  line-height: 1.4;
  max-width: 600px;
  margin-top: -16px;
`;
```

### 3. Mobile-First Crop Comparison (Horizontal Swipe)
- **Severity:** CRITICAL
- **File & Location:** `frontend/src/pages/gallery/QualityShowcaseCard.tsx` (Crop Row)
- **Design Problem:** The blueprint suggests "Crops stack vertically on 375px". This is a terrible UX that will push the actual gallery out of the viewport. 
- **Design Solution:** The crops must be a horizontally scrollable row with CSS scroll-snapping on mobile, transitioning to a CSS grid on desktop.
- **Implementation Notes for Claude:**
  1. Build the `CropRow` and `CropItem` components.
  2. Ensure touch targets for the crops are large enough (min 100px).
```typescript
const CropRow = styled.div`
  display: flex;
  gap: 16px;
  width: 100%;
  
  /* Mobile: Horizontal Swipe */
  @media (max-width: 767px) {
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    padding-bottom: 16px; /* Space for scrollbar */
    -webkit-overflow-scrolling: touch;
    
    &::-webkit-scrollbar {
      height: 4px;
    }
    &::-webkit-scrollbar-thumb {
      background: #4070C0; /* Swan Lavender */
      border-radius: 4px;
    }
  }

  /* Desktop: Grid */
  @media (min-width: 768px) {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  }
`;

const CropItem = styled.button`
  background: #002060;
  border: 1px solid rgba(80, 160, 240, 0.2); /* Arctic Cyan */
  border-radius: 8px;
  padding: 8px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  scroll-snap-align: start;
  flex: 0 0 140px; /* Mobile width */
  
  img {
    width: 100%;
    aspect-ratio: 1/1;
    border-radius: 4px;
    object-fit: cover;
  }

  &:hover, &:focus-visible {
    transform: translateY(-4px);
    border-color: #60C0F0; /* Ice Wing */
    box-shadow: 0 8px 24px rgba(96, 192, 240, 0.2);
    outline: none;
  }
`;
```

### 4. Crystalline Data Visualization (File Size Bars)
- **Severity:** HIGH
- **File & Location:** `frontend/src/pages/gallery/QualityShowcaseCard.tsx` (Comparison Bars)
- **Design Problem:** Standard progress bars look cheap. We need to visualize data using our `Fira Code` font and glowing accents to emphasize the "Studio Master" tier.
- **Design Solution:** The Q95 tier gets a `Wing Purple` to `Ice Wing` animated gradient. Lower tiers get muted `Swan Lavender`.
- **Implementation Notes for Claude:**
  1. Use `Fira Code` for all numbers (sizes, MB/KB).
  2. Implement the visual bars using these specs:
```typescript
const DataRow = styled.div`
  display: grid;
  grid-template-columns: 140px 1fr 80px;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
  font-family: 'Sora', sans-serif;
  font-size: 0.875rem;
  color: #E0ECF4;
`;

const SizeBar = styled.div<{ $percentage: number; $isMaster?: boolean }>`
  height: 6px;
  border-radius: 3px;
  width: ${props => props.$percentage}%;
  background: ${props => props.$isMaster 
    ? 'linear-gradient(90deg, #8B5CF6, #60C0F0)' /* Wing Purple to Ice Wing */
    : '#4070C0'}; /* Swan Lavender */
  
  box-shadow: ${props => props.$isMaster 
    ? '0 0 12px rgba(139, 92, 246, 0.6)' 
    : 'none'};
    
  transition: width 1s cubic-bezier(0.22, 1, 0.36, 1);
`;

const SizeText = styled.span`
  font-family: 'Fira Code', monospace;
  text-align: right;
  color: #50A0F0; /* Arctic Cyan */
`;
```

### 5. Premium Action Area (CTAs)
- **Severity:** HIGH
- **File & Location:** `frontend/src/pages/gallery/QualityShowcaseCard.tsx` (Buttons)
- **Design Problem:** The buttons need to drive revenue/requests. They must meet 44px touch targets and utilize our luxury accent colors.
- **Design Solution:** The "Request RAW" button is the primary revenue driver and gets the `Gilded Fern` treatment.
- **Implementation Notes for Claude:**
  1. Implement the button group with flex-wrap for mobile.
```typescript
const ActionGroup = styled.div`
  display: flex;
  gap: 16px;
  margin-top: 16px;
  border-top: 1px solid rgba(64, 112, 192, 0.3); /* Swan Lavender */
  padding-top: 24px;
  
  @media (max-width: 430px) {
    flex-direction: column;
  }
`;

const PrimaryButton = styled.button`
  background: #C6A84B; /* Gilded Fern */
  color: #002060; /* Midnight Sapphire */
  font-family: 'Sora', sans-serif;
  font-weight: 600;
  min-height: 48px; /* Exceeds 44px touch target */
  padding: 0 24px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &:hover {
    background: #E0ECF4; /* Frost White */
    box-shadow: 0 0 20px rgba(198, 168, 75, 0.4);
  }
`;

const SecondaryButton = styled(PrimaryButton)`
  background: transparent;
  color: #60C0F0; /* Ice Wing */
  border: 1px solid #60C0F0;

  &:hover {
    background: rgba(96, 192, 240, 0.1);
    color: #E0ECF4;
    box-shadow: none;
  }
`;
```

### 6. The Zoom Lightbox Choreography
- **Severity:** CRITICAL
- **File & Location:** `frontend/src/components/gallery/ZoomLightbox.tsx` (New Component)
- **Design Problem:** The blueprint mentions a "mini-lightbox" but lacks animation specs. A sudden pop-in feels cheap.
- **Design Solution:** Use `framer-motion` for a smooth, blurred backdrop entry.
- **Implementation Notes for Claude:**
  1. Wrap the Lightbox in `AnimatePresence`.
  2. Use the following Framer Motion specs:
```tsx
// Claude: Implement this using framer-motion
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.3 }}
  style={{
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    background: 'rgba(0, 32, 96, 0.85)', // Midnight Sapphire with opacity
    backdropFilter: 'blur(12px)', // Crucial for the premium feel
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }}
>
  <motion.img
    initial={{ scale: 0.9, opacity: 0, y: 20 }}
    animate={{ scale: 1, opacity: 1, y: 0 }}
    exit={{ scale: 0.9, opacity: 0, y: 20 }}
    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
    src={zoomedImageSrc}
    style={{
      maxWidth: '90vw',
      maxHeight: '90vh',
      borderRadius: '8px',
      boxShadow: '0 24px 64px rgba(0,0,0,0.5)'
    }}
  />
</motion.div>
```

### Final Instructions for Claude:
1. **Strict Token Adherence:** Do not use any hex codes outside of the provided Crystalline Swan palette. If you see `#0a0a1a` or `#00FFFF` in legacy code while implementing this, strip it out.
2. **Accessibility:** Ensure the `CropItem` buttons have `aria-label="Zoom in on [Quality Name] detail"` and the `SizeBar` container has `role="img" aria-label="File size comparison chart"`.
3. **Loading States:** While the JSONB data is fetching, use a skeleton loader with a shimmer effect utilizing `Royal Depth` and `Swan Lavender` to maintain the dark theme. Do not use generic light-gray skeletons.

---

*Part of SwanStudios 7-Brain Validation System*
