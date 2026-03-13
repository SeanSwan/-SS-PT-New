# SwanStudios Validation Report

> Generated: 3/13/2026, 3:01:38 AM
> Files reviewed: 1
> Validators: 7 succeeded, 1 errored
> Cost: $0.0061
> Duration: 176.5s
> Gateway: OpenRouter (single API key)

---

## Files Reviewed

- `docs/ai-workflow/blueprints/CANADA-IMMIGRATION-TAB-BLUEPRINT.md`

---

## Validator Summary

| # | Validator | Model | Tokens (in/out) | Duration | Status |
|---|-----------|-------|-----------------|----------|--------|
| 1 | UX & Accessibility | google/gemini-2.5-flash | 3,366 / 4,096 | 25.8s | PASS |
| 2 | Code Quality | anthropic/claude-4.5-sonnet-20250929 | 3,367 / 4,096 | 53.1s | PASS |
| 3 | Security | deepseek/deepseek-v3.2-20251201 | 3,385 / 1,099 | 29.2s | PASS |
| 4 | Performance & Scalability | google/gemini-3-flash-preview-20251217 | 3,397 / 1,143 | 9.7s | PASS |
| 5 | Competitive Intelligence | minimax/minimax-m2.1 | 2,975 / 4,096 | 142.7s | PASS |
| 6 | User Research & Persona Alignment | deepseek/deepseek-v3.2-20251201 | 3,454 / 3,488 | 38.9s | PASS |
| 7 | Architecture & Bug Hunter | minimax/minimax-m2.5-20260211 | 3,267 / 4,261 | 60.3s | PASS |
| 8 | Frontend UI/UX Expert | gemini-3.1-pro-preview | 0 / 0 | 25.8s | FAIL |

---

## [PASS] UX & Accessibility
**Model:** google/gemini-2.5-flash | **Duration:** 25.8s

As a UX and accessibility expert auditor, I've reviewed the `CANADA-IMMIGRATION-TAB-BLUEPRINT.md` document for SwanStudios. This blueprint outlines a critical internal tool, and while it's not a public-facing feature, adherence to best practices in UX and accessibility is still crucial for the admin user's efficiency, well-being, and to prevent errors in a "LIFE-CRITICAL" application.

The theme, "Enchanted Apex: Crystalline Swan," with its specific color palette and typography, is well-defined. The blueprint itself is comprehensive and well-structured, which is a good starting point for development.

Here's a detailed breakdown of findings:

---

## WCAG 2.1 AA Compliance

**Overall Impression:** The blueprint describes functionality but lacks specific UI/UX details that would allow for a full WCAG audit. However, I can identify potential areas of concern and make recommendations.

### Color Contrast
*   **Finding:** MEDIUM
*   **Details:** The blueprint specifies an active palette: Midnight Sapphire #002060 (Primary), Royal Depth #003080 (Surface), Ice Wing #60C0F0 (Gaming Accent), Arctic Cyan #50A0F0 (Secondary), Gilded Fern #C6A84B (Luxury Accent), Frost White #E0ECF4 (Background), Swan Lavender #4070C0 (Tertiary), Wing Purple #8B5CF6 (Glow Accent). While these colors are defined, their specific application in text, interactive elements, and backgrounds is not detailed. It's crucial to ensure that all text and interactive elements meet a contrast ratio of at least 4.5:1 against their background (3:1 for large text).
    *   **Specific Concern:** "Motivational progress ring with Crystalline Swan styling." This could involve gradients or complex color combinations that might fail contrast if not carefully designed.
    *   **Specific Concern:** "Color-coded by category (marriage=red, tribal=orange, language=blue, certs=green, immigration=purple)" in the Timeline & Milestones. While color coding is helpful, it *cannot* be the sole means of conveying information. Text labels, icons, or patterns must also be used to ensure information is accessible to users with color vision deficiencies. The specific "red" for overdue items needs to be checked against the background.
*   **Recommendation:**
    *   During UI design, rigorously test all color combinations for text and interactive elements using a contrast checker (e.g., WebAIM Contrast Checker).
    *   For color-coded elements, ensure redundant coding (e.g., text labels, icons, patterns) is used in addition to color to convey meaning.
    *   Ensure focus indicators (outlines, background changes) have sufficient contrast.

### Aria Labels
*   **Finding:** MEDIUM
*   **Details:** The blueprint mentions interactive elements like checkboxes, input fields, and navigation tabs. Without specific UI mockups or code, it's impossible to confirm proper ARIA usage. However, the complexity of the "Master Checklist" and "Document Tracker" tables, as well as the "CRS Score Calculator" with its "What if" scenarios, suggests a high need for well-implemented ARIA attributes.
    *   **Specific Concern:** Interactive elements within tables (e.g., checkboxes, status dropdowns, notes fields) need proper `aria-label` or `aria-labelledby` to provide context to screen reader users.
    *   **Specific Concern:** The "Admin Dashboard sidebar → 'Canada Immigration' tab (maple leaf icon)" needs an `aria-label` on the icon or the tab itself to clearly describe its purpose.
    *   **Specific Concern:** "Motivational progress ring" and "Timeline & Milestones" visualizations will require ARIA attributes to convey their status and interactive elements to screen reader users.
*   **Recommendation:**
    *   All interactive elements (buttons, links, form fields, checkboxes, dropdowns) must have clear, descriptive `aria-label` attributes if their visual text isn't sufficient, or be properly associated with visible labels.
    *   Complex widgets like the progress ring, timeline, and interactive tables should use appropriate ARIA roles and properties (e.g., `aria-valuemin`, `aria-valuemax`, `aria-valuenow` for progress, `aria-describedby` for complex instructions).
    *   Ensure dynamic content updates (e.g., CRS score changes, task completion feedback) are announced to screen readers using `aria-live` regions.

### Keyboard Navigation
*   **Finding:** HIGH
*   **Details:** The application is described as highly interactive with numerous form fields, checkboxes, links, and potentially complex widgets (e.g., interactive checklist, CRS calculator, study modules). Without explicit design for keyboard navigation, this can easily become a major barrier.
    *   **Specific Concern:** The "Master Checklist" with checkboxes, due dates, priority dropdowns, notes fields, and links for each item. Users must be able to tab through these logically and interact with them using keyboard commands (Space, Enter).
    *   **Specific Concern:** The "Document Tracker" table, if interactive, needs careful keyboard focus management.
    *   **Specific Concern:** The "CRS Score Calculator" with multiple input fields and "What if" scenarios requires a logical tab order and clear focus indication.
    *   **Specific Concern:** The "Timeline & Milestones" visualization, if interactive (e.g., clicking milestones), must be keyboard accessible.
*   **Recommendation:**
    *   Ensure a logical and predictable tab order (`tabindex=0` for interactive elements, avoid `tabindex > 0`).
    *   All interactive elements must be reachable and operable via keyboard alone.
    *   Provide a clear and highly visible focus indicator (e.g., a distinct outline) for all interactive elements. The "Wing Purple #8B5CF6 (Glow Accent)" could be a good candidate for this, ensuring it has sufficient contrast.
    *   Test thoroughly using only the keyboard.

### Focus Management
*   **Finding:** HIGH
*   **Details:** Related to keyboard navigation, proper focus management is crucial, especially in a dynamic application.
    *   **Specific Concern:** When a user completes an action (e.g., checks a box, saves a note), where does the focus go next? Does it remain on the element, move to the next logical element, or jump unexpectedly?
    *   **Specific Concern:** Modals or pop-ups (e.g., for editing notes, confirming actions) must trap focus within them and return focus to the triggering element when closed.
    *   **Specific Concern:** Error messages or validation feedback should direct focus or be announced to screen readers.
*   **Recommendation:**
    *   Implement robust focus management for all interactive components and dynamic content.
    *   Ensure focus is programmatically managed for modals, dropdowns, and other overlays.
    *   When new content appears or existing content changes significantly, consider programmatically moving focus to the most relevant element or announcing the change via `aria-live`.

---

## Mobile UX

### Touch Targets (must be 44px min)
*   **Finding:** HIGH
*   **Details:** Many elements described are interactive and will require precise tapping on mobile.
    *   **Specific Concern:** Checkboxes in the "Master Checklist" and "Document Tracker" are often small by default. They need to be styled to meet the 44x44px minimum touch target size.
    *   **Specific Concern:** Links, buttons, and input fields must also adhere to this minimum size.
    *   **Specific Concern:** The "Admin Dashboard sidebar" navigation items, especially with an icon, need to be sufficiently large.
*   **Recommendation:**
    *   Design and style all interactive elements (buttons, links, checkboxes, radio buttons, input fields, navigation items) to have a minimum touch target area of 44x44 CSS pixels. This can be achieved through padding or by setting explicit `min-width` and `min-height`.

