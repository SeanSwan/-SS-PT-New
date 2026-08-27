---
decision: Radar box recovered from lockout and made SSH-drivable; remote-access plan inverted (GLM verdict) from desktop-first to web-console-first; SwanGuard chosen as radar's first tenant; GLM-5.3+Flash-5.3 produced a Qwen-ready build blueprint for SwanGuard increment INC-S1+V2+V3+S2h. CPU upgrade (Ryzen 5 5500) deferred pending BIOS flash.
status: open
supersedes: none
---

# Session handoff — Radar recovery -> remote-access rethink -> SwanGuard Qwen blueprint

**Date:** 2026-08-27 (ran ~midnight-2am PDT) - **Author:** vs-claude / Opus 4.8 - **Branch:** wip/comms-notifications-2026-07-05
**Read with:** project memory `project_radar_money_machine_2026_08_24`, `project_swanguard_newsroom_state`.
**Prime directive for next agent:** RE-VERIFY before acting — Tailscale state, xrdp state, and the box uptime all move.

---

## 0. What Sean asked for, in order (the arc of this chat)
1. "Set up Parsec so I can remote into the radar PC from my other computer" — drive it himself AND instruct AI from what he does.
2. (Mid-task) He was locked out — password rejected. Long recovery ordeal.
3. After recovery: rethink — "SwanGuard was going to use the radar PC; what about hosting that?"
4. Have GLM-5.3 + GLM-5.3-Flash produce an ULTRA-comprehensive build blueprint for SwanGuard so **Qwen 3.8 builds it verbatim** (Qwen must not think).
5. Found a spare Ryzen 5 5500 — is swapping it into radar worth it? (Decided: wait.)
6. This handoff.

---

## 1. RADAR BOX — verified facts (all measured this session)
- **Hostname:** radar - **LAN IP:** 192.168.50.20 - **OS:** Ubuntu 24.04.4 LTS (Noble)
- **Login user:** `sswan` (the ONLY human account; others are `radaragent` service acct + `resticbk` backup acct). **`sswan` has PASSWORDLESS sudo.**
- **Disk:** LVM — root = `/dev/mapper/ubuntu--vg-ubuntu--lv`; `/boot` is its own partition = `(hd0,gpt2)`. Kernel `6.8.0-138-generic`. **Not LUKS-encrypted** (a `cryptroot` device name in the initramfs is a stub, not encryption).
- **Hardware:** ASRock **X370 Taichi** - **Ryzen 5 1600X** (6c/12t) - **GTX 770** (Kepler, open **nouveau** driver — no NVENC, no CUDA) - RAM **DDR4-2133** (slow) - **BIOS P2.30 dated 2017-05-10** (launch BIOS — very old).
- **Tools present:** Tailscale 1.102.3 (LOGGED OUT), docker, git, node. **XFCE + xrdp installed this session then DISABLED.**

## 2. THE LOCKOUT and RECOVERY (so nobody repeats the 90-minute ordeal)
Sean's saved password was rejected at the console. Root cause was never a lockout (no fail2ban installed) — the password simply did not match. Recovered by editing boot:
- **This box has NO GRUB menu** — holding Shift/Esc drops to a bare `grub>` shell. `e` does nothing there. You must type boot commands manually:
  ```
  set root=(hd0,gpt2)
  linux /vmlinuz-6.8.0-138-generic root=/dev/sda2 rw init=/bin/bash
  initrd /initrd.img-6.8.0-138-generic
  boot
  ```
  (Kernel/initrd files live at the ROOT of gpt2, NOT under /boot/. Use Tab-completion.)
- **First failed attempt gotcha:** `init=/bin/bash` mounts root **read-only** AND sets **no PATH**. So `passwd` reported "not found" and changes would not save. The fix that worked:
  ```
  export PATH=/usr/sbin:/usr/bin:/sbin:/bin
  mkdir /mnt
  mount /dev/mapper/ubuntu--vg-ubuntu--lv /mnt
  chroot /mnt /usr/bin/passwd sswan
  ```
  -> "password updated successfully" -> `exec /sbin/init` / hard reboot -> logged in.
- **Lesson:** in that shell, use FULL paths (`/usr/bin/passwd`, `/bin/mount`) or `export PATH=...` first.

