/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ StageCanvas — SESSION SHELL zone 4 primitive.               │
 * │ On stage entry: restores that stage's scroll position       │
 * │ (0 on FIRST entry — anti-jump law 3, via instant scrollTop  │
 * │ assignment, never smooth), moves focus to the stage h2      │
 * │ (tabIndex -1) and announces via aria-live=polite (law 2).   │
 * │ Reduced-motion: the swap is a hard cut — no transition is   │
 * │ declared at all in v1; recipes may add guarded ones later.  │
 * │ Scroll host note: the document scrolls until the action-bar │
 * │ slice locks the shell to 100dvh; the save side lives in     │
 * │ switchSessionStage so the flip is one primitive change.     │
 * └─────────────────────────────────────────────────────────────┘
 */
import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import type { SessionStage, SessionStageStore } from '../useSessionStage';

export const STAGE_LABELS: Record<SessionStage, string> = {
  setup: 'Setup',
  train: 'Train',
  finish: 'Finish',
};

/** Screen-reader-only — the focus target + announcer never shift layout. */
const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
`;

const Canvas = styled.section`
  min-width: 0;
`;

export interface StageCanvasProps {
  stage: SessionStage;
  store: SessionStageStore;
  children: React.ReactNode;
}

const StageCanvas: React.FC<StageCanvasProps> = ({ stage, store, children }) => {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const prevStageRef = useRef<SessionStage>(stage);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    if (prevStageRef.current === stage) return;
    prevStageRef.current = stage;
    // Instant restore — scrollTop assignment, never scrollTo/smooth (M3).
    document.documentElement.scrollTop = store.scrollTopFor(stage);
    headingRef.current?.focus();
    setAnnouncement(`${STAGE_LABELS[stage]} stage`);
  }, [stage, store]);

  return (
    <Canvas data-shell-zone='canvas' aria-label={`${STAGE_LABELS[stage]} stage`}>
      <VisuallyHidden as='h2' ref={headingRef} tabIndex={-1}>
        {STAGE_LABELS[stage]}
      </VisuallyHidden>
      <VisuallyHidden aria-live='polite'>{announcement}</VisuallyHidden>
      {children}
    </Canvas>
  );
};

export default StageCanvas;
