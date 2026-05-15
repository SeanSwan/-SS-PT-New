# UserDashboard Home Shell Prototype Handoff

## Scope

This handoff covers `userdashboard-home-shell-prototype.html`, a continuation prototype for the existing UserDashboard V3 / Crystalline Creator Observatory direction. It does not redesign the dashboard from scratch. Home is the primary high-fidelity surface; Community, Reels, Progress, Profile, Workouts, and Rewards are represented as shared-shell extensions to prove the system can scale without replacing every tab in the first pass.

Primary references used:

- `OPEN-DESIGN-USERDASHBOARD-GO-PROMPT.md`
- `User Dashboard.html`
- `userdashboard-vision.png`
- `userdashboard-vision-mobile.png`
- `styles/tokens.css`
- `styles/dashboard.css`
- `src/dashboard-app.jsx`
- `src/dashboard.jsx`
- `src/dashboard-center.jsx`
- `src/dashboard-right.jsx`
- `open-design-reference-pack-2026-05-14/production-context/frontend/src/components/UserDashboard/UserDashboard.V3.tsx`
- `open-design-reference-pack-2026-05-14/production-context/frontend/src/components/UserDashboard/components/HomeTab.tsx`
- `open-design-reference-pack-2026-05-14/production-context/frontend/src/components/UserDashboard/components/ObservatoryShell.tsx`
- `open-design-reference-pack-2026-05-14/production-context/frontend/src/components/UserDashboard/components/ObservatoryShellAdapter.ts`
- `open-design-reference-pack-2026-05-14/production-context/frontend/src/components/UserDashboard/components/ObservatoryMobileNav.tsx`

## Component Map

| Prototype area | Production target | Notes |
| --- | --- | --- |
| App shell grid | `ObservatoryShell`, `HomeTab` | Desktop uses left rail, center column, right rail. Mobile hides desktop rails and uses bottom nav. |
| Left navigation | `HomeTabVisionLeftRail`, `ObservatoryLeftRail` | Home-first nav includes Home, Reels, Community, Progress, Profile, Workouts, Rewards as prototype extension targets. Production adapter currently exposes Home, Feed, Progress, Community, Profile. |
| Top utility row | `HomeTabVisionCenter`, profile/header utility actions | Search, messages, notifications, XP pill are visual shell cues only in the prototype. Wire only to proven production routes/actions. |
| Hero profile/banner | `HomeTabVisionCenter`, `UserDashboardProfileHeaderV3` | Preserves avatar ring, level hex, tier chip, stats, edit/share/settings actions. |
| Lens selector | `HomeTabVisionCenter` | Reels, Feed, Creative, Photos, Activity, Training switch active shell context. |
| Reels spotlight | `HomeTabVisionCenter` | High-fidelity Home module with play CTA and Create Reel action. |
| Quick Post | `HomeTabVisionCenter` and `useCreatePost` flow | Prototype stages a draft locally; production should use `buildHomePostPayload` and `useCreatePost`. |
| Feed post preview | `HomeTabVisionCenter` / social feed card | Local preview updates when a draft is staged. |
| Right rail widgets | `HomeTabVisionRightRail`, `ObservatoryRightRail` | Stories, activity, challenge, badges, leaderboard, momentum, trending remain modular cards. |
| Mobile bottom nav | `HomeTabVisionCards.styles`, `ObservatoryMobileNav` | Prototype uses Home, Reels, Create, Progress, Profile. It avoids a fake Inbox route. |

## Styled-Components Plan

1. Keep production split: `HomeTab` orchestrates Home; `ObservatoryShell` handles non-home shell composition.
2. Move prototype tokens into existing styled-components token patterns:
   - sapphire glass backgrounds
   - cyan/violet rim borders
   - gold XP/challenge accents
   - Plus Jakarta Sans, Sora, Fira Code, Cormorant Garamond
3. Extract reusable primitives:
   - `ObservatoryGlassPanel`
   - `ObservatoryIconButton`
   - `ObservatoryPrimaryAction`
   - `ObservatoryMetricBar`
   - `ObservatoryHexBadge`
   - `CreatorMoodButton`
   - `MobileBottomNavItem`
4. Keep shared style chunks wrapped in the styled-components `css` helper when they interpolate tokens, keyframes, or component helpers.
5. Preserve `prefers-reduced-motion` and focus-visible states from the prototype.

## Mobile Navigation Plan

Prototype mobile nav:

- Home: active dashboard root.
- Reels: route/action surface for social reels.
- Create: focuses the quick-post composer.
- Progress: switches to Progress extension context.
- Profile: switches to Profile extension context.

Production guardrails:

- Keep all mobile nav items at 44px minimum touch target.
- Do not add Inbox unless a canonical route is proven.
- Keep Create central and thumb-reachable.
- At widths `300`, `332`, `390`, and `430px`, hide desktop rails, keep cards single-column, and prevent horizontal overflow.

## Mock / Live-Ready Data Contracts

```ts
type CreatorProfile = {
  displayName: string;
  username: string;
  avatarSrc: string;
  tierName: string;
  level: number;
  points: number;
  pointsToNext: number;
  progressPercent: number;
  streakDays: number;
};

type CreatorStats = {
  posts: number;
  followers: number;
  following: number;
  xpBalance: number;
};

type QuickPostDraft = {
  content: string;
  mood: "Workout" | "Transform" | "Achievement" | "Challenge" | "Community";
  media?: File | null;
  visibility: "everyone" | "friends" | "private";
};

type ObservatoryWidgetData = {
  stories: Array<{ label: string; avatarSrc?: string; viewed?: boolean }>;
  liveActivityItems: Array<{ actor: string; action: string; timeLabel: string; type: string }>;
  activeChallenge: { title: string; summary: string; completed: number; total: number; endsAtLabel: string };
  badges: Array<{ id: string; label: string; rarity: "common" | "rare" | "epic" | "legendary" }>;
  leaderboardRows: Array<{ rank: number; displayName: string; points: number; isCurrentUser?: boolean }>;
  trendingTags: Array<{ tag: string; countLabel: string; trend: number[] }>;
};
```

Live wiring notes:

- Quick Post should continue using `buildHomePostPayload` and `useCreatePost`.
- Reels should navigate to the proven social reels route, not simulate a write.
- Progress modules should consume existing workout/progress data contracts only.
- Rewards redemption requires a confirmed backend contract before any "redeem" action appears.

## QA Checklist

- No horizontal overflow at `300`, `332`, `390`, `430px`.
- Mobile nav remains visible and thumb-reachable.
- Interactive controls are 44px minimum.
- Focus-visible state is present.
- Motion uses transform/opacity where applicable and respects reduced motion.
- Copy uses training, workout, recovery, stretching, mobility, and flexibility language.
- Prototype does not imply automated write behavior.
