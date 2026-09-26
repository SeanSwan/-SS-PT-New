# Astra — Test Plan and Traceability

Test IDs are stable. Every test names the requirement it serves, its level, and its command. **No test
in this table has been run** — no Astra code exists yet. The commands are the plan, not a result.

---

## 1. Test plan

### 1.1 Unit / component

| ID | Serves | Test | Expected observable result | Forbidden side effect |
|---|---|---|---|---|
| `T-U-01` | R2/AC2.1 | `directions(fixtureBrief, 3)` | returns 3 `Direction`, each with all 6 required fields | **any provider transport invoked** — asserted by a spy that fails the test |
| `T-U-02` | R2/AC2.2 | render a `tier:'prior'` direction | the string `PRIOR` appears in the card's visible text | the word `EVIDENCE` on the same card |
| `T-U-03` | R2/AC2.3 | derive swatches from fixed facets twice | byte-identical swatch output | any network fetch for image bytes |
| `T-U-04` | R1/AC1.2 | `explain(fixtureCompile)` | `lawChecks.length` equals the compiler's, passes **and** fails both present | dropping a failing check |
| `T-U-05` | R1/AC1.3 | mutate `BRAIN_VERSION` export, re-read the UI string | UI string changes | a hardcoded version surviving the mutation |
| `T-U-06` | R3/AC3.3 | set slot 4 via `personify()` | legal form produced | a raw `"[subject] by [artist]"` string passing |
| `T-U-07` | R5/AC5.1 | `capabilities()` | `synthesize`,`corroborate`,`adjudicate`,`emit-vault`,`log-receipt` = REFUSED; `attest`,`redact-provenance`,`log-spec` = RETIRED | any lane reported ACTIVE without a code source |
| `T-U-08` | R5/AC5.3 | capability declared `claimed` | rendered as not-verified | rendering `claimed` as if it were `verified` |
| `T-U-09` | R4/AC4.1 | mutate `tuning.json`, re-read | UI reflects the new value with no code change | a hardcoded default winning |
| `T-U-10` | R8/AC8.1 | `bind('0.0.0.0')` | refuses, non-zero exit | binding succeeds |

### 1.2 Integration / contract

| ID | Serves | Test | Expected observable result | Forbidden side effect |
|---|---|---|---|---|
| `T-I-01` | R3/AC3.1 | submit brief, stage overrides, re-read persisted `text` | byte-identical to what was typed | in-place mutation of `text` |
| `T-I-02` | R4/AC4.2 | stage → preview → commit | three distinct states observed in order | a commit occurring before a preview |
| `T-I-03` | R4/AC4.3 | concurrent read during a commit | reader sees old **or** new bytes, never a partial file | a torn read |
| `T-I-04` | R4/AC4.4 | commit then revert | restored file hash == pre-commit hash | losing the prior bytes |
| `T-I-05` | R4/AC4.5 | change `auto.S` | blast radius names the auto-corroboration gate | a commit with an empty note |
| `T-I-06` | R6/AC6.2 | record with `estimatedCents ≠ actualCents` | drift visible | averaging the two into one number |
| `T-I-07` | R1 | compile a fixture that fails a LAW check | `E_LAW_VIOLATION` with the offending slot named | any silent strip; any override affordance |
| `T-I-08` | R7/AC7.1 | MCP `brain.reject` without `confirm` | refused | the write occurring |
| `T-I-09` | R7/AC7.3 | MCP `brain.capabilities` vs the surface's board | identical output from one source | two independently-derived boards |
| `T-I-10` | R8/AC8.2 | mutation without the token | 401 | the mutation applying |

### 1.3 End-to-end

| ID | Serves | Test | Expected observable result |
|---|---|---|---|
| `T-E-01` | R1,R2,R3 | brief → directions → choose → compile → explain | the Think pane shows 12 slots, every lawCheck, and the pinned version |
| `T-E-02` | R4 | tune → preview → commit → revert | knob restored to its original value |
| `T-E-03` | R6 | compile → reject-all in one action | the ledger's rejected count increments by exactly 1 |
| `T-E-04` | R5 | open `/state` with the taste brain down | every lane still correct; only the taste row degrades |

### 1.4 Responsive / accessibility

