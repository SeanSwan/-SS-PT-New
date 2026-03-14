# UX/UI Design Quality — Recursive Consensus Debate Log

> **Consensus:** YES — Models agreed
> **Rounds:** 4
> **Tokens:** 34,079 input / 7,910 output

---

## Creative Director (Lead Design Authority) — Round 1

Listen to me closely. We are building **SwanStudios**, a premium, high-ticket personal training platform. Our clients are paying top tier prices; they expect a digital experience that feels like stepping into a frozen, enchanted luxury vault. 

Right now, this checkout experience feels like a muddy puddle. The contrast is failing, the interactive states are violating our core design system, and we are leading users into dead ends. 

The UX Accessibility Report is spot on, but it doesn't go far enough. As your Creative Director, I am laying down the law. We are strictly enforcing the **Crystalline Swan** design tokens. 

Here is my Round 1 Design Directive. Implement these changes exactly as specified.

---

### 1. The "Ghost Card" Contrast & Interaction Violation
**Severity:** CRITICAL
**File & Location:** `frontend/src/components/Checkout/PaymentMethodSelector.tsx` (Styled Components: `MethodCard`, `MethodFee`, `FeeSummary`)
**Design Problem:** 
You are using `rgba(255, 255, 255, 0.03)` for the method cards. This is practically invisible and fails WCAG AA contrast miserably. Furthermore, you are using Ice Wing (`#60C0F0`) for the active card border and glow. **Read the design system:** Wing Purple (`#8B5CF6`) is the MANDATORY Glow Accent for ALL interactive elements. Ice Wing is a gaming accent, not an interaction state.
**Design Solution:**
*   **Base Card Background:** Royal Depth (`#003080`) at 40% opacity.
*   **Active State:** Wing Purple (`#8B5CF6`) border and glow.
*   **Text Colors:** Frost White (`#E0ECF4`) at 90% opacity for primary text, 70% for secondary.
**Implementation Notes:**
Replace the `MethodCard` and `MethodFee` styled components with this exact CSS:

```css
const MethodCard = styled.button<{ $active: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 16px;
  border-radius: 12px;
  /* Use Royal Depth for surface */
  background: rgba(0, 48, 128, 0.4); 
  backdrop-filter: blur(12px);
  border: 1px solid ${p => p.$active ? '#8B5CF6' : 'rgba(224, 236, 244, 0.15)'};
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 44px;
  color: #E0ECF4;

  ${p => p.$active && css`
    background: linear-gradient(145deg, rgba(139, 92, 246, 0.15) 0%, rgba(0, 48, 128, 0.6) 100%);
    border-color: #8B5CF6;
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(139, 92, 246, 0.2),
                0 0 0 1px rgba(139, 92, 246, 0.4),
                inset 0 2px 12px rgba(139, 92, 246, 0.15);
  `}

  &:hover:not(:disabled) {
    background: rgba(139, 92, 246, 0.08);
    border-color: rgba(139, 92, 246, 0.4);
    transform: translateY(-2px);
  }

  &:focus-visible {
    outline: 2px solid #8B5CF6;
    outline-offset: 4px;
  }
`;

const MethodFee = styled.span<{ $zero: boolean }>`
  font-size: 0.75rem;
  font-family: 'Sora', sans-serif;
  font-weight: 600;
  /* Frost White at 70% for readability, Wing Purple for zero fee */
  color: ${p => p.$zero ? '#8B5CF6' : 'rgba(224, 236, 244, 0.7)'}; 
`;
```

---

### 2. The "Dead End" Disabled Button
**Severity:** HIGH
**File & Location:** `frontend/src/components/Checkout/methods/ZellePayment.tsx` & `VenmoPayment.tsx` (Component Render)
**Design Problem:** 
If the backend `adminPaymentSettingsRoutes.mjs` fails to return a `zelleRecipient` or `venmoHandle` (or if it's empty), you disable the "Place Order" button (`disabled={isProcessing || !zelleRecipient}`). This traps the user. They click, nothing happens, they leave, we lose money. Unacceptable UX.
**Design Solution:** 
Never disable the primary checkout CTA due to a missing configuration without giving the user a way out. Keep the button enabled. If they click it and the handle is missing, intercept the click and show an error toast.
**Implementation Notes:**
1. In `ZellePayment.tsx` and `VenmoPayment.tsx`, change the button disabled prop to ONLY check `isProcessing`:
   `disabled={isProcessing}`
2. Update the `onClick` handler in both files to intercept:
```tsx
const handleAction = () => {
  if (!zelleRecipient) { // or !venmoHandle
    // Assuming you pass down toastError from parent, or import useToast here
    toastError("This payment method is currently unavailable. Please select another method.");
    return;
  }
  onSubmit();
};

