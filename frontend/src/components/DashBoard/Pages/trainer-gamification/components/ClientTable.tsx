import React from 'react';
import { Plus, Star, Trophy, Zap } from 'lucide-react';
import type { Client } from '../hooks/useTrainerGamification';
import {
  ActionBtn,
  ActionsCell,
  ClientAvatar,
  ClientInfo,
  ClientName,
  ClientUsername,
  EmptyTd,
  PointsCell,
  StreakCell,
  Table,
  TableWrapper,
  Td,
  Th,
  TierBadge,
} from './trainer-gamification-components.styles';

interface ClientTableProps {
  clients: Client[];
  onAwardPoints: (client: Client) => void;
  onAwardAchievement: (client: Client) => void;
}

const clientInitials = (client: Client) => (
  `${client.firstName.charAt(0)}${client.lastName.charAt(0)}`.toUpperCase()
);

const ClientTable: React.FC<ClientTableProps> = ({ clients, onAwardPoints, onAwardAchievement }) => {
  const renderRows = () => {
    if (clients.length === 0) {
      return <tr><EmptyTd colSpan={6}>No clients found</EmptyTd></tr>;
    }

    return clients.map((client) => (
      <tr key={client.id}>
        <Td>
          <ClientInfo>
            <ClientAvatar>{clientInitials(client)}</ClientAvatar>
            <div>
              <ClientName>{client.firstName} {client.lastName}</ClientName>
              <ClientUsername>@{client.username}</ClientUsername>
            </div>
          </ClientInfo>
        </Td>
        <Td><PointsCell><Star size={16} /> {client.points.toLocaleString()}</PointsCell></Td>
        <Td><TierBadge>Level {client.level}</TierBadge></Td>
        <Td><TierBadge $tier={client.tier}>{client.tier.toUpperCase()}</TierBadge></Td>
        <Td>
          <StreakCell $active={client.streakDays > 0}>
            <Zap size={16} /> {client.streakDays} day{client.streakDays !== 1 ? 's' : ''}
          </StreakCell>
        </Td>
        <Td>
          <ActionsCell>
            <ActionBtn type="button" onClick={() => onAwardPoints(client)}>
              <Plus size={16} /> Award Points
            </ActionBtn>
            <ActionBtn type="button" $variant="secondary" onClick={() => onAwardAchievement(client)}>
              <Trophy size={16} /> Achievement
            </ActionBtn>
          </ActionsCell>
        </Td>
      </tr>
    ));
  };

  return (
    <TableWrapper>
      <Table>
        <thead>
          <tr>
            <Th>Client</Th>
            <Th>Current Points</Th>
            <Th>Level</Th>
            <Th>Tier</Th>
            <Th>Streak</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>{renderRows()}</tbody>
      </Table>
    </TableWrapper>
  );
};

export default ClientTable;
