# SwanStudios Validation Handoff — Paste This Into Claude Code or Gemini

I just ran 7 parallel AI validators on these files: frontend/src/components/Footer/Footer.tsx

Here is a consolidated summary of all findings from the 7 AI reviewers. Please analyze these findings, prioritize them, create an action plan, and fix the CRITICAL and HIGH issues.

---

## Validator Results Summary

### UX & Accessibility (google/gemini-2.5-flash)
Here's a comprehensive audit of the provided `Footer.tsx` component, focusing on WCAG 2.1 AA compliance, mobile UX, design consistency, user flow friction, and loading states.

---

## Footer.tsx Audit Report

### 1. WCAG 2.1 AA Compliance

**CRITICAL**
*   **Color Contrast (SocialIcon hover state):** The `SocialIcon`'s `hover` state changes the `color` to `theme.colors.primary` and `border-color` to `${theme.colors.primary}60`. Depending on the specific `theme.colors.primary` and the `background.primary` (which is the footer's background), this contrast might fail. For instance, if `theme.colors.primary` is a light color on a dark background, increasing its opacity might not be enough to meet contrast requirements.
    *   **Recommendation:** Explicitly define `theme.colors.primary` and `theme.background.primary` values for a dark cosmic theme and test them with a contrast checker (e.g., WebAIM Contrast Checker). Ensure the hover state provides sufficient contrast against the background.

**HIGH**
*   **Keyboard Navigation (Social Icons):** The `SocialIcon` uses `<a>` tags, which are inherently focusable. However, the `Bluesky` icon uses a `<span>` inside the `<a>` for its text, which is not ideal for screen readers. While `aria-label="Bluesky"` is present on the `<a>`, the visual `B` might not be clearly associated with the label for all users.
    *   **Recommendation:** For the Bluesky icon, consider using an SVG icon similar to other social media icons, or ensure the `<span>` content is semantically hidden from screen readers if the `aria-label` is sufficient, or ensure the `aria-label` is very descriptive. A simple `B` might not be universally recognized.
*   **Focus Management (General):** While all interactive elements (`Link`, `a`) are inherently focusable, there's no explicit visual focus indicator defined for them beyond the default browser outline. The `&:hover` styles are present, but `&:focus-visible` is missing.
    *   **Recommendation:** Add `&:focus-visible` styles to all interactive elements (`FooterLink`, `SmallFooterLink`, `SocialIcon`) that match or enhance the hover styles to provide a clear visual indication for keyboard users.

**MEDIUM**
*   **Color Contrast (FooterLink, SmallFooterLink):** `color: ${({ theme }) => theme.text.muted};` for links. While `theme.text.muted` might pass contrast for body text, it's crucial for interactive elements like links to have sufficient contrast against the `theme.background.primary`. If `theme.text.muted` is too close to the background, it could fail.
    *   **Recommendation:** Verify the contrast ratio of `theme.text.muted` against `theme.background.primary` for all link states (normal, hover, focus, active).
*   **ARIA Labels (LogoImg):** The `LogoImg` has `alt="SwanStudios Logo"`. This is good. However, if the `LogoText` and `LogoTagline` are meant to be a single, cohesive brand identity for screen readers, they could benefit from being grouped with an `aria-label` on the `LogoCont

... (truncated — see full report)

---

### Code Quality (anthropic/claude-4.5-sonnet-20250929)
# Code Review: Footer.tsx

## Summary
Overall a well-structured, theme-aware footer component. The code demonstrates good TypeScript practices and proper styled-components usage. Main concerns are around performance optimizations and accessibility.

---

## Findings

### 1. Performance Anti-patterns

#### **MEDIUM** - Inline style object in SocialIcon
**Location:** Line 275
```tsx
<span style={{ fontWeight: 700, fontSize: '0.85rem' }}>B</span>
```
**Issue:** Inline style object is recreated on every render.

**Fix:**
```tsx
const BlueskyText = styled.span`
  font-weight: 700;
  font-size: 0.85rem;
`;

// Usage:
<SocialIcon ...>
  <BlueskyText>B</BlueskyText>
</SocialIcon>
```

---

#### **MEDIUM** - Inline style object in FooterHeading
**Location:** Line 316
```tsx
<FooterHeading style={{ marginTop: '1.5rem' }}>Hours</FooterHeading>
```
**Issue:** Creates new object on every render.

**Fix:**
```tsx
const FooterHeadingSpaced = styled(FooterHeading)`
  margin-top: 1.5rem;
`;

