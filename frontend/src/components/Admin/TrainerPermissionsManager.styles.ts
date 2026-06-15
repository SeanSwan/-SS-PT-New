import { motion } from 'framer-motion';
import styled, { keyframes } from 'styled-components';

export const permissionTheme = {
  colors: {
    primary: 'var(--accent-primary, #60c0f0)',
    secondary: 'var(--swan-lavender, #4070c0)',
    accent: 'var(--accent-cyan, #50a0f0)',
    success: 'var(--success, #10b981)',
    warning: 'var(--warning, #c6a84b)',
    error: 'var(--danger, #ef4444)',
    background: 'var(--bg-base, #030712)',
    surface: 'var(--surface-primary, #141419)',
    cardBg: 'var(--surface-secondary, #1a1a24)',
    text: 'var(--text-primary, #e0ecf4)',
    textSecondary: 'var(--text-secondary, #cbd5e1)',
    border: 'var(--border-soft, rgba(224, 236, 244, 0.16))',
    inputBg: 'var(--input-bg, rgba(224, 236, 244, 0.08))',
    critical: 'var(--danger-strong, #dc2626)',
    premium: 'var(--accent-purple, #8b5cf6)',
    primaryWash: 'var(--accent-primary-wash, rgba(96, 192, 240, 0.16))',
    successWash: 'var(--success-wash, rgba(16, 185, 129, 0.16))',
    warningWash: 'var(--warning-wash, rgba(198, 168, 75, 0.18))',
    dangerWash: 'var(--danger-wash, rgba(239, 68, 68, 0.18))',
    cardShadow: 'var(--card-shadow, rgba(0, 0, 0, 0.3))'
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    xxl: '3rem'
  },
  borderRadius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem'
  }
};

export const stellarGlow = keyframes`
  0% { box-shadow: 0 0 5px var(--accent-primary-wash, rgba(96, 192, 240, 0.2)); }
  50% { box-shadow: 0 0 20px var(--accent-primary-shadow, rgba(96, 192, 240, 0.36)); }
  100% { box-shadow: 0 0 5px var(--accent-primary-wash, rgba(96, 192, 240, 0.2)); }
`;

export const warningPulse = keyframes`
  0% { box-shadow: 0 0 5px var(--warning-wash, rgba(198, 168, 75, 0.2)); }
  50% { box-shadow: 0 0 15px var(--warning-shadow, rgba(198, 168, 75, 0.38)); }
  100% { box-shadow: 0 0 5px var(--warning-wash, rgba(198, 168, 75, 0.2)); }
`;

export const PermissionsContainer = styled(motion.div)`
  min-height: 100vh;
  background:
    radial-gradient(circle at 10% 0%, var(--surface-glow, rgba(96, 192, 240, 0.13)), transparent 30%),
    linear-gradient(135deg, ${permissionTheme.colors.background} 0%, var(--bg-elevated, #0a0a0f) 100%);
  padding: ${permissionTheme.spacing.lg};
  color: ${permissionTheme.colors.text};
  font-family: var(--font-ui, 'Sora', sans-serif);

  @media (max-width: 768px) {
    padding: ${permissionTheme.spacing.md};
  }
`;

export const Header = styled.div`
  background: ${permissionTheme.colors.surface};
  border-radius: ${permissionTheme.borderRadius.lg};
  padding: ${permissionTheme.spacing.xl};
  margin-bottom: ${permissionTheme.spacing.xl};
  border: 1px solid ${permissionTheme.colors.border};
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0 0 auto;
    height: 4px;
    background: linear-gradient(90deg, ${permissionTheme.colors.primary}, ${permissionTheme.colors.premium});
  }
`;

export const HeaderTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: ${permissionTheme.spacing.lg};
  margin-bottom: ${permissionTheme.spacing.lg};

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

export const TitleSection = styled.div`
  flex: 1;

  h1 {
    margin: 0 0 ${permissionTheme.spacing.sm} 0;
    font-size: 1.75rem;
    font-weight: 700;
    color: ${permissionTheme.colors.text};
    display: flex;
    align-items: center;
    gap: ${permissionTheme.spacing.sm};
  }

  p {
    margin: 0;
    color: ${permissionTheme.colors.textSecondary};
    font-size: 1rem;
  }
`;

export const HeaderActions = styled.div`
  display: flex;
  gap: ${permissionTheme.spacing.md};
  flex-wrap: wrap;
  align-items: center;
`;

