import React from 'react';
import styled from 'styled-components';
import { Star, Zap, Plus, Trophy } from 'lucide-react';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  photo?: string;
  points: number;
  level: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  streakDays: number;
}

interface ClientTableProps {
  clients: Client[];
  onAwardPoints: (client: Client) => void;
  onAwardAchievement: (client: Client) => void;
}

const TIER_COLORS: Record<string, string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#E5E4E2'
};

const TableWrapper = styled.div`
  border-radius: 12px;
  background: rgba(29, 31, 43, 0.8);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Th = styled.th`
  padding: 12px 16px;
  text-align: left;
  font-size: 0.8125rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  white-space: nowrap;
`;

const Td = styled.td`
  padding: 12px 16px;
  font-size: 0.875rem;
  color: white;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  vertical-align: middle;
`;

const EmptyTd = styled.td`
  padding: 24px 16px;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  font-size: 1rem;
`;

const ClientInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const ClientAvatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(0, 255, 255, 0.2);
  color: #00ffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8125rem;
  font-weight: 600;
  flex-shrink: 0;
`;

const ClientName = styled.span`
  font-weight: 500;
  color: white;
  display: block;
`;

const ClientUsername = styled.span`
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.5);
`;

const PointsCell = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: bold;
`;

const Badge = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${props => props.$color}20;
  color: ${props => props.$color};
`;

const StreakCell = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  color: ${props => props.$active ? '#00ffff' : 'rgba(255, 255, 255, 0.4)'};
`;

const ActionsCell = styled.div`
  display: flex;
  gap: 8px;
`;

const ActionBtn = styled.button<{ $variant?: 'secondary' }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  min-height: 36px;
  border-radius: 6px;
  border: 1px solid ${props => props.$variant === 'secondary' ? 'rgba(120, 81, 169, 0.4)' : 'rgba(0, 255, 255, 0.4)'};
  background: transparent;
  color: ${props => props.$variant === 'secondary' ? '#7851a9' : '#00ffff'};
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    background: ${props => props.$variant === 'secondary' ? 'rgba(120, 81, 169, 0.1)' : 'rgba(0, 255, 255, 0.1)'};
  }
`;

/**
 * ClientTable Component
 * Displays a table of clients with their points, level, tier, and streak information
 */
const ClientTable: React.FC<ClientTableProps> = ({
  clients,
  onAwardPoints,
  onAwardAchievement
}) => {
  const renderTable = (rows: React.ReactNode) => (
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
        <tbody>{rows}</tbody>
      </Table>
    </TableWrapper>
  );

  if (clients.length === 0) {
    return renderTable(
      <tr>
        <EmptyTd colSpan={6}>No clients found</EmptyTd>
      </tr>
    );
  }

  return renderTable(
    clients.map((client) => (
      <tr key={client.id}>
        <Td>
          <ClientInfo>
            <ClientAvatar>
              {client.firstName[0]}{client.lastName[0]}
            </ClientAvatar>
            <div>
              <ClientName>{client.firstName} {client.lastName}</ClientName>
              <ClientUsername>@{client.username}</ClientUsername>
            </div>
          </ClientInfo>
        </Td>
        <Td>
          <PointsCell>
            <Star size={16} color="#FFC107" />
            {client.points.toLocaleString()}
          </PointsCell>
        </Td>
        <Td>
          <Badge $color="#00ffff">Level {client.level}</Badge>
        </Td>
        <Td>
          <Badge $color={TIER_COLORS[client.tier] || '#00ffff'}>
            {client.tier.toUpperCase()}
          </Badge>
        </Td>
        <Td>
          <StreakCell $active={client.streakDays > 0}>
            <Zap size={16} />
            {client.streakDays} day{client.streakDays !== 1 ? 's' : ''}
          </StreakCell>
        </Td>
        <Td>
          <ActionsCell>
            <ActionBtn onClick={() => onAwardPoints(client)}>
              <Plus size={16} /> Award Points
            </ActionBtn>
            <ActionBtn $variant="secondary" onClick={() => onAwardAchievement(client)}>
              <Trophy size={16} /> Achievement
            </ActionBtn>
          </ActionsCell>
        </Td>
      </tr>
    ))
  );
};

export default ClientTable;
