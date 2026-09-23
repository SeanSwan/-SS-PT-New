# H0 and Hermes Coexistence Decision

## Decision: WRAP

Hermes becomes the one visible classroom assistant. If the hardened H0 local
assistant exists, it is preserved behind that front door as the offline engine
until live acceptance proves a migration is safe. We do not replace it blind,
run two visible assistants, or copy it into a second memory-writing process.

This resolves the design part of D-20. The runtime part still needs the target
Mac facts and H0 adoption result.

## Why WRAP is the safe default

- The user wants her to learn and own Hermes, with a brain separate from Sean's.
- H0 already carries seven rounds of local/privacy hardening and a paper floor.
- The original H0 rule was “one model, not two”; the real product need is one
  mental model and one launcher, not denial that two mutually exclusive engines
  may exist during a reversible migration.
- A 27B Mac default was unanimously rejected. The 5090 remains the power lane.
- Hermes requires a long-context agent model; H0 may not meet that requirement on
  her actual RAM. Keeping it as an offline floor prevents a hardware guess from
  destroying the usable fallback.

## State machine

| Observed state | Action | Legacy launcher |
|---|---|---|
| H0 present; adoption unknown | wrap and preserve; collect five-day result | keep, do not advertise |
| H0 accepted 4/5 days | keep its local behavior; place behind new launcher | retire only after rollback test |
| H0 not accepted | keep paper/template floor; do not force the same terminal UX | preserve until teacher signs off |
| H0 absent; Apple Silicon and adequate RAM | benchmark a smaller approved local model or template floor | not applicable |
| Intel, under 16 GB, or benchmark fails | template/paper offline floor; 5090 for generic work when available | not applicable |

At no point is Qwen 3.8 27B selected as the Mac local default. Its designated
home is the RTX 5090, with an authenticated private endpoint and generic prompts
only.

## One-front-door modes

1. **Local classroom mode:** offline H0/template path. Child-specific material is
   allowed only if written school policy authorizes storage/use on this Mac. It
   never enters Hermes persistent memory automatically.
2. **General planning mode:** her isolated Hermes profile. Public, synthetic, and
   controlled-vocabulary inputs only for the 5090/Radar/SwanGuard lanes.
3. **Paper floor:** always available when software, network, or operator support
   is unavailable.

Only one engine runs per session. The launcher never silently falls back from a
local request to a remote provider.

## Retirement gate

The old `Assistant.command` can be removed from the Dock/Desktop only after:

- the new launcher passed local, offline, and 5090-down tests;
- H0 files and Modelfile have a local encrypted recovery copy;
- the teacher used the new front door on four of five school days;
- rollback was rehearsed; and
- she explicitly prefers the new entry point.

Removal is a later supervised action, not part of this Windows preparation.

