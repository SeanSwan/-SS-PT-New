# UX/UI Design Quality — Recursive Consensus Debate Log

> **Consensus:** YES — Models agreed
> **Rounds:** 4
> **Tokens:** 36,976 input / 7,975 output

---

## Creative Director (Lead Design Authority) — Round 1

As the Creative Director for SwanStudios, I have reviewed the Phase 1 accessibility report and the provided code. 

Let me be absolutely clear: **Functional is not enough.** We are building a premium, luxury fitness platform. The current implementation relies on muddy semi-transparent overlays, guesses at opacities, and completely misses the mark on our *Enchanted Apex: Crystalline Swan* design system. 

When a user pays for SwanStudios, they are paying for an experience that feels like stepping into a high-end, futuristic vault. Failing WCAG AA contrast ratios is unacceptable, not just for accessibility, but because it looks cheap.

Here is my authoritative design directive for Round 1. Implement these changes exactly as specified.

---

### 1. The "Muddy Water" Inputs (CRITICAL)
**File:** `frontend/src/components/FoodTracker/FoodSearchPanel.tsx` & `frontend/src/components/Social/Feed/styles/CreatePostStyles.ts`
**Design Problem:** You are using `rgba(0,32,96,0.5)` (Midnight Sapphire at 50%) with `rgba(255,255,255,0.5)` text. This creates a washed-out, illegible mess. We do not guess opacities. We use our solid dark tokens to create depth.
**Design Solution:** Inputs must sit in the deep background (`Carbon #141419`) to make the `Frost White #E0ECF4` text pop. Placeholders should use `Swan Lavender #4070C0` for elegant, readable contrast.

**Implementation Notes (FoodSearchPanel.tsx - `SInput`):**
```css
const SInput = styled.input`
  width: 100%; height: 48px; padding: 0 ${theme.spacing.md} 0 44px;
  /* FIX: Solid Carbon background, Royal Depth border */
  background: #141419; 
  border: 1px solid #003080;
  border-radius: 12px; 
  color: #E0ECF4; /* Frost White */
  font-family: 'Sora', sans-serif; 
  font-size: ${theme.typography.scale.base}; 
  outline: none;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);

  &::placeholder { 
    color: #4070C0; /* Swan Lavender - passes AA on #141419 */
  }
  
  &:focus, &:focus-visible { 
    border-color: #8B5CF6; /* Wing Purple */
    /* FIX: Ice Wing glow on Purple border per Dual-Glow rules */
    box-shadow: 0 0 12px rgba(96, 192, 240, 0.4); 
    outline: none;
  }
`;
```

---

### 2. The Lifeless "Add to Log" Button (HIGH)
**File:** `frontend/src/components/FoodTracker/FoodSearchPanel.tsx`
**Design Problem:** The `AddBtn` lacks tactile feedback. A simple hover box-shadow is not a premium interaction. It completely ignores our mandated Dual-Button Glow system.
**Design Solution:** This is a primary action. It must use `Midnight Sapphire #002060` as the base, and emit a `Wing Purple #8B5CF6` glow on hover, with a physical "press" animation.

**Implementation Notes (FoodSearchPanel.tsx - `AddBtn`):**
```css
const AddBtn = styled.button`
  width: 100%; min-height: 44px; display: flex; align-items: center; justify-content: center;
  gap: ${theme.spacing.sm}; 
  background: #002060; /* Midnight Sapphire */
  border: 1px solid #003080; /* Royal Depth */
  border-radius: 10px;
  color: #E0ECF4; /* Frost White */
  font: ${theme.typography.weight.semibold} ${theme.typography.scale.sm} 'Sora', sans-serif;
  cursor: pointer; 
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover { 
    background: #003080;
    /* FIX: Blue button -> Purple glow */
    box-shadow: 0 0 16px rgba(139, 92, 246, 0.5); 
    transform: translateY(-2px); 
  }
  
  &:active { 
    transform: translateY(1px); 
    box-shadow: 0 0 8px rgba(139, 92, 246, 0.3);
  }

  &:focus-visible {
    outline: 2px solid #8B5CF6;
    outline-offset: 2px;
  }
`;
```

---

