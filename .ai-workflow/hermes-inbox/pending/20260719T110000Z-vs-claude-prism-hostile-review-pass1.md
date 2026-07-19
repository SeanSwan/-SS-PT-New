# Hermes Inbox Memo

- **Surface:** vs-claude
- **UTC:** 2026-07-19T11:00:00Z
- **Slice:** PRISM CAPTURE hostile-review LOOP — pass 1 fixes committed (still flag-off)

## What I did / learned
- Sean /loop: hostile-review all recent work until dry, then Sean-gated push. Ran 3 parallel adversarial
  reviewers (security / correctness / frontend-a11y) on PRISM CAPTURE. Fixed the confirmed union, committed
  `3812c22cf` on `claude/build-swan-lens` (NOT pushed). Pass 2 verification running.

## Why it matters to Hermes (transferable — real defects the reviewers caught in flag-off money-path code)
- **SEC HIGH:** `refCodeFor` leaked the raw sequential lead PK in the public 201 when `REF_CODE_PEPPER` was unset
  (enumeration/volume oracle) → now fail-closed to `null`.
- **SEC MED:** derived firstName from email local-part could carry XSS into the CRM admin UI + overflow
  `varchar(100)` → silent lead loss → now alphanumeric-strip + cap 40.
- **CORR MED/HIGH:** a backend `{error}` returned an opaque 201 → lead silently lost → now 500 (recoverable via
  frontend Retry); created-vs-existing still opaque (anti-enumeration preserved).
- **SEC MED:** owner alerts unbounded under a unique-email flood (Twilio/SendGrid spend + phone DoS) → global
  in-process 30/hr external-alert budget (in-app notification uncapped).
- **FE HIGH x2:** network error was invisible + unannounced; success was silent + dropped focus → role=alert /
  role=status + focus move. **FE MED:** raw `<a>` on the Book CTA caused a full page reload → React Router `<Link>`.
- Reviewers confirmed CLEAN: mount-order/auth-bypass, injection (CRLF/SMS/email/tag/UTM), ReDoS, prod PII-in-logs,
  mobile 320/414, styled-components, flag-off zero-impact.
- **Documented residuals (not fixed):** timing oracle in the shared captureLeadFromContact (byte-equiv constraint
  + rate-limited); in-memory rate-limit per-instance on multi-instance Render (Redis follow-up); repo-wide shared
  public-flags cache (touches ~8 sibling flags.ts).

## State right now
- `3812c22cf` local, unpushed, flag-off. Verified: node --check, scoped strict tsc PASS, scanners clean, helper
  algorithm standalone. Vitest suite [UNKNOWN] — backend deps uninstalled here, run in CI. Pass 2 verifiers running.

## Sean owes / blockers
- After the loop goes dry: run vitest in CI, then Sean-gated push. At go-live set PRISM_CAPTURE_ENABLED + REF_CODE_PEPPER.
