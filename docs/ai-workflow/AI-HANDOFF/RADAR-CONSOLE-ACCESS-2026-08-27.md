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

## 5b. CORRECTION 2026-08-27 — "disable key expiry" did NOT close the risk

Hostile review by GLM-5.3 and GLM-5.3-Flash (both, independently) killed a claim made earlier in
this document and in chat. Recording it because the wrong version is the comfortable one.

**The claim that was wrong:** "Sean disabled key expiry, so the expiry trap is solved."

**Why it is wrong:** the *Disable key expiry* toggle is **per-registration state**, not a property
of the machine. Any future re-authentication — `tailscale up --force-reauth`, a logout/login, an
OS reinstall, a box migration, or an agent re-running `tailscale up` — creates a **fresh
registration with expiry re-enabled by default, silently**. The day-180 eviction is not closed;
it is one re-auth away, and it is now *worse* than before, because everyone believes it is fixed
and nothing is watching. A **tag** is the durable form of the same intent: tagged devices are
tailnet-owned and have no node-key expiry at all, and the property rides the registration.

**Where the risk actually lives** (also mispriced earlier): the ACL edit is `tagOwners` only,
which grants tag-*management* rights and moves zero packets under any sane policy. It is
connectivity-inert. The one operation with teeth is the **node-side re-auth**, and its mitigation
was already in hand and unstated: **LAN SSH is not governed by tailnet ACLs, so you run the
re-auth FROM the LAN session** and it cannot strand you.

### Verified preconditions (measured, not assumed)

| Fact | Value | Why it matters |
|---|---|---|
| `RunSSH` | `false` | Plain sshd, NOT built-in Tailscale SSH → no `ssh` stanza needed in the ACL |
| Tailnet Lock | **not enabled** | Would otherwise intercept the node-key rotation at re-auth |
| Non-default prefs | `Hostname=swan-radar`, `CorpDNS=false` | **The only two flags a re-`up` must restate** |
| `tailscale set --advertise-tags` | **does not exist on 1.102.3** | Flash's primary command is unavailable here; use `tailscale up` |

### Runbook (LAN session open throughout)

1. **Sean, in the ACL editor** — additive, version-history backed, connectivity-inert:
   ```json
   "tagOwners": { "tag:server": ["autogroup:member"] }
   ```
2. **From the LAN SSH session** (restating the two measured non-default prefs — a bare
   `tailscale up` would silently reset them):
   ```
   sudo tailscale up --advertise-tags=tag:server --hostname=swan-radar --accept-dns=false
   ```
3. Sean clicks the login URL once. Tailnet SSH sessions to the box drop for seconds; the LAN
   session survives.
4. **Verify:** `.Self.Tags == ["tag:server"]`, `.Self.KeyExpiry == null`, same Tailscale IP and
   DNSName, exactly ONE machine entry in the console, both `ssh radar` and `ssh radar-net` back.

**Rollback is asymmetric — do not skip this.** Untagging returns the node to user ownership via
another re-auth, and that new registration comes back with **key expiry ENABLED**. Rolling back
therefore *reopens* the original failure mode unless the toggle is re-applied immediately.

### Foot-gun to record before it bites

A tagged device is **not** in `autogroup:member`. The most common first real ACL anyone writes is
`src: ["autogroup:member"]` — the moment Sean tightens the policy that way, this box silently
loses *initiator* access (updates, outbound, monitoring) while still being reachable as a
destination. Silent, and typically found weeks later.

### Also raised and not yet done

- **Expiry watchdog.** If the tag is deferred, the minimum accompanying deliverable is something
  that checks `.Self.KeyExpiry` and shouts — otherwise "it's fine" is unmonitored belief.
- **Provisioning artifact.** The durable answer for future boxes is a **pre-auth key with
  `tag:server` baked in** (tagged at birth, no re-auth dance) — not prose ACL text.
- **Stale-device hygiene:** the tailnet still lists nodes 63d and 21d offline.
- **Do not browser-automate the admin console.** Both reviewers called it a category error: the
  console has an HTTP API and the box has a CLI.

## 6. Re-entry for the next agent

```
ssh radar 'hostname; uptime -p'                      # is it alive
ssh radar 'sudo tailscale status | head -3'          # tailnet joined?
ssh radar 'systemctl is-enabled ssh.socket tailscaled'   # both must say enabled
```

Do NOT re-derive the socket-activation question — §2 settles it with symlink evidence.
