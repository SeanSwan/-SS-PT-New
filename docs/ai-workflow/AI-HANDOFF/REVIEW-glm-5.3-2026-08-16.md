# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/PACKET-video-compliance-hostile-review-2026-08-16.md
**Tokens:** 1166 in / 9306 out (reasoning: 7507) | total 10472
**Wall:** 151.8s

---

## First, the blocking problem with this packet

**The code isn't in it.** Six files are named, none are included. You asked for `file:line · severity · failing input` — I can't produce that honestly, and per your own ground rule, a fabricated finding displaces a real one. So below you get: verdicts on the six design decisions (fully answerable from the packet), a ranked list of *conditional* defects with the exact input that confirms or kills each, and the one environmental fact that scares me more than anything in the code. Paste the files and I'll do the line-level pass.

## Design decision verdicts

**1. Spend $0 / runs 50 — defensible.** "Unconfigured denies rather than permits" is satisfied by any *bounded* default: 50 runs/day denies at 51. The free provider can't incur spend, so a $0 spend ceiling plus a finite run ceiling is fail-closed in both dimensions. Don't weaken it further. One action: record this interpretation in the licence snapshot or a follow-up to MiniMax, so the reading is visible to the party you made commitments to, not just to your reviewers.

**2. Flag-don't-block for real people — defensible only under two hard conditions.** Consent is a fact outside code's reach, so publication-time enforcement is the correct boundary *if* (a) the flag is **persisted into the frozen provenance record**, not emitted as a log line, and (b) pre-publication review is enforced in code, not policy. If the flag is ephemeral, you have no control at all — you have analytics.

**3. Pinned bypasses — the honesty is right; the rationale is wrong for these two classes.** "Reliable de-obfuscation costs false positives" is true for Cyrillic homoglyphs, zero-width chars, emoji padding. It is **not true** for your two pinned holes. Evaluating a second variant — whitespace-collapsed and digit→letter normalized (`1→i/l, 3→e, 0→o, 5→s, 4→a`) — and refusing if *either* raw or normalized trips, closes `ch1ld` and `c h i l d` at near-zero FP cost. A legitimate prompt whose *de-spaced* text spells "child" requires a contrivance like "chic hild". Keep the test pins for the adversarial classes you genuinely can't close; closing these two while pinning the rest is the honest version of this decision. As written, this is rationalization-adjacent.

**4. Retryable upload failure — right call, conditional on retry topology.** A completed job with a dangling r2Key is a lie in your own records; retryable-with-artifact-preserved is honest. But it flips to a **blocker** if the retry re-enters `runGenerate()` from the top: double GPU spend, orphaned first artifact, and a provenance record describing the *second* generation. The retry path must detect or checkpoint the preserved local file before re-invoking the provider. Verify this before anything else.

**5. JSONB provenance — defensible for snapshots; insufficient for "durable."** Co-locating with the asset row is correct (provenance can't be orphaned; per-asset licence snapshots are the right shape — better than an FK to a mutable licences table). But neither JSONB nor a dedicated table gives you immutability by default. ~10 lines fixes it: a `BEFORE UPDATE` trigger rejecting changes where `provenance IS DISTINCT FROM OLD.provenance`, plus a `schemaVersion` field inside the blob.

**6. Trusting `commercial` — there is a better boundary, and it's cheap.** Not detection (impossible, as you say) — **attribution**. Make the attestation a durable per-account election rather than a per-request boolean, and stamp the declaring principal + timestamp into the frozen provenance. A per-request anonymous flag is an unattributable lie; an account election is an auditable one. Also confirm the absent-flag default selects the *stricter* licence snapshot — deny-by-default on the gate itself.

## Conditional defects, ranked — run these inputs

**C1 · `buildProvenance` · major-if-confirmed.** `Object.freeze` is shallow. If the record contains a nested object (your "licence snapshot" strongly implies one), `prov.licence.terms = 'public domain'` does **not** throw — only top-level assignment does. Worse, freeze is lost entirely on the Postgres round-trip, so with no DB trigger (your migration is unrun and likely doesn't include one), *any* codepath with UPDATE access rewrites provenance silently. Test: mutate a nested field in strict mode; then UPDATE the column directly. Deep-freeze at build + the C5 trigger is the fix.

**C2 · `checkRunAllowed` · blocker-if-confirmed.** Your "third path" is almost certainly **NaN**. `Number(undefined)` and `Number("garbage-env-value")` are NaN; `NaN > cap` is `false`, so a NaN cost estimate or NaN cap sails through any guard that checks only `typeof x === 'number'`. Secondary: negative cost quotes — if the ledger does arithmetic, a provider quoting `-0.5` walks the balance backward forever. Test: unset the cap env var entirely (vs. absent key — they differ), and a model price of `NaN`.

**C3 · `runGenerate` retry · major-if-confirmed.** Covered in verdict 4: does an upload-failure retry re-bill? If the retry re-enters generation, this is double-spend plus a provenance/generation mismatch — worse than the failure mode you chose this design to avoid.

**C4 · `safeLeafName` · test these five:** leaf containing `/` (retained `/` re-introduces structure — harmless in an S3 key, **real traversal** if any consumer path-joins it on the worker, e.g. the ComfyUI local artifact path); `..`; `.`; NUL byte; and a name that's *only* dots/punctuation after sanitization (does it collapse to empty, and what does an empty leaf do to the key?). Also verify the leaf comes only from the provider response, never the client prompt — you asserted this; assertion ≠ code.

**C5 · migration · and the scariest sentence in the packet.** "Local dev points at production" + an unrun migration sitting beside it is a **blocker independent of the migration's content**. Before anything else: a guard (separate migration connection string, or `MIGRATE_PRODUCTION_CONFIRM` env), then verify additive-only, PG-11-safe constant default (no table rewrite on a large `media_assets`), and a `down()` that *refuses* to drop provenance data without explicit confirmation.

**C6 · ledger fail-open · not exploitable in your real threat model — with one caveat.** The operator can set the cap env to a billion; the ledger isn't the boundary they'd attack. But check: does the write path **rewrite** the file (corruption self-heals after one write) or **append** (stable corruption → *every* read returns zero → cap silently never trips, permanently, not one day of overage). If append: on corrupt read, quarantine-rename the file so the next write starts clean, and alert.

**C7 · naive minor phrasings — test these classes:** explicit numeric ages ("a 12-year-old's birthday", "12 yo", "age 10") — the highest-probability remaining gap; synonyms (`toddler`, `preteen`, `kindergarten`, `schoolgirl`, `juvenile`, `grade-schooler`, `loli`); non-English (`niña`, `enfant`, `bambino`). Note the FP tension runs the other way too: "children's hospital" argues for a flag-tier on ambiguous tokens, block-tier on unambiguous ones.

**One minor:** `E_BAD_CAP` as *permanent* is defensible only if you have requeue tooling for after the operator fixes config. Config errors don't expire at the UTC boundary, but they do get fixed by humans; permanent classification means healed config doesn't heal the dead jobs.

**Send me the six files and I'll convert C1–C7 into confirmed findings or retractions, with line numbers.**
