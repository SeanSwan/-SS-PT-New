import React, { useEffect, useState } from 'react';
import { CheckCircle, Clock, Download, Eye, RefreshCw, User, Zap } from 'lucide-react';
import GlowButton from '../../../ui/buttons/GlowButton';
import services from '../../../../services/index';
import type { Toast } from '../../../../hooks/use-toast';
import { logger } from '@/utils/logger';
import { getClientSessionSignal } from '../../workspaces/clients-team/clientSessionSignal';
import type { Client, Session, Trainer } from './ViewSessionModal.types';
import {
  AssignmentStatistics,
  buildAssignmentReport,
  buildAssignmentReportFileName,
  getAssignedSessionIdsForRemoval,
  getAssignmentErrorMessage,
  getAssignSessionIds,
  getUnassignedSessions,
  toggleSelectedSession,
  type AssignmentMode,
} from './AdminSessionsTrainerAssignment.logic';
import { StatsCard, StatsIconContainer, StatsLabel, StatsValue } from './AdminSessionsStats.styles';
import { StyledDialog, DialogActionsBar, DialogContentArea, DialogTitleBar } from './AdminSessionsDialog.styles';
import {
  CellPrimaryText,
  CellSecondaryText,
  DialogPanelNarrow,
  FlexCol,
  FlexRow,
  MutedText,
} from './AdminSessionsTable.styles';
import {
  AssignmentGrid,
  AssignmentPanel,
  AssignmentStatsGrid,
  FormField,
  FormLabel,
  FormSelect,
  PanelHeading,
  ScrollableList,
  SessionSelectIcon,
  SessionSelectItem,
} from './AdminSessionsForm.styles';
interface TrainerAssignmentSectionProps {
  sessions: Session[];
  clients: Client[];
  trainers: Trainer[];
  onAssignmentSuccess: () => void;
  toast: (toast: Omit<Toast, 'id'>) => void;
}
const TrainerAssignmentSection: React.FC<TrainerAssignmentSectionProps> = ({
  sessions,
  clients,
  trainers,
  onAssignmentSuccess,
  toast,
}) => {
  const [selectedTrainer, setSelectedTrainer] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [assignmentMode, setAssignmentMode] = useState<AssignmentMode>('single');
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [assignmentStats, setAssignmentStats] = useState<AssignmentStatistics | null>(null);
  const [openBulkDialog, setOpenBulkDialog] = useState(false);
  const unassignedSessions = getUnassignedSessions(sessions, selectedClient);
  useEffect(() => {
    const fetchAssignmentStats = async () => {
      try {
        const response = await services.sessionService.getAssignmentStatistics();
        if (response.success) setAssignmentStats(response.data);
      } catch (error) {
        logger.error('Error fetching assignment statistics:', error);
      }
    };
    fetchAssignmentStats();
  }, [sessions]);
  const handleAssignTrainer = async () => {
    if (!selectedTrainer || !selectedClient) {
      toast({
        title: 'Missing Information',
        description: 'Please select both a trainer and client.',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    try {
      const sessionIds = getAssignSessionIds(assignmentMode, selectedSessions);
      const response = await services.sessionService.assignTrainerToClient(selectedTrainer, selectedClient, sessionIds);
      if (!response.success) throw new Error(response.message);
      toast({ title: 'Assignment Successful', description: response.message, variant: 'default' });
      setSelectedTrainer('');
      setSelectedClient('');
      setSelectedSessions([]);
      setOpenBulkDialog(false);
      onAssignmentSuccess();
    } catch (error: unknown) {
      toast({
        title: 'Assignment Failed',
        description: getAssignmentErrorMessage(error, 'Failed to assign trainer'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAssignment = async (sessionIds: string[]) => {
    if (sessionIds.length === 0) return;
    setLoading(true);
    try {
      const response = await services.sessionService.removeTrainerAssignment(sessionIds);
      if (!response.success) throw new Error(response.message);
      toast({ title: 'Assignment Removed', description: response.message, variant: 'default' });
      onAssignmentSuccess();
    } catch (error: unknown) {
      toast({
        title: 'Removal Failed',
        description: getAssignmentErrorMessage(error, 'Failed to remove assignment'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const exportAssignmentReport = () => {
    const reportData = buildAssignmentReport(assignmentStats);
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = buildAssignmentReportFileName();
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const removeAssignedSessions = () => {
    const assignedSessionIds = getAssignedSessionIdsForRemoval(sessions);
    if (assignedSessionIds.length > 0) {
      handleRemoveAssignment(assignedSessionIds);
      return;
    }
    toast({
      title: 'No Assignments Found',
      description: 'No assigned sessions to remove.',
      variant: 'default',
    });
  };
  return (
    <div>
      {assignmentStats && (
        <AssignmentStatsGrid>
          {[
            { icon: CheckCircle, value: assignmentStats.sessionSummary?.assigned || 0, label: 'Assigned Sessions' },
            { icon: Clock, value: assignmentStats.sessionSummary?.available || 0, label: 'Unassigned Sessions' },
            { icon: User, value: trainers.length, label: 'Active Trainers' },
            { icon: Zap, value: `${assignmentStats.assignmentRate || 0}%`, label: 'Assignment Rate' },
          ].map(({ icon: Icon, value, label }) => (
            <StatsCard key={label}>
              <FlexRow $gap="1rem">
                <StatsIconContainer><Icon size={24} /></StatsIconContainer>
                <div>
                  <StatsValue>{value}</StatsValue>
                  <StatsLabel>{label}</StatsLabel>
                </div>
              </FlexRow>
            </StatsCard>
          ))}
        </AssignmentStatsGrid>
      )}
      <AssignmentGrid>
        <AssignmentPanel $accentColor="color-mix(in srgb, var(--accent-secondary, #8B5CF6) 32%, transparent)">
          <PanelHeading $color="var(--accent-secondary, #8B5CF6)">Assign Trainer to Client</PanelHeading>
          <FlexCol $gap="1rem">
            <FormField>
              <FormLabel htmlFor="assign-client-select">Select Client</FormLabel>
              <FormSelect id="assign-client-select" value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}>
                <option value="">Select a client...</option>
                {clients.map((client) => {
                  const assignClientSessionSignal = getClientSessionSignal(client);
                  return <option key={client.id} value={client.id}>{client.firstName} {client.lastName} - {assignClientSessionSignal.label}</option>;
                })}
              </FormSelect>
            </FormField>
            <FormField>
              <FormLabel htmlFor="assign-trainer-select">Select Trainer</FormLabel>
              <FormSelect id="assign-trainer-select" value={selectedTrainer} onChange={(e) => setSelectedTrainer(e.target.value)}>
                <option value="">Select a trainer...</option>
                {trainers.map((trainer) => (
                  <option key={trainer.id} value={trainer.id}>
                    {trainer.firstName} {trainer.lastName}{trainer.specialties ? ` - ${trainer.specialties}` : ''}
                  </option>
                ))}
              </FormSelect>
            </FormField>
            {selectedClient && (
              <div>
                <CellPrimaryText $bottom="0.5rem">Unassigned Sessions: {unassignedSessions.length}</CellPrimaryText>
                <FlexRow $gap="0.5rem" $bottom="1rem">
                  <GlowButton text="Assign All Available" theme={assignmentMode === 'single' ? 'accent' : 'ghost'} size="small" onClick={() => setAssignmentMode('single')} />
                  <GlowButton text="Select Specific" theme={assignmentMode === 'bulk' ? 'purple' : 'ghost'} size="small" onClick={() => { setAssignmentMode('bulk'); setOpenBulkDialog(true); }} />
                </FlexRow>
              </div>
            )}
            <GlowButton text={loading ? 'Assigning...' : 'Assign Trainer'} theme="emerald" size="medium" leftIcon={<User size={16} />} onClick={handleAssignTrainer} disabled={loading || !selectedTrainer || !selectedClient} fullWidth />
          </FlexCol>
        </AssignmentPanel>
        <AssignmentPanel $accentColor="color-mix(in srgb, var(--accent-luxury, #C6A84B) 32%, transparent)">
          <PanelHeading $color="var(--accent-luxury, #C6A84B)">Assignment Quick Actions</PanelHeading>
          <FlexCol $gap="1rem">
            <GlowButton text="View Assignment Statistics" theme="cosmic" size="small" leftIcon={<Eye size={16} />} onClick={() => logger.log('Assignment stats:', assignmentStats)} fullWidth />
            <GlowButton text="Bulk Remove Assignments" theme="red" size="small" leftIcon={<RefreshCw size={16} />} onClick={removeAssignedSessions} fullWidth />
            <GlowButton text="Export Assignment Report" theme="purple" size="small" leftIcon={<Download size={16} />} onClick={exportAssignmentReport} fullWidth />
          </FlexCol>
        </AssignmentPanel>
      </AssignmentGrid>
      <StyledDialog $open={openBulkDialog} onClick={() => setOpenBulkDialog(false)}>
        <DialogPanelNarrow onClick={(e: React.MouseEvent) => e.stopPropagation()} $maxWidth="700px">
          <DialogTitleBar>Select Sessions to Assign</DialogTitleBar>
          <DialogContentArea>
            <CellPrimaryText $bottom="1rem">Select specific sessions to assign to the trainer:</CellPrimaryText>
            {unassignedSessions.length > 0 ? (
              <ScrollableList>
                {unassignedSessions.map((session) => (
                  <SessionSelectItem key={session.id} $selected={selectedSessions.includes(session.id)} onClick={() => setSelectedSessions(prev => toggleSelectedSession(prev, session.id))}>
                    <SessionSelectIcon size={20} $selected={selectedSessions.includes(session.id)} />
                    <div>
                      <CellPrimaryText>Session {session.id} - {session.duration} minutes</CellPrimaryText>
                      <CellSecondaryText>Location: {session.location || 'Not specified'}</CellSecondaryText>
                    </div>
                  </SessionSelectItem>
                ))}
              </ScrollableList>
            ) : (
              <MutedText>No unassigned sessions available for this client.</MutedText>
            )}
            <CellPrimaryText $top="1rem">Selected: {selectedSessions.length} sessions</CellPrimaryText>
          </DialogContentArea>
          <DialogActionsBar>
            <GlowButton text="Cancel" theme="cosmic" size="small" onClick={() => { setOpenBulkDialog(false); setSelectedSessions([]); }} />
            <GlowButton text={`Assign ${selectedSessions.length} Sessions`} theme="emerald" size="small" onClick={() => { setAssignmentMode('bulk'); setOpenBulkDialog(false); }} disabled={selectedSessions.length === 0} />
          </DialogActionsBar>
        </DialogPanelNarrow>
      </StyledDialog>
    </div>
  );
};
export default TrainerAssignmentSection;
