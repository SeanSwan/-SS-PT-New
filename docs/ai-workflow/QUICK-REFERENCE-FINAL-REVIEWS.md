# Quick Reference: Getting Final 2 Reviews

**Current Status:** 3 of 5 AIs approved (60% consensus)
**Remaining:** Claude Desktop + Gemini Code Assist
**All Critical Issues:** ✅ RESOLVED

---

## Why We Need These Final 2 Reviews

### Claude Desktop (Orchestrator & Security Expert)
**Why critical:** Designated security expert role. While others touched on security, Claude Desktop provides dedicated OWASP ASVS L2 compliance validation.

**Focus areas:**
- Multi-tenant isolation verification
- Rate limiting strategy validation
- PII leakage check in homepage_stats cache
- Testimonials approval workflow security
- Overall system orchestration

### Gemini Code Assist (Frontend Expert)
**Why critical:** Designated React/frontend specialist. Deep validation of component patterns, hooks implementation, and alignment with GOLDEN-STANDARD-PATTERN.md.

**Focus areas:**
- React component structure (HeroSection, TrustPanel, SocialProofSection)
- Custom hooks strategy (useHomepageStats, useTestimonials)
- Carousel accessibility implementation
- Compound component pattern validation
- Performance optimization (lazy loading, React.memo, Suspense)

---

## Quick Start: Copy-Paste These Prompts

### For Claude Desktop

**Open Claude Desktop and paste:**

```
You are Claude Desktop, serving as the Orchestrator and Security Expert for SwanStudios.

PROJECT CONTEXT:
- Platform: Personal training + social media SaaS
- Tech Stack: React + TypeScript frontend, Node.js/Express + PostgreSQL backend
- Architecture: Multi-tenant with Row-Level Security (RLS)
- Current State: Post-MUI elimination, custom UI Kit with styled-components
- Security: OWASP ASVS L2 compliance required

YOUR ROLE:
1. Orchestrator: Ensure design fits overall system architecture
2. Security Expert: Identify authentication, authorization, and data protection concerns

IMPORTANT CONTEXT - WORK COMPLETED SO FAR:
3 of 5 AIs have already reviewed and approved this design:
- Claude Code (Integration): ✅ APPROVED - Architecture fit excellent, breaking changes minimal
- Roo Code (Backend): ✅ APPROVED - After adding Galaxy-Swan Theme Gate to prevent generic look
- ChatGPT-5 (QA): ✅ APPROVED - After accessibility enhancements and theme enforcement

ALL CRITICAL ISSUES HAVE BEEN RESOLVED:
1. Theme Compliance: Galaxy-Swan Theme Gate added (14 requirements including swan motifs, cosmic micro-interactions, elegant typography)
2. API Security: Cache-Control headers, rate limiting (100 req/15min/IP), ETag support, RLS documentation added
3. Accessibility: Carousel announcements, AA/AAA contrast, video captions, reduced motion support added
4. Database: Indexes optimized for testimonials and featured_videos tables
5. Documentation: Encoding artifacts cleaned

YOUR FOCUS:
Please validate the security and orchestration aspects that are your specialty:
1. OWASP ASVS L2 Compliance: Are the 3 new public endpoints secure?
2. Multi-tenant Isolation: homepage_stats is public - is this architecturally sound?
3. PII Leakage: Is there any risk of exposing sensitive data?
4. Rate Limiting: Is 100 req/15min per IP adequate to prevent scraping?
5. Testimonials Approval: Is the approved flag properly enforced?
6. Overall Orchestration: Does this design fit cohesively with existing SwanStudios architecture?

DESIGN TO REVIEW:
---
[NOW OPEN docs/ai-workflow/BRAINSTORM-CONSENSUS.md AND COPY LINES 430-1072 - THE ENTIRE "Homepage Hero Enhancement – Design Review" SECTION INCLUDING:
- Context & Background
- Complete wireframe with Galaxy-Swan motifs
- Visual Design Specifications (colors, typography, motion)
- User Stories with acceptance criteria
- Edge cases
- API Specification (all 3 endpoints with caching/security)
- Database Schema (all 3 tables with indexes)
- Component Structure
- Technical Requirements including Galaxy-Swan Theme Gate]
---

Please provide your review in this format:

### 🤖 Claude Desktop Review
Date: 2025-10-29 [current time]
Verdict: ✅ APPROVED / ⚠️ CONCERNS / ❌ BLOCKED

**Orchestrator Feedback:**
- [Architecture fit assessment]
- [Integration concerns]
- [System coherence evaluation]

**Security Feedback:**
- [OWASP ASVS L2 compliance check]
- [Authentication/Authorization concerns]
- [Data protection concerns]
- [XSS/CSRF/SQL injection risks]
- [Multi-tenant isolation validation]
- [Rate limiting adequacy]
- [PII leakage check]

**Questions:**
- [Any clarifying questions]

**Recommendations:**
- [Specific actionable improvements, if any]
```

