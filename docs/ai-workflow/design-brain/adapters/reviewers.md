# Reviewers Adapter — AI Village Design Review & Browser Harness Visual QA

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL for design-review verdicts and supervised visual QA
- **Merged file** (see `index.md` §3): both consumers take the same qa-gates matrix in and produce a verdict/receipt out.

---

## Section A — AI Village Design Review

Village runs are spend-gated (rule 16) and T1-only: verdicts, never actions (operator bridge §3). Design-review mode follows the GLM-lead pattern (registry §9). Inputs are privacy-scrubbed — IDs/roles only, zero client PII in screenshots or copy.

### A1. Review packet (what the requester must assemble — incomplete packet = review declined, not guessed at)

| Field | Content |
|---|---|
| **Surface** | Route + mounted component with the rule-26 receipt (file:line proof of mount) |
| **Direction chosen** | The Fable direction doc (name, arc, C-patterns, signature moment) or "polish — no gate" |
| **Builder receipt** | The `builders.md` §4 receipt: tokens, patterns, viewports, motion, deviations |
| **External-reference receipt** | `external-reference-mcp.md` receipt when Mobbin/Mobbin-like research was requested or required; `[MOBBIN UNAVAILABLE]` is valid only when the connector was not callable |
| **Screenshots** | Per the `../qa-gates.md` Gate 1 matrix — at minimum 320 / 375 / 414 / 768 / 1440 / 2560×1440, plus reduced-motion state and loading/empty/error states for data views |
| **Scope note** | What the review may and may not flag (e.g. "copy is frozen; layout only") |

### A2. Review lenses (score each, cite evidence per finding)

1. **Doctrine compliance** — tokens with fallbacks, Dual-Button Glow, styled-components, no banned patterns (`../anti-patterns.md`, design system §B bans), no retired Galaxy-Swan tokens, rule 9 language.
2. **External-reference translation** — if Mobbin/Mobbin-like research influenced the direction, verify the build translated principles into Swan grammar and did not clone screens, assets, copy, or non-Swan interaction models.
3. **Hierarchy** — B2 arc holds; biggest thing = biggest idea; CTA findable without hunting; Phase 1 orientation present on dashboards.
4. **Premium feel** — signature moment exists and lands; no template cadence; depth/atmosphere per §B; the hostile question "would this pass as a generic admin template?" answered no.
5. **Accessibility** — 4.5:1 contrast, 44px targets, keyboard/focus behavior, reduced-motion completeness (CSS **and** framer), no hover-only core controls.
6. **Mobile** — 320/414 without overlap, clipping, or squeeze; wrap/stack behavior intentional.

### A3. Verdict format

```
VERDICT: APPROVE | REVISE | REJECT
Because: <2–4 sentences naming the decisive findings>
Findings: <numbered, each with lens + evidence (screenshot ref / file:line) + severity>
Auto-rejected suggestions: <see A4 — listed, not silently dropped>
```

REVISE names the exact blockers; REJECT means the direction itself fails doctrine and returns to Fable, not to the builder.

### A4. Doctrine supremacy rule

Any Village suggestion that contradicts CLAUDE.md rules or `docs/ai-workflow/references/SWAN-CINEMATIC-DESIGN-SYSTEM.md` is **auto-rejected and logged** — rule 46: "CLAUDE.md rules win." The rejection is recorded in the verdict (A3 last line) and in the design decision log (`../obsidian/design-decision-log-policy.md`) so the same suggestion doesn't relitigate next run. Classic examples: "use MUI/Tailwind," LILA-class purple-glow bans, light-first proposals, Recharts. Village verdicts are advisory input to the Final Decider (rule 46 as amended 2026-06-10); Fable arbitrates.

---

## Section B — Browser Harness Visual QA

The harness is supervised eyes: **T0 read-only by default** (operator bridge §3/§6). It observes; humans authenticate; it produces receipts (T1).

### B1. Session rules

- **Read-only default:** navigate, scroll, read, screenshot, console/network capture. Nothing else.
- **Any interaction beyond that** — form fill, state-mutating click, login — requires **explicit per-run approval**, named in advance (which form, which button, which test data). Blanket "click around" approvals are invalid.
- **No credential handling by the harness.** Admin/authed audits are supervised: the human logs in; the harness observes the authenticated session.
- **No writes, ever:** no data creation, no settings changes, no purchases, no messages. If a QA path requires a write, it is proposed as its own approved step with test-account scope, or it doesn't run.
- Real client PII visible on an audited page is **not** captured into receipts/screenshots destined for LLM contexts — crop, mask, or use seeded test accounts (rule 8).

### B2. Per-viewport screenshot checklist (drive from `../qa-gates.md` — its matrix is the single source)

For each width in the qa-gates matrix (320, 375, 414, 768, 1024, 1280, 1440, 1920, 2560×1440, 3840×2160, 3440 as applicable):

- [ ] Full-page screenshot at default state
- [ ] Loading, empty, and error states for data surfaces (where reachable read-only)
- [ ] Reduced-motion variant (emulate `prefers-reduced-motion`) on motion-bearing pages
- [ ] Overflow check: no horizontal scroll, no clipped text, no overlapping interactive elements
- [ ] Console capture: zero new errors/warnings attributable to the surface
- [ ] Network capture: failed requests, 4xx/5xx, and suspicious payloads noted

### B3. QA receipt format

```
QA RECEIPT — <surface> — <date>
Session:      supervised | unattended-readonly; approver: <name> (for any interaction)
URLs visited: <list>
Actions:      <navigation/scroll only, or enumerated approved interactions + data entered>
Viewports:    <each width → screenshot ref → pass/fail + note>
Console:      <clean | findings with page + message>
Network:      <clean | findings with request + status>
Side effects: <none observed | enumerate — any unexpected write = STOP + flag immediately>
Failures:     <numbered, with evidence refs>
```

Receipts land with the slice thread and, for phase-level work, the rule-48 audit record. **No receipt → the QA session didn't happen** (bridge §8 discipline).

---

## Verification before done (self-apply, either section)

- [ ] Packet/session inputs complete before starting (A1 / B1 approvals); gaps bounced back, not guessed
- [ ] Every finding carries evidence (screenshot ref, file:line, console line) — no vibes-only findings
- [ ] Verdict or receipt in the exact format above, posted to the requesting thread
- [ ] External-reference receipt checked when present; copied/proprietary or non-Swan patterns rejected
- [ ] Doctrine-conflicting suggestions auto-rejected AND logged (A4)
- [ ] Harness ran zero unapproved interactions and zero writes; PII kept out of captured artifacts
- [ ] Confidence tags (rule 51) on any causal claim ("layout breaks BECAUSE…") not directly observed
