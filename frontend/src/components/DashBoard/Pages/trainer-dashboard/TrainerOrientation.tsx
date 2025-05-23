/**
 * TrainerOrientation.tsx
 * Component for trainers to view and manage client orientations
 */
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Tabs,
  Tab,
  Badge
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CompleteIcon,
  Cancel as CancelIcon,
  Search as SearchIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon
} from '@mui/icons-material';
import { useAuth } from '../../../../context/AuthContext';

// Mock data for demonstration - replace with actual API calls
const mockOrientations = [
  {
    id: 1,
    fullName: 'John Doe',
    email: 'john@example.com',
    phone: '(555) 123-4567',
    status: 'pending',
    submittedAt: '2024-01-15T10:30:00Z',
    assignedTrainer: null,
    healthInfo: 'No previous injuries. Wants to build muscle.',
    trainingGoals: 'Build muscle and improve strength',
    experienceLevel: 'Beginner',
    waiverInitials: 'JD'
  },
  {
    id: 2,
    fullName: 'Jane Smith',
    email: 'jane@example.com',
    phone: '(555) 987-6543',
    status: 'scheduled',
    submittedAt: '2024-01-14T14:15:00Z',
    assignedTrainer: 'Sean Swan',
    scheduledDate: '2024-01-20T09:00:00Z',
    healthInfo: 'Previous ankle injury. Working on flexibility.',
    trainingGoals: 'Improve flexibility and overall fitness',
    experienceLevel: 'Intermediate',
    waiverInitials: 'JS'
  },
  {
    id: 3,
    fullName: 'Mike Johnson',
    email: 'mike@example.com',
    phone: '(555) 456-7890',
    status: 'completed',
    submittedAt: '2024-01-12T16:45:00Z',
    assignedTrainer: 'Sean Swan',
    completedDate: '2024-01-18T11:00:00Z',
    healthInfo: 'History of back problems. Needs proper form guidance.',
    trainingGoals: 'Lose weight and strengthen core',
    experienceLevel: 'Beginner',
    waiverInitials: 'MJ'
  }
];

interface Orientation {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled';
  submittedAt: string;
  assignedTrainer?: string | null;
  scheduledDate?: string;
  completedDate?: string;
  healthInfo: string;
  trainingGoals: string;
  experienceLevel: string;
  waiverInitials: string;
}

/**
 * TrainerOrientation Component
 * Allows trainers to view and manage client orientations assigned to them
 */
