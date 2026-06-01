import React from 'react';
import type { Client, Trainer, Session } from './ViewSessionModal.types';
import ViewSessionModal from './ViewSessionModal';
import AdminSessionsDeleteDialogs from './AdminSessionsDeleteDialogs';
import AdminSessionsAddSessionsDialog from './AdminSessionsAddSessionsDialog';
import AdminSessionsEditSessionDialog from './AdminSessionsEditSessionDialog';
import AdminSessionsNewSessionDialog from './AdminSessionsNewSessionDialog';

interface AdminSessionsDialogStackProps {
  openViewDialog: boolean;
  openEditDialog: boolean;
  openNewDialog: boolean;
  openAddSessionsDialog: boolean;
  openDeleteDialog: boolean;
  openBulkDeleteDialog: boolean;
  selectedSession: Session | null;
  sessionToDelete: Session | null;
  clients: Client[];
  trainers: Trainer[];
  loadingClients: boolean;
  loadingTrainers: boolean;
  editSessionClient: string;
  editSessionTrainer: string;
  editSessionDate: string;
  editSessionTime: string;
  editSessionDuration: number;
  editSessionStatus: Session['status'];
  editSessionLocation: string;
  editSessionNotes: string;
  newSessionClient: string;
  newSessionTrainer: string;
  newSessionDate: string;
  newSessionTime: string;
  newSessionDuration: number;
  newSessionLocation: string;
  newSessionNotes: string;
  selectedClient: string;
  sessionsToAdd: number;
  addSessionsNote: string;
  selectedCount: number;
  bulkDeleteReason: string;
  isProcessing: boolean;
  formatDate: (dateString: string | null | undefined) => string;
  onCloseView: () => void;
  onEditFromView: (session: Session) => void;
  onCloseEdit: () => void;
  onEditClientChange: (value: string) => void;
  onEditTrainerChange: (value: string) => void;
  onEditDateChange: (value: string) => void;
  onEditTimeChange: (value: string) => void;
  onEditDurationChange: (value: number) => void;
  onEditStatusChange: (value: Session['status']) => void;
  onEditLocationChange: (value: string) => void;
  onEditNotesChange: (value: string) => void;
  onSubmitEdit: () => void;
  onCloseNew: () => void;
  onNewClientChange: (value: string) => void;
  onNewTrainerChange: (value: string) => void;
  onNewDateChange: (value: string) => void;
  onNewTimeChange: (value: string) => void;
  onNewDurationChange: (value: number) => void;
  onNewLocationChange: (value: string) => void;
  onNewNotesChange: (value: string) => void;
  onSubmitNew: () => void;
  onCloseAddSessions: () => void;
  onSelectedClientChange: (value: string) => void;
  onSessionsToAddChange: (value: number) => void;
  onAddSessionsNoteChange: (value: string) => void;
  onSubmitAddSessions: () => void;
  onCloseDelete: () => void;
  onConfirmDelete: () => void;
  onCloseBulkDelete: () => void;
  onConfirmBulkDelete: () => void;
  onBulkDeleteReasonChange: (value: string) => void;
}

