import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { ArrowDown, ArrowUp, Calendar, ChevronLeft, ChevronRight, Download, Plus, Trash2 } from 'lucide-react';
import GlowButton from '../../../ui/buttons/GlowButton';
import type { Session } from './ViewSessionModal.types';
import AdminSessionsTableRow from './AdminSessionsTableRow';
import { adminSessionRowItems } from './AdminSessionsRowIdentity';
import {
  LoadingContainer,
  LoadingSpinner,
  EmptyStateContainer,
  EmptyStateIcon,
  EmptyStateText,
} from './AdminSessionsStatus.styles';
import {
  ActionsCell,
  BulkActionsBar,
  BulkSelectedText,
  CheckboxCell,
  CheckboxWrapper,
  FlexRow,
  HiddenCheckbox,
  NativeTable,
  NativeTableBody,
  NativeTableHead,
  PaginationButton,
  PaginationContainer,
  SortableHeaderCell,
} from './AdminSessionsTable.styles';
import { StyledTableContainer, StyledTableHead, StyledTableCell, StyledTableRow } from './AdminSessionsTableBase.styles';
import { FooterActionsContainer } from './AdminSessionsStatus.styles';

export type AdminSessionsSortKey = 'client' | 'trainer' | 'sessionDate' | 'location' | 'duration' | 'status';

interface AdminSessionsTablePanelProps {
  selectedIds: string[];
  sortedSessions: Session[];
  paginatedSessions: Session[];
  loading: boolean;
  error: string | null;
  sortConfig: { key: AdminSessionsSortKey; direction: 'ascending' | 'descending' };
  page: number;
  rowsPerPage: number;
  totalPages: number;
  displayStart: number;
  displayEnd: number;
  loadingTrainers: boolean;
  formatDate: (dateString: string | null | undefined) => string;
  formatTime: (dateString: string | null | undefined) => string;
  getSortHeaderProps: (key: AdminSessionsSortKey) => React.ThHTMLAttributes<HTMLTableCellElement>;
  onSelectAll: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectOne: (id: string) => void;
  onViewSession: (session: Session) => void;
  onEditSession: (session: Session) => void;
  onDeleteSession: (session: Session) => void;
  onOpenBulkDelete: () => void;
  onRetry: () => void;
  onRowsPerPageChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onPageChange: (event: unknown, newPage: number) => void;
  onOpenNewSession: () => void;
  onExportCSV: () => void;
}

const sortIndicator = (
  sortConfig: AdminSessionsTablePanelProps['sortConfig'],
  key: AdminSessionsSortKey,
) => {
  if (sortConfig.key !== key) return null;
  return sortConfig.direction === 'ascending' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
};

