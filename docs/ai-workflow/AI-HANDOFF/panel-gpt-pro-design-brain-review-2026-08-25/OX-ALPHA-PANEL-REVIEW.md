# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** docs/ai-workflow/AI-HANDOFF/GPT-PRO-DESIGN-BRAIN-REVIEW-PANEL-PACKET-2026-08-25.md
**Seed:** (none)
**Tokens:** 10314 in / 4856 out · **Cost:** ~$0.0000 · **Wall:** 149.6s · **finish:** stop

---

## VERDICT
REVISE — the packet's diagnosis (visual chooser first, event store second, everything else deferred) is correct, but the week-1 build plan ships an event schema that cannot represent its own primary interaction (the 12-up grid), hardcodes away the provenance quarantine it endorses, and has unstated rules for file concurrency, copyright containment, and pre-data fallback that will each bite within the first two sessions.

## BLOCKERS

1. **P0 — The TasteEvent schema cannot represent the 12-up orientation grid, which is the centerpiece of week 1.** The schema (§3) models exactly one pairwise comparison: `candidateA`, optional `candidateB`, `response: 'A'|'B'|'both'|'neither'|'depends'|'skip'`. Q7 (§4.3) instructs: 12 images, "choose ≤3 that immediately feel closest, 3 that clearly miss, leave the rest neutral." A k-of-n selection with per-item outcomes (positive / negative / neutral) is a *different event type* — you'd have to explode it into ~66 fake pairwise events or log it outside the schema, which means the richest signal from session one lands in an untyped side channel. Fix before any session runs: add an `eventType` discriminator (`pairwise | grid | artifact-anchor | skip`) with per-type payloads.

2. **P0 — `source: 'sean'` is a hardcoded literal in the schema, silently repealing the provenance quarantine the packet endorses.** GPT's P0-6 and the packet's own adoption of it require `source ∈ {sean | agent-placeholder | imported | inferred}` so placeholders are quarantined, not trained on. As typed, an agent-authored or imported event *cannot exist* in the schema — so the first shortcut (backfilling themes.md evidence, importing old ratings) writes either invalid events or `source:'sean'` lies, and the quarantine becomes unfalsifiable. Evidence: §3 interface, vs. §4.2 write rules requiring `source` on every themes/rejected/sref entry.

3. **P1 — Append-only log with no `schemaVersion` and no `eventType` is unrecoverable-on-first-drift.** `events/<session>.jsonl` is declared append-only (§1, Fable plan item b). The moment the schema evolves — and blocker #1 guarantees it evolves within days — there is no way to distinguish v1 rows from v2 rows except guesswork. One string field now, or a migration nightmare later.

4. **P1 — Two writers, one JSONL, no concurrency rule.** The week-1 plan has grill-me (CLI/session context) *and* the Prompt Studio server at 127.0.0.1:7331 both producing events for the same session. Two processes appending to `events/<session>.jsonl` without a single-writer rule or lock will interleave partial lines; JSONL corruption in an append-only store is silent and permanent. This is the concrete answer to "what breaks first in practice" (Q5): not the model, the file. Cheapest fix: all writes go through the :7331 server's one append endpoint; grill-me POSTs to it.

5. **P1 — Copyright containment for Midlibrary thumbnails is asserted, not engineered.** Fable's plan puts "local-only Midlibrary reference thumbnails" behind the Prompt Studio server. Nothing states: (a) assets live outside the repo and `.gitignore`d by path, (b) the server binds loopback only and fails loudly otherwise, (c) thumbnails are regenerated derivatives, not redistributed originals, if even that. One `--host 0.0.0.0` flag or one careless `git add assets/` and copyrighted material leaves the machine or enters history. This must be a written invariant, not a habit.

6. **P2 — Free-text `note?: string` is a zero-PII-to-LLMs violation waiting to happen.** House rule: IDs only to LLMs. The moment events feed theme synthesis or a prompt compiler, `note` is the field where "reminds me of the client shoot at [location]" appears. Either drop the field in v1 or define it as tag-ID-referencing only.

## ATTACKS

**Correctness**
- **No cold-start fallback is defined.** The plan defers Bradley–Terry until ≥200 real events — correct — but never says what grill-me hands Forge on day 1–30. Absent an explicit answer ("themes.md priors + catalog facets, labeled as prior-tier"), the system silently degrades to the keyword filter GPT demolished, and nobody will notice because the interface looks the same.
- **Q11/Q13 exceed week-1 scope and the packet doesn't admit it.** "Short silent motion examples" (Q11) and three treatments of an impossible phenomenon (Q13) require motion generation per session — directly contradicting the cheap-local-surface framing. Either mark Q11+ as phase-2 or budget it explicitly; as written the grill sequence promises surfaces the week-1 build doesn't have.
- **Blinding failure mode (Q6, asked and under-answered):** Sean curated the 223-SREF corpus himself; hiding style names blinds almost no one, and the post-choice reveal creates anchoring on subsequent picks (label-induced preference shift). Partial mitigation worth writing down: randomize reveal order across sessions and record pre-label confidence; accept that blinding is weak for the corpus owner and lean on controlled pairs (same subject, varied treatment) instead, where recognition can't shortcut the judgment.
- **Neutral images have no lifecycle.** Q7 says "neutral stays neutral," but nothing ever revisits neutrals. They're the cheapest contradiction-test pool later; the write rules should say so or they rot.
- **`leftRightRandomization?: string`** — a string for what is semantically a boolean-plus-seed. Vague typing here means position-bias correction can't be computed reliably later.

