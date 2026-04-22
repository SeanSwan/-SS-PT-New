# AI-Workflow Bug Handoff — `consult-gemini.mjs` arg parser

**Priority:** MEDIUM (silently corrupts every `--review --file X` call until fixed)
**Owner:** Codex (AI-workflow infrastructure)
**Out of scope for:** Phase 18.A product work (which is why this is a separate note)
**Discovered:** 2026-04-21 during Phase 18.A Gemini CTO review
**Not touched by this session:** no fix applied, no diff proposed beyond the correct fix direction below

---

## Bug

Running `node scripts/consult-gemini.mjs --review --file <path>` sends **literal `"--file"`** to Gemini as the code to review, and records `File: \`unknown\`` in `AI-Village-Documentation/gemini-consults/latest.md`.

Gemini, receiving `"--file"` as its "code to review," hallucinates a phantom component and returns a confident-sounding design review that is **entirely unrelated to the file on disk.** The hallucination is plausible enough to waste reviewer time if not caught.

Reproduced 2026-04-21 on [ViewAsBanner.tsx](../../../frontend/src/components/DashBoard/components/ViewAsBanner.tsx). First consult returned a review of a nonexistent "WorkoutSummaryCard" with design directives to rename the banner's styled-components to `CosmicNebulaButton`, add a `CardTitle`, `StatGrid`, etc. None of those exist in the file.

## Root cause

[`scripts/consult-gemini.mjs:322-344`](../../../scripts/consult-gemini.mjs#L322-L344) — argv loop:

```js
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--plan') {
    opts.mode = 'plan';
    opts.input = args[++i] || '';   // ← greedy: consumes next arg regardless of value
  } else if (args[i] === '--design') {
    opts.mode = 'design';
    opts.input = args[++i] || '';   // ← same
  } else if (args[i] === '--review') {
    opts.mode = 'review';
    opts.input = args[++i] || '';   // ← same
  } else if (args[i] === '--ask') {
    opts.mode = 'ask';
    opts.input = args[++i] || '';   // ← same
  } else if (args[i] === '--research') {
    opts.useGrounding = true;
  } else if (args[i] === '--file') {
    opts.file = args[++i] || '';
  }
  ...
}
```

Invocation sequence `--review --file <path>`:

| step | i | args[i] | action |
|---|---|---|---|
| 1 | 0 | `--review` | `mode='review'`; `opts.input = args[1] = '--file'`; i→1 |
| 2 | 2 | `<path>` | no match, falls through to `else if (!opts.input)` — but `opts.input` is already `'--file'` (truthy) → ignored |

Result: `opts.input = '--file'`, `opts.file = undefined`, `opts.reviewPath = undefined`. Then [line 354](../../../scripts/consult-gemini.mjs#L354) `if (opts.file)` is false, so the real file is never read.

## Workaround (active for Phase 18.A)

Put `--file` **before** the mode flag:

```bash
# Works — --file is parsed first, file contents populate opts.input via the
# later `if (opts.file)` block; --review only sets opts.mode.
node scripts/consult-gemini.mjs --file frontend/src/components/X.tsx --review

# Broken — greedy mode flag eats '--file' as the input value
node scripts/consult-gemini.mjs --review --file frontend/src/components/X.tsx
```

The `--help` output at [line 363+](../../../scripts/consult-gemini.mjs#L363) currently documents the broken order as canonical, which compounds the bug — users will hit the failure mode following the docs.

## Proposed fix (for Codex to implement)

When a mode flag is followed by another `--` flag, do **not** consume the next arg as input. One-line guard on each of the four mode branches:

```js
} else if (args[i] === '--review') {
  opts.mode = 'review';
  // Only consume the next arg as inline input if it isn't another flag.
  if (args[i + 1] && !args[i + 1].startsWith('--')) {
    opts.input = args[++i];
  }
}
```

Apply the same guard to `--plan`, `--design`, `--ask`. Preserves existing valid usages:
- `--review "inline text"` still works (no leading `--` on the quoted text)
- `--review --file path` now works
- `--file path --review` continues to work

No behavior change for the `--file` branch — it already checks `args[++i]` as a path. Update `--help` text so `--review --file <path>` stops being quietly wrong.

## Optional hardening (same commit or follow-up)

- When `opts.mode === 'review'` and `opts.reviewPath` is still falsy at send time, error loudly instead of silently sending `'File: \`unknown\`'` to Gemini. The system prompt has no way to know the input is malformed — failing closed is cheaper than a 50-second hallucinated review.
- Add a test that exercises the four mode flags with `--file` in both orders (`--mode --file path` and `--file path --mode`), asserting `opts.input` equals the file contents.

## Acceptance criteria for Codex's patch

1. `node scripts/consult-gemini.mjs --review --file X` sends the file contents (not the string `"--file"`) to Gemini.
2. `node scripts/consult-gemini.mjs --review "inline text"` still works.
3. `node scripts/consult-gemini.mjs --file X --review` (current workaround) still works.
4. When `--review` is used without any input source (no inline text, no `--file`), the script errors loudly instead of silently sending `opts.input = ''`.
5. The `--help` text + inline JSDoc no longer document the broken order as canonical.
6. A regression test lives in `scripts/__tests__/` or equivalent.

## Receipts

- Bad consult (hallucinated phantom): `AI-Village-Documentation/gemini-consults/latest.md` before the retry (header shows `File: \`unknown\``; body discusses `WorkoutSummaryCard` / `CosmicNebulaButton` which don't exist in the target file).
- Good consult (after workaround): same file after the retry (header shows the real path; body references the real `Bar`, `IconWrap`, `Heading`, `Supporting`, `ReturnBtn` styled-components from `ViewAsBanner.tsx`).

Both generated during Phase 18.A ViewAsBanner review on 2026-04-21.

## Not for this session

This handoff document is a pointer only. Sean's explicit boundary for Phase 18.A was **no AI-workflow files touched** — so `consult-gemini.mjs` is Codex's to fix, not mine. Logging the debt here so it doesn't get forgotten. If Codex prefers a different fix shape than the `.startsWith('--')` guard above, that's fine — the acceptance criteria at the end are what matters.

---

*Logged by Claude Opus 4.7 (1M context) during Phase 18.A. No script code modified.*
