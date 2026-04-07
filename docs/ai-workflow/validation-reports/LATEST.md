# SwanStudios Validation Report

> Generated: 4/6/2026, 7:48:02 PM
> Files reviewed: 6
> Validators: 15 succeeded, 2 errored
> Cost: $0.4059
> Duration: 680.3s
> Gateway: OpenRouter (single API key)

---

## Files Reviewed

- `AI-Village-Documentation/validation-prompts/archive/2026-04-06T22-22-09/01-ux-research.md`
- `AI-Village-Documentation/validation-prompts/archive/2026-04-06T22-22-09/02-architecture-design.md`
- `AI-Village-Documentation/validation-prompts/archive/2026-04-06T22-22-09/03-security-planning.md`
- `AI-Village-Documentation/validation-prompts/archive/2026-04-06T22-22-09/04-performance-planning.md`
- `AI-Village-Documentation/validation-prompts/archive/2026-04-06T22-22-09/05-competitive-intel.md`
- `AI-Village-Documentation/validation-prompts/archive/2026-04-06T22-22-09/06-persona-alignment.md`

---

## Validator Summary

| # | Validator | Model | Tokens (in/out) | Duration | Status |
|---|-----------|-------|-----------------|----------|--------|
| 1 | UX & Accessibility | google/gemini-2.5-flash | 14,917 / 4,096 | 25.5s | PASS |
| 2 | Code Quality | anthropic/claude-4.6-sonnet-20260217 | 16,128 / 4,095 | 75.8s | PASS |
| 3 | Security | nvidia/nemotron-3-nano-30b-a3b:free | 14,840 / 3,545 | 19.9s | PASS |
| 4 | Performance & Scalability | google/gemini-3-flash-preview-20251217 | 14,948 / 1,338 | 12.1s | PASS |
| 5 | Competitive Intelligence | google/gemini-2.5-flash | 14,935 / 4,096 | 16.8s | PASS |
| 6 | User Research & Persona Alignment | nvidia/nemotron-3-nano-30b-a3b:free | 14,882 / 2,952 | 18.0s | PASS |
| 7 | Architecture & Bug Hunter | minimax/minimax-m2.7-20260318 | 14,156 / 4,096 | 105.3s | PASS |
| 8 | Frontend UX & Code Patterns | google/gemini-3.1-flash-lite-preview-20260303 | 14,955 / 1,105 | 7.2s | PASS |
| 9 | Data Safety & Integrity | anthropic/claude-4.6-sonnet-20260217 | 16,725 / 4,096 | 86.7s | PASS |
| 10 | Security II (Nemotron) | nvidia/nemotron-3-super-120b-a12b:free | 0 / 0 | 120.2s | FAIL |
| 11 | Code Architecture (Qwen) | nvidia/nemotron-3-super-120b-a12b-20230311:free | 14,877 / 4,096 | 115.1s | PASS |
| 12 | Bug Hunter II (Step) | nvidia/nemotron-3-nano-30b-a3b:free | 14,924 / 4,096 | 15.6s | PASS |
| 13 | Full-Stack Integration Review (Trinity) | arcee-ai/trinity-large-preview:free | 13,506 / 767 | 98.7s | PASS |
| 14 | Security Debate (Phase 2A) | nvidia/nemotron-3-nano-30b-a3b:free ↔ nvidia/nemotron-3-super-120b-a12b:free | 0 / 0 | 0.0s | FAIL |
| 15 | Code Quality Debate (Phase 2B) | anthropic/claude-sonnet-4.6 ↔ nvidia/nemotron-3-super-120b-a12b:free | 26,461 / 6,606 | 145.1s | PASS |
| 16 | UX/UI Design Debate (Phase 2C) | gemini-3.1-pro-preview ↔ minimax/minimax-m2.7 | 21,818 / 6,032 | 161.5s | PASS |
| 17 | Smart Escalation (MiniMax M2.7) | minimax/minimax-m2.7 | 13,409 / 4,096 | 98.4s | PASS |

---

## [PASS] UX & Accessibility
**Model:** google/gemini-2.5-flash | **Duration:** 25.5s

As a UX and accessibility expert auditor for SwanStudios, I've reviewed the provided documentation. It's important to note that these are planning/audit documents, not direct code, so my analysis focuses on the *implications* of the described plans and issues for UX and accessibility.

The theme "Enchanted Apex: Crystalline Swan" with its specific color palette and typography is noted. The retired Galaxy-Swan theme will be avoided.

Here's a breakdown of findings:

---

## 1. WCAG 2.1 AA Compliance

### CRITICAL Findings

*   **Color Contrast Issues (01-ux-research.md - Section 5)**
    *   **Finding:** The document explicitly flags multiple instances of poor color contrast: "Class preview contrast is poor on the default theme," "Form assessment contrast is poor on the default theme," "Contrast and readability need work" (Security Workspace), and "Keyword research needs Teach Me support and better contrast" (Marketing Workspace). This directly violates WCAG 2.1 AA requirements for text and non-text contrast (4.5:1 for normal text, 3:1 for large text and graphical objects).
    *   **Impact:** Users with low vision, color blindness, or in bright/low light conditions will struggle to read content and identify interactive elements, leading to frustration and inability to use the platform effectively.
    *   **Recommendation:** A comprehensive color contrast audit is required across the entire application using the specified "Enchanted Apex: Crystalline Swan" palette. All text, icons, and interactive elements must meet WCAG 2.1 AA contrast ratios. This should be a mandatory step before any UI implementation.
*   **Screen Reader Inaccessibility (01-ux-research.md - Section 5)**
    *   **Finding:** Several issues indicate severe screen reader compatibility problems: "Workout plans cannot be reliably saved or viewed," "Saved plans control appears non-clickable," "Multiple session history and upcoming endpoints return 404," and "Some responses show raw HTML tags... instead of rendering them properly." Complex overlays and horizontal tab bars are also flagged as potential issues.
    *   **Impact:** Screen reader users will be completely blocked from accessing core functionalities, navigating the application, or understanding content, rendering the platform unusable for them. Raw HTML tags are read literally, creating a nonsensical experience.
    *   **Recommendation:**
        *   **Semantic HTML:** Ensure all UI elements use appropriate native HTML tags.
        *   **ARIA Attributes:** Implement ARIA roles, states, and properties judiciously for custom components (e.g., modals, tabs, dynamic content).
        *   **Alt Text:** Provide descriptive `alt` text for all meaningful images and icons.
        *   **Heading Structure:** Maintain a logical heading hierarchy.
        *   **Clear Labels:** All form fields, buttons, and interactive elements must have clear, programmatically associated labels.
        *   **ARIA Live Regions:** Use `aria-live` for dynamic content updates (e.g., AI responses, loading messages).
        *   **Testing:** Thoroughly test with VoiceOver, TalkBack, NVDA, and JAWS.
*   **Keyboard Navigation Traps & Inoperability (01-ux-research.md - Section 5)**
    *   **Finding:** "Saved plans control appears non-clickable" implies it's not keyboard-focusable. "Horizontal tab bars are not mobile-scrollable, so many tabs are inaccessible on phone" suggests these tabs might also lack keyboard focus and navigation. Complex overlays are noted as a risk for trapping keyboard users.
    *   **Impact:** Users who rely on keyboard navigation (e.g., motor impairments, screen reader users) will be unable to access or interact with critical parts of the application, leading to complete blockage of workflows.
    *   **Recommendation:**
        *   **Logical Tab Order:** Ensure a predictable and logical tab order.
        *   **Visible Focus Indicators:** Provide clear, high-contrast visual focus indicators for all interactive elements.
        *   **Keyboard Operability:** All interactive elements must be operable via keyboard (e.g., Enter/Space for buttons, arrow keys for tabs/sliders).
        *   **Focus Management:** Implement proper focus management for modals and overlays to prevent keyboard traps and return focus appropriately upon closing.

### HIGH Findings

*   **Missing ARIA Labels/Roles (Implied from UX Gaps)**
    *   **Finding:** While not explicitly stated as missing ARIA, the descriptions of "disappearing exercise name on mobile," "non-clickable" elements, and "inconsistent AI terminals" strongly imply a lack of proper ARIA labeling and roles for custom components. For example, a custom "Rolodex" or "Saved Plans" component would require ARIA to convey its purpose and state to assistive technologies.
    *   **Impact:** Screen reader users will receive insufficient or incorrect information about UI elements, making it difficult to understand their purpose or interact with them.
    *   **Recommendation:** As part of the screen reader compatibility efforts, ensure all custom interactive components have appropriate ARIA roles, states, and properties (e.g., `aria-label`, `aria-describedby`, `role="button"`, `aria-expanded`).

---

## 2. Mobile UX

### CRITICAL Findings

*   **Fundamental Mobile Usability Failures (01-ux-research.md - Section 2 & 3)**
    *   **Finding:** The document repeatedly highlights critical mobile issues: "clipped, unreadable, or hard-to-use layouts on mobile (iPhone XR)," "exercise list... takes over the screen," "horizontal tab bars are not mobile-scrollable," "builder can cause surrounding layout columns to break or clip," "Find a trainer' is not fully mobile responsive," "Enhanced Client Progress dashboard is smashed," and "My Profile mobile layout is poor." The brief explicitly states "desktop-biased designs that will fail on smaller screens (320-375px)."
    *   **Impact:** The application is fundamentally unusable on mobile devices, which is a critical failure for a SaaS platform in 2026, especially for trainers on the go. This will lead to extremely high user frustration, abandonment, and negative reviews.
    *   **Recommendation:**
        *   **Mobile-First Redesign:** Implement a strict mobile-first design philosophy, designing for the smallest screen first and progressively enhancing for larger viewports.
        *   **Responsive & Adaptive Layouts:** Utilize flexible grid systems, media queries, and `flexbox`/`grid` for truly responsive and adaptive layouts.
        *   **Content Reflow & Prioritization:** Ensure content reflows gracefully, prioritizing essential information and using progressive disclosure for less critical details.
        *   **Dedicated Mobile Modals/Sheets:** Use full-screen modals or bottom sheets for complex interactions on mobile to provide ample space and a focused experience.
*   **Touch Target Sizes (Implied from Mobile Failures)**
    *   **Finding:** While not explicitly stating "touch targets are too small," the general description of "hard-to-use layouts" and "clipped" elements on iPhone XR strongly implies that interactive elements may not meet the minimum 44x44px touch target requirement.
    *   **Impact:** Users, especially those with motor impairments or larger fingers, will struggle to accurately tap buttons, links, and other interactive elements, leading to mis-taps and frustration.
    *   **Recommendation:** All interactive elements (buttons, links, form fields, icons) must have a minimum touch target size of 44x44 CSS pixels, regardless of their visual size. This can be achieved with padding or by increasing the clickable area.

### HIGH Findings

*   **Sluggish Scrolling Performance (01-ux-research.md - Section 2)**
    *   **Finding:** "Sticky/sluggish scrolling further degrades the experience" on mobile. This is particularly noted for the long exercise list in the Workout Planner.
    *   **Impact:** Poor scrolling performance creates a frustrating and unprofessional user experience, making the app feel slow and unresponsive, especially on older or less powerful devices.
    *   **Recommendation:**
        *   **Virtualization:** Implement list virtualization for long lists (e.g., exercise rolodex) to render only visible items. (This is also noted as a critical architectural fix in 02-architecture-design.md).
        *   **Performance Optimization:** Optimize image sizes, reduce unnecessary re-renders, and ensure efficient CSS.
        *   **Hardware Acceleration:** Utilize CSS properties that leverage hardware acceleration where appropriate.
*   **Lack of Gesture Support (Implied from Mobile-First Critique)**
    *   **Finding:** The document identifies "horizontal tab bars are not mobile-scrollable" and suggests replacing them with mobile-friendly navigation. While it proposes alternatives, it doesn't explicitly mention the need for gesture support beyond basic scrolling. For a "premium" mobile experience, gestures like swipe-to-dismiss for modals/sheets or swipe-to-navigate for certain content sections would be expected.
    *   **Impact:** The mobile experience might feel less intuitive and modern compared to other native apps if common mobile gestures are not supported or are poorly implemented.
    *   **Recommendation:**
        *   **Swipe Gestures:** Implement intuitive swipe gestures where appropriate (e.g., swipe to dismiss bottom sheets/modals, swipe between tabs in certain contexts).
        *   **Pinch-to-Zoom:** Ensure pinch-to-zoom is correctly handled for content where it might be beneficial (e.g., detailed charts, images).

---

## 3. Design Consistency

### HIGH Findings

*   **Hardcoded Colors & Inconsistent Theme Token Usage (Implied from Contrast Issues)**
    *   **Finding:** The explicit mentions of "Class preview contrast is poor on the default theme," "Form assessment contrast is poor on the default theme," and "Contrast and readability need work" (Security Workspace) strongly suggest that the "Enchanted Apex: Crystalline Swan" theme tokens are either not being used consistently, or that hardcoded colors are overriding them, leading to non-compliant contrast. If the theme were consistently applied and designed correctly, these issues wouldn't arise.
    *   **Impact:** Inconsistent visual appearance, poor accessibility, and difficulty in maintaining or updating the theme. It undermines the "premium, polished" goal.
    *   **Recommendation:**
        *   **Strict Theme Token Enforcement:** All color values throughout the application must reference the defined theme tokens (e.g., `theme.colors.midnightSapphire`, `theme.colors.iceWing`).
        *   **Automated Linting:** Implement linting rules (e.g., Stylelint) to prevent hardcoded color values.
        *   **Design System Audit:** Conduct an audit of all UI components to ensure they are correctly consuming theme tokens and adhering to the visual design guidelines.
*   **Inconsistent AI Terminal UI/UX (01-ux-research.md - Section 2 & 02-architecture-design.md - Finding 5)**
    *   **Finding:** The UX research notes "Inconsistent AI terminals across the app will lead to a steep learning curve and user distrust." The architectural review further highlights the risk of "State Fragmentation" if a single, configurable AI terminal component isn't strictly enforced.
    *   **Impact:** Users will face a disjointed experience when interacting with AI features, leading to confusion, increased cognitive load, and reduced efficiency. This directly contradicts the "unified AI terminal" goal.
    *   **Recommendation:** As per the architectural recommendation, enforce a single, reusable `AITerminal` component that is configured via props (`terminalId`, `systemPrompt`, `suggestedPrompts`, etc.). This ensures consistent microphone behavior, read-aloud, copy buttons, dropdowns, HTML rendering, overlay behavior, and z-index management across all AI-driven surfaces.

### MEDIUM Findings

*   **Typography Inconsistency (Implied)**
    *   **Finding:** The document lists specific fonts (Plus Jakarta Sans, Cormorant Garamond Italic, Fira Code, Sora) for different purposes. Without direct code, it's hard to confirm, but often, in large refactors, typography can become inconsistent if not strictly enforced.
    *   **Impact:** A visually jarring experience if fonts are used incorrectly, undermining the brand's aesthetic.
    *   **Recommendation:** Implement a robust typography scale within the styled-components theme, ensuring all text elements correctly inherit and apply the designated fonts, weights, and sizes for headings, body text, data, and UI elements. Conduct a visual audit to ensure consistency.

---

## 4. User Flow Friction

### CRITICAL Findings

*   **Broken Workout Planner Workflow (01-ux-research.md - Section 2)**
    *   **Finding:** "Current double-click requirement for adding exercises on desktop, and the disappearing exercise name on mobile, creates a broken and confusing workflow." The overly long exercise list on mobile is also cited as highly inefficient.
    *   **Impact:** Trainers, a primary user group, will experience significant frustration and inefficiency when building workouts, a core platform function. This directly impacts productivity and user satisfaction.
    *   **Recommendation:**
        *   **Explicit "Add" Buttons:** Implement clear, single-click "add" buttons for exercises.
        *   **Persistent Exercise Names:** Ensure exercise names remain visible after selection.
        *   **Compact Rolodex:** Redesign the exercise list as a compact, scrollable panel (bottom sheet/side drawer) that allows quick browsing without obscuring the workout builder.
*   **Unreliable Saved Plans & Client Profile Integration (01-ux-research.md - Section 2)**
    *   **Finding:** "Saved plans being unreliable, non-clickable, and not clearly tied to the client profile creates significant workflow friction."
    *   **Impact:** Trainers cannot efficiently reuse or apply workout plans, leading to wasted time and potential data entry errors. This breaks a fundamental workflow for managing clients.
    *   **Recommendation:**
        *   **Clickable Interface:** Display saved plans as clearly clickable cards within the client profile.
        *   **Direct Association:** Implement a direct and reliable association between saved plans and the current client.
        *   **"Load Plan" & "Copy" Options:** Provide clear "Load Plan" and "Copy to Client" functionalities.
*   **Critical Blocking Errors in Equipment Profiles (01-ux-research.md - Section 2)**
    *   **Finding:** "`500` errors for movement analysis and equipment scan are critical blockers." Also, "lack of image upload in manual mode and the unclear workflow for batch-first scanning are major usability issues."
    *   **Impact:** Users are completely prevented from using the equipment management features, rendering them useless. This is a severe functional breakdown.
    *   **Recommendation:**
        *   **Address 500 Errors:** Prioritize fixing the backend issues causing these errors.
        *   **Guided Workflow:** Design a clear, multi-step workflow for equipment management (take pictures -> upload -> AI identifies -> review/edit/finalize).
        *   **Image Upload:** Ensure image upload is available in both scan and manual modes.

### HIGH Findings

*   **Disjointed AI Experience (01-ux-research.md - Section 2)**
    *   **Finding:** "Admin sidebar requiring an extra tap to close, unreliable microphone input, non-working dropdowns, raw HTML tags in responses, and stuck overlays create a disjointed and unprofessional AI experience."
    *   **Impact:** Users will find the AI assistant frustrating and unreliable, leading to distrust and underutilization of a key feature.
    *   **Recommendation:**
        *   **Technical Fixes:** Prioritize fixing microphone input, dropdowns, and HTML rendering.
        *   **Unified Component:** Implement a single, reusable AI terminal component with consistent UI/UX, clear input/output, and predictable overlay behavior (including proper z-index and clear exit paths).
        *   **Sidebar Behavior:** Ensure the admin sidebar closes automatically on destination selection.
*   **Inflexible Scheduling & Calendar (01-ux-research.md - Section 2)**
    *   **Finding:** "Lack of 30/45-minute session support, generic 'My schedule' labeling, and limited visible hours make the calendar inflexible and less useful."
    *   **Impact:** Trainers cannot accurately schedule diverse client needs, and the calendar provides insufficient context, leading to scheduling conflicts and inefficiencies.
    *   **Recommendation:**
        *   **Configurable Session Durations:** Implement support for 30, 45, and 60-minute sessions.
        *   **Clear Identification:** Enhance schedule views with client/trainer names, initials, or profile pictures.
        *   **24-Hour Backend Support:** Ensure the backend supports 24-hour scheduling, even if the default view is limited.
