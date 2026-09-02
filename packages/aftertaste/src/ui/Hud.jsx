/**
 * Hud.jsx — score, health, wave, and the game-over screen.
 *
 * TEACHING NOTE — WHY HTML AND NOT 3D TEXT:
 * Text inside a 3D scene must be rendered as geometry or a texture: draw calls, antialiasing
 * trouble, and layout pain. An HTML overlay is crisp at every resolution and free. Almost every
 * browser game does its HUD this way; keep 3D for things that live in the world.
 *
 * pointerEvents: none on the top bar is the important line -- without it the bar silently eats
 * clicks meant for the game. The game-over panel DOES take pointer events, because it has a button.
 */
import { useEffect } from 'react';
import { useGameStore } from '../state/store.js';
import { holdsWave } from '../systems/lifecycle.js';

/**
 * TEACHING NOTE — THE CROSSHAIR IS HTML TOO:
 * The centre of the screen IS where the hitscan ray goes (both derive from the same camera), so a
 * fixed HTML cross at 50%/50% is always honest — no 3D reticle needed. The hitmarker is the
 * Overwatch idea: the ✕ that flashes on a CONNECTED shot, white for a hit, red for a kill. It is
 * keyed by the hit's timestamp so React re-mounts it every hit and the CSS animation replays.
 */
const crosshairStyle = {
  position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
  font: '300 26px/1 ui-sans-serif, system-ui, sans-serif',
  color: 'rgba(224,236,244,0.9)', textShadow: '0 1px 3px rgba(0,0,0,.9)',
  pointerEvents: 'none', userSelect: 'none',
};

const hitmarkerStyle = (kill) => ({
  position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
  font: '600 30px/1 ui-sans-serif, system-ui, sans-serif',
  color: kill ? '#ff5340' : '#E0ECF4', textShadow: '0 1px 4px rgba(0,0,0,.9)',
  pointerEvents: 'none', userSelect: 'none',
  animation: 'swan-hitmarker 0.28s ease-out forwards',
});

const bar = {
  position: 'fixed', top: 0, left: 0, right: 0,
  display: 'flex', gap: '1.25rem', justifyContent: 'center', flexWrap: 'wrap',
  padding: '0.75rem 1rem',
  font: '600 14px/1.2 ui-sans-serif, system-ui, sans-serif',
  color: '#E0ECF4', textShadow: '0 1px 3px rgba(0,0,0,.8)',
  pointerEvents: 'none', userSelect: 'none',
};

const overlay = {
  position: 'fixed', inset: 0,
  display: 'flex', flexDirection: 'column', gap: '1rem',
  alignItems: 'center', justifyContent: 'center',
  background: 'rgba(8,8,12,.82)',
  font: '600 16px/1.4 ui-sans-serif, system-ui, sans-serif',
  color: '#E0ECF4', textAlign: 'center', padding: '1rem',
};

export default function Hud() {
  // One SELECTOR per value, not a whole-store destructure: the enemies array gets a new identity
  // on every hit and on nearly every frame of a melee, and a selectorless subscription re-rendered
  // the entire HUD at frame rate during exactly the busiest moments (GLM-Flash finding 5). Each
  // selector re-renders only when ITS value changes; `remaining` selects the derived NUMBER so a
  // new array with the same count does not re-render the bar.
  const kills = useGameStore((s) => s.kills);
  const hp = useGameStore((s) => s.hp);
  const wave = useGameStore((s) => s.wave);
  const over = useGameStore((s) => s.over);
  const reset = useGameStore((s) => s.reset);
  const lastHitAt = useGameStore((s) => s.lastHitAt);
  const lastKillAt = useGameStore((s) => s.lastKillAt);
  const remaining = useGameStore((s) => s.enemies.reduce((n, e) => n + (holdsWave(e) ? 1 : 0), 0));
  // Crosshair bloom while rounds are in the air — tracers live SHOT_TTL, so this breathes with fire.
  const firing = useGameStore((s) => s.shots.length > 0);

  // Death hands the mouse back: pointer lock hides the cursor, and a hidden cursor cannot press
  // the restart button. The browser releases lock on Esc; we release it on the death screen.
  useEffect(() => {
    if (over) document.exitPointerLock?.();
  }, [over]);

  return (
    <>
      <style>{'@keyframes swan-hitmarker { from { opacity: 1; } to { opacity: 0; } }'}</style>
      <div data-testid="hud" style={bar}>
        <span data-testid="hud-hp">HP: {hp}</span>
        <span data-testid="hud-wave">Wave: {wave}</span>
        <span data-testid="hud-kills">Kills: {kills}</span>
        {/* A toppling corpse is not "remaining" — count what still holds the wave open. */}
        <span data-testid="hud-left">Remaining: {remaining}</span>
        <span style={{ opacity: 0.6 }}>click to take aim &middot; WASD move &middot; hold to fire</span>
      </div>

      {!over && (
        <div
          data-testid="crosshair"
          style={{
            ...crosshairStyle,
            transition: 'transform 70ms ease-out',
            transform: `translate(-50%, -50%) scale(${firing ? 1.35 : 1})`,
          }}
        >+</div>
      )}
      {/* -1 is "never": 0 is a real clock reading (a first-frame hit), so it cannot be the sentinel. */}
      {!over && lastHitAt >= 0 && (
        <div key={lastHitAt} data-testid="hitmarker" style={hitmarkerStyle(lastKillAt === lastHitAt)}>✕</div>
      )}

      {over && (
        <div data-testid="gameover" style={overlay}>
          <div style={{ fontSize: '1.6rem' }}>You were eaten.</div>
          <div data-testid="final-score">Wave {wave} &middot; {kills} kills</div>
          <button
            data-testid="restart"
            onClick={reset}
            style={{
              font: 'inherit', padding: '0.6rem 1.4rem', minHeight: 44,
              background: '#002060', color: '#E0ECF4',
              border: '1px solid #60C0F0', borderRadius: 8, cursor: 'pointer',
            }}
          >
            Go again
          </button>
        </div>
      )}
    </>
  );
}
