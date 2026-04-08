# OPUS CEO x CODEX DEBATE — 6.2 GAMIFICATION (Phase 3) — SUMMARY
## Date: 2026-04-08 | Status: CONSENSUS REACHED (Round 4)

### Outcomes
- 5 new AvatarHome model fields: ownedItems, crystalBalance, factionId, readyPlayerMeUrl, wearableRecoveryData
- 9 new backend endpoints: marketplace CRUD, faction join/leave, RPM avatar, recovery sync
- 3 new frontend components: CrystallineMarketplace, FactionHooksPanel, ReadyPlayerMeAvatar
- AvatarHomePage updated with Phase 3 section (marketplace + factions + RPM)
- Build clean (11.70s)

### Key Decisions
- Crystal currency earned through gameplay, no real-money IAP
- 14-item static catalog (furniture, pet skins, outfits) with rarity tiers
- Faction hooks = architecture only, full warfare deferred
- RPM URL validation (must contain readyplayer.me)
- Recovery recommendation from 3-factor weighted average (sleep/HRV/resting HR)

### Codex Corrections (Round 2)
- Phase 3 endpoints missing Level 10 unlock gate — fixed with requireUnlockedHome() on 7 endpoints
- GET /marketplace intentionally left open (static catalog, no user state)

Full transcript: `debate-archive/OPUS-CODEX-DEBATE-6.2-PHASE3-2026-04-08.md`
