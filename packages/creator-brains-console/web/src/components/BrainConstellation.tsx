/*
 * BrainConstellation — S5 / CD3 "Vault Observatory". The constellation half of the
 * entry split view.
 *
 * ── WHAT CD3 IS (`02 §84`, `03`) ────────────────────────────────────────────
 *
 *   "Split view: three.js constellation left, operations deck right, one budgeted
 *    entry dolly (skipped under reduced-motion). The ops deck is a first-class
 *    working surface, not a sidecar — which means the roster table and run dock
 *    must be fully keyboard-operable, because CD3 keeps the constellation as
 *    *beauty* while the deck carries the *work*."
 *
 * That division is why this component is deliberately NOT the only way to reach
 * anything. Every action it offers — open a brain — also exists as a roster row
 * (`Roster`), which is the "always-present accessible equal" the slice's
 * predecessor column names. The constellation is an equal, not the entry point.
 *
 * ── THE ORDER OF THE THREE GATES, AND WHY IT IS THIS ORDER ──────────────────
 *
 *   1. `prefers-reduced-motion` and `hasWebGL()` are read ONCE, at mount, and
 *      they decide the CHUNK, not just the animation (T-E3). Either one closed
 *      and the chunk is never fetched.
 *   2. Only if both are open does the component wait for the first SUCCESSFUL
 *      status poll, then `onIdle` → `loadConstellationChunk()`.
 *   3. A failed dynamic import falls back to the DOM list — a chunk that fails to
 *      load must not leave a dead panel.
 *
 * Item 2 is the corrected load trigger. Under CD3 the panel is visible at first
 * paint, so a viewport-enter trigger fired immediately and the "lazy" label
 * described an eager load (`14 §3`, A1-02). Waiting for the first status poll is
 * also the honest moment: the constellation draws data, so its first frame should
 * follow the first reading rather than precede it.
 *
 * ── THE ENTRY DOLLY IS SKIPPED, NOT DELAYED (`14 §3` item 4) ────────────────
 *
 * If the chunk arrives after the idle window, the dolly is skipped entirely
 * rather than playing late. A camera move that starts four seconds after the
 * panel was already readable is not a flourish, it is a jolt — and the operator
 * has begun reading. `entryDolly` is passed down and this component decides.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import type { CreatorRow, StatusInstrument } from '../adapters';
import { layoutBrains, nodeLabel, type BrainNode } from './constellation-layout';
import { startLoop, type LoopHandle } from './constellation-loop';
import { hasWebGL, loadConstellationChunk, onIdle, shouldLoadChunk } from './constellation-chunk';
import {
  Canvas, Caption, Frame, NodeButton, NodeList, NodeMeta, STATE_SWATCH, Swatch,
} from './constellation.styles';

export interface BrainConstellationProps {
  rows: CreatorRow[];
  /** The first SUCCESSFUL status reading — the load trigger's own predicate. */
  status: StatusInstrument | null;
  /** Open a brain's drawer. The same handler the roster rows call. */
  onOpenBrain: (channelId: string) => void;
  /** Override the reduced-motion media query (tests). */
  reducedMotion?: boolean;
  /** Override the WebGL capability probe (tests). */
  webglAvailable?: boolean;
}