// Update GlowButton:
<GlowButton
  text={isProcessing ? 'Placing Order...' : 'Place Order — Pay with Zelle'}
  theme="purple"
  size="large"
  onClick={handleAction}
  disabled={isProcessing}
/>
```

---

### 3. Micro-Interaction & Touch Target Failures
**Severity:** HIGH
**File & Location:** `frontend/src/components/Checkout/methods/CheckPayment.tsx` & `VenmoPayment.tsx` (Styled Components: `CopyBtn`)
**Design Problem:** 
The `CopyBtn` in Check and Venmo has `padding: 6px` and no `min-height`. This violates the 44px WCAG minimum touch target. Furthermore, the focus state in Zelle uses Ice Wing (`#60C0F0`). I repeat: ALL interactive focus/glow states must be Wing Purple (`#8B5CF6`).
**Design Solution:** 
Standardize the `CopyBtn` across ALL three offline payment files. Enforce a 44px minimum height, proper padding, and Wing Purple focus rings.
**Implementation Notes:**
Replace the `CopyBtn` styled component in `ZellePayment.tsx`, `CheckPayment.tsx`, and `VenmoPayment.tsx` with this unified block:

```css
const CopyBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: rgba(0, 48, 128, 0.6); /* Royal Depth */
  border: 1px solid rgba(224, 236, 244, 0.15); /* Frost White low opacity */
  border-radius: 8px;
  color: #E0ECF4;
  cursor: pointer;
  padding: 0 16px;
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  min-height: 44px; /* MANDATORY TOUCH TARGET */
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover { 
    color: #8B5CF6; /* Wing Purple */
    border-color: #8B5CF6; 
    background: rgba(139, 92, 246, 0.1);
  }
  
  &:active { 
    transform: scale(0.96); 
  }
  
  &:focus-visible { 
    outline: 2px solid #8B5CF6; /* Wing Purple ONLY */
    outline-offset: 2px; 
  }
`;
```

---

### 4. Typography Hierarchy & Data Legibility
**Severity:** MEDIUM
**File & Location:** `frontend/src/components/Checkout/methods/ZellePayment.tsx` (and Check/Venmo) (Styled Components: `StepText`, `Note`, `DividerText`)
**Design Problem:** 
You are washing out critical instructions. `rgba(224, 236, 244, 0.4)` on a dark background is a strain on the eyes. We want a crisp, icy aesthetic, not a foggy window.
**Design Solution:** 
Boost the opacity of Frost White for all instructional text. Use Ice Wing (`#60C0F0`) exclusively for highlighting data (amounts, handles) using the `Fira Code` font.
**Implementation Notes:**
Update these specific styled components across the method files:

```css
const StepText = styled.span`
  font-family: 'Plus Jakarta Sans', sans-serif;
  color: rgba(224, 236, 244, 0.9); /* Boosted to 90% */
  line-height: 1.5;

  strong { 
    color: #60C0F0; /* Ice Wing */
    font-family: 'Fira Code', monospace; /* Data font */
    font-weight: 600;
  }
`;

const Note = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  color: rgba(224, 236, 244, 0.8); /* Boosted to 80% */
  margin: 0;
  padding: 16px;
  background: rgba(0, 32, 96, 0.6); /* Midnight Sapphire base */
  border-left: 3px solid #C6A84B; /* Gilded Fern Luxury Accent for notes */
  border-radius: 0 8px 8px 0;
  line-height: 1.6;
`;

const DividerText = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  color: rgba(224, 236, 244, 0.6); /* Boosted to 60% */
  text-transform: uppercase;
  letter-spacing: 0.1em;
  white-space: nowrap;
`;
```

---

### 5. The Empty State Afterthought
**Severity:** LOW (but visually offensive)
**File & Location:** `frontend/src/components/Checkout/PaymentMethodSelector.tsx` (`ACHPlaceholder`)
**Design Problem:** 
"ACH / eCheck payments coming soon." presented as plain text in a div. This is SwanStudios. Even our "coming soon" states need to look like they belong in a luxury vault.
**Design Solution:** 
Style the placeholder to match the Crystalline Swan aesthetic. Give it a subtle border, an icon, and proper typography.
**Implementation Notes:**
Update the `ACHPlaceholder` component:

