# Claude Code 8-Repo Upgrade Evaluation — 2026-09-15

- **Trigger:** Sean, 2026-09-15 — evaluate the 8 free GitHub repos from the 2026-09-14 Claude Code upgrade video against `CLAUDE.md` / `AGENTS.md` / `SOUL.md`, the workflow, and existing skills; adopt upgrades, harden similar house skills.
- **Author:** ZCode (GLM-5.3-Flash) vs-claude lane. Evidence basis: each repo's live README (fetched 2026-09-15), not the video blurb.
- **Status:** CANONICAL reference for this evaluation. Companion skills: `.claude/skills/chisle/`, `.claude/skills/image-to-threejs/`, `.claude/skills/closeout-evidence-lock/` (upgraded in place).
- **Rule 38 hygiene:** this doc is the only new artifact beyond the skill files listed above. No screenshots, no temp files.

---

## 1. Verdict matrix

| # | Repo (license) | Mechanism | Closest existing counterpart | Verdict | Action taken |
|---|---|---|---|---|---|
| 1 | img2threejs (Apache-2.0) | Image → procedural Three.js code; spec gate + pass ladder | `.agents/skills/three` is a HyperFrames RENDER skill — no image→model pipeline existed | **ADOPT (hardened)** | New house skill `.claude/skills/image-to-threejs/` |
| 2 | Reticle (Apache-2.0 / FSL-1.1 server) | Dev-only app instrumentation + MCP `reticle_assert`; 3-valued verdicts | `verification-before-completion` + closeout proof gates — stronger on claims, weaker on real-app evidence | **HARDEN + optional install** | Closeout §5 verdict classes added; real SDK install = Sean's call |
| 3 | Chisle (MIT) | 3 axes: terse prose, YAGNI code, tool-output trim; hooks; Hermes support | `FABLE-CONTEXT-COMPRESSION-PROTOCOL` (input axis only); orient-gate (index only) | **ADOPT (hardened) — Sean's top ask** | New house skill `.claude/skills/chisle/`; real `npx chisle` install = optional |
| 4 | ui-skills (MIT) | MCP/CLI registry of design skills | `swan-design-router` + Design Brain + 2 reference libraries | **NOT an upgrade** — would dilute house taste (rule 40) | None; occasional `npx ui-skills get <skill>` as reference pull |
| 5 | Ouroboros (see repo) | Pre-build interview → spec gate → plan-vs-result check → evolution loop; 14 runtimes | `grill-me` (deeper) + `swan-orchestrator` + dry-loop closeout | **HARDEN** (plan-vs-result diff was the missing piece) | Closeout §1c Plan Fidelity added; real tool optional |
| 6 | FWC SwiftUI Skills (MIT) | iOS 26 Liquid Glass + iPhone Duo foldable skills | N/A — SwanStudios is React web | **NOT APPLICABLE** | Parked; revisit only if an iOS lane opens |
| 7 | Caliper (MIT) | A/B skill ablation harness (with/without skill, success rate + token cost); claude-code/codex/hermes | `.ai-workflow/gate-mode.json` pre-registered thresholds (orient/dual-tier precedent) | **ADOPT protocol; harness = next slice** | Protocol below §4; no harness code this pass |
| 8 | anti-slop (MIT) | Opinionated Oxlint rules rejecting low-evidence TS/JS patterns | Fallow code-health (dead/dupes/complexity) — misses LLM-writing slop | **HARDEN + optional vendor** | Closeout §4.6 slop checklist added; Oxlint vendoring = next slice |

## 2. Per-repo detail and decisions

### 2.1 img2threejs — image → code-built 3D
Reconstructs an object from ONE reference image as a TypeScript `THREE.Group` factory built from primitives + procedural materials — explicitly not photogrammetry. Its discipline is the product: fail-closed spec gate (`--strict-quality` blocks shallow specs before codegen), pass ladder (blockout→structure→form→material→surface→lighting→interaction→optimization) with one side-by-side review sheet per pass, materials derived from reference pixels not memory, per-region confidence for what the image cannot show. **Decision:** the discipline is now house doctrine in `image-to-threejs`, Swan-tokenized (rule 6 `var(--token, #fallback)` mapping, rule 25 motion budget, dark-surface tone-mapping check). The upstream Python forge is optional (`git clone … .claude/skills/img2threejs`) — adopt only if measured to beat the house pass-rate. Fits the rule 40 taste-ceiling doctrine: a code-built 3D hero is a cinematic-tier device for awe surfaces, never for client/data cards.

