/**
 * Blueprint: Admin sessions main card.
 * Owns the visible sessions-management card while the parent retains data and mutations.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, CalendarDays, RefreshCw, TableIcon, Zap } from 'lucide-react';
import GlowButton from '../../../ui/buttons/GlowButton';
import ScheduleErrorBoundary from '../../../Schedule/ScheduleErrorBoundary';
import ScheduleInitializer from '../../../Schedule/ScheduleInitializer';
import UnifiedCalendar from '../../../Schedule/schedule';
import type { Session } from './ViewSessionModal.types';
import type { AdminSessionsStatsData } from './AdminSessionsStatsSummary';
import type { AdminSessionsSortKey } from './AdminSessionsTablePanel';
import { StyledCard, CardHeader, CardTitle, CardContent } from './AdminSessionsShell.styles';
import { itemVariants } from './AdminSessionsTheme.styles';
import { CalendarViewWrapper, TestControlsWrapper } from './AdminSessionsCalendar.styles';
import { FlexRow, TitleText, ViewToggleContainer } from './AdminSessionsTable.styles';
import AdminSessionsStatsSummary from './AdminSessionsStatsSummary';
import AdminSessionsFiltersPanel from './AdminSessionsFiltersPanel';
import AdminSessionsTablePanel from './AdminSessionsTablePanel';

const SessionTestControls = import.meta.env.DEV ? React.lazy(() => import('./session-test-controls')) : null;

interface AdminSessionsMainCardProps {
  viewMode: 'table' | 'calendar';
  loading: boolean;
  loadingClients: boolean;
  loadingTrainers: boolean;
  error: string | null;
  statsData: AdminSessionsStatsData;
  searchTerm: string;
  statusFilter: string;
  startDate: string;
  endDate: string;
  selectedIds: string[];
  sortedSessions: Session[];
  paginatedSessions: Session[];
  sortConfig: { key: AdminSessionsSortKey; direction: 'ascending' | 'descending' };
  page: number;
  rowsPerPage: number;
  totalPages: number;
  displayStart: number;
  displayEnd: number;
  formatDate: (dateString: string | null | undefined) => string;
  formatTime: (dateString: string | null | undefined) => string;
  getSortHeaderProps: (key: AdminSessionsSortKey) => React.ThHTMLAttributes<HTMLTableCellElement>;
  onViewModeChange: (mode: 'table' | 'calendar') => void;
  onOpenAddSessions: () => void;
  onRefreshSessions: () => void;
  onSearchTermChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
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

const AdminSessionsMainCard: React.FC<AdminSessionsMainCardProps> = ({
  viewMode,
  loading,
  loadingClients,
  loadingTrainers,
  error,
  statsData,
  searchTerm,
  statusFilter,
  startDate,
  endDate,
  selectedIds,
  sortedSessions,
  paginatedSessions,
  sortConfig,
  page,
  rowsPerPage,
  totalPages,
  displayStart,
  displayEnd,
  formatDate,
  formatTime,
  getSortHeaderProps,
  onViewModeChange,
  onOpenAddSessions,
  onRefreshSessions,
  onSearchTermChange,
  onStatusFilterChange,
  onStartDateChange,
  onEndDateChange,
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
  <StyledCard as={motion.div} variants={itemVariants}>
    <CardHeader>
      <CardTitle>
        <FlexRow $gap="0.75rem">
          <Calendar size={28} />
          <TitleText>Training Sessions Management</TitleText>
        </FlexRow>
      </CardTitle>
      <FlexRow $gap="0.75rem">
        <ViewToggleContainer>
          <GlowButton
            text="Table"
            theme={viewMode === 'table' ? 'cosmic' : 'ruby'}
            size="small"
            leftIcon={<TableIcon size={16} />}
            onClick={() => onViewModeChange('table')}
          />
          <GlowButton
            text="Calendar"
            theme={viewMode === 'calendar' ? 'cosmic' : 'ruby'}
            size="small"
            leftIcon={<CalendarDays size={16} />}
            onClick={() => onViewModeChange('calendar')}
          />
        </ViewToggleContainer>
        <GlowButton
          text="Add Sessions"
          theme="emerald"
          size="small"
          leftIcon={<Zap size={16} />}
          onClick={onOpenAddSessions}
          disabled={loadingClients}
        />
        <GlowButton
          text="Refresh"
          theme="purple"
          size="small"
          leftIcon={<RefreshCw size={16} />}
          onClick={onRefreshSessions}
          isLoading={loading}
        />
      </FlexRow>
    </CardHeader>

    <CardContent>
      <AdminSessionsStatsSummary loading={loading} statsData={statsData} />

      <AdminSessionsFiltersPanel
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        startDate={startDate}
        endDate={endDate}
        onSearchTermChange={onSearchTermChange}
        onStatusFilterChange={onStatusFilterChange}
        onStartDateChange={onStartDateChange}
        onEndDateChange={onEndDateChange}
      />

      {viewMode === 'table' ? (
        <AdminSessionsTablePanel
          selectedIds={selectedIds}
          sortedSessions={sortedSessions}
          paginatedSessions={paginatedSessions}
          loading={loading}
          error={error}
          sortConfig={sortConfig}
          page={page}
          rowsPerPage={rowsPerPage}
          totalPages={totalPages}
          displayStart={displayStart}
          displayEnd={displayEnd}
          loadingTrainers={loadingTrainers}
          formatDate={formatDate}
          formatTime={formatTime}
          getSortHeaderProps={getSortHeaderProps}
          onSelectAll={onSelectAll}
          onSelectOne={onSelectOne}
          onViewSession={onViewSession}
          onEditSession={onEditSession}
          onDeleteSession={onDeleteSession}
          onOpenBulkDelete={onOpenBulkDelete}
          onRetry={onRetry}
          onRowsPerPageChange={onRowsPerPageChange}
          onPageChange={onPageChange}
          onOpenNewSession={onOpenNewSession}
          onExportCSV={onExportCSV}
        />
      ) : (
        <CalendarViewWrapper>
          <ScheduleInitializer>
            <ScheduleErrorBoundary>
              <UnifiedCalendar />
            </ScheduleErrorBoundary>
          </ScheduleInitializer>
        </CalendarViewWrapper>
      )}

      {SessionTestControls && viewMode === 'table' && (
        <TestControlsWrapper>
          <React.Suspense fallback={null}>
            <SessionTestControls />
          </React.Suspense>
        </TestControlsWrapper>
      )}
    </CardContent>
  </StyledCard>
);

export default AdminSessionsMainCard;