*   **Horizontal Tab Bar Inaccessibility (01-ux-research.md - Section 3)**
    *   **Finding:** "Horizontal tab bars are not mobile-scrollable, so many tabs are inaccessible on phone." This is a direct UX friction point.
    *   **Impact:** Users cannot access all available content or features within sections like Content Studio or Marketing Workspace on mobile, leading to incomplete workflows and frustration.
    *   **Recommendation:** Replace horizontal tab bars with mobile-friendly navigation patterns (e.g., bottom navigation, hamburger menu, vertically scrollable lists, or segmented controls) depending on the number of items and hierarchy. If horizontal scrolling is absolutely necessary for secondary content, ensure clear visual cues (fading edges) and smooth performance.
*   **Cluttered/Non-Customizable Dashboards (06-persona-alignment.md - Section F)**
    *   **Finding:** "The dashboard is cluttered with too many widgets." It also notes the dashboard should be role-specific and customizable.
    *   **Impact:** Users are overwhelmed by irrelevant information, making it difficult to quickly find what they need. Lack of customization prevents users from tailoring their workspace to their specific needs.
    *   **Recommendation:**
        *   **Role-Specific Defaults:** Implement distinct default dashboards for Admin, Trainer, and Client roles, prioritizing relevant information for each.
        *   **Customization:** Provide drag-and-drop functionality for widgets, allowing users to add, remove, and reorder them.
        *   **Progressive Disclosure:** Use a widget-based approach where users can expand/collapse sections for more detail.

### MEDIUM Findings

*   **Admin Sidebar Extra Tap to Close (01-ux-research.md - Section 2)**
    *   **Finding:** "The admin sidebar requiring an extra tap to close."
    *   **Impact:** A minor but persistent annoyance that adds unnecessary clicks and cognitive load over time.
    *   **Recommendation:** Ensure the admin sidebar closes automatically when a destination is selected or by tapping outside its area.

---

## 5. Loading States

### HIGH Findings

*   

---

## [PASS] Code Quality
**Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 75.8s

# SwanStudios Validation Report Archive — Code Quality Review

> **Reviewer:** Senior TypeScript/React Code Quality Analyst
> **Scope:** Six validation report markdown files from the 2026-04-06 archive
> **Note:** These files are **documentation artifacts** (planning reports, gap analyses, security findings), not executable TypeScript/React/styled-components source code. The review dimensions requested (TypeScript typing, React hooks, styled-components tokens, DRY violations, error handling, performance anti-patterns) apply to **code**, not to markdown prose. What follows is therefore a structured review of what *is* reviewable — the documentation quality, architectural recommendations, and embedded code snippets — plus a meta-analysis of the validation pipeline itself.

---

## Summary Table

| File | Status | Primary Concern | Highest Finding |
|------|--------|-----------------|-----------------|
| `01-ux-research.md` | PASS | Retired palette referenced | MEDIUM |
| `02-architecture-design.md` | PASS | Embedded code has real bugs | CRITICAL |
| `03-security-planning.md` | PASS | SQL snippet has injection risk | HIGH |
| `04-performance-planning.md` | FAIL | Timeout — no content | CRITICAL |
| `05-competitive-intel.md` | FAIL | Wrong model ID — no content | HIGH |
| `06-persona-alignment.md` | PASS | Truncated output, DRY violations | MEDIUM |

---

## File-by-File Findings

---

### `01-ux-research.md` — UX Research & Competitor Analysis

---

#### Finding 1.1 — Retired Galaxy-Swan Palette Values Referenced in Accessibility Section

**Rating:** MEDIUM

**Location:** Section 5 — Accessibility Risks, Color Contrast subsection

**Issue:**

```md
The active palette includes `Midnight Sapphire #002060`, `Royal Depth #003080`,
`Obsidian Black #0A0A0F`, `Carbon #141419`, and `Graphite #1A1A24`...
```

`Obsidian Black #0A0A0F`, `Carbon #141419`, and `Graphite #1A1A24` are **not** in the active Enchanted Apex palette defined in the system prompt. They appear to be remnants of the retired Galaxy-Swan theme (`#0a0a1a` family). Any developer reading this document and implementing contrast checks against these values will be testing the wrong baseline colors.

**Correct active dark tokens:**
- Midnight Sapphire `#002060` ✅
- Royal Depth `#003080` ✅
- Frost White `#E0ECF4` ✅ (background)

**Recommendation:**

```md
<!-- REPLACE -->
`Obsidian Black #0A0A0F`, `Carbon #141419`, and `Graphite #1A1A24`

<!-- WITH -->
`Midnight Sapphire #002060` (Primary), `Royal Depth #003080` (Surface)
— note: no near-black tokens exist in the active Enchanted Apex palette;
if a near-black is needed, it must be formally added to the design token registry
before use in contrast calculations.
```

---

#### Finding 1.2 — No Measurable Success Criteria for UX Recommendations

**Rating:** LOW

**Issue:** Every recommendation in sections 1–7 is qualitative ("implement," "ensure," "consider"). There are no measurable acceptance criteria (e.g., task completion rate, time-on-task, Lighthouse score targets). Without these, the Playwright tests referenced in `02-architecture-design.md` Section 9 have no pass/fail thresholds to validate against.

**Recommendation:** Each CRITICAL/HIGH priority item should include at least one measurable criterion:

```md
**Acceptance Criteria:**
- Mobile exercise rolodex: scroll FPS ≥ 60 on iPhone XR (Lighthouse device emulation)
- Booking flow: task completion in ≤ 3 taps from dashboard
- Color contrast: all text passes WCAG 2.1 AA (4.5:1) verified by axe-core in CI
```

---

### `02-architecture-design.md` — Architecture & Component Design

This file contains the most substantive embedded code snippets and is the primary target for TypeScript/React pattern review.

---

#### Finding 2.1 — Swallowed `AbortError` Type Is Untyped `any`

**Rating:** CRITICAL

**Location:** Finding 2 — Conversation Loading Race Condition, `loadConversation` snippet

**Issue:**

```typescript
// AS WRITTEN — CRITICAL BUG
} catch (err) {
  if (err.name !== 'AbortError') setError(err);
}
```

`err` in a TypeScript `catch` clause is typed as `unknown` in strict mode (TypeScript 4.0+, `useUnknownInCatchVariables: true`). Accessing `err.name` without a type guard is a **compile error** in strict mode. Passing `err` directly to `setError` without narrowing means `setError` must accept `unknown`, which will cascade `any`-equivalent types through the error state.

**Correct implementation:**

```typescript
} catch (err: unknown) {
  // Narrow to Error before property access
  if (err instanceof Error && err.name !== 'AbortError') {
    setError(err);
  } else if (!(err instanceof Error)) {
    // Handle non-Error throws (e.g., thrown strings, objects)
    setError(new Error(String(err)));
  }
  // AbortError: intentional cancellation — silently discard
}
```

**State type must also be explicit:**

```typescript
// The hook's error state should be typed, not inferred
const [error, setError] = useState<Error | null>(null);
// NOT: useState(null) — infers null, then setError(err) breaks
```

---

#### Finding 2.2 — Stale Closure in `loadConversation` `useCallback`

**Rating:** CRITICAL

**Location:** Finding 2, `loadConversation` snippet

**Issue:**

```typescript
// AS WRITTEN
const loadConversation = useCallback(async (id: string) => {
  // ...
  setConversations(prev => ({
    ...prev,
    [id]: { ...prev[id], messages, loaded: true }
  }));
  // ...
}, []); // stable identity — no deps that change
```

The comment claims stable identity with empty deps, but `setConversations` is referenced inside the callback. While `setState` dispatchers are guaranteed stable by React, `setLoadingConversationId` is also referenced and must also be a stable dispatcher. The real problem is the **`setLoadingConversationId` finalizer**:

```typescript
// AS WRITTEN — stale closure bug
setLoadingConversationId(prev => prev === id ? null : prev);
```

`id` here is the closure-captured parameter, which is correct for a function argument. However, if `fetchConversation` is not passed as a stable reference (e.g., it's defined inline or depends on changing state), the empty dep array creates a stale closure over the initial `fetchConversation`. The document does not define `fetchConversation`'s origin, which is the actual risk.

**Recommendation — make the dependency contract explicit:**

```typescript
// Define fetchConversation outside the hook or wrap in useCallback with its own deps
const fetchConversation = useCallback(
  async (id: string, options: { signal: AbortSignal }): Promise<Message[]> => {
    const response = await fetch(`/api/conversations/${id}`, options);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json() as Promise<Message[]>;
  },
  [] // truly stable — no external deps
);

const loadConversation = useCallback(async (id: string) => {
  const controller = new AbortController();
  setLoadingConversationId(id);

  try {
    const messages = await fetchConversation(id, { signal: controller.signal });
    setConversations(prev => ({
      ...prev,
      [id]: { ...prev[id], messages, loaded: true },
    }));
  } catch (err: unknown) {
    if (err instanceof Error && err.name !== 'AbortError') {
      setError(err);
    }
  } finally {
    setLoadingConversationId(prev => (prev === id ? null : prev));
  }

  return () => controller.abort();
}, [fetchConversation]); // fetchConversation is stable, so loadConversation is stable
```

---

#### Finding 2.3 — `useEffect` Cleanup Pattern Is Incorrect

**Rating:** CRITICAL

**Location:** Finding 2, composition layer `useEffect` snippet

**Issue:**

```typescript
// AS WRITTEN — BROKEN CLEANUP
useEffect(() => {
  if (!selectedId) return;
  if (conversations[selectedId]?.loaded) return; // cache hit, no fetch
  const cleanup = loadConversation(selectedId);
  return cleanup; // abort on selectedId change or unmount
}, [selectedId]);
```

`loadConversation` is `async` — it returns a `Promise<() => void>`, not `() => void`. React's `useEffect` cleanup must be a **synchronous function**, not a Promise. Returning a Promise from `useEffect` is silently ignored by React (no cleanup runs). This means the `AbortController` is never called on `selectedId` change, defeating the entire race condition fix.

**Correct pattern:**

```typescript
useEffect(() => {
  if (!selectedId) return;
  if (conversations[selectedId]?.loaded) return;

  // Create controller in the effect, not inside the async function
  const controller = new AbortController();

  // Fire-and-forget the async work, passing the signal
  void loadConversation(selectedId, controller.signal);

  // Synchronous cleanup — this is what React actually calls
  return () => {
    controller.abort();
  };
}, [selectedId, conversations, loadConversation]);
// conversations needed because the cache-hit guard reads it
// loadConversation needed if not guaranteed stable
```

This requires refactoring `loadConversation` to accept a signal parameter rather than creating its own controller:

```typescript
// Revised signature — caller owns the AbortController
const loadConversation = useCallback(
  async (id: string, signal: AbortSignal): Promise<void> => {
    setLoadingConversationId(id);
    try {
      const messages = await fetchConversation(id, { signal });
      setConversations(prev => ({
        ...prev,
        [id]: { ...prev[id], messages, loaded: true },
      }));
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err);
      }
    } finally {
      setLoadingConversationId(prev => (prev === id ? null : prev));
    }
  },
  [fetchConversation]
);
```

---

#### Finding 2.4 — `ErrorBoundary` Missing `displayName` and Reset Prop Types

**Rating:** HIGH

**Location:** Finding 3 — Styled-Components Runtime Crash, `ContentStudioTabErrorBoundary` snippet

**Issue:**

```typescript
// AS WRITTEN — incomplete typing
class ContentStudioTabErrorBoundary extends React.Component<
  { tabName: string; children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null };
```

Three problems:

1. `state = { hasError: false, error: null }` — `null` is inferred as `null` type, not `Error | null`. TypeScript will reject `setError(error)` in `getDerivedStateFromError` because `error: Error` cannot be assigned to the inferred `null` type without explicit annotation.

2. `onReset` prop is passed to `TabErrorFallback` but not declared in the props interface.

3. No `displayName` — React DevTools will show `ContentStudioTabErrorBoundary` as an anonymous class in production builds.

**Correct implementation:**

```typescript
interface ContentStudioTabErrorBoundaryProps {
  tabName: string;
  children: React.ReactNode;
}

interface ContentStudioTabErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ContentStudioTabErrorBoundary extends React.Component<
  ContentStudioTabErrorBoundaryProps,
  ContentStudioTabErrorBoundaryState
> {
  static displayName = 'ContentStudioTabErrorBoundary';

  // Explicit annotation required — do NOT rely on inference from class body
  override state: ContentStudioTabErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(
    error: Error
  ): ContentStudioTabErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error(`[ContentStudio:${this.props.tabName}] Tab crashed:`, error, info);
    // TODO: send to Sentry/error tracking service
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  override render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <TabErrorFallback
          tabName={this.props.tabName}
          error={this.state.error}
          onReset={this.handleReset}
        />
      );
    }
    return this.props.children;
  }
}
```

---

#### Finding 2.5 — `AITerminalConfig` Interface Uses Implicit `any` via Untyped Callback

**Rating:** HIGH

**Location:** Finding 5 — Unified AI Terminal State Fragmentation

**Issue:**

```typescript
// AS WRITTEN — AIIntent is undefined
interface AITerminalConfig {
  onHandoff?: (intent: AIIntent) => void;
}
```

`AIIntent` is referenced but never defined in the document. Any developer implementing this will either:
- Import a non-existent type (compile error)
- Define their own local `AIIntent` (type fragmentation — exactly the problem the unified terminal is meant to solve)
- Fall back to `any` (defeats TypeScript entirely)

**Recommendation — define the discriminated union before the interface:**

```typescript
// types/ai/AIIntent.ts — must be defined BEFORE AITerminalConfig

type AIIntent =
  | { type: 'navigate'; route: string; params?: Record<string, string> }
  | { type: 'load-workout'; planId: string }
  | { type: 'schedule-session'; clientId: string; suggestedTime?: string }
  | { type: 'open-client-profile'; clientId: string }
  | { type: 'create-content'; contentType: 'email' | 'social' | 'workout' };

// Discriminated union enables exhaustive switch in parent handlers:
// switch (intent.type) {
//   case 'navigate': router.push(intent.route); break;
//   case 'load-workout': loadPlan(intent.planId); break;
//   ...
// }

interface AITerminalConfig {
  terminalId: string;
  systemPrompt: string;
  suggestedPrompts?: readonly string[]; // readonly — config should not be mutated
  voiceEnabled?: boolean;
  sidebarEnabled?: boolean;
  onHandoff?: (intent: AIIntent) => void;
}
```

---

#### Finding 2.6 — Mock Data Guard Snippet Is Truncated Mid-Expression

**Rating:** HIGH

**Location:** Finding 6 — Mock Data Contamination Risk, end of file

**Issue:**

```typescript
// AS WRITTEN — file cuts off mid-line
const MOCK_DATA_ALLOWED = import.meta.env.VITE_ALLOW_MOCK_DATA
```

The file is truncated. The expression is incomplete (missing `=== 'true'` or similar), and the entire `mockDataGuard.ts` utility is absent. This is a documentation failure that will cause an implementer to either skip the guard entirely or implement it incorrectly.

**Recommendation — complete the snippet:**

```typescript
// utils/data/mockDataGuard.ts

const IS_PRODUCTION = import.meta.env.PROD;
const MOCK_DATA_ALLOWED = import.meta.env.VITE_ALLOW_MOCK_DATA === 'true';

