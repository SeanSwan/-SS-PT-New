# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/APPROVAL-ROOT-OF-TRUST-HARDENING-BLUEPRINT-2026-08-19.md
**Seed:** (none)
**Tokens:** 3285 in / 20072 out | **Cost:** ~$0.3109 | **Wall:** 274.9s | **finish_reason:** stop

---

# HOSTILE REVIEW — Approval Root-of-Trust Hardening

**Reviewers:** GLM-5.3 + Kimi K3 (consolidated dissent)
**Verdict: REVISE.** The diagnosis in §1 is excellent. The prescription in §2 is half right and half theatre, and the doc already knows which half — §6 Q1(d) is the honest answer, tucked into a question it shouldn't be a question.

---

## 1. The headline ruling (Q1/Q2): yes, this is a category error — with one precise exception

The doc asks whether signing "relocates the bar." It doesn't even relocate it. **It repaints it.**

The load-bearing assumption — *"the key must be unreadable by the agent"* — is false by construction. The agent runs as Sean's UID. The gate also runs as Sean's UID, and the gate must read the key on **every verification**, which is the hot path. There is no privilege boundary anywhere in this design. Concretely, against HMAC-with-repo-key:

- **Read:** `cat .blast-radius-key` → mint anything. The HMAC construction is in the gate's source, also readable.
- **Write:** the agent doesn't even need to *read* the key. **Key substitution** — `echo mykey > .blast-radius-key`, then mint against the substituted key — is an attack the document never mentions, and it's *silent*, because the key is gitignored so no working-tree diff betrays it. The doc obsessed over reading the secret and missed that overwriting it is strictly easier.
- **Execute:** "agent is deny-listed from executing approve.mjs" — a deny-list on command text, i.e., the exact mechanism §1 spent a page proving unwinnable. The design rests its mint-path on the control it just refuted. `node -e "import('./scripts/blast-radius-approve.mjs')"`, `cd scripts && node …`, copy the script to /tmp and run the copy — pick one.

And here is the part that makes HMAC specifically — not signing generally — the wrong primitive: **with a symmetric key, the verify key IS the mint key.** The verifier, which must run unattended on the agent-adjacent hot path, must therefore possess minting power. Any key store that lets the gate verify unattended (repo file, DPAPI, session-unlocked keychain) lets the agent mint. HMAC *guarantees* the secret lives on the wrong path. This is not an implementation detail; it disqualifies the proposed construction.

**The one precise exception — where "nothing the agent can run mints an approval" becomes actually true:** asymmetric signatures with the private key behind a **user-presence gate**: Secure Enclave key with `.userPresence` ACL (Touch ID per sign), Windows Hello TPM key, or a FIDO2/PIV token requiring touch. The public key is committed to git, world-readable, pinned by hash. Then:

- Verification needs **no secret** — hot path stays frictionless, agent can hold the public key forever and mint nothing.
- The mint script becomes **safe to run** — the agent running approve.mjs just triggers a Touch ID/presence prompt on Sean's screen. An unexpected prompt *is the intrusion alarm*. The disproven deny-list stops being load-bearing.
- Key substitution becomes a **git-visible** event instead of a silent one.

**So the honest ruling:** prevention of self-minting is impossible against an agent with shell access as the key-owning user *unless the private key requires Sean's physical presence to use*. If the team refuses presence-gated hardware/enclave keys, then option (d) is the answer and must be stated as the design, not as question 1(d): **prevention is impossible; build tamper-evidence and alarms.** What must not ship is HMAC with a repo-local key. It delivers identical real security against a deliberate agent as today's file-presence check, strictly better accident-resistance, and strictly *worse* implied guarantees. The doc itself names false confidence the worst outcome for a trust system — then proposes to build it.

---

## 2. Rulings on the remaining open questions

**Q3 — nonce ledger.** This is not an open question, it's an open hole. The ledger is a same-UID file. `git checkout` (route 12) restores a pre-burn copy; a joint snapshot of `approved/` + ledger restores a *validly signed, unexpired, unconsumed* approval — full replay, and every defence in §2 except the ledger is satisfied. Hash-chaining the ledger doesn't fix it (agent rolls back the whole chain) unless the chain head is anchored out-of-band at burn time — a write-only webhook POST, an email, anything egress-only. And name that honestly: that's tamper-**evidence**, not prevention. Also consider the stateless alternative nobody raised: **drop nonces and the ledger entirely; let a signed approval authorise its exact hash until expiry.** Replay window = the identical, vetted command within 15 minutes. If that's tolerable, you've deleted the single most attackable component in the design. If it's not, keep the ledger + external anchor + atomic burn (below).

