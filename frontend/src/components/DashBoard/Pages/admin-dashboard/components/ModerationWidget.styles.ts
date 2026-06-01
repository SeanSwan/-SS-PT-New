import styled from 'styled-components';
import { motion } from 'framer-motion';

export const MODERATION_COLORS = {
  primary: 'var(--accent-primary, #60C0F0)',
  secondary: 'var(--accent-secondary, #8B5CF6)',
  warning: 'var(--warning, #F59E0B)',
  success: 'var(--success, #10B981)',
  error: 'var(--error, #EF4444)',
  muted: 'var(--text-muted, #94A3B8)',
  textPrimary: 'var(--text-primary, #E0ECF4)',
  textSecondary: 'var(--text-secondary, #B6C2CC)',
};

export const ModPanel = styled.div`
  background: color-mix(in srgb, var(--midnight-sapphire, #002060) 60%, transparent);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 10%, transparent);
  box-shadow:
    0 8px 32px color-mix(in srgb, var(--obsidian-black, #0A0A0F) 40%, transparent),
    inset 0 1px 0 color-mix(in srgb, var(--text-primary, #E0ECF4) 5%, transparent);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 1.5rem;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent), transparent);
  }
`;

export const ModHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`;

export const ModHeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const ModTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: ${MODERATION_COLORS.textPrimary};
  margin: 0;
`;

export const ModBadge = styled.span`
  background: ${MODERATION_COLORS.error};
  color: ${MODERATION_COLORS.textPrimary};
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 12px;
  min-width: 20px;
  text-align: center;
`;

export const ModViewAll = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  color: ${MODERATION_COLORS.primary};
  font-size: 0.8125rem;
  cursor: pointer;
  padding: 10px 14px;
  min-height: 44px;
  border-radius: 8px;
  transition: background 0.2s;

  &:hover { background: color-mix(in srgb, ${MODERATION_COLORS.secondary} 10%, transparent); }
  &:focus-visible { outline: 2px solid ${MODERATION_COLORS.secondary}; outline-offset: 2px; }
`;

export const ModStats = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`;

export const ModStat = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
  color: ${MODERATION_COLORS.textSecondary};
`;

export const ModStatIcon = styled.span<{ $color: string }>`
  display: flex;
  color: ${p => p.$color};
`;

export const ModEmpty = styled.div`
  text-align: center;
  padding: 24px;
  color: ${MODERATION_COLORS.muted};
  font-size: 0.875rem;
`;

export const ModError = styled.div`
  padding: 12px 14px;
  margin-bottom: 16px;
  border: 1px solid color-mix(in srgb, var(--error, #EF4444) 28%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, var(--error, #EF4444) 18%, transparent);
  color: var(--error-text, #FECACA);
  font-size: 0.875rem;
`;

export const ModQueue = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const ModItem = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: color-mix(in srgb, var(--text-primary, #E0ECF4) 2%, transparent);
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 4%, transparent);
  transition: background 0.2s ease, border-color 0.2s ease;

  &:hover {
    background: color-mix(in srgb, var(--text-primary, #E0ECF4) 4%, transparent);
    border-color: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent);
  }
`;

export const ModItemContent = styled.div`
  flex: 1;
  min-width: 0;
  margin-right: 12px;
`;

export const ModItemAuthor = styled.div`
  font-size: 0.8125rem;
  font-weight: 500;
  color: ${MODERATION_COLORS.textPrimary};
`;

export const ModItemText = styled.div`
  font-size: 0.8125rem;
  color: ${MODERATION_COLORS.muted};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const ModActions = styled.div`
  display: flex;
  gap: 4px;
  flex-shrink: 0;
`;

export const ModActionBtn = styled.button<{ $color: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: ${p => p.$color};
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    background: color-mix(in srgb, ${p => p.$color} 15%, transparent);
    border-color: color-mix(in srgb, ${p => p.$color} 30%, transparent);
    box-shadow: 0 0 12px color-mix(in srgb, ${p => p.$color} 20%, transparent);
    transform: translateY(-1px);
  }

  &:active { transform: translateY(1px); }
  &:focus-visible { outline: 2px solid ${MODERATION_COLORS.secondary}; outline-offset: 2px; }
`;