### 3. Filter Chips Contrast & State (CRITICAL)
**File:** `frontend/src/components/FoodTracker/FoodSearchPanel.tsx`
**Design Problem:** The unselected chips use `rgba(0,32,96,0.4)` background with muted text. Invisible to anyone with slight visual impairment.
**Design Solution:** Unselected chips sit on `Graphite #1A1A24`. Selected chips use `Wing Purple #8B5CF6` and MUST emit the `Ice Wing #60C0F0` glow per our rules.

**Implementation Notes (FoodSearchPanel.tsx - `Chip`):**
```css
const Chip = styled.button<{ $on: boolean }>`
  min-height: 44px; padding: 0 ${theme.spacing.md}; border-radius: 22px;
  font: ${theme.typography.weight.medium} ${theme.typography.scale.sm} 'Sora', sans-serif;
  cursor: pointer; white-space: nowrap; flex-shrink: 0; 
  transition: all 0.3s ease;

  /* FIX: Strict token usage for states */
  background: ${({ $on }) => $on ? '#8B5CF6' : '#1A1A24'};
  border: 1px solid ${({ $on }) => $on ? '#8B5CF6' : '#003080'};
  color: #E0ECF4; /* Frost White always for legibility */
  
  /* FIX: Purple button -> Cyan glow */
  box-shadow: ${({ $on }) => $on ? '0 0 12px rgba(96, 192, 240, 0.5)' : 'none'};

  &:hover { 
    border-color: ${({ $on }) => $on ? '#8B5CF6' : '#4070C0'}; 
    background: ${({ $on }) => $on ? '#8B5CF6' : '#141419'};
  }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 2px;
  }
`;
```

---

### 4. The Boring Floating Action Button (MEDIUM)
**File:** `frontend/src/components/Social/Feed/styles/CreatePostStyles.ts`
**Design Problem:** `linear-gradient(135deg, #8B5CF6, #8B5CF6)` is not a gradient. It's a flat color pretending to be one. This is our hero CTA for content creation.
**Design Solution:** Implement the MANDATORY **Cosmic Nebula gradient** (`#8B5CF6` to `#60C0F0`).

**Implementation Notes (CreatePostStyles.ts - `FloatingCreateButton`):**
```css
export const FloatingCreateButton = styled.button`
  /* ... existing positioning ... */
  
  /* FIX: Cosmic Nebula Gradient */
  background: linear-gradient(135deg, #8B5CF6 0%, #60C0F0 100%);
  color: #E0ECF4;
  border: none;
  
  /* FIX: Premium resting shadow */
  box-shadow: 0 4px 16px rgba(139, 92, 246, 0.4);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);

  &:hover {
    transform: scale(1.08) translateY(-4px);
    /* FIX: Ice Wing hover glow */
    box-shadow: 0 12px 24px rgba(96, 192, 240, 0.6);
  }
  
  &:focus-visible {
    outline: 3px solid #E0ECF4;
    outline-offset: 2px;
  }
`;
```

---

### 5. Muddy Checkboxes in Profile Edit (HIGH)
**File:** `frontend/src/components/UserDashboard/components/EditProfileChartToggles.tsx`
**Design Problem:** The custom checkbox uses a pseudo-element checkmark that looks jagged, and the focus state uses a messy combination of outline and box-shadow that clashes.
**Design Solution:** Clean, sharp geometry. `Carbon #141419` base. `Wing Purple #8B5CF6` when checked. `Ice Wing #60C0F0` for the focus ring.

**Implementation Notes (EditProfileChartToggles.tsx - `Checkbox`):**
```css
const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  appearance: none;
  -webkit-appearance: none;
  width: 22px; /* Slightly larger for touch */
  height: 22px;
  min-width: 22px;
  border: 2px solid #003080; /* Royal Depth */
  border-radius: 6px;
  background: #141419; /* Carbon */
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;

  &:checked {
    background: #8B5CF6; /* Wing Purple */
    border-color: #8B5CF6;
  }

  /* Crisper checkmark */
  &:checked::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 7px;
    width: 5px;
    height: 10px;
    border: solid #E0ECF4; /* Frost White */
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
  }

  &:focus-visible {
    /* FIX: Purple element -> Cyan glow */
    outline: 2px solid #60C0F0; /* Ice Wing */
    outline-offset: 3px;
    box-shadow: 0 0 12px rgba(96, 192, 240, 0.5);
  }
`;
```

### Summary of Directives
Stop using `rgba()` with white/black to fake depth. We have a meticulously crafted palette (`Carbon`, `Graphite`, `Royal Depth`). Use them. Ensure every interactive element has a `min-height: 44px` (which you mostly did well, keep it up) and strictly enforce the **Dual-Button Glow** rule. 

Update these files immediately and report back for Round 2.

---

## Design Collaborator — Round 2

## DISAGREE (with clarifications and technical corrections)

I appreciate the Creative Director's passion for premium design, but several directives contain **technical errors** and **accessibility violations** that would harm the user experience. I'll address each point:

---

### 1. Input Fields - PARTIALLY AGREE with Critical Fix Needed

**AGREE:** Solid backgrounds are better than semi-transparent overlays for readability.

**DISAGREE:** The proposed `#4070C0` (Swan Lavender) placeholder on `#141419` (Carbon) **fails WCAG AA** (contrast ratio ~3.8:1, needs 4.5:1).