/**

---

## [PASS] Security
**Model:** nvidia/nemotron-3-nano-30b-a3b:free | **Duration:** 19.9s

# Security AuditFindings – SwanStudios Refactor Brief  

---  

## 1. OWASP Top 10  

| Finding | Rating | Details |
|---|---|---|
| **Unsafe rendering of raw HTML in AI responses** | **CRITICAL** | AI terminals sometimes return raw HTML tags (`<strong>`, `<header>`, `<u>`) instead of rendered markup. If these strings are injected into the DOM (e.g., via `innerHTML`), they can be exploited for **XSS**. The brief explicitly notes this as a “P0 Blocker” and recommends sanitising/ escaping all AI‑generated markup before insertion. |
| **SSRF via image‑metadata processing** | **HIGH** | Equipment‑scan workflow uploads images to Cloudflare R2, then the backend may fetch URLs from image metadata for AI analysis. An attacker can embed a `file://` or internal‑network URL in EXIF data, causing the server to make outbound requests to arbitrary internal services. No validation or URL‑allow‑list is described. |
| **Potential injection in conversation‑data parsing** | **MEDIUM** | Conversation payloads are stored as JSONB and later parsed server‑side. If unsanitised fields are concatenated into SQL or used directly in template engines, injection could occur. The brief does not specify parameterised queries or ORM‑level protection. |

---  

## 2. Client‑Side Security  

| Finding | Rating | Details |
|---|---|---|
| **No evidence of secrets in `localStorage` or exposed API keys** | **NONE** | The submitted documents contain no references to client‑side storage of credentials, keys, or configuration values. |
| **`eval` or unsafe dynamic code execution** | **NONE** | No usage of `eval`, `new Function`, or similar constructs is mentioned in the brief. |

---  

## 3. Input Validation  

| Finding | Rating | Details |
|---|---|---|
| **Absence of formal input‑sanitisation schemas (Zod/Yup)** | **MEDIUM** | While the brief discusses PII redaction and file‑type validation, it does **not** specify any type‑safe validation layer (e.g., Zod, Yup) for user‑entered data such as workout names, client emails, or voice‑input transcripts. This increases the risk of malformed or malicious payloads reaching backend services. |
| **Insufficient sanitisation of free‑text AI prompts** | **HIGH** | AI terminals accept unconstrained free‑text from trainers/clients. Without explicit sanitisation (e.g., length limits, prohibited‑keyword filters) malicious prompts could trigger injection‑style behaviour or cause denial‑of‑service via extremely large payloads. |

---  

## 4. CORS & CSP  

| Finding | Rating | Details |
|---|---|---|
| **CORS and CSP configuration not described** | **NONE** | The brief does not mention any CORS policies, allowed origins, or Content‑Security‑Policy headers. No mis‑configuration is evident, but the lack of documentation means the final implementation could unintentionally expose overly permissive endpoints. |

---  

## 5. Authentication  

| Finding | Rating | Details |
|---|---|---|
| **JWT handling and token storage not specified** | **MEDIUM** | The architecture discussion mentions RBAC and session context but does **not** detail how JWTs are created, signed, rotated, or stored (e.g., HttpOnly cookies vs. `localStorage`). Improper token handling could lead to token leakage or replay attacks. |
| **Session management gaps** | **MEDIUM** | No mention of session timeout, refresh‑token strategy, or revocation on logout. This could allow stale sessions to remain active after a user logs out or a device is lost. |

---  

## 6. Authorization  

| Finding | Rating | Details |
|---|---|---|
| **RBAC enforcement gaps & missing row‑level security** | **CRITICAL** | The brief outlines an intended RBAC model (admin → all, trainer → assigned clients, client → own data) but **does not** prescribe concrete enforcement mechanisms. Critical gaps identified: <br>• No Row‑Level Security (RLS) policy defined for the `conversations` JSONB table. <br>• No middleware decorator or guard to verify `trainer_id` matches `client_id` on every request. <br>• Admin privileges are treated as monolithic, creating a **privilege‑escalation** vector. <br>These omissions are rated **CRITICAL** because they directly enable unauthorized data access. |
| **Context‑switching without proper isolation** | **HIGH** | The plan mentions “context switching between trainer and client views” but does not enforce a strict security boundary (e.g., separate JWT claims or server‑side impersonation checks). This could allow a trainer to inadvertently act on another trainer’s client data. |

---  

## 7. Data Exposure  

| Finding | Rating | Details |
|---|---|---|
| **PII leakage in AI conversation storage** | **CRITICAL** | Conversations are stored as plain JSONB in PostgreSQL. The brief highlights a **ZERO PII TO LLMs** policy but does not describe any on‑device redaction or server‑side sanitisation before persisting. Raw client names, health details, or location data could be retained, violating privacy regulations (HIPAA/GDPR). |
| **Voice‑recording privacy and retention issues** | **HIGH** | Audio captured via `MediaRecorder` is sent to Gemini for transcription with **no retention policy** defined. Storing raw voice recordings (biometric data) without encryption or automatic deletion contravenes the “no PII to LLMs” rule and creates a compliance risk. |
| **Potential PII exposure via console / network logs** | **HIGH** | The brief notes that some AI responses contain raw HTML tags and that “some responses show raw HTML tags … instead of rendering them properly.” If such responses are logged (e.g., to console or log aggregation services) they could leak client‑specific identifiers or health information. No log‑scrubbing strategy is mentioned. |
| **File‑upload exposure (R2) without malware scanning** | **HIGH** | Images uploaded for AI analysis are stored in Cloudflare R2 but are not validated for malicious payloads (e.g., SVG with script, polyglot files). This could lead to **data exfiltration** or **server‑side code execution** if processed by vulnerable libraries. |

---  

### Summary of Ratings  

| Severity | Number of Findings |
|---|---|
| **CRITICAL** | 4 |
| **HIGH** | 4 |
| **MEDIUM** | 3 |
| **LOW / NONE** | 3 |

---  

**Recommendations (high‑level)**  

1. **Sanitise/escape all AI‑generated markup** before inserting into the DOM.  2. **Implement strict URL allow‑list and metadata stripping** for image uploads to eliminate SSRF vectors.  
3. **Introduce server‑side input validation schemas** (Zod/Yup) for all user‑submitted data, including voice transcripts.  
4. **Define CSP and restrictive CORS policies** for all backend endpoints.  
5. **Specify JWT lifecycle (signing, rotation, storage)** and enforce HttpOnly, Secure cookies.  
6. **Enforce Row‑Level Security** on the `conversations` table and add middleware guards for RBAC checks.  7. **Redact or tokenise PII before any external AI call** and enforce encryption‑at‑rest for conversation JSONB fields.  
8. **Establish a voice‑recording retention policy** (e.g., delete after processing) and encrypt data in transit/at rest.  
9. **Audit logs for PII leakage** and implement automated scrubbing of console/network logs.  
10. **Add malware scanning** (e.g., `sharp` re‑encoding) for all uploaded images before AI processing.  

These actions should be documented in the architecture design **before any implementation begins** to prevent the recurring “naïve copy‑paste” anti‑pattern highlighted in the brief.  

---  

*Part of SwanStudios 14‑Brain Recursive Consensus System*

---

## [PASS] Performance & Scalability
**Model:** google/gemini-3-flash-preview-20251217 | **Duration:** 12.1s

As a Performance and Scalability Engineer, I have reviewed the provided documentation and architectural briefs for the **SwanStudios: Enchanted Apex** refactor. 

While the provided files are primarily research and planning documents, they contain specific architectural proposals and "Known Issue" inventories that reveal significant performance, scalability, and efficiency risks.

### Executive Summary of Ratings
| Category | Rating | Primary Reason |
| :--- | :--- | :--- |
| **Bundle Size** | **HIGH** | Massive "Content Studio" and "Exercise Rolodex" (840+ items) without a code-splitting strategy. |
| **Render Performance** | **CRITICAL** | Reported "sticky/sluggish" scrolling and lack of virtualization for large lists. |
| **Network Efficiency** | **HIGH** | N+1 risks in AI conversation loading and lack of AbortController patterns. |
| **Memory Leaks** | **MEDIUM** | Improper cleanup of `MediaRecorder` and `AbortController` in AI/Voice flows. |
| **Database/Scalability** | **CRITICAL** | In-memory state fragmentation and lack of Row-Level Security (RLS) for multi-tenant scaling. |

---

### 1. Bundle Size & Lazy Loading
**Finding: Monolithic Module Bloat**
**Rating: HIGH**
*   **Issue:** The "Content Studio" (Section 5.J) contains 10+ tabs including a "Remotion Template Gallery." Remotion and heavy video-processing libraries are massive.
*   **Impact:** Loading the Content Studio will fetch several megabytes of JS, even if the user only needs one tab.
*   **Recommendation:** 
    *   Implement **React.lazy()** for every tab in the Content Studio.
    *   Move the `Remotion` engine into a separate dynamic import to prevent it from blocking the initial paint of the dashboard.

---

### 2. Render Performance
**Finding: Lack of List Virtualization (840+ Exercises)**
**Rating: CRITICAL**
*   **Issue:** The "Exercise Rolodex" (Section 5.A) renders 840+ exercises. The brief reports "sticky/sluggish scrolling" on iPhone XR.
*   **Impact:** Rendering 800+ DOM nodes with styled-components on a mobile device will cause massive "Long Tasks" (>500ms), freezing the UI thread.
*   **Recommendation:** 
    *   Mandate **`@tanstack/react-virtual`** or `react-window` for the Rolodex and Saved Plans.
    *   **Memoize** individual Exercise Cards using `React.memo` to prevent re-renders when the search query changes.

---

### 3. Network Efficiency
**Finding: Race Conditions & Redundant AI Fetches**
**Rating: HIGH**
*   **Issue:** The architectural review (Doc 02, Finding 2) identifies a lack of `AbortController` in the AI conversation flow.
*   **Impact:** If a user clicks three different conversations rapidly, three parallel requests fire. If they resolve out of order, the UI will display the wrong data (Data Inconsistency).
*   **Recommendation:** 
    *   Implement a custom `useApi` hook that automatically attaches an `AbortController` to the `fetch` signal and cancels previous pending requests for the same resource.

---

### 4. Memory Leaks
**Finding: Detached Media Streams & Event Listeners**
**Rating: MEDIUM**
*   **Issue:** The "Voice-First Workflow" (Doc 01, Section 7) uses the `MediaRecorder` API. There is no mention of track cleanup.
*   **Impact:** Failing to call `stream.getTracks().forEach(t => t.stop())` keeps the microphone hardware active and leaks memory in the browser process, eventually crashing the mobile tab.
*   **Recommendation:** 
    *   Ensure the `useVoice` hook returns a cleanup function in `useEffect` that stops all tracks and revokes any `URL.createObjectURL` blobs.

---

### 5. Database & Scalability
**Finding: In-Memory State Fragmentation**
**Rating: CRITICAL**
*   **Issue:** The brief notes "Saved plans are unreliable" and "AI terminals are fragmented." This suggests state is being managed locally in components rather than a synchronized store.
*   **Impact:** In a multi-instance production environment (sswanstudios.com), if state isn't persisted or synchronized via a global store (Zustand/Redux), users will lose "Saved Plans" or AI context when the page refreshes or the load balancer switches nodes.
*   **Recommendation:** 
    *   Move AI conversation state to a **Zustand store with Persist middleware** (sessionStorage).
    *   Implement **PostgreSQL Row-Level Security (RLS)** (Doc 03) to ensure that as the user base scales, one trainer cannot accidentally query another trainer's client data via a modified `client_id` in the request.

---

### 6. Theme & Design System (Performance Impact)
**Finding: Styled-Components Dynamic Prop Overload**
**Rating: MEDIUM**
*   **Issue:** The "Crystalline Swan" theme uses complex gradients and "Glow Accents" (#50A0F0). 
*   **Impact:** Excessive use of dynamic props in `styled-components` (e.g., `<Container $glow={intensity} />`) causes the library to generate and inject new CSS classes into the `<head>` on every frame of an animation.
*   **Recommendation:** 
    *   For the "Arctic Cyan" glow animations, use **CSS Variables** (`var(--glow-intensity)`) passed via the `style` prop instead of styled-component props to avoid CSS injection overhead.

### Final Engineer's Note:
The **iPhone XR** performance target is the "canary in the coal mine." If virtualization and code-splitting are not implemented in this refactor, the app will be unusable for the primary persona (Trainers on the gym floor). **Priority 1 must be virtualization of the Exercise Rolodex.**

---

## [PASS] Competitive Intelligence
**Model:** google/gemini-2.5-flash | **Duration:** 16.8s

SwanStudios is positioned to be a premium, AI-driven personal training platform. The "Enchanted Apex: Crystalline Swan" theme, coupled with the sophisticated tech stack and focus on AI, sets a high bar. However, the current state, as revealed by the validation reports, indicates significant gaps and technical debt that need addressing to realize this vision.

## 1. Feature Gap Analysis

Based on competitor analysis (Trainerize, TrueCoach, My PT Hub, Future, Caliber) and general fitness app trends, SwanStudios has the following feature gaps:

| Category               | Missing Features (Competitor Examples)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                

---

## [PASS] User Research & Persona Alignment
**Model:** nvidia/nemotron-3-nano-30b-a3b:free | **Duration:** 18.0s

# SwanStudios UI/UX Review – Actionable Recommendations  
*Prepared for the SwanStudios refactor team*  

---  

## 1. Persona Alignment  

| Persona | Current UI/UX Fit | Recommended Enhancements |
|---------|-------------------|--------------------------|
| **Primary – Working Professionals (30‑55)** | • Dark‑rich palette (Midnight Sapphire, Royal Depth) feels premium but may appear “corporate‑cold”. <br>• Navigation is dense; no clear “quick‑start” for busy users. | • Add a **“Quick‑Log”** widget on the home dashboard that lets a user log a workout in ≤ 2 taps. <br>• Use **Royal Depth** for primary CTA buttons and **Ice Wing** for secondary actions to create visual hierarchy. <br>• Show **time‑saved** metrics (e.g., “You saved 15 min this week”) to speak to time‑pressed users. |
| **Secondary – Golfers (Sport‑Specific)** | • Golf‑specific language is minimal; no sport‑icons or swing‑animation cues. | • Introduce **golf‑themed micro‑animations** (e.g., a subtle swing‑path when a workout is completed). <br>• Add a **“Club‑Fit”** badge that unlocks after 5 golf‑specific sessions. <br>• Use **Gilded Fern** as an accent for golf‑related badges to reinforce luxury. |
| **Tertiary – Law Enforcement / First Responders** | • No explicit badge of authority or certification; UI feels generic. | • Surface **“Certified Trainer – NASM OPT”** badge prominently on trainer profiles. <br>• Offer a **“Mission‑Ready”** workout mode that emphasizes strength, endurance, and recovery metrics. <br>• Use **Frost White** background with high‑contrast **Ice Wing** text for readability in bright outdoor conditions. |
| **Admin – Sean Swan (NASM‑certified)** | • Admin sidebar is cumbersome; extra tap to close. | • Provide a **“Trainer‑Mode”** toggle that instantly switches the UI to a trainer‑centric layout (larger client list, quick‑assign buttons). <br>• Highlight **certifications** and **experience** in the admin dashboard header. |

---  ## 2. Onboarding Friction  | Issue | Why It Matters | Fix (Prioritized) |
|-------|----------------|-------------------|
| **No explicit “Add Exercise” button** – double‑click on desktop, disappearing name on mobile. | Breaks flow; users can’t add exercises quickly in a gym setting. | • Place a **persistent “+ Add Exercise” FAB** (Ice Wing color) in the workout builder. <br>• Keep exercise name visible in the Rolodex panel (use a compact card view). |
| **Long, unscrollable exercise list** on mobile. | Overwhelms users; forces excessive scrolling. | • Implement a **virtualized Rolodex** (bottom sheet) that shows 5‑7 exercises at a time with swipe/scroll. <br>• Add **search & filter chips** (e.g., “Strength”, “Mobility”). |
| **Horizontal tab bars not scrollable** on mobile. | Many tabs become inaccessible on iPhone XR. | • Replace with **bottom navigation** for primary sections; use **vertically scrollable tab bar** only for secondary content. |
| **Unclear saved‑plan interaction** – non‑clickable cards. | Trainers can’t reuse plans efficiently. | • Render saved plans as **clickable cards** with a clear “Load” or “Copy” icon. <br>• Open a **modal** that pre‑populates the builder with the plan’s exercises. |
| **AI terminal overlay stuck / non‑dismissable**. | Users lose control; trust erodes. | • Add a **clear “X” close button** with a higher z‑index; ensure overlay can be dismissed by tapping outside or swiping down. |
| **No onboarding tour for new features**. | Users miss key value props. | • Deploy a **progressive product tour** (Duolingo‑style) that walks users through the new AI terminal, Rolodex, and dashboard customization the first time they open the app. |

---  

## 3. Trust Signals  

| Trust Element | Current Visibility | Recommendation |
|---------------|-------------------|----------------|
| **Certifications** (NASM, OPT) | Mentioned only in admin bio. | • Add a **certification badge strip** on trainer profile cards (e.g., “NASM‑CPT”, “OPT‑Certified”). <br>• Use **Royal Depth** background for badge containers to make them pop. |
| **Testimonials / Social Proof** | Scattered, not highlighted. | • Place a **rotating testimonial carousel** on the homepage using **Ice Wing** accent for quote marks. <br>• Include **client success stories** with before/after metrics (e.g., “+12 % VO₂ max”). |
| **Security Badges** (Zero‑PII policy) | Not visible to users. | • Add a **“Your Data is Safe”** banner in the footer with a lock icon and brief note: “No personal data sent to external LLMs.” |
| **Trainer Experience** | Only admin bio shows 25+ years. | • Show **trainer tenure** and **client count** next to each trainer’s name in the scheduler. |
| **Media & Press** | Absent. | • Link to **press mentions** (e.g., “Featured in *Fitness Magazine*”) with small logos; use **Gilded Fern** for hover states. |

---  

## 4. Emotional Design (Crystalline Swan Theme)  

| Emotional Goal | Current Palette / Typography | Actionable Tweaks |
|----------------|------------------------------|-------------------|
| **Premium & Trustworthy** | Midnight Sapphire, Royal Depth, Frost White. | • Use **Royal Depth** for hero sections to convey depth; pair with **Frost White** for clean whitespace. <br>• Add subtle **gradient overlays** (e.g., Royal Depth → Ice Wing) on hero images to evoke a “crystalline” feel. |
| **Motivating & Energetic** | Ice Wing (#60C0F0) & Arctic Cyan (#50A0F0) for accents. | • Apply **Ice Wing** to **CTA buttons** and **progress bars**; animate them with a **pulse** on hover to create a sense of movement. |
| **Luxury & Exclusivity** | Gilded Fern (#C6A84B) as luxury accent. | • Reserve **Gilded Fern** for **badge borders**, **icon highlights**, and **hover states** on premium features (e.g., “Elite Coaching”). |
| **Clarity & Readability** | Plus Jakarta Sans (headings), Cormorant Garamond Italic (drama), Fira Code (data), Sora (UI). | • Ensure **heading hierarchy** is clear: H1 = 28‑32 px, H2 = 22‑24 px, body = 16‑18 px. <br>• Use **Cormorant Garamond Italic** sparingly for **call‑out quotes** to add drama without overwhelming. |
| **Gaming‑Style Fun** | Wing Purple (#8B5CF6) as secondary accent. | • Use **Wing Purple** for **gamified elements** (e.g., streak counters, badge icons) to tie into the “gaming” persona. |

---  

## 5. Retention Hooks  

| Hook | Current State | Enhancements |
|------|---------------|--------------|
| **Gamification** | Basic streaks mentioned; no visual system. | • Introduce a **“Swan Level”** that unlocks new avatar skins, exclusive workout packs, and **Gilded Fern** borders. <br>• Add **daily/weekly challenges** with push notifications. |
| **Progress Tracking** | Charts exist but not personalized. | • Provide **personalized progress narratives** (“You’re on track for a 10 % strength gain in 4 weeks”). <br>• Allow users to **export** charts as PDFs or share to social. |
| **Community Features** | Forum & chat mentioned but not prominent. | • Create a **“Swan Circle”** community hub with **role‑based channels** (Golf, Law Enforcement, General). <br>• Enable **reaction emojis** (e.g., Ice Wing heart) to foster engagement. |
| **AI Coach Personalization** | Voice‑first AI exists but feels robotic. | • Offer **voice‑style selection** (e.g., “Calm”, “Energetic”) using **Wing Purple** themed voice avatars. <br>• Implement **proactive nudges**: “Your next session is in 2 days – ready to crush it?” |
| **Certification Milestones** | NASM OPT periodization mentioned. | • Celebrate **certification completions** with a **badge animation** and a **certificate download**. <br>• Offer a **“Trainer Hall of Fame”** page showcasing top performers. |
| **Retention Emails / Pushes** | Not detailed. | • Send **weekly “Swan Summary”** emails with progress, upcoming plans, and a **personalized motivational quote**. <br>• Use **behavior‑triggered pushes** (e.g., “You haven’t logged a workout in 3 days – let’s get back on track”). |

---  

## 6. Accessibility for Target Demographics  

| Concern | Current Risk | Concrete Fixes |
|---------|--------------|----------------|
| **Font Size & Contrast for 40+ Users** | Frost White on dark backgrounds can be low contrast; body text may be too small on mobile. | • Ensure **minimum 18 px** body text on mobile; **20 px** for headings. <br>• Run a **WCAG 2.1 AA contrast audit**; adjust any text with < 4.5:1 ratio (e.g., increase Ice Wing opacity or darken background). |
| **Touch Target Size** | Small buttons on mobile cause mis‑taps. | • Make all interactive elements **≥ 44 × 44 dp**; use **Ice Wing** background for primary actions. |
| **Screen Reader Compatibility** | Raw HTML tags in AI responses; non‑clickable controls. | • Implement **semantic HTML** (`<button>`, `<label>`, `<nav>`) and **ARIA labels** for all custom controls. <br>• Add **live region announcements** for AI responses (“New message from AI coach”). |
| **Keyboard Navigation** | Horizontal tabs not keyboard‑focusable; overlay traps. | • Provide **focus outlines** (Ice Wing outline on dark background). <br>• Ensure **Esc** closes any modal; allow **Tab** to move focus out of the overlay. |
| **Mobile‑First Layout** | Desktop‑centric designs cause clipping on iPhone XR. | • Adopt a **mobile‑first component library**: stack columns, use **bottom sheets** for modals, and **collapsible accordions** for settings. <br>• Test on **iPhone SE (2022)** and **Pixel 4a** to verify legibility and performance. |
| **Visual Simplicity for Cognitive Load** | Dense dashboards may overwhelm busy professionals. | • Use **progressive disclosure**: show only primary actions; hide advanced settings behind an “Advanced” toggle. <br>• Provide **high‑contrast “Focus Mode”** that simplifies the UI to essential metrics only. |

---  

### Quick‑Start Checklist (Top‑Priority)

1. **Add persistent “+ Add Exercise” FAB** and virtualized Rolodex.  2. **Implement WCAG‑AA contrast audit** and fix any failing color combos.  
3. **Create a unified AI terminal hook** (`useAITerminal`) with abort‑controller fetch pattern.  
4. **Introduce certification badges** and a testimonial carousel on the homepage.  
5. **Launch a progressive onboarding tour** for new features.  
6. **Deploy mobile‑first navigation** (bottom bar + scrollable tabs).  
7. **Add gamified “Swan Level”** with badge unlocks and streak tracking.  
8. **Enforce PII redaction** before any AI conversation is sent.  

---  

*Prepared by the SwanStudios UX Research & Architecture Review Team*  
*Date: 2026‑04‑06*  

---  

*End of Report*

---

## [PASS] Architecture & Bug Hunter
**Model:** minimax/minimax-m2.7-20260318 | **Duration:** 105.3s

# SwanStudios Deep Architecture Review & Bug Hunt

## Executive Summary

After comprehensive review of the provided documentation files, I've identified **23 critical/high severity findings** that represent ship blockers. The documentation reveals systemic architectural gaps, security violations against stated policies, integration fractures, and production readiness failures.

---

## 1. BUG DETECTION

### Finding 1 — Race Condition: Conversation Loading Without Abort Controller

**Severity:** 🔴 CRITICAL  
**File:** `02-architecture-design.md` — Preemptive Architectural Findings, Section 2  
**What's Wrong:**  
The architecture brief acknowledges a race condition risk in conversation loading ("Fast clicking: User clicks conversation A, then B before A resolves") but provides a solution that is **not enforced as mandatory**. The `loadConversation` pattern with AbortController is presented as a "Recommended Fix" but the plan lacks enforcement mechanisms. Any AI executor will implement the naive version first, causing:
- Stale messages appearing under wrong conversation headers
- Memory leaks from orphaned fetch operations
- State corruption when conversations resolve out of order

**Fix:**
```typescript
// MUST be codified in architecture standards before any implementation
// hooks/ai/useAIConversations.ts — enforce this pattern

export function createAbortController(): AbortController {
  return new AbortController();
}

export function isAbortError(error: unknown): error is DOMException {
  return error instanceof DOMException && error.name === 'AbortError';
}

// Type-safe wrapper that enforces abort handling
export async function fetchWithAbort<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  controller: AbortController
): Promise<T> {
  try {
    return await fetcher(controller.signal);
  } catch (error) {
    if (isAbortError(error)) {
      // Explicitly re-throw for callers to handle
      throw error;
    }
    throw error;
  }
}
```

Add to project linting/rules:
```json
{
  "no-restricted-syntax": [
    "error",
    {
      "selector": "CallExpression[callee.name='fetch']:not(:has(Argument[properties.name='signal']))",
      "message": "All fetch calls in AI/async flows MUST include AbortController signal for race condition prevention"
    }
  ]
}
```

---

### Finding 2 — Styled-Components Runtime Crash Propagation (P0 Blocker)

**Severity:** 🔴 CRITICAL  
**File:** `02-architecture-design.md` — Finding 3, Styled-Components Runtime Crash  
**What's Wrong:**  
The document identifies `RemotionTemplateGallery.tsx:482:51` as a crash site but the fix proposes adding error boundaries **without identifying the root cause**. The crash is described as a styled-components runtime error, which suggests one of:
1. ThemeProvider missing at render ancestry
2. Undefined prop passed to styled-component style function
3. Dynamic style computation on null value

Without root cause analysis, error boundaries will mask the bug rather than fix it.

**Fix — Root Cause Analysis First:**
```typescript
// DIAGNOSTIC: Add runtime type guards to styled-components
// Before any styled-component that crashed:

const DangerouslyDynamicText = styled.span<{ value?: string | number }>`
  font-size: ${props => {
    // CRITICAL: Validate input before computation
    if (props.value === undefined || props.value === null) {
      console.warn('DangerouslyDynamicText received null/undefined value');
      return '16px'; // Safe default
    }
    return typeof props.value === 'number' 
      ? `${props.value}px` 
      : props.value;
  }};
`;

// Theme validation at provider level
const ThemeProviderValidation: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = useContext(ThemeContext);
  
  useEffect(() => {
    const required = ['primary', 'secondary', 'surface', 'text', 'background'];
    const missing = required.filter(key => !(key in theme));
    if (missing.length > 0) {
      throw new Error(
        `Theme missing required keys: ${missing.join(', ')}. ` +
        `ThemeProvider must wrap RemotionTemplateGallery at: ${window.location.pathname}`
      );
    }
  }, [theme]);
  
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
};
```

---

### Finding 3 — PII Exposure: No Client-Side Redaction Before AI Transmission

**Severity:** 🔴 CRITICAL  
**File:** `03-security-planning.md` — Finding 1, PII Exposure in AI Conversations  
**What's Wrong:**  
The security document identifies the risk ("ZERO PII TO LLMs policy") but the proposed mitigations are **architecture-level suggestions, not implementation code**. There is no actual redaction implementation. The gap is:

1. No PII detection library integrated
2. No redaction middleware in the API layer
3. No frontend guard before `fetch()` to AI endpoints
4. No test suite verifying PII is stripped

This is a policy violation that creates regulatory liability (HIPAA/GDPR).

**Fix — Immediate Implementation Required:**
```typescript
// libs/pii/pii-redactor.ts
// MUST exist before any AI terminal implementation

import { PIIDetector } from './detector';

const REDACTION_PATTERNS = {
  EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  PHONE: /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
  SSN: /\d{3}[-\s]?\d{2}[-\s]?\d{4}/g,
  DATE: /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g,
  NAME: /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g, // Simple pattern, needs NER for accuracy
  ADDRESS: /\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr)\b/gi,
} as const;

export interface RedactionResult {
  sanitized: string;
  entitiesFound: PIIEntity[];
  confidence: number;
}

export interface PIIEntity {
  type: keyof typeof REDACTION_PATTERNS;
  value: string;
  startIndex: number;
  endIndex: number;
}

export function redactPII(input: string): RedactionResult {
  const entitiesFound: PIIEntity[] = [];
  let sanitized = input;
  
  for (const [type, pattern] of Object.entries(REDACTION_PATTERNS)) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(input)) !== null) {
      entitiesFound.push({
        type: type as PIIEntity['type'],
        value: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
      sanitized = sanitized.replace(match[0], `[${type}]`);
    }
  }
  
  return {
    sanitized,
    entitiesFound,
    confidence: entitiesFound.length > 0 ? 0.95 : 0.0,
  };
}

// API middleware that MUST be applied to all AI endpoints
export function createPIIGuardMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const body = req.body;
    const messageContent = body.messages?.map((m: { content: string }) => m.content).join(' ') || '';
    
    const redaction = redactPII(messageContent);
    
    if (redaction.confidence > 0.5) {
      // Log the attempt with redaction metadata
      logger.warn('PII detected in AI request', {
        userId: req.user?.id,
        entitiesFound: redaction.entitiesFound,
        endpoint: req.path,
      });
      
      return res.status(400).json({
        error: 'PII_DETECTED',
        message: 'Please remove personal identifiers from your request.',
        sanitizedHint: redaction.sanitized.substring(0, 100) + '...',
      });
    }
    
    // Replace original content with sanitized
    if (redaction.sanitized !== messageContent) {
      req.body = {
        ...body,
        messages: body.messages.map((m: { content: string }) => ({
          ...m,
          content: m.content.replace(messageContent, redaction.sanitized),
        })),
        _piiSanitized: true,
        _piiEntitiesFound: redaction.entitiesFound,
      };
    }
    
    next();
  };
}
```

---

### Finding 4 — Missing Loading States for Async Operations

**Severity:** 🟠 HIGH  
**File:** `06-persona-alignment.md` — Throughout  
**What's Wrong:**  
The persona alignment document identifies missing functionality (session history, upcoming endpoints returning 404, non-clickable saved plans) but the **root cause** is likely missing loading/error state handling in React. When these API calls fail or return null, the UI has no fallback, causing:
- White screens while loading
- Unhandled promise rejections
- Confusing "nothing happened" UX

**Fix:**
```typescript
// hooks/useAsyncResource.ts — Required for ALL API hooks
// MUST be used for every data fetch

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useAsyncResource<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList = []
): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: true,
    error: null,
    refetch: () => {},
  });

  const fetch = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const data = await fetcher();
      setState({ data, loading: false, error: null, refetch: fetch });
    } catch (error) {
      setState({ 
        data: null, 
        loading: false, 
        error: error instanceof Error ? error : new Error(String(error)),
        refetch: fetch,
      });
    }
  }, deps);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return state;
}

// Enforce usage with lint rule:
// no-sync-fetches: prevent any fetch() outside of useAsyncResource or React Query
```

---

### Finding 5 — Null/Undefined Access in Session Duration Configuration

**Severity:** 🟠 HIGH  
**File:** `01-ux-research.md` — Section 2, Scheduling and Calendar  
**What's Wrong:**  
The document states: "Lack of 30/45-minute session support" as a missing feature. This implies the current implementation hardcodes session durations. The bug is likely:

```typescript
// Current (broken) pattern
const SESSION_DURATIONS = [60]; // Only 60 minutes supported

// Or worse, inline in component
<div>{session.duration === 60 ? '1 hour' : session.duration}</div>
// When duration is 30 or 45, renders "30" or "45" (raw number)
```

**Fix:**
```typescript
// constants/sessionDurations.ts
export const SESSION_DURATIONS = [30, 45, 60, 90] as const;
export type SessionDuration = typeof SESSION_DURATIONS[number];

export const SESSION_DURATION_LABELS: Record<SessionDuration, string> = {
  30: '30 min',
  45: '45 min',
  60: '1 hour',
  90: '1.5 hours',
} as const;

// Component usage
<span>{SESSION_DURATION_LABELS[session.duration as SessionDuration] ?? `${session.duration} min`}</span>
```

---

## 2. ARCHITECTURE FLAWS

### Finding 6 — No State Management Strategy Defined (Critical Gap)

**Severity:** 🔴 CRITICAL  
**File:** `02-architecture-design.md` — Plan Gap Analysis Table  
**What's Wrong:**  
The gap analysis correctly identifies: "No state management strategy named (Zustand? Context? Redux?)" This is listed as 🔴 Critical. The consequence is **each AI pass will make different choices**, leading to:
- Mixed Redux + Context + local state across components
- Inconsistent patterns for server state vs. UI state
- No shared state persistence strategy

**Fix — Must Be Decided Before Implementation:**
```markdown
# Architecture Decision: State Management

## Chosen Strategy: TanStack Query (React Query) + Zustand + React Context

### TanStack Query (Server State)
- All API data fetching
- Caching, background refetching, optimistic updates
- Standardized for: sessions, clients, workouts, plans, conversations

### Zustand (Client UI State)
- Global UI state: sidebar open, modals, theme
- NOT for server data
- Lightweight, no boilerplate

### React Context (Infrequently Changing Data)
- User/auth context (changes on login/logout only)
- Theme context (changes rarely)
- Feature flags

## Prohibited Patterns
❌ Redux for any new code
❌ useState for server data
❌ Multiple competing state libraries
```

---

### Finding 7 — No Data Fetching Layer Defined (Race Conditions Guaranteed)

**Severity:** 🔴 CRITICAL  
**File:** `02-architecture-design.md` — Plan Gap Analysis Table  
**What's Wrong:**  
"No data fetching layer defined (React Query? SWR? raw fetch?)" is marked 🔴 Critical. Without a standardized fetching layer:
- Raw `fetch()` calls scattered across components
- No centralized error handling
- No caching strategy
- No request deduplication
- Race conditions as documented in Finding 1

**Fix:**
```typescript
// lib/api/client.ts
// Centralized API client with React Query integration

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30,   // 30 minutes (formerly cacheTime)
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      onError: (error) => {
        logger.error('Mutation error:', error);
        // Centralized error toast notification
      },
    },
  },
});

// All API calls MUST go through this
export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options?.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new APIError(error.message, response.status, endpoint);
  }
  
  return response.json();
}

// Enforce with ESLint:
// @typescript-eslint/no-restricted-imports: prevent direct fetch, require apiFetch
```

---

### Finding 8 — Circular Dependency Risk in AI Terminal Hooks

**Severity:** 🔴 CRITICAL  
**File:** `02-architecture-design.md` — Finding 1, Hook Composition  
**What's Wrong:**  
The document describes the circular dependency risk:
```
useCoachAssistant
  └── useAIChat (conversation state + fetch)
        └── useConversationSidebar (sidebar open/close + selected conversation)
```

But the recommended fix is **not implemented in the codebase**. The architecture plan contains no code to enforce the three-layer separation it recommends.

**Fix — Architecture Enforcement:**
```typescript
// .github/architecture-rules/hook-composition.md
# AI Hook Composition Rules

## Forbidden Patterns
❌ useAIChat importing useConversationSidebar
❌ useConversationSidebar importing useAIChat
❌ useCoachAssistant importing any hook that imports another

## Required Pattern
✅ Layer 1: `hooks/ai/useAIConversations.ts` — Pure data, no UI state
✅ Layer 2: `hooks/ai/useAITerminalUI.ts` — UI state only, no data
✅ Layer 3: `hooks/ai/useAITerminal.ts` — Composes L1 + L2

## Dependency Direction
```
useAITerminal
    ├── imports useAIConversations (L1)
    └── imports useAITerminalUI (L2)
    
L1 ──► L2 (L1 does NOT import L2)
L2 ──X L1 (NO back-reference)
```

## Enforcement
- Add to ESLint: no-circular-imports for hooks directory
- Add pre-commit hook: verify hook dependency graph
```

---

### Finding 9 — God Components Exceeding 300 Lines (No Enforcement)

**Severity:** 🟠 HIGH  
**File:** `02-architecture-design.md` — Finding 4, File Budget Violations Table  
**What's Wrong:**  
The document correctly identifies files that will exceed 300 lines:
- `WorkoutPlannerPage.tsx` — 500-800 lines
- `CoachAssistant.tsx` — 400-600 lines
- `ContentStudio.tsx` — 

---

## [PASS] Frontend UX & Code Patterns
**Model:** google/gemini-3.1-flash-lite-preview-20260303 | **Duration:** 7.2s

This review evaluates the architectural and UX readiness of the SwanStudios refactor based on the provided documentation.

### 1. React Component Patterns
*   **Finding:** **CRITICAL** — The documentation confirms a lack of defined component trees or shared library boundaries. The current "naive" implementation path will lead to massive, unmaintainable files (e.g., `WorkoutPlannerPage.tsx` estimated at 500-800 lines).
*   **Recommendation:** Implement a strict **Atomic Design** or **Feature-based folder structure**. Mandate a 300-line limit per file. Extract all business logic into custom hooks (e.g., `useExerciseSearch`, `useAITerminal`) to keep components purely presentational.
*   **Optimization:** The "Exercise Rolodex" requires **virtualization** (`@tanstack/react-virtual`). Rendering 840+ exercises in the DOM will cause the "sticky/sluggish" performance reported on mobile.

### 2. styled-components Best Practices
*   **Finding:** **CRITICAL** — The reported runtime crash in `RemotionTemplateGallery` indicates a failure in theme context propagation or unsafe property access within styled-components.
*   **Recommendation:** 
    *   **Theme Tokens:** Ensure `Arctic Cyan` and `Ice Wing` are strictly pulled from a `theme.ts` object, never hardcoded.
    *   **Glassmorphism:** Use `backdrop-filter: blur(10px); background: rgba(255, 255, 255, 0.1);` consistently.
    *   **Safety:** Use `styled(Component).attrs(...)` or optional chaining in style functions to prevent crashes when props are missing during initial render.

### 3. Animation & Interaction
*   **Finding:** **MEDIUM** — The plan mentions "micro-interactions" but lacks a motion strategy.
*   **Recommendation:** Use `framer-motion` for layout transitions (e.g., the Rolodex sliding in). **Crucial:** Implement `useReducedMotion` hooks to respect OS-level accessibility settings. Ensure all hover states for `Arctic Cyan` buttons include a subtle `transition: all 0.2s ease-in-out`.

### 4. Form UX
*   **Finding:** **HIGH** — The "batch-first" equipment scan workflow is currently reversed (details before images).
*   **Recommendation:** Implement a **Multi-Step Wizard** pattern. Use `react-hook-form` with `zod` for schema validation. Ensure error messages are descriptive and appear *inline* (below the input) rather than in a global alert, which is inaccessible on mobile.

### 5. State Management
*   **Finding:** **CRITICAL** — The documentation reveals fragmented AI terminal state.
*   **Recommendation:** 
    *   **Unified AI Terminal:** Move away from local component state. Use a centralized `AITerminalProvider` (Context API or Zustand) to manage conversation history, loading states, and voice input buffers. 
    *   **Race Conditions:** The current `loadConversation` implementation is prone to race conditions. Use `AbortController` in `useEffect` cleanup functions to cancel stale requests when a user clicks a different conversation.

### 6. Accessibility Gaps
*   **Finding:** **CRITICAL** — The documentation explicitly flags poor contrast in the current theme.
*   **Recommendation:** 
    *   **Contrast Audit:** The `Midnight Sapphire` (#002060) and `Royal Depth` (#003080) backgrounds must be tested against `Frost White` (#E0ECF4) text. 4.5:1 ratio is mandatory.
    *   **Keyboard Traps:** The "horizontal tab bars" are a major accessibility risk. Replace them with a vertical list or a mobile-first "segmented control" that is fully keyboard-navigable.
    *   **Error Boundaries:** The current navigation-breaking crashes are due to missing Error Boundaries. Wrap each major tab (Content Studio, AI Terminal) in a dedicated `ErrorBoundary` to prevent the entire app from crashing when one module fails.

---

### Summary of Priority Actions

| Priority | Action Item |
| :--- | :--- |
| **CRITICAL** | **Implement Error Boundaries** around all dynamic modules (AI Terminal, Content Studio). |
| **CRITICAL** | **PII Redaction Layer:** Sanitize all AI inputs client-side before transmission. |
| **CRITICAL** | **Virtualize Lists:** Use `@tanstack/react-virtual` for the 840+ exercise Rolodex. |
| **HIGH** | **Standardize AI Terminal:** Create a single `AITerminal` component with a unified `config` interface. |
| **HIGH** | **RBAC Middleware:** Enforce row-level security on the backend for all conversation/plan endpoints. |

**Final Note:** The "RETIRED Galaxy-Swan theme" must be purged from the codebase entirely to prevent accidental usage. Ensure all new components strictly adhere to the **Crystalline Swan** palette.

---

## [PASS] Data Safety & Integrity
**Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 86.7s

# DATA SAFETY AUDIT REPORT — SwanStudios Platform
## Validation Prompt Archive: 2026-04-06T22-22-09

**Auditor Role:** Production Data Safety Auditor
**Audit Scope:** Six validation report documents (01–06)
**Audit Date:** 2026-04-06
**Classification:** TREAT AS PRODUCTION-CRITICAL

---

## ⚠️ CRITICAL PRELIMINARY FINDING — AUDIT SCOPE LIMITATION

Before any findings: **these six files contain zero executable code.** They are AI-generated planning documents, architecture reviews, security analyses, and UX research reports. There are no SQL migrations, no Sequelize model definitions, no Express route handlers, no React components, and no database seeders present in the submitted material.

**This means the most dangerous data safety risks are not in what these documents contain — they are in what these documents FAIL TO SPECIFY, which will cause destructive patterns to be implemented downstream by AI code generators or developers working without constraints.**

This audit therefore operates in two modes:
1. **Direct findings** — content within these documents that is itself dangerous
2. **Downstream risk findings** — gaps in these planning documents that will predictably produce data-destructive code when implemented

Both categories are treated as production-critical because a planning document that fails to prohibit `sync({ force: true })` is functionally equivalent to a document that recommends it.

---

## FINDINGS INDEX

| # | Severity | Category | Title | Blast Radius |
|---|----------|----------|-------|--------------|
| F-01 | 🔴 CRITICAL | Destructive DB Operations | No Migration Safety Policy Defined — AI Executors Will Use `sync({ force: true })` | ALL USERS |
| F-02 | 🔴 CRITICAL | Auth & Session Safety | JWT Secret Rotation Not Addressed — All Sessions Could Be Invalidated | ALL USERS |
| F-03 | 🔴 CRITICAL | Auth & Session Safety | Password Hash Overwrite Risk During "Unified AI Terminal" Refactor Not Guarded | ALL USERS |
| F-04 | 🔴 CRITICAL | Transaction Safety | Multi-Table Operations Explicitly Planned With No Transaction Policy | ALL USERS |
| F-05 | 🔴 CRITICAL | Destructive DB Operations | CASCADE Delete Risk — RBAC Refactor Will Touch Foreign Keys Without Safety Constraints | ALL USERS |
| F-06 | 🔴 CRITICAL | Data Exposure | PII in AI Conversations — No Redaction Before LLM Transmission (Confirmed in 03-security) | ALL USERS |
| F-07 | 🔴 CRITICAL | Destructive DB Operations | Conversation JSONB Migration — ALTER TYPE Risk on Live Table With Existing Data | ALL USERS |
| F-08 | 🔴 CRITICAL | Backup & Recovery | No Mass-Delete Guard Specified Anywhere in Planning Documents | ALL USERS |
| F-09 | 🟠 HIGH | Migration Safety | Missing `down()` Function Policy — No Rollback Strategy for Any Planned Migration | ALL USERS |
| F-10 | 🟠 HIGH | Data Exposure | Admin Endpoints Without RBAC Middleware — Confirmed Gap in 03-security | ALL USERS |
| F-11 | 🟠 HIGH | Transaction Safety | Race Condition on User Record — Trainer/Client Context Switching (Confirmed in 03-security) | PER-USER |
| F-12 | 🟠 HIGH | Destructive DB Operations | Mock Data Fallback Contamination — StoreV3 Silent Fallback Could Mask Real Data Loss | ALL USERS |
| F-13 | 🟠 HIGH | Migration Safety | Column Rename Risk — Scheduling Refactor Will Break Live Queries Mid-Deploy | ALL USERS |
| F-14 | 🟠 HIGH | Auth & Session Safety | OAuth/Voice Token Storage Not Addressed — Refresh Tokens Unprotected During Schema Changes | ALL USERS |
| F-15 | 🟡 MEDIUM | Data Exposure | Voice Recording Retention — Biometric Data With No Deletion Policy | ALL USERS |
| F-16 | 🟡 MEDIUM | Migration Safety | No TypeScript Strict Mode Policy — `any` Types Will Bypass Validation on DB Writes | PARTIAL |
| F-17 | 🟡 MEDIUM | Backup & Recovery | Destructive Admin Calendar Operations Without Confirmation Flow | PARTIAL |
| F-18 | 🟡 LOW | Data Exposure | Error Messages May Expose PII — No Error Sanitization Policy Defined | PARTIAL |

---

## DETAILED FINDINGS

---

### F-01 — 🔴 CRITICAL: No Migration Safety Policy — AI Executors Will Use `sync({ force: true })`

**File & Location:** `02-architecture-design.md` — Part 1 Gap Analysis table; `06-persona-alignment.md` — Section F (Dashboard Widgets), Section G (Scheduling)

**Data at Risk:** Every table in the database — Users, Orders, Sessions, WorkoutPlans, Achievements, Conversations, all purchase history

**Blast Radius:** ALL USERS — complete data wipe

**What's Wrong:**

The architecture document explicitly lists "No file/folder structure proposed" and "No API contract format specified" as gaps, but critically **fails to list the most dangerous gap of all: no database migration safety policy.** The document then describes sweeping schema changes across at minimum six major modules (Dashboard, Scheduling, Equipment, AI Terminal, Workout Planner, Content Studio).

When an AI code generator or developer implements these schema changes without explicit constraints, the path of least resistance is:

```javascript
// THIS IS WHAT WILL BE GENERATED WITHOUT EXPLICIT PROHIBITION
// Sequelize sync with force — WIPES ALL DATA
await sequelize.sync({ force: true });

// OR in a seeder that runs on every deploy:
await queryInterface.bulkDelete('Users', null, {}); // null WHERE = ALL ROWS
await queryInterface.bulkInsert('Users', seedData);

// OR in a migration:
await queryInterface.dropTable('Sessions');
await queryInterface.createTable('Sessions', newSchema);
```

The `06-persona-alignment.md` document describes the dashboard as needing to be "role-specific" with completely different widget sets per role — this is a schema change. The scheduling section lists 15+ new calendar features. Neither document says a single word about how existing data survives these changes.

The `02-architecture-design.md` Finding 6 (Mock Data Contamination) actually demonstrates awareness that silent data substitution is a risk — but applies it only to frontend mock data, not to the far more dangerous backend migration pattern.

**Fix — This must be added to the architecture document before any implementation begins:**

```markdown
## DATABASE MIGRATION SAFETY POLICY (MANDATORY — NON-NEGOTIABLE)

### Absolute Prohibitions
- `sequelize.sync({ force: true })` — NEVER in any environment connected to real data
- `sequelize.sync({ alter: true })` — NEVER in production; only in isolated dev with seed data
- `queryInterface.bulkDelete('TableName', null, {})` — NEVER without explicit WHERE clause
- `queryInterface.dropTable()` — NEVER without confirmed backup and explicit down() recovery
- Any seeder that deletes before inserting — use upsert/bulkCreate with updateOnDuplicate

### Required Pattern for All Schema Changes
```javascript
// REQUIRED: Every migration must use this pattern
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 1. ADD columns (never remove in same migration as data migration)
      await queryInterface.addColumn('Users', 'newField', {
        type: Sequelize.STRING,
        allowNull: true, // ALWAYS nullable on add — never break existing rows
      }, { transaction });
      
      // 2. Backfill data BEFORE making NOT NULL
      await queryInterface.sequelize.query(
        `UPDATE "Users" SET "newField" = 'default_value' WHERE "newField" IS NULL`,
        { transaction }
      );
      
      // 3. Only then add constraints
      await queryInterface.changeColumn('Users', 'newField', {
        type: Sequelize.STRING,
        allowNull: false,
      }, { transaction });
      
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
  
  down: async (queryInterface, Sequelize) => {
    // EVERY migration MUST have a working down() — no exceptions
    await queryInterface.removeColumn('Users', 'newField');
  }
};
```

### Pre-Migration Checklist (Required Before Every Deploy)
- [ ] Backup verified and restorable in last 1 hour
- [ ] Migration tested against production data clone
- [ ] Row count before/after verified
- [ ] down() function tested independently
- [ ] No force/alter sync in any file touched by this deploy
```

---

### F-02 — 🔴 CRITICAL: JWT Secret Rotation Not Addressed — All Sessions Could Be Invalidated

**File & Location:** `03-security-planning.md` — Finding 3 (RBAC Enforcement Gaps), Finding 2 (Conversation Data at Rest)

**Data at Risk:** All active user sessions — trainers, clients, admins. Users locked out of accounts.

**Blast Radius:** ALL USERS — complete session invalidation

**What's Wrong:**

The security document recommends in Finding 3:

> "Include `current_client_id` in JWT token after login (scoped to selected client in trainer view)"

And in Finding 2:

> "Store encryption keys in AWS Secrets Manager/HashiCorp Vault, not in code. Rotate keys annually."

These two recommendations, taken together without explicit JWT versioning strategy, create a catastrophic session invalidation scenario:

1. The RBAC refactor adds `current_client_id` to the JWT payload — **this changes the JWT structure**
2. The key rotation recommendation, if applied to the JWT signing secret, **immediately invalidates every existing token**
3. Users mid-session (trainers in the middle of a client session, clients mid-workout) are logged out with no warning
4. If the JWT secret is stored in Vault and rotated, and the application only holds one secret at a time, **there is no grace period**

Additionally, the document recommends splitting admin roles into `super_admin` and `support_admin` — this is a role schema change that could corrupt existing JWT role claims if not handled with a migration path.

The document says nothing about:
- JWT versioning (`jti` claims, version fields)
- Grace period for old tokens during secret rotation
- Token refresh strategy during schema migration
- What happens to tokens issued before the RBAC change

**Fix:**

```markdown
## JWT SAFETY POLICY (Add to 03-security-planning.md)

### Secret Rotation — NEVER Immediate
JWT secret rotation MUST use a dual-secret pattern:
```javascript
// config/jwt.config.js
module.exports = {
  secrets: [
    process.env.JWT_SECRET_CURRENT,  // signs new tokens
    process.env.JWT_SECRET_PREVIOUS, // still validates old tokens (30-day overlap)
  ],
  verify: (token) => {
    // Try current secret first, fall back to previous
    for (const secret of module.exports.secrets) {
      try { return jwt.verify(token, secret); } catch {}
    }
    throw new Error('Invalid token');
  }
};
```

### JWT Payload Changes — Versioned Migration
When adding fields (e.g., current_client_id):
```javascript
// Add version field to JWT
const token = jwt.sign({
  userId: user.id,
  role: user.role,
  tokenVersion: user.tokenVersion, // increment in DB when forcing re-login
  // current_client_id added ONLY after user explicitly selects client
}, JWT_SECRET_CURRENT);

// Middleware: if tokenVersion < user.tokenVersion, force re-login gracefully
// NOT a 401 — redirect to login with message "Please log in again to access new features"
```

### Role Migration — Additive Only
- Never remove roles from existing tokens
- Add new roles (support_admin) as additive — existing admin tokens remain valid
- Deprecate old roles with 90-day sunset, not immediate removal
```

---

### F-03 — 🔴 CRITICAL: Password Hash Overwrite Risk During Refactor

**File & Location:** `02-architecture-design.md` — Finding 5 (Unified AI Terminal State Fragmentation); `03-security-planning.md` — Finding 3 (RBAC Enforcement Gaps)

**Data at Risk:** User passwords — if hashes are overwritten with plaintext during a profile update refactor, users cannot log in and passwords are exposed

**Blast Radius:** ALL USERS whose profiles are touched during the refactor deploy

**What's Wrong:**

The architecture document describes a major refactor of the user profile system (Section 5 references client profile integration, trainer overview, dashboard widgets). The security document recommends adding `current_client_id` to user records and splitting admin roles.

Neither document contains any warning about the most common password-destruction pattern in Node.js/Sequelize refactors:

```javascript
// THIS PATTERN DESTROYS PASSWORDS — extremely common in refactors
// Developer adds new fields to User model, then does a bulk update:

await User.update({
  role: 'support_admin',
  currentClientId: null,
  dashboardConfig: defaultConfig,
  // Developer copies from req.body without filtering:
  ...req.body  // ← IF req.body contains 'password', it overwrites the hash with plaintext
}, {
  where: { role: 'admin' }
});

// OR in a migration seeder:
await queryInterface.bulkUpdate('Users', {
  tokenVersion: 0,
  dashboardConfig: '{}',
  password: undefined  // ← Sequelize may serialize undefined as NULL, wiping the hash
}, { role: 'admin' });
```

The `06-persona-alignment.md` document describes role-specific dashboard configurations that need to be stored per-user — this is exactly the kind of bulk update that triggers this pattern.

**Fix:**

```markdown
## PASSWORD SAFETY POLICY (Add to 03-security-planning.md)

### Absolute Rules
1. NEVER use `User.update()` with spread from req.body without explicit field allowlist
2. NEVER include 'password' field in any migration bulkUpdate
3. NEVER use `User.save()` after modifying non-password fields on a User instance 
   that was fetched without `attributes: { exclude: ['password'] }`
   (Sequelize will re-save the hash — but if the instance is stale, it may save undefined)

### Required Pattern for User Updates
```javascript
// SAFE: Explicit allowlist — never spread req.body
const SAFE_USER_UPDATE_FIELDS = [
  'firstName', 'lastName', 'email', 'phone',
  'dashboardConfig', 'currentClientId', 'role',
  // 'password' is NEVER in this list — password changes go through dedicated endpoint
];

await User.update(
  _.pick(updateData, SAFE_USER_UPDATE_FIELDS), // lodash pick — explicit allowlist
  { where: { id: userId } }
);

// SAFE: Password change endpoint — dedicated, never mixed with profile updates
await User.update(
  { password: await bcrypt.hash(newPassword, 12) },
  { where: { id: userId } }
  // This endpoint does NOTHING else — no other fields
);
```

### Migration Safety for User Table
```javascript
// In any migration touching Users table:
// 1. Explicitly list columns being changed
// 2. Never use SELECT * — always name columns
// 3. Verify password column is unchanged after migration:
const sample = await queryInterface.sequelize.query(
  'SELECT id, LENGTH(password) as pwd_len FROM "Users" LIMIT 5',
  { type: QueryTypes.SELECT }
);
// bcrypt hashes are always 60 chars — if pwd_len != 60, ROLLBACK IMMEDIATELY
if (sample.some(u => u.pwd_len !== 60)) {
  throw new Error('CRITICAL: Password hashes corrupted — rolling back');
}
```

---

### F-04 — 🔴 CRITICAL: Multi-Table Operations With No Transaction Policy

**File & Location:** `02-architecture-design.md` — Finding 1 (Hook Composition), Finding 2 (Race Condition); `03-security-planning.md` — Finding 3 (RBAC); `06-persona-alignment.md` — Section G (Scheduling)

**Data at Risk:** Orders, Sessions, WorkoutPlans, UserAchievements, Conversations — any record created as part of a multi-

---

## [FAIL] Security II (Nemotron)
**Model:** nvidia/nemotron-3-super-120b-a12b:free | **Duration:** 120.2s

Error: OpenRouter error: Internal Server Error

---

## [PASS] Code Architecture (Qwen)
**Model:** nvidia/nemotron-3-super-120b-a12b-20230311:free | **Duration:** 115.1s

# SwanStudios Architecture Review: Documentation Analysis

**Important Note:** The provided files are documentation/validation reports (UX research, architecture design, security planning, etc.), not actual source code files. The architecture design file (02-architecture-design.md) explicitly states: *"The submitted document is a *planning/audit brief*, not an implementation specification. It contains no proposed file structures, no hook composition diagrams, no component trees, and no data flow definitions."*

Since no actual source code was provided for review, this analysis is based on the architectural concerns and gaps identified **within the documentation itself**, particularly in `02-architecture-design.md` which contains preemptive architectural findings for what would likely be implemented naively.

---

## 1. Module Dependency Graph

### Finding: Circular Dependency Risk in Coach Assistant Hooks
**Severity:** CRITICAL  
**Location:** Section 5.B — Coach Assistant; Section 8 item 8 (unified AI terminal)  
**Issue:**  
The documentation identifies a likely naive implementation where `useCoachAssistant` composes hooks creating a circular dependency:  
`useCoachAssistant` → `useAIChat` (conversation state + fetch) → `useConversationSidebar` (sidebar state)  
...but `useAIChat` needs `selectedConversationId` from `useConversationSidebar`, while `useConversationSidebar` needs to call `loadConversation` from `useAIChat`.  

**Refactoring Needed:**  
Implement strict three-layer separation:  
1. **Data layer** (`hooks/ai/useAIConversations.ts`): Pure data fetching (no UI state)  
2. **UI state layer** (`hooks/ai/useAITerminalUI.ts`): UI state only (no fetching)  
3. **Composition layer** (`hooks/ai/useAITerminal.ts`): Wires layers 1-2, owns side effects  

### Finding: No Explicit Architecture Proposed
**Severity:** CRITICAL  
**Location:** Gap Analysis table  
**Issue:**  
The brief contains no component tree, hook composition diagram, state management strategy, data fetching layer, or file/folder structure. Without these, AI implementation will invent inconsistent structures, making review impossible and guaranteeing architectural flaws.  

**Refactoring Needed:**  
Before implementation begins, define:  
- Component tree for each module  
- Hook composition diagrams  
- Named state management strategy (e.g., Zustand vs Context vs Redux)  
- Data fetching layer (React Query/SWR/raw fetch)  
- Explicit file/folder structure  
- Shared component library boundaries  
- API contract format (OpenAPI/GraphQL schema)  
- Error boundary placement strategy  
- TypeScript strict-mode policy  

## 2. Component Decomposition

### Finding: God Components Likely >300 Lines
**Severity:** HIGH  
**Location:** Finding 4 — Exercise Rolodex Re-render Budget  
**Issue:**  
The documentation predicts specific files will exceed 300 lines if not explicitly split:  
- `WorkoutPlannerPage.tsx` (500-800 lines): Owns builder + rolodex + saved plans + teach mode  
- `CoachAssistant.tsx` (400-600 lines): Owns chat + sidebar + voice + action buttons  
- `EquipmentProfilesPage.tsx` (400-500 lines): Owns scan + CRUD + location management + image upload  
- `UniversalMasterSchedule.tsx` (500-700 lines): 24-hour calendar + multi-role views + booking  
- `ContentStudio.tsx` (600-900 lines): 10+ tabs with significant logic  
- `ClientDashboard.tsx` (400-600 lines): Pain charts + assessments + progress + messaging  

**Refactoring Needed:**  
Enforce 300-line hard limit with predefined split boundaries:  
- **Exercise Rolodex**: Split into container (`ExerciseRolodex.tsx`), row component (`ExerciseRolodexRow.tsx`), search hook (`useExerciseSearch.ts`), and state hook (`useExerciseRolodex.ts`)  
- **Workout Planner**: Separate builder panel, exercise rolodex, saved plans, and teach mode into distinct components  
- **AI Terminals**: Create single reusable `AITerminal` component configured per surface (see Finding 5 below)  
- **Dashboard**: Extract widgets into reusable, lazy-loaded components with clear interfaces  

### Finding: No Shared Component Library Boundary Defined
**Severity:** HIGH  
**Location:** Gap Analysis table  
**Issue:**  
Without explicit boundaries, UI primitives will be duplicated across modules, leading to inconsistent implementations and maintenance overhead.  

**Refactoring Needed:**  
Define and enforce:  
- Shared component library (`/components/shared/`) for primitives (buttons, inputs, modals, etc.)  
- Module-specific components (`/components/[module]/`)  
- Clear import rules (e.g., no module importing from another module's internal components)  
- Storybook or similar for visual regression testing of shared components  

## 3. State Management Patterns

### Finding: No State Management Strategy Named
**Severity:** CRITICAL  
**Location:** Gap Analysis table  
**Issue:**  
The brief doesn't specify whether to use Zustand, Context, Redux, or another solution. This guarantees inconsistent state management across AI implementation passes, leading to fragmented state and difficult debugging.  

**Refactoring Needed:**  
Explicitly define and document:  
- Global state solution (e.g., Zustand for app-wide state like auth/user)  
- Server state solution (e.g., React Query for API data)  
- UI state guidelines (when to use Context vs local state)  
- Migration path for existing state if applicable  
- Performance considerations (e.g., avoiding unnecessary re-renders)  

### Finding: Unified AI Terminal State Fragmentation
**Severity:** HIGH  
**Location:** Finding 5 — Unified AI Terminal State Fragmentation  
**Issue:**  
The risk is that "normalization" will be implemented as copy-paste of the Coach Assistant component into each location with slight variations, creating N diverging implementations that must be maintained separately.  

**Refactoring Needed:**  
Define and enforce a single AI terminal contract:  
```typescript
interface AITerminalConfig {
  terminalId: string;           // namespaces all state for this instance
  systemPrompt: string;         // role/context for this terminal
  suggestedPrompts?: string[];  // quick-action chips
  voiceEnabled?: boolean;       // microphone + TTS
  sidebarEnabled?: boolean;     // conversation history sidebar
  onHandoff?: (intent: AIIntent) => void; // structured intents for parent to handle
}
// Usage: <AITerminal config={coachAssistantConfig} />
```  
This prevents fragmented implementations and ensures consistent behavior across all AI-driven surfaces.

## 4. API Contract Consistency

### Finding: No API Contract Format Specified
**Severity:** HIGH  
**Location:** Gap Analysis table  
**Issue:**  
Without explicit API contracts (OpenAPI/GraphQL schema), frontend assumptions about response shapes will diverge from backend implementations, causing runtime errors and fragile integrations.  

**Refactoring Needed:**  
Establish:  
- API contract format (OpenAPI 3.0/3.1 recommended for REST)  
- Contract-first development approach (define contracts before implementation)  
- Automated contract testing (e.g., Pact, Dredd)  
- Type generation from contracts (e.g., `openapi-typescript` for frontend types)  
- Versioning strategy for evolving contracts  

### Finding: Mock Data Contamination Risk
**Severity:** HIGH  
**Location:** Finding 6 — Mock Data Contamination Risk  
**Issue:**  
Mock data fallbacks are silent — they produce no console warning, no visual indicator, and no test failure. Playwright tests cannot verify "real data vs mock data" without explicit detection mechanism.  

**Refactoring Needed:**  
Implement mock data detection pattern:  
```typescript
// utils/data/mockDataGuard.ts
const IS_PRODUCTION = import.meta.env.PROD;
const MOCK_DATA_ALLOWED = import.meta.env.VITE_ALLOW_MOCK_DATA === 'true';

export function guardMockData<T>(data: T, source: string): T {
  if (IS_PRODUCTION && !MOCK_DATA_ALLOWED && isMockData(data)) {
    console.error(`Mock data detected in production from ${source}`);
    // Optionally: throw error or show UI warning in development
  }
  return data;
}

// Helper to detect common mock data patterns
function isMockData(data: unknown): boolean {
  // Implementation-specific (e.g., check for placeholder IDs, fake timestamps)
  return false;
}
```

## 5. Type Safety Gaps

### Finding: No TypeScript Strict-Mode Policy Stated
**Severity:** MEDIUM  
**Location:** Gap Analysis table  
**Issue:**  
Without explicit TypeScript strictness rules, `any` types will accumulate across AI-generated files, eroding type safety and increasing runtime error risk.  

**Refactoring Needed:**  
Define and enforce via `tsconfig.json`:  
```json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true,
  "strictFunctionTypes": true,
  "strictBindCallApply": true,
  "strictPropertyInitialization": true,
  "noImplicitThis": true,
  "useUnknownInCatchVariables": true,
  "alwaysStrict": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "exactOptionalPropertyTypes": true,
  "noImplicitReturns": true,
  "noFallthroughCasesInSwitch": true,
  "noUncheckedIndexedAccess": true,
  "noImplicitOverride": true,
  "allowUnreachableCode": false,
  "allowUnusedLabels": false
}
```  
Additionally:  
- Ban `any` via ESLint rule (`@typescript-eslint/no-explicit-any`)  
- Require explicit return types for exported functions  
- Use `unknown` instead of `any` when type is truly unknown  
- Prefer type inference over explicit types where possible  

## 6. Code Reuse Opportunities

### Finding: No Shared Component Library Boundary Defined
**Severity:** HIGH  
**Location:** Gap Analysis table (also impacts Component Decomposition)  
**Issue:**  
As noted above, lack of shared component boundaries guarantees duplication of UI primitives.  

**Refactoring Needed:**  
Create structured shared library:  
```
/components/shared/
  /ui/          // Presentational primitives (Button, Input, Modal, etc.)
  /layout/      // Layout components (Container, Stack, Grid, etc.)
  /forms/       // Form-specific components (Field, Form, ValidationMessage)
  /navigation/  // Navigation components (Link, Menu, Breadcrumb)
  /feedback/    // Feedback components (Toast, Alert, LoadingSpinner)
  /icons/       // Icon components
  /utils/       // Shared UI utilities (useClickOutside, usePortal, etc.)
```  
Enforce via:  
- Module-level barrel exports (`/components/shared/index.ts`)  
- ESLint import rules (`no-restricted-paths`)  
- Code ownership documentation in CONTRIBUTING.md  

### Finding: Exercise Rolodex Should Be Split
**Severity:** HIGH  
**Location:** Finding 4 — Exercise Rolodex Re-render Budget  
**Issue:**  
As noted in Component Decomposition, the Rolodex combines virtualization, search/filter, category tabs, row rendering, and drag-to-add logic in one component, causing performance issues and exceeding line limits.  

**Refactoring Needed:**  
Split into focused components:  
- `ExerciseRolodex.tsx`: Container handling layout and virtualization (uses `@tanstack/react-virtual`)  
- `ExerciseRolodexRow.tsx`: Memoized row component (`React.memo()`)  
- `useExerciseSearch.ts`: Hook managing search/filter state with debouncing  
- `useExerciseRolodex.ts`: Hook managing selected exercises and reordering  
- `ExerciseCategoryTabs.tsx`: Separate component for category filtering  

## 7. File Organization

### Finding: No File/Folder Structure Proposed
**Severity:** HIGH  
**Location:** Gap Analysis table  
**Issue:**  
Without explicit structure, AI implementation will create inconsistent directory layouts across passes, making navigation difficult and increasing cognitive load.  

**Refactoring Needed:**  
Define and enforce explicit structure:  
```
/src/
  /components/
    /shared/        // Reusable UI primitives (see Code Reuse above)
    /[module]/      // Module-specific components
      /[Component].tsx
      /[Component].styles.ts
      /[Component].test.tsx
  /hooks/
    /[domain]/      // Custom hooks grouped by concern (ai, workout, equipment, etc.)
  /utils/
    /[domain]/      // Domain-specific utilities
    /types/         // Shared TypeScript types/interfaces
  /api/
    /endpoints/     // API service clients
    /types/         // API request/response types
  /store/           // State management (if using Redux/Zustand)
    /slices/        // Redux slices or Zustand stores
  /routes/          // Route definitions and lazy loading
  /assets/          // Static assets (images, icons, fonts)
  /styles/          // Global styles, themes, CSS variables
  /constants/       // Application constants
  /config/          // Configuration files
  /tests/           // Test utilities and mocks
  /docs/            // Internal documentation
```  
Enforce via:  
- Module-level README files explaining purpose and boundaries  
- Architecture decision records (ADRs) for structural choices  
- Automated checks in CI (e.g., `madge` for dependency circularity, custom scripts for file placement)  

---

## Summary of Critical Findings Requiring Immediate Attention

| Finding | Severity | Primary Risk | Recommended Action |
|---------|----------|--------------|---------------------|
| Circular Dependency in Coach Assistant Hooks | CRITICAL | Infinite renders, stale data, unfl

---

## [PASS] Bug Hunter II (Step)
**Model:** nvidia/nemotron-3-nano-30b-a3b:free | **Duration:** 15.6s

# SECONDARY BUG HUNT – DIFFERENT CATEGORIES THAN A TYPICAL ARCHITECTURE REVIEW  
*Focus: edge‑case bugs, async race conditions, UI‑state desync, browser compatibility, memory pressure, timezone bugs, mobile‑specific bugs*  

---  

## 1️⃣ Edge‑Case Bug – Empty Saved‑Plans Array Crashes “Load Plan” Flow  

| **Severity** | **File & Line** | **Reproduction Steps** | **Fix** |
|--------------|----------------|------------------------|---------|
| **HIGH** | `AI-Village-Documentation/validation-prompts/archive/2026-04-06T22-22-09/01-ux-research.md` **line 102** (the bullet “*Saved plans being unreliable, non‑clickable, and not clearly tied to the client profile*”) | 1. Open the **Client Dashboard** on any device. <br>2. Navigate to a client that has **no saved plans**. <br>3. Click the **“Load Plan”** button (or any UI that triggers the “load saved plan” flow). | - Guard the click handler with `if (savedPlans.length === 0) { showInfoToast('You have no saved plans yet.'); return; }`. <br>- Render a **disabled** “Load Plan” button or an informative empty‑state card. <br>- Ensure the state reducer does not attempt to read `savedPlans[0]` when the array is empty. |
| **Why it matters** | The brief explicitly calls out “saved plans being unreliable, non‑clickable” – a classic *empty‑array* edge case that will surface as a **runtime error** (e.g., `Cannot read property 'id' of undefined`) on the first trainer who has no plans. |

---  

## 2️⃣ Async Race Condition – Rapid‑Click Conversation Switching in Coach Assistant  

| **Severity** | **File & Line** | **Reproduction Steps** | **Fix** |
|--------------|----------------|------------------------|---------|
| **CRITICAL** | `AI-Village-Documentation/validation-prompts/archive/2026-04-06T22-22-09/02-architecture-design.md` **lines 57‑68** (the pre‑emptive code snippet that shows `loadConversation(id)` called inside a `useCallback` without abort handling) | 1. Open the **Coach Assistant** sidebar. <br>2. Quickly click **Conversation A**, then **Conversation B** before the first fetch resolves. <br>3. Observe that the message list briefly shows messages from **A** under the header of **B**. | ```tsx
// In useAIConversations.ts – stable loadConversation with abort controller
const loadConversation = useCallback(async (id: string, signal: AbortSignal) => {
  setLoadingConversationId(id);
  try {
    const msgs = await fetchConversation(id, { signal });
    setConversations(prev => ({
      ...prev,
      [id]: { ...prev[id], messages: msgs, loaded: true }
    }));
  } catch (e) {
    if (e.name !== 'AbortError') setError(e);
  }
}, []);

// In the composition hookuseEffect(() => {
  if (!selectedId) return;
  if (conversations[selectedId]?.loaded) return;
  const cleanup = loadConversation(selectedId, AbortSignal.timeout(10_000));
  return cleanup; // abort on next selection or unmount
}, [selectedId]);
``` |
| **Why it matters** | The brief’s “sidebar click → load conversation → render messages” flow is **guaranteed** to be invoked from multiple UI places (e.g., trainer dashboard, workout builder). Without an abort controller, **stale state** will leak into the UI, causing the exact race condition described. |

---  

## 3️⃣ UI‑State Desync – Success Toast Fires on Failed “Save Workout” Operation  | **Severity** | **File & Line** | **Reproduction Steps** | **Fix** |
|--------------|----------------|------------------------|---------|
| **MEDIUM** | `AI-Village-Documentation/validation-prompts/archive/2026-04-06T22-22-09/01-ux-research.md` **line 138** (bullet “*success toasts on failed operations*”) | 1. Open the **Workout Builder**. <br>2. Attempt to **save** a workout that contains **invalid data** (e.g., missing required exercise). <br>3. The API returns **400 Bad Request** with an error payload. <br>4. Observe that a **green “Saved!” toast** appears instead of an error toast. | - Decouple toast logic from the **HTTP response status** alone. <br>- Only fire the success toast after **`response.ok && response.status === 200`** *and* after the **optimistic update** completes without throwing. <br>- Add an **error toast** branch that triggers on any `!response.ok` or caught error. |
| **Why it matters** | Mis‑signaled success creates **user confusion** and erodes trust in the AI‑assisted workflow, especially when the trainer is relying on the toast to confirm that a plan was persisted. |

---  

## 4️⃣ Browser Compatibility – Horizontal Tab Bar Not Scrollable on Mobile Safari  

| **Severity** | **File & Line** | **Reproduction Steps** | **Fix** |
|--------------|----------------|------------------------|---------|
| **HIGH** | `AI-Village-Documentation/validation-prompts/archive/2026-04-06T22-22-09/01-ux-research.md` **line 152** (bullet “*Horizontal tab bars are not mobile‑scrollable, so many tabs are inaccessible on phone*”) | 1. Load the **Content Studio** tab on an iPhone (Safari). <br>2. Observe that only the first 3‑4 tabs are visible; the rest are **cut off** and cannot be reached via swipe. | - Replace the horizontal tab bar with a **mobile‑first navigation pattern** (e.g., bottom navigation bar or vertically scrollable tab list). <br>- If horizontal tabs must remain, add `overflow-x: auto;` and `scroll-snap-type: x mandatory;` plus **ARIA `role="tablist"`** and **`aria-label="Tab navigation"`** for accessibility. |
| **Why it matters** | The brief explicitly flags this as a **mobile‑first critique**; failing to address it blocks access to entire sections for a large portion of the user base. |

---  

## 5️⃣ Memory Pressure – Rendering 840+ Exercises Without Virtualization  

| **Severity** | **File & Line** | **Reproduction Steps** | **Fix** |
|--------------|----------------|------------------------|---------|
| **CRITICAL** | `AI-Village-Documentation/validation-prompts/archive/2026-04-06T22-22-09/02-architecture-design.md` **lines 112‑124** (pre‑emptive “ExerciseRolodex” split & virtualization recommendation) | 1. Open the **Workout Planner** on an **iPhone SE (2020)** or a low‑end Android device. <br>2

---

## [PASS] Full-Stack Integration Review (Trinity)
**Model:** arcee-ai/trinity-large-preview:free | **Duration:** 98.7s

I'll perform a comprehensive cross-cutting integration review of SwanStudios, analyzing the frontend and backend together to find issues that single-domain reviewers miss.

## CROSS-CUTTING INTEGRATION REVIEW

### 1. API Contract Alignment

**CRITICAL - Missing API Response Types**
The frontend references API responses but there are no shared TypeScript types between frontend and backend. This creates a high risk of contract drift.

**Issues Found:**
- Frontend fetch calls assume response shapes but backend may return different structures
- No OpenAPI/Swagger specification to enforce contract
- Error handling assumes specific error codes that may not match backend implementation

**Recommendation:** Implement shared API type definitions using OpenAPI or generate types from backend to frontend.

### 2. Authentication Flow Integrity

**HIGH - Token Refresh Logic Missing**
The brief mentions authentication but doesn't specify token refresh strategy.

**Issues Found:**
- No mention of JWT refresh token mechanism
- Logout flow not clearly defined
- Protected route guards not specified

**Recommendation:** Implement a centralized auth context with automatic token refresh and proper logout cleanup.

### 3. Data Flow Completeness

**MEDIUM - Inconsistent Data Loading Patterns**
Different modules use different data loading approaches.

**Issues Found:**
- Coach Assistant uses real-time updates but other modules don't
- Equipment scan workflow mentions batch-first but no data flow defined
- Saved plans integration unclear between client profile and workout builder

**Recommendation:** Standardize on a data fetching strategy (React Query/SWR) across all modules.

### 4. Error Propagation

**HIGH - Silent Error Handling**
Multiple modules mention error states but no unified error handling strategy.

**Issues Found:**
- Equipment scan returns 500 errors but no retry mechanism
- Mock data fallbacks happen silently without user notification
- Styled-components crash in Content Studio has no error boundary

**Recommendation:** Implement global error boundaries and user-friendly error states with retry options.

### 5. Environment Variable Alignment

**LOW - VITE_* Variable Mismatch**
Frontend references VITE_* variables but backend env vars not specified.

**Issues Found:**
- Frontend may reference backend URLs that don't exist in production
- AI service endpoints not clearly defined

**Recommendation:** Create a comprehensive environment variable mapping document.

### 6. Model/Migration Consistency

**MEDIUM - Database Schema Gaps**
Sequelize models mentioned but migration details unclear.

**Issues Found:**
- Conversation storage in JSONB needs encryption but migration not specified
- Equipment profiles need image upload but file storage strategy unclear
- RBAC requires database-level enforcement but no RLS implementation

**Recommendation:** Define complete database migration scripts with encryption and RLS policies.

### 7. Import Chain Validation

**LOW - Circular Dependency Risk**
Component architecture not defined, creating import risks.

**Issues Found:**
- AI terminal components may create circular dependencies
- Shared types between frontend and backend not established
- Component splitting strategy not defined

**Recommendation:** Establish clear import boundaries and component decomposition rules.

## INTEGRATION RATING SUMMARY

| Finding Category | Critical | High | Medium | Low |
|------------------|----------|------|--------|-----|
| API Contract | 1 | 0 | 0 | 0 |
| Authentication | 0 | 1 | 0 | 0 |
| Data Flow | 0 | 0 | 1 | 0 |
| Error Handling | 0 | 1 | 0 | 0 |
| Environment Vars | 0 | 0 | 0 | 1 |
| Database Schema | 0 | 0 | 1 | 0 |
| Import Chains | 0 | 0 | 0 | 1 |

**Overall Integration Risk: HIGH**

The plan lacks critical architectural specifications that will cause integration failures during implementation. The most urgent issues are API contract alignment and authentication flow integrity.

---

## [FAIL] Security Debate (Phase 2A)
**Model:** nvidia/nemotron-3-nano-30b-a3b:free ↔ nvidia/nemotron-3-super-120b-a12b:free | **Duration:** 0.0s

Error: OpenRouter error: Internal Server Error

---

## [PASS] Code Quality Debate (Phase 2B)
**Model:** anthropic/claude-sonnet-4.6 ↔ nvidia/nemotron-3-super-120b-a12b:free | **Duration:** 145.1s

CONSENSUS REACHED

## Merged Findings: Critical Architecture Gaps Requiring Immediate Remediation

### F-01: Validator Pipeline Failure — Silent Data Loss in Consensus System
**Agreed Issue:** Two validators (`04-performance-planning.md`, `05-competitive-intel.md`) produced zero output due to timeout (240s) and invalid model ID (0.2s failure), yet were archived as valid inputs to the consensus system, creating a 33% data deficit without provenance tracking.  
**Agreed Fix:** Implement blocking validation pipeline with:  
- Timeout reduced to 120s (fail fast)  
- Model-specific error handling (no retries for `MODEL_ERROR`)  
- Pipeline assertion blocking consensus on any validator failure  
- Retry logic with exponential backoff for transient errors only  
*Files to modify:* `validation-pipeline/runner.ts` (new implementation)  

### F-02: Model ID Hardcoded Without Validation — Configuration Debt  
**Agreed Issue:** Hardcoded model ID `gemini-3-flash-preview-20251217` (missing provider prefix) causes silent 404; inconsistency with `04-performance-planning.md` using `google/gemini-3-flash-preview-20251217` indicates fragmented configuration.  
**Agreed Fix:** Centralized model registry with startup validation:  
```typescript
// config/model-registry.ts
export const MODEL_REGISTRY = {
  GEMINI_FLASH: 'google/gemini-2.5-flash',
  GEMINI_FLASH_PREVIEW: 'google/gemini-3-flash-preview-20251217', // Marked DEPRECATED
  CLAUDE_SONNET: 'anthropic/claude-4.6-sonnet-20260217',
  DEEPSEEK_V3: 'deepseek/deepseek-v3.2-20251201',
  NEMOTRON_NANO: 'nvidia/nemotron-3-nano-30b-a3b:free',
} as const;
```  
*Files to modify:* `05-competitive-intel.md` (remove hardcoded ID), add `config/model-registry.ts` and validation hook in pipeline initializer  

### F-03: No Migration Safety Policy — AI-Induced Data Annihilation Risk  
**Agreed Issue:** Absence of explicit prohibition against `sequelize.sync({ force: true })` in all six planning documents enables AI executors to destroy production data (user accounts, workout plans, session history, etc.) when "fixing" database issues.  
**Agreed Fix:** Mandatory migration policy enforced at code level:  
```typescript
// database/migrator.ts
export const migrator = new Umzug({ /* config */ });
export async function runMigrationsOnStartup() {
  // ... migration logic
  // BLOCK UNSAFE SYNC
  sequelize.sync = async (options?: SyncOptions) => {
    if (options?.force || options?.alter) {
      throw new Error('POLICY VIOLATION: Use Umzug migrations only');
    }
    return originalSync(options);
  };
}
```  
*Files to modify:* All six validation documents (add migration policy section), create `database/MIGRATION_POLICY.md`, implement `database/migrator.ts`  

### F-04: PII Leakage to External LLMs — Unenforced Security Policy  
**Agreed Issue:** `03-security-planning.md` correctly identifies "ZERO PII TO LLMs" requirement but lacks enforcement mechanisms, relying on advisory guidelines that AI executors will ignore.  
**Agreed Fix:** Implement runtime PII scanning and blocking:  
```typescript
// llm-gateway/pII-filter.ts
export async function safeLLMPrompt(messages: Message[]): Promise<string> {
  const piiPatterns = [/\b\d{3}-\d{2}-\d{4}\b/, /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i];
  const sanitized = messages.map(m => ({
    ...m,
    content: m.content.replace(piiPatterns, '[REDACTED_PII]')
  }));
  
  if (hasPII(messages)) {
    auditLog.piiBlocked(messages);
    throw new Error('PII transmission blocked by policy');
  }
  
  return callLLM(sanitized);
}
```  
*Files to modify:* `03-security-planning.md` (add enforcement section), create `llm-gateway/pII-filter.ts`, integrate into all LLM call paths  

## Consensus Summary
All four critical findings represent systemic risks that would inevitably lead to production incidents:  
1. **Data integrity failure** via broken validation pipeline (F-01)  
2. **Configuration fragility** from unvalidated dependencies (F-02)  
3. **Catastrophic data loss** from unsafe ORM usage (F-03)  
4. **Regulatory violation** via uncontrolled PII exposure (F-04)  

The agreed fixes establish:  
- **Fail-fast validation** with explicit error states  
- **Centralized, validated configuration**  
- **Automated blocking of dangerous patterns**  
- **Runtime enforcement of security policies**  

Implementation must block further pipeline execution until these are resolved, as the current state risks cascading failures in downstream AI-generated code.

---

## [PASS] UX/UI Design Debate (Phase 2C)
**Model:** gemini-3.1-pro-preview ↔ minimax/minimax-m2.7 | **Duration:** 161.5s

# Design Implementation Reviewer Response — Round 1

## CONSENSUS REACHED (Partial)

I agree with the **overarching vision** and **design direction** outlined in the Crystalline Swan directive. The mobile-first philosophy, token enforcement strategy, and component consolidation goals are sound. However, I must flag **specific implementation concerns** that require refinement before they become architectural commitments.

---

## Disputed Points & Proposed Alternatives

### 1. Exercise Rolodex — "20% Visible Context" Is Arbitrary
**Agreed:** Bottom sheet pattern, virtualization via `@tanstack/react-virtual`, single-tap with flash feedback.

**Disputed:**
> "Leaving the top 20% of the screen visible for context."

**Why:** This is an unvalidated assumption. At certain viewport heights (e.g., older iPhone SE, landscape orientations), 20% could mean ~80px — insufficient context for a complex workout builder.

**Alternative:**
```tsx
// src/components/ExerciseDrawer/BottomSheetWrapper.tsx
const SNAP_POINTS = {
  MIN_HEIGHT: '40vh',    // Mobile: Shows list + FAB
  MAX_HEIGHT: '85vh',    // Prevents complete occlusion
  PEEK_THRESHOLD: '15%', // Collapses below this threshold
};

