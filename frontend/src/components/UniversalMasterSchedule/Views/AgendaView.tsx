import React, { useMemo } from 'react';
import styled from 'styled-components';
import { galaxySwanTheme } from '../../../styles/galaxy-swan-theme';
import { SessionCardData } from '../Cards/SessionCard';

export interface AgendaSession extends SessionCardData {
  trainerName?: string;
  clientName?: string;
}

export interface AgendaViewProps {
  date: Date;
  sessions: AgendaSession[];
  onSelectSession?: (session: AgendaSession) => void;
  onEdit?: (session: AgendaSession) => void;
  onCancel?: (session: AgendaSession) => void;
  onLoadMore?: () => void;
}

const formatGroupLabel = (target: Date) => {
  const today = new Date();
  const oneDay = 24 * 60 * 60 * 1000;
  const diff = Math.floor((stripTime(target).getTime() - stripTime(today).getTime()) / oneDay);

  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';

  return target.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });
};

const stripTime = (value: Date) =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate());

const AgendaView: React.FC<AgendaViewProps> = ({
  sessions,
  onSelectSession,
  onEdit,
  onCancel,
  onLoadMore
}) => {
  const grouped = useMemo(() => {
    const map = new Map<string, AgendaSession[]>();
    const sorted = [...sessions].sort((a, b) => {
      return new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime();
    });

    sorted.forEach((session) => {
      const date = new Date(session.sessionDate);
      const key = date.toISOString().slice(0, 10);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)?.push(session);
    });

    return Array.from(map.entries()).map(([key, list]) => ({
      key,
      label: formatGroupLabel(new Date(key)),
      sessions: list
    }));
  }, [sessions]);

  return (
    <AgendaContainer
      onScroll={(event) => {
        if (!onLoadMore) {
          return;
        }
        const target = event.currentTarget;
        if (target.scrollTop + target.clientHeight >= target.scrollHeight - 60) {
          onLoadMore();
        }
      }}
    >
      {grouped.length === 0 && (
        <EmptyState>No sessions scheduled yet.</EmptyState>
      )}

      {grouped.map((group) => (
        <AgendaGroup key={group.key}>
          <GroupLabel>{group.label}</GroupLabel>
          <GroupList>
            {group.sessions.map((session) => (
              <AgendaRow
                key={String(session.id)}
                onClick={() => onSelectSession?.(session)}
              >
                <TimeBlock>
                  {new Date(session.sessionDate).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </TimeBlock>
                <DetailsBlock>
                  <RowTitle>
                    {session.clientName || 'Open Slot'}
                  </RowTitle>
                  <RowMeta>
                    {session.trainerName || 'Trainer TBD'} · {session.location || 'Main Studio'}
                  </RowMeta>
                </DetailsBlock>
                <StatusBlock>
                  <StatusBadge $status={session.isBlocked ? 'blocked' : session.status || 'scheduled'}>
                    {session.isBlocked ? 'Blocked' : session.status || 'Scheduled'}
                  </StatusBadge>
                  <ActionRow>
                    {onEdit && (
                      <ActionButton type="button" onClick={(event) => {
                        event.stopPropagation();
                        onEdit(session);
                      }}>
                        Edit
                      </ActionButton>
                    )}
                    {onCancel && (
                      <ActionButton type="button" onClick={(event) => {
                        event.stopPropagation();
                        onCancel(session);
                      }}>
                        Cancel
                      </ActionButton>
                    )}
                  </ActionRow>
                </StatusBlock>
              </AgendaRow>
            ))}
          </GroupList>
        </AgendaGroup>
      ))}
    </AgendaContainer>
  );
};

export default AgendaView;

const AgendaContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-height: 620px;
  overflow-y: auto;
  padding-right: 0.5rem;
  -webkit-overflow-scrolling: touch;

  /* P1-5: Prevent nested scroll on mobile - let parent container scroll */
  @media (max-width: 768px) {
    gap: 1.25rem;
    max-height: none;
    overflow-y: visible; /* Disable inner scroll, use parent scroll */
    padding-right: 0;
  }

  @media (max-width: 480px) {
    gap: 1rem;
  }
`;

const AgendaGroup = styled.section`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const GroupLabel = styled.div`
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: ${galaxySwanTheme.text.secondary};

  @media (max-width: 768px) {
    font-size: 0.8rem;
    letter-spacing: 0.08em;
  }

  @media (max-width: 480px) {
    font-size: 0.75rem;
  }
`;

const GroupList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const AgendaRow = styled.div`
  display: grid;
  grid-template-columns: 90px 1fr 180px;
  gap: 1rem;
  padding: 0.9rem 1rem;
  border-radius: 14px;
  background: ${galaxySwanTheme.background.surface};
  border: 1px solid ${galaxySwanTheme.borders.elegant};
  transition: all 150ms ease-out;
  cursor: pointer;

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${galaxySwanTheme.shadows.primaryGlow};
  }

  &:active {
    transform: scale(0.99);
  }

  &:focus-visible {
    outline: 2px solid ${galaxySwanTheme.primary.main};
    outline-offset: 2px;
  }

  /* Tablet */
  @media (max-width: 1024px) {
    grid-template-columns: 80px 1fr 150px;
    gap: 0.75rem;
    padding: 0.75rem;
    border-radius: 12px;
  }

  /* Mobile */
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 0.5rem;
    padding: 0.75rem;
  }

  @media (max-width: 480px) {
    padding: 0.625rem;
    border-radius: 10px;
  }
`;

const TimeBlock = styled.div`
  font-weight: 600;
  color: ${galaxySwanTheme.primary.main};
  font-size: 0.95rem;
`;

const DetailsBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const RowTitle = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: ${galaxySwanTheme.text.primary};
`;

const RowMeta = styled.div`
  font-size: 0.8rem;
  color: ${galaxySwanTheme.text.secondary};
`;

const StatusBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: flex-end;
  justify-content: center;

  @media (max-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
`;

const StatusBadge = styled.div<{ $status: string }>`
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  background: ${({ $status }) => {
    if ($status === 'blocked') return 'rgba(120, 81, 169, 0.35)';
    if ($status === 'confirmed') return 'rgba(0, 255, 136, 0.2)';
    if ($status === 'completed') return 'rgba(148, 163, 184, 0.2)';
    if ($status === 'cancelled') return 'rgba(255, 71, 87, 0.2)';
    return 'rgba(0, 255, 255, 0.2)';
  }};
  color: ${galaxySwanTheme.text.primary};
  border: 1px solid ${galaxySwanTheme.borders.elegant};
`;

const ActionRow = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ActionButton = styled.button`
  border: 1px solid ${galaxySwanTheme.borders.elegant};
  background: transparent;
  color: ${galaxySwanTheme.text.primary};
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 150ms ease-out;
  min-height: 32px;

  &:hover {
    border-color: ${galaxySwanTheme.primary.main};
    box-shadow: ${galaxySwanTheme.shadows.primaryGlow};
  }

  &:active {
    transform: scale(0.96);
  }

  &:focus-visible {
    outline: 2px solid ${galaxySwanTheme.primary.main};
    outline-offset: 2px;
  }

  @media (max-width: 480px) {
    min-height: 36px;
    padding: 0.35rem 0.75rem;
    font-size: 0.75rem;
  }
`;

const EmptyState = styled.div`
  padding: 2rem;
  border-radius: 16px;
  border: 1px dashed ${galaxySwanTheme.borders.elegant};
  text-align: center;
  color: ${galaxySwanTheme.text.secondary};
`;
