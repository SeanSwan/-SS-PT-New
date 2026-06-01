/**
 * Shared motion and theme primitives for the admin sessions surface.
 * Keeps design tokens centralized while feature styles stay in focused modules.
 */
import { keyframes } from 'styled-components';

export const shimmer = keyframes`
  0% { background-position: -100% 0; }
  100% { background-position: 200% 0; }
`;

export const executiveTheme = {
  deepSpace: 'var(--bg-base, #0A0A0F)',
  commandNavy: 'var(--bg-surface, #1A1A24)',
  stellarAuthority: 'var(--accent-secondary, #8B5CF6)',
  cyberIntelligence: 'var(--accent-primary, #60C0F0)',
  executiveAccent: 'var(--accent-primary, #60C0F0)',
  warningAmber: 'var(--warning, #f59e0b)',
  successGreen: 'var(--success, #10b981)',
  criticalRed: 'var(--danger, #ef4444)',
  stellarWhite: 'var(--text-primary, #E0ECF4)',
  platinumSilver: 'var(--text-secondary, rgba(224, 236, 244, 0.65))',
  cosmicGray: 'var(--text-muted, rgba(224, 236, 244, 0.4))',
};

export const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      when: 'beforeChildren',
      staggerChildren: 0.1,
      duration: 0.3,
    },
  },
};

export const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 10,
    },
  },
};

export const staggeredItemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: (custom: number) => ({
    y: 0,
    opacity: 1,
    transition: {
      delay: custom * 0.1,
      type: 'spring',
      stiffness: 100,
      damping: 10,
    },
  }),
};
