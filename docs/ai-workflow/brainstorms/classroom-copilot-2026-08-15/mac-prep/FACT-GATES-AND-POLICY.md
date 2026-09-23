# Fact Gates and Policy Worksheet

No real child information enters the Mac, Hermes, H0, SwanGuard, Radar, or the
5090 until the director's answers below are in writing. A verbal “AI is fine” is
not enough; each data location and use must be answered.

## Director request — paste-ready

> I use planning tools to prepare age-appropriate classroom activities. Before I
> use any personal device or AI-assisted planning tool, could you please confirm
> in writing: (1) whether any information about enrolled children may be stored
> or processed on a teacher-owned/family-owned Mac; (2) whether AI tools may be
> used for generic lesson planning and, separately, for any child-specific
> content; (3) which school-approved system must hold observations, incident
> facts, family messages, allergy information, and toileting information; (4)
> the applicable retention/deletion rule; and (5) the written bathroom/toileting
> policy for the two-year-old classroom, given the public preschool materials'
> potty-trained language. I will use only public/synthetic planning material
> until these points are confirmed.

## Record the answer without child data

| Fact | Allowed values | Result |
|---|---|---|
| personal Mac for generic planning | approved / denied | unresolved |
| personal Mac for child-specific data | approved / denied | unresolved |
| family 5090 for generic planning | approved / denied | unresolved |
| family 5090 for child-specific data | permanently not requested | denied by architecture |
| external AI for public/synthetic plans | approved / denied | unresolved |
| external AI for child-specific content | permanently not requested | denied by architecture |
| required school record system | named system / none | unresolved |
| retention/deletion policy | written citation/date | unresolved |
| two-year-old toileting policy | written citation/date | unresolved |

## Target Mac facts

Run the read-only collector only from a build-only folder:

```zsh
node scripts/classroom-hermes/mac-preflight.mjs > mac-preflight.safe.json
```

It reports chip, RAM, free disk, macOS, FileVault, standard/admin status,
enrollment state, Hermes/Ollama versions, and whether an Ollama model named
`classroom` exists. It deliberately leaves ownership, director policy, and H0
adoption unresolved. Raw account output is discarded in memory.

Human-fill fields:

- ownership: personal / school;
- whether a separate standard account already exists;
- H0 use: accepted on __ of the last 5 school days;
- teacher's requested changes since H0;
- device location during planning;
- approved school record system;
- operator/electricity owner for the 5090.

## Fail-closed decisions

- Director answer absent or ambiguous: public/synthetic planning only.
- School device or MDM ownership unclear: stop before installation.
- Intel Mac: stop; current Hermes official support classifies Intel macOS as
  unsupported.
- macOS below 14: Ollama floor unsupported; stop and decide whether to update.
- FileVault off: stop before any local classroom content.
- no dedicated standard account: create one before the Hermes profile.
- H0 adoption unknown: preserve H0; never overwrite its model or launcher.
- exact Qwen tag/license/digest unknown: do not pull or configure it.