## 3. ACCESS ESTABLISHED (how the next agent drives radar)
- **From WSL:** `ssh -i ~/.ssh/id_ed25519_radar_backup sswan@192.168.50.20` — passwordless sudo works.
- **SECURITY DEBT (fix this):** the key added to `sswan` is the **reused `resticbk` backup key** (`id_ed25519_radar_backup`), added to save Sean typing at 1am. Rotate to a **dedicated radar key** and remove the shared one from `sswan`'s authorized_keys.
- **Also flagged:** the `resticbk` forced-command account is NOT chroot-jailed for SFTP — its key can READ the whole filesystem over SFTP (that is how `sswan` was discovered via `ls /home`). Scope it to the restic repo dir.

## 4. REMOTE-ACCESS PLAN — INVERTED BY GLM (important direction change)
Original plan: install a desktop (XFCE+xrdp) and Parsec/RDP into it. Findings that killed it:
- **Parsec cannot HOST on Linux** (discontinued years ago) + nouveau has no NVENC. Parsec-into-radar is impossible. Dead.
- **GLM-5.3 hostile review** (`docs/ai-workflow/AI-HANDOFF/GLM-RADAR-REVIEW-2026-08-27.md`) verdict: a desktop is the **wrong primitive** for this box — most exposed, least useful. **Invert to:** engines-as-systemd-units under a **non-sudo `radar-agent` user** + a **tailnet web console** (Caddy / `tailscale serve` + code-server + the existing brain-console/taste-console blueprints as the dashboard). RDP demoted to tier-2 break-glass, installed later on a hardened base.
- **Hardening REQUIRED before anything is left always-on/exposed:** (1) identity split — kill `sswan` NOPASSWD sudo, engines run as no-sudo user with secrets in root-owned `EnvironmentFile`/`LoadCredential`; (2) Tailscale ACL + tailnet lock + disable key expiry for radar; (3) firewall to `tailscale0` only (do NOT enable a default-deny ufw over LAN SSH while connected via LAN — it will lock you out); (4) GRUB/UEFI password + schedule LUKS (this session proved physical access = root); (5) verify xrdp patch level vs 2025 CVEs before ANY re-enable.
- **Current safe state:** xrdp STOPPED + DISABLED (it had been listening on `*:3389`, LAN-exposed). Tailscale LOGGED OUT (radar NOT on tailnet). One-time login link generated during session is expired — regenerate with `sudo tailscale up --hostname=radar` and have Sean click.