```css
const ACHPlaceholder = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
  padding: 48px 24px;
  background: rgba(0, 48, 128, 0.2);
  border: 1px dashed rgba(96, 192, 240, 0.3); /* Ice Wing dashed */
  border-radius: 12px;
  color: rgba(224, 236, 244, 0.7);
  font-family: 'Sora', sans-serif;
  font-size: 0.95rem;

  &::before {
    content: '🏦';
    font-size: 2rem;
    opacity: 0.5;
    filter: grayscale(100%) sepia(100%) hue-rotate(180deg) saturate(300%) brightness(0.8); /* Icy tint */
  }
`;
```

**Execute these changes immediately.** Do not deviate from the hex codes provided. The Crystalline Swan theme relies on the exact interplay of Midnight Sapphire, Royal Depth, and Wing Purple. Make it happen.

---

## Design Collaborator — Round 2

## Design Collaborator Response — Round 1

I appreciate the detailed design directive and the commitment to the Crystalline Swan aesthetic. I'll address each point systematically, noting where I agree and where I see potential issues that need discussion.

---

### 1. Ghost Card Contrast & Interaction — **PARTIAL AGREEMENT**

**AGREE:** 
- The current `rgba(255, 255, 255, 0.03)` is indeed failing contrast requirements
- Wing Purple (`#8B5CF6`) should be the primary interactive accent
- The proposed Royal Depth background at 40% opacity provides better visibility

**DISPUTE:**
The active state gradient may create accessibility issues:
```css
background: linear-gradient(145deg, rgba(139, 92, 246, 0.15) 0%, rgba(0, 48, 128, 0.6) 100%);
```

**Problem:** Gradient backgrounds can make text contrast unpredictable across the card surface. With Frost White at 90% opacity over a varying background, we risk WCAG failures at the lighter gradient end.

**Counter-Proposal:**
```css
${p => p.$active && css`
  background: rgba(0, 48, 128, 0.7); /* Solid, predictable contrast */
  border-color: #8B5CF6;
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(139, 92, 246, 0.25),
              0 0 0 2px rgba(139, 92, 246, 0.5), /* Thicker glow ring */
              inset 0 1px 0 rgba(139, 92, 246, 0.3); /* Subtle top highlight */
`}
```

This maintains the luxury feel through shadow depth while ensuring consistent text contrast.

---

### 2. Dead End Disabled Button — **STRONG AGREEMENT**

**FULLY AGREE:** This is excellent UX thinking. Never trap users in a dead-end state.

**ENHANCEMENT SUGGESTION:**
Let's go one step further. In `frontend/src/components/Checkout/PaymentMethodSelector.tsx`, we should **prevent selection** of methods with missing configuration:

```tsx
// In the methods array mapping
const availableMethods = methods.filter(method => {
  if (method.id === 'zelle' && !zelleRecipient) return false;
  if (method.id === 'venmo' && !venmoHandle) return false;
  return true;
});
```

**Rationale:** If the payment method isn't configured, don't show it as an option. This is cleaner than showing it, letting users select it, then blocking them. However, if you want to keep it visible for "coming soon" awareness, your toast approach is perfect.

**Implementation accepted as specified** with the toast fallback.

---

### 3. Micro-Interaction & Touch Target — **AGREEMENT WITH CLARIFICATION**

**AGREE:**
- 44px minimum touch target is mandatory
- Wing Purple for all focus states
- Standardization across all three payment method files

**CLARIFICATION NEEDED:**
The proposed `CopyBtn` has `padding: 0 16px` with `min-height: 44px`. This works, but we should verify icon sizing:

```tsx
// In the button implementation, ensure icons are sized appropriately:
<CopyBtn onClick={handleCopy}>
  <Copy size={16} /> {/* Explicit size for consistency */}
  Copy
</CopyBtn>
```

**Files to update:**
- `frontend/src/components/Checkout/methods/ZellePayment.tsx` (lines ~85-110)
- `frontend/src/components/Checkout/methods/CheckPayment.tsx` (lines ~75-95)
- `frontend/src/components/Checkout/methods/VenmoPayment.tsx` (lines ~80-100)

**Implementation accepted as specified.**

---

### 4. Typography Hierarchy & Data Legibility — **PARTIAL AGREEMENT**

**AGREE:**
- Boosting opacity for better readability
- Ice Wing for data highlighting with `Fira Code`
- Gilded Fern accent for notes

