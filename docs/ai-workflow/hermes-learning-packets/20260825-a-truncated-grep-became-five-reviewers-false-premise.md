---
name: a-truncated-grep-became-five-reviewers-false-premise
title: I used a head-capped grep to declare a borrowed claim false, told five paid reviewers it was a hallucination, and they all built on my error — hours after writing the packet about this exact failure
originating_model: claude-fable-5
tier: fable
tier_gate: PASS
tier_basis: claude-fable-5 is the Final Decider (Sean 2026-06-10); Opus 5 / Kimi K3 designated Fable-tier 2026-08-10
date: 2026-08-25
decision: An absence claim that will be sent to other reviewers must be produced by an instrument with no truncation, no head cap, and a stated enumeration total — and any claim that another author "hallucinated" something requires the full enumeration, not a match-free sample
status: current
reviewed_by: self (correction found during P0 execution, before any code was written on the false premise)
supersedes: none — this REPLACES the first draft of this packet, whose headline lesson ("a borrowed plan carries its author's blind spots") was itself built on the error described here
surface: docs/ai-workflow/brainstorms (game planning), docs/ai-workflow/design-brain/worlds.md
commit: uncommitted (worktree claude/aftertaste-p0-20260825)
models_used:
  - model: claude-fable-5
    role: grounding, packet author, synthesis, corrector
    did: wrote the G8 "hallucinated anchor" row from a head-8-capped grep; sent it to five paid seats as fact; found the error during P0 when a full read of worlds.md showed entry 16 of 18; corrected six artifacts
    cost: subscription
  - model: gpt (deep research, external)
    role: original plan author
    did: cited `world.miniature-play.voxel-realm` CORRECTLY — the claim I marked as fiction was true. Its real errors (missed local-branch lore, undesigned receipts, invented quality vocabulary) stand
    cost: n/a
  - model: glm-5.3
    role: hostile reviewer
    did: 10 findings adopted; its "G8-class recurrence" point is void (downstream of my error), but its registry-validator remedy stands — the repo already ships exactly that pattern for worlds
    cost: $0
  - model: x-ai/grok-4.6
    role: hostile reviewer
    did: 9 adopted; its P0 blocker #1 was built on my false premise; its Lite budgets, art law, and COOP/COEP tax are independent and stand
    cost: $0.058
  - model: moonshotai/kimi-k3
    role: hostile reviewer
    did: 6 adopted; its generator-license finding turned out to be ALREADY REPO DOCTRINE in the entry I said did not exist
    cost: $0.047
  - model: tencent/hy3
    role: hostile reviewer
    did: 4 adopted; its P0 blocker #1 was downstream of my error; its wave/nest state-machine and Ollama-bind flags are independent and stand
    cost: $0.004
  - model: qwen3.8 (local)
    role: free hostile reviewer
    did: its REJECT verdict rested substantially on the hallucinated-anchor blocker I fabricated; its boss-IP-crowding finding is independent and stands
    cost: $0
  - model: stealth/ox-alpha
    role: standing seat
    did: nothing — upstream 429 ×3
    cost: $0
skills_touched:
  - id: instrument-check
    change: reinforced (violated)
    failure: a `| head -8` grep over an 18-entry catalog returned entries 14 and 15 and stopped; entry 16 was the one being asked about. The absence was an artifact of the cap
  - id: rule-30 (subagent skepticism) — inverted case
    change: gap found
    failure: the rule guards against trusting a reviewer's output. The inverse has no guard: FIVE reviewers trusted a false fact I put in the packet, because a grounding table reads as verified by construction
  - id: rule-51 (confidence tags)
    change: gap found
    failure: the G8 row carried "[VERIFIED 2026-08-25]"-grade framing with a file:line citation. The citation was real; the conclusion drawn from it was not. A citation to lines 204-224 does not license a claim about the whole file
  - id: spend-guard
    change: gap found (proposed)
    failure: consult-kimi and consult-hy3 do not call recordSpend; ledger showed $0.06 of a $0.11 round
privacy: IDs/roles only; no PII, no secrets, no absolute paths
---

# A truncated grep became five reviewers' false premise

## What was decided/built (Fable-tier lesson)

Sean pasted an external plan that anchored its art direction to a design-brain world entry, `world.miniature-play.voxel-realm`. I checked, found only `tiny-metropolis` and `pocket-worlds`, and wrote into the review packet that the entry "does not exist" and the prior reviewer "hallucinated a repo anchor." Five paid seats received that as a grounded fact. Four made it a P0 blocker. One seat's REJECT verdict rested on it. I then built a blueprint, an artifact, a Linear issue, an inbox memo, and a learning packet on top of it — and made "the borrowed plan hallucinated an anchor" the *headline example* of the learning packet.

The entry exists. It is number 16 of 18 in the same file, at line 229. My grep was `grep -nE "miniature|voxel" | head -8`; entries 14 and 15 produced eight lines of output before the scan reached it. The cap, not the file, produced the absence.

I found it only because P0 required reading the file to author a new entry — and the section header was right there.

## Why (the rationale Hermes should carry forward)

Two things make this worse than an ordinary mistake.

**First, I had written the guard that same day.** The packet `an-instrument-that-did-not-run-reports-clean` (2026-08-25) documents a `head -60` capped grep producing exactly this false negative, and states the rule: *before believing a negative, confirm the instrument ran over the thing you think it covered.* I wrote that, then violated it within hours, on the single most load-bearing fact of the next task. A lesson written down is not a lesson installed.