const TrainerOrientation: React.FC = () => {
  const { user } = useAuth();
  const [orientations, setOrientations] = useState<Orientation[]>(mockOrientations);
  const [selectedOrientation, setSelectedOrientation] = useState<Orientation | null>(null);
  const [detailDialog, setDetailDialog] = useState(false);
  const [scheduleDialog, setScheduleDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [tabValue, setTabValue] = useState(0);
  
  // Filter orientations based on status and search term
  const filteredOrientations = orientations.filter(orientation => {
    const matchesStatus = filterStatus === 'all' || orientation.status === filterStatus;
    const matchesSearch = searchTerm === '' || 
      orientation.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      orientation.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Show based on tab selection
    if (tabValue === 0) {
      // All orientations assigned to this trainer
      return matchesStatus && matchesSearch && orientation.assignedTrainer === user?.name;
    } else if (tabValue === 1) {
      // Pending orientations that need assignment
      return orientation.status === 'pending' && !orientation.assignedTrainer && matchesSearch;
    } else {
      // All orientations (admin view)
      return matchesStatus && matchesSearch;
    }
  });
  
  // Get counts for badges
  const getCounts = () => {
    const myOrientations = orientations.filter(o => o.assignedTrainer === user?.name);
    const pendingAssignment = orientations.filter(o => o.status === 'pending' && !o.assignedTrainer);
    
    return {
      my: myOrientations.length,
      pending: pendingAssignment.length,
      all: orientations.length
    };
  };
  
  const counts = getCounts();
  
  // Handle viewing orientation details
  const handleViewDetails = (orientation: Orientation) => {
    setSelectedOrientation(orientation);
    setDetailDialog(true);
  };
  
  // Handle scheduling orientation
  const handleSchedule = (orientation: Orientation) => {
    setSelectedOrientation(orientation);
    setScheduleDialog(true);
    setSelectedDate('');
  };
  
  // Handle completing orientation
  const handleComplete = (orientationId: number) => {
    setOrientations(prev => prev.map(o => 
      o.id === orientationId 
        ? { ...o, status: 'completed', completedDate: new Date().toISOString() }
        : o
    ));
  };
  
  // Handle taking assignment of unassigned orientation
  const handleTakeAssignment = (orientationId: number) => {
    setOrientations(prev => prev.map(o => 
      o.id === orientationId 
        ? { ...o, assignedTrainer: user?.name || '', status: 'scheduled' }
        : o
    ));
  };
  
  // Handle saving scheduled date
  const handleSaveSchedule = () => {
    if (selectedOrientation && selectedDate) {
      setOrientations(prev => prev.map(o => 
        o.id === selectedOrientation.id 
          ? { ...o, status: 'scheduled', scheduledDate: selectedDate }
          : o
      ));
      setScheduleDialog(false);
    }
  };
  
  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'scheduled': return 'info';
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h4" gutterBottom>
            Client Orientations
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Manage client orientation requests and schedule initial consultations
          </Typography>
          
          {/* Tabs */}
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} sx={{ mt: 2 }}>
            <Tab 
              label={
                <Badge badgeContent={counts.my} color="primary">
                  My Orientations
                </Badge>
              } 
            />
            <Tab 
              label={
                <Badge badgeContent={counts.pending} color="warning">
                  Needs Assignment
                </Badge>
              } 
            />
            <Tab 
              label={
                <Badge badgeContent={counts.all} color="info">
                  All Orientations
                </Badge>
              } 
            />
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Filters and Search */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Search orientations"
                variant="outlined"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon color="action" />,
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Status Filter</InputLabel>
                <Select
                  value={filterStatus}
                  label="Status Filter"
                  onChange={(e) => setFilterStatus(e.target.value as string)}
                >
                  <MenuItem value="all">All Statuses</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="scheduled">Scheduled</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      
      {/* Orientations Table */}
      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Client</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Submitted</TableCell>
                  <TableCell>Assigned Trainer</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredOrientations.map((orientation) => (
                  <TableRow key={orientation.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PersonIcon color="action" />
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {orientation.fullName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {orientation.experienceLevel}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <EmailIcon fontSize="small" color="action" />
                          <Typography variant="body2">{orientation.email}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PhoneIcon fontSize="small" color="action" />
                          <Typography variant="body2">{orientation.phone}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={orientation.status.charAt(0).toUpperCase() + orientation.status.slice(1)}
                        color={getStatusColor(orientation.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(orientation.submittedAt)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {orientation.assignedTrainer || 'Unassigned'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton 
                          size="small" 
                          onClick={() => handleViewDetails(orientation)}
                          title="View Details"
                        >
                          <ViewIcon />
                        </IconButton>
                        
                        {orientation.status === 'pending' && !orientation.assignedTrainer && (
                          <IconButton 
                            size="small" 
                            onClick={() => handleTakeAssignment(orientation.id)}
                            title="Take Assignment"
                            color="primary"
                          >
                            <AssignmentIcon />
                          </IconButton>
                        )}
                        
                        {orientation.status === 'scheduled' && orientation.assignedTrainer === user?.name && (
                          <IconButton 
                            size="small" 
                            onClick={() => handleComplete(orientation.id)}
                            title="Mark as Completed"
                            color="success"
                          >
                            <CompleteIcon />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          {filteredOrientations.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                No orientations found matching your criteria.
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
      
      {/* Detail Dialog */}
      <Dialog open={detailDialog} onClose={() => setDetailDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Orientation Details - {selectedOrientation?.fullName}
        </DialogTitle>
        <DialogContent>
          {selectedOrientation && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Contact Information</Typography>
                <Typography><strong>Name:</strong> {selectedOrientation.fullName}</Typography>
                <Typography><strong>Email:</strong> {selectedOrientation.email}</Typography>
                <Typography><strong>Phone:</strong> {selectedOrientation.phone}</Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Training Information</Typography>
                <Typography><strong>Experience Level:</strong> {selectedOrientation.experienceLevel}</Typography>
                <Typography><strong>Waiver Initials:</strong> {selectedOrientation.waiverInitials}</Typography>
                {selectedOrientation.assignedTrainer && (
                  <Typography><strong>Assigned Trainer:</strong> {selectedOrientation.assignedTrainer}</Typography>
                )}
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Health Information</Typography>
                <Typography>{selectedOrientation.healthInfo}</Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Training Goals</Typography>
                <Typography>{selectedOrientation.trainingGoals}</Typography>
              </Grid>
              
              {selectedOrientation.scheduledDate && (
                <Grid item xs={12}>
                  <Alert severity="info">
                    <strong>Scheduled for:</strong> {formatDate(selectedOrientation.scheduledDate)}
                  </Alert>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog(false)}>Close</Button>
          {selectedOrientation?.status === 'scheduled' && selectedOrientation?.assignedTrainer === user?.name && (
            <Button 
              variant="contained" 
              color="success"
              onClick={() => {
                handleComplete(selectedOrientation.id);
                setDetailDialog(false);
              }}
            >
              Mark as Completed
            </Button>
          )}
        </DialogActions>
      </Dialog>
      
      {/* Schedule Dialog */}
      <Dialog open={scheduleDialog} onClose={() => setScheduleDialog(false)}>
        <DialogTitle>Schedule Orientation</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Schedule orientation for {selectedOrientation?.fullName}
          </Typography>
          <TextField
            fullWidth
            type="datetime-local"
            label="Orientation Date & Time"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            sx={{ mt: 2 }}
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleSaveSchedule}
            disabled={!selectedDate}
          >
            Schedule
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TrainerOrientation;