# Swan Oracle GPT Pro Review File
> Reference doc for using GPT Pro / GPT-5.5-class reasoning as an advisory SwanStudios research and review oracle.
> Use when: Sean asks for an Oracle pass, GPT Pro review, GPT-5.5 Pro research, progress-gap analysis, UX/UI strategy, architecture critique, or a deeper outside read before implementation.

---

## File Header

**Purpose:** Define how SwanStudios packages project context for a high-reasoning Oracle review without bypassing repo evidence, privacy, or verification rules.

**Author:** Codex | **Last Modified:** 2026-05-15

**Source note:** This workflow was inspired by Sean's linked YouTube video, `https://www.youtube.com/watch?v=R9GUUyB3Utk`. The page exposed metadata and chapters but no caption track through YouTube `captionTracks` or `timedtext`, so this file uses verified themes from the page structure rather than a full transcript.

---

## Operating Decision

The Oracle is an advisory strategy and research reviewer. It is not a new implementation gate, not a production deploy authority, and not a replacement for `CLAUDE.md`, `AGENTS.md`, the Swan design router, Codex review, tests, or browser QA.

Use the Oracle when the question benefits from slow, broad reasoning:

- What are we missing in the product roadmap?
- What is weak in this dashboard or UX flow?
- Which implementation slice gives the best business value next?
- Does this architecture plan have hidden failure modes?
- How should a complex UI be structured before Open Design or code work?

Do not use the Oracle for trivial fixes, one-line CSS polish, routine test failures, or anything that deterministic tooling can answer.

---

## Hard Safety Rules

1. **Zero PII:** Never include client names, emails, addresses, phone numbers, health details, raw PLAUD transcripts, or payment data. Use client IDs or abstract personas.
2. **No secrets:** Never include API keys, JWTs, database URLs, cookies, Render env values, SSH details, or screenshots showing secrets.
3. **No model-ID guessing:** `GPT Pro`, `GPT-5.5 Pro`, and similar names may be role labels. Any direct API consumer must use a verified entry in `config/MODEL_VERSIONS.md`.
4. **Oracle output is a hypothesis:** Every recommendation must be classified by Codex or Claude as `ADOPT`, `REJECT`, `DEFER`, or `NEEDS PROBE` before implementation.
5. **Repo truth wins:** File:line evidence, live route mounts, model fields, tests, and production constraints override Oracle suggestions.
6. **Swan design router still owns UI:** Oracle may critique UX and suggest direction, but visible UI work still routes through `swan-design-router`.

---

## Oracle Packet Shape

Create a packet with these sections:

```text
# Swan Oracle Request: [surface or decision]

## 1. Decision Needed
[One or two sentences. What should the Oracle decide or critique?]

## 2. Current Product Goal
[What SwanStudios is trying to accomplish in business/user terms.]

## 3. Current Evidence
[File:line evidence, route path, screenshots by path, audit links, test results, docs.]

## 4. Constraints
- No PII or secrets.
- Preserve auth, routing, backend contracts, and data integrity.
- Follow Swan Crystalline design language.
- Use styled-components, no MUI, no retired Galaxy-Swan theme.
- Output must separate must-fix-now, should-improve-next, and future-phase ideas.

## 5. Specific Questions
1. [Question]
2. [Question]
3. [Question]

## 6. Expected Output Format
- Verdict: APPROVE / REVISE / BLOCK
- Missing context
- Top product gaps
- UX/UI critique
- Architecture or data-flow risks
- Recommended implementation sequence
- Verification plan
- Residual risks
- Confidence labels
```

Keep the packet narrow. A good Oracle packet has enough evidence to reason, not every file in the repo.

---

## Paste Prompt Template

Use this when sending a packet to GPT Pro / GPT-5.5-class review:

```text
You are the SwanStudios Oracle, a slow high-reasoning product, UX, architecture, and implementation reviewer.

Read the packet below. Your job is to identify what we are missing, what is weak, what is risky, and what should happen next.

Rules:
1. Do not assume facts not present in the packet. Mark missing information explicitly.
2. Separate must-fix-now from should-improve-next and future-phase opportunities.
3. Treat SwanStudios as a live production personal-training SaaS, not a concept app.
4. Preserve backend contracts, auth, payments, privacy, and data integrity.
5. For UI/UX, critique hierarchy, workflow friction, mobile behavior, accessibility, and brand fit.
6. For product strategy, prioritize revenue, retention, trainer operations, client proof-of-value, and Swan Coach usefulness.
7. Do not provide vague redesign advice. Provide concrete, sequenceable recommendations.
8. Give confidence labels and name what evidence would change your mind.

Output format:
- Verdict: APPROVE / REVISE / BLOCK
- Missing context
- Top product gaps
- UX/UI critique
- Architecture/data risks
- Recommended sequence
- Verification plan
- Residual risks
- Confidence labels

Packet:
[paste packet here]
```

---

## Return-Review Handling

When an Oracle response comes back, Codex or Claude must create this classification before coding:

| Oracle finding | Classification | Evidence | Action |
|---|---|---|---|
| [finding] | ADOPT / REJECT / DEFER / NEEDS PROBE | [file:line, test, route, model, or reason] | [implementation or follow-up] |

Definitions:

- `ADOPT`: Fits Swan rules and has enough evidence to implement.
- `REJECT`: Conflicts with repo truth, privacy, design rules, stack rules, or Sean's current scope.
- `DEFER`: Good idea, wrong slice.
- `NEEDS PROBE`: Plausible but requires a route trace, DB check, browser QA, test, or design receipt first.

---

## Good Oracle Use Cases

- User dashboard tab harmonization and missing wiring audit.
- Swan Coach command center workflow design.
- PLAUD ingestion approval UX and client matching logic.
- Storefront, checkout, or onboarding conversion analysis.
- Gamification and avatar progression architecture.
- Open Design prompt preparation for a complex surface.
- Architecture planning where frontend, backend, scripts, and workflows all interact.

## Bad Oracle Use Cases

- "Fix this typo."
- "Move this button 8px."
- "Why did this unit test fail?"
- "Commit and push."
- Any task where sending context would require secrets or client PII.
