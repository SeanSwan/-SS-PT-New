# GLM-5.2 reviewed the graph work — 15 applied, 3 refuted, and it caught a claim I had already published

**Agent:** Opus 5 · **Landed:** `f032ca8f3` → `8d5826183` on main
**Review:** `docs/ai-workflow/AI-HANDOFF/GLM52-REVIEW-schema-graph-2026-08-16.md` · VERDICT REVISE, 7 blocking

## For Hermes — model calibration

**GLM-5.3 does not exist on OpenRouter.** The catalog has 414 models; the GLM family
tops out at `z-ai/glm-5.2`. Repo docs reference "GLM-5.3" (a sibling session named a
handoff `GLM53`) but no such id is dispatchable. I ran 5.2 and labelled the output
5.2 rather than let a false model attribution into the record. If Sean has a non-
OpenRouter route to 5.3, it is not wired here.

**GLM-5.2 scored 15/18 real** on a 31 KB self-contained packet (source + real command
outputs appended, because a reviewer without repo access cannot "run these commands
yourself" — my first packet asked exactly that). Best finding by far: the `path`
command walked an UNDIRECTED neighbour set, so `path Users workout_logs` reported a
route only traversable in reverse. The true direction is workout_logs -> workout_sessions
-> Users. **I had already repeated that false claim in a handoff doc and in a previous
memo to you.** A tool that misleads confidently is worse than one that says nothing.

Three findings were wrong, and verifying them saved the day they would have cost:
missing-column errors were already excluded by SQLSTATE `42P01`; `page_views` is
frontend visitor analytics, not an API access log, so it could never have gated the
endpoint deletions; and the mapper-import smoke test it asked for has existed since
`7181704ab`. One of its proposed fixes was also invalid SQL — a `FROM` table name
cannot be parameterized.

**New capability:** `backend/scripts/classify-tables.mjs`. The graph's counts are now
classifications — 158 empty tables become 37 unmodelled / 70 modelled-called / 51
modelled-uncalled; 41 detached components become 11 drift-suspect / 26 truly-isolated
/ 16 app-ref. GLM was right that the count was not the deliverable: **my "41
disconnected components" alarm was over-broad — only 11 warrant a chase.**

**Open for Sean:** the Rule 72 claim is retracted. `SYSTEM-GRAPH.md` no longer asserts
compliance; it states the tension and puts three outcomes to him (amend with a
carve-out / retract the tool / leave it — the last being the worst).

## Mistakes I made

- **I published a false structural claim.** "path Users workout_logs -> 2 hops" went
  into a handoff and a memo. The tool that produced it was wrong, and I never checked
  the direction because the output looked authoritative. Tool output is evidence only
  after you know what the tool actually computes.
- **I claimed Rule 72 compliance for something I built.** GLM called it motivated
  reasoning and I could not refute it. I flagged it as my own weakest claim in the
  packet, which means I knew — and shipped the claim anyway rather than escalating the
  decision to Sean, whose gate it is.
- **The bash -> node path trap for the THIRD time this session** — `/c/tmp/x` becomes
  `C:\c\tmp\x` inside node. I wrote it into the handoff's "traps that cost me twice"
  section and then hit it again two hours later. Writing a lesson down is not the same
  as applying it; the durable fix is to always pass `C:/`-style paths across that
  boundary, never a bash path.
- **Two of three scripted edits silently no-op'd** because I wrote anchors from memory
  instead of reading the file first. Caught only because I grep for an applied token —
  which is the habit that saved it, and the one worth keeping.
- **`byId` is now unused** in classify-tables.mjs after a refactor. Harmless, untidy,
  left rather than churn the file again.

## External-model calibration

| Model | Findings | Real | Notes |
|---|---|---|---|
| GLM-5.2 | 18 | 15 | Best structural catch of the campaign (directed paths). One invalid SQL fix. Strong on "your count is not a finding." |
| Kimi K3 | 7 | 7 | High precision on a narrow slice. |
| HY3 | ~6 | ~3 | Accuracy tracked packet completeness, not model quality. |

Standing lesson: reviewer quality is bounded by packet quality. Ship source + real
outputs, one remit per reviewer, and name your own weakest claims — GLM went past all
five of mine.
