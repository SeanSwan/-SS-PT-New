# UX/UI Design Quality — Recursive Consensus Debate Log

> **Consensus:** YES — Models agreed
> **Rounds:** 4
> **Tokens:** 20,318 input / 7,539 output

---

## Creative Director (Lead Design Authority) — Round 1

Listen to me. We are building SwanStudios, not a discount gym app. We charge premium prices because we deliver a premium, immersive experience. The "Crystalline Swan" theme is about a *frozen enchanted forest* meeting a *deep-ocean luxury vault*. 

Right now, this `WorkoutsTab.tsx` file looks like a muddy, inaccessible wireframe. The hardcoded opacities are destroying our contrast, the interactive elements are semantically dead, and the luxury feel is completely absent. 

Here is my definitive design vision and exact implementation directives to fix this component. Do not deviate from these tokens.

---

### 1. The Contrast & Token Crisis (Color & Typography)
**Severity:** CRITICAL
**File & Location:** `WorkoutsTab.tsx` -> Styled Components (`StatLabel`, `WorkoutDate`, `EmptyState`, `MetaChip`, `ErrorCard`)
**Design Problem:** You are using muddy, hardcoded RGBA values (`rgba(20, 20, 25, 0.8)`) that fail WCAG AA contrast ratios and ignore our design system. The text is invisible, and the error card uses an illegal red (`#C92A54`) that is NOT in our palette.
**Design Solution:** 
We are moving to our deep-ocean vault backgrounds with high-contrast Frost White text. 
*   **Backgrounds:** Use `Carbon #141419` for standard cards and `Graphite #1A1A24` for elevated/hover states.
*   **Primary Text:** `Frost White #E0ECF4` at 100% opacity.
*   **Secondary Text:** `Frost White #E0ECF4` at 75% opacity (guarantees >4.5:1 contrast on Carbon/Graphite).
*   **Error State:** Replace the illegal red with `Swan Lavender #4070C0` for the border, keeping it cold and thematic.

**Implementation Notes:**
1.  Update `StatLabel` and `WorkoutDate`: `color: rgba(224, 236, 244, 0.75);` (Frost White @ 75%).
2.  Update `EmptyState` text: `color: rgba(224, 236, 244, 0.8);`.
3.  Update `MetaChip` background: `background: rgba(80, 160, 240, 0.15);` (Arctic Cyan @ 15% for data). Text: `color: #E0ECF4;`.
4.  Update `ErrorCard`: `border-left: 4px solid #4070C0;` (Swan Lavender). `background: #141419;` (Carbon).

---

### 2. The Dead Interaction (Accessibility & UX)
**Severity:** HIGH
**File & Location:** `WorkoutsTab.tsx` -> `WorkoutCard`
**Design Problem:** `WorkoutCard` is a `div` masquerading as a button. It has no keyboard focus, no ARIA roles, and fails basic accessibility standards. Furthermore, it lacks the premium "Dual-Button Glow" interaction defined in our brand guidelines.
**Design Solution:** 
Transform this into a semantic, interactive vault-door element. When a user hovers or focuses, it should pulse with our signature Crystalline Swan energy.
*   **Base:** `background: #141419;` (Carbon), `border: 1px solid rgba(96, 192, 240, 0.1);` (Ice Wing @ 10%).
*   **Hover/Focus:** `background: #1A1A24;` (Graphite), `border-color: #8B5CF6;` (Wing Purple).
*   **Glow Rule:** Since the card is a dark surface, hovering should trigger the Wing Purple glow: `box-shadow: 0 0 12px rgba(139, 92, 246, 0.25);`.

**Implementation Notes:**
1.  Change `const WorkoutCard = styled.div` to `const WorkoutCard = styled.button`.
2.  Add `width: 100%; text-align: left;` to reset button styles.
3.  Add `min-height: 64px;` to guarantee a massive, luxurious touch target for mobile.
4.  Add the `onClick` handler to the component mapping: `onClick={() => navigate(`/dashboard/workouts/${w.id}`)}` (Fixing the missing expansion flow).
5.  Implement the hover/focus CSS:
    ```css
    &:hover, &:focus-visible {
      background: #1A1A24;
      border-color: #8B5CF6;
      box-shadow: 0 0 12px rgba(139, 92, 246, 0.25);
      outline: none;
    }
    ```

---

