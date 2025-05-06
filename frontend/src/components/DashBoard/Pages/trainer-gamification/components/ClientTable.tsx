import React from 'react';
import { 
  Avatar,
  Box, 
  Button, 
  Chip, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Typography, 
  Paper 
} from '@mui/material';
import { Star, Zap, Plus, Trophy, User } from 'lucide-react';

// Define the client interface
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

/**
 * ClientTable Component
 * Displays a table of clients with their points, level, tier, and streak information
 */
const ClientTable: React.FC<ClientTableProps> = ({ 
  clients, 
  onAwardPoints, 
  onAwardAchievement 
}) => {
  if (clients.length === 0) {
    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Client</TableCell>
              <TableCell>Current Points</TableCell>
              <TableCell>Level</TableCell>
              <TableCell>Tier</TableCell>
              <TableCell>Streak</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                <Typography variant="body1" color="text.secondary">
                  No clients found
                </Typography>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Client</TableCell>
            <TableCell>Current Points</TableCell>
            <TableCell>Level</TableCell>
            <TableCell>Tier</TableCell>
            <TableCell>Streak</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {clients.map((client) => (
            <TableRow key={client.id}>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ mr: 1 }}>
                    {client.firstName[0]}{client.lastName[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="body1">
                      {client.firstName} {client.lastName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      @{client.username}
                    </Typography>
                  </Box>
                </Box>
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Star size={16} color="#FFC107" />
                  <Typography variant="body1" fontWeight="bold">
                    {client.points.toLocaleString()}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Chip 
                  label={`Level ${client.level}`}
                  color="primary" 
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Chip 
                  label={client.tier.toUpperCase()} 
                  color={
                    client.tier === 'bronze' ? 'default' :
                    client.tier === 'silver' ? 'primary' :
                    client.tier === 'gold' ? 'warning' :
                    'secondary'
                  }
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Zap size={16} color={client.streakDays > 0 ? "#1976D2" : "#9E9E9E"} />
                  <Typography variant="body1" color={client.streakDays > 0 ? "primary" : "text.secondary"}>
                    {client.streakDays} day{client.streakDays !== 1 ? 's' : ''}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Plus size={16} />}
                    onClick={() => onAwardPoints(client)}
                  >
                    Award Points
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    color="secondary"
                    startIcon={<Trophy size={16} />}
                    onClick={() => onAwardAchievement(client)}
                  >
                    Achievement
                  </Button>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ClientTable;