// Or use a prop:
const FooterHeading = styled.h4<{ $spaced?: boolean }>`
  /* existing styles */
  ${({ $spaced }) => $spaced && 'margin-top: 1.5rem;'}
`;
```

---

#### **LOW** - Missing memoization for animation variants
**Location:** Line 261
```tsx
animate={isInView ? { y: [0, -6, 0] } : {}}
transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
```
**Issue:** Animation objects recreated on every render (though minor impact).

**Fix:**
```tsx
import { useMemo } from 'react';

const EnhancedFooter: React.FC = () => {
  const footerRef = useRef<HTMLElement>(null);
  const isInView = useInView(footerRef, { once: true, amount: 0.1 });

  const logoAnimation = useMemo(() => ({
    animate: isInView ? { y: [0, -6, 0] } : {},
    transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' as const }
  }), [isInView]);

  return (
    <FooterContainer ref={footerRef}>
      {/* ... */}
      <LogoImg
        src={logoImage}
        alt="SwanStudios Logo"
        {...logoAnimation}
      />
    </FooterContainer>
  );
};
```

---

### 2. Accessibility Issues

#### **HIGH** - Missing accessible link text for external links
**Location:** Lines 268-283
```tsx
<SocialIcon href="..." target="_blank" rel="noopener noreferrer" aria-label="Facebook">
```
**Issue:** `target="_blank"` without warning to screen reader users that link opens in new tab.

**Fix:**
```tsx
// Add to aria-label
<SocialIcon 
  href="https://facebook.com/seanswantech" 
  target="_blank" 
  rel="noopener noreferrer" 
  aria-label="Facebook (opens in new tab)"
>
  <Facebook size={16} aria-hidden="true" />
</SocialIcon>
```

Also add `aria-hidden="true"` to decorative icons since the link has aria-label.

---

#### **MEDIUM** - Insufficient touch target size
**Location:** Line 141
```tsx
const SocialIcon = styled.a`
  width: 36px;
  height: 36px;
```
**Issue:** 36px is below the recommended 44px minimum touch target size (WCAG 2.5.5).

**Fix:**
```tsx
const SocialIcon = styled.a`
  width: 44px;  // Minim

... (truncated — see full report)

---

### Security (deepseek/deepseek-v3.2-20251201)
# Security Audit Report: SwanStudios Footer Component

## Executive Summary
The reviewed `Footer.tsx` component is a **static presentational component** with no dynamic data handling, API calls, or user input processing. As such, most security concerns typically found in web applications are not applicable to this specific file.

## Security Findings

### 1. **OWASP Top 10**
- **XSS**: **LOW** - No user-generated content or dynamic HTML injection present. All content is hardcoded.
- **Injection**: **NONE** - No database queries, command execution, or template injection vectors.
- **Broken Authentication**: **NONE** - No authentication logic in this component.
- **SSRF**: **NONE** - No server-side requests or URL processing.
- **Insecure Deserialization**: **NONE** - No serialized data handling.

### 2. **Client-side Security**
- **localStorage Secrets**: **NONE** - No localStorage usage.
- **Exposed API Keys**: **NONE** - No API keys or secrets in the component.
- **eval() Usage**: **NONE** - No eval() or similar dangerous functions.

### 3. **Input Validation**
- **Sanitization**: **NONE** - No user inputs to validate or sanitize.
- **Zod/Yup Schemas**: **N/A** - Not applicable for static content.

### 4. **CORS & CSP**
- **CORS Headers**: **N/A** - This is a frontend component; CORS is configured server-side.
- **CSP Compliance**: **MEDIUM** - External social media links are present but properly use `rel="noopener noreferrer"` to prevent tabnabbing attacks.

### 5. **Authentication**
- **JWT Handling**: **NONE** - No token storage or authentication logic.
- **Token Storage**: **NONE** - No token management.
- **Session Management**: **NONE** - No session-related operations.

### 6. **Authorization**
- **RBAC Enforcement**: **NONE** - No role-based access control logic.
- **Privilege Escalation**: **NONE** - No authorization checks.