**DISPUTE:**
The `Note` component's left border at 3px with Gilded Fern may create visual confusion. In the Crystalline Swan system, gold accents typically signify premium/luxury features or success states. Using it for general instructional notes dilutes its meaning.

**Counter-Proposal:**
```css
const Note = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  color: rgba(224, 236, 244, 0.8);
  margin: 0;
  padding: 16px;
  background: rgba(0, 32, 96, 0.6);
  border-left: 3px solid rgba(96, 192, 240, 0.5); /* Ice Wing for info */
  border-radius: 0 8px 8px 0;
  line-height: 1.6;
  
  /* Reserve Gilded Fern for important warnings/premium callouts */
  &.premium-note {
    border-left-color: #C6A84B;
  }
`;
```

**Rationale:** Ice Wing maintains the frozen aesthetic while reserving gold for truly special callouts (e.g., "Premium members receive priority processing").

---

### 5. Empty State Styling — **AGREEMENT WITH ENHANCEMENT**

**AGREE:** The placeholder needs proper styling to match the luxury aesthetic.

**ENHANCEMENT:**
The emoji filter approach is creative but may render inconsistently across browsers. Let's use a proper icon:

```tsx
import { Building2 } from 'lucide-react';

const ACHPlaceholder = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
  padding: 48px 24px;
  background: rgba(0, 48, 128, 0.2);
  border: 1px dashed rgba(96, 192, 240, 0.3);
  border-radius: 12px;
  color: rgba(224, 236, 244, 0.7);
  font-family: 'Sora', sans-serif;
  font-size: 0.95rem;
`;

const PlaceholderIcon = styled(Building2)`
  width: 48px;
  height: 48px;
  color: rgba(96, 192, 240, 0.4);
  stroke-width: 1.5;
`;

// In component:
<ACHPlaceholder>
  <PlaceholderIcon />
  <span>ACH / eCheck payments coming soon</span>
</ACHPlaceholder>
```

**Rationale:** Lucide icons maintain consistency with the rest of the UI and render predictably.

---

## Summary of Positions

**ACCEPT AS-IS:**
- Point 2 (Dead End Button) — Excellent solution
- Point 3 (Touch Targets) — Mandatory compliance

**ACCEPT WITH MODIFICATIONS:**
- Point 1 (Card Contrast) — Solid background instead of gradient for contrast safety
- Point 4 (Typography) — Ice Wing for notes, reserve gold for premium callouts
- Point 5 (Empty State) — Use Lucide icon instead of emoji

**AWAITING CREATIVE DIRECTOR RESPONSE:**
- Gradient vs. solid background for active cards (accessibility vs. visual richness trade-off)
- Border color semantics for notes (information vs. luxury hierarchy)

**3 rounds remaining.** Ready for your feedback on these refinements.

---

## Creative Director (Lead Design Authority) — Round 3

You have a sharp eye for semantic hierarchy and code stability. Your pushback on the Gilded Fern accent (Point 4) is correct—gold must remain sacred for premium tiering. I also fully accept your corrections for Point 3 (explicit `16px` Lucide icon sizing) and Point 5 (replacing the emoji with the `Building2` Lucide icon). Emojis have no place in the Crystalline Swan design system. 

Consider Points 3, 4, and 5 **RESOLVED AND APPROVED** for immediate merge.

However, we have two remaining points of contention regarding visual depth and user flow. Here is my Round 2 Directive.

---

### 1. Ghost Card Active State: Depth vs. Contrast
**File:** `frontend/src/components/Checkout/PaymentMethodSelector.tsx`
**Status:** DISPUTE

**The Issue:** You proposed flattening the active state to a solid `rgba(0, 48, 128, 0.7)` to guarantee WCAG contrast. I appreciate the accessibility check, but a flat background destroys the "frozen vault" aesthetic. We need the volumetric lighting that a gradient provides to make the active card feel like a physical, illuminated object.

**The Solution:** We do not compromise on depth, we engineer around the contrast. We will keep the gradient but deepen the terminal color to an abyssal navy (`rgba(0, 24, 72, 0.9)`), ensuring the lightest point of the gradient still mathematically passes AA contrast against Frost White (`#E0ECF4`). I accept your enhanced shadow and inset highlight.

**Implementation:**
Update the `$active` state in `MethodCard`:

```css
  ${p => p.$active && css`
    /* Deepened gradient for guaranteed contrast while maintaining volumetric depth */
    background: linear-gradient(145deg, rgba(139, 92, 246, 0.25) 0%, rgba(0, 24, 72, 0.9) 100%);
    border-color: #8B5CF6;
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(139, 92, 246, 0.25),
                0 0 0 1px rgba(139, 92, 246, 0.5), /* Your thicker glow ring */
                inset 0 1px 0 rgba(139, 92, 246, 0.3); /* Your subtle top highlight */
  `}
```

---

### 2. Unconfigured Payment Methods: Filtering vs. Badging
**File:** `frontend/src/components/Checkout/PaymentMethodSelector.tsx`
**Status:** DISPUTE

**The Issue:** You suggested filtering out unconfigured methods entirely (`methods.filter(...)`). This is an anti-pattern for a premium platform. If a user knows we offer Venmo but suddenly doesn't see it, they will assume the site is broken or they are in the wrong place. We must show them the option exists, but clearly communicate its current status *before* they can select it.

**The Solution:** Do not hide the methods. Do not let them select it and fail at the "Place Order" button (my original Round 1 fallback). Instead, disable the `MethodCard` itself and apply an elegant `UnavailableBadge`. 

**Implementation:**
1. Do NOT filter the `methods` array.
2. Add this new styled component to `PaymentMethodSelector.tsx`:

```css
const UnavailableBadge = styled.div`
  position: absolute;
  top: -8px;
  right: -8px;
  background: rgba(0, 24, 72, 0.9);
  border: 1px solid rgba(224, 236, 244, 0.2);
  color: rgba(224, 236, 244, 0.6);
  font-family: 'Sora', sans-serif;
  font-size: 0.65rem;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 6px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  backdrop-filter: blur(4px);
`;
```

3. Update the render loop in `PaymentMethodSelector.tsx` to handle the disabled state at the card level:

```tsx
{methods.map(method => {
  // Determine if method is missing required backend config
  const isUnconfigured = 
    (method.id === 'zelle' && !zelleRecipient) || 
    (method.id === 'venmo' && !venmoHandle);

  return (
    <MethodCard
      key={method.id}
      $active={selectedMethod === method.id}
      disabled={isUnconfigured}
      onClick={() => !isUnconfigured && onSelect(method.id)}
      style={{ opacity: isUnconfigured ? 0.5 : 1 }}
    >
      {isUnconfigured && <UnavailableBadge>Unavailable</UnavailableBadge>}
      <method.icon size={24} />
      <span>{method.name}</span>
      <MethodFee $zero={method.fee === 0}>
        {method.fee === 0 ? 'No Fee' : `+${method.fee}%`}
      </MethodFee>
    </MethodCard>
  );
})}
```

This ensures the user sees the full suite of SwanStudios payment options, understands why they cannot click one, and prevents them from ever reaching a dead-end "Place Order" button. 

Review these two final adjustments. If you agree, we have our consensus.

---

## Design Collaborator — Round 4

## Design Collaborator Response — Round 2

Excellent refinements. Your commitment to both aesthetic integrity and user clarity is exactly what this platform needs. Let me address both points.

---

### 1. Ghost Card Active State: Depth vs. Contrast — **CONSENSUS REACHED**

**FULLY AGREE.** Your solution is elegant engineering.

**Analysis:**
The deepened gradient `linear-gradient(145deg, rgba(139, 92, 246, 0.25) 0%, rgba(0, 24, 72, 0.9) 100%)` achieves both goals:
- **Contrast Safety:** The terminal color `rgba(0, 24, 72, 0.9)` is dark enough that Frost White at 90% opacity (`rgba(224, 236, 244, 0.9)`) will pass WCAG AA across the entire gradient
- **Visual Depth:** The Wing Purple tint at the gradient start creates the volumetric "illuminated from within" effect

The enhanced shadow stack with the thicker glow ring (`0 0 0 1px`) and inset highlight creates proper dimensionality without compromising legibility.

**APPROVED FOR IMPLEMENTATION** in `frontend/src/components/Checkout/PaymentMethodSelector.tsx` (lines ~45-65, `MethodCard` styled component).

---

### 2. Unconfigured Payment Methods: Filtering vs. Badging — **CONSENSUS REACHED WITH MINOR ENHANCEMENT**

**STRONGLY AGREE** with the badging approach. You're absolutely right that hiding options creates confusion on a premium platform. The "Unavailable" badge is the correct UX pattern.

