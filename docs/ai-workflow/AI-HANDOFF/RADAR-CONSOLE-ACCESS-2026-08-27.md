---
decision: Radar console access made one-click from Sean's Windows PC via a dedicated SSH key + ssh config alias + desktop launcher; the reused restic backup key was revoked from sswan; boot-persistence of sshd and tailscaled was VERIFIED by on-disk systemd symlinks (no change needed); radar joined the tailnet as swan-radar pending Sean's auth click.
status: open
supersedes: none
---

# Radar console access — the operating page

**Date:** 2026-08-27 · **Author:** vs-claude / Opus 5 · **Box:** radar (Ubuntu 24.04, 192.168.50.20)
**Parent handoff:** `RADAR-SWANGUARD-SESSION-HANDOFF-2026-08-27.md` (this closes its open items #1 and #5)
**Related:** `GLM-RADAR-REVIEW-2026-08-27.md` (hardening verdict) · `SWANGUARD-QWEN-BUILD-BLUEPRINT-FINAL-2026-08-27.md` (what radar will run)

---

## 1. How Sean opens a console (the whole answer)

**Desktop icon → `Swan Radar Console`.** It probes the LAN first, falls back to Tailscale,
and drops him at a shell. Nothing else to remember.

From any terminal, equivalently:

```
ssh radar        # LAN  — 192.168.50.20, fast, home only
ssh radar-net    # Tailscale — swan-radar, works from anywhere
```

| Piece | Path |
|---|---|
| Dedicated key | `~/.ssh/id_ed25519_radar` (Windows home — usable by both Windows ssh.exe and Git Bash) |
| SSH config | `~/.ssh/config` — defines `Host radar` and `Host radar-net` |
| Launcher | `scripts/launchers/Radar-Console.ps1` |
| Desktop shortcut | `%USERPROFILE%\Desktop\Swan Radar Console.lnk` |
| Login auto-open | `…\Start Menu\Programs\Startup\Swan Radar Console.lnk` (passes `-AtLogin`) |

**At Windows login a radar console opens automatically** (Sean's choice 2026-08-27), joining
`Hermes2-Gateway-Start.cmd` and `Start-Swan-Plaud-Official-Sync.cmd` in the Startup folder.

The `-AtLogin` switch exists because at login the network stack and Tailscale are usually not up
yet. Without it the launcher would probe once, fail, and announce radar unreachable when the box
is perfectly fine. With it the launcher retries 6 times at 10s intervals (~60s of grace) before
giving up; the desktop icon keeps the fail-fast single-probe behaviour so it never hangs.
Verified both paths: `-AtLogin` → 6 rounds / 12 probes then guidance; no flag → 2 probes, exits.

## 2. Boot persistence — VERIFIED, nothing was needed

The concern was "does it come back by itself after a power cycle." It does. Evidence is the
on-disk systemd symlinks, which are literally what systemd reads at boot:

```
/etc/systemd/system/sockets.target.wants/ssh.socket        -> /usr/lib/systemd/system/ssh.socket
/etc/systemd/system/multi-user.target.wants/tailscaled.service -> /usr/lib/systemd/system/tailscaled.service
```

**Read `ssh.service = disabled` correctly — it is not a problem.** Ubuntu 23.10+ moved OpenSSH to
socket activation: `ssh.socket` holds port 22 at boot and *triggers* `ssh.service` on the first
connection. `systemctl status ssh.socket` confirms `Triggers: ● ssh.service` and
`Listen: 0.0.0.0:22`. An agent that "fixes" this by running `systemctl enable ssh.service` is
solving a non-problem and creating a double-bind on port 22.

Also verified: sleep/suspend/hibernate targets are `static` (not enabled) and `logind` is at
defaults, so the box will not suspend itself out from under a remote session.

Tailscale login state lives in `/var/lib/tailscale/tailscaled.state` (root-only, 0600) and
survives reboots — once authed, radar rejoins the tailnet on its own.

## 3. Tailscale identity — named to be unmistakable

Sean's tailnet before this change:

```
desktop-o9fec42   windows   (this PC)      swan-hermes      linux    offline 63d
miniswan          windows   offline 1d     swanstudios2018  windows  offline 4d
iphone-xr         iOS       offline 21d
```

`desktop-o9fec42` is exactly the auto-generated name problem Sean flagged. Radar joins as
**`swan-radar`** — matching the existing `swan-*` convention so it is obvious in the picker and
sorts next to `swan-hermes`.

Started with: `sudo tailscale up --hostname=swan-radar --accept-dns=false`
(`--accept-dns=false` keeps radar's DNS resolution local; it does not affect reachability.)

## 4. Security debt CLOSED this session

The prior session had added the **reused `resticbk` backup key** to `sswan` to save typing at 1am.
That is now revoked, with proof in both directions:

- new dedicated key → `CONNECTED as sswan@radar` ✔
- old backup key → `Permission denied (publickey,password)` ✔

`sswan`'s `authorized_keys` now holds exactly two entries: Sean's own GitHub-imported key and the
new `swan-radar-console-20260827` key. Backup of the previous file is at
`~/.ssh/authorized_keys.bak.20260827` on radar.

## 5. Still open — Sean-owned

1. **Click the auth link** (one time): the pending login is held open by a detached
   `tailscale up` on radar. If it lapses, regenerate with the exact form below — verified
   working 2026-08-27:

   ```
   ssh radar 'sudo pkill -f "tailscale up"; sleep 2;
              sudo setsid nohup tailscale up --hostname=swan-radar --accept-dns=false > /tmp/ts-up.log 2>&1 < /dev/null &'
   ssh radar 'sudo tailscale status | head -3'    # read the fresh URL
   ```

   **The `pkill` first is not optional — it is a trap I hit this session.** A `tailscale up`
   waiter from the *previous* session was still alive 11 hours later, still carrying the OLD
   `--hostname=radar`. Two waiters against one daemon means whichever completes last can rewrite
   the hostname, so radar could have registered under the wrong name after the click. Always
   `pgrep -af "tailscale up"` and kill strays before starting a new one, then confirm
   `sudo tailscale debug prefs | grep Hostname` says `swan-radar` and exactly one waiter is up.
2. **Stop the node key from expiring.** Tailscale node keys expire ~180 days by default; on a
   headless box that means remote access silently dies with keyboard-at-the-box as the only
   recovery. Two ways, and the better one was already written down before I missed it:

   - **Preferred — join with a tag.** SWA-199's next-action #1 says to join *with a tag at join
     time* and fix the zero-tag flat tailnet. **Tagged devices do not expire**, so the tag retires
     this whole class of problem instead of relying on a per-machine toggle nobody remembers on
     the next box. Requires defining e.g. `tag:server` with a `tagOwner` in the tailnet ACL first,
     then `sudo tailscale up --hostname=swan-radar --advertise-tags=tag:server`. **I joined
     without the tag — that was a miss against a plan this repo already held.**
   - **Fallback — manual toggle.** Admin console → Machines → swan-radar → ⋯ → Disable key expiry.
     Works, but is per-machine and easy to forget.
3. **BIOS "Restore on AC Power Loss" → Power On** — cannot be set from the OS. Without it, a power
   blip leaves radar off until someone presses the button. Worth doing during the BIOS flash for
   the Ryzen 5 5500 swap (parent handoff §7), since that trip is already planned.
4. **Still deferred from the parent handoff:** the `resticbk` account is not SFTP-jailed and can
   read the whole filesystem; `sswan` still has passwordless sudo. Both are on GLM's hardening
   list and neither is closed by this session.

## 6. Re-entry for the next agent

```
ssh radar 'hostname; uptime -p'                      # is it alive
ssh radar 'sudo tailscale status | head -3'          # tailnet joined?
ssh radar 'systemctl is-enabled ssh.socket tailscaled'   # both must say enabled
```

Do NOT re-derive the socket-activation question — §2 settles it with symlink evidence.
