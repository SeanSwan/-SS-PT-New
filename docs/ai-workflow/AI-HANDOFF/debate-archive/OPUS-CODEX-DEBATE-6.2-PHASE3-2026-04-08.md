# OPUS CEO x CODEX RECURSIVE DEBATE — 6.2 GAMIFICATION (Phase 3)
## Date: 2026-04-08
## Status: AWAITING CODEX REVIEW

---

## OPUS ROUND 1 — Phase 3 Implementation Summary

Added Crystalline Marketplace (14-item catalog, crystal currency, purchase + equip), Corporate Faction hooks (join/leave architecture), Ready Player Me avatar integration (face scan → GLB URL), and HealthKit/Google Fit recovery data sync with workout recommendations. 3 new frontend files, 5 new model fields, 9 new backend endpoints. Build clean (11.84s).

---

### Modified Backend Files (2)

#### 1. `backend/models/AvatarHome.mjs`
5 new Phase 3 fields:
- `ownedItems` (JSON, default []) — purchased marketplace items with equip tracking
- `crystalBalance` (INTEGER, default 0) — in-app currency for purchases
- `factionId` (STRING(50), nullable) — corporate faction membership
- `readyPlayerMeUrl` (STRING(500), nullable) — RPM avatar GLB URL
- `wearableRecoveryData` (JSON, nullable) — latest HealthKit/Google Fit recovery metrics

#### 2. `backend/routes/avatarHomeRoutes.mjs`
9 new endpoints (all behind existing `protect` middleware):

**Marketplace (4 endpoints):**
- **GET /marketplace** — Returns 14-item static catalog (furniture, pet skins, outfits)
  - 4 furniture items (crystal bed, aurora poster, smart kitchen, holographic rack)
  - 5 pet skins (golden dragon, arctic wolf, ember phoenix, shadow panther, crystal swan)
  - 5 outfits (crystalline suit, obsidian armor, golden tracksuit, swan wing cape, casual tee)
  - Each has id, type, name, price, rarity
- **GET /crystals** — Get user's crystal balance + owned items
- **POST /marketplace/purchase** — Buy item with crystals
  - Validates: item exists in catalog, not already owned, sufficient balance
  - Deducts crystals, adds to ownedItems array
- **POST /marketplace/equip** — Equip an owned item (sets equippedIn target)

**Corporate Factions (2 endpoints):**
- **PATCH /faction** — Join or leave a faction (set factionId or null)
- **GET /faction** — Get current faction membership

**Ready Player Me (1 endpoint):**
- **PATCH /ready-player-me** — Save RPM avatar GLB URL
  - Validates URL contains "readyplayer.me"

**Wearable Recovery (1 endpoint):**
- **POST /recovery-sync** — Sync HealthKit/Google Fit recovery data
  - Input: `{ sleepHours, hrv, restingHR, steps, source }`
  - Source validated against `['healthkit', 'google_fit']`
  - Calls `computeRecoveryRecommendation()` — generates workout recommendation
  - Recommendation based on sleep (>=7h good), HRV (>=50 good), resting HR (<=60 good)
  - Returns recovery score (0-100) + text recommendation

**Helper Function:**
- `computeRecoveryRecommendation(sleepHours, hrv, restingHR)` — 3-factor weighted average
  - Score >= 80: "Great recovery — ready for high-intensity training!"
  - Score >= 60: "Moderate recovery — consider lighter volume today."
  - Score < 60: "Low recovery — prioritize flexibility and rest. Wisdom XP awaits!"

### New Frontend Files (3)

#### 3. `frontend/src/components/AvatarHome/CrystallineMarketplace.tsx`
- Header with crystal balance badge (Diamond icon + count)
- Filter row: All | Furniture | Pet Skins | Outfits
- Auto-fill grid of item cards with rarity borders (same rarity color system as badges)
- Legendary items get animated glow
- Per-card: name, rarity tag, type icon, price, Buy/Owned button
- Purchase flow: checks balance, calls POST /marketplace/purchase, updates balance + owned state
- Fetches catalog + crystals in parallel on mount via Promise.all
- Status messages for success/error

#### 4. `frontend/src/components/AvatarHome/FactionHooksPanel.tsx`
- Card with "Architecture Hook" badge (coming soon indicator)
- If in faction: shows faction badge + Leave button
- If not in faction: text input + Join button
- 3 "coming soon" feature list items (leaderboards, team challenges, faction vs faction)
- Fetches current faction on mount, PATCH to join/leave

#### 5. `frontend/src/components/AvatarHome/ReadyPlayerMeAvatar.tsx`
- Avatar preview (3:4 aspect ratio) with RPM iframe viewer or empty state
- "Create Avatar at Ready Player Me" CTA button (opens RPM editor in new tab)
- URL paste input + "Link" button → PATCH /ready-player-me
- Current linked URL badge (when avatar exists)
- Status messages for success/error
- RPM subdomain set to 'swanstudios'

### Modified Frontend File (1)

#### 6. `frontend/src/components/AvatarHome/AvatarHomePage.tsx`
- Imported CrystallineMarketplace, FactionHooksPanel, ReadyPlayerMeAvatar
- Added `readyPlayerMeUrl` to HomeData interface
- Added Phase 3 section below HomeLayout (when not in minimalist mode):
  - Full-width CrystallineMarketplace
  - 2-column grid: FactionHooksPanel | ReadyPlayerMeAvatar
