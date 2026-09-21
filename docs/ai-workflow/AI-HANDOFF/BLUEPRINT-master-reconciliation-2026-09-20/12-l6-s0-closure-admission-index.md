# L6 S0 closure — admission index and reconciliation against the M0 preservation evidence

**Slice under admission:** L6 `S0 — SALVAGE` (`BLUEPRINT-swan-brain-console-v3-merge-2026-09-18/05-slices.md:16`)
**Build-queue position:** row 4 of `04-build-order.md` — *"L6 S0 closure only"*
**Master slice:** M2 (`05-slices.md:20`)
**Written:** 2026-09-21, against HEAD `df4329fa5`
**Verdict:** **BLOCKED — one acceptance criterion cannot be satisfied as written, and the
source-of-record is a decision the builder may not make.** Details in §4.

> Per `00-README.md:20`: *"A conflict is recorded and blocks the affected slice. The builder may not
> silently choose whichever document permits advancement."* This document records the conflict. It
> does not resolve it.

---

## 1. Exact source binding

S0 declares its source at `05-slices.md:21` as `tmp/worktrees/brain-console-20260913/`. M0 preserved
**two** candidate trees, and they **diverge**. Both are measured here.

| Candidate | Path | Registration | HEAD | fs-scope files | docs-scope files | Total |
|---|---|---|---|---|---|---|
| **Declared source** | `tmp/worktrees/brain-console-20260913` | **none — orphaned** | **git link DEAD** | **83** | **4** | **87** |
| **Salvage destination** | `tmp/worktrees/brain-console-salvage-20260918` | registered | `53f93854b3148b24c0dc2d2b6107b8e431237c87` | **180** | **6** | **186** |

- The declared source's git link is dead — reproduced, not inferred:
  `git rev-parse HEAD` → `fatal: not a git repository: (NULL)`. **This is the hazard S0 exists to fix.**
- The destination **is** a registered worktree, so S0's fix (step 2) has materially landed:
  `git worktree list` → `…/brain-console-salvage-20260918  53f93854b [swan-brain-console-v3-salvage-20260918]`
- `fs-scope` = the six filesystem paths in S0's scope block; `docs-scope` = the two `*.md` globs.

**Measured divergence, per M0 candidate** (`evidence/r0001/inventory-S-L6-*.json`, 212 files total):

| Candidate | Files |
|---|---|
| `S-L6-ORPHANED-console` | 17 |
| `S-L6-ORPHANED-three-worlds` | 62 |
| `S-L6-REGISTERED-console` | 65 |
| `S-L6-REGISTERED-qa-baseline` | 1 |
| `S-L6-REGISTERED-three-worlds` | 67 |
| **Total** | **212** |

17 + 62 + 65 + 1 + 67 = 212. The arithmetic reconciles.

---

## 2. Authority and dependency boundaries

**Applicable authority** (registry `package-registry.json`, lane `L6`):

| Precedence | Document | Scope |
|---|---|---|
| 1 | `…/MEGA-BLUEPRINT.md` | internal decision authority for this lane |
| 2 | `…/01-architecture.md` | lane architecture |
| 3 | `…/05-slices.md` | lane build plan and acceptance criteria |

**Rejected, must not become active authority through an alias:**
`docs/ai-workflow/AI-HANDOFF/SWAN-BRAIN-CONSOLE-BLUEPRINT-2026-08-26.md` — `status: REJECTED`,
`supersededBy: …/MEGA-BLUEPRINT.md`. Its *patterns* (tab/source/seat registries) are reusable with
attribution; it is not architecture for this lane.

**Final authority for admission:** L6's own review chain (`07-checkpoints.md:53-62`) terminates at
**FABLE = FINAL DECIDER + COMMIT GATE**. Codex's hostile verdict is *advisory to Fable, never the
gate itself*. Fable is **metered** — `07-checkpoints.md:65` requires asking the operator before
spending on it. **S0's checkpoint log entry is `pending` (`07-checkpoints.md:87`).**

**Dependency boundaries:** S0 is blocking and self-contained — *"nothing else starts until this
passes"*. S0 declares **no source edits**; it is a move-only slice. S0b (manifest port) follows S0
and is explicitly **out of scope here**.

---

## 3. Executable acceptance index (A1–A8)

Format per MR-06. **Observed** means measured this session; **NOT RUN** means exactly that.