---

### For Gemini Code Assist

**Open Gemini Code Assist and paste:**

```
You are Gemini Code Assist, serving as the Frontend Expert for SwanStudios.

PROJECT CONTEXT:
- Platform: Personal training + social media SaaS
- Frontend Stack: React 18 + TypeScript + Vite
- Styling: styled-components (NO Material-UI - fully eliminated)
- Design System: Galaxy-Swan theme with custom UI Kit
- Component Pattern: Compound components following GOLDEN-STANDARD-PATTERN.md
- Current State: Post-MUI elimination, all custom components

YOUR ROLE:
1. Ensure component structure follows React best practices
2. Validate accessibility (WCAG AA compliance)
3. Check performance optimization (lazy loading, memoization)
4. Verify responsive design and mobile-first approach
5. Ensure styled-components patterns are correct

IMPORTANT CONTEXT - WORK COMPLETED SO FAR:
3 of 5 AIs have already reviewed and approved this design:
- Claude Code (Integration): ✅ APPROVED - Follows existing React + styled-components pattern perfectly
- Roo Code (Backend): ✅ APPROVED - After adding Galaxy-Swan Theme Gate checklist
- ChatGPT-5 (QA): ✅ APPROVED - After accessibility enhancements (carousel announcements, AA/AAA contrast, reduced motion)

ALL CRITICAL ISSUES HAVE BEEN RESOLVED:
1. Theme Compliance: Galaxy-Swan Theme Gate enforces:
   - Display serif for H1/H2 (elegant typography)
   - Cosmic micro-interactions (120-180ms scale pulse, easeOutQuint)
   - Glass surfaces with gradient borders
   - Swan motifs (crest, wing dividers, constellation patterns)
   - No generic template visuals
2. Accessibility: Carousel announces slides, AA/AAA contrast, video captions, keyboard nav, reduced motion support
3. Performance: Suspense boundaries, lazy loading, React.memo for testimonials, Intersection Observer
4. Component Structure: Follows compound component pattern (can use TestimonialCard.Header if needed)

YOUR FOCUS:
Please validate the frontend implementation strategy:
1. Component Structure: Is the proposed hierarchy logical? (HomePage → HeroSection + TrustPanel + VideoSection + SocialProofSection)
2. Custom Hooks: Are useHomepageStats and useTestimonials well-designed? Do they match existing patterns (useTable, useForm)?
3. Carousel Accessibility: Is keyboard navigation adequate? Screen reader announcements?
4. Responsive Design: Mobile-first approach? Breakpoints sensible?
5. Performance: Lazy loading strategy? Re-render optimization? Bundle size concerns?
6. Styled-components: Pattern correct? (separate .styles.ts files, theme integration)
7. GOLDEN-STANDARD-PATTERN.md Alignment: Does this follow compound component pattern correctly?

DESIGN TO REVIEW:
---
[NOW OPEN docs/ai-workflow/BRAINSTORM-CONSENSUS.md AND COPY LINES 430-1072 - THE ENTIRE "Homepage Hero Enhancement – Design Review" SECTION INCLUDING:
- Complete wireframe showing component structure
- Visual Design Specifications (Galaxy-Swan theme tokens)
- Motion Design (cosmic micro-interactions)
- Component Structure breakdown
- Technical Requirements including Galaxy-Swan Theme Gate
- Performance requirements (lazy loading, React.memo, Suspense)]
---

Please provide your review in this format:

### 🤖 Gemini Code Assist Review
Date: 2025-10-29 [current time]
Verdict: ✅ APPROVED / ⚠️ CONCERNS / ❌ BLOCKED

**Component Structure:**
- [Assessment of proposed component hierarchy]
- [Compound component pattern validation]
- [Reusability considerations]

**Custom Hooks:**
- [useHomepageStats implementation strategy]
- [useTestimonials implementation strategy]
- [Alignment with existing patterns]

**Accessibility:**
- [WCAG compliance validation]
- [Carousel keyboard navigation]
- [Screen reader support]
- [Focus management]

**Performance:**
- [Lazy loading strategy]
- [Re-render optimization (React.memo, useMemo)]
- [Bundle size concerns]
- [Intersection Observer usage]

**Styling:**
- [styled-components patterns]
- [Galaxy-Swan theme integration]
- [Responsive design validation]

**Questions:**
- [Any clarifying questions]

**Recommendations:**
- [Specific actionable improvements, if any]
```