// Framer Motion spring config — agreed, but needs overshoot:
const SPRING_CONFIG = {
  stiffness: 280,   // Slightly softer than 300 for mobile inertia feel
  damping: 32,      // Slightly higher damping to prevent bounce
  mass: 0.8,        // Lightweight feel on touch
};
```

**Suggested Change:** Define snap points as percentages, not fixed viewport fractions. Validate with actual device lab testing.

---

### 2. Dual-Button Glow Rule — Accessibility Violation Risk
**Agreed:** Token enforcement, removing hardcoded colors.

**Disputed:**
```css
/* Primary CTA Hover */
box-shadow: 0 0 16px rgba(139, 92, 246, 0.6); /* Wing Purple glow */
```

**Why:** A `0.6` opacity glow against a dark background does **not** count toward WCAG contrast ratios. The actual text/shape contrast must stand alone at 4.5:1 minimum. The glow is decorative, not remedial.

**Additional Concern:** Animated gradients and pulsing glows trigger **vestibular motion sensitivity** issues under WCAG 2.3.3.

**Proposed Alternative:**
```css
/* src/styles/components/Button.tokens.css */

/* Primary CTA — Compliant State */
.btn-primary {
  background: #002060;
  border: 2px solid #4070C0; /* Visible border ensures contrast even without shadow */
  transition: box-shadow 200ms ease, transform 150ms ease;
}

