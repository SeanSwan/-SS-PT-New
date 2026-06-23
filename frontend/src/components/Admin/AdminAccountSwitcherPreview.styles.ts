import styled from 'styled-components';

export const TargetPreview = styled.div<{ $empty: boolean }>`
  min-height: 74px;
  display: grid;
  grid-template-columns: ${({ $empty }) => ($empty ? '1fr' : '44px minmax(0, 1fr)')};
  gap: 0.75rem;
  align-items: center;
  padding: 0.75rem;
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.22));
  border-radius: 8px;
  background: rgba(10, 10, 15, 0.48);
`;

export const TargetAvatar = styled.div`
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--button-primary, #002060);
  color: var(--text-on-accent, #ffffff);
  font-weight: 900;
`;

export const TargetMeta = styled.div`
  min-width: 0;
`;

export const TargetTitle = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;

  strong {
    font-size: 0.95rem;
    overflow-wrap: anywhere;
  }
`;

export const RoleBadge = styled.span`
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--border-accent, rgba(96, 192, 240, 0.3));
  border-radius: 999px;
  padding: 0 0.55rem;
  color: var(--accent-primary, #60c0f0);
  font-size: 0.72rem;
  font-weight: 900;
  text-transform: uppercase;
`;

export const MetaGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.45rem;
`;

export const MetaChip = styled.span`
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  border-radius: 8px;
  background: rgba(224, 236, 244, 0.08);
  color: var(--text-secondary, rgba(224, 236, 244, 0.74));
  padding: 0 0.55rem;
  font-size: 0.76rem;
  font-weight: 800;
  overflow-wrap: anywhere;
`;

export const EmptyPreview = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.58));
  font-size: 0.86rem;
`;

export const StatusLine = styled.p<{ $error: boolean }>`
  min-height: 22px;
  margin: 0;
  color: ${({ $error }) => ($error ? 'var(--status-error, #fca5a5)' : 'var(--text-secondary, rgba(224, 236, 244, 0.72))')};
  font-size: 0.82rem;
  line-height: 1.4;
`;
