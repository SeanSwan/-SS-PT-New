# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/TASTE-BRAIN-ROUND3-KIMI-PACKET-2026-08-26.md
**Seed:** (none)
**Tokens:** 26507 in / 5159 out | **Cost:** ~$0.1569 | **Wall:** 221.3s | **finish_reason:** stop

---

# Kimi K3 — round 3, post-fix audit

**The single most important finding: the fourth corpus door is the compiler's output, not the writer.** Fix 3 closed the event writer, but `compileProfile` still emits Midlibrary style codes — ranked, promoted to directions, with sample prompt text — into a partner/client `taste-profile.json` and the `/brief` readout. The fix guarded the door events come *in* through and left the door they come *out* through open, and it is not retroactive against events already on disk.

---

### P0 — Corpus codes reach a non-Sean memory through `directions()` and the written profile
File / where: `prompter/lib/profile.mjs`, `compileProfile()` lines 143–167 and `directions()` lines 97–135; root cause in `tally()` line 80.
Failure: Two concrete inputs, either sufficient:
1. **Pre-fix residue:** a partner memory whose `events/*.jsonl` already contains a `midlibrary-reference` grid (written before fix 3 — fix 3 refuses *new* writes, nothing scrubs old ones). `GET /api/profile?profile=partner&project=<slug>` → `tally` bumps `t.srefs` (line 80, unfiltered), `directions()` emits `dir:midjourney-srefs` with `srefs: [<code>]` and `prompts: ["<corpus subject> --sref <code> --ar 16:9"]`, and `compileProfile(write:true)` persists it to `taste/profiles/partner/<slug>/taste-profile.json`.
2. **Post-fix crafted event:** `validateEvent` (events.mjs lines 89–105) checks `c.provenance` but never inspects `c.sref`. POST `/api/event` with `profileId:'partner'`, a candidate `{ id:'x1', provenance:'unsplash', sref:'123456789' }` and a `closest` item with `outcomeClass:'style'` passes validation and produces the same result.
Consequence: licence breach — corpus style codes and corpus-derived prompt text in a non-Sean memory's compiled profile and printed brief. This is exactly the breach class of fixes 1 and 3, one layer down. Note the asymmetry the code itself documents: line 154 filters `t.picks` by `SHAREABLE_PROVENANCE` "because /brief prints these" — and then lines 161–164 print `srefs`, `proposedAvoids` (derived from srefs) and `directions` unfiltered.
Smallest fix: in `tally()`, gate the style-code channel on the witness: `if (witness !== DEFAULT_PROFILE) { bump subjects only; skip bump(t.srefs …) and bump(t.provenance …) }` — a judged picture in a non-Sean memory teaches subjects and reasons, never catalogue codes. Belt-and-braces: in `compileProfile`, when `profile !== DEFAULT_PROFILE`, drop `dir:midjourney-srefs` from `out.directions` and derive `proposedAvoids` from `t.subjects` misses instead of `t.srefs`. Optionally also refuse a `sref` field on any candidate whose provenance is not `midlibrary-reference` in `validateEvent`.

### P1 — `/api/keep` writes arbitrary text, including `--sref` codes, into a partner's `kept.md`
File / where: `prompter/lib/taste-namespace.mjs`, `keepFor()` lines 158–175; reachable via `serve.mjs` `/api/keep` lines 194–214.
Failure: `POST /api/keep { profileId:'partner', projectId:'x', prompt:'misty harbour at dawn --sref 123456789 --ar 16:9' }` → accepted (≥3 words, ≤2000 chars), appended verbatim to `taste/profiles/partner/x/kept.md`. The natural way this happens without malice: Sean generates in his own tab (corpus codes present), the partner keeps that text into her memory from the Kept tab. `subjectOfPrompt` strips params for *generation*, so the pool stays clean — but the file itself, which the brief/kept surfaces read and print, now contains a corpus style code. This is the `kept.md` door the brief explicitly asked about; fix 6 harmonised the length cap but neither keep channel validates *content*.
Consequence: corpus material persisted in a non-Sean memory's own files, outside every provenance guard.
Smallest fix: in `keepFor`, for non-default namespaces reject (or strip at the `--` boundary) any text containing `--sref` / Midjourney params: `if (/\s--[a-z]/i.test(text)) return { ok:false, error:'kept prompts are subject text only — no parameters' }`.

### P2 — Seed aliasing on `/api/prompt` (fix 8's twin, unpatched)
File / where: `prompter/serve.mjs` line 132 → `generate.mjs` `rngFrom` line 14.
Failure: `GET /api/prompt?seed=4294967297` and `?seed=1` return identical prompts but report different `seed` values (`out.seed` is the untruncated input). Fix 8 capped this exact class in `renders.mjs` but the prompt endpoint still accepts any `/^\d+$/`.
Consequence: misleading reproducibility metadata only — replay is deterministic, so no data loss. But two "different" recorded seeds being the same draw is the same lie fix 8 was aimed at.
Smallest fix: `const seed = seedRaw && /^\d+$/.test(seedRaw) && Number(seedRaw) <= 0xFFFFFFFF ? Number(seedRaw) : undefined;`