const AdminSessionsDialogStack: React.FC<AdminSessionsDialogStackProps> = ({
  openViewDialog,
  openEditDialog,
  openNewDialog,
  openAddSessionsDialog,
  openDeleteDialog,
  openBulkDeleteDialog,
  selectedSession,
  sessionToDelete,
  clients,
  trainers,
  loadingClients,
  loadingTrainers,
  editSessionClient,
  editSessionTrainer,
  editSessionDate,
  editSessionTime,
  editSessionDuration,
  editSessionStatus,
  editSessionLocation,
  editSessionNotes,
  newSessionClient,
  newSessionTrainer,
  newSessionDate,
  newSessionTime,
  newSessionDuration,
  newSessionLocation,
  newSessionNotes,
  selectedClient,
  sessionsToAdd,
  addSessionsNote,
  selectedCount,
  bulkDeleteReason,
  isProcessing,
  formatDate,
  onCloseView,
  onEditFromView,
  onCloseEdit,
  onEditClientChange,
  onEditTrainerChange,
  onEditDateChange,
  onEditTimeChange,
  onEditDurationChange,
  onEditStatusChange,
  onEditLocationChange,
  onEditNotesChange,
  onSubmitEdit,
  onCloseNew,
  onNewClientChange,
  onNewTrainerChange,
  onNewDateChange,
  onNewTimeChange,
  onNewDurationChange,
  onNewLocationChange,
  onNewNotesChange,
  onSubmitNew,
  onCloseAddSessions,
  onSelectedClientChange,
  onSessionsToAddChange,
  onAddSessionsNoteChange,
  onSubmitAddSessions,
  onCloseDelete,
  onConfirmDelete,
  onCloseBulkDelete,
  onConfirmBulkDelete,
  onBulkDeleteReasonChange,
}) => (
  <>
    <ViewSessionModal
      open={openViewDialog}
      onClose={onCloseView}
      session={selectedSession}
      onEdit={onEditFromView}
    />

    <AdminSessionsEditSessionDialog
      open={openEditDialog}
      clients={clients}
      trainers={trainers}
      loadingClients={loadingClients}
      loadingTrainers={loadingTrainers}
      clientId={editSessionClient}
      trainerId={editSessionTrainer}
      sessionDate={editSessionDate}
      sessionTime={editSessionTime}
      duration={editSessionDuration}
      status={editSessionStatus}
      location={editSessionLocation}
      notes={editSessionNotes}
      onClose={onCloseEdit}
      onClientChange={onEditClientChange}
      onTrainerChange={onEditTrainerChange}
      onDateChange={onEditDateChange}
      onTimeChange={onEditTimeChange}
      onDurationChange={onEditDurationChange}
      onStatusChange={onEditStatusChange}
      onLocationChange={onEditLocationChange}
      onNotesChange={onEditNotesChange}
      onSubmit={onSubmitEdit}
    />

    <AdminSessionsNewSessionDialog
      open={openNewDialog}
      clients={clients}
      trainers={trainers}
      loadingClients={loadingClients}
      loadingTrainers={loadingTrainers}
      clientId={newSessionClient}
      trainerId={newSessionTrainer}
      sessionDate={newSessionDate}
      sessionTime={newSessionTime}
      duration={newSessionDuration}
      location={newSessionLocation}
      notes={newSessionNotes}
      onClose={onCloseNew}
      onClientChange={onNewClientChange}
      onTrainerChange={onNewTrainerChange}
      onDateChange={onNewDateChange}
      onTimeChange={onNewTimeChange}
      onDurationChange={onNewDurationChange}
      onLocationChange={onNewLocationChange}
      onNotesChange={onNewNotesChange}
      onSubmit={onSubmitNew}
    />

    <AdminSessionsAddSessionsDialog
      open={openAddSessionsDialog}
      clients={clients}
      loadingClients={loadingClients}
      selectedClient={selectedClient}
      sessionsToAdd={sessionsToAdd}
      addSessionsNote={addSessionsNote}
      onClose={onCloseAddSessions}
      onSelectedClientChange={onSelectedClientChange}
      onSessionsToAddChange={onSessionsToAddChange}
      onNoteChange={onAddSessionsNoteChange}
      onSubmit={onSubmitAddSessions}
    />

    <AdminSessionsDeleteDialogs
      openDeleteDialog={openDeleteDialog}
      openBulkDeleteDialog={openBulkDeleteDialog}
      sessionToDelete={sessionToDelete}
      selectedCount={selectedCount}
      bulkDeleteReason={bulkDeleteReason}
      isProcessing={isProcessing}
      formatDate={formatDate}
      onCloseDelete={onCloseDelete}
      onConfirmDelete={onConfirmDelete}
      onCloseBulkDelete={onCloseBulkDelete}
      onConfirmBulkDelete={onConfirmBulkDelete}
      onBulkDeleteReasonChange={onBulkDeleteReasonChange}
    />
  </>
);

export default AdminSessionsDialogStack;