### Responsive Breakpoints
*   **Finding:** MEDIUM
*   **Details:** The blueprint mentions "Mobile responsive (10-breakpoint matrix)" in Phase D, which is excellent. However, the complexity of some modules suggests careful planning is needed.
    *   **Specific Concern:** The "Master Checklist" with its numerous columns (checkbox, due date, priority, notes, link, owner, cost) will be challenging to display effectively on small screens. A simple horizontal scroll is often a poor mobile experience.
    *   **Specific Concern:** The "Document Tracker" table faces similar challenges.
    *   **Specific Concern:** The "Timeline & Milestones" visualization, a Gantt-style chart, will be particularly difficult to render responsively without significant re-thinking for mobile.
    *   **Specific Concern:** The "CRS Score Calculator" with many inputs needs a stacked or accordion layout on mobile.
*   **Recommendation:**
    *   Prioritize mobile-first design for complex tables and visualizations. Consider alternative layouts for small screens, such as:
        *   **Checklist/Document Tracker:** Card-based layouts where each row becomes a card, or a "details-on-demand" pattern where only key info is shown, and tapping reveals more.
        *   **Timeline:** A vertical timeline, or a scrollable summary with key milestones highlighted.
        *   **CRS Calculator:** Ensure inputs stack vertically and are clearly labeled.
    *   Ensure all text remains legible and interactive elements are easily tappable across all breakpoints.

### Gesture Support
*   **Finding:** LOW
*   **Details:** The blueprint doesn't explicitly mention gesture support, and for an admin tool, it's generally less critical than for a consumer app. Basic tap and scroll gestures will be implicitly supported.
*   **Recommendation:**
    *   No specific advanced gesture support is required for this type of application, beyond standard tap, scroll, and pinch-to-zoom (if applicable for complex visualizations). Ensure these basic gestures work as expected.

---

## Design Consistency

### Theme Tokens Used Consistently?
*   **Finding:** MEDIUM
*   **Details:** The blueprint clearly defines the "Enchanted Apex: Crystalline Swan" theme with a specific palette and typography. This is a strong foundation. However, the blueprint itself doesn't contain UI elements, so I can only infer potential issues.
    *   **Specific Concern:** The "Motivational progress ring with Crystalline Swan styling" and "Visual Gantt-style timeline" with "Color-coded by category" need to strictly adhere to the defined palette. The "red" for overdue items should ideally be a defined accent color from the theme or a specific error color that complements it, rather than an arbitrary red.
    *   **Specific Concern:** Typography: Plus Jakarta Sans (headings), Cormorant Garamond Italic (drama), Fira Code (data), Sora (UI/gaming). This is a rich set of fonts. Ensure clear guidelines for *when* each font is used to avoid visual clutter and maintain consistency. For example, "data" in tables should consistently use Fira Code. "Drama" for Cormorant Garamond Italic needs a clear definition (e.g., motivational quotes, specific callouts).
*   **Recommendation:**
    *   Strictly enforce the use of defined theme tokens (colors, typography, spacing, border-radii, shadows) throughout the UI development.
    *   Create a design system or component library that uses these tokens exclusively.
    *   Define clear use cases for each font to ensure visual hierarchy and consistency.
    *   Ensure any "error" or "warning" colors (like for overdue items) are either part of the defined palette or are explicitly added to the theme tokens.

### Any Hardcoded Colors?
*   **Finding:** MEDIUM (Potential)
*   **Details:** The blueprint itself doesn't contain code, so this is a forward-looking concern. The mention of "red" for overdue items could be a hardcoded color if not explicitly defined within the theme.
*   **Recommendation:**
    *   During development, conduct regular code reviews to ensure no hardcoded colors, font sizes, or spacing values are introduced. All styling should reference the `styled-components` theme tokens.

---

## User Flow Friction

### Unnecessary Clicks
*   **Finding:** MEDIUM
*   **Details:** The application is designed for an admin user (Sean & his wife) for a "LIFE-CRITICAL" journey. Efficiency is paramount.
    *   **Specific Concern:** "Master Checklist" and "Document Tracker": If editing notes or status requires opening a separate modal for each item, this could introduce friction. Inline editing or quick-edit forms are preferable.
    *   **Specific Concern:** "CRS Score Calculator": "What if" scenarios are great, but ensure the process of adjusting inputs and seeing results is immediate and doesn't require extra clicks (e.g., a "Calculate" button after every change).
    *   **Specific Concern:** "Study Platform": Navigating between different study modules (IELTS, TEF, AI Certs) should be seamless.
*   **Recommendation:**
    *   Prioritize direct manipulation and inline editing where possible (e.g., for checklist notes, document status).
    *   For the CRS calculator, implement real-time updates as inputs change.
    *   Ensure clear and intuitive navigation between modules, minimizing the number of clicks to reach frequently used features.
    *   Consider keyboard shortcuts for common actions (e.g., marking a task complete).

### Confusing Navigation
*   **Finding:** LOW
*   **Details:** The "Admin Dashboard sidebar → 'Canada Immigration' tab" is a clear entry point. The 7 modules are well-defined.
    *   **Specific Concern:** The "Resource Hub" is a list of links. Ensure these links open in new tabs to avoid disrupting the user's workflow within the application.
*   **Recommendation:**
    *   Ensure the sidebar navigation is always visible and clearly indicates the active module.
    *   For external links in the "Resource Hub," ensure they open in a new tab (`target="_blank"` with `rel="noopener noreferrer"` for security).

### Missing Feedback States
*   **Finding:** HIGH
*   **Details:** This is a critical area for any interactive application, especially one tracking "LIFE-CRITICAL" progress.
    *   **Specific Concern:** **Form Submissions/Updates:** When a user checks a box, updates a status, or saves notes, there must be immediate visual feedback (e.g., a brief success message, a checkmark animation, a loading spinner for a moment). Without this, users might click multiple times or doubt if their action was registered.
    *   **Specific Concern:** **Error States:** What happens if an API call fails? If input validation fails? Clear, actionable error messages are needed.
    *   **Specific Concern:** **Loading States:** (Covered in the next section, but related to feedback).
    *   **Specific Concern:** **"What if" scenarios in CRS calculator:** The results should be clearly differentiated from the current actual score.
*   **Recommendation:**
    *   Implement immediate and clear feedback for all user actions:
        *   **Success:** Toast notifications, brief animations, visual confirmation.
        *   **Error:** Inline error messages for validation, clear and user-friendly error pages/modals for API failures.
        *   **Pending:** Loading indicators for actions that take more than a few milliseconds.
    *   Ensure the "Motivational progress ring" updates smoothly and provides clear feedback on progress changes.

---

## Loading States

### Skeleton Screens
*   **Finding:** MEDIUM
*   **Details:** For data-intensive modules like the "Master Checklist," "Document Tracker," and "Study Platform," initial data fetching or subsequent data refreshes can take time.
*   **Recommendation:**
    *   Implement skeleton screens for content areas that load asynchronously. This provides a perceived performance boost and prevents jarring content shifts. For example, a skeleton list for the checklist items, or a skeleton table for the document tracker.

### Error Boundaries
*   **Finding:** HIGH
*   **Details:** The application is "LIFE-CRITICAL." Uncaught JavaScript errors or failed API calls must not crash the entire application or leave the user in a broken state.
*   **Recommendation:**
    *   Implement React Error Boundaries around major components or modules. This will catch JavaScript errors in rendering, lifecycle methods, and constructors of their children, preventing the entire app from crashing and allowing for a graceful fallback UI (e.g., "Something went wrong, please try again").
    *   Combine this with robust backend error handling and clear error messages to the user.

### Empty States
*   **Finding:** MEDIUM
*   **Details:** While the blueprint implies pre-seeded data for the checklist, other sections might start empty or become empty.
    *   **Specific Concern:** "Study Progress": If no quizzes have been taken or study sessions logged, what does this module show?
    *   **Specific Concern:** "Timeline & Milestones": If no milestones are defined (unlikely given the blueprint, but good to consider), what is displayed?
    *   **Specific Concern:** "Notes field" in checklist: If a note is empty, how is it displayed?
*   **Recommendation:**
    *   Design clear and helpful empty states for all modules that could potentially have no data. These should include:
        *   A clear message explaining why the area is empty.
        *   Guidance on how to populate the area (e.g., "Start your first study session to see progress here").
        *   A call to action button if appropriate.

---

## Summary and Overall Rating

The `CANADA-IMMIGRATION-TAB-BLUEPRINT.md` is an exceptionally detailed and well-thought-out plan for a critical internal tool. The emphasis on security and the phased build plan are commendable.

**Overall UX/Accessibility Risk:** MEDIUM-HIGH

While the blueprint is strong, the inherent complexity of the features (interactive checklists, dynamic calculators, Gantt charts, study platforms) combined with the "LIFE-CRITICAL" nature of the project means that UX and accessibility considerations must be deeply embedded from the very beginning of the design and development process, not just as a final audit. Many of the "MEDIUM" findings could quickly escalate to "HIGH" or "CRITICAL" if not addressed proactively during UI design and implementation.

**Key areas to focus on immediately:**

1.  **WCAG Compliance:** Prioritize color contrast, keyboard navigation, and focus management during UI design and component development.
2.  **Mobile Responsiveness:** Rethink complex tables and visualizations for small screens from the outset.
3.  **Feedback States:** Ensure every user interaction provides clear and immediate feedback.
4.  **Error Handling:** Implement robust error boundaries and clear error messages.

By addressing these points diligently, SwanStudios can ensure this vital tool is

---