**Security**
- Threat surface is small (single-user, loopback), which is exactly why the two real risks get skipped: loopback-bind enforcement (blocker #5) and the note-field PII path (blocker #6). Also: session IDs in filenames must be opaque IDs, never derived from project names or dates-with-client-context.
- No dedup/idempotency rule on event submission — double-click on the comparison UI yields duplicate identical events, inflating win counts. Cheap: hash(candidateA+candidateB+timestamp-window) dedup at the append endpoint.

**Data-truth / schema drift**
- `reasonCodes: TasteReason[]` references a type defined nowhere in the packet. GPT supplied a prose list (light · composition · realism · material · palette · subject · typography · motion · pacing · density · other); the schema implies a type. When someone implements, they'll invent their own enum and it won't match the grill copy. Freeze the enum in `schemas/taste-event.schema.json` and generate the UI chips from it.
- `medium: 'shared' | ...` includes `'shared'`, but no question in Q1–Q13 ever produces a shared-medium event — dead enum value or missing flow; decide which.
- The four write-target files (themes/rejected/loved-srefs/kept) each demand `evidenceEventIds`, but nothing defines what happens when an event is later invalidated (Sean reverses a choice). Append-only events + mutable markdown summaries = drift by design; state the reconciliation rule (summaries are views, rebuildable from events, never hand-edited) or the files will fork from the log within a month.
- Fable's arithmetic checks out (145/4272 ≈ 3.39%, 145/4029 ≈ 3.60%); no dispute.

**House-rule interactions (binding, and the packet ignores them entirely)**
- The comparison UI is specified with zero frontend constraints. When built it must use styled-components, Victory (if any charts appear), `var(--token,#fallback)` palette, Dual-Button Glow for the A/B confirm pattern, 44px touch targets, dark-first, WCAG 4.5:1, ≤300 lines/file. A 12-up grid with per-image select + reason-tag chips cannot fit 44px targets in one mobile viewport — plan horizontal paging or desktop-first explicitly.
- **The dark-first rule actively threatens measurement validity:** judging Q5 (light/value) and Q9 (palette) on a dark-chrome surface systematically biases Sean toward darker, lower-key candidates — simultaneous-contrast is not subtle. The judging surface needs a neutral mid-gray surround independent of app chrome. This is the kind of thing that quietly poisons every value-structure event logged.

## HIGHEST RISK
The append-only event log is the one asset you cannot rewrite, and blockers #1–#3 mean the current plan records its first sessions in a schema that can't express the interactions, can't express provenance, and can't be versioned. Every downstream model inherits that poison permanently. Cheapest de-risk: **before the first real session, freeze schema v1 with `schemaVersion` + `eventType` discriminators and a defined `TasteReason` enum, then run 20 synthetic events (including one 12-up grid, one agent-placeholder, one reversed choice) through the read side end-to-end.** Half a day of work; it converts an unrecoverable-format risk into a checked-in fixture.

## CONFIDENCE
I could not verify, from this packet alone:
- Whether `swan-taste-brain` already contains schemas/events (the b36697e commit is cited but not shown) — if schemas exist, blockers #1–#3 may be partially moot or partially worse. Settle with: the actual `schemas/` directory contents.
- Whether the Prompt Studio server at 127.0.0.1:7331 exists as described, its bind config, and its write path. Settle with: the server source and its startup flags.
- The truncated content (§4 Q13+, worked example, §5 twelve suggestions, §6 action list) — per the remit I have not reviewed it, but blocker-level requirements for it: the worked example must show a complete raw TasteEvent JSON for at least one grid and one pair round, and the action list must name the schema-freeze as step 1.
- Actual Midlibrary licensing terms — "cannot leave the machine" is asserted twice but no license document is cited. Settle with: the license file; if it forbids derivative thumbnails too, Q4's answer collapses to generated-candidates-only and the week-1 plan changes materially.
- Whether `TasteReason` or equivalent exists elsewhere in the corpus. Settle with: grep of the taste repo.

My confidence is high on the schema/concurrency/copyright findings (they're internal contradictions visible in the packet itself) and deliberately low on anything touching the private repo's current state — the packet's own honesty about truncation cuts both ways, and I've flagged accordingly rather than guessing.
