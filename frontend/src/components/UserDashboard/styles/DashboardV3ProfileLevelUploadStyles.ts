/**
 * Profile level badge and upload button styles for UserDashboard V3.
 * Extracted without CSS behavior changes.
 */

import styled from 'styled-components';
import { motion } from 'framer-motion';

export const HexLevelBadge = styled.div`
  position: absolute;
  top: 50%;
  left: -72px;
  transform: translateY(-50%);
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3;
  pointer-events: none;
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  background: var(--accent-gold, #C6A84B);
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--accent-gold, #C6A84B) 95%, transparent) 0%,
    color-mix(in srgb, var(--accent-gold, #C6A84B) 60%, var(--accent-primary, #60C0F0)) 100%
  );
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.125rem;
  font-weight: 800;
  color: var(--bg-base, #0A0A0F);
  letter-spacing: -0.01em;
  text-shadow: 0 1px 2px color-mix(in srgb, var(--bg-base, #0A0A0F) 35%, transparent);
  filter: drop-shadow(0 4px 10px color-mix(in srgb, var(--accent-gold, #C6A84B) 40%, transparent));

  @media (max-width: 768px) {
    width: 44px;
    height: 44px;
    font-size: 0.9375rem;
    top: auto;
    bottom: -58px;
    left: calc(50% - 52px);
    transform: none;
  }

  @media (max-width: 320px) {
    width: 38px;
    height: 38px;
    font-size: 0.8125rem;
    bottom: -50px;
    left: calc(50% - 46px);
  }

  @media (min-width: 2560px) {
    width: 68px;
    height: 68px;
    font-size: 1.375rem;
    left: -88px;
  }

  @media (min-width: 3840px) {
    width: 84px;
    height: 84px;
    font-size: 1.625rem;
    left: -108px;
  }

  /* Performance: drop the soft drop-shadow on touch / low-power devices. */
  @media (hover: none) and (pointer: coarse) {
    filter: none;
  }
`;

export const ImageUploadButton = styled(motion.button)`
  position: absolute;
  top: 50%;
  right: -68px;
  transform: translateY(-50%);
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg,
    var(--accent-primary, #60C0F0) 0%,
    var(--accent-secondary, #8B5CF6) 100%
  );
  border: 3px solid var(--bg-base, #002060);
  color: var(--color-white, #E0ECF4);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.3),
    0 2px 6px rgba(0, 0, 0, 0.2),
    inset 0 1px 2px rgba(255, 255, 255, 0.2);
  z-index: 3;

  /* Professional hover effects */
  &:hover {
    transform: scale(1.15) translateY(-2px);
    box-shadow:
      0 8px 20px rgba(0, 0, 0, 0.4),
      0 4px 12px rgba(0, 0, 0, 0.3),
      inset 0 1px 2px rgba(255, 255, 255, 0.3);
    background: linear-gradient(135deg,
      var(--accent-gold, #C6A84B) 0%,
      var(--accent-primary, #60C0F0) 100%
    );
  }

  &:active {
    transform: scale(1.05);
  }

  /* Icon styling */
  svg {
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
  }

  @media (max-width: 768px) {
    width: 44px;
    height: 44px;
    top: auto;
    right: calc(50% - 52px);
    bottom: -58px;
    transform: none;
    border-width: 2px;

    &:hover {
      transform: scale(1.1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    &:hover {
      transform: none;
    }
  }
`;

// SECTION: Profile Info Components
// PURPOSE: Name, username, role badge, bio, and action buttons
