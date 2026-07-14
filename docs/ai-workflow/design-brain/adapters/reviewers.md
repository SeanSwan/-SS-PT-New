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
| **Screenshots** | Per the `../qa-gates.md` Gate 1 matrix — at minimum 320 / 375 / 414 / 768 / 1440 / 2560×1440, plus reduced-motion state and loading/empty/error states for data views |
| **Scope note** | What the review may and may not flag (e.g. "copy is frozen; layout only") |
| **M4 reviewed artifact** | The recursive runtime receipt, canonical manifest projection, current `reviewedArtifact`, and current `reviewedBrowserEvidence`. Missing or stale means review declined. |
| **M4 identity policy** | Exact predeclared `swan-world-factory.review-policy.v2`, worker assignments, distinct `browserQaWorker`, exact authorship core, approved stable reviewer IDs, and timestamps. Any post-hoc or colliding identity means review declined. |
| **M4 browser evidence** | Runner-owned loopback origin belonging to the predeclared QA worker, successful response-body inventory, raw field metrics, exact matrix/flows, and hashed/decoded canonical screenshots inside `sha256-canonical-site-browser-evidence.v1`. |

### A2. Review lenses (score each, cite evidence per finding)

1. **Doctrine compliance** — tokens with fallbacks, Dual-Button Glow, styled-components on Swan/React hosts and existing-stack-first token discipline elsewhere, no banned patterns (`../anti-patterns.md`, design system §B bans), no retired Galaxy-Swan tokens, rule 9 language.
2. **Hierarchy** — B2 arc holds; biggest thing = biggest idea; CTA findable without hunting; Phase 1 orientation present on dashboards.
3. **Premium feel** — signature moment exists and lands; no template cadence; depth/atmosphere per §B; the hostile question "would this pass as a generic admin template?" answered no.
4. **Accessibility** — 4.5:1 contrast, 44px targets, keyboard/focus behavior, reduced-motion completeness (CSS **and** framer), no hover-only core controls.
5. **Mobile** — 320/414 without overlap, clipping, or squeeze; wrap/stack behavior intentional.
6. **M4 license and failure safety** — if M4 is proposed, verify the complete gate ritual, Law A on Swan work, eligible surface, max-budget inheritance, required Pause/Skip and Play/Mute/Stop when audio is included, semantic B0, backend-loss fallbacks, and performance manifest. Unlicensed live M4, Law B under Swan chrome, canvas-owned meaning, or a missing loss path is automatic REVISE.

For M4, verify `sha256-canonical-reviewed-artifact.v1` against the complete
recursive build/manifest and `sha256-canonical-site-browser-evidence.v1`
against the exact browser receipt. Browser evidence includes the predeclared QA worker/version,
timestamps, successful response-body/local-byte binding, raw LCP/layout-shift
entries, metrics, matrix/flows, and hashed PNG paths/bytes/dimensions. The
predeclared QA worker must own an ephemeral loopback server; off-origin, decoy, redirected,
error, missing, or unbound responses are automatic REVISE.

The reviewer must be preapproved, use its canonical NFC stable ID, differ from
both the assigned site worker and `browserQaWorker`, and stamp no earlier than browser completion.
Authorship must match the predeclared assignment and policy core. Any material change or
browser-evidence change invalidates both reviewed receipts and resets review
to PENDING. After independent stamps, the same predeclared QA worker reruns the
gallery only in a real browser; it may update gallery evidence only. Changed site evidence,
sync-only shortcuts, and builder-authored PASS are automatic REVISE.

### A3. Verdict format

```
VERDICT: APPROVE | REVISE | REJECT
Because: <2–4 sentences naming the decisive findings>
Findings: <numbered, each with lens + evidence (screenshot ref / file:line) + severity>
Reviewed artifact: sha256-canonical-reviewed-artifact.v1:<contentSha256> | N/A for non-M4
Reviewed browser evidence: sha256-canonical-site-browser-evidence.v1:<contentSha256> | N/A for non-M4
Review timestamp: <UTC timestamp>
Auto-rejected suggestions: <see A4 — listed, not silently dropped>
```

REVISE names the exact blockers; REJECT means the direction itself fails doctrine and returns to Fable, not to the builder.
For M4, PASS requires empty findings plus a named, timestamped review bound to
the current artifact. REVISE or REJECT requires non-empty findings bound to the
same current artifact.

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
- [ ] External-reference receipt checked when required; `[MOBBIN UNAVAILABLE]` is honest, copied/proprietary patterns are rejected
- [ ] M4 work (if any) includes license verdict, ritual artifacts, semantic B0, Full/Lean/Still, backend-loss matrix, required Pause/Skip, Play/Mute/Stop when audio is included, and no live product/Hermes embedding
- [ ] M4 verdict names `reviewedArtifact` and `reviewedBrowserEvidence`; predeclared site-author/QA-worker/reviewer separation, timing, and material/evidence-change invalidation were checked
- [ ] M4 evidence binds owned-loopback response bodies, recursive local bytes, raw metrics, full matrix/flows, and exact hashed/decoded screenshots
- [ ] M4 gallery-only real-browser finalizer passed while site evidence remained byte-identical
- [ ] Doctrine-conflicting suggestions auto-rejected AND logged (A4)
- [ ] Harness ran zero unapproved interactions and zero writes; PII kept out of captured artifacts
- [ ] Confidence tags (rule 51) on any causal claim ("layout breaks BECAUSE…") not directly observed
