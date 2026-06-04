/**
 * Session Allocation Manager
 * =========================
 * Canonical admin route for client paid-session balances and allocation.
 */

import React from 'react';
import { CreditCard, Download, Filter, RefreshCw } from 'lucide-react';
import { useSessionAllocationManagerController } from './SessionAllocationManager.controller';
import { SessionAllocationStatsGrid } from './SessionAllocationManager.StatsGrid';
import { SessionAllocationClientsTable } from './SessionAllocationManager.ClientsTable';
import { SessionAllocationAddSessionsModal } from './SessionAllocationManager.AddSessionsModal';
import type { SessionAllocationManagerProps } from './SessionAllocationManager.types';
import {
  ActionBar,
  Button,
  Container,
  Header,
  LoadingCenter,
  LoadingRefresh,
  SearchInput,
} from './SessionAllocationManager.layoutStyles';

const SessionAllocationManager: React.FC<SessionAllocationManagerProps> = (props) => {
  const controller = useSessionAllocationManagerController(props);

  if (controller.loading) {
    return (
      <Container>
        <LoadingCenter>
          <LoadingRefresh size={32} />
        </LoadingCenter>
      </Container>
    );
  }

  return (
    <Container
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Header>
        <h2>
          <CreditCard size={24} />
          Session Allocation Manager
        </h2>
        <Button variant="primary" onClick={controller.loadClientSessionData}>
          <RefreshCw size={16} />
          Refresh
        </Button>
      </Header>

      <SessionAllocationStatsGrid stats={controller.stats} />

      <ActionBar>
        <SearchInput
          ref={controller.searchInputRef}
          type="text"
          placeholder="Search clients by name or email..."
          value={controller.searchQuery}
          onChange={(event) => controller.setSearchQuery(event.target.value)}
        />
        <Button
          variant="secondary"
          onClick={controller.handleFilterButton}
          aria-label={controller.searchQuery ? 'Clear allocation filter' : 'Focus allocation filter'}
        >
          <Filter size={16} />
          {controller.searchQuery ? 'Clear' : 'Filter'}
        </Button>
        <Button
          variant="secondary"
          onClick={controller.handleExport}
          aria-label="Export filtered session allocations"
        >
          <Download size={16} />
          Export
        </Button>
      </ActionBar>

      <SessionAllocationClientsTable
        clients={controller.filteredClients}
        searchQuery={controller.searchQuery}
        onAddSessions={controller.handleOpenAddSessions}
        onViewClient={controller.handleViewClient}
      />

      <SessionAllocationAddSessionsModal
        client={controller.selectedClient}
        open={controller.showAddModal}
        sessionCount={controller.addSessionCount}
        reason={controller.addSessionReason}
        onClose={controller.closeAddModal}
        onReasonChange={controller.setAddSessionReason}
        onSessionCountChange={controller.setAddSessionCount}
        onSubmit={controller.handleAddSessions}
      />
    </Container>
  );
};

export default SessionAllocationManager;
