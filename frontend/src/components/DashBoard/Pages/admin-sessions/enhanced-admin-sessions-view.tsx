import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

import { PageContainer, ContentContainer } from './AdminSessionsShell.styles';
import { containerVariants } from './AdminSessionsTheme.styles';
import AdminSessionsDialogStack from './AdminSessionsDialogStack';
import AdminSessionsMainCard from './AdminSessionsMainCard';
import AdminSessionsTrainerAssignmentCard from './AdminSessionsTrainerAssignmentCard';
import useAdminSessionsData from './useAdminSessionsData';
import useAdminSessionsExport from './useAdminSessionsExport';
import useAdminSessionsMutations from './useAdminSessionsMutations';
import {
  calculateAdminSessionStats,
  filterAdminSessions,
  formatSessionDate,
  formatSessionTime,
  paginateAdminSessions,
  sortAdminSessions,
  type AdminSessionsSortConfig,
} from './AdminSessionsSessionList.logic';
import { getAdminSessionsClientIdFromSearch } from './AdminSessionsDeepLink.logic';

type SortKey = AdminSessionsSortConfig['key'];
type SortConfig = AdminSessionsSortConfig;

const EnhancedAdminSessionsView: React.FC = () => {
  const location = useLocation();
  const {
    sessions,
    loading,
    error,
    clients,
    trainers,
    loadingClients,
    loadingTrainers,
    fetchSessions,
    fetchClients,
    fetchTrainers,
  } = useAdminSessionsData();
  const initialNewSessionClientId = React.useMemo(
    () => getAdminSessionsClientIdFromSearch(location.search),
    [location.search],
  );
  const sessionMutations = useAdminSessionsMutations({
    fetchSessions,
    fetchClients,
    fetchTrainers,
    initialNewSessionClientId,
  });

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'sessionDate', direction: 'descending' });

  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');

  // Handle pagination change
  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const statsData = React.useMemo(() => calculateAdminSessionStats(sessions), [sessions]);
  const filteredSessions = React.useMemo(
    () => filterAdminSessions(sessions, { searchTerm, statusFilter, startDate, endDate }),
    [endDate, searchTerm, sessions, startDate, statusFilter],
  );
  const sortedSessions = React.useMemo(
    () => sortAdminSessions(filteredSessions, sortConfig),
    [filteredSessions, sortConfig],
  );
  const formatDate = formatSessionDate;
  const formatTime = formatSessionTime;
  const handleExportCSV = useAdminSessionsExport({
    sessions: filteredSessions,
    formatDate,
    formatTime,
  });

  const handleSort = (key: SortKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortAriaState = (key: SortKey): 'ascending' | 'descending' | 'none' =>
    sortConfig.key === key ? sortConfig.direction : 'none';

  const handleSortHeaderKeyDown = (event: React.KeyboardEvent, key: SortKey) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    handleSort(key);
  };

  const getSortHeaderProps = (key: SortKey): React.ThHTMLAttributes<HTMLTableCellElement> => ({
    scope: 'col',
    tabIndex: 0,
    'aria-sort': getSortAriaState(key),
    onClick: () => handleSort(key),
    onKeyDown: (event: React.KeyboardEvent) => handleSortHeaderKeyDown(event, key),
  });

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelectedIds = filteredSessions.map((session) => session.id);
      sessionMutations.setSelectedIds(newSelectedIds);
      return;
    }
    sessionMutations.setSelectedIds([]);
  };

  const handleSelectOne = (id: string) => {
    const selectedIds = sessionMutations.selectedIds;
    const selectedIndex = selectedIds.indexOf(id);
    let newSelectedIds: string[] = [];

    if (selectedIndex === -1) {
      newSelectedIds = newSelectedIds.concat(selectedIds, id);
    } else if (selectedIndex === 0) {
      newSelectedIds = newSelectedIds.concat(selectedIds.slice(1));
    } else if (selectedIndex === selectedIds.length - 1) {
      newSelectedIds = newSelectedIds.concat(selectedIds.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelectedIds = newSelectedIds.concat(
        selectedIds.slice(0, selectedIndex),
        selectedIds.slice(selectedIndex + 1),
      );
    }

    sessionMutations.setSelectedIds(newSelectedIds);
  };

  const {
    paginatedSessions,
    totalPages,
    displayStart,
    displayEnd,
  } = paginateAdminSessions(sortedSessions, page, rowsPerPage);

  return (
    <PageContainer>
      <ContentContainer>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <AdminSessionsMainCard
            viewMode={viewMode}
            loading={loading}
            loadingClients={loadingClients}
            loadingTrainers={loadingTrainers}
            error={error}
            statsData={statsData}
            searchTerm={searchTerm}
            statusFilter={statusFilter}
            startDate={startDate}
            endDate={endDate}
            selectedIds={sessionMutations.selectedIds}
            sortedSessions={sortedSessions}
            paginatedSessions={paginatedSessions}
            sortConfig={sortConfig}
            page={page}
            rowsPerPage={rowsPerPage}
            totalPages={totalPages}
            displayStart={displayStart}
            displayEnd={displayEnd}
            formatDate={formatDate}
            formatTime={formatTime}
            getSortHeaderProps={getSortHeaderProps}
            onViewModeChange={setViewMode}
            onOpenAddSessions={sessionMutations.openAddSessionsPanel}
            onRefreshSessions={sessionMutations.handleRefreshSessions}
            onSearchTermChange={setSearchTerm}
            onStatusFilterChange={setStatusFilter}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onSelectAll={handleSelectAll}
            onSelectOne={handleSelectOne}
            onViewSession={sessionMutations.handleViewSession}
            onEditSession={sessionMutations.handleEditSession}
            onDeleteSession={sessionMutations.handleDeleteClick}
            onOpenBulkDelete={sessionMutations.openBulkDeletePanel}
            onRetry={fetchSessions}
            onRowsPerPageChange={handleChangeRowsPerPage}
            onPageChange={handleChangePage}
            onOpenNewSession={sessionMutations.openNewSessionPanel}
            onExportCSV={handleExportCSV}
          />
        </motion.div>
      </ContentContainer>

      <AdminSessionsDialogStack
        openViewDialog={sessionMutations.openViewDialog}
        openEditDialog={sessionMutations.openEditDialog}
        openNewDialog={sessionMutations.openNewDialog}
        openAddSessionsDialog={sessionMutations.openAddSessionsDialog}
        openDeleteDialog={sessionMutations.openDeleteDialog}
        openBulkDeleteDialog={sessionMutations.openBulkDeleteDialog}
        selectedSession={sessionMutations.selectedSession}
        sessionToDelete={sessionMutations.sessionToDelete}
        clients={clients}
        trainers={trainers}
        loadingClients={loadingClients}
        loadingTrainers={loadingTrainers}
        editSessionClient={sessionMutations.editSessionClient}
        editSessionTrainer={sessionMutations.editSessionTrainer}
        editSessionDate={sessionMutations.editSessionDate}
        editSessionTime={sessionMutations.editSessionTime}
        editSessionDuration={sessionMutations.editSessionDuration}
        editSessionStatus={sessionMutations.editSessionStatus}
        editSessionLocation={sessionMutations.editSessionLocation}
        editSessionNotes={sessionMutations.editSessionNotes}
        newSessionClient={sessionMutations.newSessionClient}
        newSessionTrainer={sessionMutations.newSessionTrainer}
        newSessionDate={sessionMutations.newSessionDate}
        newSessionTime={sessionMutations.newSessionTime}
        newSessionDuration={sessionMutations.newSessionDuration}
        newSessionLocation={sessionMutations.newSessionLocation}
        newSessionNotes={sessionMutations.newSessionNotes}
        selectedClient={sessionMutations.selectedClient}
        sessionsToAdd={sessionMutations.sessionsToAdd}
        addSessionsNote={sessionMutations.addSessionsNote}
        selectedCount={sessionMutations.selectedIds.length}
        bulkDeleteReason={sessionMutations.bulkDeleteReason}
        isProcessing={sessionMutations.isProcessing}
        formatDate={formatDate}
        onCloseView={sessionMutations.closeViewPanel}
        onEditFromView={sessionMutations.handleEditFromView}
        onCloseEdit={sessionMutations.closeEditPanel}
        onEditClientChange={sessionMutations.setEditSessionClient}
        onEditTrainerChange={sessionMutations.setEditSessionTrainer}
        onEditDateChange={sessionMutations.setEditSessionDate}
        onEditTimeChange={sessionMutations.setEditSessionTime}
        onEditDurationChange={sessionMutations.setEditSessionDuration}
        onEditStatusChange={sessionMutations.setEditSessionStatus}
        onEditLocationChange={sessionMutations.setEditSessionLocation}
        onEditNotesChange={sessionMutations.setEditSessionNotes}
        onSubmitEdit={sessionMutations.handleSaveEditedSession}
        onCloseNew={sessionMutations.closeNewSessionPanel}
        onNewClientChange={sessionMutations.setNewSessionClient}
        onNewTrainerChange={sessionMutations.setNewSessionTrainer}
        onNewDateChange={sessionMutations.setNewSessionDate}
        onNewTimeChange={sessionMutations.setNewSessionTime}
        onNewDurationChange={sessionMutations.setNewSessionDuration}
        onNewLocationChange={sessionMutations.setNewSessionLocation}
        onNewNotesChange={sessionMutations.setNewSessionNotes}
        onSubmitNew={sessionMutations.handleCreateNewSession}
        onCloseAddSessions={sessionMutations.closeAddSessionsPanel}
        onSelectedClientChange={sessionMutations.setSelectedClient}
        onSessionsToAddChange={sessionMutations.setSessionsToAdd}
        onAddSessionsNoteChange={sessionMutations.setAddSessionsNote}
        onSubmitAddSessions={sessionMutations.handleAddSessions}
        onCloseDelete={sessionMutations.closeDeletePanel}
        onConfirmDelete={sessionMutations.handleConfirmDelete}
        onCloseBulkDelete={sessionMutations.closeBulkDeletePanel}
        onConfirmBulkDelete={sessionMutations.handleConfirmBulkDelete}
        onBulkDeleteReasonChange={sessionMutations.setBulkDeleteReason}
      />

      <AdminSessionsTrainerAssignmentCard
        sessions={sessions}
        clients={clients}
        trainers={trainers}
        onAssignmentSuccess={fetchSessions}
      />

    </PageContainer>
  );
};

export default EnhancedAdminSessionsView;