/* Hover: Decorative glow, NON-FUNCTIONAL for contrast */
.btn-primary:hover {
  box-shadow: 0 0 20px rgba(139, 92, 246, 0.4);
  transform: translateY(-1px);
}

/* Focus: MUST meet WCAG 2.2.8 (Minimum Tone Difference) */
.btn-primary:focus-visible {
  outline: 3px solid #60C0F0; /* Ice Wing — 3px for AA compliance */
  outline-offset: 2px;
}

/* Reduce Motion Override */
@media (prefers-reduced-motion: reduce) {
  .btn-primary:hover {
    box-shadow: none;
    transform: none;
  }
}
```

**Stylelint Rule Clarification Needed:**
```json
// .stylelintrc.json — Recommended, not blocking
{
  "plugins": ["stylelint-no-hardcoded-colors"],
  "rules": {
    "plugin/no-hardcoded-colors": [
      true,
      { "severity": "warning", "allowVariables": true }
    ]
  }
}
```
**Recommendation:** Set severity to `warning` initially to avoid blocking CI during the transition. Full `error` enforcement after 90% token migration.

---

### 3. AI Terminal — Cormorant Garamond Italic Is Unacceptable
**Agreed:** Unified terminal, `dompurify` for HTML rendering, auto-close on navigation.

**Disputed:**
```css
/* AI Persona Name */
font-family: 'Cormorant Garamond', serif;
font-style: italic;
font-size: 20px;
```

**Why:**
1. **Serif on screens < 16px is illegible** for extended reading — this is a 20px heading, acceptable, but paired with Sora for body text creates jarring typeface mixing.
2. **Italic serif reads as "editorial" not "premium tech"** — this clashes with the enterprise/frozen-vault brand positioning.
3. **Typography mixing rules:** Pair a serif with a sans-serif, but not as a heading for a UI component — that's print/digital editorial design, not SaaS.

**Proposed Alternative:**
```css
/* AI Persona Name — Crystalline Swan Typography */
font-family: 'Sora', sans-serif;  /* Consistent with exercise names */
font-weight: 700;                  /* Bold for hierarchy */
font-size: 16px;                   /* Slightly smaller to reduce dominance */
color: #E0ECF4;                     /* Frost White */
letter-spacing: 0.02em;            /* Premium micro-tracking */
```

**Retain Cormorant Garamond For:**
- Marketing landing page hero text
- PDF invoice headers
- Premium client-facing reports (PDF exports only)

**AI Terminal — Animated Border Concerns:**
```css
/* Cosmic Nebula gradient — needs reduced-motion fallback */
@keyframes cosmicPulse {
  0%, 100% { 
    border-image: linear-gradient(135deg, #8B5CF6, #60C0F0) 1;
  }
  50% {
    border-image: linear-gradient(135deg, #60C0F0, #8B5CF6) 1;
  }
}

.ai-terminal.active {
  animation: cosmicPulse 3s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .ai-terminal.active {
    border: 2px solid #8B5CF6; /* Static fallback */
    animation: none;
  }
}
```

---

### 4. Horizontal Tabs — 768px Breakpoint May Be Too Wide
**Agreed:** Replace horizontal scroll with segmented control/dropdown on mobile.

**Disputed:**
```css
@media (max-width: 768px) {
  /* Hide horizontal flex row */
}
```

**Why:** 768px captures tablets in landscape mode, where horizontal tabs *might* fit if font sizes are reduced. This creates a poor experience on iPad Mini (834px width).

**Proposed Alternative:**
```css
/* TabBar responsive behavior */
.tab-bar {
  display: flex;
  overflow-x: auto;
  scrollbar-width: none; /* Firefox: hide scrollbar */
}

.tab-bar::-webkit-scrollbar {
  display: none; /* Chrome/Safari */
}

@media (max-width: 640px) { /* Narrow tablet + mobile */
  .tab-bar {
    overflow-x: visible;
    flex-direction: column; /* Stack on narrow mobile */
  }
  
  .tab-bar--tab-dropdown-trigger {
    display: flex; /* Show dropdown trigger */
  }
}
```

**Dropdown Accessibility — Missing ARIA:**
```tsx
// src/components/TabDropdown/index.tsx
<div
  role="button"
  aria-haspopup="listbox"
  aria-expanded={isOpen}
  aria-label="Select content category"
  onClick={() => setIsOpen(!isOpen)}
  onKeyDown={(e) => e.key === 'Enter' && setIsOpen(!isOpen)}
>
  {activeTab.label} <ChevronIcon aria-hidden="true" />
</div>

{isOpen && (
  <ul 
    role="listbox" 
    aria-label="Content categories"
    className="tab-dropdown-menu"
  >
    {tabs.map((tab) => (
      <li
        key={tab.id}
        role="option"
        aria-selected={tab.id === activeTab.id}
        tabIndex={0}
        onClick={() => selectTab(tab)}
        onKeyDown={(e) => e.key === 'Enter' && selectTab(tab)}
      >
        {tab.label}
      </li>
    ))}
  </ul>
)}
```

---

### 5. Bento Grid — `auto-fit` Creates Unbounded Widgets
**Agreed:** CSS Grid layout, widget card styling, drag-and-drop reordering.

**Disputed:**
```css
grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
```

**Why:** `auto-fit` with `1fr` means on a 2560px ultrawide monitor, a single widget spans the entire row. This violates the "premium frozen-vault" feel — widgets should never be comically wide.

**Proposed Alternative:**
```css
/* src/styles/Dashboard/WidgetGrid.css */

.widget-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr); /* 12-column base grid */
  gap: 24px;
  max-width: 1440px;  /* Bounded max-width */
  margin: 0 auto;
  padding: 0 24px;
}