| ID | Serves | Test | Expected observable result |
|---|---|---|---|
| `T-A-01` | §2.5 | 360 / 560 / 768 / 1024 / 1440 px | no horizontal overflow at any width |
| `T-A-02` | §2.5 | narrow viewport | tier badge and palette line still visible |
| `T-A-03` | §2.6 | keyboard-only traversal | every control reachable, focus ring visible, no trap |
| `T-A-04` | §2.6 | contrast audit | text meets the repo's contrast rules (the `audit-contrast.mjs` instrument in `packages/swan-forge`) |
| `T-A-05` | §2.6 | `prefers-reduced-motion` | no motion beyond the gate |

### 1.5 Permissions, malformed data, races, interruption

| ID | Serves | Test | Expected observable result |
|---|---|---|---|
| `T-P-01` | §6.2 | each actor against the authority matrix | no actor enables a REFUSED lane or spec mode |
| `T-P-02` | INV1 | scan Astra's write paths | **zero** writes to `taste/events/*.jsonl` or `taste/*.md` |
| `T-P-03` | INV2 | scan Astra's write paths | zero writes under `docs/ai-workflow/design-brain/` or to any token value |
| `T-M-01` | §2.6 | `tuning.json` truncated / invalid JSON | named error, no crash, no write |
| `T-M-02` | §2.6 | `tuning.json` containing an unknown key | key preserved on write, reported, not dropped |
| `T-M-03` | §2.6 | compile record missing `lawChecks` | rendered as partial with a banner, never as "0 checks passed" |
| `T-M-04` | §2.6 | duplicate `reject` for one compile | idempotent; count increments once |
| `T-M-05` | §2.6 | taste brain times out | tiers degrade to `prior` and the card says so |
| `T-M-06` | §2.6 | commit interrupted mid-write | file is old or new, never partial |
| `T-M-07` | §2.6 | CRLF vs LF in `tuning.json` | **byte-for-byte preservation of the untouched regions** — the representation-dependent-verifier class |

### 1.6 Performance budgets (measurable, with an owner)

| ID | Budget | Owner |
|---|---|---|
| `T-F-01` | `directions()` returns in < 300 ms with the taste brain up; < 1.5 s on timeout | builder |
| `T-F-02` | `/api/explain/:id` renders in < 200 ms | builder |
| `T-F-03` | tuning preview over 12 fixture pairs in < 2 s | builder |
| `T-F-04` | no Astra module exceeds the Rule 4 300-line budget without a declared exception | builder |

### 1.7 Commands

```bash
# unit + integration (A1 onward)
node --test scripts/astra/tests/*.test.mjs

# surface smoke (A3 onward) — the same shape the verify console uses
node scripts/astra/surface/smoke.mjs --port 7411

# MCP tool listing (A2)
node scripts/astra/mcp/server.mjs --list-tools

# accessibility + contrast
node packages/swan-forge/scripts/audit-contrast.mjs
```

---

## 2. Fixtures

| Fixture | Purpose | Notes |
|---|---|---|
| `fixtures/brief-hero.json` | a complete valid brief | the happy path |
| `fixtures/brief-video-no-init.json` | video compile without an init image | must raise `E_IMAGE_FIRST_REQUIRED` |
| `fixtures/caps-claimed.json` | `honorsNegativePrompt: 'claimed'` | must be treated as false |
| `fixtures/law-violation.json` | a brief that trips the kill-list | must raise `E_LAW_VIOLATION` with the slot |
| `fixtures/tuning-live.json` | a copy of the real `tuning.json` | never the live file |
| `fixtures/tuning-unknown-key.json` | an extra key | preserved on write |
| `fixtures/tuning-crlf.json` | CRLF line endings | byte-preservation check |
| `fixtures/pairs-12.jsonl` | 12 claim pairs for novelty preview | so preview is deterministic |

**Fixtures are isolated.** No test writes to `scripts/design-brain/config/tuning.json`, the variant
store, or the taste repo. Every write test uses a temp copy and asserts the original's hash is
unchanged.

---

## 3. Traceability

