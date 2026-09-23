# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** docs/ai-workflow/brainstorms/network-master-console-2026-08-26.md
**Seed:** (none)
**Tokens:** 2309 in / 4940 out · **Cost:** ~$0.0000 · **Wall:** 180.5s · **finish:** stop

---

# HOSTILE GATE REVIEW — Swan Network Console Brief

**Reviewer:** ox-alpha · Panel: CLAUDE.md Co-Orchestrator Hierarchy · Effort: HIGH

---

## (a) VERDICT

**REVISE** — The brief is honest about its biggest unknowns but commits architecture to two unverified surfaces (`appGet.cgi` on GT6, §2 "Unverified on GT6 — must be probed"; DNS-collection-as-primary, §3.3(d) "likely the 90/10 win") while overstating one hard constraint (§3.2 "Whole-network packet capture needs a tap the GT6 probably can't give"). No build order may be issued until a time-boxed probe spike resolves the router-API question and the device-identity join key is specified.

---

## (b) Correctness Attacks

**B1. The "no tap possible" premise is factually wrong — stock AsusWRT ships SSH.**
§3.2 claims whole-network capture requires an inline bridge, mirror switch, agents, or DNS collection. Stock AsusWRT (Merlin-less) still exposes SSH and `nvram`, and supports Entware-on-USB. `tcpdump` on the GT6's LAN/WAN interfaces captures all routed traffic pre-encryption-at-endpoint — that *is* the tap. The doc's own cited playbook (§ Related) apparently conflated "no Merlin" with "no shell." This invalidates the forced choice in §3.2 and may rescue features marked "impossible on Merlin-less GT6" before they're even ranked. **Fix:** probe SSH + Entware viability on GT6 in the same spike as B4.

**B2. "I can see every device" is unfalsifiable as written (§7.7).**
A ~15-device household with sleeping IoT, phones on power-save Wi-Fi, and mesh roaming across GT6 nodes means the client list is a moving set. There is no defined ground truth to reconcile against. Without one, the completeness test proves nothing. **Fix:** define ground truth as "DHCP lease table ∪ ARP table ∪ WiFi association list, reconciled over a 24h window," and test against a manually-audited physical inventory.

**B3. Identity-key drift is unspecified and will corrupt every cross-source join.**
Router reports MAC+IP+hostname; Pi-hole/AdGuard reports IP+hostname (and MAC only sometimes, unreliably for IPv6); flow records report IP+port. Devices change IPs on lease renewal; MACs randomize on modern phones per-SSID. The doc never names the canonical device key. Every feature in §4.1 (per-device history, bedtime enforcement, kill switch) silently breaks when the join key is wrong. **Fix:** mandate MAC-as-primary with randomized-MAC detection and an explicit manual-merge UI; forbid IP as identity anywhere in the schema.

**B4. The entire acquisition layer rests on an endpoint the doc admits is unverified.**
§2: "`appGet.cgi` … **Unverified on GT6 — must be probed**" — then §4.2 asks for "concrete tech at each layer" anyway. You cannot name the tech. Worse, undocumented endpoints have no stability contract: a routine ASUS firmware push can change the response shape with zero notice, and there is no changelog to diff against. **Fix:** probe spike first; commit captured response fixtures to the repo as the de-facto contract; wrap the parser in a schema-version check that halts ingestion loudly on drift rather than writing garbage rows.

**B5. "Block a device in under 5 seconds" (§7.7) ignores conntrack.**
Adding a firewall/drop rule does not terminate established flows; existing TCP sessions and long-lived QUIC connections persist until conntrack expiry. A 5-second SLA requires an explicit connection-flush step (conntrack tooling or interface bounce), which stock AsusWRT may not expose cleanly. Also unmeasured: AsusWRT web-session auth round-trip latency, which is inside your 5-second budget.

**B6. Bedtime/schedule enforcement has timezone/DST and clock-skew hazards.**
Router clock vs collector clock vs browser clock — three clocks, no stated authority. Off-by-one-hour bedtime enforcement is a guaranteed household incident. Name the NTP-synced authority and store all schedules in UTC.

**B7. Single observer paradox.**
The monitor runs on the network it monitors. Router reboot, ISP outage, or Pi power loss (§3.3 — the Pi is *already* offline pending hardware) blinds the console exactly when forensics matter most. No out-of-band write-ahead buffer or last-known-state snapshot is specified.

---

## (c) Security Attacks

**C1. The console is a privilege-escalation appliance, and the brief doesn't treat it as one.**
It aggregates: full device inventory, traffic metadata, router credentials (to call `appGet.cgi`), and actuation (kill switch, parental controls). Compromise of this one Express service ≈ compromise of the network. §5 demands an "auth boundary" but specifies nothing. Minimum bar: server-enforced session auth (never prop-gated — see D3), router credentials sealed outside the DB or encrypted at rest with a key not in the same trust boundary, and per-action CSRF protection.

**C2. SSRF by design.**
§5 requires a "data-source abstraction so it isn't hardwired to one router brand" — i.e., a user-supplied base URL that a Node backend will fetch. That is a textbook SSRF pivot: point it at `http://169.254.169.259/`-style metadata endpoints or internal services. **Fix:** pin scheme to http/https, resolve-and-validate against RFC1918 expectations explicitly (this tool legitimately talks to private IPs — so instead pin the allowed target to configured hosts only, no free-form URL input at runtime).

**C3. Hostnames are attacker-controlled input rendered in your UI and written to your DB.**
Any device — including a rogue phone joining the guest SSID — chooses its DHCP hostname. Unsanitized, that's stored XSS in the device inventory and SQL-injection surface through Sequelize raw queries if any creep in. The brief never mentions input handling for third-party-controlled strings. **Fix:** strict charset validation + parameterized writes + React auto-escaping audited against `dangerouslySetInnerHTML`.

