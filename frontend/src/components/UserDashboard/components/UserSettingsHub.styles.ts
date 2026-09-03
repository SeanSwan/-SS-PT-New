/**
 * COMPONENT: UserSettingsHub.styles
 * OWNER: User Dashboard / Settings (Wave-1 trust repair follow-up)
 * PURPOSE: Crystalline Swan styling for the profile + settings hub, extracted from
 *          UserSettingsHub.tsx so the component stays under the 300-line cap (Rule 4)
 *          and every colour becomes a themeable token (Rule 6).
 *
 * WHY THIS FILE EXISTS — this was a live legibility bug, not a tidy-up.
 * Every surface here was a HARDCODED DARK value (`rgba(20,20,30,.72)` panels,
 * `rgba(10,10,20,.72)` inputs) while the text on it was the ADAPTIVE
 * `var(--text-primary)`. Under `crystalline-light` the bridge emits
 * text.primary `#0B1726` (near-black) — near-black text on a panel that composites
 * to ~#4F515A is **2.32:1**, against the 4.5:1 house minimum (Rule 7).
 * This is the identical shape as the Appearance Studio tab-label bug
 * (`AppearanceStudio/appearanceStudioContrast.test.ts`, 2026-07-22, Sean: "can't see
 * the labels"). That fix closed the instance; the class survived here.
 *
 * MOTION: one 180ms knob translation. No loops, no pointer tracking — this is a
 *         client/data surface, not a showcase card.
 *
 * TOKEN CONTRACT: every token below is emitted by `utils/theme/themeUtils.ts`
 * (the var bridge). Fallbacks are the Crystalline Swan dark values, so a surface
 * rendered before the bridge mounts is still correct. Alpha variants use
 * `color-mix(in srgb, …)` — the bridge's own idiom — rather than a frozen rgba(),
 * because an rgba() literal cannot follow the theme.
 */

import styled, { css } from 'styled-components';

/** Accent at a given alpha, still following the theme. */
const accent = (pct: number) => `color-mix(in srgb, var(--accent-primary, #60C0F0) ${pct}%, transparent)`;
/** Neutral ink at a given alpha — flips light/dark with the theme, unlike a frozen white. */
const ink = (pct: number) => `color-mix(in srgb, var(--text-primary, #E0ECF4) ${pct}%, transparent)`;

export const Wrap = styled.section`display: flex; flex-direction: column; gap: 1rem;`;

export const Hero = styled.div`
  display: grid; grid-template-columns: minmax(0, 1fr) 230px; gap: 1rem; padding: 1.25rem;
  border-radius: 18px; border: 1px solid ${accent(18)};
  background: linear-gradient(135deg, ${accent(12)}, color-mix(in srgb, var(--accent-purple, #8B5CF6) 12%, transparent));
  @media(max-width:760px){ grid-template-columns: 1fr; }
`;

/**
 * Raw --accent-primary on the Hero's accent tint is 3.03:1 under crystalline-light —
 * a fail for 12.5px bold uppercase. 35% of --text-primary mixed in takes it to 5.18:1
 * light / 9.71:1 dark while still reading as the brand accent.
 */
export const Eyebrow = styled.div`
  display:inline-flex; align-items:center; gap:.4rem;
  color:color-mix(in srgb, var(--accent-primary, #60C0F0) 65%, var(--text-primary, #E0ECF4));
  font-size:.78rem; font-weight:800; letter-spacing:.06em; text-transform:uppercase;
`;

export const PlanCard = styled.div`
  display:flex; flex-direction:column; gap:.55rem; padding:1rem; border-radius:14px;
  background:var(--bg-surface, rgba(10,10,20,.55));
  span,small{ color:var(--text-secondary, rgba(224,236,244,.68)); font-size:.78rem; }
  strong{ color:var(--text-primary,#E0ECF4); }
`;

export const FlagRow = styled.div`display:flex; flex-wrap:wrap; gap:.45rem;`;

export const Flag = styled.div<{ $on: boolean }>`
  padding:.32rem .5rem; border-radius:999px; font-size:.72rem;
  color:${p => p.$on ? 'var(--text-primary,#E0ECF4)' : 'var(--text-muted, rgba(224,236,244,.52))'};
  border:1px solid ${p => p.$on ? accent(50) : ink(12)};
`;

export const Grid = styled.div`
  display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:1rem;
  @media(max-width:900px){ grid-template-columns:1fr; }
`;

/* --bg-elevated, not a frozen dark: this is the surface the light theme broke on. */
export const Panel = styled.div<{ $wide?: boolean }>`
  grid-column:${p => p.$wide ? '1 / -1' : 'auto'}; padding:1rem; border-radius:16px;
  border:1px solid ${accent(14)}; background:var(--bg-elevated, #1A1A24);
`;

export const Title = styled.h3`
  display:flex; align-items:center; gap:.5rem; margin:0 0 1rem;
  color:var(--text-primary,#E0ECF4); font-size:1rem;
`;