const prefersReduced = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export function BrainConstellation({
  rows, status, onOpenBrain, reducedMotion, webglAvailable,
}: BrainConstellationProps): ReactElement {
  // ── GATES, READ ONCE ──────────────────────────────────────────────────────
  // `??` not `||`, so an explicit `false` from a test is honoured rather than
  // silently replaced by the ambient value — the difference between "gates are
  // testable" and "gates are testable in one direction only".
  const reduced = reducedMotion ?? prefersReduced();
  const webgl = webglAvailable ?? hasWebGL();
  const mayLoad = shouldLoadChunk({ reduced, webgl });

  const nodes = useMemo(() => layoutBrains(rows, status), [rows, status]);

  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<{ update: (n: BrainNode[]) => void; frame: (ms: number) => void; pick: (x: number, y: number) => string | null; focusNode: (id: string | null) => void; resize: (w: number, h: number) => void; dispose: () => void } | null>(null);
  const loopRef = useRef<LoopHandle | null>(null);
  const nodesRef = useRef<BrainNode[]>(nodes);
  nodesRef.current = nodes;

  // ── THE LOAD TRIGGER: idle, AFTER the first successful status poll ────────
  //
  // `status !== null` is the "first successful poll" predicate, and it is the
  // reason this is not a `useEffect(..., [])`: the effect must re-run when the
  // first reading arrives, and must do nothing before it.
  useEffect(() => {
    if (!mayLoad || ready || failed || !status) return undefined;
    let cancelled = false;
    // The state updates below land AFTER an awaited chunk fetch, which is exactly
    // the shape that produces React's "update not wrapped in act(...)" warning in
    // tests. The warning is not noise: it means the component can set state at a
    // moment the test framework is not expecting, and under React 18.3 an update
    // after unmount is a silent no-op rather than a warning — so an unguarded
    // `setState` here would be invisible in production. Both setters are therefore
    // guarded on `cancelled`, which the cleanup sets.
    const cancelIdle = onIdle(() => {
      loadConstellationChunk()
        .then(() => { if (!cancelled) setReady(true); })
        .catch(() => { if (!cancelled) setFailed(true); });
    });
    return () => { cancelled = true; cancelIdle(); };
  }, [mayLoad, ready, failed, status]);

  // ── BUILD THE SCENE ONCE THE CHUNK IS IN ──────────────────────────────────
  useEffect(() => {
    if (!ready || !canvasRef.current || !frameRef.current) return undefined;
    let cancelled = false;

    const build = async () => {
      const mod = await import('./constellation-three');
      if (cancelled || !canvasRef.current || !frameRef.current) return;
      const canvas = canvasRef.current;
      // Bound locally so the narrowing survives the `await` above and the awaits
      // below — a `ref.current` read is re-widened to nullable at every await.
      const frameEl: HTMLDivElement = frameRef.current;
      let scene;
      try {
        scene = mod.createScene(canvas, { entryDolly: !reduced });
      } catch {
        // A context that cannot be created is "no WebGL", not a crash.
        setFailed(true);
        return;
      }
      if (cancelled) { scene.dispose(); return; }
      sceneRef.current = scene;

      const rect = frameEl.getBoundingClientRect();
      scene.resize(rect.width || 480, rect.height || 380);
      scene.update(nodesRef.current);

      // The loop's three stop conditions are owned by `constellation-loop.ts`
      // (T-T2). Here we only supply the observers that feed them.
      const observer = typeof IntersectionObserver === 'function'
        ? new IntersectionObserver((entries) => {
          for (const e of entries) loopRef.current?.setVisible(e.isIntersecting);
        }, { threshold: 0.05 })
        : null;
      observer?.observe(frameEl);

      loopRef.current = startLoop({
        onFrame: (ms) => scene.frame(ms),
        reducedMotion: reduced,
        visible: true,
      });
    };

    void build();
    return () => { cancelled = true; };
  }, [ready, reduced]);

  // ── RE-LAYOUT ON DATA CHANGE ──────────────────────────────────────────────
  useEffect(() => {
    sceneRef.current?.update(nodes);
  }, [nodes]);

  // ── THE FOCUS RING FOLLOWS KEYBOARD FOCUS ────────────────────────────────
  useEffect(() => {
    sceneRef.current?.focusNode(focused);
  }, [focused, ready]);

  // ── TEARDOWN: THE LOOP STOPS AND THE CONTEXT IS RELEASED (T-T2) ──────────
  useEffect(() => () => {
    loopRef.current?.stop();
    loopRef.current = null;
    sceneRef.current?.dispose();
    sceneRef.current = null;
  }, []);

  // ── RESIZE ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready) return undefined;
    const onResize = () => {
      const el = frameRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      sceneRef.current?.resize(rect.width || 480, rect.height || 380);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [ready]);

  /** Pointer → node. Hover and click share one hit test. */
  const pickAt = useCallback((e: { clientX: number; clientY: number }) => {
    const el = frameRef.current;
    const scene = sceneRef.current;
    if (!el || !scene) return null;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    return scene.pick((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
  }, []);

  // ── ARROW-KEY NODE WALKING (`03 §Keyboard`) ───────────────────────────────
  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!nodes.length) return;
    const i = nodes.findIndex((n) => n.channelId === focused);
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      setFocused(nodes[(i + 1 + nodes.length) % nodes.length].channelId);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      setFocused(nodes[(i <= 0 ? nodes.length : i) - 1].channelId);
    } else if (e.key === 'Enter' && focused) {
      e.preventDefault();
      onOpenBrain(focused);
    } else if (e.key === 'Escape') {
      setFocused(null);
    }
  }, [nodes, focused, onOpenBrain]);

  const showFallbackList = failed || !webgl;

  return (
    <Frame
      ref={frameRef}
      data-testid="brain-constellation"
      data-reduced-motion={reduced ? 'true' : 'false'}
      data-webgl={webgl ? 'present' : 'absent'}
    >
      {!showFallbackList && (
        <Canvas
          ref={canvasRef}
          data-testid="constellation-canvas"
          role="img"
          aria-label={
            nodes.length
              ? `Brain constellation: ${nodes.length} creator${nodes.length === 1 ? '' : 's'}. Use the list below to open one.`
              : 'Brain constellation: no creators yet.'
          }
          tabIndex={0}
          onKeyDown={onKeyDown}
          onClick={(e) => { const id = pickAt(e); if (id) setFocused(id); }}
          onDoubleClick={(e) => { const id = pickAt(e); if (id) onOpenBrain(id); }}
          onMouseMove={(e) => { const id = pickAt(e); if (id) setFocused(id); }}
          onFocus={() => { if (!focused && nodes.length) setFocused(nodes[0].channelId); }}
        />
      )}

      {showFallbackList && (
        <Caption as="div" data-testid="constellation-fallback">
          {webgl ? 'The constellation could not load. ' : 'WebGL is unavailable here. '}
          The creators are listed below, and the roster to the right is unchanged.
        </Caption>
      )}

      {!showFallbackList && !ready && (
        <Caption data-testid="constellation-placeholder">
          {nodes.length ? 'Constellation loading…' : 'No brains yet — add your first creator.'}
        </Caption>
      )}

      {/* THE ALWAYS-PRESENT EQUAL. `03`: "every action also exists as a DOM
          control (never hover-only)". This list is not a degraded fallback for
          screen readers only — it is the same nodes, focusable and labelled, in
          a deterministic order, for everyone. */}
      <NodeList data-testid="constellation-node-list">
        {nodes.map((n) => (
          <li key={n.channelId}>
            <NodeButton
              type="button"
              $focused={focused === n.channelId}
              aria-label={nodeLabel(n)}
              onFocus={() => setFocused(n.channelId)}
              onMouseEnter={() => { setFocused(n.channelId); sceneRef.current?.focusNode(n.channelId); }}
              onClick={() => onOpenBrain(n.channelId)}
            >
              <Swatch $color={STATE_SWATCH[n.state]} aria-hidden="true" />
              {n.title}
              <NodeMeta>
                {n.state}
                {n.coverage === null ? ' · counts unavailable' : ` · ${Math.round(n.coverage * 100)}%`}
              </NodeMeta>
            </NodeButton>
          </li>
        ))}
      </NodeList>
    </Frame>
  );
}

export default BrainConstellation;
