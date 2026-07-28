# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: high)
**Document:** scripts/validation-orchestrator.mjs
**Seed:** C:/Users/BIGOTS~1/AppData/Local/Temp/claude/c--Users-BigotSmasher-Desktop-quick-pt-SS-PT/408d4be5-604c-4e38-a76d-5d8d575179d9/scratchpad/village-upgrade-brief.md
**Tokens:** 42758 in / 15694 out · **Cost:** ~$0.3637 · **Wall:** 502.1s

---

# Architecture Review — `validation-orchestrator.mjs`

## (1) VERDICT

**Sound skeleton, inverted economics, advisory fence:** the pipeline spends ~$0.15 on 13 Phase-1 brains and then unconditionally fires its most expensive call (Opus judge) on every run — while the Chinese-provider fence it prides itself on is caller-invoked theater that already leaks the full code bundle to GLM 5.2 in Phase 2C and has an unguarded hole exactly where Kimi K3 is about to be inserted.

---

## (2) Cost-efficiency wins

**A. The Fusion Judge is the money leak, not the brains.** `runFusionSynthesisStep` defaults ON (`SWAN_FUSION_SYNTHESIS || 'on'`) and runs Opus 4.8 ($5/$25) on **every** run, in every mode. Worse, it receives `phase1Results` at **full text** (~13 × up to 4K tokens ≈ 50K+ input tokens), while the debates get a 2000-char digest (`phase1Summary`). And `judgeMaxUsd` defaults to **0 = uncapped**, with `judgeMaxTokens = 32000` — a runaway judge output alone can hit $0.80. Fixes, in order:
- Pass the judge the same 2000–4000-char digests the debates get. Halves judge cost, negligible quality loss.
- Default `SWAN_FUSION_JUDGE_MAX_USD=0.50`, not 0.
- Skip the judge when fewer than ~60% of tracks succeeded — right now a total OpenRouter outage means the judge **synthesizes 13 error strings into a paid verdict**.
- Code-review mode calls `runFusionSynthesisStep({...})` **without `capUSD`** — the default path lacks the mid-run `isOverCap` guard that doc/plan modes have. One-line fix, real hole.

**B. Paid Phase-1 tracks duplicate the debates.** `Code Quality` (Claude Sonnet, paid) reviews the same bundle that Phase 2B then debates with Claude as final authority. Drop the paid Phase-1 track; let 2B read the free tracks' digests. `Data Safety & Integrity` (paid) earns its keep — Sean's #1 fear, no debate covers it — but only when the diff touches data paths (see tier design).

**C. Redundant free tracks waste judge-input tokens (real money downstream).** In `buildValidatorTracks`: `UX & Accessibility` vs `Frontend UX & Code Patterns` overlap ~70% (both cover ARIA, touch targets, styled-components); `Architecture & Bug Hunter` vs `Code Architecture (Nemotron Super)` are the **same model** with overlapping mandates; `Competitive Intelligence` and `User Research & Persona Alignment` read a *code diff* and hallucinate market analysis — move both to plan/doc mode only. Merging/dropping these cuts 3–4 tracks × ~2K digest tokens out of the judge packet every run.

**D. Security gets four passes.** Two Phase-1 security brains + Phase 2A debate (2 more calls, every run). Make 2A conditional: only when the two security reports actually disagree or either contains a parsed CRITICAL.

**E. Escalation fires on a substring.** `hasCritical = allDebateTexts.toUpperCase().includes('CRITICAL')` matches "**No** CRITICAL findings" — so "smart" escalation fires on nearly every run, and `criticalFindings` then feeds negated lines to the escalation model. Free models, so it's time/noise not dollars, but it also pollutes the report.

