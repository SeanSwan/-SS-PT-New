# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** docs/ai-workflow/AI-HANDOFF/TASTE-BRAIN-ROUND5-PANEL-PACKET-2026-08-26.md
**Seed:** (none)
**Tokens:** 29037 in / 11676 out · **Cost:** ~$0.0000 · **Wall:** 371.8s · **finish:** stop

---

## VERDICT
REVISE — I found one structural contradiction (undo events cannot satisfy the provenance law they're subject to), one guard that only half-fires (`MIDLIBRARY_RE`), one genuine network-level gap (reads are DNS-rebindable), and three guarantees that rest entirely on constants/files the packet does not contain — so I cannot clear the bundle round trip, which is the one artefact that physically travels.

**Lead answers:** Sixth door: **no confirmed sixth door in the shown code**, but two credible candidates remain — `app-directions.js:65` renders `--sref` codes into the printed/copyable brief for *any* profile with no client-side guard (reachability depends on unseen server code — see BLOCKERS #3), and the entire "shareable-pool-only" guarantee hangs on the unseen `SHAREABLE_COLLECTIONS` constant. Third guard that cannot fire: **`MIDLIBRARY_RE` in `export-bundle.mjs:32` matches `ml:img:` but not the broader `ml:` identifier space the codebase itself admits exists** (the round-4 fix list names "the `ml:` subject fallback" as its own field) — a tripwire narrower than the namespace it guards. Runner-up: `appendKept`'s single silent `replace` with no fallback.

## BLOCKERS

1. **P1 — reversal events structurally violate the provenance law, so either undo is broken or the law has a hole.** `app-judge.js:55` builds `last.candidates` as `({ id: c.id })` — no `provenance`, no `url`, nothing — and `undo()` (lines 64–66) posts them verbatim. The stated enforcement is "a candidate in a non-owner memory **must** declare `provenance ∈ {…}`. Absent provenance is refused." Both branches are bad: (a) if `validateEvent` applies that rule to reversals, **every undo click for a partner/client memory is refused** — the feature cannot work; (b) if reversals are exempted, you have re-created exactly the door-5 shape ("a candidate that declared nothing passed validation") one layer up, and whether the compiler back-fills reversed candidates from the image index is precisely what door 5 proved it does for ordinary candidates. File: `app-judge.js:55,64–66`; writer contract per the packet's enforcement list. Smallest fix: carry the full candidate projection (`provenance`, `url`, `doc`, `sref: null`) into `last.candidates` at record time, and add a regression asserting a reversal event validates for `partner/*`.

2. **P1 — reads are open, and the Host-header defence does not cover them, so DNS rebinding exfiltrates the corpus.** `origin.mjs:29–35` gates writes only; the comment (line 14) says "Reads stay open; they write nothing." But a rebound page (`attacker.example` → 127.0.0.1) is *same-origin* from the browser's perspective: it can `fetch('/api/prompt?profile=sean&project=default')` and **read** the response — prompt text, style names, `--sref` codes, i.e. the third-party copyrighted corpus — and send it anywhere. The Host check defeats rebinding for writes and is not applied to reads. Failure scenario: owner visits attacker page with a rebinding payload → attacker holds Midlibrary-derived prompt/code pairs. Smallest fix: apply `trustedHosts` to every route, not just writes — it's one middleware line and costs curl/CLI nothing (Host is sent by every HTTP client).

3. **P1, SPECULATIVE on reachability — non-owner briefs render `--sref` codes with no client-side backstop.** `app-directions.js:39` (`d.srefs`) and `:65` (`p.proposedAvoids`) interpolate `--sref ${s}` into the DOM and into the copy/print text for **any** profile, including `client`. Five rounds established the pattern: each fix guards a field server-side and the material re-enters through another field. `proposedAvoids` plausibly derives from Sean's global `taste/rejected.md` — if the profile endpoint attaches it (or any stray `d.srefs`) to a partner/client response, the printed client brief carries corpus style codes, violating the law verbatim. I cannot confirm reachability because neither the profile endpoint nor the compiler is in the packet. Smallest fix regardless: in `refresh()`, if `Swan.profile !== 'sean'`, strip `srefs`/`proposedAvoids` client-side (or assert-and-refuse) — defense in depth costs four lines.

4. **P2 — the bundle tripwire regex is narrower than the identifier space it guards.** `export-bundle.mjs:32`: `/ml:img:|website-files\.com|midlibrary-reference|midlibrary\.io/i`. The packet's own enforcement summary names "the `ml:` subject fallback" as a distinct carrier. Any Midlibrary-derived record whose identifier is `ml:`-prefixed but not `ml:img:` (subject codes, future id shapes) passes the refusal check and ships in the HTML. Today `planGrids` filters by `SHAREABLE_COLLECTIONS`, so this is a failed backstop, not an open door — but door 5 happened precisely because a backstop was the only thing between the index and the payload. Fix: `/ml:/` instead of `/ml:img:/`.

5. **P2 — `appendKept` can silently no-op.** `swan-prompt.mjs:84`: `md.replace(/(## Kept\n)/, …)` is the *only* insertion strategy — unlike `appendRating` (lines 53–57), which has three cascading fallbacks precisely because header drift is real. If `taste/kept.md`'s header is `## Kept\r\n`, `# Kept`, or has drifted by one character, the keep writes back an unchanged file while the console still prints "Kept. N exemplars…" (count read from the unmodified parse). The compounding channel — weight 12, the strongest signal — silently drops input. Fix: mirror `appendRating`'s `if (!md.includes(row))` fallback plus a loud warning.

6. **P2 — markdown-table injection via `note`/`why` into `taste/loved-srefs.md`.** `swan-prompt.mjs:51`: `| \`${code}\` | ${name} | ${r} | ${note || ''} |` — `note` is raw argv joined text. A note containing `|` or `\n` forges additional table rows, e.g. note = `"ok |\n| \`99999\` | x | 5 | injected"` plants a fabricated 5/5 rating for an arbitrary code, and rated codes steer generation. Reachable because the server invokes this CLI with argv sourced from POST bodies (`/api/rate`); the origin gate blocks the drive-by case, but any local caller or future gate regression turns this into taste poisoning. Fix: sanitize `|` and newlines in `note`/`why` before interpolation.

7. **P2 — import accepts results files targeted at the owner.** `import-bundle.mjs:20` checks only `PROFILES.includes(results.profileId)` — `'sean'` passes. A tampered or maliciously substituted results file can record `channel:'bundle'` events into `sean/default`, and `probe.js:112` shows `items` may carry `knownId: c.sref` — arbitrary style codes injected as "recognized" evidence into the owner's memory. Threat vector is social (Sean runs the import on files he's sent), hence P2 not P1. Fix: pin expected profile/project at invocation (`--expect-profile partner`) or refuse `profileId === 'sean'` on the bundle channel.

8. **P2 — reversal events hardcode data-truth fields.** `app-judge.js:64–65`: `medium: 'still'`, `generatorDistribution: 'reference-mix'` regardless of what was undone. Undoing a video/renders grid writes a factually wrong medium and distribution into the event log — the compiler's tallies inherit the lie. Fix: echo the recorded event's `medium`/`generatorDistribution`.

9. **P2 — CLI-created bundle projects omit `pool`.** `export-bundle.mjs:78` calls `createProject` without `pool: 'shareable'` (the page passes it, `app-shell.js:88`). If the default differs, the project's online probing pool and its bundle pool diverge — the same memory judged against two different picture populations. Depends on `projects.mjs` default (unseen).

## ATTACKS

**Correctness**
- `export-bundle.mjs:74`: `Number(arg('grids', 8))` — `--grids abc` → `NaN` → `for (let i = 0; i < NaN…)` produces a **zero-grid bundle written to disk with a success message**. Guard: `Number.isFinite` check.
- `app-shell.js:25`: `api: (p) => fetch(p).then(r => r.json())` — server down or non-JSON → rejection inside `loadProjects` → `DOMContentLoaded` await aborts → tabs never shown, no user-visible error.
- `app-shell.js:70`: `project=''` written to the URL; on reload `params.get('project')` is `''` (falsy) so the store fallback masks it — benign today, but `qs()` during the profile-change window can emit `project=null` literally.
- `probe.js:105`: candidates with **absent** `provenance` fall through to `generatorDistribution: 'midlibrary-reference'` — absence manufactures a Midlibrary declaration, the exact inversion of door 5's lesson. Would cause spurious writer refusals for non-owner memories if any shareable record ever lacks the field.
- Stale-state: `app-judge.js:10` reads `pool` from `location.search` once at module load; the shell's `history.replaceState` mutations never update it — consistent today, fragile if the shell ever starts driving pool via URL.

**Security**
- IDOR/authz: none needed (loopback, single-user, by design) — but see BLOCKER #2: the design's threat model explicitly includes "any web page the machine visits" (`origin.mjs:4`), and reads defeat that model under rebinding.
- Injection: `app-make.js:23` interpolates `p.grammar` into `innerHTML` **unescaped** (everything else on that node is escaped or `textContent`). Grammar is currently a server enum, so not exploitable today — flagging as a loaded gun. Same class: `r.message`/`r.error`/`first.prefix` into `Swan.say`/`innerHTML` (`app-make.js:43,55,62`) — server-controlled, loopback-trusted, P3.
- Replay/idempotency: handled well — duplicate `eventId` reported not rewritten (`import-bundle.mjs:43–44`), overlap refuses the whole file. Sound.
- Bundle exfil check: `JSON.stringify(...).replace(/</g,'\\u003c')` **before** both the regex test and template insertion, and replacer-*functions* used in `tpl.replace` (line 66) to dodge `$&` substitution — correct on both counts.

**Data-truth / schema drift**
- BLOCKERS #1 and #8 are the drift findings: reversal candidates are a different shape than grid-selection candidates, and the hardcoded reversal envelope lies about medium/distribution.
- `probe.js:107` projects `sref: c.sref ?? null` into every recorded candidate — correct for shareable pools (always null), but it means the event log's corpus-leak audit trail depends entirely on the probe endpoint never emitting an sref for non-owner namespaces; the client would faithfully record one if the server slipped.

**What I checked and found sound**
- *Escaping sweep*: every server-derived string reaching `innerHTML` in `app-shell/app-directions/app-kept/probe` goes through `esc()` or `textContent`; `probe.js` uses `el()`/`textContent` throughout the judging core — I could not build an XSS payload from candidate `title`/`credit`/`prompt` in the shown code.
- *Bundle payload*: constructed exclusively from `SHAREABLE_COLLECTIONS`-filtered records with `sref: null` hardcoded (`export-bundle.mjs:44`); `planGrids` exclusion set grows across grids and seeds off judged history — no repeat, no sref.
- *Regexes in `images.mjs`*: `SREF_IN_TEXT`'s `\\?-\\?-sref` genuinely matches both `--sref` and `\-\-sref` — it fires; the filename variant `---sref-` is distinct and plausible.
- *`corpus.mjs` artist extraction*: lazily-anchored `(?:\s+--|$)` captures correctly for both mid-prompt and terminal artists.
- *House rules*: no MUI/Recharts/yoga-language/credential phrasing anywhere in the packet; no PII beyond roles; all shown files ≤300 lines. **Cannot verify** palette tokens, 44px targets, dark-first, or WCAG contrast — `probe.css` and `app.css` are referenced (`app.html:8–9`) but absent from the packet.

## HIGHEST RISK
BLOCKER #1 — the reversal/provenance contradiction — because it is the door-5 shape recurring one layer up, and the two possible resolutions are "a shipped feature never worked" or "the absence guard has an exemption." Cheapest de-risk: one test that POSTs a reversal event (candidates = `[{id}]`) for `partner/<any>` to `/api/event` against the current server and asserts the outcome — five minutes, and whichever way it lands, you know which defect you have.

## CONFIDENCE
Could not verify from the packet, with the evidence that would settle each:
- **`SHAREABLE_COLLECTIONS` / `SHAREABLE_MIX` contents** (`projects.mjs`) — the entire bundle guarantee reduces to this unseen constant. Settle: paste the export; if it contains `tops`/`guides`/`focus`, escalate BLOCKER-level immediately.
- **`validateEvent`'s treatment of reversal candidates** — settles BLOCKER #1's branch. Settle: the `events.mjs` validator source, or the one POST test above.
- **`bundle.html` template** — listed as an attack surface, never shown. It is half of the travelling artefact. Settle: the file.
- **Whether the profile endpoint ever populates `d.srefs`/`proposedAvoids` for non-owner namespaces** — settles BLOCKER #3's reachability. Settle: the compiler/profile-handler source, or `GET /api/profile?profile=client&project=<any>` output inspection.
- **`taste/kept.md` and `loved-srefs.md` actual headers** — settles whether BLOCKERS #5/#6 fire today or merely lurk. Settle: the two files' first lines.
- **CSS conformance** (tokens, touch targets, contrast, dark-first): unverifiable — stylesheets not supplied.
- My own uncertainty: BLOCKERS #3, #7, and #9 are reachability-contingent on unseen server code; I've labelled severity accordingly and will not pretend the client-side halves alone prove exploitability.
