# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** docs\ai-workflow\AI-HANDOFF\panel-swa200-final-2026-08-24\panel-r4\rounds\round-2\REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 16081 in / 8983 out · **Cost:** ~$0.0000 · **Wall:** 306.9s · **finish:** stop

---

# Ox Alpha — Round 2, fresh-eyes adversarial

Stance: find the defect class the other seats structurally miss. Three rounds hunted vacuous-green. Nobody audited the *data flowing between* the fixes — the handoff points where one round's output becomes the next round's input. That is where this packet bleeds.

## F1 — MAJOR: the seeder's "(none)" sentinel is parsed as a real skipped-table entry, so the skipped-table FATAL machinery runs on every run and false-reds when coverage was actually complete

Trace the handoff, all locatable:

1. `migration-shadow-check.yml` L308: when the seeder skipped **zero** tables, the assertion step computes `skipped="(none)"` — the `|| '(none)'` fallback is inside the captured value, not outside it.
2. L310–312: that literal string is written verbatim into `SEED_SKIPPED` via `GITHUB_ENV`.
3. L384: leg B passes it through untouched: `--skipped "${SEED_SKIPPED:-}"`.
4. `shadow-delta-audit.mjs` L129–133: `"(none)"` survives the split/filter/map — it becomes a one-element array. `skipped.length === 1`.
5. L160: the guard `if (added.length > 0 && skipped.length > 0)` was written to mean "the seeder skipped something." Because of the sentinel, **it is true in every run that has any added migration**, including runs where the seeder skipped nothing.

Two consequences, both in the packet's own terms:

- **False red (the R3-F1 family, reintroduced):** seeder achieves full coverage → `skipped=["(none)"]` → an added migration the extractor cannot read returns `null` (L103–104, L165) → `unresolved` → **FATAL "coverage is UNKNOWN"** at L185–195 — while coverage was in fact total, because there was nothing uncovered. The gate reds a legitimate PR precisely when the seeder did its job perfectly. This is the exact shape round 3 rejected: a correct change blamed by the gate.
- **Lying OK line:** when extraction succeeds, L198–199 prints `OK: no added migration targets a skipped table (1 skipped)` — asserting one skipped table that does not exist. A count asserted nowhere and read by humans who are told it is machine-honest.

This is a defect class the per-file reviews structurally miss: every file passes its own self-test (36/36, 12/12, 6/6 — all cited in the packet), because the self-tests call the functions directly with well-formed inputs. The sentinel is born in the YAML and dies in the argv. Only a cross-boundary trace catches it. Fix: emit an empty string when the list is empty (drop `|| '(none)'` at yml L308, or filter the sentinel in audit L132 alongside `.filter(Boolean)`), and assert `skipped.length === 0 ⇒ block skipped`.

## F2 — MINOR: R3-F7 is wider than the workflow file — every load-bearing gate script is PR-editable too

R3-F7 (open) says a PR can edit *this workflow* and its own green run satisfies the check. But the enforcement logic does not live in the YAML. `shadow-delta-audit.mjs` **is** the honesty gate; `shadow-table-extract.mjs` decides whether the FATAL fires; `shadow-meta-count.mjs` produces both sides of the `before != BASE_COUNT` assertion (yml L330/L347) and the `applied` numerator (L367–369); `pre-migrate-guard.mjs` is confirmed inert. All five sit in the push paths filter (yml L79–86) as recognized gate components, and the `pull_request` trigger (L49–51) deliberately has no filter — so a PR that edits `shadow-delta-audit.mjs` to make `verify` mode `process.exit(0)` unconditionally runs the gate **with its own neutered auditor** and goes green. Same trust model as R3-F7, strictly larger surface: the workflow file is one of six things a PR can rewrite. Any closure of R3-F7 that pins only the YAML closes one-sixth of the hole.

## What I attacked and am NOT filing (named, so silence is evidence)

- **Leg A/B checkout juggling (yml L231–232, L327–328):** verified sound. Leg A checks out BASE migrations+models as a pair (correct — the seeder derives rows from models, and the pair-comment at L226–230 is accurate); leg B restores HEAD before the delta; the audit re-runs the diff at verify time when the tree is back at HEAD, so classify and verify see identical sets. No window where the audit reads a tree that differs from what ran.
- **`applied == added` (audit L142):** the rename path (L94–97) correctly pushes the new name into `added`; `-M` collapse of heavy-edit renames into D+A lands in the same place; delete-and-recreate-same-name shows as M and is honestly reported untestable. The assertion compares like with like now.
- **`.mjs` exclusion (audit L63, L90):** checked the regex boundary — `/\.(cjs|js)$/` does not match `.mjs` (the char before `js` is `m`, not `.`). Correct.
- **Non-integer guards (yml L289–294, L341–346):** the `case` shape-validation trick is correct; a crashing parse in the `$( )` at L284 fails the assignment under `set -e` — fail-closed either way.
- **Merge-commit base drift on PRs:** over-tests (base's new migrations get counted and exercised), never under-tests. Not a defect.
- **Extractor's missed `"${TABLE}"` quoted-interpolation form (File 3 L71):** real gap, but it degrades to `null` → fail-closed. Once F1 is fixed, that is the designed behavior; filing it separately would be manufacturing.

=== VERDICT ===
status: DISPUTE
confidence: 88
findings: F1=MAJOR: migration-shadow-check.yml L308 (+L310-312, L384) with shadow-delta-audit.mjs L129-133/L160: seeder's "(none)" sentinel is written into SEED_SKIPPED and parsed as a real skipped-table entry, so skipped.length>=1 in every run; the added>0&&skipped>0 guard never short-circuits, producing a spurious "coverage UNKNOWN" FATAL (false red) when the seeder skipped zero tables and a lying "OK ...(1 skipped)" line otherwise | F2=MINOR: migration-shadow-check.yml L49-51 vs L79-86: R3-F7's self-modification hole extends past the workflow file — a PR can edit shadow-delta-audit.mjs/shadow-table-extract.mjs/shadow-meta-count.mjs/pre-migrate-guard.mjs and its own green run is enforced by the neutered scripts
rebuttals: (none)
open: Q1=does any seat dispute that "(none)" reaches the audit as a skipped entry — if so, name the line that strips it | Q2=should R3-F7's closure be scoped to pin all six gate surfaces (workflow + 5 scripts), not just the YAML
consensus_block: FIX F1: at migration-shadow-check.yml L308 remove the `|| '(none)'` fallback so an empty skip list yields an empty string (keep the human-readable "(none)" only in the Summary echo at L458); defense-in-depth at shadow-delta-audit.mjs L132 add `.filter((s) => s && s !== '(none)')`. After fix, verify: full-coverage run + unreadable added migration => green with no FATAL; genuinely-skipped table + matching added migration => FATAL unchanged. ACCEPT as intentional: modify/delete/rename reported-not-failed (audit L150-158); new tables created by the delta meeting empty tables; push-side paths filter retained while pull_request stays unfiltered. RESIDUAL RISKS: R3-F5 (.ts/.cts count drift), R3-F6 (HEAD .sequelizerc/config during leg A), R3-F7 widened per F2 (gate scripts PR-editable), workflow has never executed (billing startup_failure) so every fix remains paper-verified, and the extractor's quoted-interpolation gap relies entirely on fail-closed null handling.
=== END-VERDICT ===
