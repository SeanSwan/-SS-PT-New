# [Component Name] - Accessibility Specification

**Component:** [Component Name]
**Created:** [Date]
**Last Updated:** [Date]
**Assigned To:** ChatGPT-5 (QA Engineer)

---

## 📋 OVERVIEW

This file documents ALL accessibility requirements for [Component Name] to meet WCAG 2.1 Level AA compliance.

**Target:** 100% WCAG 2.1 AA compliance

---

## ♿ WCAG 2.1 AA COMPLIANCE CHECKLIST

### **1. Perceivable (Users can perceive the information)**

#### **1.1 Text Alternatives**

- [ ] All images have descriptive alt text
- [ ] Decorative images have `alt=""` (empty alt)
- [ ] Icon-only buttons have `aria-label`
- [ ] SVG icons have `<title>` elements

**Example:**
```tsx
// Good: Informative image
<img src="chart.png" alt="30-day progress chart showing 80% workout completion" />

// Good: Decorative image (swan logo in background)
<img src="swan-bg.png" alt="" role="presentation" />

// Good: Icon button
<button aria-label="Refresh data">
  <RefreshIcon />
</button>

// Good: SVG icon
<svg role="img" aria-labelledby="star-title">
  <title id="star-title">Achievement star</title>
  <path d="..." />
</svg>
```

---

#### **1.2 Time-Based Media**

- [ ] Video has captions (if applicable)
- [ ] Audio has transcripts (if applicable)
- [ ] Auto-playing media can be paused
- [ ] Media controls are keyboard accessible

**Example:**
```tsx
// Good: Video with captions
<video controls>
  <source src="workout-demo.mp4" type="video/mp4" />
  <track kind="captions" src="captions-en.vtt" srclang="en" label="English" />
</video>

// Good: Auto-play with pause control
<video autoPlay muted loop>
  <source src="background-animation.mp4" type="video/mp4" />
</video>
<button onClick={pauseVideo} aria-label="Pause background animation">Pause</button>
```

---

#### **1.3 Adaptable (Content can be presented in different ways)**

- [ ] Semantic HTML used (`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`)
- [ ] Heading hierarchy is logical (h1 → h2 → h3, no skipping levels)
- [ ] Lists use proper markup (`<ul>`, `<ol>`, `<li>`)
- [ ] Forms use `<label>` elements
- [ ] Tables have `<caption>` and proper headers (`<th>`)
- [ ] Reading order matches visual order
- [ ] Content makes sense without CSS

**Example:**
```tsx
// Good: Semantic structure
<main>
  <section aria-labelledby="progress-heading">
    <h2 id="progress-heading">Your Progress</h2>

    <article>
      <h3>This Week</h3>
      <ul>
        <li>Monday: Chest & Triceps</li>
        <li>Wednesday: Legs</li>
        <li>Friday: Back & Biceps</li>
      </ul>
    </article>
  </section>
</main>

// Good: Form with labels
<form>
  <label htmlFor="workout-name">Workout Name</label>
  <input id="workout-name" type="text" required />

  <label htmlFor="duration">Duration (minutes)</label>
  <input id="duration" type="number" min="5" max="180" />
</form>

// Good: Table with caption
<table>
  <caption>Monthly Workout Statistics</caption>
  <thead>
    <tr>
      <th scope="col">Month</th>
      <th scope="col">Workouts Completed</th>
      <th scope="col">Total Time</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>January</td>
      <td>15</td>
      <td>12 hours</td>
    </tr>
  </tbody>
</table>
```

---

#### **1.4 Distinguishable (Easy to see and hear)**

- [ ] Color contrast meets 4.5:1 for normal text
- [ ] Color contrast meets 3:1 for large text (18pt+ or 14pt+ bold)
- [ ] Color contrast meets 3:1 for UI components (borders, icons, focus states)
- [ ] Information not conveyed by color alone
- [ ] Text can be resized to 200% without loss of content
- [ ] Images of text avoided (use real text instead)
- [ ] Focus indicators are clearly visible (2px outline minimum)

