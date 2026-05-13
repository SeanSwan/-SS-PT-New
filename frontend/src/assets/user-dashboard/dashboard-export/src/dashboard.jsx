/* SwanStudios — Crystalline Creator Observatory
   User Dashboard composition. Reads as: dense, layered, alive.
   Built on the locked palette: sapphire glass, violet rim-light, gold only at premium beats. */

const { useState, useEffect, useRef } = React;
const I = window.Icons;

/* ─────────────────────────────────────────────────────────────
   Decorative SVGs — mountain ranges behind the hero banner.
   Layered, flat-poly, with violet/cyan rim lights. No swan
   illustration here — we use the real logo for the avatar.
   ───────────────────────────────────────────────────────────── */
function HeroRanges() {
  return (
    <svg viewBox="0 0 1400 320" preserveAspectRatio="xMidYMid slice"
         style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id="rangeFar" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#0E1F4A"/>
          <stop offset="1" stopColor="#050A18"/>
        </linearGradient>
        <linearGradient id="rangeMid" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#1A2A60"/>
          <stop offset="1" stopColor="#03060E"/>
        </linearGradient>
        <linearGradient id="rangeNear" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#0A1538"/>
          <stop offset="1" stopColor="#020408"/>
        </linearGradient>
        <radialGradient id="moonGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="rgba(127,197,251,0.55)"/>
          <stop offset="1" stopColor="rgba(127,197,251,0)"/>
        </radialGradient>
        <radialGradient id="violetGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="rgba(139,92,246,0.5)"/>
          <stop offset="1" stopColor="rgba(139,92,246,0)"/>
        </radialGradient>
      </defs>

      {/* Atmospheric glows */}
      <circle cx="900" cy="40" r="160" fill="url(#moonGlow)"/>
      <circle cx="280" cy="280" r="220" fill="url(#violetGlow)"/>

      {/* Stars */}
      {Array.from({length: 32}).map((_, i) => {
        const x = (i * 73) % 1400; const y = (i * 37) % 180;
        const r = (i % 3 === 0) ? 1.2 : 0.7;
        return <circle key={i} cx={x} cy={y} r={r} fill="rgba(224,236,244,0.7)"/>;
      })}

      {/* Far range */}
      <path d="M0 200 L120 150 L210 175 L320 130 L430 165 L540 120 L660 155 L780 110 L900 150 L1030 115 L1150 145 L1270 105 L1400 140 L1400 320 L0 320 Z"
            fill="url(#rangeFar)"/>
      {/* Rim line — cyan ridge highlight */}
      <path d="M0 200 L120 150 L210 175 L320 130 L430 165 L540 120 L660 155 L780 110 L900 150 L1030 115 L1150 145 L1270 105 L1400 140"
            fill="none" stroke="rgba(127,197,251,0.45)" strokeWidth="1"/>

      {/* Mid range */}
      <path d="M0 240 L80 210 L180 235 L290 180 L390 220 L500 170 L620 215 L740 175 L860 220 L990 180 L1120 215 L1240 175 L1400 210 L1400 320 L0 320 Z"
            fill="url(#rangeMid)" opacity="0.92"/>
      {/* Violet ridge highlight */}
      <path d="M180 235 L290 180 L390 220 L500 170 L620 215 L740 175 L860 220 L990 180"
            fill="none" stroke="rgba(178,148,240,0.5)" strokeWidth="1"/>

      {/* Near range */}
      <path d="M0 280 L160 245 L300 270 L460 230 L620 265 L780 235 L940 270 L1100 240 L1260 270 L1400 250 L1400 320 L0 320 Z"
            fill="url(#rangeNear)"/>

      {/* Crystal shards in the foreground — small accent geometry */}
      <g opacity="0.65">
        <polygon points="120,260 140,200 158,255 142,290 122,285" fill="rgba(127,197,251,0.35)" stroke="rgba(127,197,251,0.6)"/>
        <polygon points="155,275 170,235 180,275 168,300" fill="rgba(139,92,246,0.35)" stroke="rgba(178,148,240,0.6)"/>
        <polygon points="1220,265 1240,215 1260,265 1245,300 1225,295" fill="rgba(127,197,251,0.3)" stroke="rgba(127,197,251,0.55)"/>
        <polygon points="1180,278 1195,250 1210,280" fill="rgba(139,92,246,0.3)" stroke="rgba(178,148,240,0.55)"/>
      </g>

      {/* lake reflection band */}
      <rect x="0" y="280" width="1400" height="40" fill="url(#rangeNear)" opacity="0.3"/>
      <line x1="0" y1="280" x2="1400" y2="280" stroke="rgba(127,197,251,0.18)" strokeWidth="0.6"/>
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────
   Hexagonal level badge — gold-rimmed
   ───────────────────────────────────────────────────────────── */
const LevelHex = ({ level = 14, size = 44 }) => (
  <div className="hex" style={{ '--s': size + 'px' }}>
    <span>{level}</span>
  </div>
);

/* ─────────────────────────────────────────────────────────────
   Avatar — uses brand logo
   ───────────────────────────────────────────────────────────── */
const Avatar = ({ size = 132, level = 14, src = 'assets/logo.png' }) => (
  <div className="avatar-ring" style={{ '--size': size + 'px' }}>
    <div className="inner"><img src={src} alt="Avatar"/></div>
    {level != null && (
      <div className="level-badge"><LevelHex level={level} size={Math.max(36, size*0.32)}/></div>
    )}
  </div>
);

/* ─────────────────────────────────────────────────────────────
   Mini sparkline (trending)
   ───────────────────────────────────────────────────────────── */
const Sparkline = ({ seed = 1, color = '#7FC5FB' }) => {
  const pts = Array.from({length: 12}).map((_, i) => {
    const y = 12 - Math.abs(Math.sin((i + seed) * 0.9)) * 8 - (i * 0.3);
    return `${i * 6},${y}`;
  }).join(' ');
  return (
    <svg className="spark" viewBox="0 0 70 18" fill="none">
      <polyline points={pts} stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  );
};

/* ─────────────────────────────────────────────────────────────
   LEFT RAIL
   ───────────────────────────────────────────────────────────── */
function LeftRail({ active, setActive }) {
  const navItems = [
    { id: 'feed', label: 'Feed', icon: I.home },
    { id: 'reels', label: 'Reels', icon: I.reels },
    { id: 'creative', label: 'Creative', icon: I.creative },
    { id: 'photos', label: 'Photos', icon: I.photos },
    { id: 'about', label: 'About', icon: I.about },
    { id: 'activity', label: 'Activity', icon: I.activity },
    { id: 'nutrition', label: 'Nutrition', icon: I.nutrition },
  ];
  const days = ['M','T','W','T','F','S','S'];
  const filled = [true, true, true, true, true, false, false];

  return (
    <aside className="left-rail">
      {/* Brand */}
      <div className="row gap-12" style={{ padding: '4px 4px 0' }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, overflow: 'hidden',
                       boxShadow: '0 0 18px rgba(139,92,246,0.4)' }}>
          <img src="assets/logo.png" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '0.01em' }}>SwanStudios</div>
          <div className="eyebrow cyan" style={{ fontSize: 9, marginTop: 2 }}>Crystalline Creator Observatory</div>
        </div>
      </div>

      {/* Nav panel */}
      <div className="panel" style={{ padding: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map(it => (
            <button key={it.id}
                    className={'nav-item' + (active === it.id ? ' active' : '')}
                    onClick={() => setActive(it.id)}>
              <span className="ico"><it.icon size={20}/></span>
              {it.label}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          <window.GlowButton variant="accent" size="medium" fullWidth leftIcon={<I.plus size={18}/>}>
            Create Post
          </window.GlowButton>
        </div>
      </div>

      {/* Level card */}
      <div className="panel">
        <div className="row gap-8" style={{ marginBottom: 12 }}>
          <span style={{ color: '#7FC5FB', display: 'inline-flex' }}><I.spark2 size={14}/></span>
          <span className="eyebrow">Level 14</span>
        </div>
        <div className="row-between" style={{ alignItems: 'flex-end', marginBottom: 10 }}>
          <div style={{ fontFamily: 'var(--font-ui), Sora, sans-serif', fontSize: 30, fontWeight: 600 }}>
            7,280 <span style={{ color: 'rgba(224,236,244,0.45)', fontSize: 18, fontWeight: 400 }}>/ 10,000 XP</span>
          </div>
        </div>
        <div className="bar"><div className="fill" style={{ width: '72.8%' }}/></div>
        <div className="row-between" style={{ marginTop: 10 }}>
          <span className="eyebrow" style={{ fontSize: 9.5 }}>2,720 to Level 15</span>
          <span className="eyebrow cyan" style={{ fontSize: 9.5 }}>72.8%</span>
        </div>
      </div>

      {/* Streak card */}
      <div className="panel">
        <div className="row gap-8" style={{ marginBottom: 10 }}>
          <span style={{ color: '#DAC36E', display: 'inline-flex' }}><I.fire size={14}/></span>
          <span className="eyebrow gold">Creator Streak</span>
        </div>
        <div className="row gap-8" style={{ alignItems: 'baseline' }}>
          <div style={{ fontFamily: 'var(--font-ui), Sora, sans-serif', fontSize: 36, fontWeight: 600, letterSpacing: '-0.02em' }}>16</div>
          <div style={{ fontFamily: 'var(--font-data), monospace', fontSize: 11, color: 'rgba(224,236,244,0.55)' }}>DAYS</div>
          <div style={{ marginLeft: 'auto', color: 'rgba(218,195,110,0.85)' }}>
            <I.plus size={16}/>
          </div>
        </div>
        <div className="row gap-6" style={{ marginTop: 14, justifyContent: 'space-between' }}>
          {days.map((d, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div className={'day-chip' + (filled[i] ? ' ok' : '')}>
                {filled[i] && <I.badgeCheck size={12}/>}
              </div>
              <div style={{ fontSize: 9.5, color: 'rgba(224,236,244,0.45)' }}>{d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Top categories */}
      <div className="panel">
        <div className="eyebrow" style={{ marginBottom: 12 }}>Top Categories</div>
        <div className="row gap-8">
          {[
            { ic: I.dumbbell, c: '#7FC5FB' },
            { ic: I.music,    c: '#DAC36E' },
            { ic: I.gaming,   c: '#B294F0' },
            { ic: I.palette,  c: '#60C0F0' },
          ].map((x, i) => (
            <div key={i} style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(160deg, rgba(8,18,42,0.85), rgba(4,10,24,0.95))',
              border: '1px solid rgba(96,192,240,0.22)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: x.c,
            }}>
              <x.ic size={20}/>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

/* ─────────────────────────────────────────────────────────────
   HERO BANNER (avatar + identity + stats + tabs)
   ───────────────────────────────────────────────────────────── */
function HeroBanner({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'reels',    label: 'Reels',    icon: I.reels },
    { id: 'feed',     label: 'Feed',     icon: I.feed },
    { id: 'creative', label: 'Creative', icon: I.creative },
    { id: 'photos',   label: 'Photos',   icon: I.photos },
    { id: 'activity', label: 'Activity', icon: I.activity },
    { id: 'nutrition',label: 'Nutrition',icon: I.nutrition },
  ];
  return (
    <div>
      <div className="hero-banner">
        <div className="bg"/>
        <div className="ranges"><HeroRanges/></div>

        {/* content overlay */}
        <div style={{ position: 'relative', padding: '32px 36px 28px', display: 'flex', gap: 32, alignItems: 'flex-start' }}>
          <Avatar size={148} level={14}/>

          {/* identity column */}
          <div style={{ flex: 1, minWidth: 0, paddingTop: 6 }}>
            <div className="row gap-10" style={{ flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontFamily: 'var(--font-head)', fontSize: 38, fontWeight: 600, letterSpacing: '-0.02em' }}>
                SwanCreator
              </h1>
              <span className="verified"><svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M3 8l3 3 7-7" stroke="#061026" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
            </div>
            <div className="row gap-10" style={{ marginTop: 8, flexWrap: 'wrap' }}>
              <span style={{ color: 'rgba(224,236,244,0.7)', fontSize: 14 }}>@swancreator</span>
              <span className="chip violet">Crystal Voyager</span>
              <span className="chip cyan">Creator</span>
            </div>
            <div style={{ marginTop: 12, color: 'rgba(224,236,244,0.78)',
                          fontFamily: 'var(--font-editorial), Georgia, serif',
                          fontStyle: 'italic', fontSize: 17 }}>
              Create. Inspire. Level Up. <span style={{ color: '#B294F0' }}>✦</span>
            </div>
          </div>

          {/* stats column */}
          <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start', paddingTop: 10 }}>
            <div className="stat-col">
              <div className="lbl">Posts</div>
              <div className="val">487</div>
            </div>
            <div className="stat-col">
              <div className="lbl">Followers</div>
              <div className="val">24.8K</div>
            </div>
            <div className="stat-col">
              <div className="lbl">Following</div>
              <div className="val">312</div>
            </div>
            <div className="stat-col">
              <div className="lbl">XP Balance</div>
              <div className="row gap-6" style={{ alignItems: 'center' }}>
                <span style={{
                  width: 18, height: 18, borderRadius: 5,
                  background: 'linear-gradient(160deg, #DAC36E, #8a6a2a)',
                  display: 'inline-flex', alignItems:'center', justifyContent:'center',
                  fontSize: 9, fontWeight: 700, color: '#1A1505',
                }}>XP</span>
                <div className="val gold">18,450</div>
              </div>
            </div>
          </div>
        </div>

        {/* actions row */}
        <div style={{ position: 'relative', padding: '0 36px 24px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn-ghost"><I.edit size={14}/> Edit Profile</button>
          <button className="btn-ghost"><I.share size={14}/> Share</button>
          <button className="btn-icon"><I.gear size={16}/></button>
        </div>
      </div>

      {/* Tab strip */}
      <div className="row" style={{ marginTop: 22, gap: 22, justifyContent: 'flex-start', paddingLeft: 4 }}>
        {tabs.map(t => (
          <div key={t.id} className={'cat-tab' + (activeTab === t.id ? ' active' : '')}
               onClick={() => setActiveTab(t.id)}>
            <div className="puck"><t.icon size={26}/></div>
            <div className="label">{t.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

window.HeroRanges = HeroRanges;
window.LevelHex = LevelHex;
window.Avatar = Avatar;
window.Sparkline = Sparkline;
window.LeftRail = LeftRail;
window.HeroBanner = HeroBanner;
