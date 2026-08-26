---
decision: "Make the Swan Taste Brain explain itself and arm itself: auto-capture the ComfyUI graph with no CLI step, put judging where it can be started in one click, label every control, and teach the page to explain what it is."
status: open
board: SWA-186
date: 2026-08-26
privacy: IDs and roles only. No names, no keys, no PII.
---

# Swan Taste Brain — make it explain itself and arm itself

## What happened (the trigger)

Sean clicked **Make** and got:

> `not queued: no captured workflow yet — run your workflow once in ComfyUI, then: node prompter/capture-workflow.mjs`

His words:

> "We need to make this so it's automatic. I should be able to just click the Make. It should kinda do
> this in the background and make sure it's done versus trying to have me do it."

And, on the same screen:

> "I need the option to be able to [start] the tasting — they let me see all the pictures, and then I
> got to choose. But that should be right there in the options at the top. I should easily be able to
> see that. And from there I need to be able to just click it to start it up, and that should actually
> work as you continuously boost the shot's taste while I'm loading. And then on top of that, the
> different text bars need to be labeled for what they do. The page [needs] to explain itself a little
> bit more."

## Measured ground truth (probed on this machine, now)

| Probe | Result |
|---|---|
| `GET /prompt` (queue) | `{"exec_info":{"queue_remaining":0}}` — **ComfyUI is up** |
| `GET /history` | `{}` — **empty**; nothing has been run this session |
| `GET /userdata?dir=workflows` | **two saved workflows**: `00 SWAN — H3 local (start here).json`, `01 SWAN — H3 local + first frame.json` |
| `GET /object_info` | **200** — the node-definition catalogue is available |

The existing design note says capture "cannot be done for you ahead of time" because ComfyUI keeps
history in memory. That is true of **history** — and it is exactly why the error appears on a fresh
ComfyUI. But it was never the whole picture: **the saved workflows are on disk and reachable**, and
`/object_info` is what a UI→API conversion needs. So "you must run it once first" is a property of the
capture *strategy*, not of ComfyUI.

## The four changes

### 1. Make arms itself — no CLI step, ever

Today `/api/make` refuses with a shell command. Proposed, in order, all server-side:

1. **Template present** → queue, as now.
2. **No template, history has a run** → capture it silently, then queue. Zero clicks.
3. **No template, history empty** → **hold the prompt as a pending intent, start a background watcher,
   and say so in the page**: *"ComfyUI hasn't run anything yet this session. Open `00 SWAN — H3 local
   (start here)` and hit Run once — I'll capture it and queue this prompt automatically."* The moment
   the watcher sees a run, it captures **and queues the held prompt**. Sean never returns to a
   terminal, and the message names the workflow he actually has rather than a command.
4. **Optional, gated:** offer to build the template from a saved workflow by converting UI→API using
   `/object_info`. **Never silently** — see the risk below.

### 2. Judging is one click from the top

Judging already exists as a tab. Sean's ask is that starting a tasting round is visible in the top
options and takes one click. Proposed: a persistent **"Taste pictures"** control in the memory bar
that starts a grid immediately, and — because a Make batch takes real time on a 5090 — the Make tab
offers judging **while a render is queued**, so the wait is spent sharpening the memory that will
steer the next batch. That is the "continuously boosting the taste while I'm loading" he described.

### 3. Every control is labelled

The Make row is currently five bare controls: `Video ▾`, `Taste-steered ▾`, `5`, `16:9 ▾`, a checkbox.
Each gets a visible label and a one-line title: medium, how the prompt is steered, how many, aspect
ratio, and cinematic-only.

### 4. The page explains itself

A short, permanent explainer at the top of each tab — what this tab is for and what the next action
is — plus honest empty states. The tool currently assumes the reader already knows the loop.

## The risk that needs the panel

**UI→API conversion is the dangerous part.** A wrong conversion means Make queues a graph that is not
Sean's, while telling him it is. This repo already has a law about exactly that failure — two earlier
proofs pointed at the real `comfy-workflow.local.json` and the app then told him a test fixture was his
captured graph. The conversion has to handle reroutes, muted/bypassed nodes, primitive nodes,
widget-to-input conversions and link ordering, and a subtle error is silent.

Questions for the panel:

1. Should step 4 (UI→API conversion) exist at all, or is auto-capture-on-first-run (steps 2–3) the
   right ceiling? What would make a converted graph **provably** Sean's before it is ever queued?
2. Is holding a pending intent and auto-queueing it later safe? What happens if the memory changes,
   the server restarts, or two prompts are held? (Note: a stale-response race between memories was a
   real defect fixed earlier today.)
3. A server-side background watcher polls ComfyUI. What is the failure mode when ComfyUI restarts,
   the drive unmounts, or the watcher outlives the page?
4. Does starting a judging grid from the Make tab risk recording a judgement against the wrong memory?
   The memory bar is shared, and that exact class of bug was fixed earlier today.
5. Anything in 2–4 that would break the corpus containment laws hardened across rounds 3–7 — in
   particular, judging surfaced from a new place, and any new text the page prints.

## Constraints that do not move

- The corpus is Sean's: never a partner memory, a client memory, a bundle, or a printed brief.
- One memory = `profile × project`; a witness writes only its own memory.
- Loopback only, Host-gated, unauthenticated by design. The graph is never POSTed off-machine.
- Tests never write the real `comfy-workflow.local.json` (`SWAN_COMFY_WORKFLOW` isolates every proof).
- 499 checks across 10 suites must stay green, and anything new needs a check that fails without it.
