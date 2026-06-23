import styled from 'styled-components';

export const TableWrapper = styled.div`
  overflow-x: auto;
  border-radius: 12px;
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 88%, transparent);
  box-shadow: 0 4px 20px color-mix(in srgb, var(--bg-base, #0A0A0F) 28%, transparent);
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

export const Th = styled.th`
  padding: 12px 16px;
  border-bottom: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent);
  color: var(--text-secondary, #94A3B8);
  font-size: 0.8125rem;
  font-weight: 700;
  text-align: left;
  white-space: nowrap;
`;

export const Td = styled.td`
  padding: 12px 16px;
  border-bottom: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 7%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-size: 0.875rem;
  vertical-align: middle;
`;

export const EmptyTd = styled.td`
  padding: 24px 16px;
  color: var(--text-muted, #64748B);
  font-size: 1rem;
  text-align: center;
`;

export const ClientInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

export const ClientAvatar = styled.div`
  display: flex;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 22%, transparent);
  color: var(--accent-primary, #60C0F0);
  font-size: 0.8125rem;
  font-weight: 700;
`;

export const ClientName = styled.span`
  display: block;
  color: var(--text-primary, #E0ECF4);
  font-weight: 600;
`;

export const ClientUsername = styled.span`
  color: var(--text-muted, #64748B);
  font-size: 0.8125rem;
`;

export const PointsCell = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--accent-gold, #C6A84B);
  font-weight: 800;
`;

export const TierBadge = styled.span<{ $tier?: string }>`
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
  color: ${({ $tier }) => ($tier === 'gold' ? 'var(--accent-gold, #C6A84B)' : $tier === 'silver' ? 'var(--text-secondary, #94A3B8)' : $tier === 'platinum' ? 'var(--text-primary, #E0ECF4)' : 'var(--accent-secondary, #8B5CF6)')};
  font-size: 0.75rem;
  font-weight: 800;
`;

export const StreakCell = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  color: ${({ $active }) => ($active ? 'var(--accent-primary, #60C0F0)' : 'var(--text-muted, #64748B)')};
`;

export const ActionsCell = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

export const ActionBtn = styled.button<{ $variant?: 'secondary' }>`
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 40%, transparent);
  border-radius: 6px;
  background: transparent;
  color: ${({ $variant }) => ($variant === 'secondary' ? 'var(--accent-secondary, #8B5CF6)' : 'var(--accent-primary, #60C0F0)')};
  cursor: pointer;
  font-size: 0.8125rem;
  white-space: nowrap;
  transition: color 0.2s ease, border-color 0.2s ease, background-color 0.2s ease;

  &:hover {
    background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 10%, transparent);
  }
`;

export const RequirementChip = styled.span`
  display: inline-flex;
  align-items: center;
  margin-bottom: 8px;
  padding: 2px 8px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--text-primary, #E0ECF4) 8%, transparent);
  color: var(--text-secondary, #94A3B8);
  font-size: 0.75rem;
`;

export const AutoMarginWrapper = styled.div`
  margin-top: auto;
  margin-bottom: 8px;
`;

export const BadgeImage = styled.img`
  width: 36px;
  height: 36px;
  object-fit: contain;
`;

export const DialogStack = styled.div`
  display: grid;
  gap: 16px;
  margin-top: 16px;
`;

export const DetailPanel = styled.div`
  display: grid;
  gap: 8px;
  margin-top: 16px;
  padding: 16px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 24%, transparent);
`;

export const DetailText = styled.p`
  margin: 0;
  color: var(--text-secondary, #94A3B8);
  font-size: 0.875rem;
`;

export const DetailRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  color: var(--accent-gold, #C6A84B);
  font-weight: 800;
`;