### 7. **Data Exposure**
- **PII Leaks**: **LOW** - Contains public contact information (phone, email, location) which is intentionally displayed as business contact details.
- **Console Logs**: **NONE** - No console.log statements exposing sensitive data.
- **Network Responses**: **N/A** - No network requests.

## Positive Security Practices Observed

1. **External Link Security**: Social media links properly use:
   - `target="_blank"` with `rel="noopener noreferrer"` to prevent tabnabbing
   - `aria-label` for accessibility

2. **Static Content**: All content is hardcoded, eliminating injection risks.

3. **No Sensitive Data**: No API keys, tokens, or internal system information exposed.

## Recommendations

### CRITICAL (0)
- None identified in this component.

### HIGH (0)
- None identified in this component.

### MEDIUM (1)
1. **Consider Content Security Policy (CSP)**: Ensure the application's CSP properly restricts external resource loading for social media icons and other third-party content.

### LOW (2)
1. **Public PII Consideration**: While business contact information is intentionally public, ensure:
  

... (truncated — see full report)

---

### Performance & Scalability (google/gemini-3-flash-preview-20251217)
This performance and scalability review targets the `Footer.tsx` component within the SwanStudios React architecture.

### Executive Summary
The component is well-structured for a "Galaxy-Swan" theme, but it suffers from **bundle bloat** due to icon library imports and **rendering inefficiencies** caused by unnecessary animation triggers.

---

### 1. Bundle Size Impact
**Finding: Large Icon Library Import**
*   **Rating: MEDIUM**
*   **Issue:** Importing icons from `lucide-react` using the named import syntax (e.g., `import { Facebook, ... } from 'lucide-react'`) can sometimes lead to larger-than-necessary bundles if the build tool (Webpack/Vite) isn't perfectly configured for tree-shaking that specific library.
*   **Recommendation:** Use sub-path imports if your build size is a concern: `import Facebook from 'lucide-react/dist/esm/icons/facebook';`. Alternatively, ensure `sideEffects: false` is set in your `package.json`.

**Finding: Framer Motion in Static Component**
*   **Rating: LOW**
*   **Issue:** `framer-motion` is a heavy dependency (~30kb Gzipped). While used here for a simple "float" animation on the logo, loading the entire library for a footer that is often below the fold adds to the initial TBT (Total Blocking Time).
*   **Recommendation:** Use standard CSS keyframe animations for the logo "float" effect instead of `motion.img` to reduce JS execution overhead.

---

### 2. Render Performance
**Finding: `useInView` Triggering Re-renders**
*   **Rating: MEDIUM**
*   **Issue:** The `useInView` hook updates the component state when the footer enters the viewport. This triggers a full re-render of the entire Footer tree (including all links and text) just to start a logo animation.
*   **Recommendation:** Abstract the `LogoImg` into its own memoized sub-component that handles its own `useInView` logic. This prevents the entire footer from re-rendering when the user scrolls to the bottom.

---

### 3. Network Efficiency
**Finding: Unoptimized Asset Loading (Logo)**
*   **Rating: HIGH**
*   **Issue:** `import logoImage from '../../assets/Logo.png';` imports a static PNG. If this image is high-resolution, it impacts the LCP (Largest Contentful Paint) if the footer is visible on short pages, or simply wastes bandwidth.
*   **Recommendation:** 
    1.  Convert the logo to **WebP** format.
    2.  Add `loading="lazy"` to the `LogoImg` since the footer is almost never in the initial viewport.

---

### 4. Memory Leaks
**Finding: Animation Loop**
*   **Rating: LOW**
*   **Issue:** The `animate={isInView ? { y: [0, -6, 0] } : {}}` creates an infinite loop. While `framer-motion` handles cleanup well, infinite animations on hidden elements can occasionally cause minor main-thread jitter on low-end mobile devices.
*   **Recommendation:** Ensure the animation stops if the tab is backgrounded (Framer Motion does this by default, but worth noting for custom implementations).

---

### 5. Lazy Loading
**Finding: Below-the-Fold Component**
*   **Rating

... (truncated — see full report)

---

### Competitive Intelligence (minimax/minimax-m2.1)
Based on the `Footer.tsx` code and the provided context (SwanStudios tech stack, theme, and target market), here is a strategic product analysis.

---

# SwanStudios Product Strategy Analysis

