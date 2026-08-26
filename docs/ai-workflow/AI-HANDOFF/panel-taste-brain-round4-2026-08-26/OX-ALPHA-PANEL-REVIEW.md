# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** docs/ai-workflow/AI-HANDOFF/TASTE-BRAIN-ROUND4-PANEL-PACKET-2026-08-26.md
**Seed:** (none)
**Tokens:** 51145 in / 10430 out · **Cost:** ~$0.0000 · **Wall:** 306.0s · **finish:** stop

---

## VERDICT

REVISE — the brain has not run dry: there is a fifth corpus door (the image-index join in `tally()` resurrects corpus identity for candidates that simply omit the fields the writer inspects), plus one literal instance of the "guard that cannot fire" class the document asks about.

## BLOCKERS

1. **P1 — Fifth corpus door: the compiler trusts the image index more than the writer trusts the candidate.**
   `validateEvent` (events.mjs:89–115) only inspects fields a candidate *carries*: `provenance` and `sref` checks are both conditional on `!== undefined`. A candidate that omits both sails through. Then `tally()` (profile.mjs:52–61) joins `byId.get(it.id)` and back-fills `doc`, `prompt`, and `provenance` **from the Midlibrary image index**, ungated by witness:
   - profile.mjs:58–61 — subject becomes `ml:${subjectOfPrompt(rec.prompt)}` — actual corpus prompt text;
   - profile.mjs:73 — bumped into `t.subjects` with no witness gate (only the *style* channel at :89 is gated);
   - profile.mjs:93 — `bump(t.provenance, c.provenance || rec.provenance, …)` — `midlibrary-reference` appears in a non-Sean memory's provenance tally.
   Concrete failure: `POST /api/event` with `source:'partner', profileId:'partner', projectId:'x', eventType:'grid-selection', candidates:[{id:'<a Midlibrary image id from the images index>'}]`, one `closest` item. Validation passes (no provenance, no sref — nothing to refuse). `GET /api/profile?profile=partner&project=x` then returns a `subjects` row whose key is Midlibrary prompt text, and a `provenance` row reading `midlibrary-reference`. Doors 3 and 4 checked what the candidate *claims*; door 5 is what the *index* says. Smallest fix: in `validateEvent`, require every candidate in a non-default memory to carry `provenance ∈ SHAREABLE_PROVENANCE` (absence is not innocence); belt-and-braces, gate the `ml:` fallback branch in `tally()` on `witness === DEFAULT_PROFILE`.

2. **P1 — The `keepFor` `--sref` guard cannot fire on a leading `--sref` (the literal "inert guard" the document fishes for).**
   taste-namespace.mjs:172: `/\s--sref\b/i` requires whitespace *before* the flag. Input: `POST /api/keep {profileId:'partner', projectId:'x', prompt:'--sref 123456 calm ocean dawn'}` → 200. `subjectOfPrompt` (:129, splits on `/\s--/`) also fails to strip a leading parameter, so `ownSubjects` adds it at score 1000 as a kept exemplar, and the next generation emits `--sref 123456 calm ocean dawn --ar 16:9 --v 7` into *her* memory, and her `kept.md`/brief print the corpus code. Fix: `/(^|\s)--sref\b/i`.

3. **P2 — `mintIntent` accepts a corpus `--sref` for non-Sean memories; the render→pick→brief path prints it.**
   renders.mjs:76 format-checks `sref` but never checks the namespace; :83 stores it. `listRenders` surfaces it; `tally` correctly skips the style tally for generated pictures, but profile.mjs:68–71 puts `prompt` (with `--sref <code>`) into `t.picks`, and compileProfile:175 deliberately keeps generated picks for non-Sean ("her own renders are hers") — except a render made with *his* catalogue code is not entirely hers, and the law says the code itself never reaches her brief. `curl` or a page bug is sufficient; no malice required given Sean generates with corpus codes one tab away. Fix: mirror `keepFor` — refuse `sref` in `mintIntent` when `profileId !== DEFAULT_PROFILE`.

4. **P2 — `pruneIntents` destroys intent records during a drive outage.**
   renders.mjs:151: `have` comes from `listRenders(...)`, which returns `renders: []` with `available:false` when `SWAN_COMFY_OUTPUT` (a mapped network drive, per the header comment) is unreachable. Every intent older than `days` then looks "never produced a file" and is rewritten out of existence — tokens, prompts, and seeds gone although the renders exist on the temporarily-unmounted drive. Fix: bail with `{ok:false}` when `lr.available === false`.

## ATTACKS