**F. Phantom and mispriced accounting corrupts the "sacred gate."**
- `MODELS.escalation1` is `nemotron-3-nano-30b-a3b:free` yet both stalled-debate escalations bill it at **$0.25/$0.75** — stale from the GLM-4.7 era. Fake spend in every cost summary.
- Doc-mode Phase 2 prices the **combined** Claude+Gemini debate tokens at Gemini rates ($2/$12); Claude's half is $3/$15 → systematic ~20% underestimate.
- The `costUSD > 0.01` "free model may not be free" warning is **dead code** — `costUSD` is only ever nonzero for the enumerated paid models, so the condition can never fire.
- Root cause of all three: blended, after-the-fact pricing on combined token counts. `runRecursiveConsensus` knows which model made each call — meter per model at the call site (see §6).

**G. Structural smaller wins.** Content-hash cache (`hash(codeBundle + promptVersion + model)`) so re-running `--staged` after a typo fix doesn't re-pay everything; per-model concurrency (three tracks share `nemotron3Nano` — see §3) instead of a global 2s×index stagger; `--estimate` flag that runs `evaluateSpendGate` and exits; count grounding queries in the cost summary (`Strategic Research & Gap Analysis` issues 20+ searches — "grounding is FREE" is a stale claim past the daily free allowance).

---

## (3) Correctness / robustness gaps

**Critical — the fence is already breached.** `buildPhase3DesignPrompt(codeBundle, ctx, uxReport)` sends the **entire code bundle** — auth code, payment code, anything in the diff — to `z-ai/glm-5.2`. The MODELS comment justifies the design slot as "lowest sensitivity, **no PII/security/code**." That sentence is false in code-review mode. Plan mode sends the plan doc (defensible); code mode is a live policy violation. Scope Phase 2C inputs to UI-surface files only (extension allowlist `.tsx/.css/.styled.ts`, path denylist `auth|payment|stripe|user|session|migration|middleware|backend`) before any Chinese-provider model — GLM *or* Kimi — touches them.

**Critical — the guard has a Kimi-shaped hole.** `DISALLOWED_PROVIDER_PREFIXES = ['minimax/', 'stepfun/', 'qwen/', 'deepseek/', 'z-ai/']` — **`moonshotai/` is not in the list.** The day Sean sets `SWAN_FUSION_JUDGE_MODEL=moonshotai/kimi-k3`, the judge slot (which *is* scanned, via the escalationModels hack) sails through on security runs. Add the prefix *before* any Kimi wiring.

**High — enforcement is opt-in by callers.** `assertNoChineseProviderInPolicyConstrainedTracks`'s own docstring admits it: no global enforcement, future code paths can forget to call it. A fence that depends on every future maintainer remembering to invoke it is not a fence.

**High — silent coverage loss.**
- `getRecentFiles`: the `--since` format guard `throw`s inside its own `try`, gets swallowed by its own `catch`, and silently falls back to `git diff --name-only HEAD`. A typo'd `--since 24` reviews the working tree and tells no one. Exit with the message instead.
- Same function: files past the 60K-char budget are silently dropped (`break`). The report claims `Files reviewed: N` where N is what *survived*, not what matched. Log every skipped file and list them in the report.
- `--files` with a typo'd path → `existsSync` skip → silent.

**High — no retry, no per-model throttle, wrong exit semantics.** `callOpenRouter`/`callGeminiDirect` have zero retry/backoff. Three tracks hit the same `:free` Nemotron Nano within the stagger window → OpenRouter free-tier 429 → permanent ERROR row. And if **all** 13 tracks fail (bad key, zero credits), the run prints `0/13 passed` and **exits 0**. CI would green-light a void report. Exit non-zero when `successCount === 0`; add a `--fail-under N` threshold.

**Medium — plan-mode key handling.** `hasGemini31` gates only the debates. The three `gemini-direct` Phase-1 tracks in `buildPlanningValidatorTracks` fire regardless; with no `GEMINI_API_KEY`, `callGeminiDirect` sends `key=null` and three guaranteed FAIL rows result. Preflight should validate keys per provider *for the selected track set*.

