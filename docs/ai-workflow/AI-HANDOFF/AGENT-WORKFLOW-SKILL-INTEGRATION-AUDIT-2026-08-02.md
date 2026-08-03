# Agent Workflow and Skill Integration Audit - 2026-08-02

**Status:** Kimi fixes integrated and verified; production release authorized; see task handoff for live release evidence

## Plain-English Verdict

The transcripts are valuable, but copying every upstream skill would weaken the current system. Swan already has stronger safety, continuity, review, browser, research, model-routing, and remote-operator machinery. The useful gap is a cleaner front door for four situations: foggy multi-session work, measurable autonomous execution, unsafe shared checkouts, and step-by-step setup.

The integrated design is therefore:

```text
project detection -> task/fog/workspace classification
  -> Wayfinder only for genuine multi-session fog
  -> measurable goal contract for long clear slices
  -> isolated or coordinated execution
  -> existing Swan gates
  -> evidence lock plus uncertainty review
```

Four portable skills are added: `wayfinder`, `goal-contract`, `worktree-isolation`, and `guided-setup`. Decision auditing is merged into Wayfinder and goal contracts instead of becoming two more skills. All other transcript capabilities are merged into their stronger current owners, deferred to explicit projects, or rejected.

## Evidence Baseline

- The initial shared checkout was on `wip/comms-notifications-2026-07-05`, with unrelated dirty files, **63 commits ahead and 1,421 behind** the refreshed `origin/main` reference.
- Implementation moved to `C:/tmp/sspt-agent-workflow-20260802` on `codex/agent-workflow-integration-20260802`, based on commit `00a1be8286153b8f99719c71383f1d20144f7817`.
- Current committed instruction files had conflicting skill-count claims: 13 in `ACTIVE-INDEX.md`, 14 in `SKILLS-REFERENCE.md`, and 31 in `CLAUDE.md`, while the Windows filesystem exposed 32 Claude-side and 27 agent-side entrypoints before this slice.
- The instruction files referenced nonexistent split Seedance skills; the filesystem and Git contained the unified `seedance-swan-video` with lowercase `skill.md`, a portability defect on case-sensitive systems.
- `.claude/settings.json` already contains deterministic deny/ask controls for destructive commands, protected branches, databases, secrets, environment files, lockfiles, and hooks. The external POSIX guardrail is not a safe drop-in replacement.

## Sources Audited

