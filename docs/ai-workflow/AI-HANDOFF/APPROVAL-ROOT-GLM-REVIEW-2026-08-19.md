# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/APPROVAL-ROOT-OF-TRUST-HARDENING-BLUEPRINT-2026-08-19.md
**Tokens:** 3255 in / 14704 out (reasoning: 11390) | total 17959
**Wall:** 455.0s

---

# HOSTILE REVIEW — Approval Root-of-Trust Hardening

## Verdict up front

**The §2 architecture, as sold — HMAC as *prevention* — is a category error, and you already know why: your own §1 argument proves it.** You demolish one blocklist ("matching command text is unbounded") and then ship two more blocklists ("agent is deny-listed from executing the approve script", "key NEVER readable by the agent") plus a secret stored on a filesystem the adversary owns. Say it plainly, as you asked:

**Against an agent with arbitrary shell execution as the key-owner's UID, prevention is impossible. No software control on this machine — blocklist, HMAC, or otherwise — binds. Build tamper-evidence, alarms, and accident-proofing. If you want actual prevention, the only move that works is an OS-enforced boundary (separate UID or sandboxed shell), which this blueprint never considers.**

HMAC is still worth building — as a tamper-evidence layer and a high-signal tripwire, not as a guarantee. Ship it only after the security claim is rewritten.

---

## 1. Ruling on the architecture (Remit 1, Q1/Q2)

Three independent kill shots, in ascending order of severity:

**KS-1: Key confidentiality is unachievable.** `0600` protects against *other users*, not the owner. The agent is the owner. `cat .blast-radius-key` ends the game, and any deny-list preventing that is §1's unwinnable war, restated. You cannot use your own strongest argument to demolish blocklists and then ship two of them in §4.

**KS-2: Key *replacement* forges signatures without reading anything.** This is the one your §6 Q1 misses entirely. The gate verifies against whatever bytes are at `.blast-radius-key`. The agent overwrites that file with its own key `K_evil`. Now the agent mints unlimited self-signed approvals that **verify correctly** — and worse, when Sean next runs the approve script, *it* also reads `K_evil`, so Sean's legitimate approvals are signed with the attacker's key and the substitution is invisible. Confidentiality was never the only property you needed; you needed **integrity of the key**, which is equally unsatisfiable same-UID. This kills candidate answers (a) and (b) in your Q1 list, not just (a).

**KS-3: The verifier is mutable, so all crypto is optional.** The gate guards changes to a repo it lives in. `sed -i 's/hasValidApproval/()=>true/' db-blast-radius-gate.mjs` — or edit the hook registration in repo-level settings to point at a no-op, or `NODE_OPTIONS=--require /tmp/patch.js` to monkeypatch `crypto.verify` inside an *untouched* verifier file. A hardware key (your Q1(c)) makes **forgery** preventable; it does nothing about **bypass**, because the check itself is agent-writable. §2's "attack surface = obtaining the key (BOUNDED)" is false: the surface includes replacing the key (no secret needed), editing the verifier, and rolling back the ledger. That is not bounded.

**Q1 ruling:** (d) is the honest answer, with (c) as the only same-host upgrade worth considering *for forgery specifically*, and OS-level containment as the only path to real prevention. **Q2 ruling:** yes, build it — but re-scoped: it fully closes the *accident* tier (a confused agent minting via its Write tool now produces an invalid file, loudly), and an invalid signature is the highest-signal alarm you can get. It is a provenance marker and tripwire. It is not authority the agent "cannot produce."

---

## 2. Evasion routes the 28-case probe missed (Remit 2)

Your probe shares your blind spot: **everything you tested was a shell command fed to a shell hook.**

