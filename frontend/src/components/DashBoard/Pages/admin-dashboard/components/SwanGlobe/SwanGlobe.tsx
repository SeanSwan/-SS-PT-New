/**
 * SwanGlobe — the Three.js half of the visitor-geography surface (SWA-138 S12).
 * Lazy-loaded ONLY when swanGlobeCapability says so; never imported on mobile.
 *
 * The globe is the "where"; the sibling table is the truth (HY3 B4 split-pane).
 * Hovering a marker focuses the matching row and vice-versa, so the tooltip
 * information the old SVG map exposed to mouse users ONLY is now reachable by
 * keyboard through the table.
 */

import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { createGlobeScene, type GlobeCity, type SceneHandle } from './swanGlobeScene';

const Canvas = styled.div`
  border-radius: 14px;
  cursor: grab;
  height: 100%;
  min-height: 320px;
  overflow: hidden;
  position: relative;
  width: 100%;
  &:active { cursor: grabbing; }
  canvas { display: block; }
`;

interface SwanGlobeProps {
  cities: GlobeCity[];
  focusedIndex: number | null;
  onHoverIndex: (index: number | null) => void;
  onContextLost: () => void;
}

const SwanGlobe: React.FC<SwanGlobeProps> = ({
  cities,
  focusedIndex,
  onHoverIndex,
  onContextLost,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<SceneHandle | null>(null);
  const hoverRef = useRef(onHoverIndex);
  const lostRef = useRef(onContextLost);
  hoverRef.current = onHoverIndex;
  lostRef.current = onContextLost;

  useEffect(() => {
    if (!containerRef.current) return undefined;
    const handle = createGlobeScene({
      container: containerRef.current,
      onHover: (index) => hoverRef.current(index),
      onContextLost: () => lostRef.current(),
    });
    sceneRef.current = handle;
    return () => {
      handle.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.setCities(cities);
  }, [cities]);

  useEffect(() => {
    sceneRef.current?.focusCity(focusedIndex);
  }, [focusedIndex]);

  return <Canvas ref={containerRef} data-testid="swan-globe-canvas" />;
};

export default SwanGlobe;
export type { GlobeCity };