const AdminSessionsTablePanel: React.FC<AdminSessionsTablePanelProps> = ({
  selectedIds,
  sortedSessions,
  paginatedSessions,
  loading,
  error,
  sortConfig,
  page,
  rowsPerPage,
  totalPages,
  displayStart,
  displayEnd,
  loadingTrainers,
  formatDate,
  formatTime,
  getSortHeaderProps,
  onSelectAll,
  onSelectOne,
  onViewSession,
  onEditSession,
  onDeleteSession,
  onOpenBulkDelete,
  onRetry,
  onRowsPerPageChange,
  onPageChange,
  onOpenNewSession,
  onExportCSV,
}) => (
  <>
    <AnimatePresence>
      {selectedIds.length > 0 && (
        <BulkActionsBar
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <BulkSelectedText>{selectedIds.length} selected</BulkSelectedText>
          <GlowButton
            text="Delete Selected"
            theme="ruby"
            size="small"
            leftIcon={<Trash2 size={16} />}
            onClick={onOpenBulkDelete}
          />
        </BulkActionsBar>
      )}
    </AnimatePresence>

    {loading ? (
      <LoadingContainer><LoadingSpinner /></LoadingContainer>
    ) : error ? (
      <EmptyStateContainer>
        <EmptyStateIcon>!</EmptyStateIcon>
        <EmptyStateText>Error loading sessions: {error}</EmptyStateText>
        <GlowButton text="Retry" onClick={onRetry} theme="ruby" size="small" />
      </EmptyStateContainer>
    ) : (
      <StyledTableContainer>
        <NativeTable aria-label="sessions table">
          <NativeTableHead>
            <StyledTableHead>
              <CheckboxCell>
                <CheckboxWrapper
                  htmlFor="sessions-select-all"
                  $indeterminate={selectedIds.length > 0 && selectedIds.length < sortedSessions.length}
                  $checked={sortedSessions.length > 0 && selectedIds.length === sortedSessions.length}
                >
                  <HiddenCheckbox
                    id="sessions-select-all"
                    checked={sortedSessions.length > 0 && selectedIds.length === sortedSessions.length}
                    onChange={onSelectAll}
                    aria-label="select all sessions"
                  />
                </CheckboxWrapper>
              </CheckboxCell>
              {(['client', 'trainer', 'sessionDate', 'location', 'duration', 'status'] as const).map((key) => (
                <SortableHeaderCell key={key} {...getSortHeaderProps(key)}>
                  <FlexRow $gap="0.25rem">
                    <span>{key === 'sessionDate' ? 'Date & Time' : key.charAt(0).toUpperCase() + key.slice(1)}</span>
                    {sortIndicator(sortConfig, key)}
                  </FlexRow>
                </SortableHeaderCell>
              ))}
              <ActionsCell>Actions</ActionsCell>
            </StyledTableHead>
          </NativeTableHead>
          <NativeTableBody>
            {paginatedSessions.length > 0 ? (
              adminSessionRowItems(paginatedSessions).map(({ key, session, index }) => (
                <AdminSessionsTableRow
                  key={key}
                  session={session}
                  index={index}
                  selectedIds={selectedIds}
                  formatDate={formatDate}
                  formatTime={formatTime}
                  onSelectOne={onSelectOne}
                  onViewSession={onViewSession}
                  onEditSession={onEditSession}
                  onDeleteSession={onDeleteSession}
                />
              ))
            ) : (
              <StyledTableRow>
                <StyledTableCell colSpan={9}>
                  <EmptyStateContainer>
                    <EmptyStateIcon>
                      <Calendar size={48} />
                    </EmptyStateIcon>
                    <EmptyStateText>No sessions found matching your criteria.</EmptyStateText>
                  </EmptyStateContainer>
                </StyledTableCell>
              </StyledTableRow>
            )}
          </NativeTableBody>
        </NativeTable>
      </StyledTableContainer>
    )}

    {sortedSessions.length > 0 && (
      <PaginationContainer>
        <span>Rows per page:</span>
        <select value={rowsPerPage} onChange={onRowsPerPageChange} aria-label="Rows per page">
          {[5, 10, 25, 50].map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <span>{displayStart}-{displayEnd} of {sortedSessions.length}</span>
        <FlexRow $gap="0.25rem">
          <PaginationButton
            $disabled={page === 0}
            disabled={page === 0}
            onClick={() => onPageChange(null, page - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft size={18} />
          </PaginationButton>
          <PaginationButton
            $disabled={page >= totalPages - 1}
            disabled={page >= totalPages - 1}
            onClick={() => onPageChange(null, page + 1)}
            aria-label="Next page"
          >
            <ChevronRight size={18} />
          </PaginationButton>
        </FlexRow>
      </PaginationContainer>
    )}

    <FooterActionsContainer>
      <GlowButton
        text="Schedule New Slot"
        theme="cosmic"
        leftIcon={<Plus size={18} />}
        onClick={onOpenNewSession}
        disabled={loadingTrainers}
      />
      <GlowButton
        text="Export Sessions"
        theme="ruby"
        leftIcon={<Download size={18} />}
        onClick={onExportCSV}
        disabled={loading || sortedSessions.length === 0}
      />
    </FooterActionsContainer>
  </>
);

export default AdminSessionsTablePanel;
