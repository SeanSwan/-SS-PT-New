# Fable Context Compression Protocol

- **Date:** 2026-07-04
- **Author:** Codex, from Sean-supplied transcript + official Claude vision-token docs
- **Status:** CANONICAL policy for using image-rendered context with Fable-class multimodal calls
- **Companions:** `FABLE-WORKFLOW-INTEGRATION-SPEC.md` (when to spend Fable) ; `HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md` (T0-T4 tiers) ; `SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md` (owners) ; `docs/ai-workflow/hermes-agentic-os/command-effect-registry.md` (runtime command rows)

---

## 1. Purpose

Sean's transcript describes a real optimization class: bulky text context can sometimes be rendered into images and sent to a strong multimodal model for fewer billable input tokens than the same text sent normally. The optimization is useful only when it preserves meaning, does not hide instructions, and does not introduce a new security boundary.

This protocol turns the idea into a SwanStudios workflow rule and combines it with Sean's second transcript on broader token reduction:

- Measure savings before using image-rendered context.
- Compact repetitive tool output before it becomes conversation history.
- Semantically compress prompts, memory, and docs while preserving mandatory rules.
- Query logs and large data stores through indexes/search instead of raw full reads.
- Keep task instructions, approvals, and exact patch targets in normal text.
- Use image context only for bulky, stable, read-only material.
- Treat any request-intercepting proxy as blocked until its source, network behavior, and key handling are reviewed.

The goal is lower Fable spend without making the workflow less truthful, less auditable, or less safe.

## 2. Startup discovery contract

There is no separate root `blob.md` in this repo right now. The startup blob-equivalent is the router chain every AI already reads:

- `AGENTS.md` and `CLAUDE.md` carry the compact Fable Control Layer pointer.
- `ACTIVE-INDEX.md` carries the operating-core registry pointer.
- `SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md` names this protocol as the token-economy startup rule.
- This file carries the details; do not paste the full protocol into startup docs unless Sean explicitly asks for a bulkier always-on prompt.

Invariant: a fresh agent should discover this protocol from the first-read files without a transcript, memory lookup, or manual reminder. If any root router loses the `FABLE-CONTEXT-COMPRESSION-PROTOCOL.md` link, treat that as registry drift and restore the pointer before doing Fable-heavy context work.

## 3. What the transcript changes

The transcript's practical claim is that a proxy can sit between a Claude/Fable client and the API, convert large prompt/history/tool-doc text into image blocks, and let the model read the image instead of the original text. Official Claude docs now make the token math concrete enough to preflight this class of workflow: image cost is based on visual patches, roughly `ceil(width / 28) * ceil(height / 28)` after model-specific resizing limits.

Important current finding: `npm view pxpipe` returned `404 Not Found` for the exact package name from the transcript on 2026-07-04. That does not prove no project exists under another name or Git URL, but it means SwanStudios must not install or route keys through a package named from the transcript without a fresh provenance check.

## 4. Canonical posture

| Capability | Status | Reason |
|---|---|---|
| Estimate savings from local files | ALLOWED, T0 | Deterministic local read; no model call and no external effect |
| Prepare a redacted image-context packet manually | ALLOWED, T1 | Draft/propose only; still needs a fidelity receipt before use |
| Send image-rendered context to Fable for review | ALLOWED with gates, T1 | Useful for bulky docs if the model does not need exact line-level text |
| Use image context for hidden approvals or instructions | FORBIDDEN | Instructions and approvals must remain visible text |
| Use image context for secrets, raw client PII, raw PLAUD/audio transcripts, health narratives, keys, env vars, DB URLs, JWTs, or payment data | FORBIDDEN | Rule 8 and rule 44 still govern transport format |
| Install/run an API base-URL proxy that intercepts model requests | BLOCKED pending separate approval | It can see prompts, keys, tool schemas, and outputs; savings do not remove that risk |

## 5. Full token-reduction stack

Apply these in order. Earlier steps are cheaper and safer than image/proxy work.

