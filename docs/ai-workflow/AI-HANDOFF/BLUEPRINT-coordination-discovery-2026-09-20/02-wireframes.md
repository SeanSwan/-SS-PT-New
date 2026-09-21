**Desktop and 375px mobile wireframes: N/A — this work introduces no graphical screens, responsive layouts, buttons, focus order, or palette tokens.**

Do not create an application dashboard to satisfy this category.

The applicable interface is plain terminal output. It must remain understandable without color or emoji.

**Successful orientation summary — exact fixed copy**

```text
[lane] status=summary; edit-clearance=unverified
<delegate digest, preserved without modification>
[lane] review queue: <absolute queue path>
[lane] A summary does not clear files for editing.
```

Follow this with labelled, shell-quoted commands for `digest`, `whoami`, and `claim`, using the root-pinned entry point.

**Degraded orientation — exact fixed copy**

```text
[lane] status=degraded; reason=<reason code>; edit-clearance=unverified
[lane] review queue: <absolute queue path>
[lane] Resolve discovery before editing shared files.
```

The same recovery commands follow. A failure must not hide the review queue.

**Reason codes**

| State | Reason |
|---|---|
| Helper absent | `MISSING_HELPER` |
| Empty/whitespace output | `EMPTY_OUTPUT` |
| Missing markers or known failure text | `INVALID_SUMMARY` |
| Timeout | `TIMEOUT` |
| Output exceeds capture limit | `OUTPUT_LIMIT` |
| Other execution error or nonzero exit | `CHILD_FAILURE` |

**Other states**

- Loading: synchronous invocation; no progress animation or claim that orientation has completed.
- Zero peer locks: preserve the helper’s summary; still require complete discovery.
- Partial/malformed discovery: `complete:false`; defer editing.
- Missing review queue: report the missing file; do not create it during orientation.
- Cancel/interruption: no automatic retry and no completion claim.
- Recovery: rerun a root-pinned read command after correcting the cause.
- Claim without exact files: never treat it as file-edit clearance.

At narrow terminal widths, ordinary wrapping is acceptable. Paths and commands must not be truncated to achieve a visual width.
