---
name: canonical-surface-audit
description: Produces the Canonical Surface Receipt, Surface Classification Table, Schema Cross-Check Artifact, and Backend Route Ownership walk required by AGENTS.md rules 26-31. Use for any UI/data-truth bug or audit where the live surface must be proven before coding. Prevents the fix-a-legacy-path-while-claiming-canonical-truth failure mode.
---

# Canonical Surface Audit

**Role:** standardized execution surface for AGENTS.md rules 26, 27, 29, 31. Produces the four required artifacts in a consistent format so every audit looks the same and nothing gets skipped.

This skill exists because the session that caused AGENTS.md rules 26-31 to be written *twice* produced "end-to-end fixed" claims while patching legacy/dormant paths. The root cause was no reproducible procedure for the receipt-then-code sequence. This skill is the procedure.

## When to invoke

- Any UI or data-truth bug fix on an existing surface
- Any audit of "which dashboard is live"
- Any task where competing surfaces (route trees, hook consumers, endpoints) may exist
- After a subagent reports "I found a bug" — to verify the claim against the canonical tree (rule 30)

## Mandatory output (produce all 4 artifacts for the task)

### Artifact 1 — Canonical Surface Receipt (rule 26)

```
=== CANONICAL SURFACE RECEIPT ===

TARGET URL: [e.g. /dashboard/client/overview]

1. Route file mounted at target URL:
   [file:line of Route element]
   Element rendered: [component name]

2. Mounted JSX page/component:
   [file:line of the component definition]
   IMPORTANT: a lazy import() declaration is NOT proof of mount.
   Proof of mount = a <ComponentName /> JSX usage somewhere in the live route tree.

3. Consumer hook/service:
   [file:line]

4. Exact frontend API path string literal:
   "[GET/POST] /api/..."
   [file:line where the string appears]

5. Backend route match (mount-order-aware, see Artifact 4):
   app.use(...) at [file:line]
   router.(get|post)(...) at [file:line]
   controller function: [name] at [file:line]
   service function: [name] at [file:line]

6. Authoritative model fields:
   Model file: [file:line of the model definition]
   Real columns: [quote the list from the model file]
```

### Artifact 2 — Surface Classification Table (rule 27)

Required when more than one file/component/route/endpoint appears to serve the same product surface.

```
=== SURFACE CLASSIFICATION TABLE ===

| Surface | Path / File | Label | Evidence |
|---|---|---|---|
| [surface A] | [path] | canonical | [file:line] |
| [surface B] | [path] | legacy | [why: "not rendered by the currently verified canonical route tree for this surface" — file:line] |
| [surface C] | [path] | dormant | [why: no consumer — file:line] |
| [surface D] | [path] | competing/ambiguous | [why — file:line] |
```

Rules:
- Every row requires file:line evidence
- "legacy" wording is "not rendered by the currently verified canonical route tree for this surface" — do NOT claim "dead" without a repo-wide reference audit
- If a row is ambiguous, stop and resolve with Sean before coding

### Artifact 3 — Schema Cross-Check Artifact (rule 29)

Required for any model-touching task.

```
=== SCHEMA CROSS-CHECK ===

MODEL FILE: [file:line]
REAL COLUMNS (from model file):
  - [col1]
  - [col2]
  - [...]

REPO-WIDE GREP RESULTS (grep <ModelName> backend/routes backend/controllers backend/services):
  - [file:line] — touches fields: [list]
  - [file:line] — touches fields: [list]
  - [...]

DRIFT TABLE:
| Caller file:line | Referenced field | Real column | Status |
|---|---|---|---|
| [file:line] | s.[field] | [real or missing] | match | drift |
```

A drift row triggers a sibling sweep — every other caller referencing the same drifted field is also checked.

### Artifact 4 — Backend Route Ownership / Shadow Audit (rule 31)

Required when touching an API path.

```
=== BACKEND ROUTE SHADOW AUDIT ===

TOUCHED PATH: [e.g. /api/workout/sessions]

MOUNTS IN ORDER (only the touched path and overlapping siblings — narrow scope):
  1. app.use('/api/workout', workoutRoutes) at [file:line]
     — declares router.get('/sessions', ...) at [file:line]
     — would match /api/workout/sessions via its inner route
  2. app.use('/api/workout/sessions', workoutSessionRoutes) at [file:line]
     — declares router.get('/', ...) at [file:line]
     — second in mount order

SHADOWING CONDITION:
  [yes/no/ambiguous]
  [if yes or ambiguous: which mount likely wins at runtime and why]

VERIFIED HANDLER (if resolved):
  [controller.function at file:line]

AMBIGUITY (if not resolved):
  [explicit statement that the handler is not verified]
```

Rule: do not claim "this is the handler for path X" without this artifact. If the audit cannot resolve the owner, call that out explicitly and do not proceed with a fix that assumes a specific handler.

## Integration with `swan-orchestrator`

`swan-orchestrator` dispatches to this skill when rule 26 is required. This skill runs, produces the 4 artifacts, and hands back to the orchestrator. The orchestrator then unblocks implementation or sends the task to `swan-design-router` (if UI) or direct to code.

## Reporting style

- Blockers first
- Evidence second
- Conclusions last
- No "looks good" without naming the artifact it is based on
- No "should be correct" without the matching file:line

## Non-goals

- This skill does not fix bugs
- This skill does not write design code
- This skill does not perform hygiene scans (rule 32 is `repo-hygiene-scan`)
- This skill does not run code-review checklists (rule 28 is `closeout-evidence-lock`)