| # | Missed route | Why it matters |
|---|---|---|
| M-1 | **The agent's native Write/Edit tools** | If the gate is a Bash PreToolUse hook, `Write(approved/<hash>.json)` never touches it. This is not exotic — a confused agent that learns "approvals live at `approved/<hash>.json`" from your own DENY message will use its *most natural* tool. Possibly the single most likely real-world mint, and your probe design structurally could not see it. |
| M-2 | **Script files, not inline code** | You tested `node -e` and `python -c`. The natural pattern is `node /tmp/w.mjs`, `python /tmp/w.py`, `bash /tmp/s.sh`. Content analysis of inline code is bypassed by the *default* way agents work. |
| M-3 | **Stateful `cd` across tool calls** | Route 4 needed `cd <dir> && cp` on one line. If the shell session persists cwd, call 1 `cd approved` (looks harmless), call 2 `cp /tmp/p.json .`. The protected path never appears in the checked command at all. The hook must be cwd-aware across calls. |
| M-4 | **PATH shim** | Agent writes `/tmp/w/ls` (lists files *and* copies the approval), prepends PATH. Every subsequent command text contains no writer token and no protected path. Text matching is not merely incomplete, it is **undecidable** — `eval $(base64 -d …)`, `command cp`, `$(printf 'c')p`, exported functions. |
| M-5 | **Deferred execution** | `echo … | at now`, `systemd-run --user`, `launchctl`, `setsid sh -c 'sleep 5; …' &`. The write happens outside the hook's observation window entirely. |
| M-6 | Hardlink/symlink-through | `ln -s /tmp/p approved/x.json`, then write `/tmp/p`. Link once, write elsewhere forever. |
| M-7 | Operand-order flags | `cp -t <dir> a`, `mv -t` — destination *first*; any positional operand heuristic dies. |
| M-8 | Misc writers | `tee`, `dd of=`, `install`, `rsync`, `sponge`, `find -exec cp {} <dir>/ \;`, `pip install -t`, `git apply --directory=`, `git stash pop`, fd redirection `exec 9><dir>/x.json`. (Most are on your own "unbounded" list — I list them to confirm they were untested, not to invite patches.) |

---

## 3. Attacks on the proposed design (Remit 3)

- **Nonce ledger rollback (Q3):** your own route 12 (`git checkout`) restores a pre-burn ledger — and if the ledger is in-repo, `git` does it for free. Outside the repo it's still `cp backup ledger`. Signing ledger entries does not help: every earlier state was *legitimately* signed; rollback to a valid past state is undetectable without an external anchor. Burn-by-deleting-the-approval-file fails identically (agent snapshotted the file while valid). Honest answer: single-use is best-effort; the 15-minute expiry is your real replay defence — cap TTL in the approve script, not via a caller flag.
- **TOCTOU (verify → burn → act):** two concurrent guarded actions can both verify before either burns → one nonce, two allows. Burn must be an atomic `rename`/delete *before* allow, and actions serialized. Separately, a daemon started earlier (same UID) can rewrite the ledger or the gate script between check and effect.
- **Symlinks:** symlink the *key* → KS-2 without writing the real file. Symlink the *ledger* → instant rollback. `lstat`/`O_NOFOLLOW` on all three paths: key, ledger, approval files.
- **Clock:** `date -s` needs privileges, but the prompt is a phishing channel (a sudo dialog Sean reflexively approves). `libfaketime` only matters if the agent can inject the hook's env (it possibly can, via settings env). Low feasibility — note it, don't build for it. Check both wall-clock expiry and a max-TTL-from-mint.
- **Partial writes:** a truncated `approved/<hash>.json` must be **deny**, never a crash — see §4. Approve script must write tmp-then-rename.
- **Alarm flooding (the counter-attack on tamper-evidence):** if invalid-signature events alarm, the adversarial agent drops 500 garbage files, Sean mutes the alarm, the real forgery is file 501. Rate-limit and dedupe. Worse: if the log is a repo file, the agent truncates it. **The alarm channel must exit the agent's write surface** (desktop notification, external file) or it doesn't exist.
- **Owner-display injection:** the approve script *prints attacker-authored request content* into Sean's terminal. ANSI escapes + a cleared screen + forged "approved ✓" output can make Sean believe he approved something else, and request text saying "this is routine, run with --yes" is a direct social-engineering channel. Sanitize control characters; never add a `--yes`.

---

## 4. Fail posture (Remit 4, Q6) — yes, fail CLOSED here, with a precise split

Ruling: **signature verification is the one place this gate fails closed — but define it exactly**, or you'll fail-closed on the wrong things:

- **Security-decision failures → DENY + loud alarm:** invalid sig, malformed/truncated JSON, expired, nonce reuse, symlinked paths. These are not errors; they are *findings*.
- **Infrastructure failures → keep the fail-open posture:** node missing, gate script won't execute, key unreadable *by the gate*. Breaking these wedges the agent and teaches Sean to disable the gate — the failure mode you already fear.