**Counter-Proposal:**
```css
const SInput = styled.input`
  background: #141419; /* ✓ Agree - Carbon */
  border: 1px solid #003080; /* ✓ Agree - Royal Depth */
  color: #E0ECF4; /* ✓ Agree - Frost White */
  
  &::placeholder { 
    color: #6B8FC9; /* FIX: Lightened to pass AA (4.52:1) */
    /* Alternative: Use #7BA3D8 for AAA compliance (7.1:1) */
  }
  
  &:focus { 
    border-color: #8B5CF6; /* ✓ Agree */
    box-shadow: 0 0 12px rgba(96, 192, 240, 0.4); /* ✓ Agree - Ice Wing glow */
  }
`;
```

**Files to update:**
- `frontend/src/components/FoodTracker/FoodSearchPanel.tsx` (lines 45-62)
- `frontend/src/components/Social/Feed/styles/CreatePostStyles.ts` (lines 78-95)

---

### 2. "Add to Log" Button - AGREE with Enhancement

**AGREE:** The Dual-Glow system and press animation elevate the interaction.

**ENHANCEMENT:** Add disabled state for incomplete forms:
```css
const AddBtn = styled.button`
  /* All proposed styles ✓ */
  
  &:disabled {
    background: #1A1A24; /* Graphite */
    border-color: #003080;
    color: #4070C0; /* Swan Lavender */
    cursor: not-allowed;
    opacity: 0.6;
    box-shadow: none;
    transform: none;
  }
`;
```

**File:** `frontend/src/components/FoodTracker/FoodSearchPanel.tsx` (lines 120-145)

---

### 3. Filter Chips - DISAGREE on Selected State Color

**AGREE:** Unselected chips need better contrast (`#1A1A24` Graphite is correct).

**DISAGREE:** Using `#8B5CF6` (Wing Purple) for selected chips creates **semantic confusion** with primary action buttons. Users won't distinguish "selected filter" from "clickable button."

**Counter-Proposal:**
```css
const Chip = styled.button<{ $on: boolean }>`
  min-height: 44px;
  background: ${({ $on }) => $on ? '#003080' : '#1A1A24'}; /* Royal Depth when selected */
  border: 1px solid ${({ $on }) => $on ? '#60C0F0' : '#003080'}; /* Ice Wing border */
  color: #E0ECF4;
  
  /* Selected chips get Ice Wing glow, not purple */
  box-shadow: ${({ $on }) => $on ? '0 0 12px rgba(96, 192, 240, 0.5)' : 'none'};
  
  &:hover { 
    background: ${({ $on }) => $on ? '#003080' : '#141419'};
    border-color: #60C0F0; /* Ice Wing on hover for both states */
  }
`;
```

**Rationale:** This creates visual hierarchy: Purple = Primary Actions, Cyan = Selected States/Focus.

**File:** `frontend/src/components/FoodTracker/FoodSearchPanel.tsx` (lines 85-110)

---

### 4. Floating Action Button - AGREE

**FULL AGREEMENT:** The Cosmic Nebula gradient is the correct implementation. The current flat color is indeed a mistake.

**File:** `frontend/src/components/Social/Feed/styles/CreatePostStyles.ts` (lines 12-35)

---

### 5. Checkboxes - DISAGREE on Size

**AGREE:** Clean geometry, proper color tokens, and Dual-Glow focus states.

