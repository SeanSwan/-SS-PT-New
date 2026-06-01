import React from 'react';
import { motion } from 'framer-motion';
import { Edit, Eye, Trash2 } from 'lucide-react';

import { getClientSessionSignal } from '../../workspaces/clients-team/clientSessionSignal';
import type { Session } from './ViewSessionModal.types';
import { staggeredItemVariants } from './AdminSessionsTheme.styles';
import { ChipContainer, IconButtonContainer, StyledIconButton } from './AdminSessionsStatus.styles';
import {
  ActionsBodyCell,
  AvatarCircle,
  CellPrimaryText,
  CellSecondaryText,
  CheckboxBodyCell,
  CheckboxWrapper,
  FlexRow,
  HiddenCheckbox,
  MutedText,
  SessionCountChip,
} from './AdminSessionsTable.styles';
import { StyledTableCell, StyledTableRow } from './AdminSessionsTableBase.styles';

interface AdminSessionsTableRowProps {
  session: Session;
  index: number;
  selectedIds: string[];
  formatDate: (dateString: string | null | undefined) => string;
  formatTime: (dateString: string | null | undefined) => string;
  onSelectOne: (id: string) => void;
  onViewSession: (session: Session) => void;
  onEditSession: (session: Session) => void;
  onDeleteSession: (session: Session) => void;
}

const AdminSessionsTableRow: React.FC<AdminSessionsTableRowProps> = ({
  session,
  index,
  selectedIds,
  formatDate,
  formatTime,
  onSelectOne,
  onViewSession,
  onEditSession,
  onDeleteSession,
}) => {
  const clientSessionSignal = session.client ? getClientSessionSignal(session.client) : null;
  const isSelected = selectedIds.indexOf(session.id) !== -1;

  return (
    <StyledTableRow
      as={motion.tr}
      custom={index}
      variants={staggeredItemVariants}
      initial="hidden"
      animate="visible"
      layout
    >
      <CheckboxBodyCell>
        <CheckboxWrapper htmlFor={`session-select-${session.id}`} $checked={isSelected}>
          <HiddenCheckbox
            id={`session-select-${session.id}`}
            checked={isSelected}
            onChange={() => onSelectOne(session.id)}
            aria-label={`select session ${session.id}`}
          />
        </CheckboxWrapper>
      </CheckboxBodyCell>

      <StyledTableCell>
        {session.client ? (
          <FlexRow $gap="0.5rem">
            <AvatarCircle $size={32}>
              {session.client.photo
                ? <img src={session.client.photo} alt={`${session.client.firstName} ${session.client.lastName}`} />
                : <>{session.client.firstName?.[0]}{session.client.lastName?.[0]}</>
              }
            </AvatarCircle>
            <div>
              <CellPrimaryText>{session.client.firstName} {session.client.lastName}</CellPrimaryText>
              <SessionCountChip
                $hasAvailable={clientSessionSignal?.tone === 'gold'}
                title={clientSessionSignal?.note}
              >
                {clientSessionSignal?.label}
              </SessionCountChip>
            </div>
          </FlexRow>
        ) : (
          <MutedText>{session.status === 'available' ? 'Available Slot' : 'No Client'}</MutedText>
        )}
      </StyledTableCell>

      <StyledTableCell>
        {session.trainer ? (
          <FlexRow $gap="0.5rem">
            <AvatarCircle $size={32}>
              {session.trainer.photo
                ? <img src={session.trainer.photo} alt={`${session.trainer.firstName} ${session.trainer.lastName}`} />
                : <>{session.trainer.firstName?.[0]}{session.trainer.lastName?.[0]}</>
              }
            </AvatarCircle>
            <CellPrimaryText>{session.trainer.firstName} {session.trainer.lastName}</CellPrimaryText>
          </FlexRow>
        ) : (
          <MutedText>Unassigned</MutedText>
        )}
      </StyledTableCell>

      <StyledTableCell>
        <CellPrimaryText>{formatDate(session.sessionDate)}</CellPrimaryText>
        <CellSecondaryText>{formatTime(session.sessionDate)}</CellSecondaryText>
      </StyledTableCell>
      <StyledTableCell>{session.location || 'N/A'}</StyledTableCell>
      <StyledTableCell>{session.duration || 'N/A'} min</StyledTableCell>
      <StyledTableCell>
        <ChipContainer chipstatus={session.status}>
          {session.status ? session.status.charAt(0).toUpperCase() + session.status.slice(1) : 'Unknown'}
        </ChipContainer>
      </StyledTableCell>
      <ActionsBodyCell>
        <IconButtonContainer>
          <StyledIconButton
            type="button"
            btncolor="primary"
            onClick={() => onViewSession(session)}
            aria-label="View session details"
            title="View Details"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <Eye size={16} />
          </StyledIconButton>
          <StyledIconButton
            type="button"
            btncolor="secondary"
            onClick={() => onEditSession(session)}
            aria-label="Edit session"
            title="Edit Session"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <Edit size={16} />
          </StyledIconButton>
          <StyledIconButton
            type="button"
            btncolor="error"
            onClick={() => onDeleteSession(session)}
            aria-label="Delete session"
            title="Delete Session"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <Trash2 size={16} />
          </StyledIconButton>
        </IconButtonContainer>
      </ActionsBodyCell>
    </StyledTableRow>
  );
};

export default AdminSessionsTableRow;
