# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: high)
**Document:** <HOME>\AppData\Local\Temp\claude\<SCRATCH-KEY>\fe778a8f-f18a-42e8-9876-fedbce2ec1d7\scratchpad\swanguard-slice4-token-review.md
**Seed:** (none)
**Tokens:** 1246 in / 4771 out · **Cost:** ~$0.0753 · **Wall:** 166.4s

---

# SwanGuard Slice 4 — Kimi Review: APPROVED with corrections

Verdict up front: the system is sound. Ship it after the fixes below. The one real problem is that your neutrals are blue-slate — that's the "every SaaS dark mode" hue — and two of your status fills fail contrast with white text.

## 1. Hex values — confirm/replace

**Accent families: confirmed as-is.** Don't touch them.
- `--accent-amber: #e2b155` — correct guardian amber. Warm, not yellow, not gold-bling. ~10.5:1 on obsidian.
- `--signal-teal: #4fb8ad` — correct. Quiet, informational, clearly subordinate to amber. ~7:1 on surfaces.
- Retire `--accent-fern`. Correct call.

**Neutrals: replace.** Your stack (`#141a20` family) is hue ~210° blue-slate — literally the default dark-dashboard palette. The watchtower should be *warm graphite*: neutral-warm, no blue. This is cheap (same tokens) and does half the bespoke work:

| token | replace with |
|---|---|
| --bg-base | `#0c0c0e` |
| --bg-rail | `#100f12` |
| --surface-1 | `#161619` |
| --surface-2 | `#1d1d21` |
| --surface-3 | `#26262b` |
| --text-primary | `#f1f0ee` (warm near-white) |
| --text-muted | `#a5a29e` |
| --border-soft | `rgba(241,240,238,.12)` |

Glass: `rgba(12,12,14,.66)` + blur(14px) + inner highlight `rgba(241,240,238,.08)`. Same recipe, warm-tuned.

Amber on warm graphite reads as *lantern light*. Amber on blue-slate reads as *a theme*.

## 2. WCAG 4.5:1 — two real failures, minimal fixes

Passing: amber (10.5:1), teal (7:1), muted text (6.2:1+), warn `#e0a63f` (7.3:1). All fine as text on surfaces.

**Fail A — `--danger-solid #e5484d` with white text: 3.9:1.** Fix: darken to **`#d9383e`** → 4.7:1 with white. If it's used as *text* on surfaces, it also fails (4.06:1) — use `#f06b70` for danger-text-on-surface (5.3:1).

**Fail B — `--success-solid #46c07a` with white text: 2.3:1.** Fix: keep the hex, use **dark text `#0a2416`** on success fills (7+:1). 

Also: reserve `#4fb8ad` for ≥13px text and chips on solid surfaces. On glass over imagery the effective background is unknown — if teal must sit on glass, brighten text to `#63c9bf`.

## 3. The single amber primary

**Command (Today):** amber sits on the **brief hero card footer — "Confirm Today"** (approve the day's watch plan). It's the one decision the parent owes the system each morning. Demote to ghost: quick links, snooze/dismiss, filters, per-item expand, intel cards (teal chips, no buttons), trivia (already auto — no button at all).

**Trust (ledger):** amber sits on **"Approve" for the top pending request** — the ledger's job is clearing approvals, so the first pending row gets the filled amber; every other row's approve/deny is ghost until it becomes top-of-queue. If you batch, the single amber is a sticky-header "Approve N selected" that only lights when selection exists. Demote to ghost: export, filters, add member, view history, deny (ghost with danger text on confirm).

Kill switch / critical overrides are exempt from the one-primary law — they use danger color + position, not amber. Amber means *trust*, never *alarm*.

## 4. The one highest-impact bespoke move

**The Watchlight.** A single, fixed radial amber glow — `radial-gradient(ellipse 80% 50% at 50% -10%, rgba(226,177,85,.07), transparent)` — anchored to the top of the app shell, behind the rail and Command hero. It's the lantern at the top of the tower. It breathes on a slow 8s cycle, dims when the system is calm, and warms slightly when approvals are pending. One element, zero components rewritten, and no generic dashboard has a *light source*. This, plus the warm-graphite neutrals, is the whole identity. Don't add a second bespoke move.

## 5. Fonts — diverge from the gym

Cormorant Garamond is drama/romance — wrong register for protective calm. Plus Jakarta Sans is friendly-geometric — too soft for intel.

- **Display serif: Fraunces** (Google Fonts). Use optical size 72pt+, weight 400–500, slight negative tracking. Warm, grounded, "established institution" — a watchtower, not a wedding invite. Headlines, the daily brief, Trust totals.
- **UI grotesk: Inter Tight** (Google Fonts). Neutral, engineered, and its tabular numerals (`font-feature-settings: "tnum"`) make the Trust ledger columns snap. All UI, labels, ledger, timestamps.

Fallbacks: `Fraunces, "Iowan Old Style", Georgia, serif` / `"Inter Tight", Inter, system-ui, sans-serif`.

This pairing also cleanly separates the two brands: Cormorant/Jakarta = the crystalline gym; Fraunces/Inter Tight = the watchtower. Same foundry-quality discipline, different temperament — which is exactly what a sister product should feel like.

Set the tokens. Ship Slice 4.
