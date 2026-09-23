> Extracted from `09-tests.md` on 2026-09-22 (Astra R2-A1-05 / D5) so that both
> files satisfy Rule 4's 300-line cap. NOTE: the source carried only the opening
> `<!-- BEGIN FILE -->` fence and no closing one; the block ran to EOF, so this file
> is the whole remainder. Verified lossless against the pre-split original.

#### 09a-adapter-tests.md

**Final-boundary tests**

| Proposed file | Named case | Required observation |
|---|---|---|
| `tests/village/subscription-boundary.test.mjs` | `T-SUB-01 rejects bare prompts before processRunner` | A direct legacy-shaped call produces zero process invocations. |
| Same | `T-SUB-02 guards every inventoried subscription caller` | Actual consult and Council request constructors reach the guarded boundary. |
| Same | `T-SUB-03 compares final stdin bytes with approved digest` | Capture actual child stdin chunks; compare their concatenated bytes to the approved payload. |
| Same | `T-SUB-04 rejects unbounded ambient context capability` | A route without context-isolation proof cannot dispatch. |
| Same | `T-SUB-05 confines child environment and arguments` | Unexpected command arguments, context roots and environment additions are rejected. |
| Same | `T-BYTE-01 appended remit canary never reaches child stdin` | A canary added after initial preparation causes zero child writes. |
| Same | `T-BYTE-02 changed prior review text invalidates approval` | A debate payload mutation is blocked at the last writer. |
| `tests/village/http-media-boundary.test.mjs` | `T-BYTE-03 final JSON body equals approved UTF8 bytes` | Capture `fetchImpl` input, including provider wrappers. |
| Same | `T-BYTE-04 final redaction change blocks instead of silently sending` | A redactor-induced change produces zero fetches and requires reapproval. |
| Same | `T-HTTP-01 rejects redirect and destination changes` | No redirected or altered destination receives content. |
| Same | `T-HTTP-02 rejects unsupported nonstring bodies` | Preserve the supplied `fetchForEgress()` refusal behavior. |
| Same | `T-HTTP-03 admits credentials only to bound authentication field` | Credential canaries never appear in body, query, logs or wrong-destination requests. |
| Same | `T-MEDIA-01 scans all typed text fields` | Canaries in prompt, caption, URL and metadata paths are caught. |
| Same | `T-MEDIA-02 preserves approved media byte digest` | Final encoded media decodes to the exact approved bytes. |
| Same | `T-MEDIA-03 rejects unknown media fields and types` | No blanket image-body exemption. |
| Same | `T-MEDIA-04 covers all six reported locations` | Each concrete location has its own caller-level case after S0 mapping. |
| Same | `T-CANARY-01 positive control throws as designed` | Test the existing canary’s throwing contract, not a fabricated boolean return. |
| Same | `T-CANARY-02 recovered D1 reproduction fails before repair and passes after` | The original defect is closed at its real boundary. |

**Capability integration evidence**

A fake process runner cannot prove CLI context isolation. A separate sandbox/integration probe must:

1. Place synthetic canaries in locations the child must not read.
2. Exercise actual CLI configuration and permitted tool behavior.
3. Verify isolation through enforceable access controls and attempted access.
4. Record configuration and artifacts without credentials.

A provider response that merely omits the canary is insufficient proof: the content may have been transmitted without being echoed.

**Exact planned adapter-only command**

```bash
node --test tests/village/subscription-boundary.test.mjs tests/village/http-media-boundary.test.mjs
```

**Current result:** NOT IMPLEMENTED in this consult; NOT RUN.