| # | Criterion | Exact command | Expected as written | Observed | Status |
|---|---|---|---|---|---|
| A1 | Source manifest exists, non-empty | `wc -l /tmp/S0-BEFORE.sha256` | **`77`** *(or the recorded count)* | **83** (fs scopes) / **87** (with docs) on the declared source | **✗ MISMATCH** — see §4.1 |
| A2 | Destination is a **registered** worktree | `git worktree list` | new path listed | `…/brain-console-salvage-20260918  53f93854b [swan-brain-console-v3-salvage-20260918]` | **✓ PASS** |
| A3 | Every file byte-identical | `diff /tmp/S0-BEFORE.sha256 /tmp/S0-AFTER.sha256` | empty, exit 0 | manifests **not re-derived** this session. M0 proves 5/5 *preserved* copies agree | **⚠ PARTIAL** |
| A4 | git can read the destination | `git status --short` (in dest) | runs; not "not a git repository" | `git rev-parse HEAD` resolves to `53f93854b` | **✓ PASS** (proxy) |
| A5 | Scopes untracked but visible | `git status --short \| grep -c three-worlds` | `> 0` | not run | **NOT RUN** |
| A6 | Engine guard still passes | `node --test scripts/swan-brain-console/engine-contract.test.mjs` | `# pass 12 / # fail 0` | test file **exists** in both candidates; **not executed** | **NOT RUN** |
| A7 | Fleet + runtime suites pass | `node ./node_modules/vitest/vitest.mjs run src/pages/HomePage/three-worlds/__tests__/` (from `frontend/`) | `Tests 66 passed` | 4 test files in REGISTERED, **2** in ORPHANED; **not executed** | **NOT RUN** |
| A8 | No `git add -A` used | inspect staged set | explicit paths only | not run | **NOT RUN** |

**A6/A7 test-file availability** (the slice's own note: *"A6 and A7 are the ones that matter"*):

- A6 → `engine-contract.test.mjs` present in `S-L6-REGISTERED-console/` **and** `S-L6-ORPHANED-console/`.
- A7 → `three-worlds/__tests__/`: REGISTERED holds `capProbe`, `fleet`, `runtime`, `scenes`
  (4 files); ORPHANED holds `fleet`, `runtime` (**2** files). Test *count* ≠ file count, so A7's
  `66` is not contradicted by 4 files — but the **file-set divergence means A7's expected result
  depends on which tree is the source.**

---

## 4. The blocker, stated plainly

### 4.1 A1's expected value matches neither tree

`05-slices.md:88` expects `77`. The declared source measures **83** filesystem-scope files
(**87** with the docs globs). The destination measures **180** (186). **No reading of the slice
yields 77.**

The criterion carries an escape hatch — *"or the recorded count"* — but **no recorded count of 77
was found**, and the count is now tree-dependent. A1 cannot be marked PASS without either
(a) re-basing the expected value to a measured number, or (b) producing the original
`/tmp/S0-BEFORE.sha256` that yielded 77. Neither exists in the current evidence.

### 4.2 The source-of-record is ambiguous, and the ambiguity is load-bearing

The declared source is the **orphaned** tree. The registered salvage worktree has grown to more than
double it. M0 preserved **both** — deliberately, because A1-02/A2-01 established that treating one
tree as proof of the other strands a unique version.

So S0's A3 (*"every file arrived byte-identical"*) is well-defined **only relative to a chosen
source**. Choosing the orphaned tree proves one thing; choosing the registered tree proves another.
**Which tree is S0's source of record is an operator decision**, and `00-README.md:20` forbids the
builder from making it silently.

This is an M2 **STOP** condition in its own terms: *"unverified caller, schema, API, authority,
**source identity** or acceptance boundary."* Source identity is exactly what is unresolved.

### 4.3 What is NOT blocked

A2 is **verified PASS**. A4 is verified by proxy. The salvage worktree exists, is registered, and
carries every scope path. The slice's *structural* fix has landed; what is missing is the
**evidence closure** on a **chosen** source.

---

## 5. Freeze statement

Nothing was modified to produce this document. No product code changed. No lane package was edited.
No review was filed. **S0 remains `pending`** and this document does not change that.

**Next authorized action is an operator decision, not a builder action:**

> **Which tree is L6 S0's source of record — the orphaned `brain-console-20260913`, the registered
> `brain-console-salvage-20260918`, or both as separately-admitted revisions?**

Until that is answered, A1 cannot be re-based, A3 cannot be re-derived, and A6/A7 cannot be run
against a bound revision. Per the bounded-queue exception (`04-build-order.md:30-40`) a blocked lane
does **not** automatically stop an independent later lane — but advancing requires recording the
blocked lane, confirming no unmet hard dependency, and confirming no shared-file or contract
conflict. That is an integration-owner decision and is **not taken here**.