**DISAGREE:** 22px checkboxes are **too large** for desktop forms and break visual rhythm with 16px body text.

**Counter-Proposal:**
```css
const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  width: 20px; /* Better proportion to text */
  height: 20px;
  min-width: 20px; /* Still meets 20px minimum for touch targets */
  border: 2px solid #003080;
  background: #141419;
  
  /* All other proposed styles ✓ */
  
  &:checked::after {
    top: 2px; /* Adjust for smaller size */
    left: 6px;
    width: 5px;
    height: 9px;
  }
`;
```

**File:** `frontend/src/components/UserDashboard/components/EditProfileChartToggles.tsx` (lines 67-92)

---

## Summary of Disputes

| Issue | Creative Director | My Position | Reason |
|-------|------------------|-------------|---------|
| Placeholder color | `#4070C0` | `#6B8FC9` | WCAG AA compliance (4.5:1) |
| Selected chip color | `#8B5CF6` (Purple) | `#003080` (Royal Depth) | Semantic clarity |
| Checkbox size | 22px | 20px | Visual proportion to text |

**Consensus on:** Input backgrounds, button animations, Dual-Glow system, FAB gradient, focus states.

**Awaiting Round 2:** Please confirm if accessibility compliance overrides the exact color choices, or if we need to adjust the base palette itself.

---

## Creative Director (Lead Design Authority) — Round 3

This is exactly why I value a strong Design Collaborator. You caught the WCAG contrast failure on the placeholder, and your point about semantic hierarchy for the filter chips is spot on. A premium experience must be both beautiful and highly usable. 

However, as the Creative Director, I must enforce strict adherence to our design system. We do not use "rogue" hex codes, and we do not sacrifice touch accessibility for desktop visual rhythm. 

Here are my directives for resolving our remaining disputes in Round 2.

---

### 1. Placeholder Color (DISAGREE on rogue hex, AGREE on accessibility)
**File:** `frontend/src/components/FoodTracker/FoodSearchPanel.tsx` (lines 45-62) & `frontend/src/components/Social/Feed/styles/CreatePostStyles.ts` (lines 78-95)

**Why I Disagree:** You proposed `#6B8FC9`. We do not invent untokenized hex codes on the fly. That leads to a fragmented, unmaintainable codebase. 
**The Solution:** I am officially adding your alternative suggestion, `#7BA3D8`, to the *Enchanted Apex: Crystalline Swan* design system as our new token: **`Lavender Mist`**. This guarantees AAA compliance (7.1:1) while maintaining our cool-toned, crystalline aesthetic.

**Implementation Directive:**
```css
const SInput = styled.input`
  /* ... previously agreed base styles ... */
  
  &::placeholder { 
    color: #7BA3D8; /* NEW TOKEN: Lavender Mist (AAA Compliant) */
    opacity: 1; /* Ensure browser defaults don't wash this out */
  }
`;
```

---

### 2. Filter Chips Selected State (AGREE)
**File:** `frontend/src/components/FoodTracker/FoodSearchPanel.tsx` (lines 85-110)

**Why I Agree:** Your argument regarding semantic confusion is excellent. Reserving `Wing Purple` strictly for primary actions and using `Royal Depth` + `Ice Wing` for selected states creates a much stronger visual hierarchy. It perfectly aligns with our "Dual-Glow" rules.

**Implementation Directive:** 
I approve your exact counter-proposal. Proceed with merging this into the codebase.

```css
const Chip = styled.button<{ $on: boolean }>`
  min-height: 44px;
  background: ${({ $on }) => $on ? '#003080' : '#1A1A24'}; /* Royal Depth / Graphite */
  border: 1px solid ${({ $on }) => $on ? '#60C0F0' : '#003080'}; /* Ice Wing / Royal Depth */
  color: #E0ECF4;
  
  box-shadow: ${({ $on }) => $on ? '0 0 12px rgba(96, 192, 240, 0.5)' : 'none'};
  
  &:hover { 
    background: ${({ $on }) => $on ? '#003080' : '#141419'};
    border-color: #60C0F0; 
  }
  /* ... focus states as previously agreed ... */
`;
```

---

### 3. Checkbox Size & Touch Targets (PARTIALLY AGREE)
**File:** `frontend/src/components/UserDashboard/components/EditProfileChartToggles.tsx` (lines 67-92)

