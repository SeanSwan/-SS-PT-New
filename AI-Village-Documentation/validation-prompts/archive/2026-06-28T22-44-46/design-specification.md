# Design Specification Consensus

> Phase 2C: GLM 5.2 (Lead Designer) ↔ Gemini 3.1 Pro (Reviewer)
> Consensus: YES

---

I accept your completions for Surface 6 and the introduction of Surface 7. The motion specs for the bottom sheet and the visual design of the contextual prompt are excellent. 

However, I **DISAGREE** with three specific implementation details regarding touch targets and accessibility anti-patterns in Surfaces 6 and 7. Since these are the final surfaces, resolving these will bring us to full consensus.

### DISPUTE 1: Drag Handle Touch Target (Surface 6)
**Why:** You specified a drag handle of `width: 36px; height: 4px`. While visually elegant, binding a drag gesture strictly to a 4px tall element guarantees user frustration, as it severely violates the 44px minimum touch target. Users will miss the handle and accidentally trigger content scrolling or do nothing.
**Proposed Alternative:** The visual handle must be wrapped in an invisible, full-width hit area that satisfies the 44px minimum and captures the `touch-action` correctly.
**Exact Code Change (`src/components/workout/ReviewApproveModal.tsx` & `ReviewModal.css`):**
```tsx
{/* src/components/workout/ReviewApproveModal.tsx */}
<div 
  className="drag-handle-hit-area" 
  onPointerDown={handleDragStart}
  aria-hidden="true"
>
  <div className="drag-handle-visual" />
</div>
```
```css
/* src/styles/components/ReviewModal.css */
.drag-handle-hit-area {
  width: 100%;
  height: 44px; /* Enforces touch target */
  display: flex;
  align-items: center;
  justify-content: center;
  touch-action: none; /* Prevents browser scroll during drag */
  cursor: grab;
}
.drag-handle-visual {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: var(--graphite, #1A1A24);
}
```

### DISPUTE 2: Interactive Elements Inside Live Regions (Surface 7)
**Why:** You specified: *"The container has `aria-live="polite"`"*. Placing a live region on a container that holds interactive elements (an `<input>` and `<button>`s) is a severe accessibility anti-pattern. When the user types into the input or clicks a button, the DOM changes can cause the screen reader to re-announce the *entire* container's text repeatedly, creating massive confusion.
**Proposed Alternative:** Remove `aria-live` from the container itself. Instead, fire a one-time announcement to a dedicated, visually hidden global live region when the prompt mounts, and rely on logical DOM placement (e.g., immediately preceding the exercise it references) for natural discovery.
**Exact Code Change (`src/components/training/MissingInfoPrompt.tsx`):**
```tsx
// REMOVE aria-live from the container
<div 
  role="region" 
  aria-label={`Missing information: ${fieldName}`}
  className="missing-info-container ..."
>
  {/* ... content ... */}
</div>

// ADD to a useEffect on mount:
useEffect(() => {
  announceToScreenReader(`Missing information required: ${fieldName}. Form available inline.`);
}, [fieldName]);
```

### DISPUTE 3: Input Touch Target Minimums (Surface 7)
**Why:** You specified the inline input as `height: 36px`. While you correctly used pseudo-elements to expand the 36px buttons to 44px hit areas, expanding an `<input>`'s hit area with a pseudo-element is unreliable because clicking the pseudo-element does not natively focus the input (unless wrapped in a carefully sized `<label>`). WCAG 2.5.8 applies to text inputs as well.
**Proposed Alternative:** Make the input natively `44px` tall on mobile devices, and scale it down to `36px` only on devices with a fine pointer (desktop).
**Exact Code Change (`src/styles/components/MissingInfoPrompt.css`):**
```css
.missing-info-input {
  min-height: 44px; /* Mobile-first touch target */
  padding: 0 14px;
  border-radius: 8px;
  background: var(--graphite, #1A1A24);
  border: 1px solid var(--royal-depth, #003080);
  color: var(--frost-white, #E0ECF4);
  font-size: 16px; /* 16px prevents iOS Safari auto-zoom */
}

@media (pointer: fine) {
  .missing-info-input {
    min-height: 36px; /* Desktop density */
    padding: 0 12px;
    font-size: 14px;
  }
}
```

Please acknowledge these final three corrections. If accepted, we will have a complete, accessible, and robust specification for all 7 surfaces, and I will declare consensus.
