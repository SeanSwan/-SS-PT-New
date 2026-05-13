/* GlowButton + Sheen Card — ported from the production GlowButton.tsx.
   Pointer-tracking glow blob, rotating shine gradient, ripple, breathing pulse,
   plus a reusable SheenCard wrapper that applies the same hover sheen to
   any panel (Luxury Vault, sapphire-glass, etc.). */

const GLOW_THEMES = {
  primary:  { bg:'#002060', color:'#E0ECF4', shineL:'rgba(139,92,246,0.5)',  shineR:'rgba(139,92,246,0.65)', glowStart:'#8B5CF6', glowEnd:'#60C0F0', shadow:'rgba(0,24,64,0.5)' },
  accent:   { bg:'#8B5CF6', color:'#FFFFFF', shineL:'rgba(96,192,240,0.55)', shineR:'rgba(80,160,240,0.7)',  glowStart:'#60C0F0', glowEnd:'#50A0F0', shadow:'rgba(139,92,246,0.35)' },
  wing:     { bg:'linear-gradient(135deg,#7FC5FB 0%,#4A9FE0 45%,#8B5CF6 100%)', color:'#0A1F4D', shineL:'rgba(255,255,255,0.45)', shineR:'rgba(178,148,240,0.55)', glowStart:'#7FC5FB', glowEnd:'#B294F0', shadow:'rgba(74,159,224,0.45)' },
  gilded:   { bg:'#1A1505', color:'#E0ECF4', shineL:'rgba(198,168,75,0.55)', shineR:'rgba(218,195,110,0.7)', glowStart:'#C6A84B', glowEnd:'#DAC36E', shadow:'rgba(198,168,75,0.25)' },
  ghost:    { bg:'transparent', color:'#E0ECF4', shineL:'rgba(64,112,192,0.3)',  shineR:'rgba(96,192,240,0.4)',  glowStart:'#4070C0', glowEnd:'#60C0F0', shadow:'rgba(64,112,192,0.1)' },
  cosmic:   { bg:'linear-gradient(135deg,#8B5CF6,#60C0F0)', color:'#FFFFFF', shineL:'rgba(139,92,246,0.5)', shineR:'rgba(96,192,240,0.65)', glowStart:'#8B5CF6', glowEnd:'#60C0F0', shadow:'rgba(139,92,246,0.15)' },
};

const GLOW_SIZES = {
  small:  { fs:14, pad:'10px 22px', h:44, br:22 },
  medium: { fs:16, pad:'12px 28px', h:48, br:24 },
  large:  { fs:18, pad:'14px 34px', h:56, br:28 },
};

function GlowButton({ text, children, variant='primary', size='medium', pulse=false, fullWidth=false, onClick, leftIcon, rightIcon }) {
  const t = GLOW_THEMES[variant] || GLOW_THEMES.primary;
  const s = GLOW_SIZES[size] || GLOW_SIZES.medium;
  const ref = React.useRef(null);
  const [ripples, setRipples] = React.useState([]);
  const isGhost = variant === 'ghost';

  React.useEffect(()=>{
    const el = ref.current; if (!el) return;
    const move = (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      el.style.setProperty('--px', x+'px');
      el.style.setProperty('--py', y+'px');
      el.style.setProperty('--glow', x/r.width > 0.5 ? t.glowEnd : t.glowStart);
      el.style.setProperty('--opac', '1');
    };
    const leave = () => el.style.setProperty('--opac','0');
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
    };
  }, [t.glowStart, t.glowEnd]);

  const click = (e) => {
    const r = ref.current?.getBoundingClientRect();
    if (r) {
      const id = Date.now() + Math.random();
      setRipples(p => [...p, { id, x: e.clientX - r.left, y: e.clientY - r.top }]);
      setTimeout(()=> setRipples(p => p.filter(x => x.id !== id)), 620);
    }
    onClick?.(e);
  };

  return (
    <button ref={ref} onClick={click}
      className={'glow-btn' + (pulse ? ' glow-pulse' : '')}
      style={{
        '--bg': t.bg, '--fg': t.color,
        '--shineL': t.shineL, '--shineR': t.shineR,
        '--glowStart': t.glowStart, '--glowEnd': t.glowEnd,
        '--shadow': t.shadow,
        fontSize: s.fs, height: s.h, borderRadius: s.br,
        width: fullWidth ? '100%' : 'auto',
        padding: 0,
        border: isGhost ? '1px solid rgba(64,112,192,0.4)' : 'none'
      }}>
      <span className="glow-gradient"/>
      <span className="glow-span" style={{padding: s.pad, borderRadius: s.br - 2}}>
        {leftIcon && <span style={{marginRight: 8, display:'inline-flex'}}>{leftIcon}</span>}
        {children || text}
        {rightIcon && <span style={{marginLeft: 8, display:'inline-flex'}}>{rightIcon}</span>}
        {ripples.map(r => (
          <span key={r.id} className="glow-ripple" style={{left: r.x, top: r.y}}/>
        ))}
      </span>
    </button>
  );
}