## [PASS] Code Quality
**Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 53.1s

# Code Review: Canada Immigration Tab Blueprint

## Document Type Assessment
⚠️ **NOTE:** This is a **specification document**, not executable code. Review focuses on architectural decisions, technical requirements, and implementation guidance quality.

---

## 1. TypeScript Best Practices

### MEDIUM: Missing Type Definitions for Data Models
**Location:** Data Storage section

**Issue:** Database table schemas described in prose without TypeScript interface definitions.

**Recommendation:**
```typescript
// Should include type definitions like:
interface ImmigrationTask {
  id: string;
  userId: string;
  phase: 'PHASE_0' | 'PHASE_1' | 'PHASE_2' | 'PHASE_3';
  title: string;
  completed: boolean;
  dueDate: Date | null;
  priority: 'P0' | 'P1' | 'P2';
  notes: string;
  resourceUrl: string | null;
  owner: 'SEAN' | 'WIFE' | 'BOTH';
  cost: number | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ImmigrationDocument {
  id: string;
  userId: string;
  documentType: DocumentType; // enum
  status: 'NOT_STARTED' | 'ORDERED' | 'APPLIED' | 'SCHEDULED' | 'RECEIVED' | 'COMPLETED';
  notes: string;
  score?: string; // for test results
  createdAt: Date;
  updatedAt: Date;
}

type DocumentType = 
  | 'BIRTH_CERT_SEAN'
  | 'BIRTH_CERT_FATHER'
  | 'DEATH_CERT_FATHER'
  // ... etc
```

---

### LOW: CRS Calculator Needs Discriminated Union Pattern
**Location:** Module 4: CRS Score Calculator

**Issue:** Calculator inputs should use discriminated unions for type safety.

**Recommendation:**
```typescript
type EducationLevel = 
  | { type: 'NONE' }
  | { type: 'HIGH_SCHOOL' }
  | { type: 'ONE_YEAR_DIPLOMA' }
  | { type: 'TWO_YEAR_DIPLOMA' }
  | { type: 'BACHELORS' }
  | { type: 'MASTERS' }
  | { type: 'PHD' };

interface CRSCalculatorInput {
  age: number;
  education: EducationLevel;
  languageScores: {
    ielts?: { reading: number; writing: number; listening: number; speaking: number };
    tef?: { reading: number; writing: number; listening: number; speaking: number };
  };
  workExperience: {
    canadian: number; // years
    foreign: number;
  };
  spouse?: SpouseFactors;
  provincialNomination: boolean;
}
```

---

## 2. React Patterns

### HIGH: Missing Guidance on State Management Strategy
**Location:** Architecture Overview

**Issue:** No specification for state management approach. With 7 modules and complex interdependencies (CRS calculator affects timeline, checklist completion affects dashboard), this needs clarity.

**Recommendation:**
```typescript
// Specify state management approach:
// Option 1: React Context for global immigration state
interface ImmigrationContextValue {
  tasks: ImmigrationTask[];
  documents: ImmigrationDocument[];
  studyProgress: StudyProgress[];
  crsScore: number | null;
  refreshData: () => Promise<void>;
  updateTask: (id: string, updates: Partial<ImmigrationTask>) => Promise<void>;
}

// Option 2: React Query for server state
const useImmigrationTasks = () => {
  return useQuery(['immigration-tasks'], fetchTasks, {
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Option 3: Zustand for client state
interface ImmigrationStore {
  selectedPhase: Phase | null;
  filterOwner: Owner | 'ALL';
  setSelectedPhase: (phase: Phase | null) => void;
}
```

---

### MEDIUM: Performance Concern - Large Checklist Rendering
**Location:** Module 2: Master Checklist

**Issue:** 40+ checklist items across 4 phases could cause performance issues without virtualization or pagination.

**Recommendation:**
```typescript
// Specify virtualization requirement:
// Use react-window or react-virtual for checklist rendering
import { FixedSizeList } from 'react-window';

// OR specify pagination/accordion pattern:
// Render only active phase by default, lazy-load others
const ChecklistAccordion: React.FC = () => {
  const [expandedPhases, setExpandedPhases] = useState<Set<Phase>>(
    new Set(['PHASE_0'])
  );
  // Only render tasks for expanded phases
};
```

---

### MEDIUM: Missing Memoization Guidance for CRS Calculator
**Location:** Module 4: CRS Score Calculator

**Issue:** CRS calculation is computationally intensive and should be memoized.

**Recommendation:**
```typescript
// Specify memoization requirement:
const calculateCRS = useMemo(() => {
  return computeCRSScore({
    age,
    education,
    languageScores,
    workExperience,
    spouse,
    provincialNomination,
  });
}, [age, education, languageScores, workExperience, spouse, provincialNomination]);

// OR use React Query for server-side calculation with caching
const { data: crsScore } = useQuery(
  ['crs-score', calculatorInputs],
  () => api.calculateCRS(calculatorInputs),
  { staleTime: Infinity } // CRS logic doesn't change
);
```

---

## 3. styled-components & Theme

### HIGH: Missing Theme Token Specifications
**Location:** Throughout - references "Crystalline Swan styling" without specifics

**Issue:** Blueprint doesn't specify which theme tokens to use for immigration-specific UI elements.

**Recommendation:**
```typescript
// Add theme token mapping section:
const ImmigrationThemeTokens = {
  // Phase colors
  phase0: 'colors.error', // Urgent - #FF4444 or similar
  phase1: 'colors.warning', // Foundation - Gilded Fern #C6A84B
  phase2: 'colors.secondary', // Momentum - Arctic Cyan #50A0F0
  phase3: 'colors.success', // Advanced - success green
  
  // Status colors
  notStarted: 'colors.neutral.400',
  inProgress: 'colors.secondary', // Arctic Cyan
  completed: 'colors.success',
  overdue: 'colors.error',
  
  // Priority colors
  p0: 'colors.error',
  p1: 'colors.warning',
  p2: 'colors.neutral.500',
  
  // Progress ring
  progressRing: {
    background: 'colors.surface', // Royal Depth #003080
    fill: 'colors.gaming', // Ice Wing #60C0F0
    text: 'colors.luxury', // Gilded Fern #C6A84B
  },
  
  // Typography
  heading: 'fonts.heading', // Plus Jakarta Sans
  body: 'fonts.ui', // Sora
  data: 'fonts.data', // Fira Code (for scores, dates)
  dramatic: 'fonts.dramatic', // Cormorant Garamond Italic (for motivational text)
};
```

---

### MEDIUM: Progress Ring Needs Component Specification
**Location:** Module 1: Dashboard Overview - "Motivational progress ring"

**Issue:** No specification for how to implement progress ring with theme tokens.

**Recommendation:**
```typescript
// Specify styled-component structure:
const ProgressRing = styled.div`
  position: relative;
  width: 200px;
  height: 200px;
  
  svg {
    transform: rotate(-90deg);
  }
`;

const ProgressCircle = styled.circle<{ progress: number }>`
  fill: none;
  stroke: ${({ theme }) => theme.colors.gaming}; // Ice Wing
  stroke-width: 12;
  stroke-dasharray: ${({ progress }) => `${progress * 628} 628`}; // 2πr
  stroke-linecap: round;
  transition: stroke-dasharray 0.6s ease;
`;

const ProgressText = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-family: ${({ theme }) => theme.fonts.data}; // Fira Code
  font-size: 2rem;
  color: ${({ theme }) => theme.colors.luxury}; // Gilded Fern
`;
```

---

### LOW: Timeline Color-Coding Needs Theme Integration
**Location:** Module 7: Timeline & Milestones

**Issue:** Hardcoded color descriptions (red, orange, blue, green, purple) instead of theme tokens.

**Recommendation:**
```typescript
// Replace with theme-based category colors:
const TimelineCategories = {
  marriage: 'colors.error', // Critical urgency
  tribal: 'colors.warning', // Gilded Fern
  language: 'colors.secondary', // Arctic Cyan
  certifications: 'colors.success',
  immigration: 'colors.tertiary', // Swan Lavender
} as const;
```

---

## 4. DRY Violations

### HIGH: Duplicate Status Enums Across Modules
**Location:** Module 3 (Document Tracker) and implied in Module 2 (Checklist)

**Issue:** Status workflows defined separately for tasks and documents - will lead to duplicate code.

**Recommendation:**
```typescript
// Create shared status types:
type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

type DocumentStatus = 
  | 'NOT_STARTED'
  | 'ORDERED'
  | 'APPLIED'
  | 'SCHEDULED'
  | 'RECEIVED'
  | 'COMPLETED';

// Shared status badge component:
interface StatusBadgeProps {
  status: TaskStatus | DocumentStatus;
  variant?: 'task' | 'document';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, variant }) => {
  const color = getStatusColor(status); // Shared color logic
  return <Badge color={color}>{formatStatus(status)}</Badge>;
};
```

---

### MEDIUM: Repeated "Owner" Field Logic
**Location:** Module 2 (checklist items) and implied filtering

**Issue:** Owner field (Sean/Wife/Both) will need repeated filtering/display logic.

**Recommendation:**
```typescript
// Create shared owner utilities:
type Owner = 'SEAN' | 'WIFE' | 'BOTH';

