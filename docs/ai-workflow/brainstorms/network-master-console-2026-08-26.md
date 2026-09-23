# Swan Network Console — "Master of the Home Network"

**Status:** planning · **Date:** 2026-08-26 · **Owner:** Sean
**Decision:** build as a STANDALONE component, packaged to drop into any Swan app
**Supersedes:** none · **Related:** `docs/ai-workflow/references/archive/ROUTER-UPGRADES-GT6.md`

---

## 1. What Sean asked for (verbatim intent)

> *"install Wireshark and create a console for me where I can become the master of all data that goes in and out to anything in my network... I have an ASUS router we could utilize... I want to combine my router options as well as Wireshark... my whole goal is gonna be able to monitor my kids, monitor network. I just need to get the king of the network and then have every single option available to me in this control... things I haven't thought about, things you haven't talked about, but I need every single possible option available to me."*

> *"maybe this is something that I should add to the Swan Gardens. We will build it as a component standalone, but it will be prepared to be added to any app I want to add it to. This will become one of my components that I use."*

**Deliverables requested:** hostile review · wireframe · mermaid · flowchart · blueprint · the tests needed to prove it complete.

---

## 2. Ground truth — plan against THIS, not a generic homelab

### Router
**ASUS ROG Rapture GT6 AX10000 (WiFi 6E), stock AsusWRT.**
- **GT6 does NOT support Asuswrt-Merlin.** Confirmed in the existing playbook. No custom firmware, no `nvram` scripting hooks, no easy `ntopng`/custom flow export. This is the single biggest architectural constraint.
- Stock capabilities available: Traffic Analyzer/Monitor, AiProtection (Trend Micro), Adaptive QoS w/ per-device bandwidth, Parental Controls with time scheduling, client list, system log, guest networks, WireGuard VPN server, DDNS.
- Undocumented HTTP JSON endpoint (`appGet.cgi`) exists on AsusWRT and is the likely programmatic surface. **Unverified on GT6 — must be probed.**
- Consumer routers generally have **no SPAN / port-mirroring**. Assume absent until proven.

### Network
`192.168.50.0/24`, gateway `.1`. Known hosts: main workstation (RTX 5090) `.83` · `miniswan` (RTX 4080S, Windows 11, SSH+Tailscale, admin access proven) `.92` · Raspberry Pi 4 `.232` (currently offline, SD-card storage blocked pending a powered USB hub) · radar box (always-on Ubuntu, NOT on Tailscale) · ~12 other DHCP clients incl. IoT, phones, LG TV.
**Tailscale mesh already deployed** across the Windows boxes.

### Stack the console must fit
React 18 + TypeScript + **styled-components** (NO Material-UI) · Node/Express/Sequelize/PostgreSQL · **Victory** for charts (no Recharts) · Crystalline Swan dark-first palette, tokens with fallbacks, 44px touch targets, WCAG 4.5:1, responsive 320→3840.

### Household context
Sean, his spouse, and minor children share this network. Monitoring minors on your own network is ordinary parenting. **Adults are a different case** — the design should make disclosure/consent an explicit, first-class configuration rather than an afterthought, and the plan should say how.

---

## 3. Three constraints that will kill a naive design

1. **TLS means metadata, not content.** ~95% of traffic is encrypted. Packet capture yields: who talked to whom, when, how much, and (via SNI/DNS/certificate) *which service*. It does **not** yield messages, posts, or page content. Any plan promising "see everything they do" without saying this is lying. TLS interception (a trusted MITM CA on managed devices) is the only path to content — it breaks pinned apps, is a significant security liability, and for adults is a consent question, not a technical one. **Treat it as a separate, explicitly-gated decision — not a default.**

2. **Whole-network packet capture needs a tap the GT6 probably can't give.** Without SPAN, options are: (a) inline bridge box between modem and router, (b) a managed switch with a mirror port, (c) per-endpoint capture agents, (d) **DNS-level collection** — point DHCP at a Pi-hole/AdGuard resolver and get per-device query logs for the entire network with zero packet plumbing. (d) is likely the 90/10 win and should be evaluated as the primary, not the fallback.

3. **The Pi is the natural sensor host and it is currently blocked** (SD card, needs a powered USB hub). Any design that makes the Pi load-bearing inherits that dependency. Say so.

---

## 4. What the panel must produce

Answer as a **buildable plan**, not an essay. A worker-bot should be able to execute it with zero further questions.

1. **Exhaustive feature enumeration.** Sean asked for "every single possible option — including things I haven't thought about." Enumerate aggressively across: live topology/device inventory · per-device bandwidth & history · DNS query visibility · blocked/allowed policy · per-device and per-schedule internet control · app/service identification · new-device alerting · rogue/unknown-device detection · IoT isolation & VLAN/guest segmentation · parental time budgets & bedtime enforcement · content-category filtering · per-device kill switch · WAN outage & ISP performance tracking · latency/jitter/packet-loss monitoring · port-scan and intrusion detection · firmware/CVE tracking for every device · VPN status & split-tunnel control · QoS/gaming priority · captive-portal/quarantine for new devices · historical forensics & search · anomaly detection & baselining · exfiltration detection · certificate/SNI inventory · geo-mapping of destinations · scheduled reports · mobile view · alerting channels (Telegram fits the existing Hermes lane). **Add what is missing from this list.** Rank every feature by **value ÷ effort** and mark the ones that are impossible or degraded on a Merlin-less GT6.
2. **Architecture** — data acquisition layer(s), collector, storage/retention, API, UI. Name the concrete tech at each layer and justify against §2/§3. Include what runs where (Pi vs miniswan vs radar vs router).
3. **Mermaid diagrams:** system architecture, data flow, and the device-onboarding/alerting sequence.
4. **Wireframes** for the console — desktop and mobile — as ASCII or structured layout description. Dark-first, styled-components, Victory charts, 44px targets. Name the screens and the primary action on each.
5. **Component packaging.** How does this ship as a *standalone reusable Swan component* that drops into any app? Public API/props, config surface, auth boundary, theming contract, data-source abstraction so it isn't hardwired to one router brand.
6. **Storage & retention math.** Concrete numbers: per-device flow records/day, DNS queries/day for a ~15-device household, disk growth, retention policy, index strategy. This is where naive designs die.
7. **The test suite that proves completeness** — unit, integration, and the manual verification steps. What specific test proves "I can see every device," "I can block a device in under 5 seconds," "no query was dropped"?
8. **Phased delivery.** Numbered, independently shippable slices, each with acceptance criteria. Slice 1 must deliver visible value in one evening.
9. **Legal/ethical/governance design** — not a lecture, a *feature spec*: what is logged, who can see it, retention limits, how adult household members are informed, what is deliberately NOT captured, and the audit trail for the operator's own actions.
10. **Hostile review of your own plan:** the 3 ways this fails, what breaks first in production, what Sean will be disappointed by after two weeks, and the specific promises in §1 that cannot actually be delivered.

**Be concrete. Prefer "use X, it costs Y, it gives Z" over principles. Where GT6 blocks something, say what hardware would unblock it and what it costs.**