**Medium — preflight ordering.** `import './lib/preflight.mjs'` executes before `main()` ever calls `loadEnv()`. If preflight checks required env vars, it only sees externally-exported env, not `.env`. Move env loading into a module imported *before* preflight.

**Medium — concurrency on output.** Two overlapping runs interleave writes to `latest/`, and `timestamp` has second resolution — same-second runs collide in `archive/`. Add a lockfile and append a pid/ms suffix.

**Low — drift tells.** `buildSummaryPrompt` prints `/7 passed`; code-mode summary prints `${successCount}/${phase1Tracks.length}` where `successCount` includes debates (can print `15/13 passed`); banner math says 14/12 while strings say 15/13; the timeout comment references DeepSeek; the header block documents 9 analysts. Derive every count from the track arrays.

**Policy note:** OpenRouter `:free` endpoints log/train on traffic per provider terms. Sending raw code to them while fencing Chinese providers over data governance is incoherent unless `formatCodeBundle` first runs a PII redaction pass (email/phone/token regexes → IDs). That redaction is also your "zero PII to LLMs" house rule made mechanical. Do it once, in `formatCodeBundle`, and every downstream provider inherits it.

---

## (4) Slotting Kimi K3 and GPT-5.6 Sol without weakening the fence

The current fence is a *prefix list plus a function callers must remember*. Make it a **slot-policy table enforced at the single call choke point** (§6):

```js
const PROVIDER_CLASS = {
  western:    ['google/', 'anthropic/', 'nvidia/', 'arcee-ai/', 'openai/'],
  designOnly: ['z-ai/', 'moonshotai/'],          // design panel + non-sensitive judge ONLY
  banned:     ['x-ai/', 'grok'],                  // permanent
};
const SLOT_POLICY = {
  phase1:      { allow: ['western'], uiScoped: false },
  escalation:  { allow: ['western'], uiScoped: false }, // most sensitive slot — never relax
  judge:       { allow: ['sensitivity-routed'] },       // western if sensitive, Kimi if not
  designPanel: { allow: ['western', 'designOnly'], uiScoped: true }, // code-mode inputs UI-filtered
};
```