export const Label = styled.label`
  display:block; margin:.8rem 0 .35rem; color:var(--text-secondary, rgba(224,236,244,.72));
  font-size:.76rem; font-weight:800; text-transform:uppercase;
`;

/* Rule 43: a shared fragment carrying ${} interpolation that is composed into a
   styled component is written with the `css` helper, never a plain template string. */
const field = css`
  width:100%; padding:.7rem .8rem; border-radius:10px;
  border:1px solid ${accent(16)};
  background:var(--bg-base, #0A0A0F); color:var(--text-primary,#E0ECF4);
`;

export const Input = styled.input`${field} min-height:44px;`;
export const TextArea = styled.textarea`${field} min-height:86px; resize:vertical;`;
export const Select = styled.select`${field} min-height:44px;`;

export const ToggleRow = styled.div`
  display:flex; align-items:center; justify-content:space-between; gap:1rem; min-height:48px;
  border-bottom:1px solid var(--border-soft, rgba(255,255,255,.06));
  color:var(--text-primary,#E0ECF4);
`;

/**
 * The 44px hit target is a transparent ::before, so the switch keeps its 52x30 look
 * while satisfying Rule 2. The knob carries a 1px ink ring: on a light theme the OFF
 * track is pale and a bare white knob would vanish into it; on a dark theme the ring
 * is itself light and simply disappears against the knob, which is already visible.
 */
export const Switch = styled.button<{ $on: boolean }>`
  width:52px; height:30px; min-width:52px; border-radius:999px;
  border:1px solid ${p => p.$on ? accent(75) : 'var(--border-strong, rgba(255,255,255,.12))'};
  background:${p => p.$on
    ? 'linear-gradient(135deg, var(--accent-primary,#60C0F0), var(--accent-purple,#8B5CF6))'
    : ink(12)};
  cursor:pointer; position:relative;
  &::before{ content:''; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:100%; height:44px; }
  &::after{
    content:''; position:absolute; top:4px; left:${p => p.$on ? '26px' : '4px'};
    width:20px; height:20px; border-radius:50%;
    background:#fff;
    /* Deliberately NOT tokenised. --button-primary-text is getReadableAccentText(primary),
       which resolves DARK under crystalline-dark (the cyan primary is light) — using it
       here would invert the knob on the DEFAULT theme. The knob is white by design, so
       its edge is a neutral ring rather than a theme colour. */
    box-shadow:0 0 0 1px rgba(0,0,0,.25);
    transition:left .18s ease;
    @media (prefers-reduced-motion: reduce){ transition:none; }
  }
`;

export const SecondaryButton = styled.button`
  min-height:44px; padding:0 1rem; border:1px solid ${accent(30)}; border-radius:10px;
  background:${accent(12)}; color:var(--text-primary,#E0ECF4); font-weight:800; cursor:pointer;
`;

export const SaveBar = styled.div`
  position:sticky; bottom:.75rem; display:flex; align-items:center; gap:.75rem; padding:.85rem;
  border-radius:16px; border:1px solid ${accent(20)};
  background:color-mix(in srgb, var(--bg-elevated, #1A1A24) 92%, transparent);
  backdrop-filter:blur(16px);
`;

export const SaveButton = styled.button`
  display:inline-flex; align-items:center; gap:.45rem; min-height:44px; padding:0 1.2rem;
  border:none; border-radius:10px;
  background:linear-gradient(135deg, var(--accent-purple,#8B5CF6), var(--accent-primary,#60C0F0));
  /* Same trap as the knob: --button-primary-text is DARK on the default dark theme.
     Left #fff so the primary CTA is not silently flipped. */
  color:#fff; font-weight:800; cursor:pointer;
  &:disabled{ opacity:.55; cursor:wait; }
`;

/**
 * The raw --danger token is #DC2626 under crystalline-light, which lands at 4.47:1 on
 * --bg-elevated — just under the 4.5 house minimum, and this text is 13.6px bold so it
 * does not qualify for the large-text exemption. Mixing 15% of --text-primary in pulls
 * it to 5.65:1 on light and 9.72:1 on dark without making it read as anything but red.
 * Same treatment for success, symmetrically. Measured, not estimated — see
 * UserSettingsHub.contrast.test.ts.
 */
export const Status = styled.span<{ $good: boolean }>`
  color:${p => p.$good
    ? 'color-mix(in srgb, var(--success, #4ADE80) 85%, var(--text-primary, #E0ECF4))'
    : 'color-mix(in srgb, var(--danger, #FCA5A5) 85%, var(--text-primary, #E0ECF4))'};
  font-size:.85rem; font-weight:800;
`;

/** Screen-reader-only. Absolutely positioned, so it adds no gap to the SaveBar flex row. */
export const LiveRegion = styled.span`
  position:absolute; width:1px; height:1px; padding:0; margin:-1px;
  overflow:hidden; clip-path:inset(50%); white-space:nowrap; border:0;
`;
