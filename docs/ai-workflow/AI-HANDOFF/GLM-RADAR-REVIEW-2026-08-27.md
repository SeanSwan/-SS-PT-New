# GLM Consult

**Model:** glm-5.3
**Document:** C:/tmp/radar-remote-access-review-packet.md
**Tokens:** 1373 in / 16357 out (reasoning: 13007) | total 17730
**Wall:** 366.1s

---

# HOSTILE REVIEW — Radar Remote-Access Plan

**Bottom line up front:** The plan correctly kills Parsec and correctly picks Tailscale as transport. It then installs the wrong primitive (a desktop as the primary seat) behind a root-listening service, on a box with passwordless sudo, no identity separation, and no tailnet ACL — i.e., it secures the front door while the house has no interior walls. The Parsec analysis is right; the xrdp-first priority is wrong; the hardening list is missing entirely from the plan.

---

## FINDINGS, RANKED

**F1 — xrdp is a root-listening daemon with fresh pre-auth RCE history, on a box where root = restic key.**
The xrdp listener runs as root. July/August 2025 xrdp security releases fixed pre-auth-exploitable memory corruption (CVE-2025-32513 class, fixed upstream in 0.10.2; Noble ships 0.9.x — **you must verify the USN patch level before the port ever opens**). One patch lapse or 0-day = root on the money machine, no sudo needed. And even without an xrdp bug, see F2.

**F2 — No identity separation: operator = admin = agent runtime = passwordless sudo.**
The RDP login user (`sswan`) is the same user that runs the autonomous engines and has NOPASSWD sudo. An agent mistake, a pwned pip dependency, or a curious model with shell access = root + backup repo password. This is the worst hole in the whole picture and it's one sudoers file + unit files to fix.

**F3 — "Scoped to Tailscale" is currently fiction.**
Tailscale is *logged out* right now, the default tailnet ACL is allow-all-devices-to-all-ports, and there's no tailnet lock. The scoping doesn't exist until ACLs are written. Also don't rely on xrdp `address=` binding alone (races tailscaled at boot); scope with the firewall on `tailscale0`.

**F4 — Wrong primitive for the stated goal.**
"Watch and steer engines + teach the AI" is served by processes and event streams, not by pixels of an XFCE desktop. A desktop is the most expensive, highest-attack-surface seat you can build for this. Detail in Q3.

**F5 — Tonight literally demonstrated physical access = root, and the disk is unencrypted.**
GRUB `init=/bin/bash` worked. The restic password sits at rest readable by root, which anyone with a keyboard gets. GRUB/UEFI passwords are a 20-minute mitigation; LUKS (TPM2 auto-unlock or dropbear-initramfs over tailnet) is the real fix and should be scheduled, not skipped.

**F6 — Installing a root listener at 1am on a box that had initramfs surgery hours ago.**
Check `/boot` space (full /boot is the classic cause of the exact breakage you had), run `dpkg --audit`, take an LVM snapshot or a restic run of `/etc` + `/home` *before* `apt install` anything. The desktop can wait for daylight. Process discipline is a security control.

**F7 — GPU economics: the GTX 770 is a liability.**
Kepler on nouveau cannot reclock memory — it idles hot, burning watts 24/7 on a box whose purpose is margin. And it has no CUDA under nouveau (and the 470-legacy proprietary path is fragile on 6.8+ kernels, CUDA 11.4 = dead for modern stacks). It cannot run ComfyUI locally anyway. Pull the card or accept the tax; do not chase drivers for it.

**F8 — RustDesk follow-up is scope creep with a false premise.**
RustDesk is fine software but it's a second always-on access stack with its own update channel and relay, redundant with xrdp-on-tailnet. And "Parsec-grade latency" is oversold — RustDesk is a solid admin desktop, not a game streamer. If interactive feel ever matters: NoMachine first, Sunshine+Moonlight (vkms virtual display + software x264) for true low latency.

