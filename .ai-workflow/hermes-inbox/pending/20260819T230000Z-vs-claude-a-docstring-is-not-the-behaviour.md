# A docstring claimed FAIL-CLOSED, and I built a preflight on top of the claim

**Surface:** Creator video generation — operator preflight · **Agent:** vs-claude (Opus 5)
**On main:** `ab52a55a2` · baseline gate exit 0 · lane claimed and released

## The near-miss

I wrote `preflight-generate.mjs` so the operator learns which layer is unconfigured BEFORE
spending GPU time. My first version called `resolveConfig()` and reported:

```
  OK    workflow + node bindings   all bindings resolved
```

...against a **completely empty environment**. Nothing was configured. It would have
green-lit an unconfigured machine, sent Sean to click Generate, and produced an opaque
failure — which is the exact outcome the tool exists to prevent. **A preflight that passes
a broken config is worse than no preflight: it converts a clear "not configured" error into
a mystery.**

Why I got it wrong: `resolveConfig` carries a docstring saying

> *"FAIL-CLOSED on every field: an unset binding is an error at config time rather than a
> silently un-injected prompt that renders someone else's hardcoded test string at full GPU
> cost."*

It does not throw. It returns `{ templatePath: '', bindings: { prompt: '', ... } }`. The
real gate lives elsewhere — `generate()` asserts `cfg.configured` — so the SYSTEM was always
safe. Only my checker was wrong, because I read the claim instead of the code.

**Rule: a docstring asserting a safety property is a claim, not the property. If a function
says "fail-closed", call it with empty input and watch. This one lied for free, and the only
cost of checking was one line.**

## The second, larger miss

The module **already exported `verify()`** — doing precisely what I was re-deriving, only
correctly, and returning structured per-check results with fixes. I wrote a worse
reimplementation of a function sitting ten lines below the one I read.

Fix was to DELETE my checks and delegate. `verify()`'s verdict is by definition the one the
handler acts on at render time, so a preflight built on anything else can disagree with
reality — and a preflight that disagrees with reality is the failure it is meant to catch.

**Rule: before writing a checker for a module, read that module's exports. A contract
function written by the module's author outranks any check inferred from the outside,
because it cannot drift from the behaviour it describes.**

## What the corrected tool actually found

Genuinely useful, and it corrected an assumption I had carried for days:

```
  MISS  agent credential      no token in env or .swan-agent.env
  MISS  workflow template     SWAN_COMFYUI_WORKFLOW is unset
  MISS  prompt node binding   SWAN_COMFYUI_NODE_PROMPT is unset
  OK    comfyui reachable     http://127.0.0.1:8188 responded 200
```

**ComfyUI was already running.** Every handoff I wrote said the ComfyUI setup was the
unbuilt blocker; one probe showed it up and serving. I had propagated an assumption across
three documents without ever testing it.

**Rule: an unverified blocker in a handoff propagates as fact. Probe it before writing it
down — the check costs seconds and the wrong version costs whoever reads it next.**

## Mistakes I made

- **Built a checker on a docstring's claim** rather than the function's behaviour, and
  nearly shipped a preflight that inverted its own purpose.
- **Reimplemented an existing contract function**, worse, without reading the module's
  export list first.
- **Carried "ComfyUI is not set up" across three handoff documents** without probing it once.

## Open

- The remaining gap is real and narrow: a ComfyUI **workflow exported in API format**, plus
  the node-id bindings. No runbook exists for that — it is the last thing between a queued
  job and a rendered file.
- Server-side licence env cannot be checked from here (`/video-providers` is admin-gated).
  The observable test is the model dropdown in the UI, which is why that is what Sean was
  asked to look at rather than a claim from me.
