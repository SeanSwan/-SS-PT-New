---
decision: "The taste brain gains two household modes beside Sean's own: PARTNER (a fresh design memory per project, for Sean's partner) and CLIENT (kept — it is Sean's sales/closing practice mode with his partner playing the prospect, and the real-client path later). Both delivery paths ship: a mode switch on the probe page for side-by-side use, and a sendable static bundle for her own machine."
status: shipped
supersedes: none
shipped: 2026-08-25 — swan-taste-brain commits 027a187 + three (local repo, no remote); see "## Built" at the end
linear: SWA-186
grill: grill-me (Rule 64) — interviewer Fable 5, 2026-08-25
privacy: roles only (partner / client). No names, no school name, no child data, no keys. Rule 8.
---

# Taste brain — partner mode + client mode (kept)

## Summary

Sean's first framing was "client mode → no, partner mode instead". After the read-back he corrected: **keep client mode too.** He and his partner run practice sales meetings — she plays a prospect, he runs the real pitch-and-close on her — so client mode is the demo he practises *with*, and partner mode is the tool she uses *for herself* (her own business: her own school, never daycare — see memory `project_wife_business_lane_own_school`).

Both modes ride one mechanism: **a memory namespace = who is judging (profile) × what it is for (project).** Sean's existing memory (`taste/events/`, 3 grids / 18 judgements) is the implicit `sean/default` namespace and is not touched.

## Key decisions (Sean's, 2026-08-25)

| # | Decision | Source |
|---|---|---|
| D1 | Partner mode exists: for Sean + partner personal/household design work, never clients. | Sean, opening message |
| D2 | **Every new design starts a fresh, empty memory** ("always start a new memory for designs so the designs she's using will be unique based on what she chooses in those pictures"). → memory is per *project*, not a standing "her taste" file. | Sean, opening message |
| D3 | She must be able to use it without sitting at Sean's desk ("send it to my wife"). | Sean, opening message |
| D4 | **Both delivery paths:** mode switch on the probe page (side by side) + sendable static bundle (her own Mac/phone). | Sean: "I like all the options" |
| D5 | **Client mode stays** — sales/closing role-play; client-mode copy must be the real client-facing copy so the practice is realistic. Real-client hosted route remains a T3 decision (unchanged from handoff §5). | Sean, correction message |
| D6 | Sean's taste file stays the default and is never mixed with hers. | Sean, opening message ("a new memory") |
| A1 | *(assumption, offered and not contradicted)* she gets a plain-words readout of her own three directions; Sean gets the same brief `swan-design-router` can consume. | Fable read-back |
| A2 | *(assumption, offered and not contradicted)* Fable plans + builds this here in small slices; the §8 Qwen sequence stays valid for the *remaining* upgrades. | Fable read-back |

## Q&A log

1. **Sean (opening):** not client mode — partner mode; fresh memory per design; send it to her; add it to the handoff. → *Fable read-back* (plain-English + code-grounded table). Implication: profile/project namespace, `source` gate, shareable pool, bundle delivery, per-project excludeIds.
2. **Fable Q1 — where does she use it?** Recommended: both (page switch + sendable bundle), bundle first because "send it to her" does not exist today. → **Sean: "I like all the options."** → D4.
3. **Sean (correction):** "You said [client mode] dies. I don't want it to die… keep all of that and everything related to that and keep on pushing." Reason: practice sales meetings with his partner as the prospect. → D5. Implication: `client` is a first-class profile; client projects are shareable-pool only, always; the brief page is the closing artifact.

## Architecture notes (parent / children / whole)

```
profile  ∈ { sean | partner | client }        ← WHO is judging = the only witness allowed to write there
project  = slug (a-z0-9-, ≤40; never a person's or a school's name)   ← WHAT it is for = one memory
namespace dir:   sean/default  → taste/events/                 (unchanged, implicit)
                 anything else → taste/profiles/<profile>/<project>/{project.json, events/, taste-profile.json}

probe page ──?profile=&project=──▶ /api/probe (pool by namespace; excludeIds = every picture already shown in it)
           ──POST /api/event {profileId, projectId, source=profile, channel:'page'}──▶ THE one writer
bundle.html (exported, shareable pool only, N grids, no repeats) ──results.json──▶ import-bundle.mjs ──POST /api/event {channel:'bundle'}──▶ same writer
/api/profile?profile=&project= ──▶ tally for THAT witness only; priors = the project's own theme words (never Sean's themes.md)
/brief?profile=&project=       ──▶ plain-words readout (partner) / the closing deck (client) — same page, different copy
```

- **Pool law:** `client` → shareable (photos + Webb) always, no opt-in. `partner` → shareable by default; Sean may tick "include Midlibrary (this desktop only)" at project creation. **Bundles are shareable-only regardless of project pool** — the file leaves the machine. `sean/default` → full pool as today.
- **Witness law:** `source` must equal the profile it writes into. `sean` can't write into `partner`; an agent can't write into anyone (unchanged flag-gated refusal).
- **One writer stays:** the import script POSTs to the running server; nobody appends the JSONL directly.
- **Fresh memory:** a project is created empty; nothing is copied from any other namespace. Sean's own projects (`sean/<slug>`) come free with the same mechanism.
- **ONE RULE boundary (partner lane):** the only free text a project stores is its title + theme words. The page says so at the input. Photo searches use theme words only.

