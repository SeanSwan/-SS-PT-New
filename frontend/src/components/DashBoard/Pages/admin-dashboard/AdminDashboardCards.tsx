import styled from 'styled-components';
import { motion } from 'framer-motion';

/** CommandCard - universal dashboard widget base, mapped to active theme tokens. */
export const CommandCard = styled(motion.div)`
  background:
    radial-gradient(120% 120% at 0% 0%,
      color-mix(in srgb, var(--bg-card, #141419) 92%, var(--accent-primary, #60C0F0) 8%) 0%,
      color-mix(in srgb, var(--surface-secondary, #1A1A24) 94%, var(--bg-base, #0A0A0F) 6%) 100%);
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 12%, transparent);
  box-shadow: var(--shadow-elevation, 0 15px 35px color-mix(in srgb, var(--bg-base, #0A0A0F) 50%, transparent));
  transition: transform 400ms cubic-bezier(0.16, 1, 0.3, 1),
              border-color 400ms cubic-bezier(0.16, 1, 0.3, 1),
              box-shadow 400ms cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    transform: translateY(-4px);
    border-color: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 34%, transparent);
    box-shadow:
      var(--shadow-elevation, 0 15px 35px color-mix(in srgb, var(--bg-base, #0A0A0F) 50%, transparent)),
      0 0 34px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 16%, transparent);
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
