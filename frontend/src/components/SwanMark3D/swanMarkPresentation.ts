/**
 * swanMarkPresentation.ts — the render/report half of the swan mark controller.
 *
 * WHY THIS MODULE EXISTS
 * ----------------------
 * `01-architecture.md` sets a five-module boundary for this surface and then adds a
 * contingency: *"The five-module list is a design boundary, not permission to exceed 300
 * lines. If the existing controller cannot remain within the cap, extract one cohesive
 * private presentation helper and record the reason before adding it."*
 *
 * The controller could not remain within the cap. A8's reveal, its notifications and its
 * accounting took `swanMarkScene.ts` from 271 code lines to 391 — 427 physical lines
 * against Rule 4's 300. Three options existed, and two were ruled out:
 *
 *   - Split the reveal's arithmetic out further. Already done: `swanMarkReveal.ts` is a
 *     separate module. What remained in the controller was not arithmetic, it was
 *     scheduling — which cannot leave, because only the controller owns a GL context.
 *   - Compress the file by deleting its measured reasoning. Rejected. The two-canvas
 *     design and the `supersample = 2` constant are the results of in-browser
 *     measurement, including one conclusion that a Python model got wrong. That prose is
 *     why the numbers are trusted; removing it to satisfy a line budget would trade a
 *     real asset for a green check.
 *   - Extract this helper. Taken, and this header is the "record the reason" the
 *     architecture asks for.
 *
 * WHAT BELONGS HERE, AND WHY IT IS COHESIVE
 * -----------------------------------------
 * Every export is about *a frame reaching the viewer, and the caller being told about
 * it*: the draw, the blit, the error route, the frame counter. That is one concern with
 * one invariant — `onPresented` fires if and only if a render was blitted to the display
 * canvas — and it is the invariant the whole progressive-enhancement contract rests on,
 * because the boundary hides the poster when that callback fires. A callback fired for a
 * frame that never reached the canvas would uncover an empty box.
 *
 * This is deliberately NOT a general-purpose renderer. It owns no timer, no rAF handle
 * and no disposal: the controller still owns scheduling and teardown, and calls
 * `dispose()` here only to stop the callbacks.
 */
import type * as THREE from 'three';

/** What a successful presentation looked like. Passed to `onPresented`. */
export interface SwanMarkPresentation {
  /** 0 on the first frame, rising to 1 on the frame the reveal settles. */
  progress: number;
  settled: boolean;
  /** Frames presented so far, counting the first. */
  frames: number;
}

export interface PresentationOptions {
  /** The DISPLAYED 2D canvas. */
  canvas: HTMLCanvasElement;
  /** The detached WebGL scratch buffer the frame is rendered into. */
  glCanvas: HTMLCanvasElement;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.Camera;
  /** Called after a blit succeeds. A throw here is reported, not propagated. */
  onPresented?: (info: SwanMarkPresentation) => void;
  /** Called for a failed draw or a throwing callback. */
  onError?: (error: unknown) => void;
  /** Supplies the current reveal progress for the callback payload. */
  readProgress: () => number;
  /** Supplies the current reveal state for the callback payload. */
  readSettled: () => boolean;
}

export interface SwanMarkPresentationController {
  /** Render, blit, then report. Returns false if the draw failed. */
  present(): boolean;
  /** Render and blit without reporting. Used by the coalesced single-frame path. */
  draw(): void;
  /** Stops all callbacks. Does not touch GL resources; the caller owns those. */
  dispose(): void;
  readonly frames: number;
}

export function createSwanMarkPresenter(
  opts: PresentationOptions,
): SwanMarkPresentationController {
  const { canvas, glCanvas, renderer, scene, camera } = opts;
  // Captured once at construction. Reading `canvas.getContext` per frame would be both
  // slower and a second chance to get a different context object.
  const blit = canvas.getContext('2d');
  if (!blit) {
    throw new Error('SwanMarkScene: no 2D context for the display canvas');
  }

  let disposed = false;
  let frames = 0;

  // Last-known GL scratch dimensions, updated by the controller through `setScratch`.
  let glW = glCanvas.width;
  let glH = glCanvas.height;

  // A throwing boundary handler must not take the render loop down, and no callback may
  // run after disposal.
  const notifyError = (error: unknown) => {
    if (disposed) return;
    try {
      opts.onError?.(error);
    } catch {
      /* swallowed on purpose - choosing the fallback is the boundary's job */
    }
  };

  const draw = () => {
    if (disposed) return;
    renderer.render(scene, camera);
    // The resize, done by the resampler rather than by the compositor.
    blit.clearRect(0, 0, canvas.width, canvas.height);
    blit.imageSmoothingEnabled = true;
    blit.imageSmoothingQuality = 'high';
    blit.drawImage(glCanvas, 0, 0, glW, glH, 0, 0, canvas.width, canvas.height);
  };

  return {
    draw,
    present: () => {
      if (disposed) return false;
      try {
        draw();
      } catch (err) {
        notifyError(err);
        return false;
      }
      frames += 1;
      try {
        opts.onPresented?.({
          progress: opts.readProgress(),
          settled: opts.readSettled(),
          frames,
        });
      } catch (err) {
        notifyError(err);
      }
      return true;
    },
    dispose: () => {
      disposed = true;
    },
    get frames() {
      return frames;
    },
  };
}
