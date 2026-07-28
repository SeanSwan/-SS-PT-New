# Design-Brain MVE — the Mobbin learning engine (D1-independent core)

Built 2026-07-20 per the Kimi Pass C "Minimum Viable Engine" ruling (`docs/ai-workflow/AI-HANDOFF/
brain-review-2026-07-19/04-…MINIMUM-VIABLE-ENGINE.md`), amended by Pass D (vault emit replaces MCP
tooling). ~800 lines, zero dependencies, 14/14 tests. **Sean is the gate** — no broker, no coverage
matrix, no unattended runs; a present human replaces the authorization machinery.

## The loop (one research batch)

```bash
export SWAN_DESIGN_BRAIN_ROOT=~/design-brain          # jailed: never inside a git repo or the vault

# 1. INSPECT (agent or Sean) — one receipt per opened reference:
echo '{...receipt json...}' | node src/log-receipt.mjs --root $SWAN_DESIGN_BRAIN_ROOT
#    Vacuous receipts are REFUSED (hierarchyNotes ≥40 chars, principles ≥15). Deep links stay
#    client-side. No screenshots/HTML/tokens — denied fields hard-fail.

# 2. SYNTHESIZE — receipts → convergence claims (mechanical confidence from product count):
node src/synthesize.mjs --root $SWAN_DESIGN_BRAIN_ROOT

# 2b. CORROBORATE — fold near-verbatim re-hits into ACCEPTED claims (no letter needed), queue the
#     ambiguous ones, surface contradictions. Idempotent; safe to re-run:
node src/corroborate.mjs --root $SWAN_DESIGN_BRAIN_ROOT

# 3. PACKET — one markdown file: NOVELTY dial on top, then only claims that need a letter
#     (auto-corroborations appear as FYI, no DECIDE blank):
node src/packet.mjs --root $SWAN_DESIGN_BRAIN_ROOT

#     …and any time, "where do I point next / is a domain tapped out?":
node src/novelty.mjs --root $SWAN_DESIGN_BRAIN_ROOT

# 4. SEAN DECIDES — edit each DECIDE line in batches/BATCH-<date>.md:
#      a = accept · r = reject · t = trial · m CLM-xxx = merge   (unmarked = stays proposed)

# 5. ADJUDICATE — transcribe the letters into the ledger + regen INDEX.md:
node src/adjudicate.mjs --root $SWAN_DESIGN_BRAIN_ROOT --batch <edited file>

# 6. EMIT (WSL) — accepted claims → vault `design-claims` collection, searchable via brain_search:
node src/emit-vault.mjs --root $SWAN_DESIGN_BRAIN_ROOT --vault ~/hermes2/brain-vault --build
```

## Trust model (do not renegotiate)
- **claims.jsonl is the asset**; packet/INDEX/vault-notes are derived, regenerable views.
- Claims are **recall-tier even when accepted**. Canon lives in `config/doctrine.md` + the Design
  Brain docs, promoted only by Sean hand-editing. There is no promote script on purpose.
- Only shipped **products** corroborate. Agent text (repo-docs, memos) never counts.
- Contradictions stay visible in the ledger; scoring never resolves them.
- Single-source claims are capped `low` until a second independent product corroborates.

## Gates still owned by Sean
- **D1 (Mobbin ToS)** — gates the agent-driven PILOT, not this engine. Any inspector works,
  including Sean dictating observations. When D1 clears: the pilot = steps 1–6 against one D01
  surface across 3–4 products, ≤12 results reviewed, under the existing weekly caps.
- **D3** — deep domains default to `config/domains.json` (marketing swapped in per Pass B2 §8.4);
  revert = flip two `depth` fields.
- Weekly cadence target: ~75 min adjudication + ~15 min spot-checks. Spot-check habit: pick 2–3
  receipts, open the product yourself, confirm the flow exists and the notes aren't vacuous.

## Self-regulating learning (novelty dial + auto-corroboration)
- **Auto-corroboration** (`src/corroborate.mjs` + `src/similarity.mjs`): a near-verbatim re-hit of an
  already-ACCEPTED principle from a NEW product folds in automatically — appends the product, appends
  the receipt, recomputes confidence via `confidenceFor` ONLY — with **no letter from Sean**. Same
  product twice = confidence no-op. It never edits principle text, never accepts, never merges,
  never resolves a contradiction. Ambiguous matches (0.55–0.82) go to a merge queue with a suggested
  `m`; STRONG-negation matches surface as contradiction candidates. Every automated change is a
  `rev+1` append to `claims.jsonl` with an `autoUpdate` audit block — `grep CLM-x claims.jsonl` shows
  the whole chain. claims.jsonl stays append-authoritative; every reader folds via `loadClaims`.
- **Novelty dial** (`src/novelty.mjs`): `novelty = (fresh + contradictions) / receipts`, rolling over
  the last 3 domain-runs. States INSUFFICIENT DATA → PRODUCTIVE (≥0.25) → COOLING → TAPPED OUT
  (<0.10 AND ≥6 known claims AND ≥12 window receipts). Prints at the top of every packet and via
  `node src/novelty.mjs`. **Recommends, never blocks** — when a domain is re-confirming instead of
  learning, it says "stop spending here, next best domain is Dxx." The two floors stop a starved
  domain from falsely reading as mapped.
- All thresholds live in `config/tuning.json` (retune without touching code). Vectors remain OUT
  (Pass B/C/D ruling held); true disjoint-vocabulary paraphrase lands as a fresh claim Sean merges
  with one `m` — the honest K5 residual, kept human-visible.

## Files
`src/paths.mjs` jail · `src/writer.mjs` hardened writes (binary/symlink/atomic/audit) ·
`src/validate.mjs` receipt/1+claim/1 contracts (schemas in `schemas/` are the documented shape) ·
`src/log-receipt.mjs` · `src/synthesize.mjs` (content-derived stable claim ids + the `loadClaims`
fold) · `src/similarity.mjs` (deterministic lexical matcher) · `src/corroborate.mjs` (disposition
engine) · `src/novelty.mjs` (saturation dial) · `src/packet.mjs` · `src/adjudicate.mjs` (idempotent,
merge-chain-refusing) · `src/emit-vault.mjs` (accepted-only, vault-native, delete-and-rewrite mirror) ·
`config/tuning.json`+`stopwords.json`+`negation-cues.json` · tests: engine·similarity·corroborate·
novelty (**39 total**).