## 1. Feature Gap Analysis
*Compared to industry leaders like Trainerize, TrueCoach, and My PT Hub.*

| Competitor Feature | Status in SwanStudios (Inferred) | Gap Recommendation |
| :--- | :--- | :--- |
| **Client / Workout Management** | Visible in "Programs" (Personal, Online). | **Critical Gap:** There is no prominent link to a "Client Portal," "Workout Builder," or "Trainer Dashboard" in the footer. Competitors rely on these for self-serve retention. |
| **Live Chat / Messaging** | Not explicitly listed. | **Critical Gap:** TrueCoach and Trainerize embed real-time messaging. The current "Contact" page implies email/manual work. Scaling to 10k users requires in-app messaging to reduce trainer burnout. |
| **Progress Tracking & Analytics** | Not listed in Quick Links. | **Opportunity:** Add a "Progress" or "Results" hub where clients can upload photos, log body metrics, and view graphs. This is a massive retention driver. |
| **Nutrition & Meal Logging** | "Nutrition Coaching" is a program, but software integration is unclear. | **Feature Add:** Integrate with MyFitnessPal or build a simple meal-logging database table. Competitors bundle this into the subscription. |
| **Mobile App (PWA/Native)** | Website is responsive (seen in media queries). | **Note:** A dedicated app is missing. While a PWA (Progressive Web App) via React is feasible, the footer currently directs to a website. Ensure the "Video Library" is mobile-optimized for offline viewing. |

---

## 2. Differentiation Strengths
*What unique value does this codebase deliver?*

1.  **"Galaxy-Swan" Aesthetic (The Premium UI):**
    *   **Observation:** The code reveals a high-effort UI (Framer Motion animations, custom gradients, glow effects).
    *   **Value:** Most competitors (Trainerize, TrueCoach) look like "clinical" SaaS tools—lots of white backgrounds and standard Bootstrap grids. SwanStudios’ dark mode and "Drama" font choices target a **premium, niche demographic** (high-end coaching, aesthetic coaches) that is willing to pay more for a "luxury" feel.

2.  **Privacy-First & Boutique Identity:**
    *   **Observation:** The footer lists `protonmail.com` and a specific location (Anaheim Hills).
    *   **Value:** This signals a move away from big-tech surveillance. While this might seem small, it builds trust with a specific subset of health-conscious consumers wary of Big Tech data harvesting. It differentiates from platforms that sell user data or use standard Gmail accounts.

3.  **Niche Specialization (NASM & Pain-Aware):**
    *   **Observation:** While not in the footer code, the prompt mentions "NASM AI integration" and "pain-aware training."
    *   **Value:** This positions SwanStudios not as a generic gym tool, but as a **medical/rehab-adjacent platform**. Competitors are genera

... (truncated — see full report)

---

### User Research & Persona Alignment (deepseek/deepseek-v3.2-20251201)
# SwanStudios Fitness SaaS Platform - Footer Component Analysis

## Executive Summary
The footer component demonstrates strong foundational design with premium aesthetics, but shows significant gaps in persona-specific messaging, trust signals, and retention features. While visually aligned with the Galaxy-Swan theme, it lacks targeted content for key user segments.

---

## 1. Persona Alignment Analysis

### **Primary Persona (Working Professionals 30-55)**
**Strengths:**
- "Excellence in Performance Training" tagline resonates with achievement-oriented professionals
- Professional contact information (phone, email) builds credibility
- Clean, organized layout appeals to busy professionals

**Gaps:**
- No mention of time-efficient solutions or work-life balance integration
- Missing corporate wellness or executive fitness programs
- No references to stress management or ergonomic training

### **Secondary Persona (Golfers)**
**Critical Gap:**
- No golf-specific program links or terminology
- Missing sport-specific training references
- No mention of swing mechanics, mobility, or golf performance metrics

### **Tertiary Persona (Law Enforcement/First Responders)**
**Critical Gap:**
- No certification program visibility
- Missing tactical fitness or job-specific training references
- No mention of department partnerships or compliance standards

### **Admin Persona (Sean Swan)**
**Strengths:**
- Professional branding consistency
- Multiple contact channels

**Gaps:**
- No direct trainer bio or certification display
- Missing "Meet the Trainer" or credentials section

---

## 2. Onboarding Friction Assessment

**Positive Elements:**
- Clear navigation structure
- Multiple contact methods
- Responsive design for mobile users