| Req | AC | Artifact / component | Test | Slice | Evidence / status |
|---|---|---|---|---|---|
| R1 | AC1.1 | `core/explain.mjs`, Think pane | `T-U-04`, `T-E-01` | A1, A3 | not run |
| R1 | AC1.2 | `core/explain.mjs` | `T-U-04` | A1 | not run |
| R1 | AC1.3 | `core/brain.mjs` version read | `T-U-05` | A1 | not run |
| R2 | AC2.1 | `core/directions.mjs` | `T-U-01` | A1 | not run |
| R2 | AC2.2 | Choose pane | `T-U-02`, `T-A-02` | A3 | not run |
| R2 | AC2.3 | swatch derivation | `T-U-03` | A3 | not run |
| R2 | AC2.4 | preview gate | `T-I-07` (no-override half) | A3 | not run |
| R3 | AC3.1 | `core/variants.mjs` brief write | `T-I-01` | A1 | not run |
| R3 | AC3.2 | override layer | `T-I-01` | A1, A3 | not run |
| R3 | AC3.3 | `personify()` gate | `T-U-06` | A1 | not run |
| R4 | AC4.1 | `core/tuning.mjs` | `T-U-09` | A4 | not run |
| R4 | AC4.2 | stage/preview/commit | `T-I-02` | A4 | not run |
| R4 | AC4.3 | atomic write | `T-I-03`, `T-M-06` | A4 | not run |
| R4 | AC4.4 | revert | `T-I-04` | A4 | not run |
| R4 | AC4.5 | blast radius | `T-I-05` | A4 | not run |
| R4 | AC4.6 | control registry | `T-P-01` | A3 | not run |
| R5 | AC5.1 | `core/capabilities.mjs` | `T-U-07` | A5 | **depends on A0** |
| R5 | AC5.2 | spec-mode read | `T-U-07` | A5 | not run |
| R5 | AC5.3 | claimed→false | `T-U-08` | A5 | not run |
| R5 | AC5.4 | no enabling control | `T-P-01` | A5 | not run |
| R6 | AC6.1 | `core/ledger.mjs` | `T-E-03` | A6 | not run |
| R6 | AC6.2 | cost drift | `T-I-06` | A6 | not run |
| R6 | AC6.3 | trend view | `T-E-03` | A6 | not run |
| R7 | AC7.1 | `mcp/tools.mjs` | `T-I-08` | A2 | not run |
| R7 | AC7.2 | MCP surface audit | `T-P-02` | A2 | not run |
| R7 | AC7.3 | one board, two consumers | `T-I-09` | A2 | not run |
| R8 | AC8.1 | `core/bind.mjs` | `T-U-10` | A1 | not run |
| R8 | AC8.2 | mutation token | `T-I-10` | A1 | not run |
| R8 | AC8.3 | no secret in surface | `T-P-02` | A1 | not run |
| INV1 | — | write-path scan | `T-P-02` | A1 | not run |
| INV2 | — | write-path scan | `T-P-03` | A1 | not run |
| INV3 | — | LAW gate | `T-I-07` | A1 | not run |
| INV4 | — | spend gate | `T-U-01`, `T-I-07` | A1, A3 | not run |
| INV5 | — | version read | `T-U-05` | A1 | not run |
| INV6 | — | immutability | `T-I-01` | A1 | not run |
| INV7 | — | fail-closed | `T-I-07` | A1 | not run |
| INV8 | — | no fake metrics | `T-U-07` (every lane needs a source) | A5 | not run |
| INV9 | — | loopback | `T-U-10` | A1 | not run |
| INV10 | — | lane isolation | `T-P-02`, `T-P-03` | A1 | not run |

### 3.1 Uncovered requirements

**None.** Every R and every INV has at least one test ID and at least one slice.

### 3.2 Boundaries covered only by mocks — flagged

- **`T-M-05`** (taste-brain timeout) is exercised with a stub, not the real private repo. The real
  integration is **unverified** and is named in `05` §4 as a residual.
- **`T-I-03`** (concurrent read during commit) is simulated. A true concurrent-writer test needs a
  second process; scheduled in A4 but **not yet designed**.
- **Provider capability probes** (`seedIsDeterministic: 'verified'`) are **not** tested by Astra —
  they require real generations and spend. Astra only *renders* the tri-state. The promotion path is
  out of scope.