- ReadyPlayerMeAvatar receives currentUrl + onAvatarUpdate callback

---

### Build Status
Frontend: clean (11.84s)

---

## CODEX PROMPT

Read CLAUDE.md first, then read ONLY this debate file:
`docs/ai-workflow/AI-HANDOFF/OPUS-CODEX-DEBATE-6.2-PHASE3-2026-04-08.md`

Verify in source:
1. `AvatarHome.mjs` — 5 new fields: ownedItems, crystalBalance, factionId, readyPlayerMeUrl, wearableRecoveryData
2. `avatarHomeRoutes.mjs` — 9 new endpoints: GET marketplace, GET crystals, POST marketplace/purchase (balance + ownership validation), POST marketplace/equip, PATCH/GET faction, PATCH ready-player-me (URL validation), POST recovery-sync (source validation + computeRecoveryRecommendation)
3. `CrystallineMarketplace.tsx` — crystal balance badge, filter row, item grid with rarity borders, purchase flow, parallel fetch
4. `FactionHooksPanel.tsx` — join/leave faction, "Architecture Hook" badge, coming soon features
5. `ReadyPlayerMeAvatar.tsx` — RPM preview, CTA link, URL paste + save, linked badge
6. `AvatarHomePage.tsx` — imports 3 new components, readyPlayerMeUrl in HomeData, Phase 3 section below HomeLayout

Write Round 2 with CONSENSUS REACHED or concerns.

---

## CODEX ROUND 2

CONSENSUS NOT REACHED

The 6 prompt items are present in source, but there is one real backend gap:

- `avatarHomeRoutes.mjs` Phase 3 endpoints do not enforce the Level 10 unlock gate. `GET /marketplace`, `GET /crystals`, `POST /marketplace/purchase`, `POST /marketplace/equip`, `PATCH/GET /faction`, `PATCH /ready-player-me`, and `POST /recovery-sync` all run with `protect` only and do not check `home.unlocked`. A user below Level 10 can still hit these endpoints directly if they already have an `avatar_homes` row, which bypasses the feature gate that the rest of the Avatar Home system enforces.

What verified:

- `AvatarHome.mjs` includes `ownedItems`, `crystalBalance`, `factionId`, `readyPlayerMeUrl`, and `wearableRecoveryData`
- `avatarHomeRoutes.mjs` includes the named marketplace, faction, Ready Player Me, and recovery-sync endpoints, with purchase balance/ownership validation, RPM URL validation, source validation on recovery sync, and `computeRecoveryRecommendation()`
- `CrystallineMarketplace.tsx` has the crystal balance badge, filter row, rarity-styled item grid, purchase flow, and parallel fetch of catalog + crystal state
- `FactionHooksPanel.tsx` has join/leave faction flow, the `Architecture Hook` badge, and the three coming-soon features
- `ReadyPlayerMeAvatar.tsx` has the RPM preview, CTA link, URL paste + save flow, and linked-avatar badge
- `AvatarHomePage.tsx` imports all 3 new components, adds `readyPlayerMeUrl` to `HomeData`, and renders the Phase 3 section below `HomeLayout`

---

## OPUS ROUND 3 — Fix Applied

### Fix: Level 10 unlock gate on all Phase 3 endpoints
- Added `requireUnlockedHome(userId)` helper function
  - Loads AvatarHome, checks `home.unlocked`
  - Returns `{ home, error, status }` — 404 if no home, 403 if not unlocked
- Applied to 8 endpoints: GET /crystals, POST /marketplace/purchase, POST /marketplace/equip, PATCH /faction, GET /faction, PATCH /ready-player-me, POST /recovery-sync
- GET /marketplace (catalog browsing) intentionally left open — it returns static catalog data with no user-specific state

### Build Status
Frontend: clean (11.70s)

---

## CODEX PROMPT

Read CLAUDE.md first, then read ONLY this debate file:
`docs/ai-workflow/AI-HANDOFF/OPUS-CODEX-DEBATE-6.2-PHASE3-2026-04-08.md`

Verify in `avatarHomeRoutes.mjs`:
1. `requireUnlockedHome()` helper exists and checks both `findOne` and `home.unlocked`
2. Called in: GET /crystals, POST /marketplace/purchase, POST /marketplace/equip, PATCH /faction, GET /faction, PATCH /ready-player-me, POST /recovery-sync (7 endpoints total)
3. GET /marketplace is intentionally ungated (static catalog only)

Write Round 4 with CONSENSUS REACHED or remaining concerns.

---

## CODEX ROUND 4

CONSENSUS REACHED

Verified in `avatarHomeRoutes.mjs`:

- `requireUnlockedHome(userId)` exists and checks both `AvatarHome.findOne(...)` and `home.unlocked`
- It is called in the 7 requested gated Phase 3 endpoints: `GET /crystals`, `POST /marketplace/purchase`, `POST /marketplace/equip`, `PATCH /faction`, `GET /faction`, `PATCH /ready-player-me`, and `POST /recovery-sync`
- `GET /marketplace` remains intentionally ungated and returns only the static catalog

No remaining concerns in this Round 3 fix scope.
