/**
 * HeroSignature.tsx — A9: the hero's WebGL signature, behind a lazy boundary.
 * ===========================================================================
 *
 * WHAT THIS IS. The hero shows a poster image. If — and only if — the device has earned the
 * `full` tier, the hero is actually on screen, and the work finishes inside its budget, the
 * poster is replaced by a WebGL mark that plays one reveal. Every other path ends with the
 * poster still there. There is no state in which the user sees a hole.
 *
 * WHY IT IS A SEPARATE COMPONENT FROM `SwanMark3D`. `SwanMark3D` is the HEADER mark: it mounts
 * immediately, is always visible, drifts idly, and never reveals. The hero's mark is the
 * opposite on all four counts — it must not download until scrolled to, it plays a one-shot
 * reveal, and it has a deadline. Forcing both into one component would mean a props matrix
 * where most combinations are invalid. They share the controller (`createSwanMarkScene`), which
 * is the part worth sharing.
 *
 * THE BOUNDARY IS THE FEATURE. `three` plus the mesh spec is roughly 600 KB + 297 KB. The whole
 * point of A9 is that a phone on `reduced` tier, or a visitor who never scrolls to the hero,
 * downloads NONE of it. That is why the import is inside a visibility gate and not at module
 * scope, and why `09-tests.md` Q1 wants a build-boundary test with a *negative control* — a
 * fixture that static-imports the renderer and is expected to FAIL the boundary check.
 *
 * DECISIONS LIVE IN `heroSignatureMachine.ts`. This file is the shell: refs, effects, DOM. Every
 * "may we", "is this still valid", "does this latch" is a pure function over there, so it can be
 * tested without a browser. See that file's header for why.
 *
 * TEST SEAMS, AND WHY THEY ARE PROPS. `loadScene` and `now` are injectable. Without them, L1–L5
 * would need a real WebGL context and real wall-clock waits, and the deadline cases would be
 * untestable in jsdom. They default to the real implementations, so production behaviour is the
 * default path and the seams cost nothing at runtime. A seam that changes production behaviour
 * would be a defect; these do not.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { PerformanceTierContext } from '../../../../core/perf/PerformanceTierContext';
import type { SwanMarkScene, SwanMarkSceneOptions } from '../../../../components/SwanMark3D/swanMarkScene';
import {
  deadlineExpired,
  mayCreateController,
  mayStartLoad,
  nextPhaseForCapability,
  ownsController,
  phaseAfterFailure,
  phaseWhenHidden,
  posterVisible,
  type SignaturePhase,
} from './heroSignatureMachine';

/** What the lazy chunk must provide. Narrowed to what this component actually calls. */
export interface SceneModule {
  createSwanMarkScene(opts: SwanMarkSceneOptions): SwanMarkScene;
  spec: unknown;
}

export interface HeroSignatureProps {
  /** Painted until the first WebGL frame is presented, and permanently otherwise. */
  posterSrc: string;
  /** Empty string marks it decorative; the hero already has an <h1>. */
  alt?: string;
  className?: string;
  size?: number;
  /**
   * Budget from "we may start" to "a frame is on screen". Past it, a late success is
   * REJECTED rather than shown — a reveal that arrives after the user has read the hero is a
   * jarring animation, not a delighter.
   */
  deadlineMs?: number;
  /** Test seam. Defaults to the real dynamic import of the renderer + mesh. */
  loadScene?: () => Promise<SceneModule>;
  /** Test seam for the deadline clock. */
  now?: () => number;
}

const Frame = styled.span<{ $size: number }>`
  position: relative;
  display: inline-block;
  width: ${(p) => p.$size}px;
  height: ${(p) => p.$size}px;
  aspect-ratio: 1 / 1;
  flex-shrink: 0;
  line-height: 0;
  vertical-align: top;
`;

