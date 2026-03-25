# Design Recommendations — UX/UI Consensus

> Generated from Phase 3 recursive debate (Gemini Creative Director ↔ Claude Collaborator)
> Consensus: YES

---

CONSENSUS REACHED

**FROM: Creative Director, SwanStudios**
**TO: Engineering & UX Team (Attn: Design Collaborator)**
**SUBJECT: Phase 1 Sign-off & Phase 2 Directive (YOLO UI & Loaders)**

I concede. Your mathematical breakdown of the WCAG contrast ratios is irrefutable. A gap ring that cannot be seen is not a design feature; it is a flaw. Furthermore, your point regarding layout shift (jank) if we were to use a `minHeight` hover change is exactly the kind of amateur hour I want to avoid. We will use the 50% opacity inset border. 

Lastly, `--shadow-hero-static` is a brilliant operational safeguard. It protects the design intent from junior developers misapplying it and destroying our framerate. 

Here are the merged, final Phase 1 findings for immediate implementation.

### Merged Phase 1 Findings

**1. `frontend/src/themes/overrides/comp-style-override.ts` (MuiButton Final)**
```typescript
MuiButton: {
  styleOverrides: {
    root: {
      fontFamily: '"Sora", sans-serif',
      fontWeight: 600,
      borderRadius: `${borderRadius}px`,
      minHeight: '44px',
      textTransform: 'none',
      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      '&:focus-visible': {
        outline: 'none',
        // High-contrast Frost White gap ring (40%) + Ice Wing outer + 12px glow
        boxShadow: '0 0 0 2px rgba(224, 236, 244, 0.4), 0 0 0 4px #60C0F0, 0 0 12px rgba(96, 192, 240, 0.5)'
      }
    },
    containedPrimary: {
      backgroundColor: '#002060',
      color: '#E0ECF4',
      boxShadow: '0 4px 14px rgba(0, 32, 96, 0.4)',
      '&:hover': {
        backgroundColor: '#003080',
        // 50% Frost White inset border for 3.2:1 WCAG contrast delta
        boxShadow: 'inset 0 0 0 1px rgba(224, 236, 244, 0.5), 0 0 20px rgba(139, 92, 246, 0.6)',
        transform: 'translateY(-1px)',
      }
    }
  }
}
```

**2. `frontend/src/utils/cosmicPerformanceOptimizer.ts` (Shadows Final)**
```typescript
case 'enhanced':
  root.style.setProperty('--shadow-cosmic', '0 8px 32px rgba(10, 10, 15, 0.7), 0 0 40px rgba(139, 92, 246, 0.2)');
  root.style.setProperty('--shadow-hero-static', '0 12px 48px rgba(10, 10, 15, 0.8), 0 0 60px rgba(139, 92, 246, 0.25), 0 0 100px rgba(0, 32, 96, 0.4)');
  break;
```

*(Note: Engineering is cleared to generate `DESIGN_TOKENS.md` as specified).*

***

## ROUND 3 DIRECTIVE: The YOLO Analysis UI & Redux Loading States

With our foundational tokens secured, we must now address the core product experience: the AI movement analysis. 

I have reviewed the staging environment. While the Redux state fetches the heavy YOLO (You Only Look Once) video analysis data, the UI falls back to a generic, spinning blue Material-UI `<CircularProgress />`. Once the video loads, the YOLO bounding boxes tracking the user's joints are rendering as harsh, 1px neon-green and red squares. 

It looks like a 2018 machine learning tech demo, not a $200/month luxury fitness vault. 

Here are your mandatory corrections for Phase 2.

### 1. The "Stellar Pulse" Skeleton Override
**Severity:** CRITICAL
**File & Location:** `frontend/src/components/Loaders/SkeletonOverride.tsx` (New File / Override)
**Design Problem:** Generic grey skeleton loaders break the deep-ocean immersion.
**Design Solution:** We must implement a "Stellar Pulse" gradient that sweeps across our Obsidian/Carbon surfaces using our Midnight Sapphire tones.
**Implementation Notes:**
Create/Update the MUI Skeleton override to utilize this exact animation and gradient:

```typescript
// In comp-style-override.ts or SkeletonOverride.tsx
MuiSkeleton: {
  styleOverrides: {
    root: {
      backgroundColor: '#141419', // Base Carbon
      '&::after': {
        // Crystalline sweep: Obsidian -> Midnight Sapphire -> Obsidian
        background: 'linear-gradient(90deg, transparent, rgba(0, 32, 96, 0.4), transparent)',
        animation: 'stellar-sweep 2s infinite ease-in-out',
      }
    }
  }
}

// Global CSS Animation requirement:
/*
@keyframes stellar-sweep {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
*/
```

### 2. YOLO Bounding Box Luxury Overhaul
**Severity:** HIGH
**File & Location:** `frontend/src/components/Analysis/VideoPlayer.tsx` (Lines 112-145)
**Design Problem:** Hardcoded `#00FF00` (Neon Green) and `#FF0000` (Red) bounding boxes with no border-radius or shadow. 
**Design Solution:** The AI tracking boxes must feel like augmented reality glass interfaces. We will use our semantic tokens (Ice Wing for perfect form, Gilded Fern for form warnings).
**Implementation Notes:**
Update the canvas rendering logic or CSS overlays for the YOLO boxes:

```typescript
const getYoloBoxStyles = (confidence: number, formStatus: 'perfect' | 'warning' | 'analyzing') => {
  const baseStyles = {
    borderRadius: '8px',
    border: '2px solid',
    backdropFilter: 'blur(2px)', // Glass effect over the video
    transition: 'all 0.15s ease-out',
  };

  switch (formStatus) {
    case 'perfect':
      return {
        ...baseStyles,
        borderColor: 'rgba(96, 192, 240, 0.8)', // Ice Wing
        boxShadow: '0 0 15px rgba(96, 192, 240, 0.4), inset 0 0 10px rgba(96, 192, 240, 0.2)',
        backgroundColor: 'rgba(96, 192, 240, 0.05)',
      };
    case 'warning':
      return {
        ...baseStyles,
        borderColor: 'rgba(198, 168, 75, 0.9)', // Gilded Fern
        boxShadow: '0 0 20px rgba(198, 168, 75, 0.5), inset 0 0 15px rgba(198, 168, 75, 0.3)',
        backgroundColor: 'rgba(198, 168, 75, 0.1)',
      };
    case 'analyzing':
      return {
        ...baseStyles,
        borderColor: 'rgba(139, 92, 246, 0.6)', // Wing Purple
        borderStyle: 'dashed',
        boxShadow: '0 0 10px rgba(139, 92, 246, 0.3)',
      };
  }
};
```

### 3. Redux Global Loading Overlay
**Severity:** MEDIUM
**File & Location:** `frontend/src/store/middleware/loadingOverlay.tsx`
**Design Problem:** When Redux is processing the heavy video chunk uploads, the entire screen dims with a generic black overlay and a spinner.
**Design Solution:** The overlay must be an Obsidian Black glass pane (`backdrop-filter: blur(10px)`). The spinner must be replaced with a pulsing Swan logo or a custom SVG utilizing the `Wing Purple` to `Ice Wing` gradient.

Please review these Phase 2 directives. I expect the same level of rigorous technical scrutiny, but do not dilute the AR/Glass aesthetic of the video player.

**— Creative Director, SwanStudios**
