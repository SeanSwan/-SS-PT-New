# Hermes → remote 5090 / Qwen3.8 — relay design

**Status:** design capture, NOT built. Decision confirmed by Sean 2026-08-16.
**Constraint (Sean, confirmed):** *"We would have to do the relay for sure, because my
motherboard doesn't support WOL."*

---

## 1. The goal

Hermes should reach the desktop 5090's local Qwen3.8 **on her own, whenever she wants** —
not only when Sean is at the machine.

## 2. The constraint that shapes everything

**Wake-on-LAN is dead on this hardware.** Not a config gap — the board does not support it,
and an exhaustive BIOS attempt already failed (`project_hermes_phase_e_wol_dead`, **do not
retry**). So the design cannot assume the 5090 is reachable on demand.

That splits the problem in two, and they are independent:

| Problem | Question |
|---|---|
| **Reachability** | how does Hermes get a request to the desktop from outside the LAN? |
| **Availability** | what happens when the desktop is powered off? |

Most "remote GPU" designs only solve reachability and quietly assume the box is on. Here that
assumption is false, so availability is the harder half.

## 3. Availability — power-on WITHOUT WOL

**Primary candidate: BIOS `Restore on AC Power Loss = Power On` + a network smart plug.**

WOL requires the NIC to stay powered in a sleep state — that is the part this board lacks.
"Restore on AC power loss" is a *different subsystem*: it only decides what the board does when
mains power returns, and it is near-universal even on boards with no WOL support.

Sequence: smart plug cuts power → restores power → board powers on automatically → OS boots →
Ollama starts as a service → relay sees it come up.

**Verify before designing around it (~2 min, no purchase needed):**
1. BIOS/UEFI → Power Management (naming varies: "Restore AC Power Loss", "AC Back Function",
   "After Power Failure", "State After G3"). Set to **Power On** / **Last State**.
2. Test with the physical PSU switch or by unplugging: does it boot on power restore?
3. If yes → a ~$15 Wi-Fi smart plug is the entire wake mechanism.

**Hard caveats, state them plainly:**
- This is a **hard power cut**, equivalent to yanking the cord. It risks filesystem damage on
  an unclean shutdown. Only safe as a *cold start* on an already-off machine — **never** as a
  reset for a running one. The relay must confirm the machine is genuinely off (no ping, no
  Ollama port) before cycling the plug.
- Requires Ollama running as an **auto-start service**, and the OS reaching a state where it
  serves without an interactive login.
- BitLocker/full-disk-encryption prompts at boot would block this entirely — check.

**Fallbacks if that BIOS setting is absent:**
- Leave the desktop on 24/7 (simplest; the real cost is idle watts, not complexity).
- A second always-on machine that can issue an IPMI/BMC power command — consumer boards rarely
  have this.
- Accept "queue until Sean powers it on" as the product behavior (see §6).

## 4. Reachability — the relay

The relay is **not** a compute node. It is a small always-on process that:
1. accepts Hermes requests over an authenticated channel,
2. reports desktop state (up / down / booting),
3. triggers power-on when down (§3),
4. proxies inference to Ollama once up,
5. enforces the tier gates and writes audit receipts.

**Where it runs — open question.** The Pi is retired (SSD/power blocked), so there is no
obvious always-on host today. Candidates: a small VPS (always-on, but then the *tunnel* to home
is the hard part), a cheap SBC on the LAN, or the router itself if it can run containers.
**This is the first thing to settle in the build session.**

**Networking: overlay only.** Tailscale or WireGuard. **Never port-forward Ollama** — it has no
auth and would expose a local LLM with filesystem-adjacent tooling to the open internet. An
overlay gives device identity and no inbound ports.

## 5. Security posture (non-negotiable)

- Overlay network only; zero inbound ports on the home router.
- The relay is the **only** thing that talks to Ollama; Ollama binds to localhost or the
  overlay interface, never `0.0.0.0`.
- Power-cycle is a **T3 effect** (physical, outward-visible) — it needs an explicit approval
  path and an audit receipt, not a silent trigger.
- Rate-limit power cycles hard (e.g. one per 15 min) so a retry loop cannot thrash the PSU.
- **FAIL-CLOSED stays FAIL-CLOSED.** Existing doctrine is local Qwen with no automatic cloud
  fallback. A remote path must not quietly become a cloud path when the desktop is down —
  that would convert a deliberate privacy boundary into a silent egress.

## 6. Behavior when the desktop is down

Doctrine says fail-closed, so the honest options are **queue** or **refuse** — never "silently
ask a cloud model instead."

Recommended: **tell the truth and offer.** *"The desktop is off. Want me to wake it (about 90s),
queue this, or answer with what I have locally?"* One message, three choices, no silent
substitution. That preserves the boundary while keeping it usable.

## 7. Open questions for Sean

1. **Remote from where?** Telegram/phone only, or a laptop/Mac too? Sean mentioned a Mac —
   clarify whether that means *reaching it from* a Mac, or running something *on* one.
   If a Mac is always-on, **it is the obvious relay host** and §4's open question closes.
2. Is 24/7 desktop power acceptable? If yes, most of §3 disappears.
3. Does the BIOS have the AC-power-loss setting? (§3 test — do this first, it is 2 minutes and
   it decides the shape of the build.)
4. Is a smart plug acceptable given the hard-power-cut caveat?

## 8. Build order (once §7 is answered)

1. Verify the BIOS power-on behavior — cheapest test, largest design impact.
2. Stand up the overlay network, desktop + relay host only.
3. Ollama as an auto-start service bound to the overlay interface.
4. Relay: health check + proxy. **No power control yet** — prove the path works while the
   machine is already on.
5. Add power-on with approval gate, receipts, and rate limiting.
6. Wire into Hermes with the down-state UX from §6.

Steps 1–4 are useful on their own: they give Hermes remote Qwen access whenever the desktop
happens to be on, which is most of the value at a fraction of the risk.