**Q4 — patch the 12?** No. Zero of them, *as security controls*. Under signature-authority they produce inert files; under presence-gated keys they're doubly inert. Patching them as "defence-in-depth" invites exactly the reliance the doc warns against and re-legitimises the blocklist. Keep the existing regex only as a free accident-tripwire, stop calling it protection, and **rewrite the two long-failing tests**: the invariant they assert ("nothing the agent can run mints an approval") is unattainable as specified, and leaving them red trains everyone to ignore red tests — which is itself a security hole. The new tests assert: *unsigned or stale files in `approved/` are inert AND raise the loud alarm.*

**Q5 — is `node -e` (route 10) the sharpest?** No — its sharpness is a mirage, and it's the whack-a-mole trap wearing a trench coat. The one-line write-target check expires with `node --input-type=module -e`, `node -p`, `bun`, `deno`. The actual lesson of route 10 is that **content-analysing interpreters is hopeless** — an interpreter with a file argument is an opaque execution boundary, which brings us to the probe's structural blind spot (§3 below).

**Q6 — fail posture.** Yes: signature verification fails CLOSED, and not just "invalid sig." Fail closed on: approval-present-but-malformed, wrong schema, expired, nonce-seen, `approved/` is a symlink, ledger head mismatch, verify-key missing or hash ≠ pinned. None of these states arise from innocent breakage; every one implies tampering or rot. But the doc's fail-open doctrine has a darker edge nobody attacked: **fail-open on gate crash is a universal bypass.** An attacker doesn't need to forge an approval — it needs to crash the gate: ReDoS against the path regex, a 10MB argv, null bytes, deleting the key file to induce the "broken" state. Every crash-to-allow converts the fail-open doctrine into authorisation. Ruling: enumerate *which* internal errors may fail open, and every fail-open ALLOW is logged and alarmed as loudly as an invalid signature. What breaks if verification fails closed: keychain hiccup or clock skew denies a legitimate approval, Sean re-mints. Bounded, visible, annoying. The alternative is silent unlimited authority. Asymmetry is obvious.

**Q7 — name the adversary.** Primary: the **prompt-injected / goal-drifted agent** — deliberate-capable, same-UID, not root. Secondary: the **confused agent** (accidents; highest base rate). Explicitly out of scope: the compromised machine — and note that **WSL-default-root and dev containers already are that adversary**, which collapses even the presence-gate design (root can patch the prompt). Spend prevention only at the mint (presence gate), detection everywhere else, nothing against root.

---

## 3. What the 28-case probe missed

The probe's blind spot is named in the doc: "I tested what I could imagine." Here's what wasn't imagined, in descending order of damage.

**Route 0 — the probe attacked the mint side; the ACTION side has the same hole, bigger.** The gate matches the *outer command text*. `bash /tmp/x.sh` — where `x.sh` contains `psql -c "DROP TABLE …"` — executes the fully guarded action with zero gate involvement: `bash` with a tmp path is not a DB runner, and the harness hooks tool calls, not subprocesses. Same for `make migrate`, `npm run db:reset`, `source`, `eval "$(cat f)"`, `sh <(curl …)`. **Script indirection walks around the gate entirely** — no approval needed, forged or otherwise. Signing approvals does nothing about this. At minimum the doc must scope its claim; currently the "root of trust" guards a gate with no walls.

**Route −1 — time-delayed and Sean-laundered execution.** `echo 'migrate.sh' | at now`, cron, launchd — execute outside the agent's tool stream, invisible to the hook. Sharper: **git hooks.** Agent writes `.git/hooks/post-commit` (or sets `core.hooksPath`); the payload executes when *Sean* runs git, under Sean's intent, never appearing in the agent's command stream. Any event-triggered execution defeats the hook model categorically, not just the regex.

**Key substitution** — covered above. The doc's single most important missed attack: *write* the key, don't read it.