**Galaxy-Swan Theme Contrast Requirements:**
```css
/* ✅ GOOD: Passes 4.5:1 contrast */
color: #ffffff; /* White text */
background: rgba(26, 26, 46, 0.95); /* Dark glass surface */

/* ✅ GOOD: Passes 3:1 contrast for large text */
font-size: 24px;
font-weight: 600;
color: #e0e0ff; /* Light purple text */
background: rgba(42, 31, 74, 0.90); /* Medium dark glass */

/* ❌ BAD: Fails contrast (only 2.1:1) */
color: #a855f7; /* Cosmic purple */
background: rgba(168, 85, 247, 0.20); /* Light purple glass */

/* ✅ GOOD: Focus indicator */
&:focus {
  outline: 2px solid #06b6d4; /* Cosmic cyan */
  outline-offset: 2px;
}
```

**Color-Blind Friendly:**
```tsx
// ❌ BAD: Color only (red/green status)
<div style={{ color: isComplete ? 'green' : 'red' }}>
  {isComplete ? 'Complete' : 'Incomplete'}
</div>

// ✅ GOOD: Color + icon + text
<div style={{ color: isComplete ? 'green' : 'red' }}>
  {isComplete ? (
    <>
      <CheckIcon aria-hidden="true" /> Complete
    </>
  ) : (
    <>
      <WarningIcon aria-hidden="true" /> Incomplete
    </>
  )}
</div>
```

**Contrast Checking Tools:**
- WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
- Chrome DevTools: Lighthouse Accessibility Audit
- axe DevTools browser extension

---

### **2. Operable (Users can operate the interface)**

#### **2.1 Keyboard Accessible**

- [ ] All functionality available via keyboard
- [ ] No keyboard traps (can Tab in and out)
- [ ] Focus order is logical
- [ ] Skip link available to bypass navigation
- [ ] Keyboard shortcuts don't conflict with screen readers

**Tab Order:**
```tsx
// Good: Logical tab order (top-to-bottom, left-to-right)
<form>
  <input tabIndex={0} id="first-name" /> {/* Tab 1 */}
  <input tabIndex={0} id="last-name" />  {/* Tab 2 */}
  <input tabIndex={0} id="email" />      {/* Tab 3 */}
  <button tabIndex={0}>Submit</button>   {/* Tab 4 */}
</form>

// Good: Skip link (first focusable element)
<a href="#main-content" className="skip-link">
  Skip to main content
</a>
<nav>...</nav>
<main id="main-content">...</main>
```

**Keyboard Shortcuts:**
```tsx
// Good: Common keyboard patterns
- Tab: Next focusable element
- Shift+Tab: Previous focusable element
- Enter/Space: Activate button
- Escape: Close modal/dropdown
- Arrow keys: Navigate within component (tabs, dropdown, slider)
- Home/End: Jump to first/last item
```

**Testing:**
```
Manual Test: Navigate entire component using only keyboard
1. Tab through all interactive elements
2. Verify focus is always visible
3. Verify no keyboard traps
4. Verify all actions can be performed
5. Verify modal/dropdown can be closed with Escape
```

---

#### **2.2 Enough Time**

- [ ] No time limits (or adjustable time limits with warning)
- [ ] Auto-playing content can be paused
- [ ] Auto-updating content can be paused (e.g., live data)
- [ ] Session timeout warnings given 20 seconds before timeout

**Example:**
```tsx
// Good: Session timeout warning
const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);

useEffect(() => {
  const warningTimer = setTimeout(() => {
    setShowTimeoutWarning(true); // Show warning 20 seconds before timeout
  }, SESSION_TIMEOUT - 20000);

  return () => clearTimeout(warningTimer);
}, []);

{showTimeoutWarning && (
  <div role="alert" aria-live="assertive">
    Your session will expire in 20 seconds. Would you like to stay logged in?
    <button onClick={extendSession}>Stay Logged In</button>
  </div>
)}
```

---

#### **2.3 Seizures and Physical Reactions**

- [ ] No content flashes more than 3 times per second
- [ ] No large flashing areas (anything larger than 25% of viewport)
- [ ] Parallax scrolling is minimal (or can be disabled)
- [ ] Animations can be disabled (`prefers-reduced-motion`)

**Example:**
```css
/* Good: Respect prefers-reduced-motion */
.animated-element {
  animation: slide-in 0.3s ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .animated-element {
    animation: none; /* Disable animation */
    transition: none; /* Disable transitions */
  }
}
```

