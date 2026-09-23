# Mega Blueprints readiness receipt

Use one canonical receipt per build packet. Update it when sources, requirements
or test results change. Keep real evidence review separate from this structural
check. The gate is not a universal write interceptor and does not attest claims.

Run `node <non-vibe-coding>/scripts/check-readiness.mjs receipt.json EVIDENCE_ROOT`.
Exit 1 means gaps must be resolved. Exit 0 means references/structure passed;
read the actual evidence and follow the project's review gate next.

The JSON object has these fields:

- `schemaVersion`: `1`.
- `phase`: `plan` or `implementation`.
- `ui`: boolean; when true, wireframes cannot be waived.
- `blockers`: array, empty to pass.
- `nextSlice`: next authorized slice, or a concrete completed-work disposition.
- `sections`: every category below, each COMPLETE with evidence or permitted N/A.
- `requirements`: nonempty list of `{id, acceptance, tests: [test IDs]}`.
- `tests`: nonempty list of `{id, requirements: [requirement IDs], command,
  status, reason?, evidence: [references]}`. Manual procedures may use `command`
  for the exact repeatable instructions.

Core sections (cannot be waived): `baseline`, `requirements`, `blueprint`,
`flowchart`, `contracts`, `tests`, `traceability`, `slices`, `review`,
`preservation`. A new repo baseline can record its observed empty test inventory.

Conditional sections (each still needs a disposition): `wireframes`, `state`,
`sequence`, `erd`, `permissions`, `privacy`, `operations`.

Complete entry: `{"status":"COMPLETE","evidence":[{"path":"plan.md",
"sha256":"64 lowercase hexadecimal characters from the actual file"}]}`.
Paths are relative to EVIDENCE_ROOT, must remain inside it after symlink
resolution, and must resolve to nonempty files of at most 32 MiB. Multiple
sections can cite the same coherent document. Do not create duplicate files
merely to fill this schema. Preserve the actual evidence before hashing it.

N/A entry: `{"status":"N/A","reason":"Specific applicability explanation"}`.
This is allowed only for conditional sections, with UI wireframes required.

Test status: `PASS`, `EXPECTED RED`, `NOT RUN`, `BLOCKED`, or `FAIL`. EXPECTED RED
needs a reason and real output proving the intended behavioral failure.
NOT RUN requires a reason and is permitted only in a plan for future tests.
BLOCKED/FAIL prevent readiness; resolve them or narrow the authorized slice and
explicitly retain the excluded requirement in the larger packet. Implementation
verification requires PASS for every test in its declared scope.

The validator checks ID uniqueness, reciprocal requirement/test links, required
categories, evidence presence/hash/confinement and phase status. It does not
understand the application, validate Mermaid syntax, execute tests, or establish
whether prose/expected outputs are correct. Inspect those boundaries directly.
