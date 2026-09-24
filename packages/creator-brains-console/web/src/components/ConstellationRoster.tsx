/*
 * ConstellationRoster.tsx — the always-present DOM equal, and the two captions.
 *
 * Extracted from `BrainConstellation.tsx` at the Rule 4 seam (300 lines, ban 14):
 * "what the panel renders when the constellation is not doing the work" vs "the
 * component that owns the canvas". Nothing here holds a scene reference, a media
 * query or a lifecycle — it takes nodes and callbacks. That is what makes it safe
 * to move, and it is also why the markup and the reasoning about it can live
 * together instead of apart.
 *
 * ── WHY THIS IS NOT A FALLBACK ──────────────────────────────────────────────
 *
 * `03-wireframes.md` requires that "every action also exists as a DOM control
 * (never hover-only)". So this list is NOT a degraded mode shown to screen
 * readers while healthy users get the canvas. It renders in EVERY state — while
 * loading, while running — with the same nodes, in a deterministic order,
 * focusable and labelled. The constellation is the beauty; this is the work.
 */

import { STATE_SWATCH, Canvas, NodeButton, NodeList, NodeMeta, Swatch, Caption } from './constellation.styles';
import { nodeLabel, type BrainNode } from './constellation-layout';
import type { KeyboardEvent as ReactKeyboardEvent, Ref } from 'react';

export interface ConstellationRosterProps {
  nodes: BrainNode[];
  focused: string | null;
  onFocus: (channelId: string) => void;
  /** Move the scene's focus ring. Optional: the list works without a scene. */
  onHoverNode?: (channelId: string) => void;
  onOpen: (channelId: string) => void;
}

export function ConstellationRoster({
  nodes, focused, onFocus, onHoverNode, onOpen,
}: ConstellationRosterProps) {
  return (
    <NodeList data-testid="constellation-node-list">
      {nodes.map((n) => (
        <li key={n.channelId}>
          <NodeButton
            type="button"
            $focused={focused === n.channelId}
            // The label is built by `nodeLabel` so the DOM text and the scene's
            // tooltip cannot drift apart — one function, two renderers.
            aria-label={nodeLabel(n)}
            onFocus={() => onFocus(n.channelId)}
            onMouseEnter={() => { onFocus(n.channelId); onHoverNode?.(n.channelId); }}
            onClick={() => onOpen(n.channelId)}
          >
            <Swatch $color={STATE_SWATCH[n.state]} aria-hidden="true" />
            {n.title}
            <NodeMeta>
              {n.state}
              {/* A null coverage is "counts unavailable", never "0%" — `S1-H9`
                  requires an untakeable count be rendered as absent, because a
                  zero reads as "this creator fetched nothing". */}
              {n.coverage === null ? ' · counts unavailable' : ` · ${Math.round(n.coverage * 100)}%`}
            </NodeMeta>
          </NodeButton>
        </li>
      ))}
    </NodeList>
  );
}

export default ConstellationRoster;

/**
 * The canvas element and its wiring, extracted for the same Rule 4 seam.
 *
 * The `aria-label` is built HERE rather than at the call site because it is the
 * canvas's accessible name — the thing that tells a screen-reader user what the
 * image is and where the operable controls are. Keeping it beside the element it
 * names means the label cannot describe a canvas that no longer renders that way.
 */
export interface ConstellationCanvasProps {
  canvasRef: Ref<HTMLCanvasElement>;
  nodes: BrainNode[];
  onKeyDown: (e: ReactKeyboardEvent) => void;
  onPick: (e: { clientX: number; clientY: number }) => string | null;
  onFocusNode: (id: string) => void;
  onOpen: (id: string) => void;
  focused: string | null;
}

export function ConstellationCanvas({
  canvasRef, nodes, onKeyDown, onPick, onFocusNode, onOpen, focused,
}: ConstellationCanvasProps) {
  return (
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
      onClick={(e) => { const id = onPick(e); if (id) onFocusNode(id); }}
      onDoubleClick={(e) => { const id = onPick(e); if (id) onOpen(id); }}
      onMouseMove={(e) => { const id = onPick(e); if (id) onFocusNode(id); }}
      onFocus={() => { if (!focused && nodes.length) onFocusNode(nodes[0].channelId); }}
    />
  );
}

/**
 * The two overlay captions, which sit ON TOP of the canvas (the styled `Caption`
 * is `position: absolute; inset: 0`) rather than displacing it.
 *
 * They are here rather than in `BrainConstellation.tsx` because they are the
 * same concern as the list: the component's degraded and loading states are all
 * "what it renders when the constellation is not doing the work", and keeping
 * them together means the copy can be read as a set. Splitting them across files
 * is how a fallback message ends up promising something the list no longer
 * provides.
 */
export interface ConstellationCaptionsProps {
  /** The chunk failed, or WebGL was never available. */
  showFallback: boolean;
  /** Chunk is in flight (or the roster is empty). */
  showPlaceholder: boolean;
  /** WebGL capability, to distinguish "could not load" from "unavailable". */
  webgl: boolean;
  nodeCount: number;
}

export function ConstellationCaptions({
  showFallback, showPlaceholder, webgl, nodeCount,
}: ConstellationCaptionsProps) {
  if (showFallback) {
    return (
      <Caption as="div" data-testid="constellation-fallback">
        {webgl ? 'The constellation could not load. ' : 'WebGL is unavailable here. '}
        The creators are listed below, and the roster to the right is unchanged.
      </Caption>
    );
  }
  if (showPlaceholder) {
    return (
      <Caption data-testid="constellation-placeholder">
        {nodeCount ? 'Constellation loading…' : 'No brains yet — add your first creator.'}
      </Caption>
    );
  }
  return null;
}
