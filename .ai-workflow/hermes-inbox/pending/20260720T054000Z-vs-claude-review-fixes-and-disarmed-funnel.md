# Hermes Inbox Memo

- **Surface:** vs-claude
- **UTC:** 2026-07-20T05:40:00Z
- **Slice:** 3-reviewer hostile pass → 20 fixes (`448a20f2e`) + absence-first vision audit

## 💰 THE BUSINESS FINDING (most important thing in this memo)
**Leads are landing in the CRM right now and NOTHING ever follows up.** The `lead_nurture` sequence (day-0/1/3/7
emails) is fully built at `backend/services/automationService.mjs:60-84` and hardcoded `isActive: false`, behind
`automationArmState.mjs:15` which gates all delivery on `SWAN_AUTOMATION_CRON_ENABLED === 'true'`. Both off. The
public contact form has been creating real scored leads this whole time (`leadCaptureService.mjs:91`). At
$175/session this is live revenue decay, not a future feature.
**Related, verified:** (a) **no booking route exists anywhere** — no `/book`/`/schedule`/`/consult` in
`main-routes.tsx`, no `ConsultRequest` model; PRISM's primary "Book a free consultation" ray dead-ends at the
generic contact form. (b) `Lead.nextFollowUpAt` is **never written at capture** — only by a manual admin PUT — so
the `followupsDue` dashboard filter/count (`leadRoutes.mjs:54,120`) is structurally ~always 0: it reports "all
clear" while the pipeline rots. (c) referral codes (`prism:refcode:` / `prism:refby:`) are **write-only, zero
readers** — the share ray credits nobody. (d) **Credential risk:** 4 production files claim "NCEP-certified"
and `trainerService.ts:66` FABRICATES `'Certified Personal Trainer'` for any trainer with no certification on file.
**ARMING NURTURE IS SEAN-GATED** — it sends real email to real people; never self-authorize.

## Transferable FAILURE CLASSES (this is the durable part)
1. **"A guard that scans nothing reports clean."** Both CI scanners exited 0 with a green ✓ after scanning
   **0 files** (proven via wrong cwd). A renamed dir would have silently disabled them forever. **Rule: any
   scanner must hard-fail on a missing scope AND on an empty file set.**
2. **"A test that passes on commented-out code."** The gate-parity test went GREEN on `{/* <Feature /> */}` and on
   `{false && <Feature />}` — it certified the exact defect it existed to catch. **Rule: source-regex contracts
   must strip comments and assert against dead branches; and mutation-test the ANNOYING mutation (comment-out),
   not just deletion — I had only mutation-tested full deletion and missed this.**
3. **"A guard that fails spuriously gets deleted."** Same test failed on `<Feature {...p} />` and on a
   prettier-wrapped multiline tag — inevitable refactors producing a LYING error message. A guard's false-positive
   rate is a survival trait.
4. **URL-seeded form fields are a reply-to hijack vector.** `/contact?intent=book&email=attacker@evil.com` seeded
   a victim's inquiry with the attacker's address; the floating-label CSS made it render identically to browser
   autofill. Owner replies to the attacker. **Fix pattern: validate the seeded value AND show a visible "we filled
   this from your link" affordance — the affordance is what defeats it, validation only stops junk.**
5. **Validation living in only ONE branch of a flag gate.** The v-next contact form set `noValidate` with
   emptiness-only checks, accepting malformed emails the flag-OFF branch rejects — gate divergence one layer below
   the Gate Rule. Server-side backstop added (`contact.mjs` had NO validation at all). Same branch also silently
   dropped `readAcquisitionParams()`, so flipping `contactVNext` would have nulled UTM attribution with no error.
6. **Spread leaks past TypeScript's excess-property check.** `{...evt}` in `gateTelemetry` would copy
   `userId`/`email` into a "zero-PII" event because excess-property checking only applies to object *literals*.
   **Destructure explicitly when a type is a privacy guarantee.**
7. **Doc claim vs code reality:** the runbook called the runtime flag an "absolute kill switch", but an unreachable
   flags endpoint falls back to build env — so `VITE_*_VNEXT=true` would turn a surface ON during exactly the
   outage you're aborting for. Safe today only by accident (no env set), not by control.

## State right now
- `448a20f2e` on branch (local): 20 findings fixed, each re-verified by EXECUTING the attack (wrong-cwd exit 0→1;
  rgb/hsl hits 0→3; GuardBanner now flagged; comment-out + dead-branch 0→1; prop-spread + multiline 1→0).
  Scanners green on the real tree (101/100 files, 7 scopes); parity 4/4; contact+prism 7/7; build clean 14.6s.
- CI guards are now actually wired (`37e4fcbac`, `.github/workflows/swan-lens-guards.yml`).
- Gallery agent has active uncommitted work in `gallery-vnext/` — deliberately NOT staged (explicit-path staging).
- Render deploys still failing on THEIR infra; production up on last good deploy; nothing recent is live.

## Sean owes / blockers
- **Arm the nurture sequence** (env + one seeded row) — outward-facing, his call. Capture without nurture just
  relocates the leak.
- Retry the Render deploy once their incident clears.
- Still unanswered: whether I take over Lane-A activation.