export const TemplateCommandStrip = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${permissionTheme.spacing.sm};
  padding: ${permissionTheme.spacing.sm};
  border: 1px solid ${permissionTheme.colors.border};
  border-radius: ${permissionTheme.borderRadius.md};
  background: var(--surface-command, rgba(224, 236, 244, 0.06));
`;

export const TemplateSelectionCount = styled.span`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  padding: 0 ${permissionTheme.spacing.md};
  border-radius: ${permissionTheme.borderRadius.sm};
  background: ${permissionTheme.colors.inputBg};
  color: ${permissionTheme.colors.textSecondary}; font-size: 0.85rem;
  font-weight: 700;
`;

export const Button = styled(motion.button)<{ variant: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'critical' }>`
  padding: ${permissionTheme.spacing.sm} ${permissionTheme.spacing.lg};
  border-radius: ${permissionTheme.borderRadius.md};
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  border: none;
  display: flex;
  align-items: center;
  gap: ${permissionTheme.spacing.sm};
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  min-width: 120px;
  min-height: 44px;
  justify-content: center;
  background: ${props =>
    props.variant === 'primary' ? permissionTheme.colors.primary :
    props.variant === 'success' ? permissionTheme.colors.success :
    props.variant === 'warning' ? permissionTheme.colors.warning :
    props.variant === 'danger' ? permissionTheme.colors.error :
    props.variant === 'critical' ? permissionTheme.colors.critical :
    permissionTheme.colors.cardBg};
  color: ${permissionTheme.colors.text};

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px ${permissionTheme.colors.primaryWash};
  }

  &:focus-visible {
    outline: 2px solid ${permissionTheme.colors.primary};
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

export const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${permissionTheme.spacing.lg};
  margin-bottom: ${permissionTheme.spacing.xl};
`;

export const StatCard = styled(motion.div)<{ type: 'primary' | 'success' | 'warning' | 'info' | 'critical' }>`
  background: ${permissionTheme.colors.cardBg};
  border-radius: ${permissionTheme.borderRadius.lg};
  padding: ${permissionTheme.spacing.lg};
  border: 1px solid ${permissionTheme.colors.border};
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0 0 auto;
    height: 3px;
    background: ${props =>
      props.type === 'primary' ? permissionTheme.colors.primary :
      props.type === 'success' ? permissionTheme.colors.success :
      props.type === 'warning' ? permissionTheme.colors.warning :
      props.type === 'critical' ? permissionTheme.colors.critical :
      permissionTheme.colors.accent};
  }

  &:hover {
    border-color: ${permissionTheme.colors.primary};
    animation: ${stellarGlow} 2s ease-in-out infinite;
  }
`;

export const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: ${permissionTheme.colors.text};
  margin-bottom: ${permissionTheme.spacing.xs};
`;

export const StatLabel = styled.div`
  font-size: 0.9rem;
  color: ${permissionTheme.colors.textSecondary};
  display: flex;
  align-items: center;
  gap: ${permissionTheme.spacing.xs};
`;

export const LoadingSpinner = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid ${permissionTheme.colors.border};
  border-radius: 50%;
  border-top-color: ${permissionTheme.colors.text};
  animation: spin 1s ease-in-out infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

export const LoadingCenter = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
`;

export const TemplateSelector = styled.select`
  padding: ${permissionTheme.spacing.md};
  background: ${permissionTheme.colors.inputBg};
  border: 1px solid ${permissionTheme.colors.border};
  border-radius: ${permissionTheme.borderRadius.md};
  color: ${permissionTheme.colors.text};
  font-size: 0.9rem;
  min-width: 200px;
  min-height: 44px;

  &:focus-visible {
    outline: 2px solid ${permissionTheme.colors.primary};
    outline-offset: 2px;
  }

  option {
    background: ${permissionTheme.colors.surface};
    color: ${permissionTheme.colors.text};
  }
`;

export const PermissionLoadWarning = styled.div`
  background: ${permissionTheme.colors.warningWash};
  border: 1px solid ${permissionTheme.colors.warning};
  border-radius: ${permissionTheme.borderRadius.md};
  color: ${permissionTheme.colors.text};
  display: flex;
  align-items: center;
  gap: ${permissionTheme.spacing.sm};
  margin-bottom: ${permissionTheme.spacing.xl};
  padding: ${permissionTheme.spacing.md} ${permissionTheme.spacing.lg};

  strong {
    color: ${permissionTheme.colors.warning};
  }

  span {
    color: ${permissionTheme.colors.textSecondary};
  }
`;
