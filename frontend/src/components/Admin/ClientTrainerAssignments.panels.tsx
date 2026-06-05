import type { DragEvent, MutableRefObject } from 'react';
import { Activity, CheckCircle, Search, Sparkles, Unlink, UserPlus, Users } from 'lucide-react';
import { getClientSessionSignal } from '../DashBoard/workspaces/clients-team/clientSessionSignal';
import { initials } from './ClientTrainerAssignments.logic';
import {
  Avatar,
  Card,
  List,
  MetricCard,
  MetricsGrid,
  NameRow,
  PanelTitle,
  Person,
  SearchInput,
  SearchWrap,
  Toolbar,
  TrainerGrid,
} from './ClientTrainerAssignments.styles';
import {
  AssignmentItem,
  Capacity,
  Empty,
  IconButton,
  TrainerHead,
  TrainerZone,
} from './ClientTrainerAssignments.styles.tail';
import type { AssignmentRow, AssignmentStats, ClientRow, TrainerRow } from './ClientTrainerAssignments.types';

export const AssignmentMetrics = ({ stats }: { stats: AssignmentStats }) => (
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
);

export const AssignmentToolbar = ({
  search,
  onSearchChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
}) => (
  <Toolbar>
    <SearchWrap>
      <Search size={14} />
      <SearchInput
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search unassigned clients by name or email"
      />
    </SearchWrap>
  </Toolbar>
);

interface UnassignedClientsPanelProps {
  clients: ClientRow[];
  draggedClientId: number | null;
  draggedClientIdRef: MutableRefObject<number | null>;
  dropTrainerIdRef: MutableRefObject<number | null>;
  onDropToTrainer: (trainerId: number, dropEvent?: DragEvent<HTMLDivElement>) => Promise<void>;
  setDraggedClient: (clientId: number | null) => void;
  setDropTrainer: (trainerId: number | null) => void;
}

export const UnassignedClientsPanel = ({
  clients,
  draggedClientId,
  draggedClientIdRef,
  dropTrainerIdRef,
  onDropToTrainer,
  setDraggedClient,
  setDropTrainer,
}: UnassignedClientsPanelProps) => (
  <>
    <PanelTitle>
      <UserPlus size={16} />
      Unassigned Clients ({clients.length})
    </PanelTitle>

    <List>
      {clients.length === 0 ? (
        <Empty>All clients are currently assigned.</Empty>
      ) : (
        clients.map((client) => {
          const unassignedClientSessionSignal = getClientSessionSignal(client);

          return (
            <Card
              key={client.id}
              data-testid={`unassigned-client-${client.id}`}
              draggable
              onPointerDown={() => setDraggedClient(client.id)}
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
                  const parsedTrainerId = Number((zone?.getAttribute('data-testid') || '').replace('trainer-zone-', ''));
                  if (Number.isFinite(parsedTrainerId)) fallbackTrainerId = parsedTrainerId;
                }

                if (fallbackTrainerId !== null && draggedClientIdRef.current === client.id) {
                  void onDropToTrainer(fallbackTrainerId);
                  return;
                }
                setDraggedClient(null);
                setDropTrainer(null);
              }}
              $dragging={draggedClientId === client.id}
            >
              <NameRow>
                <Avatar $src={client.photo}>{!client.photo && initials(client.firstName, client.lastName)}</Avatar>
                <Person>
                  <div className="name">{client.firstName} {client.lastName}</div>
                  <div className="meta">{client.email}</div>
                  <div className="meta" title={unassignedClientSessionSignal.note}>
                    {unassignedClientSessionSignal.label}
                  </div>
                </Person>
              </NameRow>
            </Card>
          );
        })
      )}
    </List>
  </>
);

interface TrainerZonesPanelProps {
  assignmentsByTrainer: Map<number, AssignmentRow[]>;
  clients: ClientRow[];
  draggedClientIdRef: MutableRefObject<number | null>;
  dropTrainerId: number | null;
  handleUnassign: (assignmentId: number) => void;
  onDropToTrainer: (trainerId: number, dropEvent?: DragEvent<HTMLDivElement>) => Promise<void>;
  saving: boolean;
  setDropTrainer: (trainerId: number | null) => void;
  stats: AssignmentStats;
  trainers: TrainerRow[];
}

export const TrainerZonesPanel = ({
  assignmentsByTrainer,
  clients,
  draggedClientIdRef,
  dropTrainerId,
  handleUnassign,
  onDropToTrainer,
  saving,
  setDropTrainer,
  stats,
  trainers,
}: TrainerZonesPanelProps) => (
  <>
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
                if (!isFull) setDropTrainer(trainer.id);
              }}
              onDragLeave={() => setDropTrainer(null)}
              onPointerUp={() => {
                if (!isFull && draggedClientIdRef.current !== null) void onDropToTrainer(trainer.id);
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (!isFull) void onDropToTrainer(trainer.id, event);
              }}
            >
              <TrainerHead>
                <div>
                  <div className="title">{trainer.firstName} {trainer.lastName}</div>
                  <div className="sub">{trainer.email}</div>
                </div>
                <Capacity $full={isFull}>{trainerAssignments.length}/{capacity}</Capacity>
              </TrainerHead>

              {trainerAssignments.length === 0 ? (
                <Empty>{isFull ? 'Trainer is at capacity.' : 'Drop a client here to assign.'}</Empty>
              ) : (
                trainerAssignments.map((assignment) => {
                  const client = clients.find((row) => row.id === assignment.clientId) || assignment.client;
                  if (!client) return null;
                  const assignedClientSessionSignal = getClientSessionSignal(client);

                  return (
                    <AssignmentItem key={assignment.id} data-testid={`assigned-client-${assignment.clientId}`}>
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
                      <div className="meta" title={assignedClientSessionSignal.note}>
                        {assignedClientSessionSignal.label}
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
  </>
);
