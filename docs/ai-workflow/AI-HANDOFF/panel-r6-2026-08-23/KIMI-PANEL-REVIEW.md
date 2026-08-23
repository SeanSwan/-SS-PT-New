# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/PANEL-PACKET-R6-2026-08-23.md
**Seed:** (none)
**Tokens:** 3339 in / 2299 out | **Cost:** ~$0.0445 | **Wall:** 20.6s | **finish_reason:** stop

---

## VERDICT
REVISE — the invariant logic is genuinely sound, but the "COMPLETE" file references three undefined identifiers and lets `..` traversal produce a confident OK/MISSING verdict on files outside the project root.

## BLOCKERS

1. **P0 — `SCRIPT_EXT`, `URL_SCHEME`, `SS_PT` are never defined in the file.** The document labels this "COMPLETE," yet `classifyCommand` calls `SCRIPT_EXT.test(w)`, `URL_SCHEME.test(w)`, and `join(SS_PT, tok)` with no declaration anywhere in the shown source. First hook entry → `ReferenceError` → caught by the outer `catch` → every session emits "hook-registration check could not complete." It fails loud (good), but the check is 100% inoperative — zero of the 13 real registrations are ever verified. If these live in an outer scope not shown, the document misrepresents the file as complete; either way it's unverifiable-as-shipped.

2. **P1 — `..` traversal yields a confident verdict on files outside the project.** Input `node ../../other-repo/hook.mjs`: no quotes, no shell metacharacters, no `%VAR%`, exactly one `.mjs` candidate, doesn't start with `/` or `X:/` → passes every gate → `statSync(join(SS_PT, '../../other-repo/hook.mjs'))`. A registration pointing outside the repo (or a symlinked/traversed path) reads **OK** because some unrelated file exists, or **MISSING** when the real registered target is fine. The check claims to verify "the registered script" but actually verifies "whatever `join` resolves to." Fix: after `join`, `resolve()` and assert the result starts with `resolve(SS_PT) + sep`; decline otherwise.

3. **P2 — `hooks` with a non-object truthy value is silently clean.** `cfg.hooks = 5` or `true`: `cfg.hooks || {}` passes through, `Object.entries(5)` → `[]` → zero iterations, zero findings. The structural-wrongness guard covers non-array *groups* but not a non-object *hooks* block itself — a small residual silent-clean path, the exact pathology the file's own header rails against. Fix: `if (cfg.hooks != null && (typeof cfg.hooks !== 'object' || Array.isArray(cfg.hooks))) unresolvable.push(...)`.

## ATTACKS

- **Correctness:** `SCRIPT_EXT.test(w)` — if the (unshown) regex isn't end-anchored (`/\.mjs$/`), `backup.mjs.bak` or `foo.mjs.map` counts as a script candidate; a command whose only "script" is an artifact gets stat'd and judged. Unverifiable from the document, but the filter's soundness depends entirely on anchoring.
- **Correctness:** Windows drive-relative path `C:hook.mjs` — no backslash, no `:/`, so `isAbs` is false and it's treated as relative; on Windows `join` resolves it against the C: drive's cwd, not the project. Wrong-machine verdict. P2.
- **Correctness:** `statSync` follows symlinks — a checked-in symlink `hook.mjs → /etc/whatever` (a file) reads OK. Low severity for a local dev gate, but it's a second hole in the "relative = safe" assumption alongside `..`.
- **Correctness:** `brief` truncation at 90 chars can split mid-token, cosmetic only.
- **Security:** No injection/SSRF surface (no exec, no network). The real security-relevant gap is the traversal in Blocker 2: the gate's *attestation* ("this registered file exists") can be made about an arbitrary filesystem location.
- **Data-truth / schema drift:** The check assumes the Claude settings schema (`hooks → event → groups[] → hooks[] → command`). If the harness ever accepts `command` as an array, or a top-level `hooks` array, this reports "structurally wrong" (loud, acceptable) — but a schema that adds a *sibling* field (e.g. `hook.script`) would be silently ignored: `hook?.command` is `undefined` → UNVERIFIED "no usable command string." Loud, fine. No drift defect found.
- **Dedupe:** `seen` is scoped per settings file while the key embeds `name` — harmless redundancy, not a bug. Verdict-kind in the key correctly prevents cross-kind swallowing.

## HIGHEST RISK

Blocker 1 (undefined identifiers) if the file truly is complete — the gate is dead on arrival. But the *most dangerous design flaw* is Blocker 2, because it fails in the direction this entire six-round effort exists to prevent: a **confident OK that is about the wrong file**. Cheapest de-risk: three lines — `const resolved = resolve(SS_PT, tok); if (!resolved.startsWith(resolve(SS_PT) + sep)) return unver('resolves outside the project root');` then `statSync(resolved)`. Add one fuzz case (`node ../x.mjs`) to the 15.

## CONFIDENCE

- I **cannot verify** whether `SCRIPT_EXT`, `URL_SCHEME`, `SS_PT`, `readFileSync`, `findings`, and the outer `try {` are defined above the shown excerpt. The document says "COMPLETE," which if true makes Blocker 1 certain; if the excerpt is truncated, Blocker 1 dissolves. Evidence needed: the full file head (imports/constants).
- I **cannot verify** the claim that all 13 real registrations still read OK — that depends on the actual settings.json contents and the `SCRIPT_EXT` anchoring, neither supplied. Evidence needed: the two settings files and a run log.
- I **cannot verify** the 24+15 test suite exists or asserts the invariant (only its existence is claimed). Evidence needed: the test file.
- House rules: no violations applicable to this artifact (Node script; no UI, no LLM calls, no credential/yoga language). Nothing to flag.