const OwnerFilter = {
  all: (items: Array<{ owner: Owner }>) => items,
  sean: (items: Array<{ owner: Owner }>) => 
    items.filter(i => i.owner === 'SEAN' || i.owner === 'BOTH'),
  wife: (items: Array<{ owner: Owner }>) => 
    items.filter(i => i.owner === 'WIFE' || i.owner === 'BOTH'),
} as const;

// Shared owner badge component
const OwnerBadge: React.FC<{ owner: Owner }> = ({ owner }) => {
  const config = {
    SEAN: { label: 'Sean', color: 'colors.gaming' },
    WIFE: { label: 'Wife', color: 'colors.luxury' },
    BOTH: { label: 'Both', color: 'colors.tertiary' },
  }[owner];
  
  return <Badge color={config.color}>{config.label}</Badge>;
};
```

---

### MEDIUM: Study Module Repetition
**Location:** Module 5 - IELTS, TEF, and AI cert sections

**Issue:** Each study section has similar structure (practice materials, progress tracker, score history) - will lead to duplicate components.

**Recommendation:**
```typescript
// Create generic study module components:
interface StudyModuleProps<T extends string> {
  moduleType: T;
  sections: StudySection[];
  progressData: StudyProgress;
  onUpdateProgress: (sectionId: string, score: number) => Promise<void>;
}

interface StudySection {
  id: string;
  title: string;
  type: 'PRACTICE' | 'QUIZ' | 'FLASHCARDS' | 'READING' | 'LISTENING';
  content: React.ReactNode;
}

// Reusable progress tracker
const StudyProgressTracker: React.FC<{
  history: Array<{ date: Date; score: number }>;
  targetScore?: number;
}> = ({ history, targetScore }) => {
  // Line chart with target line
};
```

---

## 5. Error Handling

### CRITICAL: No Error Handling Strategy Specified
**Location:** Architecture Overview, Backend API routes

**Issue:** Blueprint mentions "try/catch around async ops" in review criteria but doesn't specify error handling strategy for the immigration tab.

**Recommendation:**
```typescript
// Add error handling specification section:

// API Error Response Format
interface APIError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Frontend Error Boundary for Immigration Tab
class ImmigrationErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  // Catch rendering errors, show user-friendly message
  // Log to error tracking service
}

// API Error Handler Middleware
const immigrationErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (err instanceof ValidationError) {
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Invalid input data',
      details: err.errors,
    });
  }
  
  if (err instanceof UnauthorizedError) {
    return res.status(403).json({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    });
  }
  
  // Log unexpected errors
  logger.error('Immigration API error', { error: err, userId: req.user?.id });
  
  return res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred. Please try again.',
  });
};

// User-Facing Error Messages
const ErrorMessages = {
  TASK_UPDATE_FAILED: 'Failed to update task. Please try again.',
  DOCUMENT_FETCH_FAILED: 'Unable to load documents. Check your connection.',
  CRS_CALCULATION_FAILED: 'CRS calculation error. Verify all inputs.',
  STUDY_PROGRESS_SAVE_FAILED: 'Could not save study progress.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You must be logged in as an admin to access this feature.',
} as const;
```

---

### HIGH: Missing Validation for CRS Calculator Inputs
**Location:** Module 4: CRS Score Calculator

**Issue:** No specification for input validation (age ranges, score ranges, etc.).

**Recommendation:**
```typescript
// Add validation schema specification:
import { z } from 'zod';