/* Widget span classes for variable widths */
.widget--full     { grid-column: span 12; }  /* Hero widgets */
.widget--wide     { grid-column: span 8; }   /* Charts, analytics */
.widget--half     { grid-column: span 6; }   /* Standard pairs */
.widget--narrow   { grid-column: span 4; }   /* Quick stats */

/* Responsive collapse */
@media (max-width: 1024px) {
  .widget--wide,
  .widget--narrow { grid-column: span 6; }
}

@media (max-width: 768px) {
  .widget-grid {
    grid-template-columns: 1fr; /* Single column stack */
    gap: 16px;
  }
  .widget--full,
  .widget--wide,
  .widget--half,
  .widget--narrow { grid-column: span 1; }
}
```

**Fira Code for Data — Validated:**
Fira Code at 14px yields ~5.2px x-height for "08:00 AM" — this is acceptable for monospace tabular figures. **Agreed.**

---

## Points of Full Agreement

| Directive | Status |
|-----------|--------|
| `@tanstack/react-virtual` for 840+ item lists | ✅ AGREED |
| `z-index: 400` for drawer, `399` for backdrop | ✅ AGREED |
| `48px` minimum touch targets | ✅ AGREED |
| `backdrop-filter: blur(12px)` for Omni-Glass | ✅ AGREED |
| `dompurify` + `html-react-parser` for AI output | ✅ AGREED |
| Auto-close terminal on deep-link click | ✅ AGREED |
| `@dnd-kit/core` for widget drag-and-drop | ✅ AGREED (subject to library review) |
| PostgreSQL profile preferences for layout | ✅ AGREED |

---

## Component Tree Structure — Ready for Review

```
src/
├── components/
│   ├── AI/
│   │   └── OmniGlassTerminal/
│   │       ├── index.tsx                    # Main container
│   │       ├── TerminalBubble.tsx           # Chat message bubbles
│   │       ├── TerminalInput.tsx            # Input field + send
│   │       ├── CosmicBorder.tsx             # Animated gradient border
│   │       └── tokens.css                   # Component-scoped tokens
│   │
│   ├── WorkoutBuilder/
│   │   └── ExerciseDrawer/
│   │       ├── index.tsx                    # BottomSheet container
│   │       ├── ExerciseRow.tsx              # 48px touch target row
│   │       ├── VirtualizedList.tsx          # @tanstack/react-virtual impl
│   │       ├── DrawerHandle.tsx             # Drag indicator
│   │       └── tokens.css                   # Component-scoped tokens
│   │
│   ├── Navigation/
│   │   └── GlacialTabBar/
│   │       ├── index.tsx                    # Desktop tab row
│   │       ├── TabDropdown.tsx              # Mobile dropdown
│   │       ├── SegmentedControl.tsx         # 2-3 option pills
│   │       └── tokens.css
│   │
│   └── Dashboard/
│       └── BentoGrid/
│           ├── index.tsx                    # Grid container
│           ├── WidgetCard.tsx               # Card with hover state
│           ├── DragHandle.tsx               # @dnd-kit integration
│           └── tokens.css
│
├── styles/
│   ├── theme.ts                             # ThemeProvider with all tokens
│   ├── global.css                           # CSS reset + variables
│   └── tokens/
│       ├── colors.ts                        # All 11 Crystalline Swan colors
│       ├── typography.ts                    # Sora, Plus Jakarta Sans, Fira Code
│       └── spacing.ts                       # 4px base grid
│
└── hooks/
    ├── useReducedMotion.ts                  # Accessibility hook
    └── useBreakpoint.ts                     # Responsive utility
