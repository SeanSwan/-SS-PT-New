# Gamification & Badge System
> Reference doc extracted from CLAUDE.md. Loaded on-demand, not every message.
> Read when: gamification features, leveling, badges, tier progression, point awards

---

## Gamification & Badge System (MANDATORY)

SwanStudios has a production-grade gamification engine built on the **Octalysis Framework**. Every workout, social action, and milestone triggers point awards that drive leveling, badges, and tier progression.

### Leveling Algorithm
- **Formula:** `level = floor(0.1 × sqrt(totalPoints))`
- **Inverse:** `pointsForLevel = ceil((level / 0.1)²)`
- **Implementation:** `backend/utils/levelingAlgorithm.mjs`

### 5-Tier Progression System
| Tier | Name | Levels | Points Required | Theme Color |
|------|------|--------|-----------------|-------------|
| 1 | Bronze Forge | 1-10 | 100 – 10,000 | `#CD7F32` |
| 2 | Silver Edge | 11-25 | 10,000 – 62,500 | `#C0C0C0` |
| 3 | Titanium Core | 26-50 | 62,500 – 250,000 | `#878681` |
| 4 | Obsidian Warrior | 51-99 | 250,000 – 1,000,000 | Obsidian Black `#0A0A0F` |
| 5 | Crystalline Swan | 100+ | 1,000,000+ | Animated gradient (sapphire→purple→cyan→gold) |

### Point Awards (Configurable via GamificationSettings)
| Action | Base Points | Context |
|--------|-------------|---------|
| Complete Workout | 50 | Per logged workout session |
| Complete Exercise | 10 | Per exercise in workout log |
| Personal Record | 100 | New 1RM or volume PR |
| Daily Login | 10 | Once per day |
| 3-Day Streak | 25 | Bonus on streak milestone |
| 7-Day Streak | 75 | Bonus on streak milestone |
| 30-Day Streak | 300 | Bonus on streak milestone |
| 90-Day Streak | 1,000 | Bonus on streak milestone |
| 365-Day Streak | 5,000 | Bonus on streak milestone |
| Social Post | 15 | Creating content on social feed |
| Review/Comment | 15 | Engaging with community |
| Referral | 200 | Bringing new users |
| Education Module | 50 | Completing NASM learning content |

### Badge & Achievement System
- **4 rarity levels** with visual glow mapping:
  | Rarity | Color | Glow | XP Multiplier |
  |--------|-------|------|----------------|
  | Common | Swan Lavender `#4070C0` | Subtle pulse | 1.0x |
  | Rare | Gilded Fern `#C6A84B` | Gold shimmer | 1.5x |
  | Epic | Wing Purple `#8B5CF6` | Purple aurora | 2.0x |
  | Legendary | Animated gradient | Full particle burst | 3.0x |
- **6 skill trees:** Awakening, Forge NASM, Iron & Gravity, The Tribe (social), Free Spirit, The Unbroken (streaks)
- **6 achievement categories:** fitness, social, streak, milestone, special, community
- **Badge art:** 20+ styles in `frontend/public/badges/` (claymation, glass, metallic, crystal, holographic, neon, steampunk, etc.)
- **Badge manifest:** `frontend/public/badge-manifest.json` + `frontend/public/badges/achievements/achievement-badge-manifest.json`

### Level-Up Animation Protocol (MANDATORY)
When a user levels up or earns a badge, the UI MUST trigger:
1. **Background glow pulse** — Tier-colored radial gradient expands from center over 2s (`@keyframes tierGlowPulse`)
2. **Particle burst** — 12-20 particles in rarity color emit from badge icon, fade over 1.5s
3. **Badge entrance** — Scale from 0→1.1→1.0 with 0.6s spring easing + rarity-colored box-shadow glow
4. **XP counter animation** — Count-up from previous XP to new XP with `requestAnimationFrame`
5. **Streak fire** — On streak milestones (7, 30, 90, 365), animated fire/ice particles around streak counter
- Animation components: `frontend/src/components/DashBoard/Pages/admin-exercises/styles/gamificationAnimations.ts`
- Celebration component: `frontend/src/components/DashBoard/Pages/admin-exercises/components/AdminAchievementCelebration.tsx`
- **Performance:** All animations MUST use `transform` and `opacity` only (GPU-composited). No `width`/`height`/`top`/`left` animations.

### Backend Architecture
| Layer | File | Purpose |
|-------|------|---------|
| Model | `backend/models/Achievement.mjs` | Achievement definitions (484 lines) |
| Model | `backend/models/UserAchievement.mjs` | User progress tracking (541 lines) |
| Model | `backend/models/Gamification.mjs` | Per-user XP/level/tier state |
| Model | `backend/models/GamificationSettings.mjs` | Singleton config (point values, multipliers) |
| Engine | `backend/services/gamification/GamificationEngine.mjs` | Core points/achievement/tier logic |
| Persistence | `backend/services/gamification/GamificationPersistence.mjs` | DB persistence layer |
| Ethics | `backend/services/gamification/EthicalGamification.mjs` | Prevents exploitative patterns |
| Controller | `backend/controllers/gamificationController.mjs` | 25+ API endpoints |
| Routes | `backend/routes/gamificationRoutes.mjs` | REST API routes |

### Frontend Architecture
| Layer | File | Purpose |
|-------|------|---------|
| Redux | `frontend/src/redux/slices/gamificationSlice.ts` | State management |
| Types | `frontend/src/types/gamification.ts` | TierName, SkillTree, Rarity enums |
| Hub | `frontend/src/components/AdvancedGamification/AdvancedGamificationHub.tsx` | Main gamification UI |
| Badge Gallery | `frontend/src/components/BadgeGallery/BadgeArtGallery.tsx` | Admin badge browser |
| Admin | `frontend/src/components/DashBoard/Pages/admin-gamification/` | Admin gamification management |
| Client | `frontend/src/components/DashBoard/Pages/client-gamification/` | Client gamification view |
| Trainer | `frontend/src/components/DashBoard/Pages/trainer-gamification/` | Trainer gamification view |

### Gamification Integration Rules (MANDATORY)
- **Workout logging MUST trigger gamification:** When a workout is saved, call `GamificationEngine.awardPoints()` with action type and exercise count
- **Social posts MUST trigger gamification:** Creating a post, comment, or like awards social points
- **Badge checks run after every point award:** The engine checks if any achievement criteria are newly met
- **Leaderboards refresh on point changes:** Global, friends, category leaderboards update in real-time
- **Admin can adjust all point values** via GamificationSettings without code changes
- **Never award points for the same action twice** — use idempotency keys (userId + actionType + timestamp)
