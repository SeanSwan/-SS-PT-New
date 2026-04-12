import styled from 'styled-components';
import { motion } from 'framer-motion';

/**
 * CommandCard — universal dashboard widget base.
 *
 * Kirin treatment per Gemini 3.1 Pro design spec:
 * - Carbon #141419 → Graphite #1A1A24 subtle radial gradient (top-left origin)
 * - 1px hairline border Frost White at 8% opacity
 * - Deep obsidian shadow for elevation
 * - Hover: -4px lift, border shifts to Wing Purple at 30%, shadow gains purple bloom
 * - Easing: cubic-bezier(0.16, 1, 0.3, 1) (premium ease-out)
 */
export const CommandCard = styled(motion.div)`
  background: radial-gradient(120% 120% at 0% 0%, #1A1A24 0%, #141419 100%);
  border-radius: 16px;
  border: 1px solid rgba(224, 236, 244, 0.08);
  box-shadow: 0 8px 32px rgba(10, 10, 15, 0.6);
  transition: transform 400ms cubic-bezier(0.16, 1, 0.3, 1),
              border-color 400ms cubic-bezier(0.16, 1, 0.3, 1),
              box-shadow 400ms cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    transform: translateY(-4px);
    border-color: rgba(139, 92, 246, 0.3);
    box-shadow: 0 12px 40px rgba(139, 92, 246, 0.15),
                0 8px 32px rgba(10, 10, 15, 0.6);
  }

  @media (max-width: 768px) {
    border-radius: 12px;

    &:hover {
      transform: translateY(-2px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    transition: border-color 200ms ease, box-shadow 200ms ease;
    &:hover { transform: none; }
  }
`;
