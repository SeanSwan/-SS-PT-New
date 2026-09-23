# Arbitration: two reviewers proposed opposite residency fixes. Which is right? — reviewed by HY3 (tencent/hy3)

**Reviewer:** `tencent/hy3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/RADAR-ARBITRATION-SANITIZED-2026-08-23.md
**Seed:** (none)
**Tokens:** 1450 in / 5903 out | **Cost:** ~$0.0033 | **Wall:** 86.5s | **finish_reason:** stop

---

**Arbitration verdict:**  
**Adopt Position 1 – with corrections.** Position 2 is not a viable architecture; it is a half‑measure that cannot satisfy the hard constraints (single poller, always‑on scheduler, interface not silently dead). Both proposals mis‑state the VPN/inbound problem. The deciding factor is not “where is the GPU” but **where must the single chat poller and the durable scheduler live**. Those must be on Machine B (always‑on). Inference must stay on Machine A (GPU, fail‑closed). Therefore the control plane belongs on B; A becomes an inference appliance. That is Position 1.

The only “third” option is Position 1 minus the phantom inbound‑NAT cost and plus explicit resource isolation for tools on B. I commit to that.

---

### 1. Position 1 or Position 2 – or a third?
**Commit to corrected Position 1.**  

Deciding factors, in order of hardness:
1. **One polling consumer per token (constraint 2).** The chat poller must be a single process. If it sits on intermittent Machine A, the operator’s messages receive zero acknowledgement when A is off – an interface failure the agreed findings already flagged as unacceptable. Therefore the poller *must* be on always‑on B.
2. **Scheduled work must fire regardless of A (constraint 5).** The scheduler and job ledger must be on B.
3. **Inference stays on GPU machine (constraints 3,4).** A remains the model backend, reached over mesh VPN when A is powered.

Position 2 (“delete the control plane”) leaves the poller and scheduler split, forces B to be a dumb ticker, and still kills interactive capability. Its optional mailbox is just Position 1’s poller extracted without admitting it. Position 2 therefore fails the above constraints.

*Correction to Position 1’s stated cost:* “solving inbound connectivity into a NAT’d subsystem” is false. Machine A is the client: when powered, it joins the mesh VPN outbound. B does not need to punch into A’s NAT. The only networking work is joining the already‑provisioned VPN client on B and installing the VPN agent on A.

---

### 2. Is the optional “poller‑as‑mailbox” a free win?
**No. It is either the first half of Position 1 or a split‑brain bug.**

The bot API allows exactly one polling consumer per token. If Machine A’s full agent continues to poll when powered, and B’s “mailbox” also polls, they fight – duplicated/locked updates, violated constraint 2. To make the mailbox safe you must **disable polling on A entirely** and let B be the sole poller. At that point the mailbox *is* the Position‑1 polling component; labelling it “optional” and running it alongside A’s poller smuggles in a second identity by the back door.

If implemented as exclusive poller + sender‑of‑acks (no generation), it is fine – but then it is not an add‑on, it is the control plane’s front door. Treat it as mandatory relocation, not a free win.

---

### 3. Where do the coding CLIs and browser harness belong?
**On Machine B, with isolation – not on A.**

The reviewer’s objection (headless OAuth, OOM risk) is answerable:
- **OAuth:** one‑time device login via SSH port‑forward to a local browser on the operator’s workstation is standard and already implied by “SSH only” access. Not a blocker.
- **Headless browser:** needs no display server; `--headless` Chromium/Firefox runs fine.
- **RAM/OOM:** the planned upgrade to 32 GB plus systemd/`cgroup` memory limits (or a separate container) protects the database. Running the DB and the browser in the same unconstrained service account is the real mistake – fix that, don’t ban the tools.

Because B is always on and must execute allowlisted jobs (and drafting under constraint 6) without waiting for A, the CLIs/harness must reside on B. Keep interactive GUI debugging on A if desired, but scheduled agent work runs on B.

---

### 4. Where should the retrieval knowledge base live?
**One canonical copy on Machine B. Dual‑homing is forbidden.**

The scheduler, orchestration, and poller are on B. Retrieval is a pre‑inference step that can run on B, package context into the job payload, and hand it to A only when the model is reachable. Therefore the KB must be primary on B (217 GB disk is sufficient for a personal KB).

A may hold a **read‑only cache** pulled from B when A is online, to speed local experiments, but all writes/governance happen on B. Bidirectional sync tools would create divergent copies, break idempotency keys in the job ledger, and add exactly the “speculative complexity” we should delete. One canonical source of truth is mandatory.

---

### 5. What is speculative complexity to delete?
- **The “inbound NAT” worry.** Delete from the risk list; A connects outbound to VPN.
- **Position 2’s “independent worker, no control plane” framing.** Delete; it duplicates logic (ledger on B + agent on A) without solving reachability.
- **The “optional mailbox” as a separate side‑car.** Fold it into the single B‑side poller; do not build a second coordination mechanism.
- **Bidirectional KB sync / dual‑homing.** Delete; use one canonical store on B.
- **Any cloud fallback or inference on B.** Delete; constraints 4 and fail‑closed forbid it.
- **Graphical access to B.** Delete from requirements; SSH‑forwarded OAuth covers the only GUI need.
- **Over‑engineering the no‑privilege account issue.** Just `loginctl enable-linger` once for the service user; run the ledger/orchestration as a systemd *user* unit. No root‑owned units required.

**Operator‑experience note (the only UX point that changes architecture):** the silent black‑hole when A is off (messages get no ack) is not cosmetic – it forces the poller to B. That is why “fail‑closed interface” was correctly rejected in the agreed findings and why observability on B is architectural, not visual.

**Final: Build Position 1 – control plane + tools + KB on B, inference appliance on A, single poller on B, job ledger as source of truth, resource‑limited containers on B.**
