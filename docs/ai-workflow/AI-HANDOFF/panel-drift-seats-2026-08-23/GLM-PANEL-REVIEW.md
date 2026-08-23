# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/PANEL-PACKET-DRIFT-SEATS-2026-08-23.md
**Tokens:** 7680 in / 23939 out (reasoning: 21309) | total 31619
**Wall:** 328.3s

---

## VERDICT
REVISE — the diff's three celebrated protections (spend gate, model registry, hook integrity) each still leak on the default path, and the fix shipped for the new seat was knowingly withheld from the transport this same diff promoted to carrying four seats.

## BLOCKERS
(The packet supplies no line numbers; evidence anchors are quoted code.)

1. **P1 — Panel prints `mode=DRY-RUN` on every run without `--confirm-spend`, but free seats still execute real external calls.** Scenario: `node scripts/consult-panel.mjs --document X` (no flags) → operator reads `DRY-RUN` and believes nothing was sent; in fact the Gemini seat hits Sean's Google-metered key, ox ships the document to a stealth provider that RETAINS prompts, glm/qwen run, artifacts are written. The file's own `--dry-run` branch defines the term as "nothing was sent, nothing was spent" — two contradictory meanings of DRY-RUN in one file, and the always-printed one is the lie. Evidence: `consult-panel.mjs` — `console.log(\`[panel] mode=${confirmSpend ? 'LIVE' : 'DRY-RUN'}\n\`)` sits directly above `seatsToRun = requested.filter((n) => confirmSpend || !SEATS[n].paid)` (free seats execute), with `--dry-run` as a *separate* flag.

2. **P1 — Seed file is injected into the prompt with zero egress redaction — violates the binding house rule "zero PII to LLMs (IDs only)."** Scenario: `--seed docs/handoff/session-notes.md` where the notes name a trainer or client → verbatim POST to generativelanguage.googleapis.com. The *document* goes through `readForEgress`; the seed does not. Evidence: `consult-gemini-panel.mjs` — `const seedText = seed && existsSync(seed) ? readFileSync(seed, 'utf8') : '';`, and the unused `import { readForEgress, redactForEgress }` is the fossil of the missing `redactForEgress(seedText)` call.

3. **P1 — grok seat does not pin `SWAN_GROK_MODEL` → silent wrong-model review filed as "Grok 4.6".** Scenario: operator's shell carries `SWAN_GROK_MODEL=deepseek/deepseek-v4-pro` from a manual run; default roster runs → the grok child inherits it → a DeepSeek opinion lands in `GROK-PANEL-REVIEW.md`, priced at Grok's $2/$6 rates. This is the exact misfiling class this diff claims to have eliminated ("3 seats filed under a 4th seat's name"), reintroduced ambiently. Evidence: `panel-seats.mjs` — dspro/ox/dsflash each set `env: { SWAN_GROK_MODEL: ... }` and sol pins `SWAN_SOL_MODEL` ("pin it explicitly for this seat"), but the `grok:` entry has no `env` key at all.

4. **P1 — `consult-grok.mjs` still resolves `.env` from `process.cwd()`, and this diff tripled its blast radius** (grok+dspro+ox+dsflash = half the default roster). Scenario: `cd docs && node ../scripts/consult-panel.mjs --document X --confirm-spend` → four children inherit cwd `docs/` → key lookup fails → four seats die with "no API key," which reads like config, not path — per the packet's own analysis of that exact symptom. The packet admits it: "consult-grok.mjs still uses `ROOT = process.cwd()` and has the same latent defect; not fixed here." That is not in the known-fixed list (that was the gemini seat's copy); knowingly shipping the workhorse transport with the acknowledged bug while fixing only the new file is scope cherry-picking.

5. **P1 — Check 7's `PATH_RE` silently misses entire registration classes, so the phantom-guard detector can itself report clean while a guard is missing.** Scenario: `.claude/settings.json` registers `node scripts/hooks/session-guard.cjs` (or any path containing a space, `+`, `~`, or a `.ts`/`.cjs` extension); the file is deleted → `(?:scripts|\.claude)[/\\][A-Za-z0-9_./\\-]+\.(?:mjs|js|sh|ps1|py)` never matches → no finding → gate prints nothing — the 2026-08-22 incident recurs verbatim with a one-character extension change. A completeness checker with unenumerated blind spots is worse than a manual checklist because its "clean" launders confidence.

6. **P2 — Check 7's outer `catch { /* fail-open */ }` swallows its own errors with zero output** — silence byte-identical to "clean," which is the precise pathology the check's own header lecture documents ("a guard's silence is ambiguous by construction"). If the check cannot run, that must itself be a finding.

7. **P2 — Gemini safety-block diagnosis discarded.** When the API blocks the prompt, `candidates` is absent and `data.promptFeedback.blockReason` is never read; the seat reports `empty response (finishReason=?)` and the operator follows the wrong remediation (raise `--max-tokens`) into a retry loop. Evidence: `const cand = data?.candidates?.[0]; ... const finish = cand?.finishReason ?? '?';`.

8. **P2 — Header markdown mangled by `.filter((l) => l !== '')`:** the intentional blank line before `---` is stripped, so `**Tokens:** …` followed immediately by `---` parses as a setext H2 and the rule vanishes. Artifact-formatting rot is an accepted must-fix class in this repo (INDEX shredding); this reintroduces it in the brand-new artifact.

