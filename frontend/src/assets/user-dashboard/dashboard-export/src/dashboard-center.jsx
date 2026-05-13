/* SwanStudios Dashboard — Center column (Reels Spotlight, Quick Post, Feed) */

const I2 = window.Icons;

/* ─────────────────────────────────────────────────────────────
   Generic crystal/landscape "scene" placeholder — used inside
   video cards. Layered SVG so we never need photoreal yet.
   ───────────────────────────────────────────────────────────── */
function CrystalScene({ palette = 'violet', figure = 'lifter' }) {
  const palettes = {
    violet: { sky: ['#1A0B3E', '#0A0420'], rim: '#B294F0',  crystal: 'rgba(178,148,240,0.5)' },
    cyan:   { sky: ['#072A55', '#021026'], rim: '#7FC5FB',  crystal: 'rgba(127,197,251,0.5)' },
    gold:   { sky: ['#241803', '#0A0501'], rim: '#DAC36E',  crystal: 'rgba(218,195,110,0.5)' },
  };
  const p = palettes[palette] || palettes.violet;
  return (
    <svg viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice"
         style={{ width: '100%', height: '100%', display: 'block' }}>
      <defs>
        <linearGradient id={`sky-${palette}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={p.sky[0]}/><stop offset="1" stopColor={p.sky[1]}/>
        </linearGradient>
        <radialGradient id={`figGlow-${palette}`} cx="0.5" cy="0.55" r="0.55">
          <stop offset="0" stopColor={`${p.rim}88`}/><stop offset="1" stopColor={`${p.rim}00`}/>
        </radialGradient>
      </defs>
      <rect width="400" height="260" fill={`url(#sky-${palette})`}/>

      {/* atmosphere */}
      <circle cx="200" cy="180" r="120" fill={`url(#figGlow-${palette})`} opacity="0.7"/>

      {/* background crystals (left) */}
      <polygon points="40,260 60,170 80,260" fill={p.crystal} opacity="0.6"/>
      <polygon points="70,260 95,140 120,260" fill={p.crystal} opacity="0.5"/>
      <polygon points="10,260 30,200 50,260" fill={p.crystal} opacity="0.4"/>
      {/* background crystals (right) */}
      <polygon points="320,260 340,165 360,260" fill={p.crystal} opacity="0.6"/>
      <polygon points="350,260 380,140 400,200 400,260" fill={p.crystal} opacity="0.55"/>
      <polygon points="280,260 305,195 330,260" fill={p.crystal} opacity="0.45"/>

      {/* figure silhouette (back lifter — dark silhouette with rim light) */}
      {figure === 'lifter' && (
        <g>
          {/* barbell */}
          <rect x="120" y="120" width="160" height="6" fill="#0a0a0f"/>
          <rect x="106" y="108" width="14" height="30" fill="#0a0a0f" stroke={p.rim} strokeWidth="0.7" opacity="0.9"/>
          <rect x="280" y="108" width="14" height="30" fill="#0a0a0f" stroke={p.rim} strokeWidth="0.7" opacity="0.9"/>
          {/* torso (V-back) */}
          <path d="M155 130 L150 200 L170 250 L230 250 L250 200 L245 130 L220 145 L180 145 Z"
                fill="#020308" stroke={p.rim} strokeWidth="1" strokeOpacity="0.6"/>
          {/* arms */}
          <path d="M155 130 L130 150 L120 175" fill="none" stroke="#020308" strokeWidth="22" strokeLinecap="round"/>
          <path d="M245 130 L270 150 L280 175" fill="none" stroke="#020308" strokeWidth="22" strokeLinecap="round"/>
          <path d="M155 130 L130 150 L120 175" fill="none" stroke={p.rim} strokeWidth="1" strokeOpacity="0.5"/>
          <path d="M245 130 L270 150 L280 175" fill="none" stroke={p.rim} strokeWidth="1" strokeOpacity="0.5"/>
          {/* head */}
          <circle cx="200" cy="115" r="18" fill="#020308" stroke={p.rim} strokeWidth="1" strokeOpacity="0.55"/>
        </g>
      )}
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────
   Reels Spotlight
   ───────────────────────────────────────────────────────────── */
function ReelsSpotlight() {
  return (
    <div className="panel purple-rim" style={{ padding: 18 }}>
      <div className="row-between" style={{ marginBottom: 14 }}>
        <div className="row gap-8">
          <span style={{ color: '#B294F0' }}><I2.sparkle size={14}/></span>
          <span className="eyebrow violet">Reels Spotlight</span>
        </div>
        <span className="chip violet">Reel of the Day</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 18, alignItems: 'stretch' }}>
        <div className="video-card" style={{ aspectRatio: '9 / 14', height: 240 }}>
          <CrystalScene palette="violet" figure="lifter"/>
          <div className="play"><I2.play size={20}/></div>
          <div className="duration">0:28</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>
            Rise Through <span style={{ color: '#B294F0' }}>✦</span>
          </div>
          <div style={{ color: 'rgba(224,236,244,0.78)', marginTop: 4, fontSize: 14 }}>
            Discipline. Focus. Create.
          </div>
          <div className="row gap-10" style={{ marginTop: 10, flexWrap: 'wrap' }}>
            <span style={{ color: '#7FC5FB', fontSize: 13 }}>#SwanStudios</span>
            <span style={{ color: '#7FC5FB', fontSize: 13 }}>#EarnYourEdge</span>
          </div>
          <div className="row gap-16" style={{ marginTop: 14, color: 'rgba(224,236,244,0.7)' }}>
            <span className="row gap-6"><I2.eye size={14}/> <span style={{fontSize:13}}>12.4K</span></span>
            <span className="row gap-6" style={{color:'#F87171'}}><I2.heart size={14}/> <span style={{fontSize:13, color:'rgba(224,236,244,0.85)'}}>2.1K</span></span>
            <span className="row gap-6"><I2.msg size={14}/> <span style={{fontSize:13}}>156</span></span>
          </div>
          <div style={{ marginTop: 'auto', paddingTop: 16 }}>
            <window.GlowButton variant="accent" size="medium" fullWidth leftIcon={<I2.plus size={16}/>} rightIcon={<I2.sparkle size={14}/>}>
              Create Reel
            </window.GlowButton>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Quick Post
   ───────────────────────────────────────────────────────────── */
function QuickPost() {
  const [active, setActive] = useState('achievement');
  const moods = [
    { id: 'workout',        label: 'Workout',        icon: I2.dumbbell,  c: '#7FC5FB' },
    { id: 'transformation', label: 'Transformation', icon: I2.butterfly, c: '#B294F0' },
    { id: 'achievement',    label: 'Achievement',    icon: I2.trophy,    c: '#DAC36E' },
    { id: 'challenge',      label: 'Challenge',      icon: I2.flag,      c: '#7FC5FB' },
    { id: 'dance',          label: 'Dance',          icon: I2.dance,     c: '#B294F0' },
    { id: 'music',          label: 'Music',          icon: I2.music,     c: '#60C0F0' },
    { id: 'singing',        label: 'Singing',        icon: I2.mic2,      c: '#B294F0' },
    { id: 'art',            label: 'Art',            icon: I2.palette,   c: '#7FC5FB' },
    { id: 'gaming',         label: 'Gaming',         icon: I2.gaming,    c: '#B294F0' },
    { id: 'comedy',         label: 'Comedy',         icon: I2.comedy,    c: '#DAC36E' },
  ];
  return (
    <div className="panel bracket" style={{ padding: 18, borderColor: 'rgba(127,197,251,0.4)' }}>
      <div className="row gap-8" style={{ marginBottom: 14 }}>
        <span style={{ color: '#7FC5FB' }}><I2.sparkle size={14}/></span>
        <span className="eyebrow cyan">Quick Post</span>
      </div>
      <div style={{ position: 'relative' }}>
        <input
          placeholder="What are you creating today?"
          style={{
            width: '100%', height: 44, padding: '0 50px 0 16px', borderRadius: 12,
            background: 'rgba(2,6,16,0.7)',
            border: '1px solid rgba(96,192,240,0.25)',
            color: 'var(--txt-frost)', fontSize: 14, outline: 'none',
            fontFamily: 'inherit',
          }}/>
        <button className="btn-icon" style={{
          position: 'absolute', right: 6, top: 5, width: 34, height: 34,
        }}><I2.image size={16}/></button>
      </div>

      <div className="row" style={{ gap: 10, marginTop: 14, overflowX: 'auto', paddingBottom: 4 }}>
        {moods.map(m => (
          <div key={m.id} className={'mood' + (active === m.id ? ' active' : '')}
               onClick={() => setActive(m.id)}>
            <div className="moo-ico" style={{ color: active === m.id ? '#fff' : m.c }}>
              <m.icon size={18}/>
            </div>
            <span>{m.label}</span>
          </div>
        ))}
      </div>

      <div className="row" style={{ gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
        <button className="btn-ghost"><I2.image size={14}/> Add Media</button>
        <button className="btn-ghost"><I2.globe size={14}/> Everyone <I2.chev size={14}/></button>
        <div className="chip gold" style={{ marginLeft: 'auto' }}>
          <I2.sparkle size={12}/> +25 XP
        </div>
        <window.GlowButton variant="accent" size="small" rightIcon={<I2.send size={14}/>}>
          Post It
        </window.GlowButton>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Feed post — video share
   ───────────────────────────────────────────────────────────── */
function FeedPostVideo({
  author = 'SwanCreator', verified = true, time = '2h ago',
  category = 'Workout Share',
  caption = 'New set. New energy. Let’s build.',
  tags = ['#BuildInPublic', '#SwanStudios', '#NoLimits'],
  xp = 25,
  scenePalette = 'violet',
  likes = '1.3K', comments = 86, retweets = 132, shares = 96,
}) {
  return (
    <div className="panel" style={{ padding: 18 }}>
      {/* header */}
      <div className="row-between" style={{ marginBottom: 12 }}>
        <div className="row gap-12">
          <div style={{ width: 40, height: 40, borderRadius: '50%', overflow:'hidden',
                         border: '2px solid rgba(127,197,251,0.45)' }}>
            <img src="assets/logo.png" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
          </div>
          <div>
            <div className="row gap-6">
              <span style={{ fontWeight: 600, fontSize: 15 }}>{author}</span>
              {verified && (
                <span className="verified" style={{ width: 16, height: 16 }}>
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8l3 3 7-7" stroke="#061026" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              )}
              <span style={{ color: 'rgba(224,236,244,0.55)', fontSize: 13 }}>· {time}</span>
              <span className="chip violet" style={{ padding: '2px 10px', fontSize: 11 }}>{category}</span>
            </div>
          </div>
        </div>
        <div className="row gap-10">
          <div className="chip gold"><I2.sparkle size={12}/> +{xp} XP</div>
          <button style={{ background:'transparent', border:'none', color:'rgba(224,236,244,0.5)', cursor:'pointer' }}>···</button>
        </div>
      </div>

      <div style={{ fontSize: 15, color: 'var(--txt-frost)', marginBottom: 4 }}>{caption}</div>
      <div className="row gap-10" style={{ flexWrap: 'wrap', marginBottom: 12 }}>
        {tags.map(t => <span key={t} style={{ color: '#7FC5FB', fontSize: 13 }}>{t}</span>)}
      </div>

      {/* video */}
      <div className="video-card" style={{ height: 280, marginBottom: 14 }}>
        <CrystalScene palette={scenePalette} figure="lifter"/>
        <div className="play"><I2.play size={20}/></div>
      </div>

      {/* engagement row */}
      <div className="row-between">
        <div className="row gap-20" style={{ color: 'rgba(224,236,244,0.85)' }}>
          <span className="row gap-6" style={{color:'#F87171', cursor:'pointer'}}><I2.heart size={18}/><span style={{color:'rgba(224,236,244,0.85)', fontSize:13}}>{likes}</span></span>
          <span className="row gap-6" style={{cursor:'pointer'}}><I2.msg size={18}/><span style={{fontSize:13}}>{comments}</span></span>
          <span className="row gap-6" style={{color:'#7FC5FB', cursor:'pointer'}}><I2.retweet size={18}/><span style={{fontSize:13, color:'rgba(224,236,244,0.85)'}}>{retweets}</span></span>
          <span className="row gap-6" style={{cursor:'pointer'}}><I2.shareArrow size={18}/><span style={{fontSize:13}}>{shares}</span></span>
        </div>
        <div className="row gap-8" style={{ color: 'rgba(224,236,244,0.55)', fontSize: 12 }}>
          <div className="row" style={{ marginRight: 6 }}>
            {['#1F8A5B', '#7851A9', '#C6A84B'].map((c, i) => (
              <div key={i} style={{
                width: 22, height: 22, borderRadius: '50%',
                background: c, border: '2px solid #07101F',
                marginLeft: i ? -8 : 0,
              }}/>
            ))}
          </div>
          IronPulse and 97 others liked this
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Simple text post (variant)
   ───────────────────────────────────────────────────────────── */
function FeedPostText({ author = 'CrystalKite', time = '4h ago', category = 'Transformation', caption, xp = 40 }) {
  return (
    <div className="panel" style={{ padding: 18 }}>
      <div className="row-between" style={{ marginBottom: 10 }}>
        <div className="row gap-12">
          <div style={{ width: 40, height: 40, borderRadius: '50%',
                         background: 'linear-gradient(160deg, #4A9FE0, #002060)',
                         border: '2px solid rgba(127,197,251,0.45)',
                         display: 'flex', alignItems: 'center', justifyContent: 'center',
                         color:'#E0ECF4', fontWeight: 700 }}>CK</div>
          <div>
            <div className="row gap-6">
              <span style={{ fontWeight: 600, fontSize: 15 }}>{author}</span>
              <span className="verified" style={{ width: 16, height: 16 }}>
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8l3 3 7-7" stroke="#061026" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <span style={{ color: 'rgba(224,236,244,0.55)', fontSize: 13 }}>· {time}</span>
              <span className="chip violet" style={{ padding: '2px 10px', fontSize: 11 }}>{category}</span>
            </div>
          </div>
        </div>
        <div className="chip gold"><I2.sparkle size={12}/> +{xp} XP</div>
      </div>
      <div style={{ fontSize: 16, color: 'var(--txt-frost)', fontFamily: 'var(--font-editorial), Georgia, serif',
                     fontStyle: 'italic', letterSpacing: '0.01em' }}>
        60 days. Different person. Same mission.
      </div>
    </div>
  );
}

window.ReelsSpotlight = ReelsSpotlight;
window.QuickPost = QuickPost;
window.FeedPostVideo = FeedPostVideo;
window.FeedPostText = FeedPostText;
window.CrystalScene = CrystalScene;
