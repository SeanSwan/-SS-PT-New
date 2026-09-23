# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** ./SWAN-FORGE-ROUND8-PACKET.md
**Seed:** (none)
**Tokens:** 1302 in / 4526 out | **Cost:** ~$0.0718 | **Wall:** 208.5s | **finish_reason:** error

---

# HOSTILE REVIEW — Forge fix-after batch (`816bc2eb1`, deployed)

**Scope note before the knives come out:** my charter is Crystalline Swan front-end enforcement. This diff is a Node CLI. Most design gates (styled-components, Victory, 44px targets, 320–3840 breakpoints, reduced-motion) have **nothing to attach to** — except two surfaces: the contact-sheet HTML, and `forgeReadApi`, which is unmistakably the thin end of a dashboard wedge. I rule on those below. Everything else I review as hostile engineering review, per your §4.

---

## (a) RANKED FINDINGS

### LIVE-BUG — fix and redeploy now

**L1. §2.4 confirmed: you shipped broken image paths for `ab-avoid/`.**
Sheet is written to `.ai-workflow/forge-runs/`; `src="images/<basename>"` resolves to `forge-runs/images/<file>`. Files in the sibling `ab-avoid/` 404. You already proved the mechanism with your own retention hole: **the sweep widened, the emitter didn't.** Same failure shape twice in one subsystem — that's not bad luck, it's a missing invariant (see H1).

Builder-exact fix — stop hardcoding the prefix, compute the path from the sheet:

```js
import path from 'node:path';

function sheetSrc(sheetDir, imageAbsPath) {
  const rel = path.relative(sheetDir, imageAbsPath).split(path.sep).join('/');
  return encodeURI(rel.startsWith('.') ? rel : `./${rel}`);
}
```

