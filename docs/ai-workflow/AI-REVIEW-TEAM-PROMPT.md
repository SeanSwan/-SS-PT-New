# SwanStudios UI Redesign - Multi-AI Structured Review Prompt
## Use this prompt verbatim with any AI (Claude, ChatGPT, Gemini, Codex)

---

## Instructions

You are reviewing a UI/UX redesign master prompt for a production personal training SaaS platform. Your job is to find gaps, risks, contradictions, and missing controls that could cause production incidents, regressions, or wasted effort.

**Return your review in EXACTLY this format. Do not deviate from the structure.**

---

## Required Output Format

### 1. SEVERITY TABLE

Return a markdown table with these exact columns:

| # | Severity | Location (section + line hint) | Finding | Recommended Fix |
|---|----------|-------------------------------|---------|-----------------|
| 1 | Critical / High / Medium / Low | Section name + approximate location | What is wrong or missing | Specific actionable fix |

**Severity definitions:**
- **Critical**: Will cause production breakage, data loss, or security regression if not fixed before execution
- **High**: Will cause measurable quality/business regression or make a phase unexecutable
- **Medium**: Creates ambiguity, inconsistency, or drift risk that teams will interpret differently
- **Low**: Style, wording, or nice-to-have improvement

### 2. VERIFIED STRENGTHS

List 3-5 things the prompt gets right that should NOT be changed:

- [ ] Strength 1
- [ ] Strength 2
- [ ] ...

### 3. MISSING CONTROLS CHECKLIST

For each item, mark YES (present) or NO (missing/insufficient):

- [ ] Backend contract safety (API routes, data shapes preserved)
- [ ] RBAC regression prevention (client/trainer/admin isolation)
- [ ] Monetization flow protection (checkout, booking, store)
- [ ] Rollback mechanism with defined triggers
- [ ] Feature flag strategy (build-time vs runtime distinction)
- [ ] Responsive coverage (mobile through 4K)
- [ ] Accessibility requirements (WCAG level, keyboard, screen reader)
- [ ] Performance budgets (LCP, CLS, INP with numeric thresholds)
- [ ] Visual QA protocol (baseline, naming, diff tool, thresholds)
- [ ] Seed data reproducibility (fixture accounts, reset command)
- [ ] Phase gates (Definition of Done + fail criteria per phase)
- [ ] Design concept isolation (dev-only routes, not shipped to prod)
- [ ] Cross-browser testing plan
- [ ] Orientation / safe-area / virtual keyboard handling
- [ ] Telemetry / analytics for before-after comparison
- [ ] Migration strategy (old theme + new theme coexistence)

### 4. CONTRADICTIONS

List any places where the prompt contradicts itself or gives conflicting instructions:

| Section A | Section B | Contradiction |
|-----------|-----------|---------------|
| ... | ... | ... |

If none found, write: "No contradictions detected."

### 5. EXECUTION RISK ASSESSMENT

Rate each phase on a 1-5 risk scale (1 = low risk, 5 = high risk) and explain:

| Phase | Risk (1-5) | Primary Risk | Mitigation Present? |
|-------|-----------|--------------|-------------------|
| Phase 0: Audit | ? | ? | Yes/No/Partial |
| Phase 1: 5 Concepts | ? | ? | Yes/No/Partial |
| Phase 2: Design System | ? | ? | Yes/No/Partial |
| Phase 3: Page Rollout | ? | ? | Yes/No/Partial |
| Phase 4: QA | ? | ? | Yes/No/Partial |

### 6. TOP 3 ACTIONS

If you could only change 3 things before execution starts, what would they be?

1. ...
2. ...
3. ...

---

## Context Document

Paste the full contents of `SWANSTUDIOS-UI-REDESIGN-MASTER-PROMPT.md` below this line, then send to any AI for review.

---

## Usage Notes

- Send this prompt + the master prompt to 2-3 different AIs
- Merge their SEVERITY TABLEs into one spreadsheet
- Deduplicate findings by location
- Prioritize: fix all Critical, fix all High, review Medium, log Low
- Re-review after fixes until all AIs return 0 Critical and 0 High findings
