# UX & Accessibility — Validation Report

> **Status:** PASS | **Model:** google/gemini-2.5-flash | **Duration:** 18.5s
> **Files:** frontend/src/pages/GalleryPage.tsx
> **Generated:** 3/12/2026, 12:41:12 AM

---

Here's a comprehensive audit of the `GalleryPage.tsx` code, focusing on WCAG 2.1 AA compliance, mobile UX, design consistency, user flow friction, and loading states.

---

## WCAG 2.1 AA Compliance

### Color Contrast

*   **CRITICAL:** Many text elements have insufficient contrast against their backgrounds.
    *   `HeroSubheadline`: `rgba(248, 250, 252, 0.8)` on `#001030` (background of `HeroSection` and `HeroBackground`). This is likely insufficient.
    *   `HeroSecondaryButton`: `color: #F8FAFC` on `rgba(96, 192, 240, 0.05)` background. This will almost certainly fail.
    *   `HeroScrollIndicator`: `rgba(248, 250, 252, 0.4)` on `#001030`. Fails.
    *   `PageSubtitle`: `rgba(255,255,255,0.5)` on `radial-gradient(ellipse at top, #120d26 0%, #002060 60%)`. Likely fails.
    *   `PhotographerNote`: `rgba(255, 255, 255, 0.75)` on `rgba(198, 168, 75, 0.04)`. Likely fails.
    *   `PhotographerAttribution`: `rgba(198, 168, 75, 0.6)` on `rgba(198, 168, 75, 0.04)`. Likely fails.
    *   `EventMeta`: `rgba(255,255,255,0.45)` on `rgba(255, 255, 255, 0.03)`. Likely fails.
    *   `SportBadge`: `color: #60C0F0` on `rgba(139, 92, 246, 0.15)`. Likely fails.
    *   `PhotoCountBadge`: `rgba(255,255,255,0.9)` on `rgba(0, 32, 96, 0.85)`. This might pass, but needs verification.
    *   `GateSubtitle`: `rgba(255,255,255,0.5)` on `rgba(0, 32, 96, 0.6)`. Likely fails.
    *   `Label`: `rgba(255,255,255,0.6)` on `rgba(0, 32, 96, 0.6)`. Likely fails.
    *   `Input` placeholder: `rgba(255,255,255,0.3)`. Fails.
    *   `CheckboxRow`: `rgba(255,255,255,0.6)`. Likely fails.
    *   `ErrorText`: `#ff6b6b` on `rgba(0, 32, 96, 0.6)`. Needs verification.
    *   `PhotoFilename`: `color: #fff` on the background of the `PhotoCardWrapper`. This is usually fine, but the background of the wrapper is transparent, so it's against the main page background. Needs verification.
    *   `WatermarkText`: `#fff` on the image. This is an overlay, so contrast will vary.
    *   `CreditPill`: `color: #fff` on `rgba(0, 32, 96, 0.75)`. Needs verification.
    *   `ToastWrapper`: `color: #fff` on `rgba(0, 32, 96, 0.85)`. Needs verification.
    *   `ModalSubtitle`: `rgba(255,255,255,0.5)` on `rgba(0, 32, 96, 0.8)`. Likely fails.
    *   `PricingLabel`: `rgba(255,255,255,0.5)` on `rgba(255, 255, 255, 0.03)`. Likely fails.
    *   `PricingDesc`: `rgba(255,255,255,0.6)` on `rgba(255, 255, 255, 0.03)`. Likely fails.
    *   `ReferralLink`: `rgba(139, 92, 246, 0.7)` on `rgba(0, 32, 96, 0.8)`. Likely fails.
    *   `SupportText`: `rgba(255,255,255,0.5)` on `rgba(255, 255, 255, 0.03)`. Likely fails.
    *   `SupportBtn` (ghost variant): `rgba(255,255,255,0.7)` on `rgba(255,255,255,0.05)`. Likely fails.

### Aria Labels & Semantics