## ATTACKS
**Correctness**
- An empty `GEMINI_API_KEY=` line in root `.env` returns `''` immediately and short-circuits the loop — a valid `GOOGLE_AI_KEY` on the *next line* is never read; exit message falsely claims no key exists.
- No `.env` inline-comment handling: `KEY=abc # prod` sends the comment as part of the key.
- Panel's token estimate includes `seed.length`, but no seat's `args` builder passes `--seed` — the seed is either a dead feature or meant to be sent and silently isn't; the estimate overstates either way.
- `outDir` default stamps date-only (`panel-YYYY-MM-DD`): a second run the same day overwrites every seat artifact — the "coverage record" this system treats as sacred.
- The gemini seat's default `--out` is cwd-relative while `ROOT` is file-relative: standalone runs from another directory sprout `docs/ai-workflow/...` in whatever directory you're in.
- `arg()` consumes the next token unconditionally (`--document --out foo` → document=`'--out'`); the seat crashes in `readForEgress` outside any try, with no branded error.
- `getModelId` throwing (missing registry file) is unguarded — the "loud failure" design only covers the null/TODO cases.

**Security**
- API key rides the URL as `?key=` — it lands in any proxy log, telemetry, or history that echoes request URLs; Google supports the `x-goog-api-key` header. The `.split(apiKey)` redaction only catches the exact literal, never a URL-encoded echo.
- `--model` is interpolated into the URL unencoded — a value with spaces/`&`/extra `:` either crashes `fetch` or rewrites the request path.
- ox sits in the **default** roster with documented prompt retention by an undisclosed provider: money is gated behind `--confirm-spend`, privacy is gated behind nothing. "Only send it packets that are already scrubbed" is a comment, not a mechanism, in a transport this packet doesn't show.
- Kimi's args embed `--confirm-spend`, auto-confirming the seat's internal gate — bounded by the $0.40 cap, but it trains exactly the reflex the panel gate says kills spend gates.
- Blocker 5 is a security control reporting "on" while off — the meta-version of the bug it polices.

**Data-truth / schema drift**
- The registry is not the single source of model truth: grok's identity lives in `consult-grok.mjs`'s internal default while its label, pricing, and artifact filename live in `panel-seats.mjs`. Change the transport default and all three quietly lie — the same class as the hardcoded "Grok 4.6" strings this diff just purged.
- `getModelId('gemini-31-pro')` — registry key unverifiable from the packet; a typo hard-fails (good) but only at runtime, mid-panel.
- Seat stderr is captured verbatim into INDEX.md with no structural guard (e.g., a collapse-to-one-line wrapper at the INDEX writer); every future `console.error` in a seat is a fresh way to shred the index — a fixed-once bug with no regression protection.

## HIGHEST RISK
Blocker 1, the `DRY-RUN` label. It fires on **every** default invocation, inverts the tool's core safety promise, and causes real egress (stealth-retained ox prompt + Google-metered Gemini call) under a label asserting nothing happened — in a codebase whose own comments say silence-reading-as-success is the enemy. Cheapest de-risk: one string change — `mode=${confirmSpend ? 'LIVE' : 'FREE SEATS RUN FOR REAL (paid skipped) — use --dry-run to send nothing'}` — then verify once by running with no flags vs `--dry-run` and diffing network activity. If the true intent is that no-flag runs send *nothing*, it's a two-line fix: include free seats in the dry-run gate.

## CONFIDENCE
Could not verify from the document alone:
- **`consult-grok.mjs` itself** — whether the panel merges `process.env` with `seat.env` when spawning (determines if blocker 3's ambient-env substitution is live, or if the failure is worse: unmerged env breaking PATH/HOME), whether it redacts egress (load-bearing for the ox retention claim), and its default-model resolution. The spawn region of `consult-panel.mjs` + the transport file would settle it.
- **The rest of `consult-panel.mjs`** (cut off after the SKIPPING line): concurrency, per-seat wall-clock cap, whether `--seed` reaches seats some other way, how INDEX.md is written.
- **`lib/redact-egress.mjs` semantics** — I assume `readForEgress` redacts; if it only reads+labels, the *document* is also unredacted and blocker 2 escalates to P0.
- **`config/MODEL_VERSIONS.md`** — does `gemini-31-pro` exist and is it verified (not `TODO: VERIFY_`)? A grep settles it.
- **Top of `drift-check-gate.mjs`** — definitions of `SS_PT`, `read()`, `findings`, when check 7 executes, and whether `read()` throws on EPERM (feeds blocker 6).
- **Actual `.claude/settings*.json` contents** — whether any hook path today falls outside `PATH_RE`'s character/extension classes, which would turn blocker 5 from theoretical to live.
- Full-file line counts for the ≤300-line rule (shown regions are under; whole files unconfirmed), and `DEFAULT_REMIT` content (it is injected into every seat prompt — if it carries PII, that's egress too).

House-rule check: only "zero PII to LLMs (IDs only)" is violated (blocker 2). The UI rules (styled-components, Victory, palette, 44px, dark-first) do not touch this packet; "yoga/meditation" and NASM phrasing appear nowhere in the reviewed files.
