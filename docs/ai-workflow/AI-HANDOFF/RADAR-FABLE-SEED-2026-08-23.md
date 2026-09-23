# Seed for the Final Decider — six seats have reported. Ratify, correct, or overrule.

You are arbitrating, not reviewing fresh. The architecture question and constraints are
in the accompanying document. Six independent seats have answered. Below is what each
concluded. **No seat approved the original plan.**

## The tally

| Seat | Verdict | Position taken |
|---|---|---|
| GLM 5.3 | REVISE | **Invert residency** — agent runtime to Machine B; A becomes a pure inference appliance |
| Ox Alpha | REVISE | **Commit to Position 1.** Position 2's optional mailbox is "a split-brain trap dressed as an option" |
| HY3 | REVISE | **Corrected Position 1.** Deciding factor is not "where is the GPU" but "where must the single poller and durable scheduler live" — both must be on B |
| Sol Pro | REVISE | **Third design:** B owns mailbox, ledger, scheduler and outbound delivery; **A pulls leased inference jobs** |
| DeepSeek Pro | REVISE | A simpler third architecture avoiding both positions' risks |
| Grok 4.6 | REVISE | **Dissent — Position 2.** Delete the control plane; B is an independent worker with a job ledger; keep agent, coding CLIs and browser harness on A |
| Qwen 3.8 (local) | REJECT | Split-brain; wants the agent moved to B outright and the no-inference constraint relaxed |

## Convergence the seats reached independently

1. Brain-dependent scheduled work has no execution guarantee under the original plan —
   the availability problem the always-on box was bought to solve survives it.
2. Fail-closed *inference* was the requirement; fail-closed *interface* is an unstated
   extra nobody chose. An "acknowledged, queued, brain offline" reply is not a cloud
   fallback.
3. A durable job ledger with idempotency keys and replay-on-brain-return is mandatory.
4. A no-privilege service account cannot own systemd units — scheduler ownership must be
   stated explicitly.
5. Sending is not polling: the one-consumer rule bans a second poller, not a second
   sender.

## Two corrections that changed the picture

- **HY3:** the "inbound NAT" cost attributed to Position 1 is **phantom**. Machine A is
  the client and joins the mesh VPN outbound when powered; B never needs to reach into
  A's NAT. This removes the principal objection to inverting.
- **Sol:** having **A pull leased inference jobs** rather than B pushing work to A
  appears to dissolve Grok's central security objection, since B is then a job *source*
  rather than a command *target*. Grok's "delete the control plane" and Sol's "A pulls"
  may be the same insight from opposite directions.

## Known-weak seat, for calibration

Qwen asserted 16GB is sufficient for a 27B quantized model on a GPU-less box. The model
file alone exceeds available RAM and CPU inference at that size is minutes per response.
It also proposed retrying a wake mechanism the packet stated was exhaustively disproven.
Discount accordingly.

## What is being asked of you

1. **Ratify, correct, or overrule the emerging consensus** (corrected Position 1 with
   Sol's pull-based inference). If the majority is wrong, say so plainly and say why.
2. **Is Grok's dissent fully dissolved by the pull model, or does a real objection
   survive it?** Grok is the only seat defending the operator's original placement.
3. **Adjudicate the contested sub-question:** should the coding CLIs and browser harness
   live on the always-on box (operator's stated wish, and they act on its services) or on
   the GPU machine (more RAM, has a GUI for one-time OAuth)? One reviewer called the
   headless OAuth problem disqualifying; another called it solvable by port forwarding.
4. **One canonical copy of the retrieval knowledge base, or dual-homed with sync?**
5. **What is the smallest first slice** that captures most of the value without
   committing to a full migration? The operator has limited evenings and a working
   system he depends on daily.

Be decisive. Where you disagree with a seat, name it.