What breaks if you get this wrong in either direction: fail-open on malformed JSON and every forged approval is "accidentally corrupted"; fail-closed on infrastructure and one lost key (rotation story: none in the blueprint) permanently wedges all approvals until Sean bypasses it. Note the residual: fail-open infrastructure means "delete the gate binary" disables protection — already true today, and the reason KS-3 must be answered outside the repo.

---

## 5. Owner friction (Remit 5)

Mostly preserved — one command, one cosmetic line. Three real risks: (1) the `--reason` requirement invites rubber-stamping if requests queue up; batch fatigue is how humans defeat approval systems. (2) Sean cannot eyeball-verify an HMAC, so the "signed ✓" line is security theatre *for him* — fine, but don't let it imply he should trust more. (3) The invalid-signature banner addressed *to the agent* is right, but the alarm must also reach **Sean out-of-band** (§3, alarm flooding).

---

## 6. Exploitability ranking of the 12 (Remit 6) — accident-prone first

| Rank | Route | Class |
|---|---|---|
| 1 | #4/#5 `cd` + write | **Accidental.** Agents `cd` constantly; redirecting into cwd is idiomatic. |
| 2 | #12 `git checkout` | **Accidental.** The reflexive "undo" of every coding agent. |
| 3 | #1/#2 `cp -r`/`mv` whole dir | **Accidental.** "Restore from backup" behaviour. |
| 4 | #9/#10 inline interpreters | Semi-accidental; partially caught by content analysis (which M-2 defeats anyway). |
| 5 | #6/#7 tar/unzip | Situational accident. |
| 6 | #11 `$VAR` | Half-accidental — agents use variables for long paths naturally. |
| 7–8 | #3 traversal, #8 symlink | **Deliberate only.** |

Q4 ruling: **patch ranks 1–3 (the accident tier) — cheap, and accident-proofing is a legitimate tier-1 goal. Do not chase ranks 7–8 with blocklist entries; label them tripwires.** Blocklist-as-detection is fine; blocklist-as-control is the thing §1 correctly killed.

---

## Findings

**BLOCKERS**
- **B1.** "Key unreadable by the agent" is unsatisfiable same-UID; **key-replacement (KS-2) forges valid signatures with zero secrets**. §2's bounded-surface claim is false. Rewrite the security model as tamper-evidence before this ships.
- **B2.** Verifier/hook-integrity unaddressed (KS-3): gate script, hook registration, and interpreter shims are all agent-writable. The root of trust guards a repo it lives inside.
- **B3.** Native Write/Edit tools ungated and unprobed (M-1) — the most probable accidental mint path, structurally invisible to your probe.
- **B4.** Nonce-ledger rollback undoes single-use using your own route 12; no anchoring design exists.

**MAJORS:** M-2 script-file execution defeats content analysis; M-3 stateful-`cd`; M-4 PATH shim (text-matching undecidable — stop pretending otherwise); M-5 deferred execution outside the hook window; alarm-channel and log tamperability + flooding; TOCTOU double-spend of nonces; Q7 adversary tiers undeclared (the design silently targets prompt-injection; say so, and declare machine-compromise out of scope); owner-display injection via request content.

**MINORS:** `lstat`/`O_NOFOLLOW` everywhere; `cp -t`/`mv -t` operand order; clock/sudo-phishing note; canonicalization of "IDENTICAL action" (pin exact-string + hash; a normalizer is its own attack surface); `timingSafeEqual` for the HMAC compare; atomic writes on mint; ledger keyed to key-id + hash.

---

## Verdict

**REVISE — and the revision is the security claim, not the code.** REJECT the §2 framing ("authority the agent cannot produce"); APPROVE the mechanism re-scoped as: accident-proofing + provenance + the loudest alarm in the system, sitting on top of an honest admission that a same-UID shell agent wins any local arms race. Q7 must be answered in the document: Tier 1 confused agent (preventable now), Tier 2 prompt-injected agent (detect and deter only), Tier 3 compromised machine (out of scope, say so).

## Single highest-leverage change

**Make the trust boundary an OS boundary: run the agent's shell — and gate its native Write/Edit tools — under a principal (separate UID / sandbox / seatbelt profile) that cannot read or write the key, ledger, gate code, hook registration, or `approved/`, all owned by Sean's interactive identity.** The OS already has the primitive you are trying to rebuild with regex and HMAC: DAC permissions. With that boundary, even today's presence-check becomes strong and the HMAC becomes genuinely unforgeable; without it, every control in this blueprint — including the signature — is a file the adversary is allowed to edit.