| Strategy | SwanStudios rule | Status |
|---|---|---|
| Tool-output compaction, RTK-style | Keep command, exit code, failures, changed counts, file/line refs, and the few relevant lines; collapse repeated stdout/stderr noise into counts. Do not hide errors. | ALLOWED as formatting discipline; third-party tool-call rewriters need source review |
| Semantic compression | Rewrite long prompts/docs/memory into dense instructions, but preserve every MUST/NEVER, approval gate, path, command, and exception. | ALLOWED for docs and handoffs; hostile-review any operating-rule compression |
| Logs to queryable stores | For giant logs, use grep/rg, indexed SQLite, CSV filters, or purpose-built query scripts before reading raw logs. | ALLOWED and preferred |
| Huge-read guard | Sample structure, search, then read only matching regions. Do not read generated files, lockfiles, fixtures, or build artifacts unless the task demands it. | ALLOWED and default |
| English by default | Use English for prompts and handoffs unless the task's domain requires another language. | ALLOWED; clarity outranks token shaving |
| Context frugality | Read directly relevant files first; summarize findings before expanding scope. Ask before crossing risky scopes, not before normal focused work. | ALLOWED and already aligned with Codex workflow |
| Context drift checks | Periodically inspect active context/tool/MCP load and remove duplicate browser/MCP/tool sessions. | FUTURE deterministic command candidate |
| Thinking budget cap | Default to low/normal thinking for routine work; opt into high thinking only for architecture, security, billing, auth, migrations, or contradictory reviews. | ALLOWED as session policy; never reduce thinking for high-stakes gates |
| Image-rendered context | Use only after the estimator and fidelity gates below pass. | ALLOWED with receipt |
| Request-intercepting proxy | Treat as a new trust boundary. | BLOCKED until reviewed and approved |

## 6. Best-fit context

Good candidates:

- Long, stable docs that are already safe to show a model: design system, Fable policy, public/reference docs, generated audit packets, non-secret test output, route inventories, file trees.
- Bulky context that informs judgment but is not itself the exact thing being patched.
- Dense cross-review packets where the model needs structure and semantics, not exact whitespace.

Poor candidates:

- Code diffs that require exact line references, indentation, or patch application.
- Security, billing, auth, migrations, or schema-drift work where exact string matching matters.
- Tool outputs that future commands must parse mechanically.
- Anything involving client identity, health details, payment data, secrets, or raw transcripts.

Default rule: if the next agent must cite `file:line`, edit code, or compare exact fields, keep the relevant slice in text and optionally put only background material into images.

## 7. Required preflight

Before any Fable/Codex session uses image-rendered context, first apply the low-risk reducers above: compact tool noise, use targeted search/query, and semantically compress the handoff where that does not weaken mandatory rules.

Then run this image-context preflight:

1. **Classify the data.** Confirm every source is `repo`, `public`, or `sensitive-redacted`. Anything private or raw-sensitive is excluded.
2. **Run the estimator.** Use `node scripts/ai-workflow/fable-context-compression-estimate.mjs <files...>` and save the output in the task thread or receipt.
3. **Require a real savings threshold.** Use image context only if estimated visual tokens are at least 30 percent lower than approximate text tokens or save at least 5,000 input tokens.
4. **Render locally.** Rendering happens on the local machine or a reviewed internal tool. No third-party upload, SaaS renderer, or unreviewed proxy.
5. **Run a fidelity smoke.** Ask the target model to recover three sampled section headings and three sampled lines/snippets from the image pack. Any material mismatch means fall back to text for that source.
6. **Keep control text visible.** The actual task, non-goals, approval gates, exact commands, and file paths stay as normal text.
7. **Write the receipt.** Record sources, excluded sensitive sources, text-token estimate, visual-token estimate, savings ratio, render dimensions, model, fidelity samples, and fallback decision.

## 8. Receipt format

Use this block in handoffs, review packets, or Hermes receipts:

```markdown
## Context Compression Receipt
- Sources: <paths or packet ids>
- Excluded sources: <why each was excluded>
- Data class: repo | public | sensitive-redacted
- Text estimate: <tokens> using <method>
- Image estimate: <tokens> using <width>x<height>, <pages>, <tier>
- Savings: <tokens saved> / <percent>
- Model/provider: <model>, <API/client>
- Renderer/proxy: local-renderer | manual-image | reviewed-proxy <name@version or sha>
- Fidelity smoke: PASS | FAIL, samples <ids>
- Control text kept outside image: yes/no
- Decision: use-image-context | use-text-context | split-context
```

No receipt means no claim of savings and no claim that the image context is safe enough for the workflow.

## 9. Proxy policy

A proxy that rewrites model requests is not just a formatting tool. It may receive:

- System prompts and AGENTS/CLAUDE operating rules.
- Tool schemas and run history.
- Source snippets, private docs, and possibly secrets if a caller makes a mistake.
- API keys or auth headers, depending on how it is wired.

Therefore proxy use requires a separate slice with these gates:

1. Source provenance: package name, repository URL, pinned commit or integrity hash, license, maintainer, and release date.
2. Code review: request parsing, outbound destinations, logging, telemetry, key handling, prompt retention, dependency tree, and update channel.
3. Sandbox: disposable environment, no repo-wide secrets, no persistent shell profile mutation, no global proxy setting, no autostart.
4. Network proof: allowlist only the provider API endpoint; no analytics, tunnel, or secondary egress.
5. Kill switch: easy process stop plus documented env cleanup.
6. Cost and fidelity test: side-by-side prompt with and without proxy; compare token usage, answer quality, and OCR errors.
7. Approval: Sean approves the exact proxy/version/command after the review.

Until those gates pass, any proxy install/run is a blocked capability, even if a transcript says it is easy.

## 10. Fable/Codex workflow rule

For Fable:

- Fable gets image-rendered background only when it is the scarce final-decider brain and the packet is large enough to justify compression.
- Fable gets low/normal thinking by default for routine answers; high thinking is opt-in for architecture, security, billing, auth, migrations, and contradictory reviews.
- Fable's final question, acceptance criteria, and approval constraints remain text.
- Fable must include the compression receipt in any buildable artifact that relied on image context.

For Codex:

- Codex may create estimator reports and local image packets as T0/T1 prep work.
- Codex should compact repeated tool output in status summaries: preserve command, exit code, failures, counts, and relevant lines; omit duplicated noise.
- Codex should use `rg`, file windows, query scripts, and targeted reads before bulk-reading large files or logs.
- Codex must not silently replace code/diff context with images when the task requires exact editing.
- Codex must hostile-review any compression workflow that claims to save money by crossing a new trust boundary.

For Hermes:

- Hermes may register `fable-context-compression-estimate` as a T0 command.
- Hermes may not run a request-intercepting proxy or base-URL override until a separate command row exists and Sean approves it.

## 11. Savings target examples

These examples are estimates, not guarantees:

| Packet | Better as text? | Better as image? | Why |
|---|---|---|---|
| 300-line policy doc | Usually text | Rarely | Savings small; text is easier to cite |
| 50k-token reference packet | Often no | Often yes | High savings potential if model only needs semantic context |
| Exact TypeScript patch target | Yes | No | The patcher needs exact code and lines |
| Design screenshots plus labels | Split | Yes for visuals | Visual model path is natural; labels stay text |
| Raw transcript with client health details | No | No | Excluded by privacy rule regardless of format |

## 12. Implementation roadmap

- **Done now:** canonical protocol + deterministic estimator.
- **Next safe slice:** local renderer that creates PNG/WebP pages from approved text packets and emits a manifest; no model calls and no proxy.
- **Next context-hygiene slice:** deterministic context snapshot/diff command that reports newly loaded tools/MCP/browser sessions/large files so drift is visible before it burns Fable tokens.
- **Later optional slice:** supervised proxy review, only if a real package/repo is found and passes the gates above.

Do not skip the local renderer and jump straight to proxying agent traffic.