- **Kimi K3** enters with exactly two legal slots: `designPanel` critic and `judge` on non-sensitive runs. `moonshotai/` goes into `designOnly` (and today's flat DISALLOWED list gains it immediately, as hotfix).
- **Sensitivity is a first-class run property**, computed once in `main()`:
```js
function isSensitiveRun(tracks, files) {
  const SENSITIVE_TRACK = /security|data safety|privacy|auth/i;
  const SENSITIVE_PATH  = /(auth|login|session|token|password|payment|stripe|checkout|order|user|account|admin|migration|seed|middleware|rbac|backend\/models)/i;
  return tracks.some(t => SENSITIVE_TRACK.test(t.name)) || files.some(f => SENSITIVE_PATH.test(f.path));
}
```
Default paranoid: anything uncertain → sensitive → judge = **Sol 5.6** (western workhorse, $5/$30) or **Fable 5** in the ultimate tier. Non-sensitive (UI-only diffs, design-only plan runs) → judge = **Kimi K3**. Note Kimi at $3/$15 is Sonnet-priced, *not* "pennies" — the lean tier only gets cheap via digest inputs + judge-skip rules from §2A.
- Do **not** let Kimi synthesize security-track output. If Sean wants a cheap judge on runs that *include* security findings, the only clean way is split synthesis: Kimi gets the non-sensitive tracks' digests; sensitive tracks' outputs are appended raw (no LLM) to the report. Binary routing is simpler; split synthesis is the escape hatch. Pick one — never "Kimi sees everything but only on Tuesdays."
- **3-way design panel:** `runRecursiveConsensus` is 2-party. Don't bolt on a third debater in a 5-round loop (10+ calls). Use a panel: Round 1 GLM 5.2 issues the spec → Round 2 **Gemini 3.1 Pro and Kimi K3 critique in parallel** (2 calls) → Round 3 GLM rules as final authority. Three calls, GLM keeps Creative-Director authority, Kimi gets its Design-Arena role, cost *drops* versus the current 5-round 2-way. New lib function `runDesignPanel({ lead, critics })`, slot `designPanel`, `uiScoped: true`.
- **Amend the header lie:** the MODELS comment says "NO OpenAI/ChatGPT." Sol contradicts it. Rewrite the comment to name the *actual* policy (western providers allowed; Chinese providers design-slot-only; x-ai banned) — policy lives in one table, not prose.
- The solo scripts (`consult-fable/sol/kimi.mjs`) must import the same dispatcher and spend gate. Otherwise they're exactly the "AIs popping OpenRouter reviews whenever they feel like it" hole Sean banned, wearing a different filename.

---

## (5) Tier structure — leanest default vs gated ultimate

One env/flag — `SWAN_VILLAGE_TIER=lean|standard|ultimate` (+ `--tier`), default **lean** — consumed by `buildValidatorTracks`, the debate block, and the judge config. Nothing else branches on tier.

| | **LEAN (default, ~$0.05–0.12)** | **STANDARD (~$0.40–0.90)** | **ULTIMATE (gated, ~$2–4)** |
|---|---|---|---|
| Phase 1 | 6 merged free brains (UX, Security-Nano, Perf, Arch/Bug-Super, Data-Safety*, Trinity) — *Data-Safety only if diff touches data paths | 13 brains as today (post-merge) | 13 + both paid Claude tracks |
| Debates | none | 2B capped 3 rounds; 2A only on disagreement/CRITICAL | all three, 5 rounds |
| Design | single GLM pass on UI files | 2-way GLM↔Gemini, 3 rounds | **3-way panel** GLM + Gemini + Kimi |
| Judge | Kimi (digests, ≤8K out) — sensitive runs → Sol | sensitivity-routed: Kimi / Sol | **Fable 5**, 32K ceiling, `SWAN_FUSION_DELIVERABLE=1` allowed |
| Escalation | parsed-CRITICAL only | parsed-CRITICAL or stalled | always-on deep-dive |
| Gate | auto-proceed under `$0.25` | existing cap + confirm | **TTY-only confirm — `SWAN_VILLAGE_CONFIRM=yes` env bypass disabled; run refused unless `SWAN_VILLAGE_MAX_USD` is explicitly set** |

The ultimate tier's confirm-bypass removal is the point: Sean's rule is that the gate is sacred, and today any process with the env var can auto-yes the most expensive configuration. Lean stays non-interactive so it can run on every commit.

---

## (6) The single highest-value change

**Route every LLM call through one metered, policy-enforcing dispatcher — `dispatchModelCall({ slot, provider, model, prompt, uiScoped })` — and delete the direct `callOpenRouter`/`callGeminiDirect` call sites.**

This one choke point simultaneously fixes the four worst things in the file: the fence becomes *structural* (provider-class × slot policy enforced at call time — the Kimi hole and the "callers must remember" weakness both die); cost becomes *exact* (per-model metering inside debates kills the blended mispricing and the phantom escalation charges, so the sacred gate stops lying in both directions); reliability jumps (retry-with-backoff + per-model semaphore for the shared free models, eliminating the 429-driven ERROR rows); and tiers plus Kimi/Sol slotting become pure configuration instead of three new code paths — which is itself a fence requirement, since every new hand-wired model call is a new chance to bypass the audit.

**Immediate two-line hotfix before that refactor lands:** add `'moonshotai/'` to `DISALLOWED_PROVIDER_PREFIXES`, and scope `buildPhase3DesignPrompt`'s input to UI files — because today GLM 5.2 receives the full code bundle in direct contradiction of the written policy, and Kimi would inherit the same unguarded path.
