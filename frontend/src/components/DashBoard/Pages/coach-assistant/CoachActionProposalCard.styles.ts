/**
 * CoachActionProposalCard.styles.ts
 * =================================
 * Styled-components surface for deterministic Swan Coach proposal cards.
 */
import styled from 'styled-components';
import { Link } from 'react-router-dom';

export const Card = styled.div`
  margin-top: 12px;
  padding: 14px 16px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent);
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 92%, var(--accent-primary, #60C0F0));
`;

export const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--accent-primary, #60C0F0);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 800;
  margin-bottom: 10px;
`;

export const Row = styled.div`
  display: flex;
  gap: 10px;
  padding: 4px 0;
  font-family: 'Fira Code', monospace;
  font-size: 12px;
`;

export const Label = styled.span`
  color: var(--text-muted, rgba(224, 236, 244, 0.52));
  min-width: 104px;
`;

export const Value = styled.span`
  color: var(--text-primary, #E0ECF4);
  font-weight: 650;
  word-break: break-word;
`;

export const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
`;

export const DetailPanel = styled.div`
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-base, #030712) 58%, var(--accent-secondary, #8B5CF6));
`;

export const ActionButton = styled.button<{ $danger?: boolean }>`
  min-height: 44px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid ${({ $danger }) => (
    $danger
      ? 'color-mix(in srgb, var(--error, #C92A54) 42%, transparent)'
      : 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 42%, transparent)'
  )};
  background: ${({ $danger }) => (
    $danger
      ? 'color-mix(in srgb, var(--error, #C92A54) 16%, var(--bg-surface, #1A1A24))'
      : 'linear-gradient(135deg, var(--accent-secondary, #8B5CF6), var(--primary, #002060))'
  )};
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 800;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.62;
  }
`;

export const ActionLink = styled(Link)`
  min-height: 44px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 42%, transparent);
  background: linear-gradient(135deg, var(--primary, #002060), var(--accent-secondary, #8B5CF6));
  color: var(--text-primary, #E0ECF4);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 800;
`;

export const ActionAnchor = styled.a`
  min-height: 44px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 42%, transparent);
  background: linear-gradient(135deg, var(--primary, #002060), var(--accent-secondary, #8B5CF6));
  color: var(--text-primary, #E0ECF4);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 800;
`;
export const StatusText = styled.div<{ $error?: boolean }>`
  margin-top: 10px;
  color: ${({ $error }) => ($error ? 'var(--error, #C92A54)' : 'var(--accent-primary, #60C0F0)')};
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
`;
