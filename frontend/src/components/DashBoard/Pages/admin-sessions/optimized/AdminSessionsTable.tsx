/**
 * AdminSessionsTable.tsx
 * =======================
 *
 * Table view component for Admin Sessions with pagination and actions
 * Part of the Admin Sessions optimization following proven Trainer Dashboard methodology
 *
 * Features:
 * - Responsive table with optimized rendering
 * - Pagination with customizable rows per page
 * - Row actions (view, edit) with hover effects
 * - Loading and error states
 * - Empty state handling
 * - Performance-optimized with virtualization considerations
 * - WCAG AA accessibility compliance
 * - Mobile-responsive design
 *
 * Migrated from MUI to styled-components + lucide-react (Galaxy-Swan theme)
 */

import React, { memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { Eye, Edit, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  AdminSessionsTableProps,
  Session,
  ROWS_PER_PAGE_OPTIONS
} from './AdminSessionsTypes';
import {
  ClientDisplay,
  TrainerDisplay,
  StatusChip,
  LoadingState,
  ErrorState,
  EmptyState,
  formatSessionTime,
  listItemVariants
} from './AdminSessionsSharedComponents';

// ===== STYLED COMPONENTS =====

const TableContainer = styled.div`
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 12px;
  overflow: hidden;
  backdrop-filter: blur(10px);
`;

const StyledTable = styled.table`
  width: 100%;
  min-width: 650px;
  border-collapse: collapse;
`;

const StyledTableHead = styled.thead`
  background: rgba(30, 58, 138, 0.3);
`;

const StyledHeadCell = styled.th`
  color: #e2e8f0;
  font-weight: 600;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid rgba(14, 165, 233, 0.3);
  padding: 1rem 0.75rem;
  text-align: left;

  &:first-of-type {
    padding-left: 1.5rem;
  }

  &:last-of-type {
    padding-right: 1.5rem;
  }
`;

const StyledTableCell = styled.td<{ $align?: string }>`
  color: #e2e8f0;
  padding: 1rem 0.75rem;
  border-bottom: 1px solid rgba(14, 165, 233, 0.1);
  vertical-align: middle;
  text-align: ${props => props.$align || 'left'};

  &:first-of-type {
    padding-left: 1.5rem;
  }

  &:last-of-type {
    padding-right: 1.5rem;
  }
`;

const StyledTableRow = styled(motion.tr)`
  transition: all 0.3s ease;

  &:hover {
    background: rgba(14, 165, 233, 0.08);
    transform: translateX(2px);
  }

  &:last-of-type {
    ${StyledTableCell} {
      border-bottom: none;
    }
  }
`;

const ActionButtonsContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  justify-content: flex-end;
`;

const StyledIconButton = styled.button<{ $btncolor?: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid ${props => {
    switch (props.$btncolor) {
      case 'primary': return 'rgba(14, 165, 233, 0.4)';
      case 'secondary': return 'rgba(139, 92, 246, 0.4)';
      case 'success': return 'rgba(16, 185, 129, 0.4)';
      case 'error': return 'rgba(239, 68, 68, 0.4)';
      default: return 'rgba(107, 114, 128, 0.4)';
    }
  }};
  background: ${props => {
    switch (props.$btncolor) {
      case 'primary': return 'linear-gradient(135deg, #0ea5e9, #38bdf8)';
      case 'secondary': return 'linear-gradient(135deg, #8b5cf6, #a78bfa)';
      case 'success': return 'linear-gradient(135deg, #10b981, #34d399)';
      case 'error': return 'linear-gradient(135deg, #ef4444, #f87171)';
      default: return 'linear-gradient(135deg, #6b7280, #9ca3af)';
    }
  }};
  color: white;
  cursor: pointer;
  padding: 0;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  &:focus-visible {
    outline: 2px solid #0ea5e9;
    outline-offset: 2px;
  }
`;

const SessionDateTime = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const DateText = styled.span`
  color: #e2e8f0;
  font-weight: 500;
  font-size: 0.875rem;
`;

const TimeText = styled.span`
  color: rgba(226, 232, 240, 0.7);
  font-size: 0.75rem;
`;

const DurationChip = styled.div`
  background: rgba(14, 165, 233, 0.2);
  border: 1px solid rgba(14, 165, 233, 0.3);
  border-radius: 6px;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  color: #38bdf8;
  font-weight: 500;
  display: inline-block;
`;

const LocationText = styled.span`
  color: rgba(226, 232, 240, 0.8);
  font-size: 0.875rem;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
`;

const PaginationWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 1rem;
  padding: 0.75rem 1.5rem;
  color: rgba(226, 232, 240, 0.7);
  border-top: 1px solid rgba(226, 232, 240, 0.1);
  background: rgba(30, 58, 138, 0.1);
  font-size: 0.85rem;
  flex-wrap: wrap;

  @media (max-width: 600px) {
    justify-content: center;
  }
`;

const PaginationLabel = styled.span`
  color: rgba(226, 232, 240, 0.7);
  font-size: 0.85rem;
`;

const PaginationSelect = styled.select`
  background: rgba(15, 23, 42, 0.8);
  color: #e2e8f0;
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 6px;
  padding: 0.25rem 0.5rem;
  font-size: 0.85rem;
  cursor: pointer;
  min-height: 44px;
  min-width: 44px;

  &:focus-visible {
    outline: 2px solid #0ea5e9;
    outline-offset: 2px;
  }
`;

const PaginationDisplayedRows = styled.span`
  color: rgba(226, 232, 240, 0.9);
  font-size: 0.85rem;
`;

const PaginationButton = styled.button<{ $disabled?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: ${props => props.$disabled ? 'rgba(226, 232, 240, 0.3)' : 'rgba(226, 232, 240, 0.7)'};
  cursor: ${props => props.$disabled ? 'default' : 'pointer'};
  padding: 0;
  transition: background 0.2s ease;

  &:hover:not(:disabled) {
    background: rgba(14, 165, 233, 0.1);
  }

  &:focus-visible {
    outline: 2px solid #0ea5e9;
    outline-offset: 2px;
  }

  &:disabled {
    color: rgba(226, 232, 240, 0.3);
    cursor: default;
  }
`;

const TableOverflowWrapper = styled.div`
  overflow-x: auto;
`;

// ===== HEADER CELLS CONFIGURATION =====

const tableHeaders = [
  { id: 'client', label: 'Client', minWidth: 200 },
  { id: 'trainer', label: 'Trainer', minWidth: 180 },
  { id: 'datetime', label: 'Date & Time', minWidth: 160 },
  { id: 'location', label: 'Location', minWidth: 120 },
  { id: 'duration', label: 'Duration', minWidth: 100 },
  { id: 'status', label: 'Status', minWidth: 120 },
  { id: 'actions', label: 'Actions', minWidth: 120, align: 'right' as const }
];

// ===== MAIN COMPONENT =====

const AdminSessionsTable: React.FC<AdminSessionsTableProps> = ({
  sessions,
  filteredSessions,
  loading,
  error,
  pagination,
  onPaginationChange,
  onViewSession,
  onEditSession,
  onRefresh
}) => {
  // Handle pagination change
  const handleChangePage = useCallback((event: unknown, newPage: number) => {
    onPaginationChange('page', newPage);
  }, [onPaginationChange]);

  const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    onPaginationChange('rowsPerPage', newRowsPerPage);
    onPaginationChange('page', 0);
  }, [onPaginationChange]);

  // Handle row actions
  const handleViewSession = useCallback((session: Session) => {
    onViewSession(session);
  }, [onViewSession]);

  const handleEditSession = useCallback((session: Session) => {
    onEditSession(session);
  }, [onEditSession]);

  // Render loading state
  if (loading) {
    return (
      <TableContainer>
        <LoadingState
          message="Loading sessions..."
          subMessage="Fetching latest session data"
        />
      </TableContainer>
    );
  }

  // Render error state
  if (error) {
    return (
      <TableContainer>
        <ErrorState
          error={error}
          onRetry={onRefresh}
          retryLabel="Reload Sessions"
        />
      </TableContainer>
    );
  }

  // Render empty state
  if (filteredSessions.length === 0) {
    return (
      <TableContainer>
        <EmptyState
          icon="📅"
          title="No sessions found"
          description="No sessions match your current filter criteria. Try adjusting your search or filters."
        />
      </TableContainer>
    );
  }

  // Calculate paginated sessions
  const paginatedSessions = filteredSessions.slice(
    pagination.page * pagination.rowsPerPage,
    pagination.page * pagination.rowsPerPage + pagination.rowsPerPage
  );

  // Pagination display values
  const from = pagination.page * pagination.rowsPerPage + 1;
  const to = Math.min((pagination.page + 1) * pagination.rowsPerPage, filteredSessions.length);
  const count = filteredSessions.length;

  return (
    <div>
      <TableContainer>
        <TableOverflowWrapper>
          <StyledTable aria-label="sessions table">
            {/* Table Header */}
            <StyledTableHead>
              <tr>
                {tableHeaders.map((header) => (
                  <StyledHeadCell
                    key={header.id}
                    style={{
                      minWidth: header.minWidth,
                      textAlign: header.align || 'left'
                    }}
                  >
                    {header.label}
                  </StyledHeadCell>
                ))}
              </tr>
            </StyledTableHead>

            {/* Table Body */}
            <tbody>
              {paginatedSessions.map((session, index) => {
                const { date, time } = formatSessionTime(session.sessionDate);

                return (
                  <StyledTableRow
                    key={session.id || `session-${index}`}
                    variants={listItemVariants}
                    custom={index}
                    initial="hidden"
                    animate="visible"
                    layout
                  >
                    {/* Client Cell */}
                    <StyledTableCell>
                      <ClientDisplay
                        client={session.client}
                        showSessionCount={true}
                        compact={true}
                      />
                    </StyledTableCell>

                    {/* Trainer Cell */}
                    <StyledTableCell>
                      <TrainerDisplay
                        trainer={session.trainer}
                        compact={true}
                      />
                    </StyledTableCell>

                    {/* Date & Time Cell */}
                    <StyledTableCell>
                      <SessionDateTime>
                        <DateText>{date}</DateText>
                        <TimeText>{time}</TimeText>
                      </SessionDateTime>
                    </StyledTableCell>

                    {/* Location Cell */}
                    <StyledTableCell>
                      <LocationText title={session.location || 'No location specified'}>
                        {session.location || 'N/A'}
                      </LocationText>
                    </StyledTableCell>

                    {/* Duration Cell */}
                    <StyledTableCell>
                      <DurationChip>
                        {session.duration || 60} min
                      </DurationChip>
                    </StyledTableCell>

                    {/* Status Cell */}
                    <StyledTableCell>
                      <StatusChip status={session.status} />
                    </StyledTableCell>

                    {/* Actions Cell */}
                    <StyledTableCell $align="right">
                      <ActionButtonsContainer>
                        <StyledIconButton
                          $btncolor="primary"
                          onClick={() => handleViewSession(session)}
                          aria-label={`View details for session ${session.id}`}
                          title="View Details"
                        >
                          <Eye size={16} />
                        </StyledIconButton>

                        <StyledIconButton
                          $btncolor="secondary"
                          onClick={() => handleEditSession(session)}
                          aria-label={`Edit session ${session.id}`}
                          title="Edit Session"
                        >
                          <Edit size={16} />
                        </StyledIconButton>
                      </ActionButtonsContainer>
                    </StyledTableCell>
                  </StyledTableRow>
                );
              })}
            </tbody>
          </StyledTable>
        </TableOverflowWrapper>

        {/* Pagination */}
        <PaginationWrapper>
          <PaginationLabel>Rows per page:</PaginationLabel>
          <PaginationSelect
            value={pagination.rowsPerPage}
            onChange={handleChangeRowsPerPage}
            aria-label="Rows per page"
          >
            {[...ROWS_PER_PAGE_OPTIONS].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </PaginationSelect>
          <PaginationDisplayedRows>
            {from}&ndash;{to} of {count !== -1 ? count : `more than ${to}`}
          </PaginationDisplayedRows>
          <PaginationButton
            onClick={(e) => handleChangePage(e, pagination.page - 1)}
            disabled={pagination.page === 0}
            $disabled={pagination.page === 0}
            aria-label="Previous page"
          >
            <ChevronLeft size={20} />
          </PaginationButton>
          <PaginationButton
            onClick={(e) => handleChangePage(e, pagination.page + 1)}
            disabled={to >= count}
            $disabled={to >= count}
            aria-label="Next page"
          >
            <ChevronRight size={20} />
          </PaginationButton>
        </PaginationWrapper>
      </TableContainer>
    </div>
  );
};

