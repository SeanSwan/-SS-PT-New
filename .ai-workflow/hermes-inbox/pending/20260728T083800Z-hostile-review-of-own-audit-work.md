# Hostile review OF the audit work — the auditor introduced two of the defects

**When:** 2026-07-28 (UTC) · **Where:** VS-Claude terminal · **Linear:** SWA-75
**Shipped:** `ff500b700` on `origin/main`

Sean asked for a hostile pass on three already-shipped audits before starting a fourth. Six vantages, none of them re-reading code already read. Two real defects surfaced — **both introduced by the audit work itself.**

## The lesson

**A fix ships with the same defect classes it was hunting.** Both findings were mine:

1. I widened the display-ref format and left three comments still advertising the old one (`// masked (C-1042)`). That is precisely the comment-rot that sent this whole audit chain chasing a dead file on day one.
2. I built a "complete your onboarding" card gated on `isOnboardingComplete === false` — and never asked *whether the viewer is a client*. Staff reach `/dashboard/client/*` by URL, so an admin or trainer would have been invited to fill in a client assessment, writing client onboarding data onto a staff account.

Audit your own patch with the checklist you used on the code you were auditing. The reviewer is not exempt.

## Concrete facts worth keeping

- **`RosterStrip.tsx:68` uses `clientRef` as a React key.** The display-ref collisions were therefore causing DUPLICATE REACT KEYS, not merely confusing labels. When a "display-only" value is used as a key, uniqueness becomes a rendering-correctness property.
- **There is a THIRD writer to the messages table**: `messagingSchemaRepository.ensureAdminConversation` calls `createMessageRecord`. It is NOT a bypass of the block/throttle guards — one hardcoded welcome message, sender is the admin, returns early if the conversation already exists. Worth knowing before anyone "discovers" it again.
- **`/dashboard/client/*` is reachable by staff**, because `activeRole` derives from the URL path segment. Any client-only UI must gate on role, not merely on client-shaped state.
- **Verify shipped state from the REMOTE**, not the local branch: `git show origin/main:<path>`. A local branch can be rebased, amended, or simply not pushed.

## Method note, now three audits deep

The enumeration sweeps (route guards, money mutations, admin privileges) produced roughly **100 candidates across three audits, and nearly all were false positives**. Recurring blind spots:
- in-handler role checks (`if (!['admin','trainer'].includes(req.user?.role)) return 403`)
- anonymous `router.use((req,res,next) => {...})` gates
- sub-routers inheriting guards from the parent that mounts them
- line-offset drift causing the slicer to read a neighbouring handler

**All three real findings came from reading files the sweeps never flagged.** Enumeration is good at pointing and bad at concluding — budget to open every candidate by hand, and do not treat a clean sweep as a clean surface.

## Deletion-sweep completeness

The 50 files deleted earlier were re-checked across json/yml/sh/ps1/Procfile/Dockerfile/ts/tsx, not just `.mjs` as originally. Every surviving reference lives in a stale code-index cache (`backend/.understand-anything/fingerprints.json`) or an archived QA artifact — zero operational. That cache is now stale by 50 entries; it regenerates and was deliberately left alone.

*IDs and roles only. No PII, credentials, or customer data.*
