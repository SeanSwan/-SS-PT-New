import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Search,
  Sparkles,
  Unlink,
  UserPlus,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ClientTrainerAssignmentsProps {
  onAssignmentChange?: () => void;
}

interface AssignmentClient {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  availableSessions?: number;
  photo?: string | null;
}

interface AssignmentTrainer {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  photo?: string | null;
  maxClients?: number;
}

interface AssignmentRow {
  id: number;
  clientId: number;
  trainerId: number;
  status: 'active' | 'inactive' | 'pending';
  notes?: string | null;
  createdAt?: string;
  client?: AssignmentClient;
  trainer?: AssignmentTrainer;
}

interface ClientRow {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  availableSessions: number;
  isActive: boolean;
  photo?: string | null;
}

interface TrainerRow {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  photo?: string | null;
  maxClients?: number;
  isActive?: boolean;
}

const T = {
  midnightSapphire: '#002060',
  royalDepth: '#003080',
  swanLavender: '#4070C0',
  iceWing: '#60C0F0',
  arcticCyan: '#50A0F0',
  gildedFern: '#C6A84B',
  frostWhite: '#E0ECF4',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  glassSurface: 'linear-gradient(135deg, rgba(0, 48, 128, 0.45) 0%, rgba(0, 32, 96, 0.25) 100%)',
  glassBorder: 'rgba(198, 168, 75, 0.25)',
  textMuted: 'rgba(224, 236, 244, 0.65)',
};

const Root = styled.div`
  padding: 1.5rem;
  min-height: 100vh;
  color: ${T.frostWhite};
  background:
    radial-gradient(circle at 15% 15%, rgba(80, 160, 240, 0.12), transparent 48%),
    radial-gradient(circle at 85% 20%, rgba(198, 168, 75, 0.1), transparent 45%),
    linear-gradient(160deg, rgba(0, 48, 128, 0.18) 0%, rgba(0, 32, 96, 0.1) 100%);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
`;

const HeaderTitle = styled.div`
  h1 {
    margin: 0;
    font-size: 1.65rem;
    letter-spacing: -0.02em;
    background: linear-gradient(135deg, ${T.iceWing}, ${T.frostWhite} 45%, ${T.gildedFern});
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  p {
    margin: 0.3rem 0 0;
    color: ${T.textMuted};
    font-size: 0.9rem;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 0.65rem;
  flex-wrap: wrap;
`;

const Button = styled.button`
  min-height: 40px;
  border-radius: 10px;
  border: 1px solid ${T.glassBorder};
  background: ${T.glassSurface};
  color: ${T.frostWhite};
  padding: 0.45rem 0.9rem;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  cursor: pointer;

  &:hover {
    border-color: ${T.iceWing};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(150px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;

  @media (max-width: 1000px) {
    grid-template-columns: repeat(2, minmax(140px, 1fr));
  }
`;

const MetricCard = styled.div`
  border: 1px solid ${T.glassBorder};
  background: ${T.glassSurface};
  border-radius: 14px;
  padding: 0.8rem;

  .label {
    font-size: 0.74rem;
    color: ${T.textMuted};
    display: flex;
    align-items: center;
    gap: 0.35rem;
    margin-bottom: 0.2rem;
  }

  .value {
    font-size: 1.2rem;
    font-weight: 700;
    color: ${T.frostWhite};
  }
`;

const Toolbar = styled.div`
  border: 1px solid ${T.glassBorder};
  background: ${T.glassSurface};
  border-radius: 14px;
  padding: 0.75rem;
  margin-bottom: 1rem;
`;

const SearchWrap = styled.label`
  width: 100%;
  position: relative;
  display: block;

  svg {
    position: absolute;
    left: 0.65rem;
    top: 50%;
    transform: translateY(-50%);
    color: ${T.textMuted};
  }
`;

const SearchInput = styled.input`
  width: 100%;
  min-height: 40px;
  border-radius: 10px;
  border: 1px solid rgba(96, 192, 240, 0.25);
  background: rgba(0, 32, 96, 0.45);
  color: ${T.frostWhite};
  padding: 0.5rem 0.8rem 0.5rem 2rem;

  &::placeholder {
    color: ${T.textMuted};
  }

  &:focus {
    outline: none;
    border-color: ${T.iceWing};
  }
`;

const Board = styled.div`
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 1rem;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
`;

const Panel = styled.div`
  border: 1px solid ${T.glassBorder};
  background: ${T.glassSurface};
  border-radius: 16px;
  padding: 0.9rem;
`;

const PanelTitle = styled.h3`
  margin: 0 0 0.8rem;
  color: ${T.frostWhite};
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  max-height: 70vh;
  overflow: auto;
  padding-right: 0.2rem;
`;