// ===== PERFORMANCE OPTIMIZATION =====

export default memo(AdminSessionsTable);

// ===== UTILITY FUNCTIONS =====

export const getTableAriaLabel = (
  sessionCount: number,
  currentPage: number,
  rowsPerPage: number
): string => {
  const start = currentPage * rowsPerPage + 1;
  const end = Math.min((currentPage + 1) * rowsPerPage, sessionCount);

  return `Sessions table showing ${start} to ${end} of ${sessionCount} sessions`;
};

export const validateTableData = (sessions: Session[]): boolean => {
  return Array.isArray(sessions) && sessions.every(session =>
    session &&
    typeof session.id === 'string' &&
    typeof session.sessionDate === 'string' &&
    typeof session.status === 'string'
  );
};

// ===== ACCESSIBILITY HELPERS =====

export const getRowAriaLabel = (session: Session): string => {
  const clientName = session.client
    ? `${session.client.firstName} ${session.client.lastName}`
    : 'No client';
  const trainerName = session.trainer
    ? `${session.trainer.firstName} ${session.trainer.lastName}`
    : 'No trainer';
  const { date, time } = formatSessionTime(session.sessionDate);

  return `Session with ${clientName}, trainer ${trainerName}, on ${date} at ${time}, status ${session.status}`;
};

// ===== KEYBOARD NAVIGATION =====

export const handleTableKeyNavigation = (
  event: React.KeyboardEvent,
  sessionId: string,
  onViewSession: (session: Session) => void,
  onEditSession: (session: Session) => void,
  session: Session
) => {
  switch (event.key) {
    case 'Enter':
    case ' ':
      event.preventDefault();
      onViewSession(session);
      break;
    case 'e':
    case 'E':
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        onEditSession(session);
      }
      break;
  }
};