**Correctness**
- `readBody` rejects + `req.destroy()` at 64 KB; the subsequent `json(res,500)` writes into a destroyed socket. Didn't crash in reasoning, but I could not prove Node never emits an unhandled `error` on the aborted response — **SPECULATIVE**, worth one test.
- `/api/rate` passes `note` raw into `cli(['--rate', …, note])` (serve.mjs:238). No shell injection (`execFileSync`, array args), but a note beginning with `-` may be consumed as a flag by `swan-prompt.mjs`'s own parser. **SPECULATIVE** — depends on the CLI's argv handling, which isn't shown. Cheap fix: `--` separator.
- `activeEvents`/reversal/idempotency: reversal-of-reversal refused, cross-memory reversal impossible (checked against `existing` in the same dir), `appendEvent` is synchronous between the dedupe read and the append so intra-process races can't double-write. Sound.
- Mix-override attack: `GET /api/probe?profile=partner&…&webb=0&photo=0` — I tried to make the "rest" slot fill from Midlibrary for a non-Sean memory. It cannot: `poolFor` pre-filters `pool.images` to shareable collections, so excluding both quotas leaves an empty grid, not a corpus grid. Sound.

**Security**
- Render serving: token must exist in *that* memory's intents (cross-memory IDOR refused), `lstat` symlink guards on both listing and resolve, magic-byte sniff, prefix check after `path.resolve`. Sound.
- Candidate free-text fields (`title`, `doc`, `prompt`, `credit`, `pageUrl`) are entirely unvalidated in `validateEvent` — corpus text can ride a `provenance:'unsplash'` candidate's `title` into her picks and brief. Related to Blocker 1; the general fix is the same (constrain what a non-Sean candidate may carry) plus a cheap provenance↔URL-host cross-check, which is trivially available since `RENDERABLE_HOSTS` (probe.mjs:30) already maps hosts to collections.
- Bundle import/export: the importer is named as a suspect layer but its code is not in the document. If it writes JSONL directly rather than through `appendEvent`, every writer law is bypassed at once. **Cannot verify — see CONFIDENCE.**

**Data-truth / schema drift**
- `taste-profile.json` as an *input*: nothing in the shown source reads it back; `compileProfile` always recomputes from events. If a consumer outside this document reads it, the witness-gate fix is retroactive only because reads recompile — a stale on-disk profile written pre-fix is still poisoned until rewritten. Verify whether anything serves the file directly.
- Hint-string drift: probeFor's exhaustion hint says `fetch-photos.mjs --project ${profile}/${project}` while pruneIntents' error uses `--profile X --project Y` — one of those flags is wrong. Cosmetic, P2-at-most.

**House rules:** all shown files ≤300 lines ✓; no forbidden vocabulary ✓; PII discipline held (IDs/roles only) ✓. UI rules (styled-components/Victory/palette/glow/touch targets/dark-first/WCAG) are unverifiable — `app.html`, `app.css`, and the `app-*.js` modules are not in the document.

**What I checked and found sound:** the CORS/preflight closure (204-with-no-headers genuinely fails every legitimate preflight); the seed ceiling on `/api/prompt` matching the intent ceiling; `subjectOf` stripping `--sref <digits>` values on the video path; `$&` function-replacement fix; the pair burn-and-refuse ordering; `applyTo`'s drift proof and poisoned-field-map refusal; `weightedPick` termination; `parseKept` scoping to `## Kept`; the thin-pool permutation fix in `pickStratified`.

## HIGHEST RISK

Blocker 1. It is the exact recurrence pattern of rounds 1–4: each fix guards a *field*, and the material arrives through a different *field*. The cheapest de-risk before ship: one regression test that POSTs a provenance-less candidate naming a real Midlibrary image id into a partner memory and asserts `/api/profile` contains neither `ml:` keys nor `midlibrary-reference` — it fails today, and it pins the invariant at the only layer (the writer) where it can be enforced once.

## CONFIDENCE

- **Could not verify:** `lib/origin.mjs`, `lib/images.mjs`, `lib/routes-modes.mjs`' static assets, the bundle exporter/importer, `swan-prompt.mjs`'s argv parser, and the entire browser surface. The bundle importer is my biggest honest gap — if it bypasses `appendEvent`, Blocker 1's fix must also land there. Evidence that settles it: the importer's source, or a test showing an imported event traverses `validateEvent`.
- **Moderate confidence, not reproduced:** the `readBody`-destroy/500 interaction and the CLI argv flag-eating — both plausible, neither demonstrated; I label them rather than assert them.
- On the two **deliberately-not-changed** items: I agree with deferring the lockstep-seed behaviour (the status disclosure is the right v1 answer and guessing would silently change renders). On single-grid `tier:'evidence'`, I lean toward Kimi's position — with `EVIDENCE_LOVED_MIN = 1` and `backed()` summing `closest ≥ 2` *within one grid*, a stranger's single lucky grid produces "evidence"-labelled directions — but I accept it is a product call, and the one-line change is correctly staged.

**REVISE.**