const Card = styled(motion.div)<{ $dragging?: boolean }>`
  border: 1px solid rgba(96, 192, 240, 0.22);
  background: ${({ $dragging }) =>
    $dragging ? 'rgba(80, 160, 240, 0.22)' : 'rgba(0, 32, 96, 0.42)'};
  border-radius: 12px;
  padding: 0.65rem 0.75rem;
  cursor: grab;
`;

const NameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.55rem;
`;

const Avatar = styled.div<{ $src?: string | null }>`
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: ${({ $src }) =>
    $src
      ? `url(${$src}) center/cover no-repeat`
      : 'linear-gradient(135deg, rgba(80,160,240,0.8), rgba(198,168,75,0.7))'};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #041026;
  font-weight: 700;
  font-size: 0.75rem;
  flex-shrink: 0;
`;

const Person = styled.div`
  .name {
    color: ${T.frostWhite};
    font-size: 0.84rem;
    font-weight: 600;
  }

  .meta {
    color: ${T.textMuted};
    font-size: 0.73rem;
  }
`;

const TrainerGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(260px, 1fr));
  gap: 0.8rem;

  @media (max-width: 1300px) {
    grid-template-columns: 1fr;
  }
`;

const TrainerZone = styled.div<{ $activeDrop?: boolean }>`
  border: 1px solid ${({ $activeDrop }) => ($activeDrop ? T.iceWing : T.glassBorder)};
  background: ${({ $activeDrop }) =>
    $activeDrop ? 'rgba(80, 160, 240, 0.18)' : 'rgba(0, 32, 96, 0.33)'};
  border-radius: 14px;
  padding: 0.75rem;
  min-height: 180px;
`;

const TrainerHead = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.6rem;

  .title {
    color: ${T.frostWhite};
    font-size: 0.86rem;
    font-weight: 600;
  }

  .sub {
    color: ${T.textMuted};
    font-size: 0.72rem;
  }
`;

const Capacity = styled.span<{ $full?: boolean }>`
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  font-size: 0.7rem;
  border: 1px solid;
  color: ${({ $full }) => ($full ? T.warning : T.success)};
  border-color: ${({ $full }) => ($full ? 'rgba(245,158,11,0.4)' : 'rgba(34,197,94,0.4)')};
  background: ${({ $full }) => ($full ? 'rgba(245,158,11,0.12)' : 'rgba(34,197,94,0.12)')};
`;

const AssignmentItem = styled.div`
  border: 1px solid rgba(96, 192, 240, 0.2);
  background: rgba(0, 32, 96, 0.45);
  border-radius: 10px;
  padding: 0.5rem;
  margin-bottom: 0.45rem;

  .top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.45rem;
  }

  .name {
    color: ${T.frostWhite};
    font-size: 0.78rem;
    font-weight: 600;
  }

  .meta {
    color: ${T.textMuted};
    font-size: 0.7rem;
    margin-top: 0.2rem;
  }
`;

const IconButton = styled.button`
  width: 26px;
  height: 26px;
  border: 1px solid rgba(239, 68, 68, 0.35);
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.12);
  color: ${T.danger};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
`;

const Banner = styled.div<{ $tone: 'error' | 'warn' }>`
  border-radius: 10px;
  padding: 0.6rem 0.75rem;
  margin-bottom: 0.8rem;
  border: 1px solid;
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.8rem;

  ${({ $tone }) =>
    $tone === 'error'
      ? `background: rgba(239,68,68,0.12); border-color: rgba(239,68,68,0.35); color: ${T.danger};`
      : `background: rgba(245,158,11,0.12); border-color: rgba(245,158,11,0.35); color: ${T.warning};`}
`;

const Empty = styled.div`
  color: ${T.textMuted};
  font-size: 0.82rem;
  text-align: center;
  padding: 0.9rem 0.3rem;
`;

const Spinner = styled(motion.div)`
  width: 26px;
  height: 26px;
  border-radius: 999px;
  border: 3px solid rgba(96, 192, 240, 0.2);
  border-top-color: ${T.iceWing};