**Why I Disagree:** You are correct that a 20px visual box aligns better with our 16px body text rhythm. However, simply shrinking the input to 20px violates the WCAG 2.2 AA Target Size (Minimum) requirement of 24x24px. We cannot compromise accessibility for desktop aesthetics.
**The Solution:** We will use your 20px visual checkbox, but we MUST wrap it in a label that enforces a minimum 24px clickable area. 

**Implementation Directive:**
```css
/* NEW: Mandatory wrapper to ensure WCAG 2.2 AA touch target compliance */
const CheckboxWrapper = styled.label`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  min-height: 24px; /* Strict WCAG minimum */
  cursor: pointer;
  color: #E0ECF4;
  font: ${theme.typography.weight.regular} ${theme.typography.scale.base} 'Sora', sans-serif;
`;

const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  width: 20px; 
  height: 20px;
  flex-shrink: 0; /* Prevent squishing in flex layouts */
  margin: 0; /* Reset browser defaults inside the label */
  border: 2px solid #003080;
  background: #141419;
  /* ... previously agreed border-radius, transitions, and focus styles ... */
  
  &:checked::after {
    content: '';
    position: absolute;
    top: 2px; 
    left: 6px;
    width: 5px;
    height: 9px;
    border: solid #E0ECF4;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
  }
`;
```

---

### Summary for Round 2
We are very close to a flawless implementation. 
1. Update the placeholder to the official `Lavender Mist #7BA3D8` token.
2. Implement your semantic chip states.
3. Apply the 20px checkbox with the mandatory 24px `CheckboxWrapper`.

Review these final adjustments. If you are aligned, we can finalize this phase of the UI audit.

---

## Design Collaborator — Round 4

## CONSENSUS REACHED

The Creative Director has addressed all technical concerns while maintaining design system integrity. I agree with all Round 2 directives.

---

## Merged Final Implementation

### 1. Input Placeholder - CONSENSUS ✓
**Files:** 
- `frontend/src/components/FoodTracker/FoodSearchPanel.tsx` (lines 45-62)
- `frontend/src/components/Social/Feed/styles/CreatePostStyles.ts` (lines 78-95)

**Agreed Solution:**
```css
const SInput = styled.input`
  width: 100%; 
  height: 48px; 
  padding: 0 ${theme.spacing.md} 0 44px;
  background: #141419; /* Carbon */
  border: 1px solid #003080; /* Royal Depth */
  border-radius: 12px; 
  color: #E0ECF4; /* Frost White */
  font-family: 'Sora', sans-serif; 
  font-size: ${theme.typography.scale.base}; 
  outline: none;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);

  &::placeholder { 
    color: #7BA3D8; /* Lavender Mist - AAA compliant (7.1:1) */
    opacity: 1;
  }
  
  &:focus, &:focus-visible { 
    border-color: #8B5CF6; /* Wing Purple */
    box-shadow: 0 0 12px rgba(96, 192, 240, 0.4); /* Ice Wing glow */
    outline: none;
  }
`;
```

**Design System Update:** Add `Lavender Mist #7BA3D8` to official color tokens.

---

### 2. "Add to Log" Button - CONSENSUS ✓
**File:** `frontend/src/components/FoodTracker/FoodSearchPanel.tsx` (lines 120-145)

**Agreed Solution:**
```css
const AddBtn = styled.button`
  width: 100%; 
  min-height: 44px; 
  display: flex; 
  align-items: center; 
  justify-content: center;
  gap: ${theme.spacing.sm}; 
  background: #002060; /* Midnight Sapphire */
  border: 1px solid #003080; /* Royal Depth */
  border-radius: 10px;
  color: #E0ECF4; /* Frost White */
  font: ${theme.typography.weight.semibold} ${theme.typography.scale.sm} 'Sora', sans-serif;
  cursor: pointer; 
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover { 
    background: #003080;
    box-shadow: 0 0 16px rgba(139, 92, 246, 0.5); /* Purple glow */
    transform: translateY(-2px); 
  }
  
  &:active { 
    transform: translateY(1px); 
    box-shadow: 0 0 8px rgba(139, 92, 246, 0.3);
  }

  &:disabled {
    background: #1A1A24; /* Graphite */
    border-color: #003080;
    color: #4070C0; /* Swan Lavender */
    cursor: not-allowed;
    opacity: 0.6;
    box-shadow: none;
    transform: none;
  }

  &:focus-visible {
    outline: 2px solid #8B5CF6;
    outline-offset: 2px;
  }
