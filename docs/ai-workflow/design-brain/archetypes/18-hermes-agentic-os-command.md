<!-- GENERATED from website-archetypes.md @ cd50724f40cf — do not hand-edit; edit the monolith and re-run build-archetype-index.mjs -->

## 18. Hermes Agentic OS command center (Cyberforest mode — Sean-only)

- **Use when:** Sean's private operator surface — approval queue, kill switches, receipts, agent status. NOT a product surface; governed by the Operator Bridge (T0–T4, §10 design boundary).
- **Feel:** Crystalline Cyberforest — the same token system in operator dress: darker, denser, bioluminescent-circuit accents; a night-forest ops room. Operator aesthetics NEVER leak into client-facing UI.
- **Arc:** Dash 4-phase. **Hero:** status-horizon band — runtime health, active agents, pending approvals count, master kill-switch state, all in one glance. **Motion:** M1 hard cap (an ops surface must never animate away trust; status changes pulse once, then rest).
- **Sections in order:** Phase 1 status horizon → Phase 2 approval queue (each entry: actor · command · tier · target · expiry; T3/T4 visually loud — Wing Purple for T3, Danger red + two-step confirm for T4 (badge ladder per design.md §11)) → Phase 3 receipts stream (append-only, filterable) + agent activity → Phase 4 next decision (oldest pending approval or "all clear").
- **Conversion goal:** operator decision speed — approve/deny with full context in minimum taps; kill switch reachable in ≤2 interactions from anywhere.
- **Trust:** receipts are the truth surface ("no receipt → it didn't happen correctly"); kill switches first-class panel, never buried; ambiguity rounds UP visually (uncertain tier renders as the higher tier).
- **Mobile:** Telegram is the mobile lane — this surface optimizes desktop/1440p+; still no hover-only controls (product rules apply to operator UI too: 44px, dark-first, reduced-motion, 4.5:1).
- **A11y:** tier distinctions never color-only (T-badge text always); approval actions keyboard-operable; focus trap on T4 two-step confirm.
- **Components:** `GlassPanel` obsidian variant, `GlowButton` (T4 confirm gets the two-step pattern from `components.md`), receipt/queue-row patterns; Cyberforest accent tokens per `design.md` — proposed tokens go through the token-proposal process, never hardcoded.
- **Anti-patterns:** marketing polish that obscures state; auto-refresh that moves a row as Sean reaches to click it; celebratory animation on destructive actions; any affordance implying an unregistered command is runnable (unregistered = blocked, not T0).
- **Fable brief:** "Hermes command center [panel]. The operator question it answers: [X]. Directions: status-horizon composition, tier-visual language, T4 confirm choreography. Cyberforest mode, M1 cap."
- **Builder brief:** "Direction [n]. Every action wired to the registry tier (no improvised tiers); kill-switch state fail-closed in UI (unknown = shown as OFF/blocked); receipts append-only; no direct DB reads — API layer only."
- **Harness QA (supervised, T0 read-only per Bridge §6):**
  - [ ] tier badges match registry entries
  - [ ] T4 requires two distinct interactions
  - [ ] kill-switch panel reachable ≤2 clicks
  - [ ] stale `Updated:` timestamps visibly flagged
  - [ ] no PII in any rendered receipt
- **Village questions:**
  - Can a tired Sean at 1am mis-approve a T4?
  - Does the UI ever imply more authority than the registry grants?
  - What does the surface look like when the daemon is down?
