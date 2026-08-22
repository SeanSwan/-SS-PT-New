# A default that does not exist costs the operator twenty minutes, every time

**Surface:** ComfyUI operator setup · **Agent:** vs-claude (Opus 5)
**Result:** two laid-out workflows installed at `C:\ComfyUI\user\default\workflows\`, both structurally validated

## What happened

Sean spent 15-20 minutes hunting the ComfyUI node menu for the right MiniMax node, and
picked a `partner/` one that bills credits per run. His words: *"Why is it not opening up by
default on the MiniMax H3 for my 5090? That should just be default."*

He was right, and the omission was mine. I had spent days building graphs that render
correctly — and never saved one where the operator would actually find it. His workflows
directory was **empty**, so ComfyUI opened on a blank canvas every single time, and the only
path forward was the node menu, where the paid node sits one row from the free one with an
almost identical name.

**Rule: shipping a thing that works is not the same as shipping a thing that is reachable.
If the operator's entry point is a blank screen, every session begins by re-deriving what
you already solved — and the cost recurs, per session, forever.**

## The format trap underneath it

The graphs this repo renders with are **API format** (`{id: {class_type, inputs}}`), which
the `/prompt` endpoint accepts and the UI cannot meaningfully open. The UI needs a different
structure entirely: node array with positions, slot definitions, an explicit link table, and
**positional `widgets_values`**.

`widgets_values` is matched by INDEX against non-link inputs in declaration order. Get the
order wrong and the graph loads, runs, and renders at the wrong resolution — or with the
seed sitting in the steps field. No error.

**The specific trap:** ComfyUI's `seed` input declares `control_after_generate`, which
inserts a SECOND, UI-only widget right after it. Omit it and every later value shifts by
one. Caught by reading the input spec rather than typing the order from memory.

**Rule: when a format is positional, derive the positions from the authority that defines
them — never from what you remember the node looking like. The failure mode is a graph that
works well enough to be believed.**

## The dependency I nearly shipped

The builder read node signatures from the live server, which meant **ComfyUI had to be
running in order to build the workflow that fixes ComfyUI**. It broke exactly that way
mid-task when the app went down. Now it falls back to a committed signature cache and PRINTS
which source it used, because a cache that predates a node update reorders widgets and
reintroduces the silent bug above.

**Rule: a tool that repairs an environment must not require that environment to be healthy.
And when it degrades to a cached authority, it must say so out loud — a silent fallback to
stale data is worse than the failure it replaced.**

## Mistakes I made

- **Built the capability and never built the entry point.** Days of correct renders, zero
  saved workflows. The operator's experience was never on my checklist.
- **Let a paid node sit one menu row from the free one** without a default, a label, or a
  note. The cost of that omission was real credits and real time.
- **Wrote a builder that depended on the thing it was fixing** — and only found out because
  the app happened to close mid-task.
- **Two more escape-mangling failures** patching JS through Python string replacement, the
  fourth and fifth this workstream. Switched to the edit tool both times, which errors on a
  missed match instead of writing broken output.

## Open

- **ComfyUI was DOWN at close** (`ECONNREFUSED 127.0.0.1:8188`) — not caused by this work,
  but the second workflow was built from cache, not live signatures. Worth one rebuild with
  the app up if any custom node changed.
- **Auto-open is behavioural, not configured.** ComfyUI reopens the last-used workflow;
  there is no setting for a fixed default in this install (4 settings total, none relevant).
  Naming the file `00 …` sorts it first. Sean opens it once, then it sticks.
- **Attribution still unwired for direct-ComfyUI renders.** The registry enforces the
  MiniMax H3 credit string; renders made straight in ComfyUI bypass that path entirely.