**ENHANCEMENT REQUEST:**
Let's add one small accessibility improvement to the disabled state:

```tsx
<MethodCard
  key={method.id}
  $active={selectedMethod === method.id}
  disabled={isUnconfigured}
  onClick={() => !isUnconfigured && onSelect(method.id)}
  style={{ 
    opacity: isUnconfigured ? 0.5 : 1,
    cursor: isUnconfigured ? 'not-allowed' : 'pointer' // Explicit cursor feedback
  }}
  aria-disabled={isUnconfigured} // Screen reader support
  aria-label={`${method.name}${isUnconfigured ? ' - Currently unavailable' : ''}`}
>
  {isUnconfigured && <UnavailableBadge>Unavailable</UnavailableBadge>}
  <method.icon size={24} />
  <span>{method.name}</span>
  <MethodFee $zero={method.fee === 0}>
    {method.fee === 0 ? 'No Fee' : `+${method.fee}%`}
  </MethodFee>
</MethodCard>
```

**Rationale:**
- `cursor: not-allowed` provides immediate visual feedback on hover
- `aria-disabled` and enhanced `aria-label` ensure screen reader users understand the state
- Maintains your visual design while adding semantic clarity

**APPROVED FOR IMPLEMENTATION** in `frontend/src/components/Checkout/PaymentMethodSelector.tsx` (lines ~120-145, render loop).

---

## CONSENSUS REACHED

### Final Implementation Checklist

**File: `frontend/src/components/Checkout/PaymentMethodSelector.tsx`**

✅ **Lines ~45-65:** Update `MethodCard` active state with deepened gradient:
```css
background: linear-gradient(145deg, rgba(139, 92, 246, 0.25) 0%, rgba(0, 24, 72, 0.9) 100%);
box-shadow: 0 12px 24px rgba(139, 92, 246, 0.25),
            0 0 0 1px rgba(139, 92, 246, 0.5),
            inset 0 1px 0 rgba(139, 92, 246, 0.3);
```

✅ **Lines ~70-85:** Add `UnavailableBadge` styled component as specified

✅ **Lines ~120-145:** Update render loop with disabled state handling and accessibility attributes

---

**File: `frontend/src/components/Checkout/methods/ZellePayment.tsx`**

✅ **Lines ~85-110:** Replace `CopyBtn` with standardized version (44px min-height, Wing Purple focus)

✅ **Lines ~50-70:** Update `StepText` and `Note` components with Ice Wing data highlighting and boosted opacity

✅ **Lines ~140-155:** Implement `handleAction` with toast fallback (keep button enabled, validate on click)

---

**File: `frontend/src/components/Checkout/methods/CheckPayment.tsx`**

✅ **Lines ~75-95:** Replace `CopyBtn` with standardized version

✅ **Lines ~45-65:** Update `StepText` and `Note` components

---

**File: `frontend/src/components/Checkout/methods/VenmoPayment.tsx`**

✅ **Lines ~80-100:** Replace `CopyBtn` with standardized version

✅ **Lines ~50-70:** Update `StepText` and `Note` components

✅ **Lines ~135-150:** Implement `handleAction` with toast fallback

---

**File: `frontend/src/components/Checkout/PaymentMethodSelector.tsx` (ACH Placeholder)**

✅ **Lines ~160-180:** Replace emoji with `Building2` Lucide icon as specified in Round 1 Response

---

### Design Token Compliance Summary

| Element | Color | Opacity | Usage |
|---------|-------|---------|-------|
| Card Base | Royal Depth `#003080` | 40% | Surface background |
| Card Active | Gradient: Wing Purple → Midnight Navy | 25% → 90% | Active state depth |
| Interactive Glow | Wing Purple `#8B5CF6` | 100% | All focus/active borders |
| Primary Text | Frost White `#E0ECF4` | 90% | Card labels, instructions |
| Secondary Text | Frost White `#E0ECF4` | 70-80% | Fees, notes |
| Data Highlight | Ice Wing `#60C0F0` | 100% | Amounts, handles (Fira Code) |
| Info Borders | Ice Wing `#60C0F0` | 50% | Note left borders |
| Premium Accent | Gilded Fern `#C6A84B` | 100% | Reserved for premium callouts only |

---

**All points resolved.** The Crystalline Swan design system is now consistently enforced across the checkout flow. Ready for final authority approval and implementation.

**2 rounds remaining** (but consensus achieved — no further rounds needed unless new issues arise).

---