And close the loop the bug exploited — **verify effect, not intent** (your recurring failure #4). After writing the sheet:

```js
for (const img of emitted) {
  if (!fs.existsSync(path.resolve(sheetDir, decodeURI(img.src))))
    throw new Error(`E_SHEET_LINK_BROKEN: ${img.src}`);
}
```

That check would have caught this before deploy. The "sheet reports how many were linked" message currently counts **writes attempted**, not **links that resolve** — see L3.

**L2. The retention under-report you already found was a live lie.** `storeStatus` reported 3.6 MB while 14.1 MB was on disk. Any message a human reads and acts on that is false is a live bug, full stop. You fixed the walk; you have not fixed the **test that let it ship** — the fixture modeled `images/` only. The test name presumably still claims "walks artifact root." It doesn't and never did. Rename it or make it true.

### FIX-NEXT

**F1. §2.1 — yes, you are under-counting spend by design.** Two defects:
1. **Check-before means the ceiling is `ceiling + max(option cost)`.** That's a soft bound masquerading as a hard one. Pre-authorise: `if (spent + estimateCost(next) > ceiling) stop(E_SPEND_CEILING)`. If you can't estimate, the honest contract is "ceiling is a floor for the stop decision" — say that in the ledger row, not in a comment.
2. **Counting only successful `costUsd` is the worst kind of under-count: silent.** A safety-rejected call that was billed is spend your ceiling never sees. Record every attempt: `{ costUsd: r.costUsd ?? null, billed: r.billed ?? 'unknown' }`, and count `unknown` against the ceiling at the *estimated* rate. A spend control that only observes successes is a success message, not a control.

**F2. §2.2 — the clamp ceiling is wrong.** Clamping `Retry-After` to the 180s total budget means "obey any server hint up to 3 minutes." A provider asking 120s parks a bracket for 2/3 of its budget on one sleep. `Retry-After` is an unauthenticated hint from a network peer; treat it as advisory:

```js
const MAX_RETRY_AFTER_MS = 30_000; // PROVENANCE: replace with observed p99 of provider hints; 30s is a placeholder, not provenance
if (retryAfterMs > MAX_RETRY_AFTER_MS)
  return fail('E_RETRY_AFTER_EXCEEDED', { requested: retryAfterMs });
const waitMs = Math.min(retryAfterMs, remainingBudgetMs());
```

Long hint → abort the option, don't wait. Waiting converts a provider problem into your latency.

**F3. §2.5 — string-sorting `createdAt` is a time bomb.** Lexicographic sort is only correct if every row is strict ISO-8601 in the same offset with the same precision. One row with `Z` vs `+00:00`, one with milliseconds vs without, and your ordering is silently wrong. Parse once, sort numerically, tiebreak deterministically:

```js
const ts = r => { const t = Date.parse(r.createdAt); return Number.isFinite(t) ? t : -Infinity; };
rows.sort((a, b) => ts(a) - ts(b) || a.variantId.localeCompare(b.variantId));
```

Grouping by `runId` with `single:<variantId>` fallback is **defensible for a CLI** — but it will fragment a UI, because orphaned rows render as N singleton groups. Return a flat list with a `groupKey` field and let the consumer group. Don't bake presentation into the DTO.

**F4. §2.6 — a check-only retention policy is a report wearing a policy's clothes.** I stand by "an unrun policy is a document." What you have now is an *alarm with no runbook*: it tells you disk grew, nobody acts, the number keeps growing, the alarm trains you to ignore it. Either add `--prune --dry-run` (default dry, explicit `--apply`, allowlist unchanged — your sweep/delete separation was correct, keep it) or rename the thing `retentionReport` so it stops lying about what it is.

### ACCEPT

- **A1. §2.3 `Math.random` jitter.** Fine. Jitter is not security-sensitive; injectability for tests is the correct and only requirement. Non-issue.
- **A2. §2.7 push-before-review.** Actual risk taken: **low blast radius, and your mitigation claim is the part I don't trust.** "Nothing on a request path imports it" — is that verified or asserted? Run the import-graph check (`madge --orphans`, or a 5-line `grep` of route entrypoints) and paste the output into the PR; an unverified negative is how the retention hole happened. The deployed damage was real but trivial (broken paths in a local artifact). The process debt is the finding: you now have a batch whose review is post-hoc, which means **this review's fixes need their own review before the follow-up deploy.** Don't compound it.

---

## (c) LIES IN THE DIFF

1. **"Sheet reports how many were linked."** False as shipped. It reports how many `src` strings were *written*. For `ab-avoid/`, every one of those links was broken and the sheet reported success. Intent counted as effect — your own recurring failure #4, instantiated.
2. **The retention test name(s).** Any test named like "walks artifact root" / "reports total size" was false while passing against an `images/`-only fixture. 205/205 green included a test that certified a falsehood. The suite's pass count is currently **evidence of fixture quality, not correctness** — say that in the README or it's a lie too.
3. **PROVENANCE comments — mostly decorative until proven otherwise.** `$0.50` is a policy choice; provenance "Sean's policy" is real. `180s` and `6 MB` need a *measurement or a derivation*, and note: 6 MB inline → ~8 MB base64 → is the threshold about file size, browser memory, or email-ability? If the comment says "chosen reasonable," it's decoration and should say `PROVENANCE: none — arbitrary, revisit with data`. An honest "arbitrary" beats a fake citation.

---

## (d) DELETE

Yes, it's over-built. 20 modules / 205 tests for a single-user CLI is a system looking for a team.

1. **Delete `forgeReadApi.mjs` (Slice 10).** It has no consumer. I made it conditional; you shipped it anyway. A read API with zero readers is pure attack surface and maintenance drag — and F3 shows it's already accruing design debt for a hypothetical UI. Delete it; git remembers. Rebuild it the day a dashboard exists — at which point it falls under full Crystalline Swan gates: styled-components, tokenized colors, Victory for the spend series, 44px targets, 4.5:1, reduced-motion, responsive at all eight breakpoints, ≤300-line files.
2. **Collapse the contact sheet to one code path.** Inline-or-link is two paths; the link path shipped broken because the inline path is the one you actually exercise. Pick one (recommend: always link via `sheetSrc()` above — sheets stay small, no 6 MB threshold, no base64 inflation) and delete the other. One path, tested, true.
3. **Delete decorative provenance** per (c)(3).

---

## H1 — SINGLE HIGHEST-IMPACT IMPROVEMENT

**Reconciliation tests against reality, not fixtures.** Every