/* SheenCard — wraps content with the pointer-tracking sheen overlay +
   rotating shine border. Use for Luxury Vault / sapphire-glass / arsenal cards. */
function SheenCard({ children, variant='sapphire', style={}, onClick, className='' }) {
  const ref = React.useRef(null);
  const palette = {
    sapphire: { border:'rgba(96,192,240,0.3)', bg:'linear-gradient(160deg, rgba(0,48,128,0.4), rgba(0,16,48,0.7))', glow:'rgba(96,192,240,0.35)', shineL:'rgba(96,192,240,0.35)', shineR:'rgba(139,92,246,0.4)' },
    wing:     { border:'rgba(139,92,246,0.35)', bg:'linear-gradient(160deg, rgba(20,40,90,0.6), rgba(40,20,80,0.7))', glow:'rgba(139,92,246,0.4)', shineL:'rgba(127,197,251,0.4)', shineR:'rgba(178,148,240,0.5)' },
    gold:     { border:'rgba(198,168,75,0.4)', bg:'linear-gradient(160deg, rgba(26,21,5,0.9), rgba(10,8,2,0.95))', glow:'rgba(198,168,75,0.4)',   shineL:'rgba(198,168,75,0.4)',  shineR:'rgba(218,195,110,0.5)' },
    vault:    { border:'rgba(198,168,75,0.35)', bg:'linear-gradient(160deg, rgba(10,10,15,0.95), rgba(26,21,5,0.8))', glow:'rgba(198,168,75,0.45)', shineL:'rgba(198,168,75,0.5)',  shineR:'rgba(96,192,240,0.35)' },
    purple:   { border:'rgba(139,92,246,0.35)', bg:'linear-gradient(160deg, rgba(40,20,80,0.5), rgba(16,8,32,0.8))',   glow:'rgba(139,92,246,0.4)',  shineL:'rgba(139,92,246,0.4)',  shineR:'rgba(96,192,240,0.4)'  },
  }[variant] || {};

  React.useEffect(()=>{
    const el = ref.current; if (!el) return;
    const move = (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--px', (e.clientX - r.left) + 'px');
      el.style.setProperty('--py', (e.clientY - r.top) + 'px');
      el.style.setProperty('--opac', '1');
    };
    const leave = () => el.style.setProperty('--opac','0');
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); };
  }, []);

  return (
    <div ref={ref} className={'sheen-card ' + className} onClick={onClick}
      style={{
        '--sc-border': palette.border,
        '--sc-bg': palette.bg,
        '--sc-glow': palette.glow,
        '--sc-shineL': palette.shineL,
        '--sc-shineR': palette.shineR,
        ...style
      }}>
      <span className="sheen-border"/>
      <span className="sheen-overlay"/>
      <div className="sheen-content">{children}</div>
    </div>
  );
}

window.GlowButton = GlowButton;
window.SheenCard = SheenCard;