### 2.2 Reticle — stop false "done" claims
Three pieces: dev-only SDK inside the app (network/store/console/routes/DOM/React-fiber), build plugins (dead-code-eliminated in prod), local MCP bridge exposing `reticle_assert`. Verdicts are three-valued — pass / fail / **"couldn't tell", where unknown is never a quiet pass** — with `file:line` on failures and a `coverage` field naming why evidence is partial. **Our claim discipline (rules 19/28/73, dry-loop) is already stronger** than anything Reticle says about reporting; what we lacked was (a) the explicit UNKNOWN-is-not-pass verdict class and (b) real-app instrumentation as evidence. (a) is now in closeout §5 with the drive-the-real-app requirement. (b) is the real product — `npx @reticlehq/server init` wires SDK + plugin + MCP for all agents; it touches frontend dependencies and agent MCP config outside this repo, so it needs Sean's explicit go. License note: app packages Apache-2.0; server/CLI FSL-1.1 (free except reselling Reticle itself, converts to Apache-2.0 after 2 years) — no conflict for our use.

### 2.3 Chisle — the "stop talking so much" skill (Sean's top ask)
Three axes: (1) terse prose — answer first, skip preamble/restating; published test ~1,500→~600 tokens on one task; (2) YAGNI-first code — skip abstractions/config/error-handling the task doesn't need; (3) tool-output compression before the model reads it. Supports Claude Code, Pi, Cursor, Codex, Gemini + 4 more, **including Hermes**. **Gap analysis against ours:** the Fable compression protocol already owns the input axis richly (§5 stack, estimator, proxy gates) but as *policy for Fable calls*, not as enforced behavior on every reply; orient-gate enforces the reply *index*, not the reply *budget*; nothing enforced YAGNI code. **Decision:** `.claude/skills/chisle/` captures all three axes as house doctrine with explicit reconciliation (full-output-enforcement owns deliverables, Chisle owns conversation; terse ≠ truncated — rules 19/51/73 outrank it) and a pre-registered kill condition (gate-mode convention). Mechanical upgrade path (Sean's go, touches user-level config): `npx chisle` — zero deps, auto-wires Claude Code + Hermes + others, reversible via its uninstall.

### 2.4 ui-skills — design skill registry
MIT registry (8.6k★) browsable via MCP (`list_skills`/`get_skill`) or `npx ui-skills`. **Not an upgrade:** rule 40 already funnels ALL design work through `swan-design-router`, which loads the Cinematic Design System + Design Brain + two reference libraries, and deliberately keeps external aesthetic brains explicit-invocation-only. A second auto-discovered design brain would dilute house taste. **Keep as a reference well**: `npx ui-skills get <skill>` when the router wants external breadth — same lane as ui-ux-pro-max.

### 2.5 Ouroboros — interview → spec → build → check → evolve
MCP server + skills: interrogates decisions before building (asks only about choices that change what the app does), then checks the finished app against the plan and bounces problems back; "evolution loop" with budgeted iterations; 14 runtimes including Hermes. **Mostly covered:** `grill-me` (two-phase extraction + checkpointed brainstorm docs) is deeper on the front side; dry-loop hostile review is deeper on the back side. The genuinely missing piece was a **plan-vs-result fidelity diff at closeout** — now closeout §1c: every numbered plan decision must be shipped/deviated/dropped with reasons; undisclosed deviation caps the closeout at NARROW-CLAIM-PASS. Real tool (PowerShell/uv install script — executes remote code) stays optional pending Sean's go.

### 2.6 FWC SwiftUI Skills — iOS only
Liquid Glass (iOS 26) + iPhone Duo foldable layout skills, MIT, Agent Skills format. SwanStudios is React 18 web on Render. **Not applicable.** Park; one-liner install (`npx skills add FloWritesCode/fwc-swiftui-skills`) if a native iOS lane ever opens.

### 2.7 Caliper — measure whether skills earn their tokens
Eval harness: `.eval.yaml` (skills, tasks, success criteria) → run real agent WITH the skill and with `--ablate <skill>` (installs where the agent looks; never pastes into prompt) → `caliper compare` diffs per task. Primary metric raw success rate; unusable attempts (infra/timeout/judge error) excluded; token volume + wall-clock secondary; activation score kept separate. Supports claude-code, codex, hermes (pi excluded). **This is the measurement layer our gate-mode system lacks at skill granularity** — gate-mode proves/disproves individual gates with pre-registered thresholds; Caliper does the same for skills. **Decision:** adopt the PROTOCOL now (below), build a harness as a next slice (`pipx install caliper-eval`, MIT). Note: real runs spend real agent tokens — rule 16-adjacent cost disclosure applies; never auto-retry failed runs (Soul spending doctrine).