```

---

## Summary for Creative Director

I am aligned with **~75%** of the Crystalline Swan directive. The remaining **25%** involves:

1. **Arbitrary constraints** needing data validation (20% viewport, 768px breakpoint)
2. **Accessibility gaps** in glow animations and typography choices
3. **Layout brittleness** in the CSS Grid approach

**I request Round 2 to finalize:**
- Snap point percentages for the bottom sheet (validated via device lab)
- Cormorant Garamond usage limited to non-UI contexts
- Widget grid max-width constraint
- Reduced-motion fallbacks for all animated elements

Once these are addressed, I will produce **implementation-ready component blueprints** with exact props, state interfaces, and accessibility annotations.

---

## [PASS] Smart Escalation (MiniMax M2.7)
**Model:** minimax/minimax-m2.7 | **Duration:** 98.4s

# SwanStudios Validation Findings: Deep-Dive Analysis

I'll systematically evaluate each finding, providing objective severity assessment, concrete fixes, blast radius analysis, and prioritization.

---

## PART 1: ARCHITECTURE CRITICAL FINDINGS

### 🔴 FINDING A3: Styled-Components Runtime Crash (Section 6)
**From:** 02-architecture-design.md

#### 1. Severity Assessment: **CONFIRMED CRITICAL** ✅

This is **not over-classified**. The report states:
- Crash occurs in `RemotionTemplateGallery.tsx:482:51`
- Propagates to break navigation entirely
- "Back behavior after errors is wrong and dumps the user somewhere unrelated"

This is a **hard crash** causing complete navigation failure. Any severity rating below Critical would be inappropriate.

#### 2. Exact Fix

```typescript
// components/content-studio/ContentStudioErrorBoundary.tsx

import React, { Component, ReactNode } from 'react';
import { Button, Card, Title, Text } from '@swan-studio/ui';

interface Props {
  tabName: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ContentStudioTabErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Primary: Send to error tracking (Sentry, Datadog, etc.)
    import('@swan-studio/observability').then(({ captureError }) => {
      captureError(error, {
        componentStack: errorInfo.componentStack,
        tabName: this.props.tabName,
        timestamp: new Date().toISOString(),
        userId: window.__CURRENT_USER_ID__,
      });
    });
    
