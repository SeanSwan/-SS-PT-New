# DeepSeek V4 Pro — Hostile Gate Review

**Reviewer:** OpenRouter `deepseek/deepseek-v4-pro` (effort: high)
**Document:** docs\ai-workflow\AI-HANDOFF\rounds\round-2\REVIEW-DOC.md
**Seed:** (none)
**Tokens:** 7126 in / 6027 out · **Cost:** ~$0.0217 · **Wall:** 280.3s · **finish:** stop

---

**Inference Auditor (DeepSeek V4 Pro) – Round 2**

I adopt the consensus candidate verbatim except I add one new MAJOR finding backed by packet evidence. No existing finding is rejected; all are supported by the code excerpts or the explicit probe gaps the packet itself documents. My addition is a direct code defect visible in the packet’s own route-and-middleware table.

**New MAJOR finding – F13: `clientResolver.mjs` L110-166 – admin role not scoped, violates least-privilege**  
The packet’s “Route and middleware ownership probes” table states:  
`/api/ai-command` → `clientResolver.mjs:110-166 scopes trainers but not admins beyond role.`  
This means an admin user can resolve and operate on any client without explicit consent or a server-enforced target‑client boundary. That contradicts non‑negotiable constraint 1 (“Health, training, identity, and workout history require least‑privilege access”). The code path is happy‑path only: it assumes admins are always entitled to all clients, but the builder’s own constraint demands least privilege for every role.  
**Fix:** In `clientResolver.mjs`, add an admin scoping check that requires an explicit, validated client selection (or a documented, audited override) before resolving a target client. The resolver must reject or narrow the scope when no legitimate client context is present. This must be paired with an audit log entry.

All other consensus findings (F2–F12, N1–N3) are verified against the packet’s code excerpts and probe tables; they correctly identify missing contracts, stale‑state (F6), type‑drift (F4, N2/N3), and entitlement gaps. I endorse the fixes exactly as written.

=== VERDICT ===
status: DISPUTE
confidence: 95
findings: F13=MAJOR: clientResolver.mjs L110-166: admin role not scoped, violates least-privilege (constraint 1) | F2=MAJOR: routes.mjs L626-633 + probe table: entitlement middleware must be probed and gated | F3=MAJOR: AITerminalPanel.tsx L119,L133: caller-supplied clientId must be replaced with server-resolved permitted-clientId set | F4=MAJOR: aiWorkoutEvents.ts L121-128: boolean return never maps to durable success; receipt contract missing | F5=MAJOR: routes.mjs L625: spike-lane auth parity and kill switch required | F6=MAJOR: CoachCommandCenterPage.tsx L38-42: activeTab stale on searchParams change | F7=NOTE: probe list for surface classification | F8=NOTE: 4-named-surfaces vs 3-mounts classification | F9=NOTE: SwanCoachAssistantPage legacy classification | F12=NOTE: evidence-boundary admissions | N1=MAJOR: capability-token gate + payload schema + provenance audit + result enum on dispatcher registry | N2=MINOR: AITerminalPanel.tsx L116-139: ambiguous 'both' persistence mode | N3=MINOR: AITerminalPanel.tsx L116-139: undefined failure states for persistence
rebuttals: (none)
open: Q1=what other seats must decide on admin scoping implementation | Q2=verify that F13 fix does not break legitimate admin cross-client workflows
consensus_block: ADOPTED VERBATIM with one addition: F13 — clientResolver.mjs L110-166 must scope admin role to an explicit, validated client selection; enforce least-privilege; log all resolutions. All other fixes (F2–F12, N1–N3) stand as written in the candidate. ACCEPTED AS INTENTIONAL: evidence-boundary admissions, F10/F11 struck, C8 redaction trusted not verified, C7 consistency deferred. RESIDUAL RISKS: (a) F2/F3 severity ceilings unproven until probes return; (b) C6 offline is net-new design; (c) C8 redaction unverified; (d) F1 artifact identity; (e) until N1 lands, client event bus remains unauthenticated in-page capability surface; (f) F13 admin scoping may require UX and workflow redesign.
=== END-VERDICT ===
