import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  buildAssignmentMap,
  calculateAssignmentStats,
  filterUnassignedClients,
  getApiErrorMessage,
  groupAssignmentsByTrainer,
  parseAssignments,
  parseClients,
  parseTrainers,
} from './ClientTrainerAssignments.logic';
import {
  Banner,
  Board,
  Button,
  Header,
  HeaderActions,
  HeaderTitle,
  LoadingPanel,
  Panel,
  Root,
  Spinner,
} from './ClientTrainerAssignments.styles';
import type {
  AssignmentRow,
  ClientRow,
  ClientTrainerAssignmentsProps,
  TrainerRow,
} from './ClientTrainerAssignments.types';
import {
  AssignmentMetrics,
  AssignmentToolbar,
  TrainerZonesPanel,
  UnassignedClientsPanel,
} from './ClientTrainerAssignments.panels';

const ClientTrainerAssignments: React.FC<ClientTrainerAssignmentsProps> = ({ onAssignmentChange }) => {
  const { authAxios } = useAuth();
  const assignInFlightRef = useRef(false);
  const draggedClientIdRef = useRef<number | null>(null);
  const dropTrainerIdRef = useRef<number | null>(null);

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [trainers, setTrainers] = useState<TrainerRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedClientId, setDraggedClientId] = useState<number | null>(null);
  const [dropTrainerId, setDropTrainerId] = useState<number | null>(null);

  const setDraggedClient = useCallback((clientId: number | null) => {
    draggedClientIdRef.current = clientId;
    setDraggedClientId(clientId);
  }, []);

  const setDropTrainer = useCallback((trainerId: number | null) => {
    dropTrainerIdRef.current = trainerId;
    setDropTrainerId(trainerId);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [clientsRes, trainersRes, assignmentsRes] = await Promise.all([
        authAxios.get('/api/admin/clients', { params: { limit: 200 } }),
        authAxios.get('/api/admin/finance/trainers'),
        authAxios.get('/api/assignments', { params: { limit: 300 } }),
      ]);

      setClients(parseClients(clientsRes.data));
      setTrainers(parseTrainers(trainersRes.data));
      setAssignments(parseAssignments(assignmentsRes.data));
    } catch (err: any) {
      console.error('Failed to load assignment workspace', err);
      setError(getApiErrorMessage(err, 'Failed to load assignment data from server'));
      setClients([]);
      setTrainers([]);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const assignmentMapByClient = useMemo(() => buildAssignmentMap(assignments), [assignments]);
  const filteredUnassignedClients = useMemo(
    () => filterUnassignedClients(clients, assignmentMapByClient, search),
    [assignmentMapByClient, clients, search]
  );
  const assignmentsByTrainer = useMemo(
    () => groupAssignmentsByTrainer(assignments, trainers),
    [assignments, trainers]
  );
  const stats = useMemo(
    () => calculateAssignmentStats({ assignments, assignmentMapByClient, clients, trainers }),
    [assignmentMapByClient, assignments, clients, trainers]
  );

  const refreshAssignmentsOnly = useCallback(async () => {
    const response = await authAxios.get('/api/assignments', { params: { limit: 300 } });
    setAssignments(parseAssignments(response.data));
  }, [authAxios]);

  const handleAssign = useCallback(
    async (clientId: number, trainerId: number) => {
      if (saving) return;
      if (assignmentMapByClient.has(clientId)) {
        setError('Client is already assigned. Remove existing assignment first.');
        return;
      }

      const trainer = trainers.find((row) => row.id === trainerId);
      const trainerAssignments = assignmentsByTrainer.get(trainerId) || [];
      const capacity = Number(trainer?.maxClients || 15);
      if (trainerAssignments.length >= capacity) {
        setError(`${trainer?.firstName || 'Trainer'} is at maximum capacity.`);
        return;
      }

      setSaving(true);
      setError(null);
      try {
        await authAxios.post('/api/assignments', {
          clientId,
          trainerId,
          notes: 'Assigned via admin assignment board',
        });
        setSaving(false);
        await refreshAssignmentsOnly();
        onAssignmentChange?.();
      } catch (err: any) {
        console.error('Failed to assign client', err);
        setError(getApiErrorMessage(err, 'Failed to assign client to trainer'));
      } finally {
        setSaving(false);
      }
    },
    [assignmentMapByClient, assignmentsByTrainer, authAxios, onAssignmentChange, refreshAssignmentsOnly, saving, trainers]
  );

  const handleUnassign = useCallback(
    async (assignmentId: number) => {
      if (saving) return;
      setSaving(true);
      setError(null);
      try {
        await authAxios.delete(`/api/assignments/${assignmentId}`);
        await refreshAssignmentsOnly();
        onAssignmentChange?.();
      } catch (err: any) {
        console.error('Failed to unassign client', err);
        setError(getApiErrorMessage(err, 'Failed to remove assignment'));
      } finally {
        setSaving(false);
      }
    },
    [authAxios, onAssignmentChange, refreshAssignmentsOnly, saving]
  );

  const onDropToTrainer = async (trainerId: number, dropEvent?: React.DragEvent<HTMLDivElement>) => {
    if (assignInFlightRef.current) return;

    const fallbackClientIdRaw = dropEvent?.dataTransfer?.getData('text/plain');
    const fallbackClientId = fallbackClientIdRaw ? Number(fallbackClientIdRaw) : null;
    const resolvedClientId =
      draggedClientIdRef.current ??
      draggedClientId ??
      (Number.isFinite(fallbackClientId) ? fallbackClientId : null);

    if (!resolvedClientId) return;

    assignInFlightRef.current = true;
    try {
      await handleAssign(resolvedClientId, trainerId);
    } finally {
      assignInFlightRef.current = false;
      setDraggedClient(null);
      setDropTrainer(null);
    }
  };

  if (loading) {
    return (
      <Root>
        <LoadingPanel>
          <Spinner animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
        </LoadingPanel>
      </Root>
    );
  }

  return (
    <Root data-testid="assignment-board">
      <Header>
        <HeaderTitle>
          <h1>Client-Trainer Assignments</h1>
          <p>Production assignment board with live client, trainer, and assignment data.</p>
        </HeaderTitle>

        <HeaderActions>
          <Button onClick={loadAll} disabled={saving}>
            <RefreshCw size={15} />
            Refresh
          </Button>
        </HeaderActions>
      </Header>

      {error && (
        <Banner $tone="error">
          <AlertTriangle size={15} />
          {error}
        </Banner>
      )}

      {stats.unassigned > 0 && (
        <Banner $tone="warn">
          <AlertTriangle size={15} />
          {stats.unassigned} client{stats.unassigned === 1 ? '' : 's'} currently have no trainer assignment.
        </Banner>
      )}

      <AssignmentMetrics stats={stats} />
      <AssignmentToolbar search={search} onSearchChange={setSearch} />

      <Board>
        <Panel data-testid="unassigned-clients-panel">
          <UnassignedClientsPanel
            clients={filteredUnassignedClients}
            draggedClientId={draggedClientId}
            draggedClientIdRef={draggedClientIdRef}
            dropTrainerIdRef={dropTrainerIdRef}
            onDropToTrainer={onDropToTrainer}
            setDraggedClient={setDraggedClient}
            setDropTrainer={setDropTrainer}
          />
        </Panel>

        <Panel data-testid="trainer-zones-panel">
          <TrainerZonesPanel
            assignmentsByTrainer={assignmentsByTrainer}
            clients={clients}
            draggedClientIdRef={draggedClientIdRef}
            dropTrainerId={dropTrainerId}
            handleUnassign={handleUnassign}
            onDropToTrainer={onDropToTrainer}
            saving={saving}
            setDropTrainer={setDropTrainer}
            stats={stats}
            trainers={trainers}
          />
        </Panel>
      </Board>
    </Root>
  );
};

export default ClientTrainerAssignments;