## 5. SWANGUARD = RADAR'S FIRST TENANT (the pivot Sean chose)
- SwanGuard (news + creator hub) is a **separate repo:** `%USERPROFILE%/Desktop/SwanGuard-Newsroom`, branch `merge/newsroom-mainline-v3` @ `745867e`. Monorepo: `apps/{api,web}`, `packages/{contracts,database,domain}`. Dev DB: `docker compose -p swanguard-newsroom -f docker-compose.dev.yml up -d` (Postgres 5434).
- **Why radar:** it wants to run 24/7 (news connectors); radar being **Linux UNBLOCKS the `apps/api` esbuild** step (Linux-ELF binary, dead on Sean's Windows checkout). It is also the low-risk first tenant (news, no PII/payments).
- Governance law (never relax): every outlet **born disabled**; `owner_enabled` flips via ONE owner-attributed route, actor from SESSION; reads must not write.

## 6. THE QWEN BUILD BLUEPRINT (the main deliverable — 3 docs, all in SS-PT `docs/ai-workflow/AI-HANDOFF/`)
Two-pass GLM authorship, then a merge. Cost **$0** (GLM z.ai subscription; needs `ZAI_API_KEY` in `.env`, loaded via `scripts/consult-glm.mjs`).
1. `SWANGUARD-QWEN-BUILD-BLUEPRINT-GLM53-2026-08-27.md` — GLM-5.3 architect draft (596 lines).
2. `SWANGUARD-QWEN-BUILD-BLUEPRINT-FLASH-HARDENING-2026-08-27.md` — GLM-5.3-Flash defect patch (8 blockers incl. a typo'd first command, a migration loop replaying 0001-0029, a router bug killing the main surface, pseudocode tests; +18 gaps, +6 acceptance fixes).
3. **`SWANGUARD-QWEN-BUILD-BLUEPRINT-FINAL-2026-08-27.md`** <- **HAND THIS TO QWEN** (931 lines, self-contained, all Flash fixes folded in — verified: SanGuard typo gone, B2/B3/B8/G2 confirmed present, first command intact).
- **Scope `INC-S1+V2+V3+S2h`:** ship the `/owner` console inside `RootApp` behind `AuthGate` (it currently only exists in tests, never production — the App.tsx/RootApp divergence) + orphan reaper (404 both directions) + kill-switch seeding -> migration `0030` (reads stop writing) + licence `feed_set_hash` binding for the 39 outlets.
- Structure: 19 resolved decisions, STOP-gated Step-0 fact table (F1-F16), exact `0030` SQL, Steps 0-11 with per-step artifact acceptance, RootApp drift-killer test, E1-E9 built-preview e2e, Qwen execution protocol + governance laws, radar serve runbook. **Runs on radar** (needs tailnet access first). Verified as a COMPLETE PLAN — the code is NOT built; the blueprint's own tests prove it when Qwen runs.
- Forward roadmap after this increment: S3a probe spec -> S3b identity/licence for 107 -> S4 freeze/provenance -> S5 seed+live batch -> S6 loadgen -> S7 wiki module -> S8 claim extraction -> S9 clustering/syndication -> S10 disagreement map.

## 7. CPU UPGRADE — Ryzen 5 5500 (DECIDED: WAIT)
- 5500 (Zen 3, 6c/12t, 65W) vs current 1600X (Zen 1, 6c/12t, 95W): **~+50% single, ~+55% multi, lower 24/7 power.** Free (Sean owns it), same AM4 socket.
- **BLOCKER: BIOS.** Current BIOS P2.30 (2017) is far too old for Zen 3 — the 5500 will not POST. Must flash X370 Taichi to latest (P6.40-era, confirm it lists Ryzen 5000 / **Cezanne**) **WHILE the 1600X is installed** (Taichi has no USB Flashback), THEN swap. Keep the GTX 770 (5500 has no iGPU; board needs a GPU to POST). Enable DOCP after (RAM is at 2133; can hit 3200).
- Payoff area: faster builds (the Qwen SwanGuard loop). Not urgent. ~30-min job + small BIOS-flash brick risk.

## 8. OPEN ITEMS / NEXT STEPS (Sean said "there is more stuff I wanna do")
1. ~~**Get radar on the tailnet**~~ — IN PROGRESS 2026-08-27: joined as **`swan-radar`**, detached login held open, awaiting Sean's auth click. See `RADAR-CONSOLE-ACCESS-2026-08-27.md`.
2. **Decide desktop vs web-console** — GLM says web console; confirm with Sean.
3. **Hardening pass** (section 4 list) BEFORE anything is left always-on/exposed. Identity split first.
4. **Hand FINAL blueprint to Qwen** to build SwanGuard `INC-S1+V2+V3+S2h` on radar (needs #1 + a Qwen runner on the box).
5. ~~**Rotate the reused SSH key**~~ — **CLOSED 2026-08-27**: dedicated `id_ed25519_radar` issued, reused backup key revoked from `sswan` (proven denied). `resticbk` SFTP jail is STILL OPEN. See `RADAR-CONSOLE-ACCESS-2026-08-27.md` §4.
6. **Later:** BIOS flash + 5500 swap.
7. Wire SwanGuard's `StoryNode` output to both SwanGuard + the Hermes briefing (per `SESSION-HANDOFF-HERMES-RADAR-SWANGUARD-2026-08-20.md`).

## 9. HOW TO RE-ENTER (fast)
- **Console: desktop icon `Swan Radar Console`, or `ssh radar` (LAN) / `ssh radar-net` (Tailscale) from any Windows terminal.** Full map: `RADAR-CONSOLE-ACCESS-2026-08-27.md`.
- (superseded) the old WSL-only `-i ~/.ssh/id_ed25519_radar_backup` path no longer authenticates — that key was revoked 2026-08-27.
- Check state first: `tailscale status`, `sudo systemctl is-enabled xrdp`, `sudo ss -tlnp | grep 3389`.
- The blueprint + GLM review docs are all in `docs/ai-workflow/AI-HANDOFF/` dated 2026-08-27.