**Gate/ledger/code overwrite.** `SELF_PROTECTED` guards the gate's own path with the same command-text regex §1 disproved. Routes 1–12 (and everything below) overwrite the verifier itself with `exit 0`, after which no approvals are needed at all. Signing protects the approval; nothing protects the referee.

**Verifier-runtime control.** If the agent's session environment reaches the hook process — `NODE_OPTIONS=--require ./evil.js`, a `node` shim earlier in `PATH`, LD_PRELOAD — the agent instruments the verifier in-process and verification always says "valid." The doc never asks who spawns the gate and with what env. Establish the verifier's provenance or write down that you didn't.

**Parser/FS layer** (listed to prove unboundedness, not to be patched): case-insensitive filesystems — `Approved/X.JSON` on default APFS/NTFS sails past a case-sensitive match and lands in the same directory; `approved/./x.json`; `approved//x.json`; Windows trailing-dot (`x.json.` → `x.json`) and 8.3 short names; brace expansion `approved/{x}.json`; paths built by `$(…)`/backticks/`$'…'`; `sed -n 'w …'`, `tee`, `dd`, `rsync`, `install`, `curl -o` — including `curl https://agent-box/x.json -o approved/x.json`, where the payload **never exists locally to be content-analysed**; and the VCS-restore class beyond `git checkout`: `git stash pop`, `git apply`, `git merge`, `git reset --hard` — routine operations that materialise files with no writer binary in the text.

**Approval-UX injection.** The flow has the agent *author* `requests/<hash>.md` — the very document Sean vets. Two holes. (1) **Preimage integrity:** Sean approves agent-written prose while the hash binds something else; as documented, the human-in-the-loop is reading attacker-authored text. The gate must write the canonical record of the exact denied command at deny-time, approve.mjs must display *that*, and warn if the agent's .md diverges. (2) **Terminal injection:** the agent controls bytes printed into Sean's terminal — ANSI escapes, bidi overrides can make the displayed request lie. approve.mjs must sanitise. Also: the 8-hex display id (`09dc69c5`) — if that truncated id is ever the lookup key, 2^16 birthday work collides a malicious request with a benign approval. Display-truncation must never be the key.

**Concurrency double-spend.** "Single use" is check-then-burn. Two parallel agent shells fire the same approved command; both gates read nonce-unseen before either burns; both allow. Burn must be atomic (rename/O_EXCL under flock) and fsynced *before* the act.

**Hash binding is unspecified.** "compute contentHash" — of what? If it's the command string and the action is `bash scripts/deploy.sh`, the approval is a bearer instrument for whatever `deploy.sh` becomes between verify and act (TOCTOU). The hash must bind resolved argv *and the content of every referenced file*, or the action class must be inherently content-free. This is unspecified in a document whose entire premise is binding authority to content.

---

## 4. The 12 routes, ranked by real-world exploitability

The reframe matters more than the ranking: **these 12 only matter against the confused agent.** A deliberate agent ignores all of them and goes for key, gate, or ledger directly. The probe catalogued the accidental surface and called it the threat model.

| Route | Accidental likelihood | Deliberate utility | Priority |
|---|---|---|---|
| #12 `git checkout`/restore | **HIGH** — routine cleanup; restoring a stale approval mints authority today | HIGH | 1 |
| #4 `cd` + relative cp | HIGH — idiomatic scripting | MED | 2 |
| #5 `cd` + redirect | HIGH — same | MED | 3 |
| #1 `cp -r` whole dir | MED-HIGH — "snapshot the dir first" instinct | HIGH | 4 |
| #11 `$VAR` indirection | MED — any refactored script | HIGH | 5 |
| #9 python write | MED — "helpfully" editing `expiresAt` in-place is a realistic confused-agent act | HIGH | 6 |
| #2 `mv` whole dir | MED | HIGH | 7 |
| #7 unzip / #6 tar | LOW-MED — unpacking a repo snapshot | HIGH (trivially reliable) | 8 |
| #3 `../..` traversal | LOW accidental | HIGH | 9 |
| #10 `node -e` | LOW accidental | MED (already content-analysed) | 10 |
| #8 symlink | ~zero accidental | HIGH (single command) | 11 |

Note the nice property the signature model accidentally has: under it, the #9 scenario — the helpful agent extending an expiry — *invalidates the signature*, converting the most plausible confused-agent privilege-escalation into a loud non-event. That's the strongest argument for signing and the doc never made it.

