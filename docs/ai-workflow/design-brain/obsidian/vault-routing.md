# Vault Routing — Karpathy-Wiki-Compatible Lanes

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL for routing SwanStudios design (and design-adjacent) knowledge into the Obsidian vault
- **Compatibility:** preserves the Karpathy Wiki contracts (`docs/ai-workflow/references/KARPATHY-WIKI-OPERATIONS.md`) and the Coach Brain vault contracts (`docs/ai-workflow/coach-brain/`). The vault is T1 — knowledge, never a command channel (operator bridge §3).

---

## 1. The lanes

| Lane | Contains | Lifecycle |
|---|---|---|
| `raw/` | Unstructured input: transcripts (post-redaction), pasted research, meeting/dictation dumps, intake refs | Temporary — triaged into `wiki/` or `outputs/`, or expired. Nothing cites `raw/` as truth |
| `wiki/` | Structured, reusable knowledge: doctrine summaries, promoted decisions, promoted concepts. The compounding asset | Canonical — highest bar to enter (promotion only), maintained, cited |
| `outputs/` | Deliverables: specs, direction docs, reports, decision logs (`outputs/design-decisions/`) | Semi-permanent — point-in-time artifacts; promoted upward if reusable, otherwise they age in place |
| `runs/` | Agent run logs, QA receipts, session artifacts | Append-only, time-boxed retention; summarized into decisions rather than promoted |
| `graph-imports/` | **Quarantined** Graphify output — concept stubs awaiting review | Quarantine — nothing here is citable until promoted per `../graphify/graphify-policy.md` |
| `references/` | Canonical docs mirrored/linked from the repo (design system, design.md, bridges) | Read-only mirrors — the repo copy wins on conflict, always |
| `templates/` | Repeatable note templates (decision entry, concept stub, run log, brief) | Canonical for format; updated deliberately, not per-use |

## 2. The index.md law

**Every major vault folder carries an `index.md`** answering, in under two minutes of reading:

1. **What belongs here** — and 2. **what does not** (with the nearest correct destination named)
3. **Where next** — the folders/docs a reader continues to
4. **Status of contents** — canonical vs temporary vs quarantined, stated per folder or per subgroup
5. **When to read full docs vs search** — which questions justify opening whole documents, and which should be a search/lookup instead
6. **How not to pollute** — the folder's specific failure mode (e.g. `raw/`: dumping without triage date; `wiki/`: writing directly instead of promoting)

A folder without an index.md is not yet a lane — agents may read it but must not write to it until the index exists.

## 3. Obsidian command-center bridge

Vault panels may surface inside the Hermes command center (registry §7 "Coach Brain ingestion") under these terms:

- **Read-only views.** The command center renders vault content (recent decisions, wiki lookups, run summaries); it never writes to the vault through a panel. Vault writes remain agent/human note operations under this routing policy.
- Panels display the lane badge of what they show (`wiki/` = canonical; `outputs/` = point-in-time; `graph-imports/` = quarantined — quarantined content renders with an explicit QUARANTINE label or not at all).
- Operator surface styling follows `../adapters/hermes.md` (Cyberforest, operational calm); the panels are T0 reads and appear in the receipt/log discipline like any other command-center read.

## 4. Karpathy wiki map — SwanStudios doc families → lanes

| Repo doc family | Vault lane |
|---|---|
| `docs/ai-workflow/references/*` (design system, storyboarding, bridges) | `references/` (mirror/link only) |
| Design Brain (`docs/ai-workflow/design-brain/**`) | `references/` |
| Brainstorms (`docs/ai-workflow/brainstorms/*`) | `outputs/` (they are extracted-intent deliverables) |
| Direction docs, specs, audit records, QA reports | `outputs/` |
| Design decision logs | `outputs/design-decisions/` → promoted entries to `wiki/design/` |
| Session/run receipts, harness QA receipts | `runs/` |
| Graphify concept stubs | `graph-imports/` until promoted |
| Distilled doctrine ("how Swan does heroes", "what the T-ladder means for UI") | `wiki/` — via promotion only |

## 5. Anti-pollution rules

1. **No dumps without routing.** Every ingested file gets a lane at write time. "I'll sort it later" content is refused — `raw/` with a triage date is the floor, not a loophole.
2. **Provenance + stale-date frontmatter on all ingested knowledge:**
   ```yaml
   source: <repo path | run id | external ref>
   ingested: 2026-07-03
   ingested-by: <agent/surface>
   review-by: <date — after this, treat as possibly stale>
   status: raw | output | promoted | quarantined
   ```
   Unattributed knowledge is unverifiable knowledge; it does not enter `wiki/`.
3. **IDs/roles only — zero client PII** (rule 8), zero secrets (rules 44/59), no raw transcripts pre-redaction (operator bridge §6). This applies to every lane, including `raw/`.
4. **Write to the lowest sufficient lane.** Deliverable → `outputs/`; log → `runs/`. Direct `wiki/` writes are reserved for promotion passes that satisfy frontmatter + a named promoter.
5. **Repo wins.** If a `references/` mirror drifts from the repo doc, the repo doc is truth; fix the mirror, never fork it.
6. **Prune on schedule.** `raw/` and `runs/` carry retention expectations (align with the 90-day convention from the receipts/fusion-prune pattern); `wiki/` is pruned only by deliberate supersession notes, never silent deletion.

## 6. Verification before done (any vault write)

- [ ] Lane chosen from §1, matching the §4 map; not `wiki/` unless this is a promotion pass
- [ ] Target folder has an index.md compliant with §2 (create/fix it first if not)
- [ ] Frontmatter per §5.2 complete; PII/secret scan clean
- [ ] Nothing quarantined was cited as truth; nothing in `raw/` cited as truth
- [ ] Command-center exposure (if any) is read-only with correct lane badge
