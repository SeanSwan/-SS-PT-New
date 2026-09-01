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
import { useGameStore } from '../state/store.js';

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
  const { kills, hp, wave, over, enemies, reset } = useGameStore();

  return (
    <>
      <div data-testid="hud" style={bar}>
        <span data-testid="hud-hp">HP: {hp}</span>
        <span data-testid="hud-wave">Wave: {wave}</span>
        <span data-testid="hud-kills">Kills: {kills}</span>
        <span data-testid="hud-left">Remaining: {enemies.length}</span>
        <span style={{ opacity: 0.6 }}>WASD to move &middot; click to shoot</span>
      </div>

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
