/**
 * FeedbackPanel — Slide-Up Form Cues
 * ====================================
 * AnimatePresence slide-up coaching cues with 3s auto-dismiss.
 * Positioned bottom-center above the action bar.
 */
import React, { useEffect, useState, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { ANALYSIS_CONFIG, getScoreColor } from './constants';

export interface FormCue {
  id: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  /** Optional score to show */
  score?: number;
}

interface FeedbackPanelProps {
  cues: FormCue[];
  onDismiss?: (id: string) => void;
}

const Container = styled.div`
  position: absolute;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  gap: 8px;
  max-width: 360px;
  width: 90%;
  pointer-events: none;
`;

const severityColors = {
  info: { bg: 'rgba(96, 192, 240, 0.15)', border: 'rgba(96, 192, 240, 0.3)', text: '#60C0F0' },
  warning: { bg: 'rgba(255, 184, 0, 0.15)', border: 'rgba(255, 184, 0, 0.3)', text: '#FFB800' },
  error: { bg: 'rgba(255, 71, 87, 0.15)', border: 'rgba(255, 71, 87, 0.3)', text: '#FF4757' },
  success: { bg: 'rgba(0, 255, 136, 0.15)', border: 'rgba(0, 255, 136, 0.3)', text: '#00FF88' },
};

const CueCard = styled(motion.div)<{ $severity: FormCue['severity'] }>`
  background: ${({ $severity }) => severityColors[$severity].bg};
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid ${({ $severity }) => severityColors[$severity].border};
  border-radius: 16px;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  pointer-events: auto;
  width: 100%;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
`;

const SeverityDot = styled.div<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  box-shadow: 0 0 8px ${({ $color }) => $color};
  flex-shrink: 0;
`;

const Message = styled.span<{ $color: string }>`
  font-size: 13px;
  font-weight: 600;
  color: ${({ $color }) => $color};
  line-height: 1.3;
  flex: 1;
`;

const ScorePill = styled.span<{ $color: string }>`
  font-size: 12px;
  font-weight: 800;
  color: ${({ $color }) => $color};
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 2px 8px;
  font-variant-numeric: tabular-nums;
`;

const cueVariants = {
  initial: { opacity: 0, y: 30, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -20, scale: 0.95 },
};

const FeedbackPanel: React.FC<FeedbackPanelProps> = ({ cues, onDismiss }) => {
  const [visibleCues, setVisibleCues] = useState<FormCue[]>([]);

  // Keep only the latest 3 cues visible
  useEffect(() => {
    setVisibleCues(cues.slice(-3));
  }, [cues]);

  // Auto-dismiss after configured duration
  const handleAutoDismiss = useCallback((id: string) => {
    const timer = setTimeout(() => {
      setVisibleCues(prev => prev.filter(c => c.id !== id));
      onDismiss?.(id);
    }, ANALYSIS_CONFIG.FEEDBACK_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <Container>
      <AnimatePresence mode="popLayout">
        {visibleCues.map(cue => (
          <AutoDismissCue key={cue.id} cue={cue} onSetup={handleAutoDismiss} />
        ))}
      </AnimatePresence>
    </Container>
  );
};

/** Wrapper that triggers auto-dismiss on mount */
const AutoDismissCue: React.FC<{
  cue: FormCue;
  onSetup: (id: string) => () => void;
}> = ({ cue, onSetup }) => {
  useEffect(() => {
    return onSetup(cue.id);
  }, [cue.id, onSetup]);

  const colors = severityColors[cue.severity];
  const scoreColor = cue.score != null ? getScoreColor(cue.score) : undefined;

  return (
    <CueCard
      $severity={cue.severity}
      variants={cueVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      layout
    >
      <SeverityDot $color={colors.text} />
      <Message $color={colors.text}>{cue.message}</Message>
      {cue.score != null && scoreColor && (
        <ScorePill $color={scoreColor}>{cue.score}</ScorePill>
      )}
    </CueCard>
  );
};

export default FeedbackPanel;
