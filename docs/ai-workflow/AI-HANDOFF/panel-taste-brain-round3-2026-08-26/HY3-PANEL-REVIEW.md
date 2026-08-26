# Swan Taste Brain — round-3 hostile review packet — reviewed by HY3 (tencent/hy3)

**Reviewer:** `tencent/hy3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/TASTE-BRAIN-ROUND3-PANEL-PACKET-2026-08-26.md
**Seed:** (none)
**Tokens:** 50989 in / 16730 out | **Cost:** ~$0.0155 | **Wall:** 207.7s | **finish_reason:** stop

---

## VERDICT
REVISE — the server-side render loop, Make, and own-material law are sound, but the packet omits the frontend shell (app.html + app-*.js), so binding UI house rules (styled-components, Victory, palette, 44px targets, etc.) are unverified and must be confirmed before ship.

## BLOCKERS
No P0 ship-blocking defects found in the provided server-side code. The logic for path composition, origin gate, own-material isolation, and Range handling holds up to the concrete inputs reviewed; P1/P2 notes are in ATTACKS.

## ATTACKS
- Correctness:
  - `lib/renders.mjs:120` `renderFile` builds `want = ${token}_${String(Number(n)).padStart(5,'0')}_.` — assumes ComfyUI’s counter is always ≤5 digits. A counter of 100000+ would not match `FILE` regex (`\d{1,5}`) and the file is silently not found (P2 off-by-one/overflow, low likelihood).
  - `lib/events.mjs:169` `appendEvent` reads the session file, checks duplicate, then appends. Two concurrent POSTs with the same `sessionId`+candidates could both pass the duplicate check and both append (P2 race; local single-user tool, low impact).
  - `lib/range.mjs:21` `parseRange` correctly ignores malformed/multipart ranges (serves whole file), but `routes-renders.mjs:46` only explicitly handles `unsatisfiable` and `range`; `invalid`/`none` fall through to 200 — this is intended, not a bug, but worth noting the fallback is safe.
  - `serve.mjs:58` `readBody` rejects >64KB and invalid JSON; the rejection propagates to the top-level catch (line 224) returning 500, which is acceptable.

- Security:
  - `lib/origin.mjs:33` trusts requests with no `Origin` header (curl/CLI/ComfyUI). This is by design for a loopback-only unauthenticated tool, but means any local malware or same-machine native process can write to `taste/`. Acceptable per stated threat model, but flag as intentional.
  - `serve.mjs:46` sets `access-control-allow-origin: '*'` on every JSON response (including the OPTIONS preflight at line 73). Cross-origin pages can read refusal bodies, but writes are blocked by the gate. No IDOR found: render tokens are scoped per memory via `nsOk` + intent lookup (`lib/renders.mjs:115`).
  - `lib/workflow.mjs:43` `comfyApi` enforces loopback-only hostname — no SSRF surface. `applyTo` drift guard (`lib/workflow.mjs:142`) proves only prompt/seed/prefix move.
  - Path traversal: `renderFile` uses `fs.readdirSync` + prefix match and `lstat` to reject symlinks (`lib/renders.mjs:128`); `full.startsWith(dir + path.sep)` is a second guard. Solid.

- Data-truth / schema drift:
  - Frontend response shape (`prompts[].sref`, `tasteMeta`, etc.) cannot be verified against the actual UI because the UI files are absent from the packet.
  - `lib/profile.mjs:158` writes `taste-profile.json` with `renders: { judged, closest, miss }` — consistent with `tally` shape. No PascalCase/snake_case drift observed in server code.
  - `lib/events.mjs` event schema uses `schemaVersion`, `eventType`, `source` enums — caller fields match.

## HIGHEST RISK
The missing frontend artifacts (app.html, app-shell.js, app-make.js, app-judge.js, app-directions.js, app-kept.js) are the single most dangerous gap: if they use MUI instead of styled-components, Recharts instead of Victory, hard-coded colors instead of `var(--token,#fallback)`, or touch targets <44px, that is a non-negotiable house-rule violation shipping to production. Cheapest de-risk: demand those files from the author and run a static check — grep for `from '@mui'`, `recharts`, confirm CSS uses `var(--` tokens, and verify each file is ≤300 lines with touch targets ≥44px.

## CONFIDENCE
I could NOT verify from the document alone:
- Compliance with all binding UI house rules (styled-components only, Victory only, Crystalline Swan palette via `var(--token,#fallback)`, Dual-Button Glow, 44px touch targets, dark-first, WCAG 4.5:1, ≤300 lines/file) because the frontend modules are not included in the review packet.
- That the 9 test suites (404 checks) actually pass at `fb052c3` — I relied on the claim, not execution.
- The actual content of `app.html` and its tab-rewriting behavior (`routes-modes.mjs:98`) beyond the string replace shown.

Evidence that would settle it: the six frontend files plus a line-count report, and a CI log of `prompter/test*.mjs` run from repo root at the cited commit. My uncertainty on the server logic is low; my uncertainty on UI compliance is high and is the reason for the REVISE verdict.
