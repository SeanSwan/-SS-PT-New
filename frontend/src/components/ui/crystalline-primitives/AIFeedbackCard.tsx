/**
 * AIFeedbackCard — Floating feedback card for AI Form Analysis
 * Royal Depth glass background · Drama font for titles · Data font for metrics
 * Framer Motion entrance animation · ARIA live region for screen readers
 */
import styled from 'styled-components';
import { motion } from 'framer-motion';

export const AIFeedbackCard = styled(motion.div)`
  background: rgba(0, 48, 128, 0.85); /* Royal Depth */
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(96, 192, 240, 0.2); /* Ice Wing */
  border-radius: 12px;
  padding: 16px;
  color: #E0ECF4; /* Frost White */
  max-width: 280px;
  z-index: 20;

  h4 {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-style: italic;
    font-size: 1.5rem;
    color: #60C0F0; /* Ice Wing */
    margin: 0 0 8px 0;
  }

  p {
    font-family: 'Sora', sans-serif;
    font-size: 0.875rem;
    line-height: 1.4;
    margin: 0 0 8px 0;
  }

  .metric {
    font-family: 'Fira Code', monospace;
    font-size: 0.875rem;
    color: #50A0F0; /* Arctic Cyan */
  }

  .status-perfect {
    color: #60C0F0;
  }

  .status-adjust {
    color: #8B5CF6; /* Wing Purple */
  }

  @media (max-width: 430px) {
    max-width: 220px;
    padding: 12px;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);

    h4 { font-size: 1.25rem; }
  }

  @supports not (backdrop-filter: blur(16px)) {
    background: rgba(0, 32, 96, 0.95);
  }
`;

/** Framer Motion animation presets for the feedback card */
