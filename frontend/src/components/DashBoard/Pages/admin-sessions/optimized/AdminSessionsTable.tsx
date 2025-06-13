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
 */

import React, { memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import {
  Table,
  TableBody,
  TableHead,
  TablePagination,
  TableRow,
  Paper,
  Typography,
  Stack,
  Box as MuiBox,
  IconButton,
  Tooltip
} from '@mui/material';
import { Eye, Edit, FileText } from 'lucide-react';
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

const TableContainer = styled(Paper)`
  && {
    background: rgba(30, 58, 138, 0.05);
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-radius: 12px;
    overflow: hidden;
    backdrop-filter: blur(10px);
    
    .MuiTable-root {
      min-width: 650px;
    }
  }
`;

const StyledTableHead = styled(TableHead)`
  && {
    background: rgba(30, 58, 138, 0.3);
    
    .MuiTableCell-head {
      color: #e5e7eb;
      font-weight: 600;
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid rgba(59, 130, 246, 0.3);
      padding: 1rem 0.75rem;
      
      &:first-of-type {
        padding-left: 1.5rem;
      }
      
      &:last-of-type {
        padding-right: 1.5rem;
      }
    }
  }
`;

const StyledTableCell = styled.td`
  color: white;
  padding: 1rem 0.75rem;
  border-bottom: 1px solid rgba(59, 130, 246, 0.1);
  vertical-align: middle;
  
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
    background: rgba(59, 130, 246, 0.08);
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

const StyledIconButton = styled(IconButton)<{ btncolor?: string }>`
  && {
    width: 36px;
    height: 36px;
    background: ${props => {
      switch (props.btncolor) {
        case 'primary': return 'linear-gradient(135deg, #3b82f6, #60a5fa)';
        case 'secondary': return 'linear-gradient(135deg, #8b5cf6, #a78bfa)';
        case 'success': return 'linear-gradient(135deg, #10b981, #34d399)';
        case 'error': return 'linear-gradient(135deg, #ef4444, #f87171)';
        default: return 'linear-gradient(135deg, #6b7280, #9ca3af)';
      }
    }};
    border: 1px solid ${props => {
      switch (props.btncolor) {
        case 'primary': return 'rgba(59, 130, 246, 0.4)';
        case 'secondary': return 'rgba(139, 92, 246, 0.4)';
        case 'success': return 'rgba(16, 185, 129, 0.4)';
        case 'error': return 'rgba(239, 68, 68, 0.4)';
        default: return 'rgba(107, 114, 128, 0.4)';
      }
    }};
    color: white;
    transition: all 0.3s ease;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
    
    .MuiTouchRipple-root {
      color: rgba(255, 255, 255, 0.3);
    }
  }
`;

const SessionDateTime = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const DateText = styled(Typography)`
  && {
    color: white;
    font-weight: 500;
    font-size: 0.875rem;
  }
`;

const TimeText = styled(Typography)`
  && {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.75rem;
  }
`;

const DurationChip = styled.div`
  background: rgba(59, 130, 246, 0.2);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 6px;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  color: #60a5fa;
  font-weight: 500;
  display: inline-block;
`;

const LocationText = styled(Typography)`
  && {
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.875rem;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const StyledTablePagination = styled(TablePagination)`
  && {
    color: rgba(255, 255, 255, 0.7);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(30, 58, 138, 0.1);
    
    .MuiTablePagination-selectIcon {
      color: rgba(255, 255, 255, 0.7);
    }
    
    .MuiTablePagination-displayedRows {
      color: rgba(255, 255, 255, 0.9);
      font-size: 0.85rem;
    }
    
    .MuiTablePagination-select {
      color: rgba(255, 255, 255, 0.9);
    }
    
    .MuiTablePagination-actions button {
      color: rgba(255, 255, 255, 0.7);
      
      &:disabled {
        color: rgba(255, 255, 255, 0.3);
      }
    }
    
    .MuiInputBase-root {
      color: white !important;
    }
  }
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

  const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
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

  return (
    <MuiBox>
      <TableContainer>
        <Table aria-label="sessions table" size="small">
          {/* Table Header */}
          <StyledTableHead>
            <TableRow>
              {tableHeaders.map((header) => (
                <th 
                  key={header.id}
                  style={{ 
                    minWidth: header.minWidth,
                    textAlign: header.align || 'left'
                  }}
                  className="MuiTableCell-head"
                >
                  {header.label}
                </th>
              ))}
            </TableRow>
          </StyledTableHead>

          {/* Table Body */}
          <TableBody>
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
                    <Tooltip title={session.location || 'No location specified'}>
                      <LocationText>
                        {session.location || 'N/A'}
                      </LocationText>
                    </Tooltip>
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
                  <StyledTableCell align="right">
                    <ActionButtonsContainer>
                      <Tooltip title="View Details">
                        <StyledIconButton
                          btncolor="primary"
                          onClick={() => handleViewSession(session)}
                          size="small"
                          aria-label={`View details for session ${session.id}`}
                        >
                          <Eye size={16} />
                        </StyledIconButton>
                      </Tooltip>
                      
                      <Tooltip title="Edit Session">
                        <StyledIconButton
                          btncolor="secondary"
                          onClick={() => handleEditSession(session)}
                          size="small"
                          aria-label={`Edit session ${session.id}`}
                        >
                          <Edit size={16} />
                        </StyledIconButton>
                      </Tooltip>
                    </ActionButtonsContainer>
                  </StyledTableCell>
                </StyledTableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Pagination */}
        <StyledTablePagination
          rowsPerPageOptions={[...ROWS_PER_PAGE_OPTIONS]}
          component="div"
          count={filteredSessions.length}
          rowsPerPage={pagination.rowsPerPage}
          page={pagination.page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Rows per page:"
          labelDisplayedRows={({ from, to, count }) => 
            `${from}–${to} of ${count !== -1 ? count : `more than ${to}`}`
          }
        />
      </TableContainer>
    </MuiBox>
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