## Suggestions & enhancements (Phase 2 — Sean accepts/rejects)

1. **The brief page IS the closing deck** (client mode): three tier-labelled directions + the pictures she chose + credits, presentable on a screen share. Serves D5 directly. *Built in this pass.*
2. **Overlap view for joint projects** — when Sean and partner both judge the same project, show where their picks agree. Cheap later (two tallies, one intersection). *Deferred; not v1.*
3. **Link `/probe` and `/brief` from the launcher/main page** — today `/probe` is a typed URL. *Launcher line added; ui.html untouched (surgical).*
4. **Unsplash `download_location` ping when a pick is USED in a build** — still not done (handoff §4). *Deferred; flagged.*

## Minimal-click opportunities

| Flow | Before | After |
|---|---|---|
| Start her project | (did not exist) | 1 form: title + theme words → first grid |
| Send it to her | (did not exist) | 1 command → 1 HTML file → AirDrop/iMessage |
| Get it back | (did not exist) | 1 file back → 1 command → her directions live |
| Read her directions | (did not exist) | 1 link (`/brief`) |
| Practice a close | (did not exist) | same bundle + same brief page, client copy |

## Open flags (Sean does not need to answer before build)

- Her first project's theme words — she types them at project start (no need to ask Sean).
- Partner default pool = shareable; opt-in to full on loopback. Sean can flip the default later in one constant.
- Unsplash demo key is 50 req/h: refreshing photos with her words is `fetch-photos.mjs --themes "…" --merge` (only her words, merged into the existing index).
- Kimi seat / Qwen §8 sequence: untouched by this work; remaining upgrades (pair mode, BT, media heads) still route there.

## Slice plan (Rule 15) — each slice commits alone in `swan-taste-brain`, explicit paths

| Slice | What | Test / proof |
|---|---|---|
| S1 | `events.mjs`: profileId/projectId/channel, witness↔profile gate, `eventsDirFor`, `readEventsFor`, `judgedIds`. New `projects.mjs`: create/list/read, pool policy, done floor. `profile.mjs`: compile per namespace, witness filter, project-word priors, `picks`, `progress`. | `test-probe.mjs` (82) still green + new `test-modes.mjs` |
| S2 | Server: `/api/projects` GET/POST, `?profile=&project=` on `/api/probe` (pool + excludeIds) and `/api/profile`, `/probe.js`, `/brief`. Page: shared judge core extracted to `probe.js`; mode bar + new-project form; `brief.html`. | both suites + browser: `/probe` naturalWidth>0 count, 0 buttons <44px at 1440 and 414; POST round-trip into a throwaway namespace, then deleted |
| S3 | `export-bundle.mjs` + `bundle.html` (shareable-only, N grids, no repeats, results download) + `import-bundle.mjs` (validate → POST). | tests: zero Midlibrary ids/hosts in a bundle, N grids, no repeats, results round-trip; browser: bundle opens from `file://`, pictures render, download produces valid events |
| S4 | `fetch-photos.mjs --themes --merge --project`, `compile-taste.mjs --profile --project`, README section, launcher line. | `--dry-run` proof; README grep |
| Close | hostile dry-loop across S1–S4; handoff §5/§8 amended; memory; Hermes memo (+ learning packet if a durable lesson surfaced); Linear SWA-186 comment. | Rule 73 proof block in the closeout |

## Built (2026-08-25, same session)

All four slices landed as four local commits in `swan-taste-brain` (`027a187` = S1, then S2/S3/S4). Proof, current-session:
`node prompter/test-modes.mjs` 56 PASS · `test-bundle.mjs` 25 PASS · `test-probe.mjs` 81 PASS · `test.mjs` 52 PASS · headless-Chromium
proof 32/32 (probe at 1440 + 414: 12 pictures `naturalWidth>0`, 0 controls under 44px, 0 horizontal overflow; client project
created from the form → 9 photos + 3 Webb; reason locked before reveal; record → "1 of 8 grids recorded"; next grid 0 repeats; brief
414 + 1440; Sean's brief 3 directions with linked credits; `POST /api/projects` from a foreign Origin → 403; bundle from `file://`
at 414: 12 render, two grids judged, reload keeps place, download → 2 events → import "2 recorded · 0 refused", re-import "2 already
there"; Sean's memory still 3 grids / 18 judgements; throwaway namespaces removed).

Hostile-pass findings fixed before commit: a proof-script check that asserted `true` instead of measuring the brand-law chip
(now measured); "grid 3 of 2" progress wording; unescaped project title in the brief; credits not linked (Unsplash attribution);
no copy fallback for phones that block downloads; no live proof the project write sat behind the origin gate; duplicated
"Sean's taste · Sean's taste" header. Deferred (Sean's call): overlap view for joint projects; Q0-for-clients; Unsplash
`download_location` ping on use; partner default pool stays shareable (one constant to flip).
