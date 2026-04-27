# ASUS ROG Rapture GT6 — Power User Upgrade Playbook
> **Model:** ASUS ROG Rapture GT6 AX10000 WiFi 6E
> **For:** Sean Swan (dev + gamer + family man + Hermes architecture)
> **Network:** `192.168.50.0/24` (Pi at `.232`, Windows PC at `.83`)
> **Created:** 2026-04-17 | **Status:** ACTIVE reference doc
> **Integration:** Swan Sentinel agent should monitor this router weekly

---

## IMPORTANT CORRECTION FROM EARLIER CONVERSATION

**GT6 does NOT support Merlin custom firmware.** Ignore any prior suggestion to flash Merlin — GT6 is not on the supported list. Stay on stock AsusWRT, which is actually very capable for power users.

Sources: [Merlin firmware doesn't cover GT6](https://www.asuswrt-merlin.net/download) | [GT6 support page](https://rog.asus.com/networking/rog-rapture-gt6-model/helpdesk_bios/)

---

## TIER 1 — DO THIS WEEKEND (Maximum Impact, Low Effort)

### 1. WireGuard VPN Server ⭐ (biggest win)
**Location:** Advanced Settings → VPN → VPN Server → **WireGuard**

**What it does:** Gives you encrypted remote access to your entire home network from anywhere on the internet. Without it, you can only reach your Pi/PCs when you're on home WiFi.

**Use cases unlocked:**
- SSH into Pi from coffee shop, gym, hotel — anywhere
- Access Hermes web interface securely without exposing it publicly
- SSH into 5090 to launch Claude Code remotely
- Route phone through home network for geoblocked services

**Setup (15 min):**
1. Enable WireGuard VPN Server
2. Generate keys (router does it)
3. Scan the QR code from the WireGuard app on your iPhone
4. Done — you have phone-to-home VPN from anywhere

**Security win:** No port forwarding needed. No public exposure of internal services. The VPN is the only door to the inside, and it's cryptographically locked.

---

### 2. WPA3-SAE Upgrade ⭐
**Location:** Advanced Settings → Wireless → General tab → Authentication Method

**What it does:** Replaces WPA2 (which has known vulnerabilities like KRACK) with WPA3 Simultaneous Authentication of Equals (SAE). Dragonfly handshake prevents offline dictionary attacks — even if someone captures your handshake, they can't brute force your password offline.

**Pick:** `WPA2/WPA3-Personal` (transition mode — covers old devices) or `WPA3-Personal` (strictest, but old devices fail)

**Verify after:** every device still connects. If a 10-year-old IoT device fails, use transition mode.

**Reference:** [ASUS WPA3 documentation](https://www.asus.com/us/support/faq/1042478/) | [RouterHax WPA3 guide](https://routerhax.com/what-is-wpa3/)

---

### 3. Disable WAN Admin + UPnP + Telnet ⭐
**Location:** Advanced Settings → Administration → System

**Settings:**
| Setting | Set To |
|---|---|
| Enable Web Access from WAN | **NO** (critical) |
| Enable Telnet | NO |
| Authentication Method (admin) | **HTTPS only** |
| HTTPS LAN port | `8443` (not default 8080) |
| UPnP | **Disabled** |

**Why:** WAN admin is how most routers get owned. UPnP lets malware on your network auto-forward ports to itself. Telnet is plaintext credentials. Turn off all three.

[ASUS security FAQ](https://www.asus.com/support/faq/1008719/)

---

### 4. Strong Admin Password + 2FA
**Location:** Advanced Settings → Administration → Login Information

- Change username from default `admin` to something else (reduces automated attacks)
- 20+ character password, stored in Bitwarden
- Enable **Login Failure Lockout** (if available): lock for 1 hour after 5 failed attempts

---

### 5. Free ASUS DDNS
**Location:** Advanced Settings → WAN → DDNS

- Enable DDNS
- Pick a name like `swanhermes.asuscomm.com`
- Save

**Now:** Your home always reachable at `swanhermes.asuscomm.com` even if ISP changes your WAN IP. Pair with WireGuard (Tier 1.1) so your phone's VPN config points to the domain, not a numeric IP that could break.

---

### 6. DNS-Level Privacy + AdBlock (NextDNS)
**Location:** Advanced Settings → WAN → DNS Server

**Default problem:** ISP DNS logs every website everyone in your house visits.

**Fix:** Sign up free at [nextdns.io](https://nextdns.io) → get your DNS-over-HTTPS endpoints → paste into router.

**What you get:**
- Network-wide adblock (no ads on any device, including smart TVs)
- Malware + phishing blocking at DNS level
- Per-device rules (kids' devices can have stricter filters)
- Analytics dashboard (see what every device is querying)
- 300k queries/month free (covers most households)

**Alternative simpler pick:** Cloudflare `1.1.1.1` / `1.0.0.1` with DoH (privacy but no adblock)

---

### 7. Enable Full AiProtection Pro
**Location:** General → AiProtection

**Enable all three:**
- **Malicious Sites Blocking** (URL filtering)
- **Two-Way IPS** (intrusion prevention — scans inbound AND outbound traffic)
- **Infected Device Prevention and Blocking** (detects devices beaconing to C2 servers)

**Powered by:** Trend Micro threat intelligence. Free with router, no subscription.

[AiProtection documentation](https://www.asus.com/us/content/aiprotection/)

---

### 8. DoS + Port Scan Protection
**Location:** Advanced Settings → Firewall → General tab

**Enable:**
- DoS Protection (rate-limits connection attempts)
- Port Scanner protection (drops packets from scanning IPs)

**Also enable:** "Respond Ping from WAN" = **NO** (makes your public IP stealthy)

**Effect:** Attackers scanning for vulnerable routers skip yours. Your WAN IP responds to nothing it doesn't have to.

[ASUS DoS explanation](https://www.asus.com/support/faq/1031610/)

---

### 9. Device Priority — Your Setup
**Location:** Advanced Settings → Adaptive QoS → QoS tab → Traditional QoS or Drag-and-Drop

**Priority rankings for YOUR network:**
| Rank | Device | Reason |
|---|---|---|
| 1 (Highest) | **5090 PC** (192.168.50.83) | Gaming + SwanStudios dev work |
| 2 | **Pi swan-hermes** (192.168.50.232) | Hermes needs low latency for Telegram |
| 3 | 4080 PC | Ollama inference, needs bandwidth |
| 4 | LG webOS TV | Streaming quality |
| 5 | SonosZP | Music continuity |
| Lowest | IoT devices | Smart plugs, etc. — don't need speed |

**Game Boost + Open NAT:** Enable for 5090 specifically. Game traffic gets routed through WTFast tunnel (if enabled) or prioritized pipeline.

[Adaptive QoS guide](https://www.asus.com/support/faq/1010935/)

---

## TIER 2 — DO THIS MONTH (Security + Family)

### 10. Guest Network with Isolation
**Location:** Advanced Settings → Guest Network

- Create `SwanStudios-Guest` SSID
- **Enable "Access Intranet = No"** — guests can't see your Pi/PCs
- Set 4-hour time limit (auto-expires, regenerate for each visitor)
- Separate, lower bandwidth allocation
- Its own password (not your main WiFi)

**When to use:** Anyone visiting who needs WiFi. Never share your main network password.

---

### 11. Parental Controls — Kids Setup
**Location:** General → Parental Controls

**For 8yo + 9yo iPads/devices:**
- Internet schedule: ON from 7 AM to 9 PM
- Blocked categories: Adult content, gambling, chat roulette, weapons
- Per-device assignments so each kid has rules matched to their age
- Time limits by category (social media 1hr/day, etc.)

**For 21yo:** Probably leave unrestricted unless he asks.

**Bonus:** Pair with NextDNS (from Tier 1.6) — NextDNS has a family profile preset that auto-blocks adult content + enforces SafeSearch on Google/YouTube/Bing without you configuring anything.

---

### 12. Traffic Analyzer Baseline
**Location:** General → Traffic Analyzer

Enable it. Let it run for a week. Then you can see:
- Which devices use the most bandwidth
- What apps/services chew data
- Anomalies (device suddenly using 100x more data = possibly compromised)

**Why:** Establishes "normal" so "abnormal" stands out. Swan Sentinel can pull this weekly for anomaly detection.

---

### 13. Firmware Auto-Updates + Manual Checks
**Location:** Advanced Settings → Administration → Firmware Upgrade

- Enable **Signed Firmware Update** requirement
- Check for updates monthly manually (ASUS pushes security patches)
- Current stable: [latest GT6 firmware](https://rog.asus.com/networking/rog-rapture-gt6-model/helpdesk_bios/)

**Swan Sentinel integration:** Hermes can scrape the firmware page weekly, notify if new version available.

---

### 14. Enable HTTPS-Only Admin
Already covered in Tier 1.3. Verify: when you load `http://192.168.50.1` it redirects to `https://192.168.50.1:8443`.

---

### 15. Device Inventory Audit
Right now you have **17 clients online**. Do you know what each one is?

**Action:**
- Open Network Map → Clients
- Every unknown MAC → research what it is (search `maclookup.app` with first 6 chars)
- Rename them with clear labels (e.g. `Nest-Thermostat`, `Xbox-Living`, `Jasmine-iPhone`)
- Anything you don't recognize → investigate or block

**Unknown devices on your network = potential compromises.** This audit is a 20-min task that catches squatters.

---

## TIER 3 — POWER USER (Serious Upgrades)

### 16. USB → Router-Based NAS (for Wiki Backup + Media)
**Location:** USB Application → Servers Center → Samba Share

**Hardware needed:** Spare USB 3.0 external drive (256GB-2TB works great)

**What it enables:**
- **Karpathy Wiki backup destination** — nightly age-encrypted sync from Pi to this drive (tertiary backup beyond R2)
- **Small media library** — light Plex/Jellyfin streaming, family photos
- **Shared drive for your PCs** — drag/drop files accessible by 5090 + 4080 + phones

**Reality check:** Router CPU is not powerful enough for heavy Plex transcoding. This works great for:
- ✅ Already-encoded media (MP4/MKV direct play)
- ✅ File storage + light streaming
- ✅ Backup target
- ❌ 4K transcoding (needs dedicated NAS or PC)

**Setup:** Plug USB drive → router auto-mounts → enable Samba share → accessible at `\\192.168.50.1\sda1` from Windows Explorer

[USB setup guide](https://www.asus.com/support/faq/1011279/)

---

### 17. Blu-ray Digitization Pipeline (Your Goal)
**Setup runs on 5090 PC, not router. Router becomes the serving layer.**

**Stack:**
1. **External USB Blu-ray drive** (~$80, LG WH16NS40 or Pioneer BDR-XD08B)
2. **MakeMKV** (free during beta, [makemkv.com](https://www.makemkv.com)) — rips disc → lossless MKV
3. **HandBrake** (free, [handbrake.fr](https://handbrake.fr)) — compresses MKV → manageable MP4
4. **Plex or Jellyfin** on 5090 — serves library to all devices

**Automated option — Automatic Ripping Machine (ARM):**
- Runs on Linux (could be the Pi if you get a second USB Blu-ray drive)
- Insert disc → auto-rips → auto-compresses → organizes → ejects
- Fully headless, no interaction
- [b3n.org ARM guide](https://b3n.org/automatic-ripping-machine/)

**Workflow for your collection:**
1. Plug USB Blu-ray drive into 5090 PC
2. Install MakeMKV + HandBrake
3. Rip a disc → test play on LG TV via Plex
4. Once workflow works, batch your collection over weekends
5. Store masters on a big HDD on 5090 (Plex library), share selected compressed copies to router USB for light streaming

**Legal note:** Backing up your own purchased media is in a legal gray area in the US (DMCA anti-circumvention). Keep it personal use, don't distribute, and you're in the same posture as millions of enthusiasts. Not legal advice.

**Serves to:** Your LG webOS TV (Plex app), phones, tablets, laptops — anywhere on WiFi. With WireGuard (Tier 1.1), you can stream your library from outside the house too.

Sources: [HowToGeek Blu-ray backup guide](https://www.howtogeek.com/161498/how-to-backup-your-dvd-and-blu-ray-movie-collection/) | [What to Watch MakeMKV tutorial](https://www.whattowatch.com/how-to/how-rip-blu-ray-disks-makemkv-and-handbrake)

---

### 18. VLAN Segmentation (Network Security Hardening)
**Location:** Advanced Settings → LAN → VLAN

**Proposed zones:**
| VLAN | Devices | Why |
|---|---|---|
| **Main** | Your phones, Jasmine's phone, laptops | Day-to-day |
| **Dev** | Pi (swan-hermes), 5090, 4080 | Hermes infrastructure |
| **IoT** | Smart speakers, cameras, thermostats, Sonos | Notorious for weak security — isolate them |
| **Kids** | Kids' iPads, switches, smart TVs in their rooms | Parental controls easier to apply |
| **Guest** | Visitors | Already isolated via Guest Network |

**Effect:** If a compromised IoT camera tries to reach your Pi, it hits a VLAN wall. Lateral movement contained.

**Effort:** Medium — requires reassigning devices after setup. Do it on a Saturday.

---

### 19. Commercial VPN at Router Level
**Location:** Advanced Settings → VPN → VPN Client

If you want ALL home traffic through a privacy VPN (Mullvad, ProtonVPN, NordVPN):
- Configure at router
- Every device gets VPN automatically
- Even smart TVs, IoT devices that can't install VPN apps
- Can selectively route — e.g. kids' devices through VPN, your dev work through regular connection

**Cost:** $5-12/month for a quality VPN service.

**Tradeoff:** Adds ~10-30ms latency (could affect gaming). If you're the gamer, pair this with device-level bypass so your 5090 gaming traffic skips the VPN.

---

### 20. Game Radar / Open NAT / WTFast
**Location:** General → Game Acceleration / Open NAT / Game Radar

**Game Boost:** Already-enabled exclusive ASUS QoS that prioritizes game packets
**Open NAT:** One-click fix for "NAT type strict" in games like COD, Apex. Sets up port forwarding automatically for specific games.
**Game Radar:** Real-time ping monitor to major game server regions
**WTFast:** Gaming-optimized tunnel (separate subscription, ~$10/mo) — adds routing intelligence to reduce ping spikes

For your 5090 gaming + streaming setup, these are essentially "set and forget" — turn them on, pick your games.

[Triple-level Game Acceleration](https://www.asus.com/us/support/faq/1039505/)

---

## TIER 4 — ONGOING SECURITY HYGIENE

### 21. Monthly Port Scan Audit
**Tools:**
- **GRC ShieldsUp** at [grc.com/shieldsup](https://grc.com/shieldsup) — scans your WAN IP, reports open/closed/stealth
- **nmap** from an external location (like your phone hotspot or a VPS)

**Target state:** All ports "stealth" — attackers see nothing, don't even know your IP is live.

**Cadence:** Once a month.

---

### 22. Shodan Exposure Check
- Go to [shodan.io](https://shodan.io)
- Search for your WAN IP (get it from router dashboard)
- See if you're indexed
- Check what services Shodan sees running

**Target:** Ideally nothing. If Shodan sees your router admin page or anything else, that's a misconfiguration.

[Shodan removal guide](https://www.comparitech.com/blog/vpn-privacy/remove-device-shodan/)

---

### 23. CVE Monitoring for GT6 Model (Hermes Integration)
**Swan Sentinel should:**
- Watch [ASUS security advisories page](https://www.asus.com/content/asus-product-security-advisory/) weekly
- Monitor CISA KEV catalog for ASUS router entries
- Alert if GT6 model appears in any CVE

**Precedent:** ASUS has had several high-severity router CVEs (example: [ASUS Router Vulnerabilities](https://hoploninfosec.com/asus-router-vulnerabilities-exposed)). Staying patched = critical.

---

### 24. Wireless Attack Hardening
Additional wireless-specific hardenings:
- **Hide SSID broadcast**: minor security-through-obscurity, won't stop attackers, will stop casual script kiddies
- **MAC address filtering**: can set a whitelist of allowed MACs (defeated by spoofing but raises bar)
- **Disable WPS** (Wi-Fi Protected Setup) — WPS has been broken for years, turn it off: Advanced Settings → Wireless → WPS → Disable
- **Reduce transmit power** — if you can cover your house with less power, attackers from the street have less signal to work with

---

### 25. Router Reboot Schedule
**Location:** Administration → Reboot Scheduler (or via cron)

Schedule weekly reboot at 3 AM Sunday. Clears memory leaks, picks up firmware updates that require reboot, fresh state. Zero user impact at 3 AM.

---

## HERMES INTEGRATION — Swan Sentinel Router Skills

These are skills to add to Swan Sentinel over time. Each runs via cron.

### Skill: Weekly Router Security Audit
```
Every Sunday at 8 AM:
1. SSH into router (if SSH enabled — optional)
2. Scrape ASUS firmware page for GT6 - alert if new version
3. Check CISA KEV for ASUS entries this week
4. Query router API for connected device count - alert if unexpected new MAC
5. Verify WPA3 still enabled
6. Verify WAN admin still disabled
7. Verify UPnP still off
8. Post full audit report to Telegram + file to wiki
```

### Skill: New Device Alert
```
Check connected device list hourly.
If new MAC appears that wasn't there an hour ago:
→ Telegram alert with MAC + hostname + IP
→ Sean approves: "known device, add to inventory" or "block"
```

### Skill: WAN IP Monitor
```
Check WAN IP daily.
If changed (ISP rotation):
→ Update DDNS if it didn't auto-update
→ Log to wiki network history
→ Re-scan via external tool to confirm stealth state
```

### Skill: Router Firmware Update Assistant
```
When new firmware released:
1. Download release notes
2. Summarize changes (security fixes vs feature adds)
3. Telegram alert: "New firmware X.Y.Z available. CVE fixes: [list]. Approve update?"
4. On approval: schedule update for 3 AM Sunday
5. Verify router responsive after reboot
6. Run post-update security audit
```

---

## QUICK REFERENCE — Your Network Map

```
INTERNET
   │
   ▼
┌──────────────────────────────────────────┐
│  ROG Rapture GT6  (172.88.230.247 WAN)   │
│  192.168.50.1 LAN (admin at :8443 HTTPS) │
│  DDNS: swanhermes.asuscomm.com           │
│  WireGuard VPN server: port 51820 (UDP)  │
└──────────────────┬────────────────────────┘
                   │
   ┌───────────────┼────────────────┬───────────────┬──────────┐
   ▼               ▼                ▼               ▼          ▼
.232 Pi        .83 Win           .XX 4080      .180 LG TV   .9 Sonos
swan-hermes    5090 main         Ollama PC     webOS        Surround
(Hermes)       (dev + gaming)    (local LLM)   (Plex)       (music)
   │               │                │
   │               │                │
   ▼               ▼                ▼
Karpathy       Claude Code      Gemma 4 31B
Wiki           Codex 5.4        Qwen3-Coder
(R2 backup)    Cowork           GPT-OSS 20B
               Hashcat (WoL)    (WoL + Ollama)
```

---

## PRIORITY EXECUTION ORDER

**This weekend (2-3 hours):**
1. Tier 1.1 WireGuard VPN Server
2. Tier 1.2 WPA3-SAE upgrade
3. Tier 1.3 Disable WAN admin + UPnP + Telnet
4. Tier 1.5 DDNS setup
5. Tier 1.8 DoS + Port Scan protection
6. Tier 1.9 Device priority (5090 top)

**Next weekend (1-2 hours):**
7. Tier 1.4 Admin password hardening
8. Tier 1.6 NextDNS setup
9. Tier 1.7 AiProtection Pro full activation
10. Tier 2.10 Guest network
11. Tier 2.11 Parental controls (kids)

**Next month:**
12. Tier 2.15 Device inventory audit
13. Tier 3.16 USB → Samba (for wiki backup)
14. Tier 3.17 Blu-ray digitization pipeline

**Ongoing:**
15. Tier 4 items as part of Swan Sentinel automation

---

## SOURCES

- [ASUS ROG GT6 support page](https://rog.asus.com/networking/rog-rapture-gt6-model/helpdesk_bios/)
- [Asuswrt-Merlin firmware (GT6 NOT SUPPORTED)](https://www.asuswrt-merlin.net/)
- [WPA3-SAE explanation](https://routerhax.com/what-is-wpa3/)
- [ASUS AiProtection Pro features](https://www.asus.com/us/content/aiprotection/)
- [Two-way intrusion prevention docs](https://www.asus.com/us/support/faq/1008719/)
- [Adaptive QoS setup](https://www.asus.com/support/faq/1010935/)
- [Bandwidth limitation per device](https://www.asus.com/us/support/faq/1055838/)
- [ASUS DoS protection explainer](https://www.asus.com/support/faq/1031610/)
- [USB Samba share setup](https://www.asus.com/support/faq/1011279/)
- [MakeMKV + HandBrake workflow](https://www.whattowatch.com/how-to/how-rip-blu-ray-disks-makemkv-and-handbrake)
- [Automatic Ripping Machine](https://b3n.org/automatic-ripping-machine/)
- [Shodan removal](https://www.comparitech.com/blog/vpn-privacy/remove-device-shodan/)
- [ASUS router vulnerability history](https://hoploninfosec.com/asus-router-vulnerabilities-exposed)

---

## CHANGE LOG

- 2026-04-17: Document created. Tier 1 items pending Sean's weekend execution.
