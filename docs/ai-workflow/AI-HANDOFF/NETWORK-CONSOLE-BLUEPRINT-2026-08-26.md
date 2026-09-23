# Swan Network Console — Merged Blueprint v1

**Date:** 2026-08-26 · **Status:** plan complete, Slice 0 not started · **Owner:** Sean
**Sources:** `netconsole-OX-PLAN.md` (Ox Alpha, $0.00, 9633 tok) · `netconsole-GLM-5.3.md` (GLM 5.3, 19518 tok) · `netconsole-OX-ALPHA.md` (Ox's hostile review of the brief) · brief at `docs/ai-workflow/brainstorms/network-master-console-2026-08-26.md`
**Total panel spend: ~$0.**

---

## 0. The one-line truth

**You become king of the METADATA, not king of the data.** ~70% of the ask ships on existing hardware in ~2 weeks of evenings; ~95% with one ~$200 purchase; the last 5% (content of encrypted traffic) is a consent decision, gated OFF by design. Any plan that claims otherwise is lying — neither of these does.

---

## 1. My brief was wrong, and both seats corrected it

I wrote that a Merlin-less GT6 "probably can't give a tap," forcing DNS-only or extra hardware. **Wrong.** Stock AsusWRT ships **SSH**, and supports **Entware-on-USB**. `tcpdump` on the router's WAN interface *is* the tap. I conflated "no custom firmware" with "no shell." This was load-bearing and would have mis-shaped the whole architecture.

**Honest limit Ox attached to it:** the GT6 saturates at **~200–400 Mbps of captured traffic**. Mitigation is aggressive BPF (drop broadcast/multicast/mDNS), `-s 256` snap length, WAN-side only, 1-in-N sampling above threshold, and auto-throttle when router load > 0.7. Budget ≤15% router CPU sustained.

---

## 2. Convergence — both seats independently

1. **The router is a sensor and actuator, never the brain.** Zero persistent state on the GT6.
2. **radar box (always-on Ubuntu) is the collector host — NOT the Pi.** The Pi stays out of the critical path until its powered hub arrives, then becomes redundant DNS only. *Nothing load-bearing on miniswan — "a Windows update takes it down."*
3. **radar is not on Tailscale.** Fix in Slice 1; it's the only always-on Linux box off the mesh.
4. **AdGuard Home on radar at `192.168.50.53`** + one GT6 DHCP change = per-device DNS visibility for the entire network with zero packet plumbing. **This is the 90/10 win.**
5. **Probe `appGet.cgi` before any code.** Undocumented API, no stability contract; commit captured responses as fixtures — they become the parser contract and the drift tripwire.
6. **`SourceAdapter` interface** with a capabilities array so the console is not welded to ASUS; UI auto-hides what the adapter can't do.
7. **MITM content interception OFF by default**, behind an explicit consent gate.
8. **~$30–35 managed switch with a mirror port** unblocks true flow records.

---

## 3. Divergence — take both

| Topic | Ox | GLM | Take |
|---|---|---|---|
| Storage | **TimescaleDB** hypertables, ~4:1 compression | Plain PG16, daily partitions, BRIN on ts | **Timescale.** Compression matters at 350–500k flows/day; BRIN strategy still applies |
| API discovery | Live probe with session cookie | **Download ASUS GPL source tarball, grep the `appGet` hook table** | **Both — GPL grep first.** Enumerates every hook without touching the router |
| Capture path | Full `tcpdump`-on-router spec | Treats tap as Slice-5 switch purchase | **Ox's** — it answers "combine router + Wireshark" literally, today, for ~$8 of USB stick |
| Feature model | 3 tiers + additions | **55 features, V/Eff/GT6/Phase columns** | **GLM's table** as the backlog; graft Ox's 6 additions in |

---

## 4. Features neither of us had thought of (keep all)

**Ox:** WiFi association history ("was the iPad on at 2am?") · screen-time rollups by category · **"ask-to-unblock" — kid hits blocked page → Telegram button to Sean → one-tap 30-min grace** (huge domestic-peace value) · router health watchdog · policy config export/import as versioned JSON in git · **offline-device timeline so forensics gaps are honest**.

**GLM:** device-left-home detection · daily time budgets · ISP SLA report · weekly digest · DNS-bypass detection · VPN/proxy evasion detection · holiday-calendar schedule override · DNS-quarantine for unknown devices · auto-expiring friend passes · router config backup with diffs · Tailscale panel · dual-WAN status · CVE-lite tracking · **on-demand "capture 60s PCAP" button** that opens in Wireshark.

---

## 5. Architecture (merged)

| Host | Runs | Why |
|---|---|---|
| **GT6** (stock) | SSH + Entware-on-USB: rotated `tcpdump`, syslog→radar. Nothing else. | Only ground-truth L2/L3 source; zero persistent state |
| **radar** (Ubuntu, always-on) | `swan-net-collector` (Node 20/TS), **AdGuard Home**, **PG16 + TimescaleDB**, `tshark` batch processor, nmap sweep, Telegram sender | Always-on Linux; add Tailscale in Slice 1 |
| **miniswan** (.92) | Dev seat, Wireshark seat, fixture recorder. **Nothing production.** | Reboots unpredictably |
| **Pi 4** (.232) | Future secondary AdGuard (redundancy only) | Blocked on powered hub — documented, non-blocking |

**Acquisition:** DNS tap (AdGuard, per-client native) · router JSON tap (`appGet.cgi`, 30s poll, session cookie, **poll-rate ceiling + circuit breaker — the monitor must never take down the network**) · packet tap (`tcpdump -i eth0 -G 900 -W 96 -s 256 'not broadcast and not multicast and not port 5353'` → rsync to radar every 15 min → `tshark` → JSONL → Timescale COPY) · nightly nmap + ARP reconcile.

**Package:** `@swan/console-net` — `<NetConsoleProvider apiUrl wsUrl authToken theme role featureFlags={{ mitm: false }}>`. Roles: `operator` | `observer` | `household-adult`. UI renders disabled states; **backend enforces**.

**Storage:** ~55k DNS queries/day, ~350–500k flows/day, 15 devices → **~8 GB per 30 days**. Raw flows age out at 30 d; 5-min rollups carry 730 d. *"Naive designs die by keeping raw flows forever — 73 GB/year, query planner collapse."*

---

## 6. Hard constraints to design around (from both hostile passes)

- **Identity drift is the silent killer.** Phones randomize MAC per-SSID; IPs change on lease renewal; DNS logs are IP-centric, router is MAC-centric, flows are IP/port-centric. **Declare MAC-primary with randomization detection and a manual-merge UI. Forbid IP as identity anywhere in the schema.** Every per-device feature breaks silently otherwise.
- **"Block in <5s" ignores conntrack.** A firewall rule does not terminate established TCP/QUIC sessions. Requires an explicit connection-flush step; measure real latency in Slice 0.
- **Enforcement is bypassable:** hardcoded 8.8.8.8, browser DoH, iOS Private Relay, VPN apps, and **cellular data entirely**. DNS gets ~85–95% of *fixed-device* lookups and ~0% of a kid's cellular hours. Detection is buildable; **enforcement needs the OPNsense/Merlin hardware path.**
- **Console is a privilege-escalation appliance** — aggregates inventory + metadata + router credentials + actuation. Server-enforced auth, credentials sealed outside the DB, per-action CSRF.
- **SSRF by design** in "any router brand" — pin to configured hosts, never free-form runtime URLs.
- **DHCP hostnames are attacker-controlled** → stored XSS. Strict charset validation + parameterized writes.
- **Alerts must carry device-IDs + severity codes only** — never hostnames/domains. Otherwise Telegram exports a minor's browsing metadata to a third-party cloud (Rule 8).
- **Degraded-by-design, mark now:** SNI inventory and geo-mapping decay as ECH rolls out. Don't ship dashboards of zeros.
- **Alert budget: max 4 categories, digest the rest.** 20 buzzes/day = muted by week two = shelfware.
- **Three clocks** (router / collector / browser). Name the NTP authority, store schedules in UTC, or bedtime is off by an hour on a DST boundary.
- **Single-observer paradox:** the monitor blinds itself exactly when forensics matter (router reboot, ISP outage). Hence the offline-device timeline.

---

## 7. Governance as config, not lecture

`household.yaml`, editable in Settings → Household:
- **Adults default to aggregate-only** (totals, no domain lists). Raising to full requires a recorded `consent` entry with timestamp + a persistent household banner + auto-emailed weekly digest — *disclosure as an automatic artifact, not a conversation to remember.*
- **Minors:** full metadata, schedules, budgets — ordinary parenting on your own network.
- **Deliberately NOT captured:** packet contents, message bodies, keystrokes, screenshots, TLS interiors. Enforced structurally — no MITM component deployed unless the gate opens.
- **Append-only hash-chained operator audit log** `(ts, actor, action, target, before, after, prev_hash, hash)`. *"Parents can be audited too — that's the point."*
- **AiProtection shares metadata with Trend Micro cloud** — surfaced on the Settings screen so it's a knowing choice.

---

## 8. Delivery

| Slice | Ships | Gate |
|---|---|---|
| **0 — Probe** (~90 min) | GPL-source hook grep · `appGet.cgi` auth + client list + block command · **measured block latency incl. conntrack** · syslog→radar · fixtures committed · Wireshark on miniswan | P1–P4 answered in writing. **No code before this.** |
| **1 — Console v0** (1 evening) | Device inventory, live WAN totals, pause button, new-device Telegram alert, collector watchdog, **Tailscale on radar** | Open phone → see every device → pause the TV → get pinged when an unknown iPad joins |
| **2 — DNS layer** | AdGuard on radar, per-device query log + search, blocklists, kid allowlist, SafeSearch, outage + lease history | Kid device cannot resolve non-allowlisted domain; every other device's browsing visible |
| **3 — History & reports** | Rollups, per-device bandwidth, leaderboard, latency/speedtest/SLA, weekly digest, forensics-lite | p95 load tests; digest emails Sundays |
| **4 — Policy & governance** | Schedules, budgets, bedtime macro, ask-to-unblock, quarantine, friend passes, RBAC, audit chain, `household.yaml` | Quota tests green; audit tamper test green; spouse device renders aggregate-only |
| **5 — Tap** (~$8 USB stick, or $35 switch) | Router `tcpdump` → tshark → flows, SNI inventory, true per-device bandwidth, geo map, PCAP button | Flow volume matches §5 math ±2×; PCAP opens in Wireshark |
| **6 — Security** | IPS ingest, port-forward/UPnP audit, bypass + VPN detection, config backups, CVE-lite | Bypass detection green against real Android/iOS |
| **7 — Packaging** | npm package, adapter contract suite, demo harness, docs | `pnpm demo` runs cold in <2 min on a fresh machine |

---

## 9. What Sean will be disappointed by (say it now, not in week two)

- **"I still can't see what they said on TikTok."** Correct and unfixable honestly. `TikTok 3.4h` is the ceiling.
- **SNI is coarse** — two hours of Discord and a game update can look similar. App taxonomy gets ~80%, never 100%.
- **Cellular + VPN apps are the obvious countermove.** Detected, not blocked, without the hardware path.
- **Trend Micro paradox** — the deepest category filtering on stock firmware requires shipping household metadata to a vendor cloud.

**GLM's closing line, verbatim:** *"If the goal is actually 'know everything the kids' phones do,' the $180–250 OPNsense box is not optional — say this to Sean in those words."*

---

## 10. Shopping list

| Item | Cost | Unlocks |
|---|---|---|
| USB stick for Entware on GT6 | ~$8 | Router-side `tcpdump` — Slice 5 today |
| TP-Link TL-SG108E (mirror port) | ~$35 | True whole-network flow records |
| N100 mini-PC + OPNsense | ~$180–250 | **Per-device firewall, VLANs, DNS enforcement, true quarantine.** GT6 demotes to AP. The purchase that converts metadata-king → network-king |
| Powered USB hub (already owned, cord lost) | ~$0–15 | Unblocks the Pi as redundant resolver |
