# SwanGuard — five-seat roadmap panel: verdict and what to do next

**Panel:** Grok 4.6 · DeepSeek V4 Pro · Kimi K3 · GLM 5.3 · **Ox Alpha** (first run).
**Final seat:** Fable 5. **Spend:** $0.16 (Ox $0, GLM $0 subscription).
**Repo:** `merge/newsroom-mainline-v3` @ `433cb64`. Replies: `panel-roadmap-2026-08-23/`.

Every finding was executed before being accepted. Two were confirmed, several disproven.

---

## 1. The one finding that lands hardest — and it is mine

**Ox Alpha 1.1, CONFIRMED:** the manifest I built to stop retroactive stamping **stamped the 107-feed
baseline with `specVersion: 1`** — probes run 2026-08-21, before `probe-spec.json` existed. I
committed the exact failure the module was written to prevent, within the hour of writing it.

Fixed (`433cb64`): `PRE_SPEC` is now the honest version, incomparable to every real one in **both**
directions, and `--spec-version` accepts only `pre-spec`. The consequence is admitted rather than
hidden: **the 107-feed baseline is undiffable until the first re-probe under the real spec.**

Also confirmed and already fixed this turn: `test:scripts` globbed `scripts/*.test.mjs` only, so
`scripts/lib/*.test.mjs` would never have run — 8 tests passing locally, invisible to the suite.

**Disproven by execution:** orphan rows in the live DB (none — the shop was already clean); the same
glob defect elsewhere (the other packages use vitest, which discovers recursively).

---

## 2. Where the seats agree

**Unanimous (5/5): `feed_set_hash` now, before S5.** Approvals are family-scoped, so a merge that
changes the feed set silently inherits a human attestation it never received. Two approval rows exist
today — the migration is "a conversation" (Kimi) and "a two-row UPDATE" (GLM). After S5 it is a
146-row backfill and receipts will exist that no attestation covers.

**Strong (4/5): S4 is secretly three or four slices**, and the packet is wrong about where
irreversibility begins. Provenance columns must precede ingest; retention policy and the enforcement
job do not — so bundling them holds ingestion hostage to the slowest unrelated question. Ox adds the
sharpest version: **retention pruning is also irreversible and fires continuously from the moment the
job runs**, not at one checkpoint.

**Split (3 ship / 2 hold) on the console.** Kimi, GLM and Ox say ship it gated this week — a control
surface that exists only in a test harness means the operator story is untested in the environment it
runs in, and S5's drills need it. Grok and DeepSeek say don't: shipping a batch-enable button before
the gates exist "puts a button on the mistake." **The two camps agree on the sequencing**, and differ
only on whether the console lands just before or just after `feed_set_hash` + acknowledgement.

---

## 3. Where a seat beat my own answer

**Terms acknowledgement — GLM's call is better than mine and better than Ox's.** I framed it as
"block all 39 or don't"; Ox said block all 39. GLM points out the framing is wrong: **dormant means
no ingestion, which means no exposure**, so blocking dormant outlets retroactively buys nothing but
friction. The gate belongs at the *enable* moment — record `terms_acknowledged_at` then, hash the
`termsUrl`, and require re-acknowledgement when the terms change.

That converts an owner decision I had queued for you into a design that needs no decision.

---

## 4. The endgame — three seats, one shape

Asked why this lane never reaches a working disagreement map:

- **Kimi:** the independence model is built on **self-declared registry data**. Wire content does not
  announce itself per feed; common ownership of forty local outlets under forty domains is in no RSS
  field. Clustering on declared independence means the fixture trio passes, the suite is green, and
  the shipped map **systematically overstates independence**. *"A disagreement map that inflates
  corroboration is worse than no map: it manufactures consensus."*
- **GLM:** **the coverage clock never starts.** Every shipped slice governs ingestion; the database
  holds 10 items. The map is months of evidence plus four slices of code — the code is on schedule,
  the evidence is at zero, and nothing in the plan starts it.
- **Grok:** **the control plane is the product.** Connectors, phrases, kill switches, probes and
  consoles close in a PR; independence-aware sources and spans into stored bytes do not. Headline +
  snippet + link-out with "nothing republished" read as "nothing stored" leaves claim extraction with
  no legal input, and S9 then clusters headlines. *"That is a news river, not a disagreement map."*

These are the same finding from three angles: **the product's differentiator is the part nobody has
started, and every shipped slice makes the control plane better at governing an empty database.**

---

## 5. My recommendation

**This week, in this order:**

1. **`feed_set_hash`** — unanimous, cheap now (2 rows), expensive after S5. Binds the attestation to
   a specific feed set; enable and `sync()` recompute and refuse on mismatch.
2. **Acknowledgement at enable time** (GLM's design) — no retroactive blocking, no owner decision
   needed, and the live outlet keeps working.
3. **Split S4: provenance columns (S4a) alone, and land them.** Retention policy and the enforcement
   job become separate slices; the enforcement job ships with a dry-run mode that reports what it
   *would* prune for a full cycle before it prunes anything.
4. **Store source-side bytes at ingest** — content-addressed, at the moment of fetch. Grok and Ox both
   land on this independently, and it is the input S8 has no legal substitute for. Without it, spans
   point into text whose original is unrecoverable and the map links to corpses.
5. **Then start the clock: one small live cohort** under bound attestation, enable-time
   acknowledgement, and hard caps. Evidence accrues while the remaining control plane is built.

**What I would not do:** S6's 146-outlet scale proof before a probe *runtime* exists (load-testing a
system with no liveness loop proves nothing you will use), and S7's wiki module early — it blocks
nothing and sits in the plan because it is easy.

**Still genuinely yours:** the console — ship-gated (3 seats) or hold until the gates land (2 seats).
Both camps agree it must not stay tested-but-unreachable, because that state reads as progress.

**And the ground-truth gate, which I would put in front of S9:** hand-label a few dozen real stories
from the live feeds — known wire pickups, known same-owner clusters — and require measured precision
on syndication edges before the map is built on the model. The fixture proves the code does what the
code says; only labelled real data proves the model of the world is right. It is cheap now and
effectively impossible to retrofit once a map is being shown as evidence.

---

## 6. Ox Alpha — first run, and the disclosure

Ox produced the strongest single review of this session: it caught my fresh retroactive-stamp,
identified where irreversibility actually begins (the `independence_group_id` normalisation decision
in S3b, not S4), and split S4 correctly.

**Disclosure, because the seat costs something other than money:** Ox Alpha is a stealth listing —
**$0, but prompts are retained by an undisclosed provider.** The packet sent was secret-scanned clean
and contains no PII, credentials, or client data; it does disclose SwanGuard's architecture, table
names, commit SHAs and roadmap to an unidentified lab. Sean named the seat explicitly; this records
what it cost.

**My own error, twice:** Sean asked for "Ox Alpha" in two previous turns and I treated it as a
dictation garble of Kimi rather than checking the seat list. It is a real, configured seat. Both
times I substituted my assumption for a one-command check.
