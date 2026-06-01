import { useToast } from '../../../../hooks/use-toast';
import services from '../../../../services/index';
import apiService from '../../../../services/api.service';
import { logger } from '@/utils/logger';
import type { Session } from './ViewSessionModal.types';
import { getAdminSessionsErrorMessage } from './AdminSessionsErrors.logic';
import { buildAdminSessionsNewSessionPayload } from './AdminSessionsNewSessionPayload.logic';
import useAdminSessionsDialogState from './useAdminSessionsDialogState';

type RefreshCallback = () => Promise<void> | void;

interface UseAdminSessionsMutationsParams {
  fetchSessions: RefreshCallback;
  fetchClients: RefreshCallback;
  fetchTrainers: RefreshCallback;
}

const useAdminSessionsMutations = ({
  fetchSessions,
  fetchClients,
  fetchTrainers,
}: UseAdminSessionsMutationsParams) => {
  const { toast } = useToast();
  const state = useAdminSessionsDialogState();

  const handleViewSession = (session: Session) => {
    state.setSelectedSession(session);
    state.setOpenViewDialog(true);
  };

  const handleEditSession = (session: Session) => {
    state.setSelectedSession(session);
    try {
      const sessionDate = new Date(session.sessionDate);
      state.setEditSessionDate(sessionDate.toISOString().split('T')[0]);
      state.setEditSessionTime(sessionDate.toTimeString().slice(0, 5));
    } catch (error) {
      console.error('Error parsing session date for editing:', session.sessionDate, error);
      state.setEditSessionDate('');
      state.setEditSessionTime('');
      toast({ title: 'Error', description: 'Invalid session date found.', variant: 'destructive' });
    }
    state.setEditSessionDuration(session.duration || 60);
    state.setEditSessionLocation(session.location || '');
    state.setEditSessionNotes(session.notes || '');
    state.setEditSessionStatus(session.status || 'scheduled');
    state.setEditSessionClient(session.userId || '');
    state.setEditSessionTrainer(session.trainerId || '');
    state.setOpenEditDialog(true);
  };

  const handleEditFromView = (session: Session) => {
    state.setOpenViewDialog(false);
    handleEditSession(session);
  };

  const handleSaveEditedSession = async () => {
    const { selectedSession } = state;
    if (!selectedSession) return;
    try {
      if (!state.editSessionDate || !state.editSessionTime) {
        toast({ title: 'Error', description: 'Please provide a valid date and time.', variant: 'destructive' });
        return;
      }
      const updatedSessionDateTime = new Date(`${state.editSessionDate}T${state.editSessionTime}`);
      if (isNaN(updatedSessionDateTime.getTime())) {
        toast({ title: 'Error', description: 'Invalid date/time format.', variant: 'destructive' });
        return;
      }
      const response = await apiService.put(`/api/sessions/${selectedSession.id}`, {
        sessionDate: updatedSessionDateTime.toISOString(),
        duration: state.editSessionDuration,
        location: state.editSessionLocation,
        notes: state.editSessionNotes,
        status: state.editSessionStatus,
        userId: state.editSessionClient || null,
        trainerId: state.editSessionTrainer || null,
      });
      if (response.status === 200) {
        toast({ title: 'Success', description: 'Session updated successfully' });
      } else {
        logger.warn('Session update returned status:', response.status);
        toast({ title: 'Warning', description: `Session updated, but received status: ${response.status}`, variant: 'default' });
      }
      fetchSessions();
      state.setOpenEditDialog(false);
    } catch (error: unknown) {
      const errorMsg = getAdminSessionsErrorMessage(error, 'Server error updating session');
      console.error('Error updating session:', error);
      toast({ title: 'Error', description: errorMsg, variant: 'destructive' });
    }
  };

  const handleCreateNewSession = async () => {
    try {
      if (!state.newSessionDate || !state.newSessionTime) {
        toast({ title: 'Error', description: 'Please provide a valid date and time for the new session.', variant: 'destructive' });
        return;
      }
      const newSessionDateTime = new Date(`${state.newSessionDate}T${state.newSessionTime}`);
      if (isNaN(newSessionDateTime.getTime())) {
        toast({ title: 'Error', description: 'Invalid date/time format for new session.', variant: 'destructive' });
        return;
      }
      if (newSessionDateTime < new Date()) toast({ title: 'Warning', description: 'Creating a session in the past.', variant: 'default' });
      const response = await apiService.post('/api/sessions', buildAdminSessionsNewSessionPayload({
        startIso: newSessionDateTime.toISOString(),
        duration: state.newSessionDuration,
        location: state.newSessionLocation,
        notes: state.newSessionNotes,
        clientId: state.newSessionClient,
        trainerId: state.newSessionTrainer,
      }));
      if (response.status === 201 || response.status === 200) {
        toast({ title: 'Success', description: 'New session created successfully' });
        fetchSessions();
        state.setOpenNewDialog(false);
        state.setNewSessionDate('');
        state.setNewSessionTime('');
        state.setNewSessionDuration(60);
        state.setNewSessionLocation('Main Studio');
        state.setNewSessionNotes('');
        state.setNewSessionClient('');
        state.setNewSessionTrainer('');
        return;
      }
      logger.warn('Session creation returned status:', response.status);
      toast({ title: 'Error', description: `Failed to create session (status: ${response.status})`, variant: 'destructive' });
    } catch (error: unknown) {
      const errorMsg = getAdminSessionsErrorMessage(error, 'Server error creating session');
      console.error('Error creating session:', error);
      toast({ title: 'Error', description: errorMsg, variant: 'destructive' });
    }
  };

  const handleAddSessions = async () => {
    if (!state.selectedClient) {
      toast({ title: 'Error', description: 'Please select a client.', variant: 'destructive' });
      return;
    }
    if (isNaN(state.sessionsToAdd) || state.sessionsToAdd <= 0) {
      toast({ title: 'Error', description: 'Please enter a valid positive number of sessions.', variant: 'destructive' });
      return;
    }
    try {
      logger.log('[AdminSessions] Adding sessions to client', {
        clientId: state.selectedClient,
        sessionCount: state.sessionsToAdd,
        reason: state.addSessionsNote,
      });
      const result = await services.session.addSessionsToClient(
        state.selectedClient,
        state.sessionsToAdd,
        state.addSessionsNote || 'Manually added by admin via dashboard',
      );
      if (result.success) {
        logger.log('[AdminSessions] Sessions added successfully', result.data);
        toast({ title: 'Success', description: `Added ${state.sessionsToAdd} session(s) to the client.` });
        fetchClients();
        fetchSessions();
        state.setOpenAddSessionsDialog(false);
        state.setSelectedClient('');
        state.setSessionsToAdd(1);
        state.setAddSessionsNote('');
        return;
      }
      console.error('[AdminSessions] Failed to add sessions', result);
      toast({ title: 'Error', description: result.message || 'Failed to add sessions.', variant: 'destructive' });
    } catch (error: unknown) {
      const errorMsg = getAdminSessionsErrorMessage(error, 'Server error adding sessions');
      console.error('[AdminSessions] Error adding sessions:', error);
      toast({ title: 'Error', description: errorMsg, variant: 'destructive' });
    }
  };

  const handleDeleteClick = (session: Session) => {
    state.setSessionToDelete(session);
    state.setOpenDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    const { sessionToDelete } = state;
    if (!sessionToDelete) return;
    state.setIsProcessing(true);
    try {
      await apiService.delete(`/api/sessions/${sessionToDelete.id}`);
      toast({ title: 'Success', description: 'Session deleted successfully' });
      fetchSessions();
    } catch (error: unknown) {
      console.error('Error deleting session:', error);
      const errorMsg = getAdminSessionsErrorMessage(error, 'Failed to delete session');
      toast({ title: 'Error', description: errorMsg, variant: 'destructive' });
    } finally {
      state.setIsProcessing(false);
      state.setOpenDeleteDialog(false);
      state.setSessionToDelete(null);
    }
  };

  const handleConfirmBulkDelete = async () => {
    if (state.selectedIds.length === 0) return;
    state.setIsProcessing(true);
    try {
      await apiService.delete('/api/sessions/bulk', { data: { sessionIds: state.selectedIds, reason: state.bulkDeleteReason } });
      toast({ title: 'Success', description: `${state.selectedIds.length} sessions deleted successfully.` });
      fetchSessions();
      state.setSelectedIds([]);
      state.setBulkDeleteReason('');
    } catch (error: unknown) {
      console.error('Error bulk deleting sessions:', error);
      const errorMsg = getAdminSessionsErrorMessage(error, 'Failed to delete selected sessions.');
      toast({ title: 'Error', description: errorMsg, variant: 'destructive' });
    } finally {
      state.setIsProcessing(false);
      state.setOpenBulkDeleteDialog(false);
    }
  };

  const handleRefreshSessions = async () => {
    toast({ title: 'Refreshing...', description: 'Fetching latest session data.' });
    try {
      const healthCheck = await services.session.checkAllocationHealth();
      logger.log('[AdminSessions] Session allocation service health:', healthCheck);
      await Promise.all([fetchSessions(), fetchClients(), fetchTrainers()]);
      toast({ title: 'Success', description: 'Session data refreshed successfully.' });
    } catch (error) {
      console.error('[AdminSessions] Error during refresh:', error);
      fetchSessions();
      fetchClients();
      fetchTrainers();
    }
  };

  return {
    ...state,
    handleViewSession,
    handleEditSession,
    handleEditFromView,
    handleSaveEditedSession,
    handleCreateNewSession,
    handleAddSessions,
    handleDeleteClick,
    handleConfirmDelete,
    handleConfirmBulkDelete,
    handleRefreshSessions,
  };
};

export default useAdminSessionsMutations;