```tsx
// Good: Check user preference
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

<motion.div
  animate={prefersReducedMotion ? {} : { x: [0, 100, 0] }}
  transition={{ duration: 2, repeat: Infinity }}
>
  Animated content
</motion.div>
```

---

#### **2.4 Navigable (Users can navigate and find content)**

- [ ] Page title is descriptive (`<title>` tag)
- [ ] Focus order matches visual order
- [ ] Link text is descriptive (no "click here")
- [ ] Multiple ways to find pages (nav, search, sitemap)
- [ ] Current page is indicated in navigation
- [ ] Headings are descriptive
- [ ] Focus is visible on all interactive elements
- [ ] Breadcrumbs provided (if applicable)

**Example:**
```tsx
// Good: Descriptive page title
<Helmet>
  <title>Your Progress - Last 30 Days | SwanStudios</title>
</Helmet>

// ❌ BAD: Generic link text
<a href="/workouts">Click here</a>

// ✅ GOOD: Descriptive link text
<a href="/workouts">View all workouts</a>

// Good: Current page indication
<nav>
  <a href="/dashboard" aria-current={currentPath === '/dashboard' ? 'page' : undefined}>
    Dashboard
  </a>
  <a href="/workouts" aria-current={currentPath === '/workouts' ? 'page' : undefined}>
    Workouts
  </a>
</nav>

// Good: Breadcrumbs
<nav aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Home</a></li>
    <li><a href="/workouts">Workouts</a></li>
    <li aria-current="page">Upper Body Strength</li>
  </ol>
</nav>
```

---

#### **2.5 Input Modalities**

- [ ] Touch targets are at least 44x44px (mobile)
- [ ] Touch targets have 8px spacing between them
- [ ] Pointer gestures have keyboard alternatives
- [ ] Motion-based controls have non-motion alternatives
- [ ] Click target is entire button area (not just icon)

**Example:**
```css
/* Good: Touch target size */
.mobile-button {
  min-width: 44px;
  min-height: 44px;
  padding: 12px 16px;
}

/* Good: Touch target spacing */
.button-group button {
  margin-right: 8px;
}

/* Good: Large click area */
.card-link {
  display: block; /* Entire card is clickable */
  padding: 16px;
}
```

```tsx
// ❌ BAD: Click target too small
<button style={{ padding: '4px' }}>
  <SmallIcon /> {/* Only 16x16px */}
</button>

// ✅ GOOD: Large click target
<button style={{ padding: '12px 16px', minWidth: '44px', minHeight: '44px' }}>
  <SmallIcon />
</button>

// Good: Swipe gesture with keyboard alternative
<div onSwipeLeft={goToNextSlide}>
  <button onClick={goToNextSlide}>Next</button> {/* Keyboard accessible */}
</div>
```

---

### **3. Understandable (Users can understand the information)**

#### **3.1 Readable**

- [ ] Language of page is declared (`<html lang="en">`)
- [ ] Language changes are marked (`<span lang="es">Hola</span>`)
- [ ] Text is written at 8th-grade reading level (where possible)
- [ ] Abbreviations are defined on first use

**Example:**
```tsx
// Good: Page language
<html lang="en">
  <head>...</head>
  <body>...</body>
</html>

// Good: Language change
<p>
  Welcome to SwanStudios!
  <span lang="es">Bienvenido</span>
</p>

// Good: Abbreviation definition
<p>
  Use <abbr title="Repetition Maximum">RM</abbr> to determine workout intensity.
</p>
```

---

#### **3.2 Predictable**

- [ ] Navigation is consistent across pages
- [ ] Components behave consistently
- [ ] Focus doesn't change automatically (without user action)
- [ ] Forms don't submit on focus change
- [ ] Changes are announced before they happen

**Example:**
```tsx
// ❌ BAD: Auto-submit on focus change
<select onChange={submitForm}>
  <option>Option 1</option>
  <option>Option 2</option>
</select>

// ✅ GOOD: Explicit submit button
<select onChange={updateSelection}>
  <option>Option 1</option>
  <option>Option 2</option>
</select>
<button onClick={submitForm}>Apply Filter</button>

// Good: Announce changes
<div role="status" aria-live="polite">
  Filter applied: Showing 15 workouts
</div>
```

