/**
 * Trainer Permissions Manager
 * ===========================
 *
 * Canonical admin route shell for granular trainer permission control.
 * Controller, styles, and view sections are extracted so permission truth,
 * templates, and bulk operations remain testable without a monolithic file.
 */

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  LoadingCenter,
  LoadingSpinner,
  PermissionLoadWarning,
  PermissionsContainer
} from './TrainerPermissionsManager.styles';
import { useTrainerPermissionsManagerController } from './TrainerPermissionsManager.controller';
import { TrainerPermissionsHeader } from './TrainerPermissionsManager.Header';
import { PermissionRequestsPanel } from './TrainerPermissionsManager.RequestsPanel';
import { TrainerPermissionsSearchBar } from './TrainerPermissionsManager.SearchBar';
import { TrainerPermissionsGrid } from './TrainerPermissionsManager.TrainersGrid';
import { TrainerPermissionsBulkActionBar } from './TrainerPermissionsManager.BulkActionBar';
import type { TrainerPermissionsManagerProps } from './TrainerPermissionsManager.types';

const TrainerPermissionsManager: React.FC<TrainerPermissionsManagerProps> = (props) => {
  const controller = useTrainerPermissionsManagerController(props);

  if (controller.loading) {
    return (
      <PermissionsContainer>
        <LoadingCenter>
          <LoadingSpinner />
        </LoadingCenter>
      </PermissionsContainer>
    );
  }

  return (
    <PermissionsContainer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <TrainerPermissionsHeader
        applyTemplate={controller.applyTemplate}
        bulkProcessing={controller.bulkProcessing}
        handleExportReport={controller.handleExportReport}
        loadData={controller.loadData}
        permissionRequests={controller.permissionRequests}
        selectedTemplate={controller.selectedTemplate}
        selectedTrainers={controller.selectedTrainers}
        setSelectedTemplate={controller.setSelectedTemplate}
        setShowRequests={controller.setShowRequests}
        showRequests={controller.showRequests}
        stats={controller.stats}
      />

      {controller.permissionLoadErrorCount > 0 && (
        <PermissionLoadWarning role="status" aria-live="polite">
          <AlertTriangle size={18} />
          <strong>{controller.permissionLoadWarningText}</strong>
          <span>Locked trainers require a refresh before permission changes.</span>
        </PermissionLoadWarning>
      )}

      <PermissionRequestsPanel
        handlePermissionRequest={controller.handlePermissionRequest}
        permissionRequests={controller.permissionRequests}
        showRequests={controller.showRequests}
      />

      {!controller.trainerId && (
        <TrainerPermissionsSearchBar
          clearAllSelection={controller.clearAllSelection}
          filteredTrainerCount={controller.filteredTrainers.length}
          handleFilterButton={controller.handleFilterButton}
          searchInputRef={controller.searchInputRef}
          searchQuery={controller.searchQuery}
          selectedTrainers={controller.selectedTrainers}
          selectAllTrainers={controller.selectAllTrainers}
          setSearchQuery={controller.setSearchQuery}
        />
      )}

      <TrainerPermissionsGrid
        cancelCriticalPermissionGrant={controller.cancelCriticalPermissionGrant}
        confirmCriticalPermissionGrant={controller.confirmCriticalPermissionGrant}
        filteredTrainers={controller.filteredTrainers}
        pendingCriticalGrant={controller.pendingCriticalGrant}
        processingPermissions={controller.processingPermissions}
        searchQuery={controller.searchQuery}
        selectedTrainers={controller.selectedTrainers}
        togglePermission={controller.togglePermission}
        toggleTrainerSelection={controller.toggleTrainerSelection}
      />

      <TrainerPermissionsBulkActionBar
        bulkProcessing={controller.bulkProcessing}
        clearAllSelection={controller.clearAllSelection}
        performBulkOperation={controller.performBulkOperation}
        selectedTrainers={controller.selectedTrainers}
      />
    </PermissionsContainer>
  );
};

export default TrainerPermissionsManager;
