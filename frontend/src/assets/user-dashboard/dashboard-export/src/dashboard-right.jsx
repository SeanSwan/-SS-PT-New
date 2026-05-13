/* SwanStudios Dashboard — Right rail
   Stories / Live Activity / Active Challenge / Badges + Leaderboard /
   Trending / Transformation / Weekly Momentum / Next Best Action */

const I3 = window.Icons;

/* Story bubbles */
function Stories() {
  const items = [
    { label: 'Your Story', plus: true, palette: 'violet' },
    { label: 'CrystalBloom', palette: 'cyan' },
    { label: 'LunaDrift', palette: 'violet' },
    { label: 'SkyWeaver', palette: 'cyan' },
    { label: 'EchoVale', palette: 'gold' },
  ];
  return (
    <div className="panel">
      <div className="row-between" style={{ marginBottom: 14 }}>
        <span className="eyebrow">Stories from the Garden</span>
        <a href="#" style={{ color: '#7FC5FB', fontSize: 12, textDecoration: 'none' }}>View all</a>
      </div>
      <div className="row gap-10" style={{ overflowX: 'auto' }}>
        {items.map((it, i) => (
          <div key={i} className="story">
            <div className="bubble" style={{
              background: it.plus
                ? 'conic-gradient(from 90deg, #8B5CF6, #B294F0, #7FC5FB, #8B5CF6)'
                : (it.palette === 'gold'
                    ? 'conic-gradient(from 90deg, #DAC36E, #C6A84B, #DAC36E)'
                    : it.palette === 'violet'
                      ? 'conic-gradient(from 90deg, #8B5CF6, #B294F0, #4A9FE0, #8B5CF6)'
                      : 'conic-gradient(from 90deg, #7FC5FB, #4A9FE0, #60C0F0, #7FC5FB)'),
            }}>
              <div>
                {it.plus ? (
                  <div style={{ width:'100%', height:'100%', borderRadius:'50%', background:'#07101F',
                                  display:'flex', alignItems:'center', justifyContent:'center',
                                  position:'relative' }}>
                    <img src="assets/logo.png" style={{ width:'72%', height:'72%', objectFit:'cover', borderRadius:'50%' }}/>
                    <div style={{ position:'absolute', bottom:-2, right:-2,
                                   width:18, height:18, borderRadius:'50%',
                                   background:'linear-gradient(180deg,#8B5CF6,#5A2EC7)',
                                   border:'2px solid #07101F', display:'flex',
                                   alignItems:'center', justifyContent:'center', color:'#fff' }}>
                      <I3.plus size={11}/>
                    </div>
                  </div>
                ) : (
                  <div style={{ width:'100%', height:'100%' }}>
                    {/* mini scene per story */}
                    {it.palette === 'cyan' ? <MiniScene tone="cyan"/> :
                     it.palette === 'gold' ? <MiniScene tone="gold"/> :
                                                <MiniScene tone="violet"/>}
                  </div>
                )}
              </div>
            </div>
            <div className="lbl">{it.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniScene({ tone = 'violet' }) {
  const tones = {
    cyan:   { sky: ['#0E2754', '#020A1A'], rim: '#7FC5FB' },
    violet: { sky: ['#2A0E58', '#0A0420'], rim: '#B294F0' },
    gold:   { sky: ['#3A2510', '#0F0904'], rim: '#DAC36E' },
  }[tone];
  return (
    <svg viewBox="0 0 60 60" preserveAspectRatio="xMidYMid slice" style={{ width:'100%', height:'100%' }}>
      <defs>
        <linearGradient id={`mini-${tone}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={tones.sky[0]}/><stop offset="1" stopColor={tones.sky[1]}/>
        </linearGradient>
      </defs>
      <rect width="60" height="60" fill={`url(#mini-${tone})`}/>
      <polygon points="0,60 12,35 22,45 36,25 50,40 60,30 60,60" fill="#020408" opacity="0.85"/>
      <path d="M0 42 L12 35 L22 45 L36 25 L50 40 L60 30" fill="none" stroke={tones.rim} strokeWidth="0.7" opacity="0.55"/>
      <circle cx="44" cy="14" r="2" fill={tones.rim} opacity="0.7"/>
    </svg>
  );
}

/* Live activity */
function LiveActivity() {
  const items = [
    { user: 'IronMuse',    action: 'completed a challenge', time: '2m ago', icon: I3.trophy, color: '#DAC36E' },
    { user: 'PixelPainter',action: 'earned a new badge',    time: '7m ago', icon: I3.spark2, color: '#B294F0' },
    { user: 'BeatCraft',   action: 'posted a new reel',     time: '5m ago', icon: I3.reels,  color: '#7FC5FB' },
    { user: 'LiftLab',     action: 'liked your post',       time: '9m ago', icon: I3.heart,  color: '#F87171' },
  ];
  return (
    <div className="panel">
      <div className="row-between" style={{ marginBottom: 14 }}>
        <span className="eyebrow">Live Activity</span>
        <a href="#" style={{ color: '#7FC5FB', fontSize: 12, textDecoration: 'none' }}>View all</a>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '4px 0' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%',
                            background:'linear-gradient(160deg,#1A2A60,#03060E)',
                            display:'flex', alignItems:'center', justifyContent:'center',
                            flexShrink: 0 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: i % 2 ? 'linear-gradient(135deg,#7851A9,#4A9FE0)' : 'linear-gradient(135deg,#0E2754,#1A0B3E)',
                color: '#E0ECF4', fontWeight: 700, fontSize: 11,
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>{it.user[0]}</div>
            </div>
            <div style={{ minWidth: 0, flex: 1, fontSize: 12, color: 'rgba(224,236,244,0.85)' }}>
              <div><strong style={{ color: 'var(--txt-frost)', fontWeight: 600 }}>{it.user}</strong> {it.action}</div>
              <div style={{ color: 'rgba(224,236,244,0.45)', fontSize: 11, marginTop: 2 }}>{it.time}</div>
            </div>
            <div style={{ color: it.color, marginTop: 2 }}><it.icon size={14}/></div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Active Challenge */
function ActiveChallenge() {
  return (
    <div className="panel gold-rim" style={{ overflow: 'hidden' }}>
      <div className="row-between" style={{ marginBottom: 6 }}>
        <span className="eyebrow gold">Active Challenge</span>
        <span style={{ fontFamily: 'var(--font-data), monospace', fontSize: 11, color: 'var(--gold-light)' }}>5D : 12H : 34M</span>
      </div>
      <div className="row gap-14" style={{ alignItems: 'stretch', marginTop: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="row gap-10" style={{ marginBottom: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10,
                            background: 'linear-gradient(160deg, rgba(218,195,110,0.25), rgba(120,90,30,0.4))',
                            border: '1px solid rgba(218,195,110,0.55)',
                            display:'flex', alignItems:'center', justifyContent:'center',
                            color: '#DAC36E' }}>
              <I3.dumbbell size={18}/>
            </div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>Strength Surge</div>
          </div>
          <div style={{ color: 'rgba(224,236,244,0.7)', fontSize: 13, marginBottom: 12 }}>
            7 intense workouts. Show up. Level up.
          </div>
          <div className="row-between" style={{ marginBottom: 6 }}>
            <span style={{ fontFamily: 'var(--font-data), monospace', fontSize: 12 }}>
              <span style={{ color: 'var(--gold-light)' }}>4</span>
              <span style={{ color: 'rgba(224,236,244,0.55)' }}> / 7 Completed</span>
            </span>
          </div>
          <div className="bar gold"><div className="fill" style={{ width: '57%' }}/></div>
          <div style={{ marginTop: 14 }}>
            <window.GlowButton variant="wing" size="medium" fullWidth leftIcon={<I3.sparkle size={14}/>}>
              Join Challenge
            </window.GlowButton>
          </div>
        </div>
        {/* Hex trophy emblem */}
        <div style={{ width: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            width: 92, height: 100,
            clipPath: 'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)',
            background: 'linear-gradient(160deg, rgba(218,195,110,0.5), rgba(60,40,12,0.95))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
            boxShadow: '0 0 30px rgba(198,168,75,0.45)',
          }}>
            <div style={{
              position:'absolute', inset: 2,
              clipPath: 'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)',
              background: 'linear-gradient(160deg, #1A1505, #050200 70%)',
            }}/>
            <div style={{ position:'relative', color: '#DAC36E' }}>
              <I3.dumbbell size={42}/>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Badges + Leaderboard side-by-side */
function BadgesAndLeaderboard() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 14 }}>
      <div className="panel">
        <div className="row-between" style={{ marginBottom: 14 }}>
          <span className="eyebrow">Badges</span>
          <a href="#" style={{ color: '#7FC5FB', fontSize: 11, textDecoration: 'none' }}>View all</a>
        </div>
        <div className="row gap-6" style={{ flexWrap: 'wrap' }}>
          {[
            { c: 'linear-gradient(160deg,#7FC5FB,#002060)', i: I3.crystal, tint:'#E0ECF4' },
            { c: 'linear-gradient(160deg,#DAC36E,#5a4017)', i: I3.star,    tint:'#1A1505' },
            { c: 'linear-gradient(160deg,#B294F0,#3a1a82)', i: I3.spark2,  tint:'#0a0420' },
          ].map((b, i) => (
            <div key={i} className="badge-hex" style={{ background: b.c, boxShadow:'0 0 14px rgba(127,197,251,0.25)' }}>
              <div style={{
                position:'absolute', inset:2,
                clipPath: 'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)',
                background: 'rgba(8,10,20,0.55)',
              }}/>
              <span style={{ position:'relative', color: '#E0ECF4' }}>
                <b.i size={22}/>
              </span>
            </div>
          ))}
          <div className="badge-hex" style={{ background:'rgba(8,18,42,0.7)', border: '1px dashed rgba(127,197,251,0.3)' }}>
            <span style={{ fontFamily:'var(--font-data), monospace', fontSize: 13, color:'rgba(224,236,244,0.7)' }}>+12</span>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="row-between" style={{ marginBottom: 14 }}>
          <span className="eyebrow">Leaderboard</span>
          <span className="row gap-6" style={{ color: 'rgba(224,236,244,0.55)', fontSize: 11 }}>
            This Week <I3.chev size={12}/>
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div className="lb-row">
            <span style={{ color: '#DAC36E' }}><I3.trophy size={14}/></span>
            <div className="av" style={{ background:'linear-gradient(135deg,#1F8A5B,#0a3a23)' }}>P</div>
            <div className="name">PhoenixFlex</div>
            <div className="pts">24,980 XP</div>
          </div>
          <div className="lb-row me">
            <span className="rank">2</span>
            <div className="av" style={{ background:'#07101F' }}>
              <img src="assets/logo.png" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
            </div>
            <div className="name me-mark">SwanCreator</div>
            <div className="pts" style={{ color: 'var(--ice)' }}>18,450 XP</div>
          </div>
          <div className="lb-row">
            <span className="rank">3</span>
            <div className="av" style={{ background:'linear-gradient(135deg,#7851A9,#3a1a82)' }}>I</div>
            <div className="name">IronMuse</div>
            <div className="pts">16,230 XP</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Trending */
function Trending() {
  const tags = [
    { tag: 'StrengthSurge', val: '12.4K', seed: 1 },
    { tag: 'LevelUp',       val: '8.7K',  seed: 4 },
    { tag: 'CreateDaily',   val: '6.2K',  seed: 7 },
    { tag: 'SwanStudios',   val: '5.1K',  seed: 2 },
    { tag: 'NoLimits',      val: '3.9K',  seed: 5 },
  ];
  return (
    <div className="panel">
      <div className="row-between" style={{ marginBottom: 12 }}>
        <span className="eyebrow">Trending</span>
        <a href="#" style={{ color: '#7FC5FB', fontSize: 12, textDecoration: 'none' }}>View all</a>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tags.map((t, i) => (
          <div key={i} className="row-between" style={{ padding: '4px 0' }}>
            <div className="row gap-6">
              <span style={{ color: '#7FC5FB', fontFamily: 'var(--font-data), monospace' }}>#</span>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{t.tag}</span>
            </div>
            <div className="row gap-10">
              <span style={{ fontFamily: 'var(--font-data), monospace', fontSize: 12, color: 'rgba(224,236,244,0.7)' }}>{t.val}</span>
              <window.Sparkline seed={t.seed}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Transformation before/after */
function Transformation() {
  return (
    <div className="panel">
      <div className="row-between" style={{ marginBottom: 12 }}>
        <span className="eyebrow">Transformation</span>
        <a href="#" style={{ color: '#7FC5FB', fontSize: 12, textDecoration: 'none' }}>View all</a>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 36px 1fr', alignItems: 'center', gap: 8 }}>
        <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', aspectRatio: '4/3' }}>
          <window.CrystalScene palette="violet"/>
          <div style={{ position:'absolute', left: 8, bottom: 8,
                         fontFamily:'var(--font-data), monospace', fontSize: 11,
                         padding: '2px 8px', borderRadius: 6,
                         background:'rgba(2,6,14,0.75)',
                         border:'1px solid rgba(127,197,251,0.25)' }}>Before</div>
        </div>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'linear-gradient(135deg,#7FC5FB,#4A9FE0)',
          display:'flex', alignItems:'center', justifyContent:'center',
          color: '#061026', justifySelf: 'center',
          boxShadow: '0 0 14px rgba(127,197,251,0.5)',
        }}><I3.arrowRight size={16} stroke={2.4}/></div>
        <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', aspectRatio: '4/3' }}>
          <window.CrystalScene palette="cyan"/>
          <div style={{ position:'absolute', left: 8, bottom: 8,
                         fontFamily:'var(--font-data), monospace', fontSize: 11,
                         padding: '2px 8px', borderRadius: 6,
                         background:'rgba(2,6,14,0.75)',
                         border:'1px solid rgba(127,197,251,0.25)' }}>After</div>
        </div>
      </div>
    </div>
  );
}

/* Weekly Momentum — ring + bars */
function WeeklyMomentum() {
  const days = ['M','T','W','T','F','S','S'];
  const heights = [38, 52, 60, 70, 78, 86, 100];
  return (
    <div className="panel">
      <div className="row-between" style={{ marginBottom: 12 }}>
        <span className="eyebrow">Weekly Momentum</span>
        <a href="#" style={{ color: '#7FC5FB', fontSize: 12, textDecoration: 'none' }}>View details</a>
      </div>
      <div className="row gap-16" style={{ alignItems: 'center' }}>
        {/* Progress ring */}
        <div style={{ position: 'relative', width: 96, height: 96 }}>
          <svg width="96" height="96" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r="38" stroke="rgba(96,192,240,0.18)" strokeWidth="6" fill="none"/>
            <circle cx="48" cy="48" r="38" stroke="url(#wmGrad)" strokeWidth="6" fill="none"
                    strokeLinecap="round" strokeDasharray="238.7"
                    strokeDashoffset={238.7 * (1 - 0.78)}
                    transform="rotate(-90 48 48)"/>
            <defs>
              <linearGradient id="wmGrad" x1="0" x2="1">
                <stop offset="0" stopColor="#7FC5FB"/>
                <stop offset="1" stopColor="#8B5CF6"/>
              </linearGradient>
            </defs>
          </svg>
          <div style={{ position:'absolute', inset: 0, display:'flex', alignItems:'center', justifyContent:'center',
                          fontFamily:'var(--font-ui), Sora, sans-serif', fontSize: 22, fontWeight: 600 }}>
            78<span style={{ fontSize: 12, color: 'rgba(224,236,244,0.7)' }}>%</span>
          </div>
          {/* laurel hint */}
          <div style={{ position:'absolute', left:-2, bottom: -2, color: 'rgba(218,195,110,0.6)' }}>
            <I3.laurel size={20}/>
          </div>
        </div>
        {/* Bars */}
        <div style={{ flex: 1 }}>
          <div className="row" style={{ alignItems: 'flex-end', justifyContent: 'space-between', height: 70, gap: 4 }}>
            {heights.map((h, i) => (
              <div key={i} style={{
                width: 18, height: h + '%', borderRadius: 4,
                background: i === heights.length - 1
                  ? 'linear-gradient(180deg, #DAC36E, #8a6a2a)'
                  : 'linear-gradient(180deg, #7FC5FB, #2A6FDB)',
                boxShadow: i === heights.length - 1
                  ? '0 0 10px rgba(218,195,110,0.45)'
                  : '0 0 8px rgba(127,197,251,0.3)',
              }}/>
            ))}
          </div>
          <div className="row" style={{ justifyContent: 'space-between', marginTop: 6,
                                          fontFamily:'var(--font-data), monospace',
                                          fontSize: 10, color: 'rgba(224,236,244,0.55)' }}>
            {days.map((d, i) => <span key={i} style={{ width: 18, textAlign: 'center' }}>{d}</span>)}
          </div>
        </div>
      </div>
      <div style={{ marginTop: 10, fontSize: 12.5, color: 'rgba(224,236,244,0.75)' }}>
        <span style={{ color: '#7FC5FB', marginRight: 6 }}>✦</span>
        Keep showing up. <span style={{ color: 'rgba(224,236,244,0.5)' }}>You’re building greatness.</span>
      </div>
    </div>
  );
}

/* Next Best Action */
function NextBestAction() {
  return (
    <div className="panel">
      <span className="eyebrow">Next Best Action</span>
      <div style={{ fontSize: 14, color: 'rgba(224,236,244,0.78)', margin: '8px 0 14px' }}>
        Share your progress and inspire the community.
      </div>
      <div className="row gap-10">
        <window.GlowButton variant="accent" size="small">Create Reel</window.GlowButton>
        <window.GlowButton variant="primary" size="small">Share Update</window.GlowButton>
      </div>
    </div>
  );
}

window.Stories = Stories;
window.LiveActivity = LiveActivity;
window.ActiveChallenge = ActiveChallenge;
window.BadgesAndLeaderboard = BadgesAndLeaderboard;
window.Trending = Trending;
window.Transformation = Transformation;
window.WeeklyMomentum = WeeklyMomentum;
window.NextBestAction = NextBestAction;