**Friction Points:**
- No "Get Started" or "Free Trial" call-to-action in footer
- Missing FAQ or Help Center link
- No visible "Schedule Consultation" button
- Complex email address (ProtonMail) may raise trust concerns for some users

---

## 3. Trust Signals Evaluation

**Present:**
- Established since 2018 (copyright date)
- Physical location (Anaheim Hills)
- Professional social media presence

**Missing Critical Elements:**
- **No certifications displayed** (NASM, etc.)
- **No testimonials or client success stories**
- **No security badges** (HIPAA compliance for health data)
- **No partner logos** or affiliations
- **No press/media mentions**
- **No satisfaction guarantees** or refund policies

---

## 4. Emotional Design & Galaxy-Swan Theme

**Strengths:**
- Premium gradient effects and glow elements
- Smooth animations (floating logo)
- Consistent color scheme with primary accent
- Professional typography hierarchy
- Subtle hover effects enhance interactivity

**Concerns:**
- Dark theme may not appeal to all demographics (especially 40+ users)
- "Cosmic" theme might not convey "medical" or "professional" credibility for first responders
- Missing motivational language or success-oriented messaging

---

## 5. Retention

... (truncated — see full report)

---

### Architecture & Bug Hunter (minimax/minimax-m2.5-20260211)
# Deep Code Review: Footer.tsx

## Executive Summary

The Footer component is generally well-structured with good theming, accessibility basics, and responsive design. However, I found **1 CRITICAL**, **2 HIGH**, **4 MEDIUM**, and **3 LOW** severity issues that need attention before production.

---

## 1. Bug Detection

### Finding #1: Hardcoded Year Causes Incorrect Copyright Display
| Severity | File & Line |
|----------|-------------|
| **HIGH** | Line ~370: `&copy; 2018 Swan Studios` |

**What's Wrong:**
The copyright year is hardcoded as "2018". This means the footer will incorrectly display "© 2018 Swan Studios" even in future years, making the site appear outdated.

**Fix:**
```tsx
// Replace static year with dynamic calculation
const currentYear = new Date().getFullYear();

// In the JSX:
<CopyrightText>
  &copy; {currentYear} Swan Studios. All Rights Reserved.
  {/* ... */}
</CopyrightText>
```

---

### Finding #2: Non-Functional Contact Links (Accessibility Failure)
| Severity | File & Lines |
|----------|--------------|
| **CRITICAL** | Lines 326-335: Contact items rendered as plain spans |

**What's Wrong:**
The phone number `(714) 947-3221` and email `loveswanstudios@protonmail.com` are rendered as `<span>` elements instead of proper `<a>` tags with `href="tel:"` and `href="mailto:"` attributes. This breaks:
- Click-to-call on mobile devices
- Copy-paste functionality
- Screen reader recognition as links
- Keyboard navigation

**Fix:**
```tsx
<ContactItem>
  <Phone />
  <a href="tel:+17149473221" style={{ color: 'inherit', textDecoration: 'none' }}>
    (714) 947-3221
  </a>
</ContactItem>
<ContactItem>
  <Mail />
  <a href="mailto:loveswanstudios@protonmail.com" style={{ color: 'inherit', textDecoration: 'none' }}>
    loveswanstudios@protonmail.com
  </a>
</ContactItem>
```

Alternatively, create a styled anchor:
```tsx
const ContactLink = styled.a`
  color: inherit;
  text-decoration: none;
  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`;
```

---

### Finding #3: Missing Image Fallback
| Severity | File & Line |
|----------|-------------|
| **MEDIUM** | Line ~272: `<LogoImg src={logoImage} ... />` |

**What's Wrong:**
No `onError` handler or fallback if `logoImage` fails to load. A broken logo image leaves users with a confusing empty space.

**Fix:**
```tsx
const [logoError, setLogoError] = useState(false);

<LogoImg
  src={logoError ? '/fallback-logo.png' : logoImage}
  alt="SwanStudios Logo"
  onError={() => setLogoError(true)}
  // ... existing props
/>
```

---

## 2. Architecture Flaws

### Finding #4: Hardcoded Configuration Data
| Severity | File & Lines |
|----------|--------------|
| **HIGH** | Lines 300-335, 370-375 |