*   **HIGH:** Missing `aria-label` for interactive elements.
    *   `HeroScrollIndicator`: Is a `div` with `cursor: pointer`. Should be a `<button>` or `<a>` with an `aria-label` or descriptive text. Currently has `aria-label="Browse event galleries"` on the primary button, but the scroll indicator itself is not properly labeled.
    *   `EventCard`: Is a `div` with `cursor: pointer` and `onClick`. Should be a `<button>` or `<a>` with a clear `aria-label` describing the event it opens.
    *   `PhotoCard`: Is a `div` with `cursor: pointer` and `onClick`. Should be a `<button>` with an `aria-label` like "View photo [photo.displayName]".
    *   `ModalCloseBtn`: `&#x2715;` is not descriptive for screen readers. Needs `aria-label="Close modal"`.
    *   `FloatingCart`: Is a `div` with `cursor: pointer` and `onClick`. Should be a `<button>` with an `aria-label` like "Submit [X] photos for enhancement".
    *   `PricingCard`: Is a `button` but could benefit from a more descriptive `aria-label` if the visible text isn't fully clear, e.g., "Purchase single photo enhancement for $15".
*   **MEDIUM:** Semantic HTML usage.
    *   `HeroSection` has `aria-label="SwanStudios Elite Photography"`, which is good.
    *   `VaultCard` is a `div`. If it's meant to be a landmark region, consider `role="region"` with an `aria-label`.
    *   `PageTitle` and `PageSubtitle` are good.
    *   `PhotographerNote` uses `blockquote`, which is semantically correct.
    *   `InputGroup` is a `div`. Consider using `<fieldset>` and `<legend>` for better grouping of form controls, especially if there are multiple related inputs.
    *   `CheckboxRow` uses `label` correctly wrapping the input.
    *   `CreditPill` and `ToastWrapper` are `div`s. Consider `role="status"` or `role="alert"` if they convey important, time-sensitive information, or `aria-live="polite"` for the toast.
    *   `ModalBackdrop` and `ModalCard`: Modals should have `role="dialog"` and `aria-modal="true"`. The `ModalTitle` should be referenced by `aria-labelledby`.
*   **LOW:** Image `alt` attributes.
    *   `PhotoImg`: Uses `alt={photo.displayName}`, which is good.
    *   `WatermarkLogo`: Missing `alt` attribute. Should describe the logo, e.g., `alt="SwanStudios Logo"`.

### Keyboard Navigation & Focus Management

*   **HIGH:** Focus management for modals.
    *   When `GateOverlay`, `VIPConversionModal`, `MessageModal`, `DonationModal`, `PhotoDetailModal`, or `ModalBackdrop` open, focus should be trapped within the modal. Currently, focus can escape to the background content.
    *   When a modal opens, focus should be moved to the first interactive element within it (e.g., the first input in `GateCard`, or the close button).
    *   When a modal closes, focus should be returned to the element that triggered its opening.
*   **MEDIUM:** Keyboard accessibility for custom interactive elements.
    *   `HeroScrollIndicator`: As a `div` with `onClick`, it's not naturally keyboard focusable. Needs `tabIndex="0"` and an `onKeyPress` handler for Space/Enter.
    *   `EventCard`: Same as above, needs `tabIndex="0"` and `onKeyPress`.
    *   `PhotoCard`: Same as above, needs `tabIndex="0"` and `onKeyPress`.
    *   `FloatingCart`: Same as above, needs `tabIndex="0"` and `onKeyPress`.
*   **LOW:** Focus outlines.
    *   While `outline: none` is used on some buttons (`HeroPrimaryButton`, `HeroSecondaryButton`), the `:focus-visible` pseudo-class is correctly used to re-enable outlines for keyboard users. This is good practice. Ensure this is consistently applied to all interactive elements.

## Mobile UX

### Touch Targets

*   **HIGH:** Several interactive elements have touch targets smaller than the recommended 44x44px.
    *   `HeroBaseButton`: `min-height: 56px` is good.
    *   `Input`: `min-height: 44px` is good.
    *   `SubmitButton`: `min-height: 48px` is good.
    *   `ModalCloseBtn`: `width: 44px; height: 44px` is good.
    *   `SupportBtn`: `min-height: 44px` is good.
    *   `BackButton`: `min-height: 44px` is good.
    *   `CheckboxRow` input: `min-width: 18px; min-height: 18px`. This is too small. While the label helps, the actual checkbox itself should be larger or the clickable area around it expanded.
    *   `SportBadge` and `PhotoCountBadge`: These are not interactive, so the size is less critical, but if they were interactive, they would be too small.
    *   `CreditPill`: While `pointer-events: none`, if it were interactive, its padding might make it large enough, but the internal elements are small.
    *   `FloatingCart`: `height: 64px` is good.
    *   `PricingCard`: The entire card is clickable, so its overall size is likely sufficient.

### Responsive Breakpoints

