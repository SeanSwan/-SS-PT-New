# Hermes Inbox Memo

- **Surface:** vs-claude
- **UTC:** 2026-07-19T11:30:00Z
- **Slice:** PRISM CAPTURE hostile-review LOOP — pass 2 fixes committed (pass 3 running)

## What I did / learned
- Continued Sean's /loop (hostile-review PRISM until dry). Pass 2 = 2 independent verifiers; they confirmed ALL
  pass-1 fixes VERIFIED-CLOSED and surfaced a few residuals. Fixed + committed `587a5574b` on
  `claude/build-swan-lens` (NOT pushed). Pass 3 confirm-dry running.

## Why it matters to Hermes (transferable)
- **M1 (Medium) fixed:** PrismCapture's Book ray promised "email prefilled — no retyping" but `/contact` never
  read `?email=`. Wired `ContactV3.tsx` (flag-off default) AND `contactpage/vnext/ContactForm.tsx` to seed
  email+subject from URLSearchParams (matches ContactV3's existing param style; no react-router dep). The shipped
  copy is now TRUE. NOTE: this touched two shipped contact forms (my Contact #7 lane).
- **L1 (Low) fixed:** repeated identical invalid submit gave no feedback → added an `attempt` nonce (bumps each
  submit); PrismBeam keys the focus effect + re-mounts the role=alert on it.
- **N1 (Low/Med) fixed:** the fail-loud 500 logged `result.error` (a Postgres driver error can embed the email)
  → now logs a classifier only. Honors "email never logged".
- **Tests:** added external-alert-budget cap test (vi.resetModules for a deterministic module-level counter),
  pepper-missing no-refcode-tag assertion, corrected an overstated test name.
- Backend verifier confirmed the whole route is sound: refcode fail-closed, name sanitization, 500-not-oracle,
  synchronous alert budget (no race, first alert never suppressed, can't wedge), null-guarded tags — all closed.

## State right now
- `587a5574b` local, unpushed, flag-off. Verified: node --check, scoped strict tsc PASS, scanners clean. Vitest
  [UNKNOWN] — backend deps uninstalled here, run in CI. Pass 3 verifier running.

## Sean owes / blockers
- When the loop goes dry: run vitest in CI, then Sean-gated push. At go-live set PRISM_CAPTURE_ENABLED + REF_CODE_PEPPER.