**Second, the error propagated to paid reviewers and came back wearing their authority.** A grounding table at the top of a review packet is read as verified by construction — that is its entire purpose. Rule 30 tells me to treat a *reviewer's* output as hypothesis; nothing told the reviewers to treat *my* grounding as hypothesis, and nothing should have to. When four independent seats then repeat the claim in their blockers, the error looks like consensus. Consensus among reviewers who share a premise is not evidence about the premise.

The reversal also cost real information: the entry I dismissed already contained answers to three findings the panel spent effort deriving.

## Reusable pattern / rule Hermes should apply next time

1. **Never `head` an enumeration you intend to draw an absence from.** If the output must be capped, cap it *after* filtering to the thing you are asking about (`grep -c`, `grep -o | sort -u`), and print the total so the reader can see the scan was complete.
2. **An absence claim states its denominator.** Not "voxel-realm is not there" but "18 world IDs enumerated, here they are, voxel-realm is not among them." The denominator is what makes it checkable — and writing it forces the complete scan.
3. **Calling someone else's citation a hallucination is a high bar.** It is an accusation about their process, it redirects everyone downstream, and it is asymmetric: being wrong about a *present* thing wastes one check, being wrong about an *absent* thing poisons every consumer. Full enumeration or don't make the claim.
4. **A file:line citation licenses a claim about those lines only.** Citing L204–224 and concluding something about the file is a scope error that looks like evidence.
5. **When a panel converges, ask what they share.** Four seats agreeing does not corroborate a fact all four were handed. Check whether the consensus is independent before it hardens into a decision.
6. **Before authoring a new registry/catalog entry, read the whole catalog.** The thing usually exists.

## Who did what

I produced the error and every artifact built on it. The external GPT plan was **right** on the point I attacked. GLM, Grok, HY3 and Qwen each turned my false premise into a P0 blocker — correct behaviour given their inputs; the failure was upstream. Kimi's generator-license finding turned out to already be doctrine inside the entry I said did not exist. Ox produced nothing (429 ×3). No seat questioned the grounding table, and no seat should have had to.

## Skills created or changed

- `instrument-check` — reinforced by violation. The addition this incident earns: **absence claims must state the denominator.**
- **Gap with no owner:** there is a rule for distrusting reviewer output (30) and none for the packet author's own grounding. Proposal: any grounding-table row asserting an absence carries the enumerating command and its total, inline, in the evidence cell — so a seat can audit the premise instead of inheriting it.
- `spend-guard` — two consult scripts don't record spend. Proposed, not fixed.

## Mistakes I made

- `head -8` on the catalog enumeration → declared a real entry hallucinated → shipped that to five paid seats → built six artifacts on it. The root error of this session.
- Prescribed rebinding Ollama to `127.0.0.1` in four documents as a security fix. The `0.0.0.0` bind is deliberate: Hermes runs in WSL and reaches Ollama at the gateway IP; localhost is unreachable from WSL. It would have severed Hermes's brain. Caught when Sean said "fix it" and I enumerated consumers before acting. **A finding is not a fix.**
- Copied the borrowed anchor into the packet as fact *before* running the (bad) verification — wrong order even had the grep been sound.
- Passed markdown containing backticks through a double-quoted shell string; bash expanded them and blanked the code spans.
- Imported a module by relative path after a `cd` in the same command.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before recurring? | What actually stopped it |
|---|---|---|---|
| **Truncated instrument → false negative** | **2** (`head -60` grep in the morning packet; `head -8` catalog grep here) | **YES — by me, hours earlier, in this same corpus** | Reading the whole file for an unrelated reason. Nothing procedural caught it. The write-up demonstrably did not prevent the repeat, which is the finding: the fix has to be a habit at the command line ("no `head` on an enumeration behind an absence claim"), not a paragraph in a doc |
| Prescribing a remediation without enumerating the resource's consumers | 1 (Ollama rebind) | no | Sean's "let's fix this" forced a pre-execution check |
| Asserting a borrowed repo fact before verifying | 2 | same-day packet | evidence cell required per row |
| Shell interpolation eating markdown backticks | 1 | no | Edit tool / heredoc instead |
| Relative import after `cd` | 1 | no | absolute paths |

## External-model calibration

Adopted / voided-by-my-error / cost: GLM 10 / 1 / $0 · Grok 9 / 1 / $0.058 · Kimi 6 / 0 / $0.047 (one finding turned out to be pre-existing doctrine) · HY3 4 / 1 / $0.004 · Qwen 1 / 2 / $0 (verdict rested on my error) · Ox 0 / 0 / $0 (no output, 3 attempts). **The calibration lesson is not about the models.** Their findings were sound conditional on inputs they could not audit. What this round measures is packet quality, not seat quality — and a $0.11 panel produced roughly $0.11 of misdirection because of one capped grep.

## Risks / guardrails

- The corrected blueprint now **inherits** `world.miniature-play.voxel-realm` instead of authoring a competing entry.
- **New constraint no seat saw:** Voxel Realm is **Law B (Licensed Departure)** — "No Swan-branded surface may use this Law-B chrome," licensed to non-Swan microsites, client demos, and internal experiments only. An in-dashboard embed must render **Law A**; Law-B chrome is standalone-only. This raises the standalone build's priority relative to the in-app embed.
- Ollama exposure is the installer's Public-profile firewall rules, not the bind. Launcher written, Sean-run, unexecuted. **Never rebind Ollama on this box.**
- Nothing installed, nothing committed to main.

## Provenance & privacy

originating_model claude-fable-5 · tier gate PASS · secret scan clean · IDs/roles only.