*   **MEDIUM:** Breakpoints are present but could be more granular or use a mobile-first approach more consistently.
    *   `HeroContentGrid`: `padding` adjustments at `768px` and `1280px`.
    *   `HeroEyebrow`, `HeroHeadline`, `HeroSubheadline`: Font size adjustments at `768px` and `1280px`.
    *   `HeroButtonGroup`: Changes from `column` to `row` at `430px`. This is a good small breakpoint.
    *   `HeroScrollIndicator`: `display: none` at `max-width: 767px`. Good for mobile.
    *   `ContentMax`: `padding` adjustment at `768px`.
    *   `PageTitle`: Font size adjustment at `768px`.
    *   `PhotographerNote`: Font size adjustment at `480px`.
    *   `EventGrid`: Changes from `minmax(320px, 1fr)` to `1fr` at `480px`. Good.
    *   `GridWrapper`: Changes from `minmax(200px, 1fr)` to `repeat(2, 1fr)` at `480px`. Good.
    *   `PhotoFilename`: Font size adjustment at `480px`.
    *   `PricingGrid`: Changes from `repeat(3, 1fr)` to `1fr` at `600px`. Good.
*   **LOW:** Consider a more fluid approach with `clamp()` for typography and spacing where appropriate, rather than fixed breakpoints for every change.

### Gesture Support

*   **LOW:** No explicit gesture support mentioned or implemented (e.g., swipe for lightbox navigation). While not a WCAG AA requirement, it enhances mobile UX. The current `onPrev` and `onNext` for the lightbox are button-based, which is fine, but swipe gestures would be a nice addition.

## Design Consistency

### Theme Tokens Usage

*   **HIGH:** Hardcoded colors and magic numbers are prevalent instead of theme tokens. This makes global design changes difficult and inconsistent.
    *   **Colors:** `#001030`, `#002060`, `#003080`, `#001840`, `#000a20`, `rgba(96, 192, 240, 0.08)`, `rgba(139, 92, 246, 0.06)`, `#C6A84B`, `#F8FAFC`, `rgba(248, 250, 252, 0.8)`, `#8B5CF6`, `rgba(139, 92, 246, 0.4)`, `#D4AF37`, `#AA801E`, `rgba(0, 0, 0, 0.2)`, `rgba(198, 168, 75, 0.3)`, `rgba(198, 168, 75, 0.4)`, `rgba(96, 192, 240, 0.05)`, `rgba(96, 192, 240, 0.15)`, `#60C0F0`, `rgba(96, 192, 240, 0.15)`, `rgba(248, 250, 252, 0.4)`, `#120d26`, `rgba(255, 255, 255, 0.9)`, `rgba(255,255,255,0.5)`, `rgba(198, 168, 75, 0.04)`, `rgba(198, 168, 75, 0.4)`, `rgba(255, 255, 255, 0.75)`, `rgba(198, 168, 75, 0.3)`, `rgba(198, 168, 75, 0.6)`, `rgba(255, 255, 255, 0.03)`, `rgba(255, 255, 255, 0.08)`, `rgba(139, 92, 246, 0.3)`, `#1a1035`, `rgba(0, 32, 96, 0.85)`, `rgba(255,255,255,0.9)`, `rgba(255,255,255,0.45)`, `rgba(0, 32, 96, 0.92)`, `rgba(0, 32, 96, 0.6)`, `rgba(139, 92, 246, 0.15)`, `rgba(0, 0, 0, 0.5)`, `rgba(255,255,255,0.5)`, `rgba(255,255,255,0.6)`, `rgba(255, 255, 255, 0.05)`, `rgba(255, 255, 255, 0.12)`, `rgba(139, 92, 246, 0.5)`, `rgba(255,255,255,0.3)`, `#002060`, `#ff6b6b`, `rgba(0,32,96,0.9)`, `rgba(255,255,255,0.03)`, `rgba(255,255,255,0.08)`, `rgba(0, 32, 96, 0.75)`, `rgba(139, 92, 246, 0.25)`, `rgba(139, 92, 246, 0.1)`, `#8B5CF6`, `rgba(139, 92, 246, 0.6)`, `rgba(0, 32, 96, 0.85)`, `rgba(139, 92, 246, 0.15)`, `rgba(0, 32, 96, 0.8)`, `rgba(20, 20, 35, 0.85)`, `rgba(139, 92, 246, 0.3)`,

---

*Part of SwanStudios 7-Brain Validation System*