---

## 5. Friction (§5 surface)

The mint flow is fine as drawn — one command, one new line. Three qualifications: per-item display for batches ("1 of 3" is a rubber-stamp conveyor — show each hash's bound command from the *gate's* record, not the agent's prose); clamp max TTL (`--expires 15d` is one fat-finger from a standing approval); and refuse wildcard/class approvals forever — the 15-minute re-mint pressure will create demand for them, and any "approve this class" feature quietly recreates presence-based authority inside the signature scheme. Under the presence-gated key, the Touch ID/prompt per mint *is* the act of approval — acceptable friction, and it lands only on mint, never on verify. HMAC can't say that; it's the decisive UX argument for asymmetric.

---

## 6. Findings ranked

**BLOCKER**
1. **Repo-key HMAC is theatre and must not ship.** Key readable (mint), writable (silent substitution — unmentioned in doc), deny-listed mint script (mechanism §1 disproved). Either the private key moves behind a user-presence gate (Secure Enclave `.userPresence` / Windows Hello / FIDO2 touch) with an asymmetric scheme and git-pinned public key, or the prevention claim is withdrawn and tamper-evidence becomes the stated design. No third option exists.
2. **Gate/key/ledger integrity rests on the same command-text self-protection §1 refuted.** The referee is as attackable as the trophy. Detection story (integrity pin in git, alarmed) is mandatory even accepting prevention is impossible.
3. **Nonce-ledger rollback** — Q3 is a hole, not a question. Joint snapshot of `approved/` + ledger = replay of a valid approval. External anchor or drop nonces for TTL-only.
4. **Fail-open is weaponisable** — crash/DoS the gate (ReDoS, giant argv, deleted key) → allow. Fail closed on all verification/integrity states; enumerate fail-open errors; alarm every fail-open allow.
5. **Action-side indirection (`bash /tmp/x.sh`, make, cron, git hooks) bypasses the gate entirely** — outside the doc's scope and bigger than everything in it. Scope the claim or the exercise caps out at theatre regardless of §2.

**MAJOR**
6. Mint path trusts agent-authored content: gate must record the canonical denied command at deny-time; approve.mjs displays that, sanitises terminal output; truncated id must never be the lookup key.
7. Hash binding unspecified — command-text-only hashing makes approvals bearer instruments via file indirection (TOCTOU). Bind content of referenced files.
8. Burn race: concurrent gates double-spend single-use approvals. Atomic, fsynced, burn-before-act.
9. Verifier provenance: agent-controllable env (NODE_OPTIONS, PATH) instruments the gate process. Establish or document.
10. Alarm channel is agent-suppressible and agent-spammable. Write-only egress webhook + out-of-band audit-head anchor; telling the suspect to "say so now" is not an alarm.
11. Tests assert an unattainable invariant; permanent red breeds alert-blindness. Rewrite to "unsigned/stale = inert + alarmed."

**MINOR**
12. approve.mjs: tmp+rename atomic writes; gate treats partial JSON as invalid (fail-closed), never crash (fail-open).
13. Clamp max TTL; refuse wildcards.
14. Parser cheap-wins exist (case-insensitive FS, `./`, `//`) — fix only as tripwire hygiene, never as controls.
15. Route #10 write-target check: skip (Q5 ruling).
16. Batch-UX per-item confirm; state the WSL/container-root caveat where even presence gates collapse.

---

## 7. Verdict and the single highest-leverage change

**REVISE.** The core insight — authority from validity, not presence; invalid-signature as a first-class loud event; fail-closed on forgery — is correct and worth building. The construction is wrong at its one load-bearing joint.

**Single highest-leverage change: replace HMAC with asymmetric signatures whose private key requires Sean's physical presence to use (Secure Enclave / Windows Hello / FIDO2 touch), public key pinned in git.** It is the only change that makes the stated security model true while keeping verification secretless and frictionless, dissolves the mint-script deny-list, converts key substitution into a git-visible event, and turns every forgery *attempt* into a prompt on Sean's screen. And if the team won't accept a presence gate: say plainly that prevention is impossible, withdraw the claim, ship the tamper-evidence and alarms — but **do not ship repo-key HMAC**, which buys accident-resistance at the price of a guarantee it cannot keep.