**What's Wrong:**
Contact information (phone, email, address, business hours) and social media URLs are hardcoded directly in the component. This violates the principle of separating configuration from presentation and makes it impossible to:
- Update business info without code cha

... (truncated — see full report)


---

## Consolidated Priority Findings

### CRITICAL (fix immediately)
[UX & Accessibility] **CRITICAL**
[Security] This Footer component is a **static, presentation-only component** with no security-critical functionality. The primary considerations are:
[User Research & Persona Alignment] **Critical Gap:**
[User Research & Persona Alignment] **Critical Gap:**
[User Research & Persona Alignment] **Missing Critical Elements:**
[User Research & Persona Alignment] 3. **Enlarge Critical Text**
[User Research & Persona Alignment] The footer establishes strong visual branding but misses critical opportunities for conversion, trust-building, and persona-specific engagement. The component serves as a functional navigation element but doesn't actively contribute to user acquisition or retention goals.
[Architecture & Bug Hunter] The Footer component is generally well-structured with good theming, accessibility basics, and responsive design. However, I found **1 CRITICAL**, **2 HIGH**, **4 MEDIUM**, and **3 LOW** severity issues that need attention before production.
[Architecture & Bug Hunter] 1. **Fix #2 (CRITICAL):** Add `tel:` and `mailto:` links for accessibility

### HIGH (fix before next deploy)
[UX & Accessibility] **HIGH**
[UX & Accessibility] **HIGH**
[UX & Accessibility] **HIGH**
[UX & Accessibility] Overall, this is a solid foundation for a footer component, with a few key accessibility and mobile UX refinements needed to reach a higher standard.
[Code Quality] 1. **HIGH**: Add "(opens in new tab)" to external link aria-labels
[Performance & Scalability] *   **Rating: HIGH**
[Performance & Scalability] *   **Issue:** `import logoImage from '../../assets/Logo.png';` imports a static PNG. If this image is high-resolution, it impacts the LCP (Largest Contentful Paint) if the footer is visible on short pages, or simply wastes bandwidth.
[Competitive Intelligence] *   **Observation:** The code reveals a high-effort UI (Framer Motion animations, custom gradients, glow effects).
[Competitive Intelligence] *   **Value:** Most competitors (Trainerize, TrueCoach) look like "clinical" SaaS tools—lots of white backgrounds and standard Bootstrap grids. SwanStudios’ dark mode and "Drama" font choices target a **premium, niche demographic** (high-end coaching, aesthetic coaches) that is willing to pay more for a "luxury" feel.
[Competitive Intelligence] *   **Upsell:** Create "Micro-Courses" (e.g., "14-Day Back Pain Fix") sold for $29–$99, driving high-margin revenue without requiring trainer time.
[User Research & Persona Alignment] - Implement high contrast mode
[User Research & Persona Alignment] - Some users (especially 40+) may prefer higher contrast
[Architecture & Bug Hunter] 2. **Fix #1 (HIGH):** Make copyright year dynamic
[Architecture & Bug Hunter] 3. **Fix #3 (HIGH):** Extract configuration to maintainable location

### MEDIUM (fix this sprint)
[UX & Accessibility] **MEDIUM**
[UX & Accessibility] **MEDIUM**
[UX & Accessibility] **MEDIUM**
[Code Quality] 2. **MEDIUM**: Increase touch target size to 44px minimum
[Code Quality] 3. **MEDIUM**: Extract inline style objects to styled components
[Code Quality] 4. **MEDIUM**: Create DRY helper for repeated mobile centering pattern
[Security] - **CSP Compliance**: **MEDIUM** - External social media links are present but properly use `rel="noopener noreferrer"` to prevent tabnabbing attacks.
[Performance & Scalability] *   **Rating: MEDIUM**
[Performance & Scalability] *   **Rating: MEDIUM**
[Performance & Scalability] *   **Rating: MEDIUM**

---

## Your Task

1. Read through all 7 validator reports above
2. Identify which findings are real issues vs false positives
3. Prioritize: CRITICAL first, then HIGH, then MEDIUM
4. For each real issue, provide the exact fix (file, line, code change)
5. Group related fixes that can be done together
6. Implement the fixes in order of priority

Files reviewed: frontend/src/components/Footer/Footer.tsx
Project: SwanStudios (React + TypeScript + styled-components, Galaxy-Swan theme)