---

## After You Get Each Review

### Step 1: Copy the AI's Response
Copy their entire review (everything from "### 🤖 [AI Name] Review" to the end)

### Step 2: Append to BRAINSTORM-CONSENSUS.md
1. Open `docs/ai-workflow/BRAINSTORM-CONSENSUS.md`
2. Find the section for that AI (search for "### 🤖 Claude Desktop" or "### 🤖 Gemini Code Assist")
3. Replace `**Date:** [Pending]` and `**Verdict:** [Pending]` with their actual review
4. **IMPORTANT:** Do NOT delete anything - only ADD their review

### Step 3: If They Raise Concerns
If verdict is ⚠️ CONCERNS or ❌ BLOCKED:
1. Read their feedback carefully
2. Make necessary changes to the design
3. Document in Resolution Log section
4. Ask them to re-review
5. Append their updated review

### Step 4: When All 5 Approve
When all 5 AIs show ✅ APPROVED:
1. Update Final Consensus section status to 🟢 CONSENSUS REACHED
2. Add today's date
3. List all 5 AIs as approved
4. Change "Ready for Implementation" to ✅ YES
5. Come back to Claude Code and say: "Phase 0 consensus reached. All 5 AIs approved. Ready to begin implementation."

---

## Timeline Estimate

- **Claude Desktop review:** 10-15 minutes (mainly security validation)
- **Gemini Code Assist review:** 15-20 minutes (detailed React pattern analysis)
- **Total time to full consensus:** ~30-40 minutes

---

## What Happens After Full Consensus

Once all 5 AIs approve:

1. ✅ **Create Feature Tracking File**
   - Copy `docs/ai-workflow/FEATURE-TEMPLATE.md`
   - Save as `features/homepage-hero-enhancement.md`
   - Mark Phase 0 as complete

2. ✅ **Begin Phase 1-7 Implementation**
   - Return to Claude Code
   - Say: "Phase 0 consensus reached. Ready to begin implementation."
   - I'll guide you through the 7-checkpoint pipeline:
     1. Code Quality Review
     2. Logic Review
     3. Security Review
     4. Testing Review
     5. Performance Review
     6. Integration Review
     7. Human Review

3. ✅ **Implementation Timeline**
   - Estimated: 4-6 hours with AI assistance
   - Using parallel work (frontend + backend + migrations)
   - Following Galaxy-Swan Theme Gate requirements

---

## Emergency Contact

If you get stuck or need clarification:
- **Theme questions:** See `docs/current/GALAXY-SWAN-THEME-DOCS.md`
- **Current state reference:** See `docs/ai-workflow/CURRENT-PAGES-ANALYSIS.md`
- **Process questions:** See `docs/ai-workflow/PHASE-0-DESIGN-APPROVAL.md`
- **Come back to Claude Code:** Describe the issue and I'll help resolve it

---

**Bottom Line:** You have 2 final reviews to obtain. All critical issues are already resolved. The final reviewers will validate security (Claude Desktop) and React patterns (Gemini). Estimated 30-40 minutes to full consensus, then we begin implementation.

**Your next action:** Copy the Claude Desktop prompt above, open Claude Desktop, paste it, and get the review. Then do the same for Gemini Code Assist.