### P2 — The two floors disagree where it is visible
File / where: `projects.mjs` `DONE_FLOOR` (partner: 8 grids/40 judgements) vs `profile.mjs` `EVIDENCE_MIN = 2` and `taste-namespace.mjs` `EVIDENCE_LOVED_MIN = 1`.
A partner memory with 1 grid and 2 closest picks already shows `tier:'evidence'` directions and `confidence:'weak'` while `progress.done` is false — the brief can read "evidence-tier" on a memory the floor says is 20% started. The comment in taste-namespace.mjs justifies floor-1 for *Sean's* endorsement channel (measured against his 18 judgements); that justification does not extend to labelling a stranger's directions "evidence". Not a breach; a cold-start honesty bug in the tier label.
Smallest fix: for non-default namespaces, require `progress.done` (or at least the direction floor summed over ≥2 grids) before any direction is labelled `tier:'evidence'`; otherwise label `prior`.

---

## Fixes I audited and believe are correct

- **Fix 1 (`pool.ownOnly ? null : chooseSref`)** — traced every path into `candidatePool` from `tasteFor`: the non-default branch *always* sets `ownSubjects` (an array, possibly empty → honest-empty throw, not a corpus fallthrough). Hand-edited `project.json` with `pool:'full'` does not help: `poolFor` computes fullness from the *profile* (projects.mjs line 100), and `tasteFor` ignores `pj.pool` for generation entirely. `cinematic=1` only narrows `corpus.sref`; `ownOnly` still nulls the sref. `mode=surprise` returns the same own-material pool. Kept prompts accumulate *inside* `ownSubjects`. The one path I could not trace is `generateVideo` (video.mjs not in the review packet) — see below.
- **Fix 2 (ACAO removal)** — the stated reasoning is sound: Python `urllib` ignores CORS, the page is same-origin, and the 204-without-headers preflight answer correctly fails cross-origin browser callers. The only consumer that could break is a hypothetical browser-based Hermes client on another origin — no such consumer is in the packet; SPECULATIVE and contradicted by the header comment ("plain JSON, no auth dance").
- **Fix 5 (function replacement in `keepFor`)** — correct; `unkeepFor` uses string comparison, not regex, so no symmetric `$&`/pattern issue there.
- **Fix 6 (Sean's keep cap)** — legitimate prompts are ≪2000 chars; no real flow breaks.
- **Fix 7 (namespace existence check)** — the explicit-`dir` test seam is preserved, and the bundle-import flow writes as its witness *into a project the import creates first* per the events.mjs comment; I could not construct a legitimate flow that writes events before project creation. If the bundle planner ever pre-stages events for a not-yet-created slug, it now fails loudly rather than invisibly — which is the intended behaviour.
- **Fix 10 (`new URL` in guard)** — absolute-form request targets (`GET http://host/x`) still parse and route by pathname; malformed targets get 400. Correct.
- **Fixes 4, 9, 11** — `routes-renders.mjs`, `probe.mjs`, and `routes-make.mjs` are not in the review packet. I cannot audit what I cannot read; no claim made.

## What I would look at with a second call

1. **`video.mjs`** — does `generateVideo` call `candidatePool` (inheriting the `ownOnly` guard) or does it score `corpus.sref`/corpus subjects independently? The video path is named in the brief as a fix-1 attack surface and is the one generation path I cannot see.
2. **`probe.mjs` fix 9** — the seen-set and once-per-doc ordering: does a pool smaller than one grid now loop, under-fill, or starve the never-show-twice set?
3. **`routes-make.mjs` fix 11** — `redirect:'error'` surfaces a failed fetch as what to the user, and does the ComfyUI graph capture still work when ComfyUI legitimately 302s after a POST?
4. **`/api/keep` Sean branch** — `cli(['--keep', body.prompt])` with a prompt beginning `--` may be parsed as a flag by the CLI (swan-prompt.mjs not shown). SPECULATIVE.
5. **A scrub/migration for pre-fix events** — fix 3 is writer-only; existing `midlibrary-reference` rows in non-Sean namespaces stay on disk forever (this is half of the P0 above).

---

**REVISE** — the eleven fixes are individually sound on the paths I can read, but the corpus-containment law is still violated at the compiler layer (P0), and `kept.md` accepts corpus text into non-Sean memories (P1). Neither requires new machinery: gate the sref tallies on the witness in `tally()`, and reject parameters in `keepFor`.