---

#### **3.3 Input Assistance**

- [ ] Form errors are clearly identified
- [ ] Labels and instructions are provided
- [ ] Error suggestions are given
- [ ] Important actions have confirmation
- [ ] Errors can be corrected before submission

**Example:**
```tsx
// Good: Form validation with clear errors
<form onSubmit={handleSubmit}>
  <label htmlFor="email">Email *</label>
  <input
    id="email"
    type="email"
    required
    aria-required="true"
    aria-invalid={errors.email ? 'true' : 'false'}
    aria-describedby={errors.email ? 'email-error' : undefined}
  />
  {errors.email && (
    <div id="email-error" role="alert">
      <strong>Error:</strong> Please enter a valid email address (e.g., name@example.com)
    </div>
  )}

  <button type="submit">Submit</button>
</form>

// Good: Confirmation for destructive action
const handleDelete = () => {
  if (window.confirm('Are you sure you want to delete this workout? This action cannot be undone.')) {
    deleteWorkout();
  }
};

// Good: Review before submit
<form>
  {/* ... form fields ... */}

  <section aria-labelledby="review-heading">
    <h3 id="review-heading">Review Your Information</h3>
    <dl>
      <dt>Name:</dt>
      <dd>{formData.name}</dd>
      <dt>Email:</dt>
      <dd>{formData.email}</dd>
    </dl>
  </section>

  <button type="submit">Confirm and Submit</button>
</form>
```

---

### **4. Robust (Content works with assistive technologies)**

#### **4.1 Compatible**

- [ ] Valid HTML (no duplicate IDs, proper nesting)
- [ ] ARIA attributes used correctly
- [ ] Name, Role, Value provided for custom components
- [ ] Status messages announced to screen readers

**Example:**
```tsx
// Good: Valid HTML
<ul>
  <li>Item 1</li>
  <li>Item 2</li>
</ul>

// ❌ BAD: Invalid nesting
<p>
  <div>Invalid nesting</div>
</p>

// Good: Custom component with ARIA
<div
  role="button"
  tabIndex={0}
  aria-pressed={isActive}
  onClick={toggle}
  onKeyDown={(e) => e.key === 'Enter' && toggle()}
>
  Toggle Button
</div>

// Good: Status message
<div role="status" aria-live="polite" aria-atomic="true">
  Workout saved successfully
</div>

// Good: Alert message (interrupts screen reader)
<div role="alert" aria-live="assertive">
  Error: Unable to save workout. Please try again.
</div>
```

---

## 🔊 SCREEN READER SUPPORT

### **ARIA Live Regions**

**When to use:**
- Dynamic content updates (without page reload)
- Form validation errors
- Status messages
- Loading states

**Types:**
```tsx
// Polite: Waits for user to pause before announcing
<div role="status" aria-live="polite">
  Loading workouts...
</div>

// Assertive: Interrupts immediately (use sparingly)
<div role="alert" aria-live="assertive">
  Error: Connection lost. Retrying...
</div>

// Off: Don't announce (default)
<div aria-live="off">
  Decorative content
</div>
```

---

### **ARIA Labels vs. Visual Labels**

```tsx
// Good: Visual label matches ARIA label
<button aria-label="Close dialog">Close</button>

// Good: aria-labelledby references visual heading
<section aria-labelledby="progress-heading">
  <h2 id="progress-heading">Your Progress</h2>
  {/* ... content ... */}
</section>

// Good: aria-describedby for additional context
<button
  aria-label="Delete workout"
  aria-describedby="delete-description"
>
  <TrashIcon />
</button>
<span id="delete-description" hidden>
  This will permanently delete "Upper Body Strength" workout
</span>
```

---

### **Hidden Content**

```tsx
// Good: Visually hidden but screen reader accessible
<span className="sr-only">
  This text is only for screen readers
</span>

/* CSS for .sr-only */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

// Good: aria-hidden for decorative icons
<button>
  <StarIcon aria-hidden="true" />
  <span>Favorite</span>
</button>

// ❌ BAD: Hiding important content
<div style={{ display: 'none' }}>
  Important information
</div> {/* Hidden from everyone, including screen readers */}
```

