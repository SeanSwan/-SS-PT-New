# Graphify Templates — Concept Stub & Source Wiring

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL formats; mechanics in `graphify-policy.md`
- Copy-paste these verbatim; fill every field. A field you can't fill is a signal the stub isn't ready (usually missing provenance — fix that, don't blank the field).

---

## 1. Concept-stub template (one per node worth keeping; lives in `graph-imports/<date>-<slug>/`)

```markdown
---
name: <concept name — noun phrase, e.g. "Chart narrative column">
type: concept-stub
source-docs:
  - <repo or vault path #1, e.g. docs/ai-workflow/references/SWAN-CINEMATIC-DESIGN-SYSTEM.md §C11>
  - <path #2 …>
run-id: <graph-imports folder name, e.g. 2026-07-03-design-pattern-chains>
created-by: <agent/tool + human runner>
created: 2026-07-03
quarantine-status: quarantined        # quarantined | promoted | rejected
promotion-decision: pending           # pending | promoted | rejected — <reason>
promotion-date:                       # filled only on decision
promoted-to:                          # wiki/ path, filled only if promoted
links:
  - <related concept-stub or promoted note, with one-word relation, e.g. "constrains → [[DD-2026-07-03-chart-narrative-column]]">
---

# <Concept name>

<2–5 sentences: what this concept IS, derived strictly from the source docs above —
no claims the sources don't support. If the graph inferred a relationship the
sources don't state, mark it INFERRED and treat it as [HYPOTHESIS].>

**Chain value:** <the multi-hop question this node helps answer — the reason it was kept>
```

Rules: `quarantine-status` + `promotion-decision` are the load-bearing fields — command-center panels and agents key off them. No PII in any field, including `links` relation text. A stub whose `source-docs` list is empty is deleted at import review, not repaired later.

## 2. Source-wiring template (inside a PROMOTED note in `wiki/`)

Appended as the final section of every note promoted out of quarantine — it is how a promoted concept cites its origin docs and its receipt:

```markdown
---
## Provenance & wiring
- **Origin:** promoted from graph import `<run-id>` on <promotion-date>, decided by <Sean | delegated Fable pass, thread ref>
- **Source docs (claims trace here, not to the graph):**
  - <path #1> — <which claim(s) in this note it supports>
  - <path #2> — <…>
- **Usefulness receipt:** <the question/thread/run where this concept earned promotion — link or id>
- **Inferred content:** <none | list of INFERRED statements retained, each tagged [HYPOTHESIS] with its review condition>
- **Removability:** deleting this note requires <one delete + link sweep of: [[note-a]], [[note-b]]>; no repo doc depends on it
- **Original stub:** graph-imports/<run-id>/<stub-file> (status updated to `promoted`)
```

Rules: every substantive claim in the promoted note must map to a source-doc line here — the graph is ancestry, never evidence (`graphify-policy.md` §4: a note that only makes sense inside the graph tool was never promotable). The original stub is updated (`quarantine-status: promoted`, `promoted-to:` filled) in the same pass, so quarantine and wiki never disagree about a concept's state.

## 3. Verification before done (whenever these templates were used)

- [ ] Every field filled; no blanks, no invented sources
- [ ] Stub claims trace to `source-docs`; inferences explicitly marked INFERRED/[HYPOTHESIS]
- [ ] Promoted notes carry the full §2 block; stub and wiki state updated together
- [ ] PII/secret scan clean on all fields and link text (rule 8)
- [ ] Removability line is true — actually checked, not asserted