### 2.8 anti-slop — spellcheck for AI-written code
Opinionated **Oxlint** rules rejecting low-evidence JS/TS patterns: the class of tells that LLM-written code leaves — speculative defensive code, single-use abstractions, swallowed errors, dead params. Fallow covers dead files/dupes/complexity; it does not target this class. **Decision:** the pattern list is now closeout §4.6 (hostile reviewers check it every round). Deterministic enforcement = vendor the Oxlint config as a devDependency and wire into Tier-A — that changes `frontend/package.json` and lint infrastructure (rule 18: inspect existing ESLint setup first), so it is a scoped next slice, not this pass.

## 3. Alignment with SOUL.md / CLAUDE.md / AGENTS.md

- **"Honesty over comfort"** (SOUL) ← Reticle verdict classes + Ouroboros plan-fidelity: upgrades to the honesty machinery, not new values.
- **"Make Sean smarter / least time"** (SOUL + standing mandate) ← Chisle: fewer words, less re-reading.
- **"How Sean buys AI"** (SOUL 2026-09-11: capped, disclosed, never auto-retry) ← Caliper's token-cost measurement and the no-auto-install discipline above; also the reason every real-tool install here waits for Sean's go.
- **Rules 19/28/51/73** (claims/evidence) ← Reticle hardening slots directly into the existing gate chain; no rule text changed.
- **Rules 40/25/6** (design router, motion, tokens) ← image-to-threejs is written subordinate to all three.
- **Rule 63** (static intelligence gate) ← anti-slop is the pattern-level complement to Fallow; §4.6 is the manual pass until Oxlint is vendored.
- **No CLAUDE.md/AGENTS.md edits** — shared files (rule 67); if Sean wants a rule amendment (e.g. brevity as a numbered rule), that is his call as a separate slice.

## 4. Skill-ablation protocol (Caliper, house version)

Run when a skill's value is disputed, before deleting/quarantining or before adding an expensive new skill:

1. **Pre-register** (gate-mode convention, before any data): the skill under test, 3–5 real tasks, the success criteria per task, and the keep/kill threshold (e.g. "kill if WITH-skill success ≤ WITHOUT-skill success, or token cost > 2× with < 20% success gain").
2. **Two arms, same tasks:** WITH the skill installed where the agent discovers it; WITHOUT (ablated). Fresh session per attempt, no history bleed.
3. **Score per attempt:** pass / task_fail / cheat, or unusable (infra/timeout/judge) — unusable attempts are excluded from the rate and counted separately (never silently dropped).
4. **Compare:** success rate first; token volume + wall-clock second; activation (did the skill even fire) on its own scoreboard, never blended into success.
5. **Verdict:** KEEP / KILL / REWRITE against the pre-registered threshold. Record in the task thread; if a gate/skill is deleted, cite the run.

Harness options: `pipx install caliper-eval` (supports claude-code + codex + hermes backends) or a house script under `scripts/skill-ablation/` reusing gate-mode.json conventions.

## 5. Real-tool install menu (all optional, each needs Sean's explicit go)

| Tool | Command | Touches | Risk notes |
|---|---|---|---|
| Chisle (mechanical trim) | `npx chisle` | User-level agent configs (Claude Code, Hermes, Codex, …) | Outside repo; reversible via its uninstall; zero deps |
| Reticle (real-app evidence) | `npx @reticlehq/server init` from frontend/ | frontend deps, build config, agent MCP config | Dev-only + localhost; FSL license on server pkg; adds a build plugin |
| Caliper (ablation harness) | `pipx install caliper-eval` | Python env only | Runs real agent sessions = token spend; disclose before first run |
| img2threejs forge | `git clone https://github.com/img2threejs/img2threejs.git .claude/skills/img2threejs` | Repo skills dir | Stdlib-only Python; adopt only if it measures better than house pipeline |
| Ouroboros | installer script from its README | Machine-level MCP config | Executes a remote install script — review before running (proxy-gate discipline) |

## 6. Observations surfaced during comparison (no action taken — rule 34)

- `ACTIVE-INDEX.md` says `.claude/skills/` contains "exactly 13 default-exposed entries"; the directory now holds ~40. Drift only — flagging for a future index refresh slice.
- Several `.claude/skills` files show as deleted in git status (full-output-enforcement, verification-before-completion, systematic-debugging, …) while live copies exist under `.agents/skills/` — looks like an uncommitted catalog migration. Uncommitted tree state should be resolved before the next commit that touches skills.