const Poster = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
`;

const Canvas = styled.canvas`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
`;

/** The real boundary. Both dynamic, so neither reaches the home entry chunk. */
const defaultLoadScene = async (): Promise<SceneModule> => {
  const [sceneMod, specMod] = await Promise.all([
    import('../../../../components/SwanMark3D/swanMarkScene'),
    import('../../../../three/swanMark/swan-mark.mesh.json'),
  ]);
  return {
    createSwanMarkScene: sceneMod.createSwanMarkScene,
    spec: (specMod as { default: unknown }).default,
  };
};

export const HeroSignature: React.FC<HeroSignatureProps> = ({
  posterSrc,
  alt = '',
  className,
  size = 120,
  deadlineMs = 4000,
  loadScene = defaultLoadScene,
  now = () => Date.now(),
}) => {
  const capability = React.useContext(PerformanceTierContext);
  const hostRef = useRef<HTMLSpanElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<SwanMarkScene | null>(null);

  const [phase, setPhase] = useState<SignaturePhase>('idle');
  const [visible, setVisible] = useState(false);
  const [everVisible, setEverVisible] = useState(false);

  /*
   * `generation` increments on every effect teardown. StrictMode double-invokes effects in
   * development, and a remount must not let the FIRST run's in-flight import build a controller
   * for the SECOND run's canvas. Held in a ref because the resolved import reads it after an
   * await, where a state value would be the stale one captured at call time — the same class of
   * stale-closure bug A2 removed from the provider.
   */
  const generationRef = useRef(0);
  /** One-shot latch for the load. See the lazy-load effect for why this is not the phase. */
  const startedRef = useRef(false);
  const observerAvailable = typeof IntersectionObserver !== 'undefined';

  /* Phase is mirrored into a ref so teardown can read the CURRENT phase. A cleanup closure
     captures `phase` from the render it was created in, which during a fast
     idle → loading → unmount sequence is the stale `idle`, and the dispose would be skipped. */
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const disposeScene = useCallback(() => {
    const scene = sceneRef.current;
    sceneRef.current = null;
    // `dispose` is idempotent by contract (A8 R3) — calling it twice is safe, and this is
    // reached from both the visibility path and unmount.
    scene?.dispose();
  }, []);

  /* ---- visibility ------------------------------------------------------------------ */
  useEffect(() => {
    // No observer → the poster stays. Guessing "probably visible" would download the renderer
    // for a hero the visitor may never reach. L4: `missing observer retains poster`.
    if (!observerAvailable) return;
    const host = hostRef.current;
    if (!host) return;

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (!entry) return;
        setVisible(entry.isIntersecting);
        if (entry.isIntersecting) setEverVisible(true);
      },
      { threshold: 0.1 },
    );
    io.observe(host);
    return () => io.disconnect();
  }, [observerAvailable]);

  /* ---- capability changes ----------------------------------------------------------- */
  useEffect(() => {
    setPhase((current) => nextPhaseForCapability(current, capability));
  }, [capability]);

  /* ---- hidden mid-flight ------------------------------------------------------------- */
  useEffect(() => {
    if (visible) return;
    setPhase((current) => {
      const next = phaseWhenHidden(current);
      if (next !== current && ownsController(current)) disposeScene();
      return next;
    });
  }, [visible, disposeScene]);

  /* ---- the lazy load ----------------------------------------------------------------- */
  /*
   * `startedRef`, NOT the phase, is what stops a second load.
   *
   * The obvious shape — depend on `phase`, bail unless `idle`, then `setPhase('loading')` —
   * is self-defeating and the L1-L5 suite caught it: changing the phase re-runs the very
   * effect that is keyed on it, React tears the previous run down, the teardown sets
   * `cancelled = true`, and the in-flight import is cancelled by its own success. Every
   * resolve-dependent case sat at `loading` forever.
   *
   * So this effect is keyed on the INPUTS that decide eligibility, never on the phase it
   * produces. One-shot-ness lives in a ref, which a re-render cannot reset.
   */
  useEffect(() => {
    const input = { capability, everVisible, visible, observerAvailable };
    if (startedRef.current) return;
    if (!mayStartLoad(input)) return;

    let cancelled = false;
    startedRef.current = true;
    const startedGeneration = generationRef.current;
    const startedAt = now();
    setPhase('loading');

    (async () => {
      try {
        const mod = await loadScene();
        const expired = deadlineExpired(startedAt, now(), deadlineMs);
        const ok = mayCreateController({
          input: { capability, everVisible, visible, observerAvailable },
          cancelled,
          startedGeneration,
          currentGeneration: generationRef.current,
          deadlineExpired: expired,
        });
        // L2: late import after downgrade / after unmount, and the expired deadline, all land
        // here. Returning WITHOUT constructing is the whole point — a controller built now
        // would own a WebGL context nobody disposes.
        if (!ok) {
          if (cancelled) return;
          if (expired) {
            // Terminal: the budget is spent and a late reveal is worse than the poster.
            setPhase('disabled');
          } else {
            // Not terminal — conditions merely changed (downgrade, scrolled away). Return to
            // `idle` AND release the one-shot latch, so a genuinely eligible moment later can
            // still try. Leaving the latch set here would silently make the hero permanently
            // static after a single scroll-past, which is indistinguishable from a bug.
            startedRef.current = false;
            setPhase('idle');
          }
          return;
        }
        const canvas = canvasRef.current;
        if (!canvas) {
          setPhase(phaseAfterFailure());
          return;
        }

        const scene = mod.createSwanMarkScene({
          canvas,
          spec: mod.spec as never,
          // The hero mark does not drift; it reveals once and settles. A10 owns motion budget.
          drift: 0,
          onPresented: () => {
            // Guarded: a callback that fires after teardown must not resurrect the canvas.
            // A8 R3 `late callback cannot render` is the controller-side half of this.
            if (cancelled || startedGeneration !== generationRef.current) return;
            if (deadlineExpired(startedAt, now(), deadlineMs)) return;
            setPhase('presented');
          },
          onError: () => {
            if (cancelled) return;
            // Context loss lands here. L3: `context loss restores poster` — `disabled` renders
            // the poster, and it is terminal so no retry storm follows.
            disposeScene();
            setPhase(phaseAfterFailure());
          },
        });

        sceneRef.current = scene;
        const rect = canvas.getBoundingClientRect();
        scene.setSize(rect.width || size, rect.height || size);
        scene.setDrift(0);

        // Re-check the clock AFTER synchronous preparation. Constructing a scene, compiling
        // shaders and uploading a mesh is not free, and on a slow device it can consume the
        // whole budget by itself. L5: `synchronous preparation exceeding deadline never
        // presents late`.
        if (deadlineExpired(startedAt, now(), deadlineMs)) {
          disposeScene();
          setPhase('disabled');
          return;
        }

        setPhase('revealing');
        scene.beginReveal();
      } catch {
        // Any failure at all leaves the poster. A decorative mark is not worth an error
        // boundary, and the hero must not go blank because a chunk 404'd.
        if (!cancelled) setPhase(phaseAfterFailure());
      }
    })();

    return () => {
      cancelled = true;
      generationRef.current += 1;
      // L5: `cleanup before presentation does not consume reveal`. Only dispose what we own —
      // tearing down during `loading` would call dispose on a null scene, which is harmless,
      // but the phase check keeps the intent legible.
      if (ownsController(phaseRef.current)) disposeScene();
    };
    // Deliberately WITHOUT `phase` — see the block comment above. Including it made the effect
    // cancel its own in-flight import.
  }, [capability, everVisible, visible, observerAvailable, loadScene, now, deadlineMs, size, disposeScene]);

  /* ---- unmount ----------------------------------------------------------------------- */
  useEffect(() => () => disposeScene(), [disposeScene]);

  return (
    <Frame
      ref={hostRef}
      className={className}
      $size={size}
      data-testid="hero-signature"
      data-phase={phase}
    >
      {posterVisible(phase) && (
        <Poster
          src={posterSrc}
          alt={alt}
          data-testid="hero-signature-poster"
          aria-hidden={alt === '' ? true : undefined}
        />
      )}
      {/* The canvas is always mounted: `createSwanMarkScene` needs a real element at construction
          time, and mounting it only once eligible would mean a render pass between "eligible" and
          "canvas exists". It is decorative and must never take a tab stop — A7's
          `decorative mark is absent from keyboard navigation` is the test that holds this. */}
      <Canvas ref={canvasRef} aria-hidden="true" data-testid="hero-signature-canvas" />
    </Frame>
  );
};

export default HeroSignature;