---

## 🎯 COMPONENT-SPECIFIC REQUIREMENTS

### **Buttons**

- [ ] Use `<button>` element (not `<div>` with click handler)
- [ ] Has accessible name (text, aria-label, or aria-labelledby)
- [ ] Has clear focus indicator
- [ ] Disabled state is properly marked (`disabled` attribute)
- [ ] Loading state is announced

**Example:**
```tsx
// ✅ GOOD: Accessible button
<button
  onClick={handleSave}
  disabled={isSaving}
  aria-busy={isSaving}
>
  {isSaving ? 'Saving...' : 'Save Workout'}
</button>

// ❌ BAD: Div as button
<div onClick={handleSave}>Save</div>
```

---

### **Links**

- [ ] Use `<a>` element (not `<button>` styled as link)
- [ ] Has `href` attribute
- [ ] Link text is descriptive
- [ ] External links indicated
- [ ] Opens in new tab announced

**Example:**
```tsx
// Good: Descriptive link
<a href="/workouts">View all workouts</a>

// Good: External link
<a href="https://example.com" target="_blank" rel="noopener noreferrer">
  Visit Example.com
  <span className="sr-only">(opens in new tab)</span>
</a>
```

---

### **Modals/Dialogs**

- [ ] Focus trapped inside modal
- [ ] Escape key closes modal
- [ ] Focus returns to trigger element on close
- [ ] Background content inert (aria-hidden)
- [ ] Modal has `role="dialog"` and `aria-modal="true"`
- [ ] Modal is labeled (`aria-labelledby`)

**Example:**
```tsx
// Good: Accessible modal
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-description"
>
  <h2 id="dialog-title">Delete Workout</h2>
  <p id="dialog-description">
    Are you sure you want to delete "Upper Body Strength"? This action cannot be undone.
  </p>

  <button onClick={handleDelete}>Delete</button>
  <button onClick={handleClose}>Cancel</button>
</div>

// Trap focus inside modal
useEffect(() => {
  if (isOpen) {
    const focusableElements = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    firstElement.focus();

    const handleTab = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }
}, [isOpen]);
```

---

### **Forms**

- [ ] All inputs have labels
- [ ] Required fields marked (`required` + `aria-required`)
- [ ] Error messages associated with inputs (`aria-describedby`)
- [ ] Fieldsets group related inputs
- [ ] Form submission confirmed

**Example:**
```tsx
// Good: Accessible form
<form onSubmit={handleSubmit} aria-labelledby="form-title">
  <h2 id="form-title">Create New Workout</h2>

  <fieldset>
    <legend>Workout Details</legend>

    <label htmlFor="workout-name">
      Workout Name *
    </label>
    <input
      id="workout-name"
      type="text"
      required
      aria-required="true"
      aria-invalid={errors.name ? 'true' : 'false'}
      aria-describedby={errors.name ? 'name-error' : 'name-help'}
    />
    <span id="name-help">Choose a memorable name for your workout</span>
    {errors.name && (
      <span id="name-error" role="alert">
        <strong>Error:</strong> {errors.name}
      </span>
    )}
  </fieldset>

  <button type="submit">Create Workout</button>
</form>
```

---

### **Tables**

- [ ] Has `<caption>` describing table purpose
- [ ] Column headers use `<th scope="col">`
- [ ] Row headers use `<th scope="row">`
- [ ] Complex tables use `id` and `headers` attributes

**Example:**
```tsx
// Good: Accessible table
<table>
  <caption>Monthly Workout Statistics for 2025</caption>
  <thead>
    <tr>
      <th scope="col">Month</th>
      <th scope="col">Workouts</th>
      <th scope="col">Total Time</th>
      <th scope="col">Calories</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">January</th>
      <td>15</td>
      <td>12 hours</td>
      <td>8,400</td>
    </tr>
    <tr>
      <th scope="row">February</th>
      <td>18</td>
      <td>15 hours</td>
      <td>10,200</td>
    </tr>
  </tbody>
</table>
```

---

### **Charts/Data Visualizations**

- [ ] Alternative text describes chart
- [ ] Data available in table format
- [ ] Color not only means of conveying information
- [ ] Interactive elements keyboard accessible