`;
```

---

### 3. Filter Chips - CONSENSUS ✓
**File:** `frontend/src/components/FoodTracker/FoodSearchPanel.tsx` (lines 85-110)

**Agreed Solution:**
```css
const Chip = styled.button<{ $on: boolean }>`
  min-height: 44px; 
  padding: 0 ${theme.spacing.md}; 
  border-radius: 22px;
  font: ${theme.typography.weight.medium} ${theme.typography.scale.sm} 'Sora', sans-serif;
  cursor: pointer; 
  white-space: nowrap; 
  flex-shrink: 0; 
  transition: all 0.3s ease;

  background: ${({ $on }) => $on ? '#003080' : '#1A1A24'}; /* Royal Depth / Graphite */
  border: 1px solid ${({ $on }) => $on ? '#60C0F0' : '#003080'}; /* Ice Wing / Royal Depth */
  color: #E0ECF4; /* Frost White */
  
  box-shadow: ${({ $on }) => $on ? '0 0 12px rgba(96, 192, 240, 0.5)' : 'none'}; /* Ice Wing glow */

  &:hover { 
    border-color: #60C0F0; 
    background: ${({ $on }) => $on ? '#003080' : '#141419'};
  }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 2px;
  }
`;
```

**Semantic Hierarchy Established:** Purple = Primary Actions | Cyan = Selected States/Focus

---

### 4. Floating Action Button - CONSENSUS ✓
**File:** `frontend/src/components/Social/Feed/styles/CreatePostStyles.ts` (lines 12-35)

**Agreed Solution:**
```css
export const FloatingCreateButton = styled.button`
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  
  background: linear-gradient(135deg, #8B5CF6 0%, #60C0F0 100%); /* Cosmic Nebula */
  color: #E0ECF4;
  border: none;
  
  box-shadow: 0 4px 16px rgba(139, 92, 246, 0.4);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  cursor: pointer;

  &:hover {
    transform: scale(1.08) translateY(-4px);
    box-shadow: 0 12px 24px rgba(96, 192, 240, 0.6); /* Ice Wing glow */
  }
  
  &:focus-visible {
    outline: 3px solid #E0ECF4;
    outline-offset: 2px;
  }
`;
```

---

### 5. Checkboxes - CONSENSUS ✓
**File:** `frontend/src/components/UserDashboard/components/EditProfileChartToggles.tsx` (lines 67-92)

**Agreed Solution:**
```css
const CheckboxWrapper = styled.label`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  min-height: 24px; /* WCAG 2.2 AA touch target */
  cursor: pointer;
  color: #E0ECF4;
  font: ${theme.typography.weight.regular} ${theme.typography.scale.base} 'Sora', sans-serif;
`;

const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  appearance: none;
  -webkit-appearance: none;
  width: 20px; 
  height: 20px;
  min-width: 20px;
  flex-shrink: 0;
  margin: 0;
  border: 2px solid #003080; /* Royal Depth */
  border-radius: 6px;
  background: #141419; /* Carbon */
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;

  &:checked {
    background: #8B5CF6; /* Wing Purple */
    border-color: #8B5CF6;
  }

  &:checked::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 6px;
    width: 5px;
    height: 9px;
    border: solid #E0ECF4; /* Frost White */
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
  }

  &:focus-visible {
    outline: 2px solid #60C0F0; /* Ice Wing */
    outline-offset: 3px;
    box-shadow: 0 0 12px rgba(96, 192, 240, 0.5);
  }
`;
```

---

## Implementation Checklist

- [ ] Add `Lavender Mist #7BA3D8` to design system tokens
- [ ] Update all input placeholders (2 files)
- [ ] Implement enhanced button states with disabled handling
- [ ] Apply semantic chip color hierarchy
- [ ] Replace FAB flat color with Cosmic Nebula gradient
- [ ] Refactor checkboxes with WCAG-compliant wrapper labels

**All changes maintain WCAG AA compliance, enforce the Dual-Glow system, and preserve the Enchanted Apex: Crystalline Swan aesthetic.**

---

