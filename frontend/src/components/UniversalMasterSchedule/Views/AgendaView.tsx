import React, { useMemo } from 'react';
import {
  getAgendaGroups,
  type AgendaSession,
} from './AgendaView.logic';
import {
  ActionButton,
  ActionRow,
  AgendaContainer,
  AgendaGroup,
  AgendaRow,
  DetailsBlock,
  EmptyState,
  GroupLabel,
  GroupList,
  RowMeta,
  RowTitle,
  StatusBadge,
  StatusBlock,
  TimeBlock,
} from './AgendaView.styles';

export type { AgendaSession } from './AgendaView.logic';

export interface AgendaViewProps {
  date: Date;
  sessions: AgendaSession[];
  isAdmin?: boolean;
  onSelectSession?: (session: AgendaSession) => void;
  onEdit?: (session: AgendaSession) => void;
  onCancel?: (session: AgendaSession) => void;
}

const AgendaView: React.FC<AgendaViewProps> = ({
  date,
  sessions,
  isAdmin = false,
  onSelectSession,
  onEdit,
  onCancel
}) => {
  const grouped = useMemo(
    () => getAgendaGroups(date, sessions, isAdmin),
    [date, sessions, isAdmin]
  );

  return (
    <AgendaContainer>
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
                    {session.trainerName || 'Trainer TBD'} - {session.location || 'Main Studio'}
                  </RowMeta>
                </DetailsBlock>
                <StatusBlock>
                  <StatusBadge $status={session.isBlocked ? 'blocked' : session.status || 'scheduled'}>
                    {session.isBlocked ? 'Blocked' : session.status || 'Scheduled'}
                  </StatusBadge>
                  {session.status !== 'cancelled' && session.status !== 'completed' && (
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
                  )}
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