    this.setState({ errorInfo });
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <Card padding="large" role="alert" aria-live="assertive">
          <Title level={3}>Something went wrong in {this.props.tabName}</Title>
          <Text color="muted" marginTop="small">
            This section encountered an unexpected error. Your work is safe.
          </Text>
          
          {/* Show only in development */}
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre style={{ fontSize: '12px', overflow: 'auto', marginTop: '16px' }}>
              {this.state.error.stack}
            </pre>
          )}
          
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <Button onClick={this.handleReset} variant="primary">
              Try Again
            </Button>
            <Button onClick={() => window.location.reload()} variant="secondary">
              Reload Page
            </Button>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default ContentStudioTabErrorBoundary;
```

**Implementation - Wrap each tab panel:**

```typescript
// pages/ContentStudio.tsx

const ContentStudioTabs = [
  { id: 'templates', label: 'Templates', Component: RemotionTemplateGallery },
  { id: 'media', label: 'Media Library', Component: MediaLibraryPanel },
  // ... other tabs
];

export const ContentStudio: React.FC = () => {
  return (
    <div className="content-studio">
      <ContentStudioTabs.Nav />
      
      <ContentStudioTabs.Panels>
        {ContentStudioTabs.map(({ id, label, Component }) => (
          <ContentStudioTabErrorBoundary key={id} tabName={label}>
            <Component />
          </ContentStudioTabErrorBoundary>
        ))}
      </ContentStudioTabs.Panels>
    </div>
  );
};
```

**Root Error Boundary (App level):**

```typescript
// components/app/RootErrorBoundary.tsx

class RootErrorBoundary extends Component<{}, { error: Error | null }> {
  state = { error: null };

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // Catastrophic fallback
    import('@swan-studio/observability').then(({ captureError }) => {
      captureError(error, { ...info, isRootBoundary: true });
    });
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <FullPageError fallback={
          <>
            <h1>Something unexpected happened</h1>
            <p>Our team has been notified. Please refresh to continue.</p>
            <button onClick={() => window.location.reload()}>Refresh</button>
          </>
        }>
          {this.props.children}
        </FullPageError>
      );
    }
    return this.props.children;
  }
}
```

#### 3. Blast Radius
| Metric | Current | Impact |
|--------|---------|--------|
| Users Affected | 100% of Content Studio users | **All trainers/admins using Content Studio** |
| Frequency | Every time crash point is reached | Users cannot access templates tab |
| Work Loss | Yes - unsaved work potentially lost | Sessions disrupted |
| Navigation Impact | **Complete navigation failure** | Back button broken globally |

#### 4. Priority: **#1 (IMMEDIATE)**

This is blocking access to a core feature. Fix immediately.

---

### 🔴 FINDING A1: Coach Assistant Hook Composition (Circular Dependency Risk)
**From:** 02-architecture-design.md

#### 1. Severity Assessment: **CONFIRMED CRITICAL** ✅

Circular dependencies are architectural cancers. They:
- Compile fine initially
- Cause mysterious runtime failures during re-renders
- Are extremely difficult to debug
- Will compound as more AI terminals are added

This is **appropriately rated Critical**.

#### 2. Exact Fix

```typescript
// ============================================================================
// LAYER 1: Pure Data Fetching — No UI State
// ============================================================================

// hooks/ai/useAIConversations.ts
import { useState, useCallback, useRef } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  loaded: boolean;
  updatedAt: Date;
}

interface UseAIConversationsReturn {
  conversations: Record<string, Conversation>;
  loadingConversationId: string | null;
  error: Error | null;
  loadConversation: (id: string, signal?: AbortSignal) => Promise<void>;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  createConversation: () => Promise<Conversation>;
  deleteConversation: (id: string) => Promise<void>;
}

export function useAIConversations(): UseAIConversationsReturn {
  const [conversations, setConversations] = useState<Record<string, Conversation>>({});
  const [loadingConversationId, setLoadingConversationId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  // Stable reference for abort controller
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadConversation = useCallback(async (id: string, signal?: AbortSignal): Promise<void> => {
    // Cancel any in-flight request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    
    setLoadingConversationId(id);
    setError(null);

    try {
      const messages = await fetchConversation(id, { 
        signal: signal || abortControllerRef.current.signal 
      });
      
      setConversations(prev => ({
        ...prev,
        [id]: {
          ...prev[id],
          id,
          messages,
          loaded: true,
          updatedAt: new Date(),
        } as Conversation,
      }));
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError(err as Error);
        throw err;
      }
    } finally {
      setLoadingConversationId(prev => prev === id ? null : prev);
    }
  }, []);

  const sendMessage = useCallback(async (conversationId: string, content: string): Promise<void> => {
    const optimisticId = `temp-${Date.now()}`;
    
    // Optimistic update
    setConversations(prev => ({
      ...prev,
      [conversationId]: {
        ...prev[conversationId],
        messages: [
          ...(prev[conversationId]?.messages || []),
          { id: optimisticId, role: 'user' as const, content, timestamp: new Date() },
        ],
        updatedAt: new Date(),
      },
    }));

    try {
      const response = await sendMessageToAI(conversationId, content);
      
      setConversations(prev => ({
        ...prev,
        [conversationId]: {
          ...prev[conversationId],
          messages: [
            ...(prev[conversationId]?.messages || []).filter(m => m.id !== optimisticId),
            { id: optimisticId, role: 'user' as const, content, timestamp: new Date() },
            { id: response.id, role: 'assistant' as const, content: response.content, timestamp: new Date() },
          ],
        },
      }));
    } catch (err) {
      // Rollback optimistic update
      setConversations(prev => ({
        ...prev,
        [conversationId]: {
          ...prev[conversationId],
          messages: prev[conversationId]?.messages.filter(m => m.id !== optimisticId),
        },
      }));
      throw err;
    }
  }, []);

  const createConversation = useCallback(async (): Promise<Conversation> => {
    const conversation = await apiCreateConversation();
    setConversations(prev => ({
      ...prev,
      [conversation.id]: conversation,
    }));
    return conversation;
  }, []);

  const deleteConversation = useCallback(async (id: string): Promise<void> => {
    await apiDeleteConversation(id);
    setConversations(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  return {
    conversations,
    loadingConversationId,
    error,
    loadConversation,
    sendMessage,
    createConversation,
    deleteConversation,
  };
}

// ============================================================================
// LAYER 2: UI State Only — No Fetching
// ============================================================================

// hooks/ai/useAITerminalUI.ts
import { useState, useCallback } from 'react';

interface UseAITerminalUIReturn {
  // Sidebar state
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  
  // Selection state
  selectedConversationId: string | null;
  selectConversation: (id: string | null) => void;
  
  // Input state
  inputValue: string;
  setInputValue: (value: string) => void;
  clearInput: () => void;
  
  // Voice state
  isRecording: boolean;
  setIsRecording: (recording: boolean) => void;
  
  // UI flags
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
}

export function useAITerminalUI(): UseAITerminalUIReturn {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), []);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const selectConversation = useCallback((id: string | null) => {
    setSelectedConversationId(id);
  }, []);
  const clearInput = useCallback(() => setInputValue(''), []);

  return {
    sidebarOpen,
    toggleSidebar,
    openSidebar,
    closeSidebar,
    selectedConversationId,
    selectConversation,
    inputValue,
    setInputValue,
    clearInput,
    isRecording,
    setIsRecording,
    isExpanded,
    setIsExpanded,
  };
}

// ============================================================================
// LAYER 3: Composition Layer — Wires Layers 1 and 2
// ============================================================================

// hooks/ai/useAITerminal.ts

export interface AITerminalConfig {
  terminalId: string;
  namespace: string;  // e.g., 'coach-assistant', 'workout-builder', 'bootcamp'
  systemPrompt: string;
  suggestedPrompts?: string[];
  voiceEnabled?: boolean;
  sidebarEnabled?: boolean;
  onHandoff?: (intent: AIIntent) => void;
}

export interface AIIntent {
  type: 'navigate' | 'action' | 'suggestion';
  payload: Record<string, unknown>;
}

interface UseAITerminalProps {
  config: AITerminalConfig;
}

export function useAITerminal({ config }: UseAITerminalProps): UseAITerminalReturn {
  const ui = useAITerminalUI();
  const { 
    conversations, 
    loadingConversationId, 
    error, 
    loadConversation, 
    sendMessage,
    createConversation,
    deleteConversation,
  } = useAIConversations();

  // Namespaced state access
  const namespaceKey = `${config.namespace}-${config.terminalId}`;
  const namespacedConversations = useMemo(
    () => Object.values(conversations).filter(c => c.id.startsWith(namespaceKey)),
    [conversations, namespaceKey]
  );

  // Load conversation when selected
  useEffect(() => {
    if (!ui.selectedConversationId) return;
    
    // Cache hit - already loaded
    if (conversations[ui.selectedConversationId]?.loaded) return;
    
    const cleanup = loadConversation(ui.selectedConversationId);
    return cleanup;
  }, [ui.selectedConversationId, loadConversation, conversations]);

  // Sidebar closes on destination selection (per brief requirement)
  useEffect(() => {
    if (ui.selectedConversationId && config.sidebarEnabled) {
      ui.closeSidebar();
    }
  }, [ui.selectedConversationId, config.sidebarEnabled, ui.closeSidebar]);

  const handleSendMessage = useCallback(async (content: string): Promise<void> => {
    let targetId = ui.selectedConversationId;
    
    if (!targetId) {
      const newConv = await createConversation();
      targetId = newConv.id;
      ui.selectConversation(targetId);
    }
    
    await sendMessage(targetId, content);
    ui.clearInput();
  }, [ui.selectedConversationId, ui.selectConversation, ui.clearInput, createConversation, sendMessage]);

  const handleSelectConversation = useCallback((id: string): void => {
    ui.selectConversation(id);
  }, [ui.selectConversation]);

  return {
    // Namespaced conversations
    conversations: namespacedConversations,
    currentConversation: ui.selectedConversationId 
      ? conversations[ui.selectedConversationId] 
      : null,
    isLoading: loadingConversationId === ui.selectedConversationId,
    error,
    
    // UI state
    ...ui,
    
    // Actions
    sendMessage: handleSendMessage,
    selectConversation: handleSelectConversation,
    deleteConversation,
    
    // Config
    config,
  };
}
```

#### 3. Blast Radius
| Metric | Current | Impact |
|--------|---------|--------|
| Users Affected | ~40% (AI terminal users) | Trainers using Coach Assistant, Workout Builder, Bootcamp |
| Feature Count | 3+ fragmented implementations | Each will have subtle bugs from circular refs |
| Future Impact | **Multiplies with each AI surface** | Without fix, AI expansion creates chaos |

#### 4. Priority: **#2**

Foundation-level architectural fix. Blocks reliable AI terminal implementation.

---

### 🔴 FINDING A2: Conversation Loading Race Condition
**From:** 02-architecture-design.md

#### 1. Severity Assessment: **CONFIRMED CRITICAL** ✅

Race conditions cause:
- Wrong data displayed to users
- Data corruption (messages in wrong conversations)
- UX confusion and loss of trust

This is **appropri

---

## Aggregate Summary

### Critical Findings
**UX & Accessibility:**
- *   **Impact:** Users who rely on keyboard navigation (e.g., motor impairments, screen reader users) will be unable to access or interact with critical parts of the application, leading to complete blockage of workflows.
- *   **Finding:** The document repeatedly highlights critical mobile issues: "clipped, unreadable, or hard-to-use layouts on mobile (iPhone XR)," "exercise list... takes over the screen," "horizontal tab bars are not mobile-scrollable," "builder can cause surrounding layout columns to break or clip," "Find a trainer' is not fully mobile responsive," "Enhanced Client Progress dashboard is smashed," and "My Profile mobile layout is poor." The brief explicitly states "desktop-biased designs that will fail on smaller screens (320-375px)."
- *   **Impact:** The application is fundamentally unusable on mobile devices, which is a critical failure for a SaaS platform in 2026, especially for trainers on the go. This will lead to extremely high user frustration, abandonment, and negative reviews.
- *   **Content Reflow & Prioritization:** Ensure content reflows gracefully, prioritizing essential information and using progressive disclosure for less critical details.
- *   **Virtualization:** Implement list virtualization for long lists (e.g., exercise rolodex) to render only visible items. (This is also noted as a critical architectural fix in 02-architecture-design.md).
**Code Quality:**
- **Recommendation:** Each CRITICAL/HIGH priority item should include at least one measurable criterion:
- **Rating:** CRITICAL
- // AS WRITTEN — CRITICAL BUG
- **Rating:** CRITICAL
- **Rating:** CRITICAL
**Performance & Scalability:**
- **Rating: CRITICAL**
- **Rating: CRITICAL**
**Architecture & Bug Hunter:**
- After comprehensive review of the provided documentation files, I've identified **23 critical/high severity findings** that represent ship blockers. The documentation reveals systemic architectural gaps, security violations against stated policies, integration fractures, and production readiness failures.
- **Severity:** 🔴 CRITICAL
- **Severity:** 🔴 CRITICAL
- // CRITICAL: Validate input before computation
- **Severity:** 🔴 CRITICAL
**Frontend UX & Code Patterns:**
- *   **Finding:** **CRITICAL** — The documentation confirms a lack of defined component trees or shared library boundaries. The current "naive" implementation path will lead to massive, unmaintainable files (e.g., `WorkoutPlannerPage.tsx` estimated at 500-800 lines).
- *   **Finding:** **CRITICAL** — The reported runtime crash in `RemotionTemplateGallery` indicates a failure in theme context propagation or unsafe property access within styled-components.
- *   **Finding:** **CRITICAL** — The documentation reveals fragmented AI terminal state.
- *   **Finding:** **CRITICAL** — The documentation explicitly flags poor contrast in the current theme.
**Data Safety & Integrity:**
- **Classification:** TREAT AS PRODUCTION-CRITICAL
- Both categories are treated as production-critical because a planning document that fails to prohibit `sync({ force: true })` is functionally equivalent to a document that recommends it.
- The architecture document explicitly lists "No file/folder structure proposed" and "No API contract format specified" as gaps, but critically **fails to list the most dangerous gap of all: no database migration safety policy.** The document then describes sweeping schema changes across at minimum six major modules (Dashboard, Scheduling, Equipment, AI Terminal, Workout Planner, Content Studio).
- throw new Error('CRITICAL: Password hashes corrupted — rolling back');
**Code Architecture (Qwen):**
- **Severity:** CRITICAL
- **Severity:** CRITICAL
- **Severity:** CRITICAL
**Full-Stack Integration Review (Trinity):**
- **CRITICAL - Missing API Response Types**
- The plan lacks critical architectural specifications that will cause integration failures during implementation. The most urgent issues are API contract alignment and authentication flow integrity.
**Code Quality Debate (Phase 2B):**
- All four critical findings represent systemic risks that would inevitably lead to production incidents:
**Smart Escalation (MiniMax M2.7):**
- This is a **hard crash** causing complete navigation failure. Any severity rating below Critical would be inappropriate.
- This is **appropriately rated Critical**.

### High Priority Findings
**UX & Accessibility:**
- *   **Visible Focus Indicators:** Provide clear, high-contrast visual focus indicators for all interactive elements.
- *   **Finding:** The document repeatedly highlights critical mobile issues: "clipped, unreadable, or hard-to-use layouts on mobile (iPhone XR)," "exercise list... takes over the screen," "horizontal tab bars are not mobile-scrollable," "builder can cause surrounding layout columns to break or clip," "Find a trainer' is not fully mobile responsive," "Enhanced Client Progress dashboard is smashed," and "My Profile mobile layout is poor." The brief explicitly states "desktop-biased designs that will fail on smaller screens (320-375px)."
- *   **Impact:** The application is fundamentally unusable on mobile devices, which is a critical failure for a SaaS platform in 2026, especially for trainers on the go. This will lead to extremely high user frustration, abandonment, and negative reviews.
- *   **Finding:** The UX research notes "Inconsistent AI terminals across the app will lead to a steep learning curve and user distrust." The architectural review further highlights the risk of "State Fragmentation" if a single, configurable AI terminal component isn't strictly enforced.
- *   **Finding:** "Current double-click requirement for adding exercises on desktop, and the disappearing exercise name on mobile, creates a broken and confusing workflow." The overly long exercise list on mobile is also cited as highly inefficient.
**Code Quality:**
- **Recommendation:** Each CRITICAL/HIGH priority item should include at least one measurable criterion:
- **Rating:** HIGH
- **Rating:** HIGH
- **Rating:** HIGH
**Security:**
- **Recommendations (high‑level)**
- These actions should be documented in the architecture design **before any implementation begins** to prevent the recurring “naïve copy‑paste” anti‑pattern highlighted in the brief.
**Performance & Scalability:**
- **Rating: HIGH**
- **Rating: HIGH**
**Competitive Intelligence:**
- SwanStudios is positioned to be a premium, AI-driven personal training platform. The "Enchanted Apex: Crystalline Swan" theme, coupled with the sophisticated tech stack and focus on AI, sets a high bar. However, the current state, as revealed by the validation reports, indicates significant gaps and technical debt that need addressing to realize this vision.
**Architecture & Bug Hunter:**
- After comprehensive review of the provided documentation files, I've identified **23 critical/high severity findings** that represent ship blockers. The documentation reveals systemic architectural gaps, security violations against stated policies, integration fractures, and production readiness failures.
- **Severity:** 🟠 HIGH
- **Severity:** 🟠 HIGH
- **Severity:** 🟠 HIGH
**Frontend UX & Code Patterns:**
- *   **Finding:** **HIGH** — The "batch-first" equipment scan workflow is currently reversed (details before images).
**Code Architecture (Qwen):**
- **Severity:** HIGH
- **Severity:** HIGH
- **Severity:** HIGH
- **Severity:** HIGH
- **Severity:** HIGH
**Full-Stack Integration Review (Trinity):**
- The frontend references API responses but there are no shared TypeScript types between frontend and backend. This creates a high risk of contract drift.
- **HIGH - Token Refresh Logic Missing**
- **HIGH - Silent Error Handling**
- **Overall Integration Risk: HIGH**
**UX/UI Design Debate (Phase 2C):**
- damping: 32,      // Slightly higher damping to prevent bounce

---

*SwanStudios 15-Brain Recursive Consensus System v14.0*
*Phase 1: 13 parallel — Gemini 2.5 Flash + Claude Sonnet 4.6 + Nemotron 3 Nano + Gemini 3 Flash + Gemini 3.1 Flash + Nemotron 3 Nano + Gemini 2.5 Flash + MiniMax M2.7 + Nemotron 3 Super + Nemotron 3 Super + Step Bug Hunter II + Data Safety (Claude) + Trinity Large 400B*
*Phase 2: 3 Specialty Debates — Security (Step ↔ Nemotron) + Code Quality (Claude ↔ Qwen) + UX/UI (Gemini 3.1 Pro ↔ M2.5:free)*
*Phase 3: Smart Escalation — Nemotron Nano Escalation + MiniMax M2.7 (CRITICAL only)*