**Example:**
```tsx
// Good: Accessible chart
<figure>
  <figcaption id="chart-caption">
    Progress Chart: Workout completion over last 30 days, showing 80% completion rate
  </figcaption>

  <div role="img" aria-labelledby="chart-caption">
    <LineChart data={progressData} />
  </div>

  <details>
    <summary>View data as table</summary>
    <table>
      <caption>30-Day Workout Progress Data</caption>
      <thead>
        <tr>
          <th scope="col">Date</th>
          <th scope="col">Workouts Completed</th>
        </tr>
      </thead>
      <tbody>
        {progressData.map(item => (
          <tr key={item.date}>
            <th scope="row">{item.date}</th>
            <td>{item.completed}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </details>
</figure>
```

---

## ✅ TESTING CHECKLIST

### **Manual Testing**

- [ ] **Keyboard Navigation:** Tab through entire component, verify all interactive elements accessible
- [ ] **Screen Reader:** Test with NVDA (Windows) or VoiceOver (Mac)
- [ ] **Zoom:** Zoom to 200%, verify no content loss
- [ ] **Color Blindness:** Use color blindness simulator
- [ ] **Touch Targets:** Test on mobile, verify all targets 44x44px+
- [ ] **Reduced Motion:** Enable prefers-reduced-motion, verify animations disabled

---

### **Automated Testing**

#### **axe-core (Jest + React Testing Library)**

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

it('has no accessibility violations', async () => {
  const { container } = render(<ComponentName />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

---

#### **Playwright (E2E Accessibility Testing)**

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('has no accessibility violations', async ({ page }) => {
  await page.goto('https://swanstudios.com/[page]');

  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});
```

---

### **Browser DevTools**

- [ ] **Chrome Lighthouse:** Run accessibility audit, score 100/100
- [ ] **Firefox Accessibility Inspector:** Check for issues
- [ ] **axe DevTools Extension:** Scan page for violations

---

## 📊 ACCESSIBILITY STATEMENT

**Include in footer or dedicated page:**

```markdown
# Accessibility Statement

SwanStudios is committed to ensuring digital accessibility for people with disabilities. We are continually improving the user experience for everyone and applying the relevant accessibility standards.

## Conformance Status

The Web Content Accessibility Guidelines (WCAG) define requirements to improve accessibility for people with disabilities. We aim to conform to WCAG 2.1 Level AA.

## Feedback

We welcome your feedback on the accessibility of SwanStudios. Please let us know if you encounter accessibility barriers:

- **Email:** accessibility@swanstudios.com
- **Phone:** [Phone number]

We try to respond to feedback within 2 business days.

## Technical Specifications

SwanStudios relies on the following technologies to work with assistive technologies:

- HTML
- CSS
- JavaScript
- ARIA (Accessible Rich Internet Applications)

## Limitations and Alternatives

Despite our best efforts to ensure accessibility, there may be some limitations. If you experience difficulty, please contact our support team for assistance.

Last updated: [Date]
```

---

## 📚 RESOURCES

**WCAG 2.1 Guidelines:**
- https://www.w3.org/WAI/WCAG21/quickref/

**Testing Tools:**
- axe DevTools: https://www.deque.com/axe/devtools/
- WAVE: https://wave.webaim.org/
- WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/

**Screen Readers:**
- NVDA (Windows, free): https://www.nvaccess.org/
- JAWS (Windows, paid): https://www.freedomscientific.com/products/software/jaws/
- VoiceOver (Mac/iOS, built-in)
- TalkBack (Android, built-in)

**Best Practices:**
- MDN Accessibility: https://developer.mozilla.org/en-US/docs/Web/Accessibility
- A11y Project: https://www.a11yproject.com/
- Inclusive Components: https://inclusive-components.design/

---

## 📝 NOTES

**Assigned AI:** ChatGPT-5
**Review Status:** [ ] In Progress [ ] Complete [ ] Needs Revision
**Completion Date:** [Date]

**Known Accessibility Challenges:**
- [Any specific challenges for this component]
- [Workarounds or alternative approaches]

**Future Improvements:**
- [Planned enhancements to accessibility]
- [New WCAG 2.2 features to implement]