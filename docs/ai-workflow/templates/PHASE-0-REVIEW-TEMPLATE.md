# [Feature Name] - Phase 0 Design Review

**Date Started:** YYYY-MM-DD
**Status:** 🟡 IN REVIEW → 🟢 CONSENSUS → 🔴 BLOCKED
**Priority:** HIGH / MEDIUM / LOW
**Owner:** [Team/Person]

---

## Quick Links

- 📊 **Registry:** [PHASE-0-REGISTRY.md](../PHASE-0-REGISTRY.md)
- 📝 **Prompts:** [AI-ROLE-PROMPTS.md](../AI-ROLE-PROMPTS.md)
- 🎯 **Process Guide:** [PHASE-0-DESIGN-APPROVAL.md](../PHASE-0-DESIGN-APPROVAL.md)

---

## 1. Context & Background

**Current Situation:**
- [Brief description of current state]

**Business Requirements:**
- [Key business needs this addresses]

**Reference Docs:**
- [Link to any relevant current state analysis]

---

## 2. Design Artifacts

### A. Wireframe/Mockup
```
[ASCII wireframe or link to Figma/image]
```

### B. Visual Design Specs
- **Colors:** [Palette]
- **Typography:** [Fonts, sizes]
- **Motion:** [Animations, transitions]

### C. User Stories
```
As a [user type],
I want to [action],
So that [benefit].
```

**Acceptance Criteria:**
- [ ] Criterion 1
- [ ] Criterion 2

### D. API Specification (if applicable)
```yaml
GET /api/endpoint
Response 200: { ... }
```

### E. Database Schema (if applicable)
```sql
CREATE TABLE ...
```

### F. Component Structure (frontend)
```
components/
├── Component1.tsx
└── Component2.tsx
```

---

## 3. Technical Requirements

**Galaxy-Swan Theme Compliance:**
- [ ] Galaxy core gradient + starfield background
- [ ] Glass surfaces with gradient borders
- [ ] Cosmic micro-interactions (120-180ms)
- [ ] Display serif for H1/H2
- [ ] Swan motifs present

**Performance:**
- [ ] Lazy loading
- [ ] Caching strategy
- [ ] Optimize images/videos

**Accessibility:**
- [ ] WCAG AA compliance
- [ ] Keyboard navigation
- [ ] Screen reader support
- [ ] Reduced motion support

**Security:**
- [ ] Input validation
- [ ] RLS considerations
- [ ] Rate limiting (if public endpoint)

---

## 4. Edge Cases

1. **[Edge case 1]:** [Solution]
2. **[Edge case 2]:** [Solution]

---

## 5. Out of Scope (Phase 2)

- [Feature deferred to later]

---

## 6. AI Reviews (APPEND ONLY)

### 🤖 Claude Code (Integration)
**Date:** [YYYY-MM-DD HH:MM]
**Verdict:** ⬜ PENDING / ✅ APPROVED / ⚠️ CONCERNS / ❌ BLOCKED

[Review content - paste AI's response here]

---

### 🤖 Roo Code (Backend)
**Date:** [YYYY-MM-DD HH:MM]
**Verdict:** ⬜ PENDING / ✅ APPROVED / ⚠️ CONCERNS / ❌ BLOCKED

[Review content]

---

### 🤖 ChatGPT-5 (QA)
**Date:** [YYYY-MM-DD HH:MM]
**Verdict:** ⬜ PENDING / ✅ APPROVED / ⚠️ CONCERNS / ❌ BLOCKED

[Review content]

---

### 🤖 Claude Desktop (Orchestrator & Security)
**Date:** [YYYY-MM-DD HH:MM]
**Verdict:** ⬜ PENDING / ✅ APPROVED / ⚠️ CONCERNS / ❌ BLOCKED

[Review content]

---

### 🤖 Gemini Code Assist (Frontend)
**Date:** [YYYY-MM-DD HH:MM]
**Verdict:** ⬜ PENDING / ✅ APPROVED / ⚠️ CONCERNS / ❌ BLOCKED

[Review content]

---

## 7. Resolution Log

**Issue #1:** [Description]
- **Raised by:** [AI name]
- **Severity:** ⚠️ CONCERN / ❌ BLOCKER
- **Resolution:** [What was changed]
- **Status:** ✅ RESOLVED / 🟡 IN PROGRESS

---

## 8. Consensus Summary

**Status:** ⬜ PENDING / 🟢 CONSENSUS REACHED / 🔴 BLOCKED

**Approvals:** [X/5]
- Claude Code: [✅/⚠️/❌/⬜]
- Roo Code: [✅/⚠️/❌/⬜]
- ChatGPT-5: [✅/⚠️/❌/⬜]
- Claude Desktop: [✅/⚠️/❌/⬜]
- Gemini: [✅/⚠️/❌/⬜]

**Issues Resolved:** [X/X] (100%)

**Final Consensus Date:** [YYYY-MM-DD]

**Next Step:** Move to Phase 1-7 implementation via [FEATURE-TEMPLATE.md](../FEATURE-TEMPLATE.md)

**Implementation Branch:** `feature/[feature-name]`

---

**File Size:** Keep this file focused. If it exceeds 800 lines, consider splitting artifacts into separate docs.
