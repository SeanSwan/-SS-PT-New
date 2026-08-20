---
decision: The honest security model of the blast-radius approval system — what it prevents, what it only makes visible, and what it cannot touch
status: shipped
supersedes: none
---

# Blast-Radius Approval — What This Actually Protects

**Date:** 2026-08-19 · **Basis:** a 28-case + 15-case empirical probe against the real hook, plus independent hostile reviews by GLM-5.3 and Kimi K3 that both returned REVISE on the previously-claimed model.

This document exists because the system's stated guarantee was **false**, and a security control that overclaims is worse than one that admits its limits — you stop watching the thing you believe is handled.

## The claim that was wrong

The gate's header stated: *"Nothing the agent can run mints an approval."*

**Measured reality:** 12 of 28 probed write routes into the approval directory were open, script indirection (`bash /tmp/x.sh`) bypassed the gate entirely in 9 of 9 cases, the verifier itself was overwritable 3 of 3 ways, and `.claude/settings.json` — the file that registers the hook — was not protected at all.

## The honest model — three tiers

| Tier | Against whom | What we can actually do | Status |
|---|---|---|---|
| **1. Accident-proofing** | The **confused agent** — by far the highest base rate | **Genuinely effective.** A guard that fires on the obvious path stops the common case: an agent that reaches for its most natural tool and gets refused. | Working; being hardened |
| **2. Tamper-evidence** | The **prompt-injected / goal-drifted agent** — deliberate, same-UID | **Prevention is impossible.** Detection, alarms, and append-only records are the real product. The alarm channel must exit the agent's write surface or it does not exist. | Partial — the honest gap |
| **3. Prevention** | A determined agent with shell access as the owner's user | **Requires an OS boundary** — a separate UID or a sandboxed shell. No in-repo software control binds an agent running as the same user that owns the controls. | **Not built. Not attempted.** |

## Why software alone cannot reach tier 3

Both reviewers converged on this independently, using the guard's own reasoning:

- **Blocklists are unbounded.** The guard matches command text against known writer binaries and path spellings. `tar`, `unzip`, `dd`, `curl -o`, `robocopy`, a shell function, a `Makefile` target, a PATH shim — every fix is one idea behind the next.
- **A secret on the adversary's filesystem is not a secret.** `0600` protects against *other users*. The agent is the owner.
- **Key substitution beats key extraction.** Overwriting the key needs no secret at all, and is silent because the key is gitignored. After substitution the owner's own approve script signs with the attacker's key.
- **A symmetric key puts minting power on the verification path.** With HMAC the verify key *is* the mint key, and the verifier must run unattended wherever the agent runs.
- **The referee is mutable.** Editing the verifier, or the config that registers it, makes every cryptographic control optional.

## What we are building instead

1. **Close the accident surface** — `SELF_PROTECTED` covers the approvals directory itself, the hook registration, the key path, and runtime git hooks.
2. **Fail closed on security findings, open on infrastructure.** Invalid signature, malformed approval, expiry, nonce reuse, symlinked paths → **DENY + alarm**. Node missing, gate unexecutable → keep failing open, because a gate that wedges the agent gets disabled, and a disabled gate protects nothing. **Every fail-open ALLOW is logged as loudly as an invalid signature** — crash-to-allow is otherwise a universal bypass.
3. **Alarms that leave the agent's reach.** An in-repo log is editable by the thing it monitors. Rate-limited and deduped, or an adversary floods it until the owner mutes it and forges the next one.
4. **Signing — if built — is a tripwire, not a guarantee.** Its real value is tier 1: a confused agent "helpfully" extending an expiry invalidates the signature, turning the most plausible accidental escalation into a loud non-event. **It must never be described as preventing a deliberate agent.**

## Standing rules

- **Never restate the tier-3 claim.** If a future document says the agent "cannot" mint an approval, that document is wrong.
- **A red test is a decision, not decoration.** The two long-failing `cp`/`mv` tests asserted an unattainable invariant. Tests must assert what is achievable — *forged approvals are inert and loud* — because a permanently-red suite trains everyone to ignore red.
- **A correct block is answered by fixing the input, never by spending an approval.** Approvals are for changes that are right and blocked, never for inputs that are simply wrong.
- **Prevention lives at the OS boundary.** If real prevention is ever required, the answer is a separate UID or sandbox — not more patterns.