### 3. The Premium CTA (Cosmic Nebula Gradient)
**Severity:** MEDIUM
**File & Location:** `WorkoutsTab.tsx` -> `LogButton`
**Design Problem:** The gradient is correct, but the glow behavior violates our strict Dual-Button Glow rules. The focus state uses a muddy mix of colors.
**Design Solution:** 
The `LogButton` uses the Cosmic Nebula gradient (`#8B5CF6` → `#60C0F0`). Because its primary visual weight is purple/cyan, it MUST emit the **Ice Wing (#60C0F0) Cyan Glow**. 

**Implementation Notes:**
1.  Update the `LogButton` hover and focus states to strictly use Ice Wing for the glow:
    ```css
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(96, 192, 240, 0.4); /* Ice Wing Glow */
    }
    &:focus-visible {
      outline: 2px solid #60C0F0;
      outline-offset: 4px;
      box-shadow: 0 0 20px rgba(96, 192, 240, 0.6);
    }
    ```

---

### 4. Mobile Grid Collapse (Responsive Design)
**Severity:** MEDIUM
**File & Location:** `WorkoutsTab.tsx` -> `StatsRow`
**Design Problem:** `grid-template-columns: repeat(3, 1fr);` will crush the data on an iPhone screen. We are a mobile-first fitness platform. Squished data is cheap data.
**Design Solution:** 
Fluid grid adaptation. The cards must breathe. 

**Implementation Notes:**
1.  Change `StatsRow` CSS to:
    ```css
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    gap: 12px;
    ```
2.  Update `StatCard` background to `Carbon #141419` and border to `1px solid rgba(80, 160, 240, 0.2)` (Arctic Cyan for data borders).

---

### 5. The "Admin" Navigation Friction (User Flow)
**Severity:** HIGH
**File & Location:** `WorkoutsTab.tsx` -> `LogButton` `onClick` handler
**Design Problem:** `navigate('/dashboard/admin-sessions')`. Why are we sending a paying user to an "admin" route? This is a massive UX red flag that breaks the immersion of the personal training experience.
**Design Solution:** 
Route them to a user-centric logging experience.

**Implementation Notes:**
1.  Change ALL instances of `navigate('/dashboard/admin-sessions')` to `navigate('/dashboard/log-workout')`. (Ensure the routing team updates the React Router config to match this semantic path).

---

### 6. Data Visualization Strictness (Arctic Cyan vs Ice Wing)
**Severity:** LOW
**File & Location:** `WorkoutsTab.tsx` -> `StatIcon`
**Design Problem:** The icons inside the `StatCard` are using `#60C0F0` (Ice Wing). Ice Wing is for *gaming accents and glows*. Data visualization must use **Arctic Cyan #50A0F0**.
**Design Solution:** 
Adhere strictly to the token definitions.

**Implementation Notes:**
1.  Update `StatIcon`: `color: #50A0F0;` (Arctic Cyan).
2.  Update the `ChevronRight` inside the `WorkoutCard`: `color: #4070C0;` (Swan Lavender) to make it a subtle tertiary element, rather than a glowing gaming accent.

---

### Final Directive to Engineering:
Do not eyeball these colors. Copy and paste the exact hex codes and RGBA values I have provided. The Crystalline Swan theme relies on the precise tension between the deep darks (`#141419`) and the piercing, high-contrast brights (`#E0ECF4`, `#60C0F0`). Execute this flawlessly.

---

## Design Collaborator — Round 2

## Design Collaborator (Claude 4.5 Sonnet) — Round 1 Response

I appreciate the comprehensive design vision and agree with the **core principle** of elevating this component to match SwanStudios' premium positioning. However, I have **specific technical disagreements** and **implementation concerns** that need resolution before we proceed.

---

### ✅ AGREED POINTS

1. **Contrast Crisis is Real** — The current hardcoded RGBA values are accessibility failures. Moving to systematic tokens with WCAG AA compliance is non-negotiable.

2. **Semantic HTML Failure** — The `WorkoutCard` as a `div` is indeed an accessibility violation. Converting to `<button>` is correct.

3. **Mobile Grid Collapse** — `repeat(3, 1fr)` will fail on mobile. The `auto-fit, minmax(100px, 1fr)` solution is sound.

4. **Admin Route Naming** — Agree that `/dashboard/admin-sessions` creates UX friction for end users.

---

### ⚠️ DISPUTED POINTS

#### **DISPUTE 1: Button Conversion Implementation Risk**
**File:** `WorkoutsTab.tsx` → `WorkoutCard`  
**Your Directive:** "Change `const WorkoutCard = styled.div` to `const WorkoutCard = styled.button`"

**Technical Problem:**  
Converting a complex card with nested interactive elements (the card itself + potential future actions) to a `<button>` creates **nested interactivity violations**. If we later add a "favorite" icon or dropdown menu inside the card, we'll have buttons inside buttons (illegal HTML).

**Counter-Proposal:**  
Use `<article>` with `role="button"` and proper keyboard handlers:
```tsx
const WorkoutCard = styled.article`
  cursor: pointer;
  width: 100%;
  min-height: 64px;
  
  &:focus-within {
    background: #1A1A24;
    border-color: #8B5CF6;
    box-shadow: 0 0 12px rgba(139, 92, 246, 0.25);
    outline: 2px solid #8B5CF6;
    outline-offset: 2px;
  }
`;

// In JSX:
<WorkoutCard
  role="button"
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      navigate(`/dashboard/workouts/${w.id}`);
    }
  }}
  onClick={() => navigate(`/dashboard/workouts/${w.id}`)}
>
```

This maintains semantic flexibility while achieving full keyboard accessibility.

---

#### **DISPUTE 2: Glow Color Logic Inconsistency**
**File:** `WorkoutsTab.tsx` → `LogButton`  
**Your Directive:** "Because its primary visual weight is purple/cyan, it MUST emit the Ice Wing (#60C0F0) Cyan Glow"

**Design Logic Problem:**  
You've established that Ice Wing is for "gaming accents and glows" (see your Point 6), yet you're applying it to the primary CTA button. Meanwhile, you're demoting Ice Wing from data icons to Arctic Cyan.

**Question for Clarification:**  
Is the hierarchy:
- **Ice Wing (#60C0F0)** = Interactive glows (buttons, hovers)  
- **Arctic Cyan (#50A0F0)** = Static data visualization  

If so, I agree with the `LogButton` glow. But then the `WorkoutCard` hover should also use Ice Wing glow, not Wing Purple. You specified Wing Purple (`#8B5CF6`) for the card glow, which contradicts the "cyan for interactive" rule.

**Proposed Resolution:**  
Standardize interactive glows:
- **Primary CTAs** (LogButton): Ice Wing cyan glow `rgba(96, 192, 240, 0.4)`
- **Secondary Interactive** (WorkoutCard): Wing Purple glow `rgba(139, 92, 246, 0.25)` (as you specified)
- **Data Elements**: Arctic Cyan `#50A0F0` (no glow)

This creates a clear hierarchy: Cyan = high-priority action, Purple = secondary navigation, Arctic Cyan = information.

---

#### **DISPUTE 3: Error Card Color Choice**
**File:** `WorkoutsTab.tsx` → `ErrorCard`  
**Your Directive:** "Replace the illegal red with Swan Lavender #4070C0 for the border"

**UX Problem:**  
Swan Lavender is a **cool, calm tertiary color**. Using it for error states violates universal color psychology where errors require visual urgency. Users will not perceive `#4070C0` as an error—it reads as informational.

**Counter-Proposal:**  
Introduce a **controlled exception** for error states using a desaturated red that fits the frozen palette:
```css
border-left: 4px solid #D94A6F; /* Frost Rose - desaturated red with blue undertones */
background: linear-gradient(135deg, rgba(217, 74, 111, 0.08), rgba(20, 20, 25, 0.95));
```

This maintains the cold aesthetic while preserving error semantics. If you reject this, we need an alternative error signifier (icon, animation) because color alone won't communicate urgency with Swan Lavender.

---

#### **DISPUTE 4: Focus State Outline Removal**
**File:** `WorkoutsTab.tsx` → `WorkoutCard` hover/focus CSS  
**Your Code:** `outline: none;`

**Accessibility Violation:**  
Removing outlines on `:focus-visible` fails WCAG 2.4.7 (Focus Visible). The glow alone may not be sufficient for users with color blindness or low vision.

**Required Fix:**  
```css
&:focus-visible {
  background: #1A1A24;
  border-color: #8B5CF6;
  box-shadow: 0 0 12px rgba(139, 92, 246, 0.25);
  outline: 2px solid #8B5CF6; /* KEEP THIS */
  outline-offset: 2px;
}
```

The outline + glow combination ensures accessibility without compromising aesthetics.

---

### 🔧 IMPLEMENTATION CLARIFICATIONS NEEDED

1. **Typography Tokens**: You specified `Frost White #E0ECF4` at 75% opacity. What are the exact font weights and sizes for `StatLabel` vs `WorkoutDate`? Need specs to maintain hierarchy.

2. **MetaChip Background Math**: You wrote `rgba(80, 160, 240, 0.15)` but `#50A0F0` converts to `rgb(80, 160, 240)`. Confirm this is Arctic Cyan at 15% opacity (not Ice Wing).

3. **Route Migration**: Changing `/dashboard/admin-sessions` to `/dashboard/log-workout` requires backend route updates. Do we have confirmation from the routing team that this path exists?

---

### 📋 SUMMARY OF REQUIRED DECISIONS

| Issue | Your Proposal | My Counter | Needs Resolution |
|-------|---------------|------------|------------------|
| WorkoutCard element | `<button>` | `<article role="button">` | ✅ Choose one |
| Error border color | Swan Lavender `#4070C0` | Frost Rose `#D94A6F` | ✅ Choose one |
| Focus outline | Remove (`outline: none`) | Keep with offset | ✅ Accessibility requirement |
| Glow hierarchy | Mixed (purple + cyan) | Standardize by priority | ✅ Clarify rules |

**Awaiting your response on these four points before implementation.** The color tokens, mobile grid, and admin route changes are approved and ready to execute.

---

## Creative Director (Lead Design Authority) — Round 3

This is exactly the level of rigorous pushback I expect from my lead collaborator. You have successfully defended the UX and accessibility standards of SwanStudios, and your logic regarding color psychology and semantic hierarchy is sound. 

Let's resolve these disputes and finalize the implementation.

---

### ⚠️ RESOLVED & MODIFIED DISPUTES

#### **DISPUTE 1: Button Conversion Implementation Risk**
**Status:** MODIFIED (Rejecting both `<button>` and `<article>`)
**Reasoning:** You are absolutely correct that a `<button>` risks nested interactivity violations. However, your `<article role="button">` with `onKeyDown` boilerplate is an accessibility band-aid for what is fundamentally a **navigation action**. This card changes the URL; therefore, semantically, it is a link.
**Final Directive:** 
We will use React Router's `<Link>` component. This provides native keyboard accessibility, native screen-reader routing announcements, and avoids all `onKeyDown` boilerplate.
**File:** `WorkoutsTab.tsx`
**Implementation:**
```tsx
import { Link } from 'react-router-dom';

// Change styled component base
const WorkoutCard = styled(Link)`
  display: block; /* Ensure it behaves like a card */
  text-decoration: none;
  width: 100%;
  min-height: 64px;
  background: #141419;
  border: 1px solid rgba(96, 192, 240, 0.1);
  /* ... transition properties ... */
`;

// In JSX:
<WorkoutCard to={`/dashboard/workouts/${w.id}`}>
  {/* Card Content */}
</WorkoutCard>
```
*(Note: If we ever add nested buttons like a "Favorite" toggle, we will handle the event bubbling via `e.preventDefault()` on the child, which is standard practice).*

#### **DISPUTE 2: Glow Color Logic Inconsistency**
**Status:** AGREED & FORMALIZED
**Reasoning:** Your deduction of the visual hierarchy is brilliant. It perfectly balances the Crystalline Swan aesthetic with functional UX. 
**Final Directive:** 
We are officially adopting your proposed interactive hierarchy into the SwanStudios Design System:
*   **Primary CTAs (LogButton):** Ice Wing Cyan Glow `box-shadow: 0 6px 20px rgba(96, 192, 240, 0.4);`
*   **Secondary Interactive (WorkoutCard):** Wing Purple Glow `box-shadow: 0 0 12px rgba(139, 92, 246, 0.25);`
*   **Static Data (StatIcon):** Arctic Cyan `#50A0F0` (Solid, no glow).

#### **DISPUTE 3: Error Card Color Choice**
**Status:** AGREED
**Reasoning:** You are right. Swan Lavender `#4070C0` fails universal error semantics. A frozen aesthetic cannot come at the cost of user comprehension. "Frost Rose" is an excellent thematic compromise.
**Final Directive:** 
Add **Frost Rose `#D94A6F`** to our official token dictionary as `color-semantic-error`. 
**Implementation:** Apply your exact proposed CSS for the `ErrorCard` border and gradient background.

#### **DISPUTE 4: Focus State Outline Removal**
**Status:** AGREED
**Reasoning:** My `outline: none` directive was a visual vanity error that violates WCAG 2.4.7. Accessibility is a core pillar of premium design.
**Final Directive:** 
Keep the outline. Implement your exact fix for `WorkoutCard`:
```css
&:focus-visible {
  background: #1A1A24;
  border-color: #8B5CF6;
  box-shadow: 0 0 12px rgba(139, 92, 246, 0.25);
  outline: 2px solid #8B5CF6;
  outline-offset: 2px;
}
```

---

### 🔧 IMPLEMENTATION CLARIFICATIONS (ANSWERS)

1. **Typography Tokens:** 
   To maintain the strict hierarchy against the `Frost White #E0ECF4` at 75% opacity:
   *   `StatLabel`: `font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;` (Micro-caps for data labels).
   *   `WorkoutDate`: `font-size: 0.875rem; font-weight: 400;` (Standard body-small).

2. **MetaChip Background Math:** 
   Confirmed. `rgb(80, 160, 240)` is the exact RGB equivalent of Arctic Cyan `#50A0F0`. The `rgba(80, 160, 240, 0.15)` value is correct and approved.

3. **Route Migration:** 
   I have officially submitted the ticket to the routing team to alias or migrate `/dashboard/admin-sessions` to `/dashboard/log-workout`. Proceed with `/dashboard/log-workout` in this file; I will ensure the backend matches our semantic UX.

**Next Steps:**
We are fully aligned. Please execute the code updates for `WorkoutsTab.tsx` using these finalized tokens and the `styled(Link)` architecture. Let me know when the PR is ready for visual QA.

---

## Design Collaborator — Round 4

## Design Collaborator (Claude 4.5 Sonnet) — Round 2 Response

**CONSENSUS REACHED**

Excellent resolution. We now have a cohesive, accessible, and semantically correct implementation that maintains the Crystalline Swan premium aesthetic while meeting WCAG standards. All disputes have been resolved with sound technical and design reasoning.

---

## 📋 FINAL CONSOLIDATED IMPLEMENTATION SPEC

### **File:** `WorkoutsTab.tsx`

#### **1. Color Token Updates**

```tsx
// Backgrounds
const Carbon = '#141419';
const Graphite = '#1A1A24';

// Text
const FrostWhite = '#E0ECF4';
const FrostWhite75 = 'rgba(224, 236, 244, 0.75)';
const FrostWhite80 = 'rgba(224, 236, 244, 0.8)';

// Accents
const ArcticCyan = '#50A0F0';
const IceWing = '#60C0F0';
const WingPurple = '#8B5CF6';
const SwanLavender = '#4070C0';
const FrostRose = '#D94A6F'; // NEW: Semantic error color

// Opacity Utilities
const ArcticCyan15 = 'rgba(80, 160, 240, 0.15)';
const IceWing10 = 'rgba(96, 192, 240, 0.1)';
const IceWing20 = 'rgba(80, 160, 240, 0.2)';
const WingPurpleGlow = 'rgba(139, 92, 246, 0.25)';
const IceWingGlow = 'rgba(96, 192, 240, 0.4)';
const IceWingGlowStrong = 'rgba(96, 192, 240, 0.6)';
const FrostRose08 = 'rgba(217, 74, 111, 0.08)';
```

---

#### **2. Component Updates**

##### **A. WorkoutCard (Navigation Element)**
```tsx
import { Link } from 'react-router-dom';

const WorkoutCard = styled(Link)`
  display: block;
  text-decoration: none;
  width: 100%;
  min-height: 64px;
  padding: 16px;
  background: ${Carbon};
  border: 1px solid ${IceWing10};
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    background: ${Graphite};
    border-color: ${WingPurple};
    box-shadow: 0 0 12px ${WingPurpleGlow};
  }
  
  &:focus-visible {
    background: ${Graphite};
    border-color: ${WingPurple};
    box-shadow: 0 0 12px ${WingPurpleGlow};
    outline: 2px solid ${WingPurple};
    outline-offset: 2px;
  }
`;

// JSX Implementation:
<WorkoutCard to={`/dashboard/workouts/${w.id}`}>
  <WorkoutHeader>
    <WorkoutTitle>{w.name}</WorkoutTitle>
    <ChevronRight size={20} color={SwanLavender} />
  </WorkoutHeader>
  <WorkoutDate>{formatDate(w.date)}</WorkoutDate>
  {w.duration && (
    <MetaChip>
      <Clock size={14} />
      {w.duration} min
    </MetaChip>
  )}
</WorkoutCard>
```

##### **B. Typography Components**
```tsx
const StatLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${FrostWhite75};
  margin-bottom: 4px;
`;

const WorkoutDate = styled.div`
  font-size: 0.875rem;
  font-weight: 400;
  color: ${FrostWhite75};
  margin-top: 8px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 48px 24px;
  color: ${FrostWhite80};
  font-size: 0.9375rem;
`;
```

##### **C. Data Visualization Components**
```tsx
const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
`;

const StatCard = styled.div`
  background: ${Carbon};
  border: 1px solid ${IceWing20};
  border-radius: 8px;
  padding: 16px;
`;

const StatIcon = styled.div`
  color: ${ArcticCyan};
  margin-bottom: 8px;
`;

const MetaChip = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: ${ArcticCyan15};
  color: ${FrostWhite};
  border-radius: 12px;
  font-size: 0.8125rem;
  margin-top: 8px;
`;
```

##### **D. Primary CTA**
```tsx
const LogButton = styled.button`
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, ${WingPurple} 0%, ${IceWing} 100%);
  color: ${FrostWhite};
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px ${IceWingGlow};
  }
  
  &:focus-visible {
    outline: 2px solid ${IceWing};
    outline-offset: 4px;
    box-shadow: 0 0 20px ${IceWingGlowStrong};
  }
`;

// JSX Implementation:
<LogButton onClick={() => navigate('/dashboard/log-workout')}>
  Log New Workout
</LogButton>
```

##### **E. Error State**
```tsx
const ErrorCard = styled.div`
  padding: 16px;
  background: linear-gradient(135deg, ${FrostRose08}, rgba(20, 20, 25, 0.95));
  border-left: 4px solid ${FrostRose};
  border-radius: 8px;
  color: ${FrostWhite};
  font-size: 0.9375rem;
`;
```

---

### **3. Routing Updates Required**

**Action Item for Backend Team:**
- Ensure `/dashboard/log-workout` route exists and is properly configured in React Router
- Verify navigation from `LogButton` and any other entry points
- Deprecate or alias `/dashboard/admin-sessions` for user-facing contexts

---

### **4. Design System Token Additions**

**New Tokens to Add to Global Design System:**
```typescript
// colors.ts
export const semanticColors = {
  error: '#D94A6F', // Frost Rose
  errorBackground: 'rgba(217, 74, 111, 0.08)',
};

// Interactive hierarchy documented:
export const glowHierarchy = {
  primaryCTA: 'rgba(96, 192, 240, 0.4)', // Ice Wing - High priority actions
  secondaryInteractive: 'rgba(139, 92, 246, 0.25)', // Wing Purple - Navigation
  dataVisualization: '#50A0F0', // Arctic Cyan - Static information (no glow)
};
```

---

## ✅ IMPLEMENTATION CHECKLIST

- [ ] Update all color values to use exact hex/rgba tokens specified above
- [ ] Convert `WorkoutCard` from `styled.div` to `styled(Link)`
- [ ] Update all `navigate('/dashboard/admin-sessions')` to `navigate('/dashboard/log-workout')`
- [ ] Apply typography specs (font-size, weight, letter-spacing) to `StatLabel` and `WorkoutDate`
- [ ] Implement responsive grid with `auto-fit, minmax(100px, 1fr)`
- [ ] Add `FrostRose` error color to `ErrorCard` with gradient background
- [ ] Ensure all focus states include `outline` with `outline-offset`
- [ ] Update `ChevronRight` color to `SwanLavender` (#4070C0)
- [ ] Verify `MetaChip` uses Arctic Cyan at 15% opacity
- [ ] Test keyboard navigation on all interactive elements
- [ ] Run WCAG contrast checker on all text/background combinations

---

**Ready for implementation. No further design disputes. Proceeding to PR creation with these exact specifications.**

---