**C4. Telegram/Hermes alert channel leaks behavioral data (adjacent to the zero-PII house rule).**
Alerting "blocked domain X for device 'child-phone'" pushes a minor's browsing metadata off-network to a third-party cloud. House rule says IDs-only to LLM lanes; extend it here: alerts carry device-ID + severity codes only, never hostnames/domains/names. Bot token handling (secret storage, revocation) is unspecified.

**C5. Enforcement is trivially bypassable and the brief doesn't say so.**
DNS-level filtering (§3.2d) dies to: hardcoded 8.8.8.8 on IoT, DoH (browsers ship it enabled), iCloud Private Relay, and the GT6's own WireGuard server or any commercial VPN app. "Master of the network" silently degrades to "master of devices that cooperate." **Fix:** NAT-redirect all outbound :53 to the local resolver, block known DoH provider IPs, and add an explicit "enforcement assurance" test — otherwise §10's "what Sean will be disappointed by" answers itself in week one.

**C6. Polling DoS against a consumer router.**
Aggressive `appGet.cgi` polling is a known way to destabilize AsusWRT (memory pressure, web-server hangs). No poll-rate ceiling, backoff, or circuit breaker is specified. The monitor must never be the thing that takes down the network.

**C7. Replay/idempotency.**
Poll-based ingestion with no sequence/dedup key duplicates flow and DNS records on collector restart, inflating §4.6's retention math and corrupting "no query was dropped" reconciliation (you can't distinguish duplicate from genuine).

---

## (d) Data-Truth / Schema-Drift (Rule 58)

**D1. Undocumented API = drifting contract.** `appGet.cgi` response shapes vary across AsusWRT firmware versions and models. Field names arrive in mixed camelCase (`macAddr`, `ipAddr`, `name`) while the Sequelize/PostgreSQL layer will want snake_case. The brief mandates no explicit field-mapping/normalization layer with a fixture-tested schema. **Required:** a typed adapter module whose tests assert against committed response fixtures per firmware version.

**D2. Three identity namespaces, no canonical join (expands B3).** Router (MAC-centric), DNS resolver (IP/hostname-centric), future flow records (IP/port-centric). Without a declared canonical key and a documented alias-resolution table, FK targets will drift — e.g., `dns_queries.device_id` pointing at a stale device row after a merge.

**D3. Standalone-component response-shape drift.** §5 ships this into "any Swan app." Multiple consumers + evolving backend = shape drift. Require a versioned API envelope (`{ v: 1, ... }`) and a shared TypeScript contract package, or the second consuming app breaks on the first backend change.

**D4. Feature-list vs capability drift.** §4.1 lists "certificate/SNI inventory" and "geo-mapping" — SNI is progressively encrypted (ECH deployment ongoing); these features will silently degrade to empty datasets. Mark them degraded-by-design now, per the brief's own instruction to mark "impossible or degraded" items, rather than shipping dashboards that render zeros.

---

## (e) House-Rule Violations & Speculative-Success Language

- **Speculative language without a verified path:** §2 "is the **likely** programmatic surface"; §3.2 "**probably** can't give"; §3.2(d) "**likely** the 90/10 win **and should be evaluated** as the primary." Three load-bearing claims hedged instead of probed. Under house rules, "should be fixed"/"looks good"-grade assertions require a named verification path. The probe spike *is* the named path — schedule it before architecture sign-off.
- **Positive:** §2 correctly states "Confirmed in the existing playbook" for the Merlin exclusion and "admin access proven" for miniswan `.92` — evidence-backed claims done right.
- **Stack compliance:** styled-components ✓, Victory ✓, tokens-with-fallbacks ✓, 44px ✓, dark-first ✓, WCAG 4.5:1 ✓ — all correctly carried into §4.4. No MUI/Recharts/yoga-language/credential-wording violations present.
- **≤300 lines/file:** §5's "standalone reusable component" with topology view, charts, policy editor, and forensics search is a monolith magnet. Add an explicit file-budget rule to the packaging spec now, or the first worker-bot will produce a 900-line `<Console />`.
- **Zero-PII-to-LLMs:** §1's verbatim quotes describe monitoring minors; any downstream LLM-assisted summarization of DNS/device data would violate the rule. State explicitly that LLM lanes receive device-IDs and severity codes only (ties to C4).
- **Missing deliverable readiness:** §4 demands wireframes, mermaid diagrams, retention math, and ranked features — none exist in this artifact. Acceptable for a brief, but the gate cannot pass to build until they do.

---

## (f) SINGLE HIGHEST-RISK ITEM

**The acquisition layer is being architected against an unverified, unstability-contracted API (`appGet.cgi` on a Merlin-less GT6) while the doc simultaneously misrules out the SSH/Entware capture path (B1/B4). Every deliverable in §4 — inventory, sub-5s blocking, bandwidth history, forensics — sits downstream of this unknown.**

**De-risk before any build (one evening, ~$0):**
1. SSH into the GT6; confirm shell, `nvram` access, and whether Entware installs to USB.
2. Probe `appGet.cgi`: authenticate, dump the client list, traffic-analyzer stats, and a parental-control block command; measure end-to-end block latency including conntrack behavior.
3. Commit raw responses as versioned fixtures — this becomes the parser contract and the Rule-58 drift tripwire.
4. Decision gate: if the API probe fails *and* SSH capture works, the architecture pivots to router-native sensing; if both fail, pivot to DNS-collector-first (which needs zero router API) with C5's enforcement caveats stated up front in the UI.

Do not let a worker-bot write a single line of the collector, schema, or UI until this spike lands. Everything else in this brief is recoverable; building on a guessed API surface is not.
