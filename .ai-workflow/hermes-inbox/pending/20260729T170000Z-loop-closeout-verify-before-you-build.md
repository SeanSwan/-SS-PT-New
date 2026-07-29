# Loop closeout: three of four consult claims were wrong, and my own fix caught 8% of what it claimed

**When:** 2026-07-29 (UTC) · **Where:** VS-Claude terminal · **Linear:** SWA-75
**Shipped:** `1389f0d0d`, `e431a9bda`, `42c888ecb`, `2231bbc52` — all verified on `origin/main`

## The headline lesson

**Verify a recommendation before building it, and verify your own fix before claiming it.** Both halves paid out this session.

### Consult claims: 1 of 4 survived contact with the code

Kimi K3 named four things "missing entirely." Checked each against the repo before writing any code:

| Claim | Reality |
|---|---|
| auth endpoints unthrottled | **FALSE** — six limiters exist (register 10/hr, login 100/15min + per-account 10/15min, refresh 20/15min, reset 5/15min ×2, change-password 10/15min) |
| no client-facing problem-report channel | **FALSE** — full system: `/api/support/issues` + admin inbox, `SupportReportComposer`/`SupportReportRoomPage`, routed, and linked from `CompactFooter.tsx:89` **and** the client dashboard |
| email failure invisible | **PARTLY** — `sendEmail` returns `{success, error}` and **all four call sites inspect it**. Only *visibility* was missing (one line among ~2,841 log calls) |
| no account deletion / data export | **TRUE** — real gap, real legal exposure |

Three of four would have been wasted work, and two would have shipped as "fixes" for non-problems. **A consult reads the packet you hand it, not the repo** — its factual assertions are hypotheses (rule 30); its *judgement* on sequencing and blind spots is where the value is, and that held up well.

### My own observability fix caught ~8% of what it claimed

Shipped 5xx capture hooked into the global Express error handler. Then measured: this codebase returns 5xx **directly** in **1,094 places across 203 files**, mostly via per-file `sendInternalError` helpers — none of which reach the global handler. The gauge would have read near-zero during a real incident and looked healthy.

Moved capture to the **response boundary** (`res.on('finish')`, mounted before routes) so every path is covered regardless of how the response was produced, with a dedupe flag so a fault crossing both paths counts once.

**Rule: instrument where all paths converge, not where the framework says errors go.**

## Two lies the app was telling users

Both found by a docs-truth sweep of *user-facing copy*, which is far higher-yield than sweeping code comments:
- `errorHandler.mjs` — "Our team has been notified." Nobody was.
- `CheckoutView.tsx:232` — the same sentence, on the **money path**.

Fixed by making them true rather than softening them. Sweeping the security/finance code comments in the same pass found **nothing** — the hits ("Admins always have access") were accurate descriptions.

## Design decisions worth carrying

- **Erasure means anonymisation, not deletion**, on any platform that takes payments. Orders and financial transactions must survive for accounting; purging a user breaks FKs or orphans revenue. Destroy the identifying fields, keep the skeleton, audit who did it. True purge stays a manual owner-executed operation.
- **The refusals are the feature.** Erasure declines without a confirmation token that *names the target* (so a token for account 62 cannot erase 61), declines self-erasure, and declines admin accounts.
- **Delete orphans, don't park them** — git history is the archive; a second graveyard directory is a fiction. But each deletion needs four checks: no live importer, no reference from the parked `DesignPlayground/concepts` tree, a *named* live replacement where superseded, and a clean tsc+build after.

## Facts for the next session

- `ClientDashboardHomeTab` fetches its own data via hooks and has a three-tier avatar fallback. The hardcoded `EMPTY_STATS`/`profilePosts` props passed by `ClientHomeTab` are **vestigial and unused** — they look like a data-truth bug and are not one. Do not "fix" them.
- Pre-existing failing baseline is **21 across 10 files**, verified identical on a pristine `origin/main` worktree. Grew 7→11→16→21 over three days from parallel agents. Not regressions.
- Support, onboarding, and messaging all follow the same historical pattern: **built and routed, then unlinked.** When auditing a feature here, check reachability before assuming absence.

*IDs and roles only. No PII, credentials, or customer data.*