const CRSInputSchema = z.object({
  age: z.number().int().min(18).max(45), // CRS age range
  education: z.enum(['NONE', 'HIGH_SCHOOL', 'BACHELORS', 'MASTERS', 'PHD']),
  languageScores: z.object({
    ielts: z.object({
      reading: z.number().min(0).max(9).optional(),
      writing: z.number().min(0).max(9).optional(),
      listening: z.number().min(0).max(9).optional(),
      speaking: z.number().min(0).max(9).optional(),
    }).optional(),
    tef: z.object({
      reading: z.number().min(0).max(7).optional(), // NCLC levels
      writing: z.number().min(0).max(7).optional(),
      listening: z.number().min(0).max(7).optional(),

---

## [PASS] Security
**Model:** deepseek/deepseek-v3.2-20251201 | **Duration:** 29.2s

# Security Audit Report: Canada Immigration Tab Blueprint

## Executive Summary
The blueprint outlines a **life-critical** admin-only module for tracking immigration processes. While the design shows strong security awareness, several implementation risks exist due to the sensitive nature of immigration data (PII, tribal documentation, personal timelines).

## Critical Findings

### 1. **HIGH: PII Data Exposure Risk**
- **Issue:** Blueprint includes tracking of highly sensitive documents (birth certificates, death certificates, CDIB cards, marriage certificates, test scores)
- **Risk:** Even with admin-only access, these documents contain PII that could be exploited if database is compromised
- **Recommendation:** 
  - Implement field-level encryption for all sensitive document metadata
  - Add database column-level encryption for PII fields
  - Consider hashing document identifiers instead of storing raw data

### 2. **HIGH: Missing Data Retention & Deletion Policy**
- **Issue:** No specification for data retention periods or secure deletion procedures
- **Risk:** Immigration data could persist indefinitely, violating privacy principles
- **Recommendation:**
  - Implement automatic data anonymization after immigration process completion
  - Add GDPR/CCPA compliance controls for data deletion requests
  - Specify maximum retention period (e.g., 2 years post-immigration)

## Medium Findings

### 3. **MEDIUM: Incomplete Input Validation Specification**
- **Issue:** Blueprint mentions "input validation" but doesn't specify schema validation library or patterns
- **Risk:** Inconsistent validation could lead to injection attacks or data corruption
- **Recommendation:**
  - Implement Zod schemas for all API endpoints
  - Add request validation middleware with strict type checking
  - Sanitize all user inputs before database operations

### 4. **MEDIUM: Missing Audit Logging**
- **Issue:** No mention of audit trails for sensitive immigration data access
- **Risk:** Cannot track who accessed sensitive immigration data or when
- **Recommendation:**
  - Implement comprehensive audit logging for all CRUD operations
  - Log admin access to immigration modules with timestamp and user ID
  - Store audit logs separately from application database

### 5. **MEDIUM: Client-Side Data Handling Risks**
- **Issue:** While blueprint says "no sensitive data in localStorage," complex state management could inadvertently expose data
- **Risk:** React state or props could contain sensitive information visible in dev tools
- **Recommendation:**
  - Implement memory-safe data handling (clear sensitive data from state when not needed)
  - Use React Context with encryption for sensitive state
  - Add Content Security Policy to prevent data exfiltration

## Low Findings

### 6. **LOW: Missing Rate Limiting Specifications**
- **Issue:** Blueprint mentions rate limiting but doesn't specify implementation details
- **Risk:** Admin endpoints could be brute-forced if rate limiting is weak
- **Recommendation:**
  - Implement IP-based rate limiting (e.g., 100 requests/minute per admin)
  - Add account-level rate limiting for sensitive endpoints
  - Use Redis for distributed rate limiting in production

### 7. **LOW: External Link Security**
- **Issue:** Resource hub contains numerous external links without validation
- **Risk:** Link manipulation could redirect to malicious sites
- **Recommendation:**
  - Implement link validation and sanitization
  - Add warning for external links opening in new tabs
  - Consider using a URL allowlist for known immigration resources

## Security Strengths Noted

### ✅ Positive Security Measures:
1. **Admin-Only Access:** Proper RBAC enforcement with JWT verification
2. **No File Uploads:** Minimizes attack surface by avoiding file processing
3. **Parameterized Queries:** Explicitly prohibits string interpolation
4. **Session-Only Storage:** Avoids localStorage for sensitive data
5. **Self-Contained Design:** No third-party API dependencies reduces external risks

## Priority Recommendations

### Immediate Actions (Before Development):
1. **Implement Field-Level Encryption** for all PII data in database schema
2. **Define Data Retention Policy** with automatic cleanup procedures
3. **Create Audit Logging Framework** for all immigration data access

### Development Phase Actions:
1. **Implement Zod Validation** for all API endpoints
2. **Add Comprehensive CSP Headers** to prevent data leakage
3. **Configure Proper Rate Limiting** with Redis backend

### Post-Development Actions:
1. **Conduct Penetration Testing** specifically on immigration module
2. **Perform Code Review** focusing on data handling and validation
3. **Verify Admin Access Logs** are working and monitored

## Risk Assessment Summary
- **Overall Risk Level:** MEDIUM-HIGH (due to sensitive nature of immigration data)
- **Data Sensitivity:** CRITICAL (contains PII, tribal documentation, personal timelines)
- **Attack Surface:** LOW (admin-only, no file uploads, no external APIs)
- **Compromise Impact:** HIGH (immigration data breach could have legal/financial consequences)

## Final Recommendation
Proceed with development but **implement all security recommendations before production deployment**. The sensitive nature of immigration data requires higher-than-normal security standards, even for admin-only functionality. Consider this module as requiring "enhanced security" classification within your application.

---

## [PASS] Performance & Scalability
**Model:** google/gemini-3-flash-preview-20251217 | **Duration:** 9.7s

As a Performance and Scalability Engineer, I have reviewed the **Canada Immigration Tab Blueprint**. While this is a functional specification, the architectural decisions outlined have significant implications for the SwanStudios production environment.

### Executive Summary of Findings
The blueprint is well-structured for security but risks **bundle bloat** and **database inefficiency** due to the "all-in-one" module approach. The inclusion of a "Study Platform" and "CRS Calculator" within the main admin bundle will degrade the Time-to-Interactive (TTI) for the core SaaS platform if not handled via code-splitting.

---

### 1. Bundle Size & Lazy Loading
**Finding: Monolithic Admin Bundle Risk**
*   **Rating: HIGH**
*   **Analysis:** Adding 7 complex modules (Gantt charts, study tools, calculators, and flashcards) into the existing Admin dashboard will significantly increase the `main.js` or `admin.chunk.js` size.
*   **Recommendation:** 
    *   The "Canada Immigration" tab must be **dynamically imported** using `React.lazy()`.
    *   Heavy sub-components (e.g., the Gantt chart in Module 7 or the Charts in Module 5) should be further code-split so they only load when that specific sub-tab is active.

### 2. Database Query Efficiency
**Finding: N+1 Vulnerability in Checklist/Document Tracking**
*   **Rating: MEDIUM**
*   **Analysis:** With three new tables (`immigration_tasks`, `immigration_documents`, `study_progress`), fetching the "Dashboard Overview" (Module 1) could trigger multiple disparate queries.
*   **Recommendation:** 
    *   Ensure **Indexes** are created on `user_id` and `status` for all three tables.
    *   Use Sequelize `include` with `attributes` filtering to fetch only necessary summary data for the dashboard in a single join, rather than three separate hits.

### 3. Render Performance
**Finding: Excessive Re-renders in CRS Calculator & Study Platform**
*   **Rating: MEDIUM**
*   **Analysis:** The CRS Calculator (Module 4) involves many interdependent inputs (Age, Language, Spouse factors). In a standard React state pattern, every keystroke could re-render the entire Admin sidebar and header.
*   **Recommendation:** 
    *   Use `React.memo` for the Sidebar and non-related dashboard components.
    *   Implement the CRS Calculator using `useReducer` or a local state container to isolate updates to the calculator component only.

### 4. Network Efficiency
**Finding: Lack of Data Caching for Static Resources**
*   **Rating: LOW**
*   **Analysis:** The "Resource Hub" (Module 6) and "Study Guides" (Module 5) appear to be largely static content stored in the DB. Fetching these on every tab click is wasteful.
*   **Recommendation:** 
    *   Implement **SWR** or **React Query** for the frontend to cache these responses.
    *   Set a `Cache-Control: private, max-age=3600` header on the API response for static resource lists.

### 5. Scalability & State Management
**Finding: In-Memory Study Timers**
*   **Rating: MEDIUM**
*   **Analysis:** Module 5 mentions "Speaking prompts with recording timer." If the timer state is purely in-memory and the user refreshes or switches tabs, progress is lost.
*   **Recommendation:** 
    *   Persist "In-Progress" session states to `sessionStorage` (as per security requirements) to allow for UI resilience without hitting the DB for every second elapsed.

### 6. Memory Leaks
**Finding: Unmanaged Timers in Study/Gantt Modules**
*   **Rating: LOW**
*   **Analysis:** Gantt charts and practice test timers often use `setInterval`. If these are not cleaned up in `useEffect` return functions, they will leak memory as the admin navigates between the Immigration tab and the PT Client tabs.
*   **Recommendation:** 
    *   Strict enforcement of `clearInterval` in the `componentWillUnmount` equivalent.

---

### Performance-Optimized Implementation Strategy

| Feature | Optimization Technique |
| :--- | :--- |
| **Gantt Chart** | Use a lightweight library (like `frappe-gantt`) and load it only via dynamic import. |
| **Checklist** | Implement **Virtual Scrolling** (e.g., `react-window`) if the "16-page plan" results in >100 DOM nodes. |
| **Theme** | Ensure `styled-components` use the `Crystalline Swan` theme provider to avoid CSS duplication. |
| **Data** | Use a single `GET /api/admin/immigration/init` endpoint to hydrate the dashboard summary. |

### Final Rating: **STABLE (with Lazy Loading)**
The blueprint is architecturally sound for a private admin tool, provided the **Module 5 (Study Platform)** and **Module 7 (Timeline)** are treated as heavy "Plugins" rather than core UI code. This prevents the "Life-Critical" immigration tool from slowing down the "Business-Critical" personal training operations.

---

## [PASS] Competitive Intelligence
**Model:** minimax/minimax-m2.1 | **Duration:** 142.7s

# SwanStudios Product Strategy Report

## Executive Summary
SwanStudios is positioned as a high-end, tech-forward personal training SaaS leveraging a unique "Crystalline Swan" (Enchanted Apex) aesthetic and specialized AI integration (NASM, pain-aware). However, the provided codebase feature (Canada Immigration Tab) represents a significant strategic misalignment or a highly specialized "power user" tool that requires strict containment.

This report analyzes the fitness platform's market position against key competitors (Trainerize, TrueCoach, etc.) while addressing the specific architectural and feature implications of the provided code.

---

## 1. Feature Gap Analysis

**Context:** The provided code details a comprehensive Canada Immigration tracker. In the context of a Fitness SaaS, this is a non-standard feature. The analysis below identifies gaps based on the platform's implied fitness capabilities (NASM AI, pain-aware) versus the competitor set.

### A. Competitor Feature Gaps (Fitness Core)
Based on the "Differentiation strengths" mentioned (NASM AI, pain-aware), the platform is positioning itself as a premium, semi-automated coaching tool. However, to compete with market leaders, it likely lacks:

*   **Trainerize / TrueCoach:**
    *   **Nutrition Logging & Meal Planning:** Robust food tracking, macro calculator, and recipe integration are standard expectations. The current

---

## [PASS] User Research & Persona Alignment
**Model:** deepseek/deepseek-v3.2-20251201 | **Duration:** 38.9s

#

### docs/ai-workflow/blueprints/CANADA-IMMIGRATION-TAB-BLUEPRINT.md
```md
# Canada Immigration Tab — Master Blueprint

## Executive Summary
A secure, admin-only mini-application embedded within the SwanStudios admin dashboard that serves as a comprehensive immigration tracker, study platform, and action checklist for Sean & his wife's Canada immigration journey. Based on the 16-page "Canada Immigration AI Career & Personal Training Master Strategy" document.

**Priority:** LIFE-CRITICAL — Family safety motivation
**Target:** Apply as soon as possible, November 2026 midterm milestone
**Security:** Admin-only, RBAC-enforced, no public access whatsoever

---

## Architecture Overview

### Tab Location
- Admin Dashboard sidebar → "Canada Immigration" tab (maple leaf icon)
- Only visible to users with `role === 'admin'`
- No API endpoints exposed without admin JWT verification

### Data Storage
- New PostgreSQL table: `immigration_tasks` — tracks checklist items, completion status, notes, due dates
- New PostgreSQL table: `immigration_documents` — tracks document gathering (birth certs, CDIB, etc.)
- New PostgreSQL table: `study_progress` — tracks quiz scores, study sessions, practice test results
- All tables have `user_id` FK to admin user, encrypted sensitive fields

### Security Requirements
- All routes behind `authenticateToken` + `requireAdmin` middleware
- No sensitive data in localStorage — session-only
- Rate limiting on all endpoints
- Input sanitization (parameterized queries only — NO string interpolation)
- No document upload (just tracking status) to minimize attack surface

---

## Feature Breakdown — 7 Modules

### Module 1: Dashboard Overview
**The Command Center — shows progress at a glance**
- Overall progress percentage (tasks completed / total)
- Phase indicator (Phase 0/1/2/3) with current phase highlighted
- Next 5 priority action items
- Days until key milestones (IELTS test, TEF test, Express Entry submission)
- Motivational progress ring with Crystalline Swan styling

### Module 2: Master Checklist (Interactive)
**The core tracker — every action item from the 16-page plan**

#### Phase 0: IMMEDIATE (This Week)
- [ ] Complete online marriage application at ocweddings.ocrecorder.com
- [ ] Search Dawes Rolls on Ancestry.com for grandfather/father's name + roll number
- [ ] Get married at Anaheim OC Clerk-Recorder (222 S. Harbor Blvd)
- [ ] Get 3+ certified marriage certificate copies ($17 each)
- [ ] Call Chickasaw TGS: (580) 436-7250 — request CDIB application
- [ ] Order long-form birth certificates (yours + father's)
- [ ] Order father's death certificate (if applicable)
- [ ] Take free IELTS practice test at takeielts.britishcouncil.org
- [ ] Start Duolingo French + Pimsleur French (30 min each daily)

#### Phase 1: Foundation (Months 1-3)
- [ ] Submit CDIB application + all vital records to Chickasaw Nation
- [ ] Book IELTS tests for both
- [ ] Start IBM GenAI Engineering Certificate on Coursera ($49/mo)
- [ ] Take IELTS test
- [ ] Get GED
- [ ] Submit wife's ECA for college degree
- [ ] Take AWS AI Practitioner exam ($100)
- [ ] Complete IBM GenAI cert
- [ ] Wife submits Express Entry as principal applicant

#### Phase 2: Momentum (Months 4-6)
- [ ] Start Azure AI-102 prep (free Microsoft Learn)
- [ ] Apply Ontario HCP + BC Tech PNP
- [ ] Add iTalki French tutoring 2-3x/week
- [ ] Apply Chickasaw citizenship once CDIB arrives
- [ ] Take Azure AI-102 exam ($165)
- [ ] Schedule ETC interview if citizenship card received

#### Phase 3: Advanced (Months 7-12)
- [ ] AWS ML Specialty prep + exam
- [ ] Intensive French practice
- [ ] Monitor IRCC Indigenous mobility updates
- [ ] Book TEF Canada test
- [ ] Take French practice exams
- [ ] Take TEF Canada
- [ ] Update Express Entry with French scores (+50 CRS)
- [ ] Evaluate Indigenous pathway status

Each item has:
- Checkbox (done/not done)
- Due date (absolute)
- Priority (P0/P1/P2)
- Notes field
- Link to relevant resource
- Owner (Sean / Wife / Both)
- Cost tracking

### Module 3: Document Tracker
**Track the status of every required document**

| Document | Status | Notes |
|----------|--------|-------|
| Sean's long-form birth certificate | Not Started / Ordered / Received | |
| Father's long-form birth certificate | Not Started / Ordered / Received | |
| Father's death certificate | Not Started / Ordered / Received | |
| Grandfather's birth/death certificates | Not Started / Ordered / Received | |
| Marriage certificate (3 copies) | Not Started / Ordered / Received | |
| CDIB Card | Not Started / Applied / Received | |
| Chickasaw Citizenship Card | Not Started / Applied / Received | |
| Enhanced Tribal Citizenship ID (ETC) | Not Started / Interview Scheduled / Received | |
| IELTS Results (Sean) | Not Started / Scheduled / Completed | Score: ___ |
| IELTS Results (Wife) | Not Started / Scheduled / Completed | Score: ___ |
| TEF Canada Results (Sean) | Not Started / Scheduled / Completed | NCLC: ___ |
| TEF Canada Results (Wife) | Not Started / Scheduled / Completed | NCLC: ___ |
| Wife's ECA (degree evaluation) | Not Started / Applied / Received | |
| Sean's GED | Not Started / Scheduled / Completed | |
| IBM GenAI Certificate | Not Started / In Progress / Completed | |
| AWS AI Practitioner | Not Started / Scheduled / Passed | |
| Azure AI-102 | Not Started / Studying / Passed | |
| AWS ML Specialty | Not Started / Studying / Passed | |
| Google Professional ML Engineer | Not Started / Studying / Passed | |
| Express Entry Profile | Not Created / Active / ITA Received | CRS: ___ |
| Ontario HCP | Not Started / Applied / Accepted | |
| BC Tech PNP | Not Started / Applied / Accepted | |

### Module 4: CRS Calculator
**Interactive Comprehensive Ranking System calculator**
- Age input with auto-decrement (shows CRS loss over time)
- Education dropdown (High school, Bachelor's, Master's, PhD)
- Language test score inputs (IELTS: L/R/W/S, TEF: NCLC)
- Work experience sliders (Canadian + foreign)
- Spouse factors (education, language, Canadian experience)
- Provincial nomination toggle (+600 CRS)
- Job offer toggle (+200 CRS)
- French bonus toggle (+50 CRS)
- Indigenous mobility toggle (if applicable)
- Real-time CRS score display
- Compare to latest Express Entry cut-off
- "What if" scenarios (e.g., "What if I get NCLC 7?")

### Module 5: Study Platform
**Integrated learning environment for language + AI certs**

#### IELTS Prep
- Practice test scoring (Listening, Reading, Writing, Speaking)
- Writing task 1/2 templates
- Speaking question bank
- Vocabulary builder

#### French (TEF Canada)
- NCLC level tracker
- Grammar drills
- Listening comprehension exercises
- Speaking practice log

#### AI Certifications
- IBM GenAI Engineering Certificate progress
- AWS AI Practitioner study notes
- Azure AI-102 study plan
- AWS ML Specialty flashcards

### Module 6: Cost Tracker
**Monitor all immigration-related expenses**
- IELTS test fees ($245 each)
- TEF Canada fees ($380 each)
- ECA fee ($220)
- GED test fees ($30 each)
- Coursera subscription ($49/mo)
- AWS exam fees ($100-$300)
- Azure exam fees ($165)
- Document ordering fees ($17-$30 each)
- iTalki tutoring costs
- Express Entry submission fee ($850)
- Right of Permanent Residence Fee ($515)
- Total spent vs budget

### Module 7: Timeline Visualizer
**Gantt-style view of all phases + deadlines**
- Phase 0 (red)
- Phase 1 (blue)
- Phase 2 (green)
- Phase 3 (purple)
- Milestone markers (IELTS, TEF, EE submission)
- Today line
- Zoom in/out
- Print view

---

## UI/UX Requirements

### Visual Design
- **Crystalline Swan theme** — use active palette, typography
- **Maple leaf icon** (Lucide React: <MapleLeaf />) for tab
- **Progress rings** with Ice Wing (#60C0F0) for completed, Arctic Cyan (#50A0F0) for remaining
- **Priority badges** — P0 (red), P1 (orange), P2 (yellow)
- **Phase cards** with distinct colors (Phase 0: red, Phase 1: blue, Phase 2: green, Phase 3: purple)
- **Status indicators** — Not Started (gray), In Progress (blue), Completed (green), Blocked (red)
- **Motivational quotes** — "Every step forward is a step toward safety"

### Interaction Design
- **Checklist items** — click to expand details, edit notes, mark complete
- **Document tracker** — click status to cycle through states (Not Started → Ordered → Received)
- **CRS calculator** — real-time updates as inputs change
- **Study platform** — interactive quizzes, score tracking
- **Cost tracker** — add expenses inline, see running total
- **Timeline** — drag-and-drop to reschedule (with validation)

### Responsive Behavior
- Desktop: Full dashboard with all modules visible
- Tablet: Stacked modules, timeline scrollable
- Mobile: Single-column, tabbed navigation between modules

---

## Implementation Notes

### Frontend Components
- `<ImmigrationDashboard />` — main container
- `<ProgressRing />` — animated SVG with gradient
- `<PhaseCard />` — collapsible checklist per phase
- `<DocumentTracker />` — table with clickable status cells
- `<CRSCalculator />` — form with live updates
- `<StudyPlatform />` — tabbed study modules
- `<CostTracker />` — expense list + budget bar
- `<TimelineVisualizer />` — Gantt chart with D3.js

### Backend Routes
- `GET /api/admin/immigration/dashboard` — progress stats
- `GET /api/admin/immigration/tasks` — all checklist items
- `PUT /api/admin/immigration/tasks/:id` — update task status/notes
- `GET /api/admin/immigration/documents` — all document statuses
- `PUT /api/admin/immigration/documents/:id` — update document status
- `GET /api/admin/immigration/study-progress` — study stats
- `POST /api/admin/immigration/study-session` — log study session
- `GET /api/admin/immigration/costs` — expense list
- `POST /api/admin/immigration/costs` — add expense
- `GET /api/admin/immigration/timeline` — timeline data
- `PUT /api/admin/immigration/timeline` — update timeline

### Styling
- Use styled-components with theme variables
- Progress rings: `linear-gradient(135deg, #60C0F0, #8B5CF6)`
- Priority badges: use `$priority-color` mapping
- Phase cards: distinct background colors with 20% opacity

---

## Success Metrics
- All Phase 0 tasks completed within 7 days
- IELTS tests booked within 30 days
- CDIB application submitted within 45 days
- CRS score > 500 within 6 months
- Express Entry profile created within 9 months
- ITA received within 12 months

---

## Risk Mitigation
- **Data loss** — daily encrypted backups to S3
- **Security breach** — no uploads, admin-only, rate limiting
- **Scope creep** — only immigration tracking, no document storage
- **Time constraints** — MVP with just checklist + document tracker

---

## Next Steps
1. **Database** — create migration for 3 new tables
2. **Backend** — implement routes with admin middleware
3. **Frontend** — build components with Crystalline Swan styling
4. **Testing** — admin-only access, data integrity
5. **Deployment** — to production (sswanstudios.com)

---

## Appendix: Color Mapping
- Phase 0: #FF6B6B (red)
- Phase 1: #4D96FF (blue)
- Phase 2: #6BCF7F (green)
- Phase 3: #9D4EDD (purple)
- Priority P0: #FF6B6B
- Priority P1: #FFA500
- Priority P2: #FFD93D
- Status Not Started: #A0AEC0
- Status In Progress: #60C0F0
- Status Completed: #6BCF7F
- Status Blocked: #FF6B6B

---

## Changelog
- **2025-04-01** — Initial blueprint created
- **2025-04-02** — Added security requirements, clarified no uploads
- **2025-04-03** — Added cost tracker module, refined checklist items
- **2025-04-04** — Added timeline visualizer, refined color mapping

---

## Footer
**SwanStudios — Admin Immigration Tracker**
*Version 1.0.0 — Blueprint*
*Last Updated: 2025-04-04*
*Owner: Sean Swan*
*Security Level: MAXIMUM — Family Safety*
```

---

## [PASS] Architecture & Bug Hunter
**Model:** minimax/minimax-m2.5-20260211 | **Duration:** 60.3s

# Deep Architecture Review: Canada Immigration Tab Blueprint

**Reviewer:** Principal Software Engineer  
**Target:** `docs/ai-workflow/blueprints/CANADA-IMMIGRATION-TAB-BLUEPRINT.md`  
**Date:** 2025-01-13  
**Theme:** Crystalline Swan (RETIRED Galaxy-Swan: NOT USED ✓)

---

## Executive Summary

This document is a **specification/blueprint**, not implementation code. I will review the blueprint for architectural gaps, security concerns, implementation risks, and missing production-readiness criteria that would cause bugs if built as-specified.

**Overall Assessment:** MEDIUM-HIGH risk — The feature scope is well-defined, but critical implementation details are missing that will cause integration failures, security gaps, and maintenance nightmares.

---

## 1. Bug Detection (Specification-Level)

### 1.1 Race Conditions & Timing Issues

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **HIGH** | Module 1: Dashboard Overview | No handling for "days until milestone" when milestone date is in the past. Calculation could show negative days or undefined behavior. | Add guard: `const daysUntil = Math.max(0, Math.ceil((milestoneDate - now) / (1000 * 60 * 60 * 24)))` |
| **HIGH** | Module 4: CRS Calculator | "What if" scenarios mutate state without rollback capability. User cannot compare multiple scenarios simultaneously. | Implement scenario comparison with isolated state copies or URL-based state serialization |
| **MEDIUM** | Module 2: Master Checklist | No handling for task dependencies (e.g., cannot take IELTS until CDIB received). Users could check items out of order. | Add `dependsOn` field to task schema, enforce validation on check |
| **MEDIUM** | Module 7: Timeline | "Today indicator line" needs real-time updates. No mention of how often the current time updates (polling vs. WebSocket). | Specify update mechanism: `setInterval` every minute or CSS animation |

### 1.2 Null/Undefined Access Risks

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **HIGH** | Module 1: Progress Ring | `tasks completed / total` division by zero if no tasks seeded. | Add null guard: `const progress = totalTasks > 0 ? (completed / totalTasks) * 100 : 0` |
| **HIGH** | Module 3: Document Tracker | Score fields (IELTS Score: ___, NCLC: ___) stored as strings but used in calculations without parsing. | Use typed schema: `{ score: number \| null, validated: boolean }` |
| **MEDIUM** | Module 5: Study Platform | Audio files for French vocabulary could 404. No fallback for missing audio. | Add CDN validation on deploy, implement graceful fallback UI |

### 1.3 State Mutation & Closure Issues

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **MEDIUM** | Module 4: CRS Calculator | CRS score calculated client-side but no mention of server-side validation. User could manipulate DOM to fake scores. | Add server-side CRS recalculation on save, store raw inputs not computed values |
| **LOW** | Module 2: Checklist | Bulk operations (mark all complete) could cause race if user clicks rapidly. | Implement optimistic UI with rollback on failure |

---

## 2. Architecture Flaws

### 2.1 Missing Component Architecture

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **CRITICAL** | Entire Document | No component hierarchy defined. Cannot determine reusability, prop drilling, or state management needs. | Define: `App → ImmigrationTab → [Dashboard, Checklist, DocumentTracker, CRSCalculator, StudyPlatform, ResourceHub, Timeline]` |
| **CRITICAL** | Data Layer | No mention of state management (Redux, Zustand, Context, React Query). Study platform and checklist have different data needs. | Specify: React Query for server state, Zustand for UI state, Context for theme/auth |
| **HIGH** | Module 5: Study Platform | Progress tracking across IELTS, TEF, and certifications needs unified data model. Currently scattered across modules. | Create unified `StudySession` table with `type` enum: `IELTS \| TEF \| CERT` |

### 2.2 God Component Risk

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **HIGH** | Module 6: Resource Hub | All resources in single list with no pagination or virtualization. Will cause performance issues with 30+ links. | Implement virtualized list or pagination with category filters |
| **MEDIUM** | Module 7: Timeline | Gantt visualization with all phases, milestones, and tasks in single component. Will exceed 300 lines easily. | Break into: `TimelineContainer`, `PhaseLane`, `MilestoneMarker`, `TaskIndicator` |

### 2.3 Circular Dependencies

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **LOW** | Module 2 ↔ Module 7 | Checklist items link to timeline milestones, timeline clicks link to checklist. Bidirectional navigation without clear parent-child relationship. | Define explicit parent: Timeline is view of Checklist data, not peer |

---

## 3. Integration Issues

### 3.1 Frontend-Backend Contract Mismatches

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **CRITICAL** | API Specification | No API endpoints defined. Frontend cannot be built without contract. | Define OpenAPI spec: `GET/POST/PUT/DELETE /api/immigration/tasks`, `/documents`, `/study-progress`, `/crs-calculate` |
| **HIGH** | Module 4: CRS Calculator | "Compare against recent draw cutoffs" requires external data. No mention of data source or refresh strategy. | Add endpoint: `GET /api/immigration/draw-cutoffs` with IRCC scraper or manual update workflow |
| **HIGH** | Module 5: Study Platform | "Practice test score tracker with history graph" needs time-series data. No schema for historical scores. | Add `study_score_history` table: `(id, user_id, test_type, score, max_score, taken_at)` |

### 3.2 Missing Loading/Error States

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **HIGH** | All Modules | No mention of loading skeletons, error boundaries, or empty states. | Add to each module: `<LoadingSkeleton>`, `<ErrorBoundary>`, `<EmptyState message="No tasks yet">` |
| **MEDIUM** | Module 1: Dashboard | "Days until key milestones" could take time to calculate. No loading indicator specified. | Add: `isLoadingMilestones` state with spinner during calculation |

### 3.3 Data Transformation Inconsistencies

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **MEDIUM** | Module 3: Document Tracker | Status enum in blueprint: `Not Started / Ordered / Received`. Need consistent enum across all status fields. | Define shared enum: `DocumentStatus = 'NOT_STARTED' \| 'IN_PROGRESS' \| 'RECEIVED'` |
| **MEDIUM** | Module 2: Checklist | Priority listed as P0/P1/P2 but no numeric weight for sorting. | Add: `priority: 0 \| 1 \| 2` with sort comparator |

### 3.4 Route Guards

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **HIGH** | Tab Access | "Only visible to users with `role === 'admin'`" — client-side check only. Can be bypassed via direct URL access or DOM manipulation. | Implement server-side middleware on ALL routes, client-side is UX only |
| **MEDIUM** | Module 4: CRS Calculator | No mention of whether CRS data is per-user or shared. If shared, users could see others' data. | Add `user_id` FK to all tables, enforce in queries |

---

## 4. Dead Code & Tech Debt

### 4.1 Incomplete Specifications

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **HIGH** | Phase 0 Timeline | "This Week" — no specific dates. November 2026 target mentioned but not integrated. | Add explicit dates: `dueDate: '2025-01-20'` for each Phase 0 item |
| **MEDIUM** | Phase 1-3 | "Months 1-3", "Months 4-6", "Months 7-12" — relative to what? Need anchor date. | Add: `phaseStartDate: '2025-02-01'` as project anchor |
| **MEDIUM** | Module 5: AI Certs | "Google Professional ML Engineer" listed but no study guide content defined. | Remove or mark as "Future Phase" to avoid dead feature |

### 4.2 Duplicated Logic

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **MEDIUM** | Module 2 & 3 | Task completion tracking (Module 2) and document status (Module 3) both track progress. Could be unified. | Consider: Documents are special type of task with `category: 'DOCUMENT'` |
| **LOW** | Module 5 | IELTS and TEF both have reading, listening, writing, speaking sections. Duplicated UI components. | Create reusable: `<LanguagePracticeSection type="IELTS\|TEF">` |

---

## 5. Production Readiness

### 5.1 Security Concerns

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **CRITICAL** | Module 6: Resource Hub | External links to Ancestry.com, IRCC portal, third-party sites. No `rel="noopener noreferrer"` — tabnabbing vulnerability. | Enforce: `<a href={url} target="_blank" rel="noopener noreferrer">` |
| **HIGH** | Data Storage | "Encrypted sensitive fields" mentioned but no encryption algorithm specified. | Specify: AES-256-GCM for fields like CDIB number, scores |
| **HIGH** | Module 4: CRS Calculator | CRS score is life-critical for immigration. No audit trail of score changes. | Add: `crs_score_history` table with `changed_by`, `changed_at` |
| **MEDIUM** | All Routes | "Rate limiting" mentioned but no threshold specified. Could be too aggressive or too lenient. | Specify: `windowMs: 60000, max: 100` for read, `max: 20` for write |
| **MEDIUM** | Input Validation | "Input validation on all form fields" — no specifics. CRS calculator accepts any number. | Add: `score: z.number().min(0).max(9).refine(n => n % 0.5 === 0)` for IELTS |

### 5.2 Hardcoded Values

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **HIGH** | Module 2: Checklist | Phone numbers, URLs, costs hardcoded in checklist items. Costs will change over time. | Externalize to `config/immigration constants.ts`: `IELTS_COST: 300, CDIB_PHONE: '...'` |
| **MEDIUM** | Module 6: Resource Hub | All URLs hardcoded. No environment-specific URLs for staging vs production. | Use environment variables: `process.env.IELTS_REGISTRATION_URL` |

### 5.3 Missing Production Features

| Severity | Location | What's Wrong | Fix |
|----------|----------|--------------|-----|
| **HIGH** | Logging | No mention of logging user actions (checked task, viewed CRS score). Required for security audit. | Add: `logger.info('immigration_task_updated', { userId, taskId, action })` |
| **HIGH** | Monitoring | No mention of Sentry, DataDog, or error tracking. | Integrate: Sentry for frontend errors, Winston+Pino for backend |
| **MEDIUM** | Notifications | "Notification reminders for upcoming deadlines" mentioned in Phase D but no implementation details. | Specify: Email notifications via existing SES, or in-app notification system |
| **MEDIUM** | Data Export | "PDF report of progress" — no library specified. | Use: `react-pdf` or `jspdf` with Crystalline Swan branding |

---

## 6. Additional Critical Gaps

### 6.1 Accessibility (A11y)

| Severity | Issue | Fix |
|----------|-------|-----|
| **HIGH** | Checklist checkboxes need ARIA labels | Add: `aria-label="Mark ${task.title} as complete"` |
| **HIGH** | Progress ring needs screen reader alternative | Add: `<span className="sr-only">Progress: ${percentage}% complete</span>` |
| **MEDIUM** | Timeline needs keyboard navigation | Implement: Arrow keys to move between milestones |

### 6.2 Database Schema Issues

| Severity | Issue | Fix |
|----------|-------|-----|
| **HIGH** | No migration files specified | Create: `migrations/20250113000000_create_immigration_tables.sql` |
| **MEDIUM** | No indexes defined | Add: `CREATE INDEX idx_immigration_tasks_user_id ON immigration_tasks(user_id)` |
| **MEDIUM** | No foreign key constraints specified | Add: `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE` |

### 6.3 Testing Strategy

| Severity | Issue | Fix |
|----------|-------|-----|
| **HIGH** | No testing requirements | Specify: Unit tests for CRS calculator, integration tests for API, E2E for critical paths |
| **MEDIUM** | No mention of test data | Create: `seeds/immigration_tasks_seed.sql` with Phase 0-3 items |

---

## Summary: Critical Action Items

| Priority | Action | File to Create |
|----------|--------|----------------|
| **1** | Define REST API contract (OpenAPI) | `docs/api/immigration-api.yaml` |
| **2** | Create database migrations | `migrations/*immigration*.sql` |
| **3** | Specify state management approach | `docs/architecture/state-management.md` |
| **4** | Externalize hardcoded config | `config/immigration-constants.ts` |
| **5** | Add input validation library (Zod) | Integration spec |
| **6** | Define error boundaries & loading states | Component specs |
| **7** | Add audit logging to backend | Middleware spec |
| **8** | Specify notification system | `docs/architecture/notifications.md` |

---

## Conclusion

The blueprint provides excellent **feature scope** but lacks **implementation depth**. Building from this spec will result in:
- Integration failures (no API contract)
- Security gaps (incomplete validation, no audit trail)
- Maintenance burden (hardcoded values, no testing strategy)
- Performance issues (no pagination, virtualization)

**Recommendation:** Do not proceed to implementation until API contract, database schema, and state management approach are defined. This is a **HIGH RISK** build without these specifications.

---

*Review conducted with Crystalline Swan theme compliance. Galaxy-Swan theme correctly NOT referenced.*

---

## [FAIL] Frontend UI/UX Expert
**Model:** gemini-3.1-pro-preview | **Duration:** 25.8s

Error: Google GenAI 503: {
  "error": {
    "code": 503,
    "message": "This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.",
    "status": "UNAVAILABLE"
  }
}


---

## Aggregate Summary

### Critical Findings
**UX & Accessibility:**
- As a UX and accessibility expert auditor, I've reviewed the `CANADA-IMMIGRATION-TAB-BLUEPRINT.md` document for SwanStudios. This blueprint outlines a critical internal tool, and while it's not a public-facing feature, adherence to best practices in UX and accessibility is still crucial for the admin user's efficiency, well-being, and to prevent errors in a "LIFE-CRITICAL" application.
- *   **Details:** The blueprint doesn't explicitly mention gesture support, and for an admin tool, it's generally less critical than for a consumer app. Basic tap and scroll gestures will be implicitly supported.
- *   **Details:** The application is designed for an admin user (Sean & his wife) for a "LIFE-CRITICAL" journey. Efficiency is paramount.
- *   **Details:** This is a critical area for any interactive application, especially one tracking "LIFE-CRITICAL" progress.
- *   **Details:** The application is "LIFE-CRITICAL." Uncaught JavaScript errors or failed API calls must not crash the entire application or leave the user in a broken state.
**Code Quality:**
- marriage: 'colors.error', // Critical urgency
**Security:**
- The blueprint outlines a **life-critical** admin-only module for tracking immigration processes. While the design shows strong security awareness, several implementation risks exist due to the sensitive nature of immigration data (PII, tribal documentation, personal timelines).
- - **Data Sensitivity:** CRITICAL (contains PII, tribal documentation, personal timelines)
**Performance & Scalability:**
- The blueprint is architecturally sound for a private admin tool, provided the **Module 5 (Study Platform)** and **Module 7 (Timeline)** are treated as heavy "Plugins" rather than core UI code. This prevents the "Life-Critical" immigration tool from slowing down the "Business-Critical" personal training operations.
**User Research & Persona Alignment:**
- **Priority:** LIFE-CRITICAL — Family safety motivation
**Architecture & Bug Hunter:**
- **Overall Assessment:** MEDIUM-HIGH risk — The feature scope is well-defined, but critical implementation details are missing that will cause integration failures, security gaps, and maintenance nightmares.

### High Priority Findings
**UX & Accessibility:**
- *   **Details:** The blueprint mentions interactive elements like checkboxes, input fields, and navigation tabs. Without specific UI mockups or code, it's impossible to confirm proper ARIA usage. However, the complexity of the "Master Checklist" and "Document Tracker" tables, as well as the "CRS Score Calculator" with its "What if" scenarios, suggests a high need for well-implemented ARIA attributes.
- *   **Finding:** HIGH
- *   **Details:** The application is described as highly interactive with numerous form fields, checkboxes, links, and potentially complex widgets (e.g., interactive checklist, CRS calculator, study modules). Without explicit design for keyboard navigation, this can easily become a major barrier.
- *   Provide a clear and highly visible focus indicator (e.g., a distinct outline) for all interactive elements. The "Wing Purple #8B5CF6 (Glow Accent)" could be a good candidate for this, ensuring it has sufficient contrast.
- *   **Finding:** HIGH
**Code Quality:**
- | { type: 'HIGH_SCHOOL' }
- education: z.enum(['NONE', 'HIGH_SCHOOL', 'BACHELORS', 'MASTERS', 'PHD']),
**Security:**
- - **Issue:** Blueprint includes tracking of highly sensitive documents (birth certificates, death certificates, CDIB cards, marriage certificates, test scores)
- - **Overall Risk Level:** MEDIUM-HIGH (due to sensitive nature of immigration data)
- - **Compromise Impact:** HIGH (immigration data breach could have legal/financial consequences)
- Proceed with development but **implement all security recommendations before production deployment**. The sensitive nature of immigration data requires higher-than-normal security standards, even for admin-only functionality. Consider this module as requiring "enhanced security" classification within your application.
**Performance & Scalability:**
- *   **Rating: HIGH**
**Competitive Intelligence:**
- SwanStudios is positioned as a high-end, tech-forward personal training SaaS leveraging a unique "Crystalline Swan" (Enchanted Apex) aesthetic and specialized AI integration (NASM, pain-aware). However, the provided codebase feature (Canada Immigration Tab) represents a significant strategic misalignment or a highly specialized "power user" tool that requires strict containment.
**User Research & Persona Alignment:**
- - Phase indicator (Phase 0/1/2/3) with current phase highlighted
- - Education dropdown (High school, Bachelor's, Master's, PhD)
**Architecture & Bug Hunter:**
- **Overall Assessment:** MEDIUM-HIGH risk — The feature scope is well-defined, but critical implementation details are missing that will cause integration failures, security gaps, and maintenance nightmares.
- **Recommendation:** Do not proceed to implementation until API contract, database schema, and state management approach are defined. This is a **HIGH RISK** build without these specifications.

---

*SwanStudios Validation Orchestrator v8.0 — AI Village Edition*
*7 Validators: Gemini 2.5 Flash + Claude 4.5 Sonnet + DeepSeek V3.2 x2 + Gemini 3 Flash + MiniMax M2.1 + MiniMax M2.5 + Gemini 3.1 Pro*