1. David Ondrej transcript supplied by Sean.
2. Matt Pocock Wayfinder transcript supplied by Sean.
3. [David Ondrej skills repository](https://github.com/davidondrej/skills/tree/f2ce449939b4b46707bc8692cbf9f473b2d891e7), pinned commit `f2ce449939b4b46707bc8692cbf9f473b2d891e7`.
4. [Matt Pocock Wayfinder skill](https://raw.githubusercontent.com/mattpocock/skills/2ab958093e83e0ec752e6c1c5932da465bf23e0c/skills/engineering/wayfinder/SKILL.md), pinned commit `2ab958093e83e0ec752e6c1c5932da465bf23e0c`.
5. Current `origin/main` instruction, skill, hook, continuity, coordination, operator, and validation surfaces.

Both upstream repositories are MIT-licensed. This slice preserves concepts and rewrites the procedures for Swan rather than copying substantial upstream prose. Preserve the respective license notice if future changes copy substantial text.

## Combined Model Review

### Independent OpenAI GPT-5-class audit

The independent `gpt-5.6-sol` reviewer initially returned **REVISE, then integrate**. It recommended the clean worktree, strict situational Wayfinder trigger, bounded goal contract, one-step setup guidance, merged decision ownership, deterministic registry truth, and rejection of unsafe/vendor-specific fragments.

After the first implementation it found claim/frontier, tracker-ownership, YAML parsing, Seedance reference, and gate-ordering defects. Those were repaired and contract-tested. After Kimi's repair pass, OpenAI found three additional live-consumer conflicts: `grill-me` could write before preflight, closeout/`linear-todo` could write externally without current-session tracker authority, and closeout created a second decision register. Those consumers and tests were repaired. The final independent pass found no other workflow-contract P0-P2 defect; its remaining finding was this audit's stale/corrupt chronology, which this section replaces.

### Kimi K3 review

The privacy-sanitized packet SHA-256 was:

`DE2B50AB8F4A44CCBADAF25B0AF7A5F63381E77EC4C1D3BC351B0CDAD8BC3997`

The completed visible review used `moonshotai/kimi-k3` at low reasoning effort after three provider/transport recovery failures, returned `finish_reason: stop`, consumed 1,350 input and 2,011 output tokens, and reported `$0.0342` for the successful call. Kimi returned **REVISE** with three P0 boundary findings and five P1 hardening findings. Failed attempts did not return usage receipts, so no unsupported total-cost claim is made. The temporary raw review artifact SHA-256 is `1D7046C6770220C6141E793F3F042637ED3C627A3F67E4187A80061FCA4DDC5A`; the durable findings and disposition are preserved below.

Adopted and verified:

- environment/worktree classification is an always-first preflight, not a competing mode;
- partly mechanical multi-session work with material fog enters Wayfinder first, then downgrades to a goal contract after clarification;
- sensitive human setup steps require explicit confirmation plus safe observable proof; verification is read-only and halt-on-failure;
- goal baselines and acceptance become immutable after execution starts; changes require explicit re-approval and append-only evidence;
- each mode names one canonical decision source and promotes unresolved decisions into the next handoff's first question;
- tracker authorization is per-session, names the tracker, and scopes create/update authority;
- worktree cleanup cannot be offered until evidence survives outside the target;
- delegated agents inherit constraints and stop conditions and cannot expand authority;
- the new portable skill bodies have a validator-enforced 300-line budget;
- validator failures block skill closeout, commit, and push.

Kimi's proposed repo-wide size cap was narrowed to the four portable skills added here. Applying it to every inherited third-party skill would fail 19 unrelated pre-existing bodies and violate surgical scope.

### Codex synthesis and vision

The transcript value is not "more slash commands." It is better mode selection. Swan's workflow now has one truthful front door:

1. Is the workspace safe and current?
2. Is the destination clear or materially foggy?
3. What observable evidence ends this slice?

This yields higher autonomy with less ritual. Workspace preflight cannot be bypassed by another skill. Wayfinder preserves decision context only when fog warrants it. Immutable goal contracts prevent reward-hacked execution. Guided setup makes human authority observable. Canonical decision ownership and authority-gated tracker sync prevent duplicated state and silent external mutations.
## David Ondrej 44-Skill Triage

| Upstream skill | Verdict | Integration |
|---|---|---|
| agent-self-scheduling | MERGE | Hermes cadence and Codex automations |
| cmux | REJECT | macOS-specific |
| codex-subagent | MERGE | collaboration and fusion routing |
| fable-review | MERGE | Fable/oracle/final-decider chain |
| fable-safe-prompt | REJECT | safety-evasion framing conflicts with policy |
| git-worktree | ADAPT | `worktree-isolation` with baseline, secret, port, service, and cleanup receipts |
| goal-loop | ADAPT | `goal-contract`; no implicit persistent goal |
| gpt-review | MERGE | `swan-oracle`, fusion, closeout |
| handoff | MERGE | continuity, Hermes inbox, tracker, closeout |
| launch-subagent | MERGE | existing collaboration controls |
| run-deep-swe | REJECT | paid benchmark workflow, not core operations |
| anti-sleep | REJECT | macOS-only; no default keep-awake mutation |
| create-readonly-db-role | DEFER | explicit database-governance project only |
| global-agent-guardrails | DEFER/REWRITE | separate cross-platform threat-modeled security slice |
| google-safe-browsing | DEFER | optional launch/security check |
| macbook-metrics-setup | REJECT | macOS-only |
| nuke-cursor-app | REJECT | destructive and irrelevant |
| pi-custom-model | DEFER | Hermes/Pi-specific task only |
| prod-push | MERGE | Rule 42, Rule 70, Render release proof |
| setup-help | ADAPT | `guided-setup` |
| vps-server-management | MERGE PRINCIPLES | Hermes T0-T4 operator boundary; reject root/yolo defaults |
| browser-harness | MERGE | `agent-browser`, `webapp-testing` |
| deep-research | MERGE | official web tools and Swan Oracle |
| deepapi | REJECT | paid vendor, excessive side effects, self-update risk |
| fireflies-transcript | DEFER | explicit account/use case only |
| online-shopping | REJECT | unrelated to repo workflow |
| pi-web-search | MERGE/DEFER | official web tools; Hermes-specific adapter only if requested |
| research-prompt | MERGE | Oracle/research packet contracts |
| youtube-transcript | MERGE | current transcript/video tooling |
| distribute-skill-to-all-agents | ADAPT | validated dual entrypoints, not blind symlinks |
| effective-agent-skills | MERGE | system skill creator plus registry validator |
| folder-specific-claude-and-agents-md | MERGE | existing project-detection hierarchy and mechanical mirror |
| push-skill-to-github | REJECT | foreign publishing assumptions |
| before-building | MERGE | prompt reconstruction and orchestrator |
| brain-to-docs | MERGE | grill-me brainstorms and Wayfinder maps |
| decisions | MERGE | goal/Wayfinder uncertainty register and closeout |
| level-up | DEFER | optional educational mode, not core workflow |
| next-decision | MERGE | one blocking `NEEDS_USER` decision |
| prompt-me | REJECT | incomplete and redundant |
| read-all-adrs | REJECT | incomplete and mismatched to repo conventions |
| remind | MERGE | communication preference and automations |
| save-idea | MERGE | tracker and Hermes inbox |
| short | NO SKILL | communication preference |
| teach | DEFER | optional educational mode |

## Wayfinder Triage

Adopted:

- destination before tickets;
- map as a compact index;
- known terrain, fog, frontier, decisions, and out-of-scope;
- research, prototype, grilling, and prerequisite ticket types;
- blocking dependency order;
- planning separated from implementation;
- primary-source links and one canonical result location;
- one interactive decision ticket per session;
- early exit for work that is already clear.

Adapted:

- local Markdown is the safe fallback for decision evidence when tracker writes are not authorized;
- external tracker writes require explicit authority;
- parallel research follows runtime delegation rules;
- completed specs are retained, superseded, or archived under repo hygiene rules rather than automatically deleted;
- implementation hands off to project-specific gates.

Rejected:

- Wayfinder as the default for every large project;
- a second implementation backlog that competes with Linear;
- automatic external issue creation;
- automatic deletion of completed planning artifacts.

## Existing Workflow Overlap

| New capability | Existing owner strengthened | Why no duplicate |
|---|---|---|
| Fog map and frontier | `grill-me`, `linear-todo`, `swan-orchestrator` | New skill only handles multi-session uncertainty before those gates |
| Measurable loop | orchestrator and verification | Goal contract adds stop/escalation and anti-reward-hacking without replacing tests |
| Workspace isolation | Rule 67 and Git conventions | New skill turns repeated safety expectations into one reusable receipt |
| Guided setup | project detection and approval tools | New interaction mode, not an engineering execution router |
| Decision audit | grill-me and closeout | Folded into existing/new artifacts, not another skill |
| Model debate | oracle/fusion/review scripts | Existing spend, privacy, and advisory controls remain authoritative |
| Guardrails | sandbox and `.claude/settings.json` | Current controls are stricter and platform-aware |
| Remote ops | Hermes operator bridge | Current T0-T4 authority boundary remains authoritative |

## Implemented File Architecture

Portable skills on both runtime surfaces:

- `.agents/skills/wayfinder/` and `.claude/skills/wayfinder/`
- `.agents/skills/goal-contract/` and `.claude/skills/goal-contract/`
- `.agents/skills/worktree-isolation/` and `.claude/skills/worktree-isolation/`
- `.agents/skills/guided-setup/` and `.claude/skills/guided-setup/`

Governance and deterministic truth:

- `docs/ai-workflow/references/AGENT-WORKFLOW-ROUTER.md`
- `scripts/ai-workflow/validate-skill-registry.mjs`
- `scripts/ai-workflow/validate-skill-registry.test.mjs`
- exact-case `SKILL.md` normalization for unified Seedance entrypoints
- operating-doc references updated to remove brittle counts and missing split-skill claims
- `AGENTS.md` regenerated mechanically from `CLAUDE.md`

## Safety Boundaries

- No production, database, email, social, deployment, or remote-host action was authorized by these transcripts.
- No `.env`, credential, token, private ID, or client data was copied into a skill or model packet.
- No user-global hook, DeepAPI integration, keep-awake process, VPS configuration, or external issue was installed.
- Kimi ran under the approved packet/cap; its findings were treated as advisory until verified against the repo.
- Model output remains advisory until verified against the repo.
- The original transcript intake implied no release authority. Sean later explicitly authorized commit and production push; no database, email, billing, destructive cleanup, or remote-host mutation was authorized.

## Validation Contract

Required before the slice is reported complete:

```powershell
python <skill-creator>/scripts/quick_validate.py <each new .agents skill>
node scripts/ai-workflow/validate-skill-registry.mjs
node --test --experimental-test-isolation=none scripts/ai-workflow/validate-skill-registry.test.mjs
node scripts/sync-agents-mirror.mjs --check
node scripts/tree-sentinel.mjs --fast
git diff --check
bash scripts/scan-secrets.sh
```

Any baseline-only failure must be reproduced on the untouched `origin/main` baseline before it is classified as unrelated.

### Current verification evidence

- System skill validator: all four new `.agents` skills valid. PyYAML was supplied from temporary `C:/tmp/codex-skill-validate-pyyaml`; no global dependency was installed.
- Skill registry: 36 Claude-side and 31 agent-side exact entrypoints, 13 intentional shared names, zero errors.
- Contract suite: 9/9 passed, including strict mode ordering, cross-surface byte parity, safety exits, canonical names, and instruction-mirror equality.
- `AGENTS.md` mirror: exact match to `CLAUDE.md`, body SHA `17636fe00ef6e5ce`.
- Node syntax checks: validator and contract test valid.
- `git diff --check`: passed; only line-ending conversion notices were reported.
- Secret scan: 32 changed/untracked files, zero hits.
- Tree sentinel: `origin/main` fresh; isolated worktree reported dirty only with this bounded 32-file slice. No repo cleanup was performed.

Kimi review and repairs are complete. Production release evidence is recorded separately after push.
