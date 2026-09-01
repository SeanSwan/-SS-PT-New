/**
 * Hud.jsx — the score, drawn in HTML over the 3D canvas.
 *
 * TEACHING NOTE — WHY HTML AND NOT 3D TEXT:
 * Text inside a 3D scene has to be rendered as geometry or a texture: it costs draw calls, it
 * fights antialiasing, and it is a nuisance to lay out. A plain HTML overlay is crisp at every
 * resolution, free to render, and you already know how to style it. Almost every browser game does
 * its HUD this way. Keep the 3D for things that live in the world.
 *
 * pointerEvents: none is the important line — without it this div silently eats the clicks meant
 * for the game underneath.
 */
import { useGameStore } from '../state/store.js';

export default function Hud() {
  const kills = useGameStore((s) => s.kills);
  const left = useGameStore((s) => s.enemies.length);

  return (
    <div
      data-testid="hud"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        display: 'flex', gap: '1.5rem', justifyContent: 'center',
        padding: '0.75rem 1rem',
        font: '600 14px/1.2 ui-sans-serif, system-ui, sans-serif',
        color: '#E0ECF4', textShadow: '0 1px 3px rgba(0,0,0,.8)',
        pointerEvents: 'none', userSelect: 'none',
      }}
    >
      <span data-testid="hud-kills">Kills: {kills}</span>
      <span data-testid="hud-left">Remaining: {left}</span>
      <span style={{ opacity: 0.6 }}>WASD to move &middot; click to shoot</span>
    </div>
  );
}
