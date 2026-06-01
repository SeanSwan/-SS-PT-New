import styled from 'styled-components';
import { motion } from 'framer-motion';
import type { TagTone } from './OrientationIntakeWidget.types';

export const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
`;

export const Title = styled.h3`
  margin: 0;
  font-size: 1.05rem;
  color: var(--accent-primary, #60C0F0);
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const CountBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  border-radius: 999px;
  padding: 0 8px;
  font-size: 0.75rem;
  font-weight: 700;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 40%, transparent);
  color: var(--accent-primary, #60C0F0);
`;

export const ActionRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const Button = styled.button`
  min-height: 44px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 35%, transparent);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  font-weight: 600;

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  }

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid var(--focus-ring, #8B5CF6);
    outline-offset: 2px;
  }
`;

export const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

export const ItemRow = styled(motion.div)`
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 45%, transparent);
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

export const ItemText = styled.div`
  min-width: 0;
`;

export const Name = styled.div`
  color: var(--text-primary, #E0ECF4);
  font-size: 0.88rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const Meta = styled.div`
  color: var(--text-muted, #94A3B8);
  font-size: 0.75rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const Tag = styled.span<{ $tone?: TagTone }>`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
  border: 1px solid;
  color: ${({ $tone }) =>
    $tone === 'ok' ? 'var(--success, #22C55E)' : $tone === 'warn' ? 'var(--warning, #F59E0B)' : 'var(--text-muted, #94A3B8)'};
  border-color: ${({ $tone }) =>
    $tone === 'ok' ? 'color-mix(in srgb, var(--success, #22C55E) 45%, transparent)' : $tone === 'warn' ? 'color-mix(in srgb, var(--warning, #F59E0B) 45%, transparent)' : 'color-mix(in srgb, var(--text-muted, #94A3B8) 35%, transparent)'};
  background: ${({ $tone }) =>
    $tone === 'ok' ? 'color-mix(in srgb, var(--success, #22C55E) 12%, transparent)' : $tone === 'warn' ? 'color-mix(in srgb, var(--warning, #F59E0B) 12%, transparent)' : 'color-mix(in srgb, var(--text-muted, #94A3B8) 12%, transparent)'};
`;

export const Empty = styled.div`
  color: var(--text-muted, #94A3B8);
  font-size: 0.86rem;
  text-align: center;
  padding: 14px 0;
`;

export const AlertStrip = styled.div`
  margin-bottom: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--warning, #F59E0B) 40%, transparent);
  background: color-mix(in srgb, var(--warning, #F59E0B) 12%, transparent);
  color: var(--warning, #F59E0B);
  font-size: 0.78rem;
  font-weight: 600;
`;

export const ErrorStrip = styled.div`
  margin-bottom: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--error-border, rgba(248, 113, 113, 0.32));
  background: var(--error-bg, rgba(127, 29, 29, 0.18));
  color: var(--error-text, #fecaca);
  font-size: 0.8rem;
  font-weight: 600;
`;