**F9 — The self-signed cert warning will train you to click through TLS warnings.**
Generate a real cert for xrdp on day one (Tailscale can issue one for the box's tailnet name). Also disable clipboard/drive-redirection channels by default — they're an exfil path between your laptop and the agent box, and historically a bug surface.

**F10 — Nobody watches the watcher.**
No external heartbeat, no reboot/update policy, and Tailscale key expiry will silently brick access to a server node in ~180 days (disable expiry for radar + calendar note). Single break-glass device = your laptop; add the phone with Tailscale + a terminal app.

---

## Q1 — Is xrdp+Tailscale right? Ranked for the dual goal

**Parsec confirmation:** Yes, with nuance. Consumer Parsec on Linux is client-only; a Linux *host* binary existed for Arcade/partner deployments and is not available to you. And Kepler's NVENC exists in silicon but is unusable under nouveau. Parsec-into-radar: correctly dead.

| Rank | Option | Verdict for "drive it" | Verdict for "teach the AI" |
|---|---|---|---|
| **1** | **Tailscale + SSH + tmux/zellij + VS Code Remote-SSH (or code-server)** | Covers ~85%: edit, `systemctl`, logs, engine control. Zero new daemons. | Best substrate — consoles and event capture are text/web native. |
| **2** | **xrdp + XFCE, firewalled to `tailscale0`** | Right *fallback*: browser OAuth consents, GUI-only tools, break-glass. mstsc is already on your Windows box. | Weak — pixels don't feed a learning pipeline. |
| **3** | **NoMachine** | Best interactive feel of the general-purpose options; free personal tier; proprietary daemon. Pick only if xrdp annoys you. | Same weakness. |
| **4** | **Sunshine + Moonlight** | The *actual* low-latency path; needs vkms dummy display + CPU software encode. Overkill — there's no gaming or media target here. | N/A. |
| **5** | **RustDesk** | Redundant second stack. Cut. | N/A. |
| **6** | **TigerVNC over SSH** | Dominated by 1 and 2 for your client ecosystem. | N/A. |

Note: gnome-remote-desktop has a headless RDP mode on 24.04 (grdctl) — rougher than xrdp, no reason to prefer it. Note also: **ComfyUI is browser-based** — it never needed a desktop; you browse it from the laptop over tailnet.

**Answer:** xrdp+XFCE is *acceptable as tier-2*, wrong as tier-1. Tier-1 is SSH/web.

---

## Q2 — Attack surface + mandatory hardening, in order

**Surface:** root xrdp listener (F1) → PAM auth with your password → session user with NOPASSWD sudo → agent env containing secrets. Plus Tailscale control plane (account compromise = tailnet entry unless locked/ACL'd). Plus physical (proven). Plus the agent's own egress pipe — the plan polices the human door and ignores that the agent already has an authenticated API channel; that's F2 territory.

Do these **before** 3389 exists, in order:

1. **Identity split.** `radar-agent` user (nologin, no sudo) runs engines via systemd `User=`; `sswan` gets *passworded* sudo (edit sudoers, drop NOPASSWD — one line). Engines' secrets in root-owned `EnvironmentFile=/etc/radar/*.env` (0600) or systemd `LoadCredential=`, never in interactive shell env.
2. **Tailscale ACL first.** `tailscale up` with `tag:radar`; ACL: your devices → `tag:radar` tcp 22,3389,443 only; enable **tailnet lock**; disable key expiry for radar; MagicDNS. Sketch: `{action: "accept", src: ["sean-laptop", "sean-phone"], dst: ["tag:radar:22,3389,443"]}`.
3. **Firewall, not bind.** `ufw default deny incoming`; `ufw allow in on tailscale0 to any port 22,3389 proto tcp`; nothing else. Verify from the LAN with nmap that 3389 is dark.
4. **xrdp posture.** Verify patch level against the 2025 USNs before install. Generate a real cert (`certificate=`, `key_file=`), `security_layer=tls`, disable channels: `[Channels]` → `cliprdr=false`, `rdpdr=false`, `drdynvc=false`. Never autologin. `pam_faillock` (deny=5) — **fail2ban on a tailnet-only port is theater**, skip it.
5. **Physical.** GRUB superuser password + UEFI admin password + no USB boot. Schedule LUKS2 with dropbear-initramfs unlock over tailnet (or TPM2). Interim: restic password moves to a root-only systemd credential, not a file in sswan's tree.
6. **OS hygiene.** unattended-upgrades (security pocket only), pin engine deps per-venv, mask sleep/suspend targets, ensure persistent journald, external heartbeat (F10).

---

## Q3 — The actual wiring: "log in" → "watch and steer"

A full XFCE desktop is **not** the right primitive. The higher-leverage move, concretely:

- **Layer 0 — identity:** tailnet; your laptop is the operator; phone is break-glass.
- **Layer 1 — processes:** every engine = a systemd unit (`radar-engine@.service` template) + timers for collectors, run as `radar-agent`. The install interface for the consulting product is literally the root-owned `EnvironmentFile` — this *is* your 4-env-var acceptance story.
- **Layer 2 — surface:** Caddy (or `tailscale serve`) on `tailscale0:443` with tailnet TLS, fronting:
  - `/` — **deploy your brain-console/taste-console blueprints as this dashboard** (don't build new; you already designed it): per-engine cards — status, last run, last error, "Make" armed flag.
  - `/code` — code-server (this + SSH replaces 90% of any RDP need).
  - `/seat/glm|ox|grok|kimi|sol|fable|gemini` — each consult seat running always-on as a unit (ttyd or their web endpoints).
  - `/comfy` — ComfyUI, straight from your laptop browser. No desktop involved.
- **Layer 3 — feedback:** ntfy topics — `radar-alerts` (wake you) and `radar-digest` (morning: money moved, engines ran, decisions pending). Steering = approve/decline on the dashboard, from the phone if needed. **"Make" arming itself becomes a two-click approval in the console instead of a desktop ritual.**
- **Layer 4 — teaching loop (the half the plan ignores entirely):** on radar, interactive shells source a `profile.d` hook that journals timestamped, identity-scrubbed commands to `~radar/learning/YYYY-MM-DD.md` → your **Hermes learning packet** builder ingests it → the **Phase-2 operator-identity rewriter runs as the packet gate** (reuse the pre-commit gate logic). That is literally "instruct AI based on what I do," wired from your last 30 commits. Optional richer capture: `script -t` or wf-recorder of RDP sessions into the same queue.

Desktop keeps exactly two jobs: browser OAuth consents and GUI-only tools. Tier-2, installed later, hardened per Q2.

**Product note:** the sellable artifact is engines + env-file interface + web console + one-line install. Remote access is a *deployment doc* (bring your own tailnet). An RDP-first radar bakes your personal seat into the product; web-first keeps it installable in a weekend.

---

## Q4 — Blind spots

- **The engine has never run outside WSL** — radar is where it finally runs. That argues for systemd-first, not desktop-first; you're provisioning a cockpit, not a den.
- **RAM check** before XFCE + browser + engines coexist (`free -h`).
- **Update/reboot policy** for an always-on box; SwanGuard must heartbeat radar *itself* externally.
- **Tailnet key expiry** silent-bricks server nodes; disable for radar.
- **Clipboard = exfil**; default off, enable consciously.
- **1am discipline:** snapshot → verify `/boot` and dpkg state → daylight for the DE.
- **GPU removal decision** (F7) — this changes the power bill of the "sleep-money" thesis.
- **Waste-of-time list:** RustDesk (F8), fail2ban-on-tailnet, any NVIDIA driver archaeology for Kepler.

---

## REQUIRED ENDING

**(a) KEEP/CHANGE:**
- **KEEP:** Parsec-is-out analysis (confirmed). Tailscale as transport. xrdp+XFCE as an *eventual tier-2 GUI seat*.
- **CHANGE:** Invert the primitive — engines-as-services + tailnet web console as the primary seat. Identity split + tailnet ACL **before any listener exists**. Drop RustDesk. Schedule LUKS.

**(b) Single highest-value change:**
**Don't install a desktop tonight; build the cockpit instead.** One sentence: engines as systemd units under a no-sudo `radar-agent` user + code-server/dashboard on tailnet-scoped Caddy, with RDP demoted to break-glass installed later on the hardened base. This one change simultaneously shrinks the attack surface (no always-on root listener as the primary interface), serves both stated goals, and produces the sellable artifact.

**(c) Wiring Sean's recent work to radar:**
- **Consult seats (glm/ox/grok/kimi/sol/fable/gemini):** each becomes an always-on systemd unit at `/seat/<name>` on the console. Env var per seat = the 4-env-var install interface.
- **taste-brain / "Make" arming:** becomes the dashboard approval card — arm from laptop, approve from phone.
- **Launchers (15 wired):** the launcher manifest becomes the dashboard's card registry — same catalog, one registry, two front-ends.
- **Hermes learning packet + privacy Phase 2 rewriter:** becomes the operator-journal pipeline in Layer 4 — the teaching loop, with identity scrubbing enforced at the packet gate, not just at git commit.
- **brain-console/taste-console blueprints:** deploy them *as* the dashboard instead of building something new.
- **ComfyUI:** served over tailnet web; no desktop, no GPU heroics needed.
- **Sessions/pricing fixes:** stay app-side; radar's collectors consume those endpoints through the scoped `/api/agent` principal — which is exactly why the agent identity must not share a user with your sudo.
