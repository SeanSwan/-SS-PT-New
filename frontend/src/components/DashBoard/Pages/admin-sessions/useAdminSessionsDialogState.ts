import { useState } from 'react';
import type { Session } from './ViewSessionModal.types';

interface UseAdminSessionsDialogStateOptions {
  initialNewSessionClientId?: string;
}

const useAdminSessionsDialogState = ({
  initialNewSessionClientId = '',
}: UseAdminSessionsDialogStateOptions = {}) => {
  const hasInitialNewSessionClient = Boolean(initialNewSessionClientId);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openBulkDeleteDialog, setOpenBulkDeleteDialog] = useState(false);
  const [bulkDeleteReason, setBulkDeleteReason] = useState('');
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openNewDialog, setOpenNewDialog] = useState(hasInitialNewSessionClient);
  const [openAddSessionsDialog, setOpenAddSessionsDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState('');
  const [sessionsToAdd, setSessionsToAdd] = useState(1);
  const [addSessionsNote, setAddSessionsNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [editSessionDate, setEditSessionDate] = useState('');
  const [editSessionTime, setEditSessionTime] = useState('');
  const [editSessionDuration, setEditSessionDuration] = useState(60);
  const [editSessionLocation, setEditSessionLocation] = useState('');
  const [editSessionNotes, setEditSessionNotes] = useState('');
  const [editSessionStatus, setEditSessionStatus] = useState<Session['status']>('scheduled');
  const [editSessionClient, setEditSessionClient] = useState('');
  const [editSessionTrainer, setEditSessionTrainer] = useState('');
  const [newSessionDate, setNewSessionDate] = useState('');
  const [newSessionTime, setNewSessionTime] = useState('');
  const [newSessionDuration, setNewSessionDuration] = useState(60);
  const [newSessionLocation, setNewSessionLocation] = useState('Main Studio');
  const [newSessionNotes, setNewSessionNotes] = useState('');
  const [newSessionClient, setNewSessionClient] = useState(initialNewSessionClientId);
  const [newSessionTrainer, setNewSessionTrainer] = useState('');

  return {
    openDeleteDialog, setOpenDeleteDialog, sessionToDelete, setSessionToDelete,
    selectedIds, setSelectedIds, openBulkDeleteDialog, setOpenBulkDeleteDialog,
    bulkDeleteReason, setBulkDeleteReason, selectedSession, setSelectedSession,
    openViewDialog, setOpenViewDialog, openEditDialog, setOpenEditDialog,
    openNewDialog, setOpenNewDialog, openAddSessionsDialog, setOpenAddSessionsDialog,
    selectedClient, setSelectedClient, sessionsToAdd, setSessionsToAdd,
    addSessionsNote, setAddSessionsNote, isProcessing, setIsProcessing,
    editSessionDate, setEditSessionDate, editSessionTime, setEditSessionTime,
    editSessionDuration, setEditSessionDuration, editSessionLocation, setEditSessionLocation,
    editSessionNotes, setEditSessionNotes, editSessionStatus, setEditSessionStatus,
    editSessionClient, setEditSessionClient, editSessionTrainer, setEditSessionTrainer,
    newSessionDate, setNewSessionDate, newSessionTime, setNewSessionTime,
    newSessionDuration, setNewSessionDuration, newSessionLocation, setNewSessionLocation,
    newSessionNotes, setNewSessionNotes, newSessionClient, setNewSessionClient,
    newSessionTrainer, setNewSessionTrainer,
    openAddSessionsPanel: () => setOpenAddSessionsDialog(true),
    openBulkDeletePanel: () => setOpenBulkDeleteDialog(true),
    openNewSessionPanel: () => setOpenNewDialog(true),
    closeViewPanel: () => setOpenViewDialog(false),
    closeEditPanel: () => setOpenEditDialog(false),
    closeNewSessionPanel: () => setOpenNewDialog(false),
    closeAddSessionsPanel: () => setOpenAddSessionsDialog(false),
    closeDeletePanel: () => setOpenDeleteDialog(false),
    closeBulkDeletePanel: () => setOpenBulkDeleteDialog(false),
  };
};

export default useAdminSessionsDialogState;
