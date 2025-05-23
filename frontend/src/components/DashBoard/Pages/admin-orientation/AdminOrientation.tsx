/**
 * AdminOrientation.tsx
 * Component for admins to view and manage all client orientations
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
  Badge,
  Autocomplete
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
  Phone as PhoneIcon,
  Add as AddIcon,
  Edit as EditIcon
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
    waiverInitials: 'JD',
    source: 'website'
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
    waiverInitials: 'JS',
    source: 'website'
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
    waiverInitials: 'MJ',
    source: 'website'
  }
];

// Mock trainers data
const mockTrainers = [
  { id: 1, name: 'Sean Swan', specialties: ['Strength Training', 'Flexibility'] },
  { id: 2, name: 'Sarah Johnson', specialties: ['Cardio', 'Weight Loss'] },
  { id: 3, name: 'Mike Chen', specialties: ['PowerLifting', 'Sports Training'] }
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
  source: string;
}

/**
 * AdminOrientation Component
 * Comprehensive orientation management for administrators
 */
const AdminOrientation: React.FC = () => {
  const { user } = useAuth();
  const [orientations, setOrientations] = useState<Orientation[]>(mockOrientations);
  const [selectedOrientation, setSelectedOrientation] = useState<Orientation | null>(null);
  const [detailDialog, setDetailDialog] = useState(false);
  const [assignDialog, setAssignDialog] = useState(false);
  const [scheduleDialog, setScheduleDialog] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTrainer, setFilterTrainer] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [tabValue, setTabValue] = useState(0);
  
  // Filter orientations based on criteria
  const filteredOrientations = orientations.filter(orientation => {
    const matchesStatus = filterStatus === 'all' || orientation.status === filterStatus;
    const matchesTrainer = filterTrainer === 'all' || orientation.assignedTrainer === filterTrainer;
    const matchesSearch = searchTerm === '' || 
      orientation.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      orientation.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Show based on tab selection
    if (tabValue === 0) {
      // All orientations
      return matchesStatus && matchesTrainer && matchesSearch;
    } else if (tabValue === 1) {
      // Pending orientations
      return orientation.status === 'pending' && matchesSearch;
    } else if (tabValue === 2) {
      // Scheduled orientations
      return orientation.status === 'scheduled' && matchesTrainer && matchesSearch;
    } else {
      // Completed orientations
      return orientation.status === 'completed' && matchesTrainer && matchesSearch;
    }
  });
  
  // Get counts for badges
  const getCounts = () => {
    return {
      all: orientations.length,
      pending: orientations.filter(o => o.status === 'pending').length,
      scheduled: orientations.filter(o => o.status === 'scheduled').length,
      completed: orientations.filter(o => o.status === 'completed').length
    };
  };
  
  const counts = getCounts();
  
  // Handle viewing orientation details
  const handleViewDetails = (orientation: Orientation) => {
    setSelectedOrientation(orientation);
    setDetailDialog(true);
  };
  
  // Handle assigning trainer
  const handleAssignTrainer = (orientation: Orientation) => {
    setSelectedOrientation(orientation);
    setAssignDialog(true);
    setSelectedTrainer('');
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
  
  // Handle cancelling orientation
  const handleCancel = (orientationId: number) => {
    setOrientations(prev => prev.map(o => 
      o.id === orientationId 
        ? { ...o, status: 'cancelled' }
        : o
    ));
  };
  
  // Handle saving trainer assignment
  const handleSaveAssignment = () => {
    if (selectedOrientation && selectedTrainer) {
      setOrientations(prev => prev.map(o => 
        o.id === selectedOrientation.id 
          ? { ...o, assignedTrainer: selectedTrainer }
          : o
      ));
      setAssignDialog(false);
    }
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
            Client Orientation Management
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            View and manage all client orientation requests, assign trainers, and schedule consultations
          </Typography>
          
          {/* Statistics Cards */}
          <Grid container spacing={2} sx={{ mt: 2, mb: 3 }}>
            <Grid item xs={6} md={3}>
              <Card sx={{ bgcolor: 'primary.dark', color: 'white' }}>
                <CardContent sx={{ py: 2 }}>
                  <Typography variant="h4" align="center">{counts.all}</Typography>
                  <Typography variant="body2" align="center">Total Requests</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card sx={{ bgcolor: 'warning.dark', color: 'white' }}>
                <CardContent sx={{ py: 2 }}>
                  <Typography variant="h4" align="center">{counts.pending}</Typography>
                  <Typography variant="body2" align="center">Pending</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card sx={{ bgcolor: 'info.dark', color: 'white' }}>
                <CardContent sx={{ py: 2 }}>
                  <Typography variant="h4" align="center">{counts.scheduled}</Typography>
                  <Typography variant="body2" align="center">Scheduled</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card sx={{ bgcolor: 'success.dark', color: 'white' }}>
                <CardContent sx={{ py: 2 }}>
                  <Typography variant="h4" align="center">{counts.completed}</Typography>
                  <Typography variant="body2" align="center">Completed</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          {/* Tabs */}
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab 
              label={
                <Badge badgeContent={counts.all} color="primary">
                  All Orientations
                </Badge>
              } 
            />
            <Tab 
              label={
                <Badge badgeContent={counts.pending} color="warning">
                  Pending
                </Badge>
              } 
            />
            <Tab 
              label={
                <Badge badgeContent={counts.scheduled} color="info">
                  Scheduled
                </Badge>
              } 
            />
            <Tab 
              label={
                <Badge badgeContent={counts.completed} color="success">
                  Completed
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
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Search orientations"
                variant="outlined"
                size="small"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon color="action" />,
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
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
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Trainer Filter</InputLabel>
                <Select
                  value={filterTrainer}
                  label="Trainer Filter"
                  onChange={(e) => setFilterTrainer(e.target.value as string)}
                >
                  <MenuItem value="all">All Trainers</MenuItem>
                  <MenuItem value="">Unassigned</MenuItem>
                  {mockTrainers.map(trainer => (
                    <MenuItem key={trainer.id} value={trainer.name}>
                      {trainer.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {/* Handle manual orientation creation */}}
              >
                Add Orientation
              </Button>
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
                  <TableCell>Scheduled Date</TableCell>
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
                            {orientation.experienceLevel} • From {orientation.source}
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
                      <Typography variant="body2">
                        {orientation.scheduledDate ? formatDate(orientation.scheduledDate) : 'Not scheduled'}
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
                        
                        {orientation.status === 'pending' && (
                          <IconButton 
                            size="small" 
                            onClick={() => handleAssignTrainer(orientation)}
                            title="Assign Trainer"
                            color="primary"
                          >
                            <AssignmentIcon />
                          </IconButton>
                        )}
                        
                        {orientation.status !== 'completed' && orientation.status !== 'cancelled' && (
                          <IconButton 
                            size="small" 
                            onClick={() => handleSchedule(orientation)}
                            title="Schedule"
                            color="info"
                          >
                            <ScheduleIcon />
                          </IconButton>
                        )}
                        
                        {orientation.status === 'scheduled' && (
                          <IconButton 
                            size="small" 
                            onClick={() => handleComplete(orientation.id)}
                            title="Mark as Completed"
                            color="success"
                          >
                            <CompleteIcon />
                          </IconButton>
                        )}
                        
                        {orientation.status !== 'completed' && orientation.status !== 'cancelled' && (
                          <IconButton 
                            size="small" 
                            onClick={() => handleCancel(orientation.id)}
                            title="Cancel"
                            color="error"
                          >
                            <CancelIcon />
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
                <Typography><strong>Source:</strong> {selectedOrientation.source}</Typography>
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
              
              {selectedOrientation.completedDate && (
                <Grid item xs={12}>
                  <Alert severity="success">
                    <strong>Completed on:</strong> {formatDate(selectedOrientation.completedDate)}
                  </Alert>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog(false)}>Close</Button>
          {selectedOrientation?.status === 'pending' && (
            <Button 
              variant="contained" 
              color="primary"
              onClick={() => {
                setDetailDialog(false);
                handleAssignTrainer(selectedOrientation);
              }}
            >
              Assign Trainer
            </Button>
          )}
          {selectedOrientation?.status === 'scheduled' && (
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
      
      {/* Assign Trainer Dialog */}
      <Dialog open={assignDialog} onClose={() => setAssignDialog(false)}>
        <DialogTitle>Assign Trainer</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Assign a trainer for {selectedOrientation?.fullName}
          </Typography>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Select Trainer</InputLabel>
            <Select
              value={selectedTrainer}
              label="Select Trainer"
              onChange={(e) => setSelectedTrainer(e.target.value as string)}
            >
              {mockTrainers.map(trainer => (
                <MenuItem key={trainer.id} value={trainer.name}>
                  {trainer.name} - {trainer.specialties.join(', ')}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleSaveAssignment}
            disabled={!selectedTrainer}
          >
            Assign Trainer
          </Button>
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

export default AdminOrientation;