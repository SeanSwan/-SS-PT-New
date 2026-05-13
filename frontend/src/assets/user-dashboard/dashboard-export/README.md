# SwanStudios — User Dashboard (Crystalline Creator Observatory)

## Run locally
Open `User Dashboard.html` in a browser. Needs internet for fonts + React/Babel CDN.

## File tree
```
User Dashboard.html        ← entry point
assets/logo.png            ← brand swan logo
styles/
  tokens.css               ← locked palette + type vars (shared with homepage)
  glow.css                 ← GlowButton + SheenCard primitives (shared)
  dashboard.css            ← dashboard-only layout + components
src/
  glow.jsx                 ← GlowButton + SheenCard (shared primitives)
  dashboard-icons.jsx      ← SVG icon set
  dashboard.jsx            ← Avatar, LeftRail, HeroBanner
  dashboard-center.jsx     ← ReelsSpotlight, QuickPost, Feed posts
  dashboard-right.jsx      ← Stories, LiveActivity, Challenge, Badges,
                             Leaderboard, Trending, Transformation,
                             WeeklyMomentum, NextBestAction
  dashboard-app.jsx        ← App composition + TopBar + XP toast
```

## Porting to React/styled-components production
1. Each `*.jsx` here is plain React (no JSX-transform deps beyond React 18).
   The components on `window.*` are just for Babel-standalone scope sharing —
   drop the `window.X = X` lines and use real `import` / `export` in your
   bundler.
2. `dashboard.css` uses plain CSS custom properties. Migrate piece by piece to
   styled-components if desired — the class names map 1:1 to logical units.
3. Required external assets:
   - Plus Jakarta Sans, Cormorant Garamond, Fira Code, Sora (Google Fonts)
   - assets/logo.png (your brand swan)
4. State the dashboard expects from your backend:
   - profile: { handle, displayName, verified, tagline, tier, level, xp, xpToNext, streakDays, streakWeek[] }
   - stats:   { posts, followers, following, xpBalance }
   - feed:    [{ author, time, category, caption, tags, media, likes, comments, retweets, shares }]
   - stories, liveActivity, challenges, badges, leaderboard, trending, transformation, momentum

Built on the locked palette: sapphire glass + Wing Purple rim-light + Gilded
Fern only at premium beats (XP, streaks, active challenge, leaderboard #1).