`;

const parseClients = (payload: any): ClientRow[] => {
  const rows = payload?.data?.clients;
  if (!Array.isArray(rows)) return [];
  return rows.map((client: any) => ({
    id: Number(client.id),
    firstName: client.firstName || '',
    lastName: client.lastName || '',
    email: client.email || '',
    availableSessions: Number(client.availableSessions || 0),
    isActive: Boolean(client.isActive),
    photo: client.photo || null,
  }));
};

const parseTrainers = (payload: any): TrainerRow[] => {
  const rows = Array.isArray(payload?.trainers) ? payload.trainers : [];
  return rows.map((trainer: any) => ({
    id: Number(trainer.id),
    firstName: trainer.firstName || '',
    lastName: trainer.lastName || '',
    email: trainer.email || '',
    photo: trainer.photo || null,
    maxClients: Number(trainer.maxClients || 15),
    isActive: trainer.isActive !== false,
  }));
};

const parseAssignments = (payload: any): AssignmentRow[] => {
  const rows = Array.isArray(payload?.assignments)
    ? payload.assignments
    : Array.isArray(payload)
      ? payload
      : [];

  return rows
    .map((row: any) => ({
      id: Number(row.id),
      clientId: Number(row.clientId),
      trainerId: Number(row.trainerId),
      status: (row.status || 'active') as AssignmentRow['status'],
      notes: row.notes || null,
      createdAt: row.createdAt,
      client: row.client,
      trainer: row.trainer,
    }))
    .filter((row: AssignmentRow) => row.status === 'active');
};

const initials = (firstName: string, lastName: string) => `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'U';

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
        authAxios.get('/api/admin/trainers'),
        authAxios.get('/api/assignments', { params: { limit: 300 } }),
      ]);

      setClients(parseClients(clientsRes.data));
      setTrainers(parseTrainers(trainersRes.data));
      setAssignments(parseAssignments(assignmentsRes.data));
    } catch (err: any) {
      console.error('Failed to load assignment workspace', err);
      setError(err?.response?.data?.message || 'Failed to load assignment data from server');
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

  const assignmentMapByClient = useMemo(() => {
    const map = new Map<number, AssignmentRow>();
    assignments.forEach((assignment) => map.set(assignment.clientId, assignment));
    return map;
  }, [assignments]);

  const filteredUnassignedClients = useMemo(() => {
    const term = search.trim().toLowerCase();

    return clients
      .filter((client) => !assignmentMapByClient.has(client.id))
      .filter((client) => {
        if (!term) return true;
        const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();
        return fullName.includes(term) || client.email.toLowerCase().includes(term);
      })
      .sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      });
  }, [clients, assignmentMapByClient, search]);

  const assignmentsByTrainer = useMemo(() => {
    const grouped = new Map<number, AssignmentRow[]>();
    trainers.forEach((trainer) => grouped.set(trainer.id, []));
    assignments.forEach((assignment) => {
      const rows = grouped.get(assignment.trainerId);
      if (rows) rows.push(assignment);
    });
    return grouped;
  }, [assignments, trainers]);

  const stats = useMemo(() => {
    const totalCapacity = trainers.reduce((sum, trainer) => sum + Number(trainer.maxClients || 15), 0);
    const activeAssignments = assignments.length;
    const unassigned = clients.filter((client) => !assignmentMapByClient.has(client.id)).length;
    const utilization = totalCapacity > 0 ? Math.round((activeAssignments / totalCapacity) * 100) : 0;
    const averageLoad = trainers.length > 0 ? Number((activeAssignments / trainers.length).toFixed(1)) : 0;

    return {
      activeAssignments,
      unassigned,
      utilization,
      averageLoad,
      totalTrainers: trainers.length,
    };
  }, [assignments.length, assignmentMapByClient, clients, trainers]);

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
        // Release action lock before refresh so follow-up actions are not blocked.
        setSaving(false);
        await refreshAssignmentsOnly();
        onAssignmentChange?.();
      } catch (err: any) {
        console.error('Failed to assign client', err);
        setError(err?.response?.data?.message || 'Failed to assign client to trainer');
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
        setError(err?.response?.data?.message || 'Failed to remove assignment');
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
        <Panel style={{ display: 'grid', placeItems: 'center', minHeight: '260px' }}>
          <Spinner animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
        </Panel>
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

      <MetricsGrid>
        <MetricCard>
          <div className="label"><CheckCircle size={12} /> Active Assignments</div>
          <div className="value">{stats.activeAssignments}</div>
        </MetricCard>
        <MetricCard>
          <div className="label"><Users size={12} /> Unassigned Clients</div>
          <div className="value">{stats.unassigned}</div>
        </MetricCard>
        <MetricCard>
          <div className="label"><Activity size={12} /> Capacity Utilization</div>
          <div className="value">{stats.utilization}%</div>
        </MetricCard>
        <MetricCard>
          <div className="label"><Sparkles size={12} /> Avg Load/Trainer</div>
          <div className="value">{stats.averageLoad}</div>
        </MetricCard>
      </MetricsGrid>

      <Toolbar>
        <SearchWrap>
          <Search size={14} />
          <SearchInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search unassigned clients by name or email"
          />
        </SearchWrap>
      </Toolbar>

      <Board>
        <Panel data-testid="unassigned-clients-panel">
          <PanelTitle>
            <UserPlus size={16} />
            Unassigned Clients ({filteredUnassignedClients.length})
          </PanelTitle>

          <List>
            {filteredUnassignedClients.length === 0 ? (
              <Empty>All clients are currently assigned.</Empty>
            ) : (
              filteredUnassignedClients.map((client) => (
                <Card
                  key={client.id}
                  data-testid={`unassigned-client-${client.id}`}
                  draggable
                  onPointerDown={() => {
                    setDraggedClient(client.id);
                  }}
                  onDragStart={(event) => {
                    event.dataTransfer.setData('text/plain', String(client.id));
                    event.dataTransfer.effectAllowed = 'move';
                    setDraggedClient(client.id);
                  }}
                  onDragEnd={(event) => {
                    let fallbackTrainerId = dropTrainerIdRef.current;
                    if (fallbackTrainerId === null && event.clientX > 0 && event.clientY > 0) {
                      const zone = document
                        .elementFromPoint(event.clientX, event.clientY)
                        ?.closest('[data-testid^="trainer-zone-"]');
                      const zoneTestId = zone?.getAttribute('data-testid') || '';
                      const parsedTrainerId = Number(zoneTestId.replace('trainer-zone-', ''));
                      if (Number.isFinite(parsedTrainerId)) {
                        fallbackTrainerId = parsedTrainerId;
                      }
                    }

                    // Fallback for environments where drop event isn't emitted reliably.
                    if (fallbackTrainerId !== null && draggedClientIdRef.current === client.id) {
                      void onDropToTrainer(fallbackTrainerId);
                      return;
                    }
                    setDraggedClient(null);
                    setDropTrainer(null);
                  }}
                  $dragging={draggedClientId === client.id}
                  whileHover={{ y: -2 }}
                >
                  <NameRow>
                    <Avatar $src={client.photo}>{!client.photo && initials(client.firstName, client.lastName)}</Avatar>
                    <Person>
                      <div className="name">{client.firstName} {client.lastName}</div>
                      <div className="meta">{client.email}</div>
                      <div className="meta">{client.availableSessions} sessions available</div>
                    </Person>
                  </NameRow>
                </Card>
              ))
            )}
          </List>
        </Panel>

        <Panel data-testid="trainer-zones-panel">
          <PanelTitle>
            <Users size={16} />
            Trainers ({stats.totalTrainers})
          </PanelTitle>

          {trainers.length === 0 ? (
            <Empty>No trainers found.</Empty>
          ) : (
            <TrainerGrid>
              {trainers.map((trainer) => {
                const trainerAssignments = assignmentsByTrainer.get(trainer.id) || [];
                const capacity = Number(trainer.maxClients || 15);
                const isFull = trainerAssignments.length >= capacity;

                return (
                  <TrainerZone
                    key={trainer.id}
                    data-testid={`trainer-zone-${trainer.id}`}
                    $activeDrop={dropTrainerId === trainer.id}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = 'move';
                      if (!isFull) {
                        setDropTrainer(trainer.id);
                      }
                    }}
                    onDragLeave={() => setDropTrainer(null)}
                    onPointerUp={() => {
                      if (!isFull && draggedClientIdRef.current !== null) {
                        void onDropToTrainer(trainer.id);
                      }
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (!isFull) {
                        void onDropToTrainer(trainer.id, event);
                      }
                    }}
                  >
                    <TrainerHead>
                      <div>
                        <div className="title">{trainer.firstName} {trainer.lastName}</div>
                        <div className="sub">{trainer.email}</div>
                      </div>
                      <Capacity $full={isFull}>
                        {trainerAssignments.length}/{capacity}
                      </Capacity>
                    </TrainerHead>

                    {trainerAssignments.length === 0 ? (
                      <Empty>{isFull ? 'Trainer is at capacity.' : 'Drop a client here to assign.'}</Empty>
                    ) : (
                      trainerAssignments.map((assignment) => {
                        const client = clients.find((row) => row.id === assignment.clientId) || assignment.client;
                        if (!client) return null;

                        return (
                          <AssignmentItem
                            key={assignment.id}
                            data-testid={`assigned-client-${assignment.clientId}`}
                          >
                            <div className="top">
                              <div className="name">{client.firstName} {client.lastName}</div>
                              <IconButton
                                data-testid={`remove-assignment-${assignment.id}`}
                                onClick={() => handleUnassign(assignment.id)}
                                title="Remove assignment"
                                disabled={saving}
                              >
                                <Unlink size={14} />
                              </IconButton>
                            </div>
                            <div className="meta">{client.email}</div>
                            <div className="meta">
                              {Number(client.availableSessions || 0)} sessions available
                            </div>
                          </AssignmentItem>
                        );
                      })
                    )}
                  </TrainerZone>
                );
              })}
            </TrainerGrid>
          )}
        </Panel>
      </Board>
    </Root>
  );
};

export default ClientTrainerAssignments;
