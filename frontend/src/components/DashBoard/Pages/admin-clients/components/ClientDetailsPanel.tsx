/**
 * Client Details Panel - Comprehensive Client Profile Management
 * ===========================================================
 * 
 * Complete client profile view and management interface
 * Allows admins to view, edit, and manage all aspects of a client
 * 
 * FEATURES:
 * - Comprehensive client profile display
 * - Edit client information interface
 * - Session history and progress tracking
 * - Payment history and billing management
 * - Trainer assignment and scheduling
 * - Health screening and fitness assessment review
 * - Communication center for notes and messages
 * - Progress photos and measurements tracking
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  AlertTitle,
  LinearProgress,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondary,
  Badge,
  Tooltip
} from '@mui/material';

// Icons
import {
  Close,
  Edit,
  Save,
  Cancel,
  Person,
  FitnessCenter,
  Schedule,
  Payment,
  Message,
  TrendingUp,
  Assignment,
  Phone,
  Email,
  Emergency,
  Add,
  Remove,
  Visibility,
  Download,
  Upload,
  Warning,
  CheckCircle,
  AccessTime,
  AttachMoney,
  PhotoCamera,
  Note,
  History
} from '@mui/icons-material';

// Services
import { adminClientService } from '../../../../services/adminClientService';
import { useToast } from '../../../../hooks/use-toast';

// P0: Billing & Sessions Card
import BillingSessionsCard from './BillingSessionsCard';

// Types
interface Client {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  photo?: string;
  dateOfBirth?: string;
  gender?: string;
  height?: number;
  weight?: number;
  fitnessGoal?: string;
  trainingExperience?: string;
  healthConcerns?: string;
  emergencyContact?: string;
  availableSessions: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  assignedTrainer?: {
    id: number;
    firstName: string;
    lastName: string;
    photo?: string;
  };
}

interface ClientDetailsPanelProps {
  client: Client;
  onClose: () => void;
  onUpdate: (updatedClient: Client) => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// Tab Panel Component
const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`client-tabpanel-${index}`}
      aria-labelledby={`client-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
};

/**
 * Client Details Panel Component
 */
const ClientDetailsPanel: React.FC<ClientDetailsPanelProps> = ({
  client,
  onClose,
  onUpdate
}) => {
  const { toast } = useToast();
  
  // State Management
  const [activeTab, setActiveTab] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editData, setEditData] = useState(client);
  const [sessions, setSessions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [progress, setProgress] = useState([]);
  const [notes, setNotes] = useState([]);
  
  // Data fetching
  const fetchClientData = useCallback(async () => {
    setLoading(true);
    try {
      const [sessionsData, paymentsData] = await Promise.all([
        adminClientService.getClientSessions(client.id),
        adminClientService.getClientPayments(client.id)
      ]);
      
      setSessions(sessionsData || []);
      setPayments(paymentsData || []);
    } catch (err) {
      console.error('Error fetching client data:', err);
    } finally {
      setLoading(false);
    }
  }, [client.id]);
  
  useEffect(() => {
    fetchClientData();
  }, [fetchClientData]);
  
  // Event Handlers
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  
  const handleEditToggle = () => {
    if (isEditing) {
      setEditData(client); // Reset changes
    }
    setIsEditing(!isEditing);
  };
  
  const handleSave = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const updatedClient = await adminClientService.updateClient(client.id, editData);
      onUpdate(updatedClient);
      setIsEditing(false);
      toast({
        title: 'Success',
        description: 'Client information updated successfully',
        variant: 'default'
      });
    } catch (err: any) {
      setError(err.message || 'Failed to update client');
      toast({
        title: 'Error',
        description: 'Failed to update client information',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleEditDataChange = (field: string, value: any) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleAddSessions = async (sessionCount: number) => {
    try {
      await adminClientService.addSessions(client.id, sessionCount);
      const updatedClient = { ...client, availableSessions: client.availableSessions + sessionCount };
      onUpdate(updatedClient);
      toast({
        title: 'Success',
        description: `Added ${sessionCount} sessions to client account`,
        variant: 'default'
      });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: 'Failed to add sessions',
        variant: 'destructive'
      });
    }
  };
  
  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };
  
  // Callback for billing card updates
  const handleBillingUpdate = useCallback(() => {
    fetchClientData();
  }, [fetchClientData]);

  // Render Tab Content
  const renderPersonalInfo = () => (
    <Grid container spacing={3} sx={{ p: 3 }}>
      {/* P0: Billing & Sessions Card - Prominent at top */}
      <Grid item xs={12}>
        <BillingSessionsCard
          clientId={client.id}
          clientName={`${client.firstName} ${client.lastName}`}
          onUpdate={handleBillingUpdate}
        />
      </Grid>

      <Grid item xs={12} md={4}>
        <Card sx={{ background: 'rgba(71, 85, 105, 0.5)', textAlign: 'center' }}>
          <CardContent>
            <Avatar
              src={editData.photo}
              sx={{ width: 120, height: 120, margin: '0 auto 16px' }}
            >
              {editData.firstName[0]}{editData.lastName[0]}
            </Avatar>
            <Typography variant="h5" sx={{ color: 'white', mb: 1 }}>
              {editData.firstName} {editData.lastName}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 2 }}>
              {editData.dateOfBirth && `Age: ${calculateAge(editData.dateOfBirth)}`}
            </Typography>
            <Chip
              label={editData.isActive ? 'Active' : 'Inactive'}
              color={editData.isActive ? 'success' : 'error'}
              sx={{ mb: 2 }}
            />
            {isEditing && (
              <Button
                variant="outlined"
                startIcon={<PhotoCamera />}
                sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
              >
                Update Photo
              </Button>
            )}
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={8}>
        <Card sx={{ background: 'rgba(71, 85, 105, 0.5)' }}>
          <CardContent>
            <Typography variant="h6" sx={{ color: 'white', mb: 3 }}>
              Personal Information
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  value={editData.firstName}
                  onChange={(e) => handleEditDataChange('firstName', e.target.value)}
                  disabled={!isEditing}
                  sx={{
                    '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' }
                    }
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  value={editData.lastName}
                  onChange={(e) => handleEditDataChange('lastName', e.target.value)}
                  disabled={!isEditing}
                  sx={{
                    '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' }
                    }
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={editData.email}
                  onChange={(e) => handleEditDataChange('email', e.target.value)}
                  disabled={!isEditing}
                  sx={{
                    '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' }
                    }
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={editData.phone || ''}
                  onChange={(e) => handleEditDataChange('phone', e.target.value)}
                  disabled={!isEditing}
                  sx={{
                    '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' }
                    }
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Date of Birth"
                  type="date"
                  value={editData.dateOfBirth || ''}
                  onChange={(e) => handleEditDataChange('dateOfBirth', e.target.value)}
                  disabled={!isEditing}
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' }
                    }
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth disabled={!isEditing}>
                  <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Gender</InputLabel>
                  <Select
                    value={editData.gender || ''}
                    onChange={(e) => handleEditDataChange('gender', e.target.value)}
                    label="Gender"
                    sx={{
                      color: 'white',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255,255,255,0.3)'
                      }
                    }}
                  >
                    <MenuItem value="male">Male</MenuItem>
                    <MenuItem value="female">Female</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                    <MenuItem value="prefer-not-to-say">Prefer not to say</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Emergency Contact"
                  value={editData.emergencyContact || ''}
                  onChange={(e) => handleEditDataChange('emergencyContact', e.target.value)}
                  disabled={!isEditing}
                  multiline
                  rows={2}
                  sx={{
                    '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' }
                    }
                  }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={editData.isActive}
                      onChange={(e) => handleEditDataChange('isActive', e.target.checked)}
                      disabled={!isEditing}
                    />
                  }
                  label="Active Client"
                  sx={{ color: 'white' }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
  
  const renderHealthFitness = () => (
    <Grid container spacing={3} sx={{ p: 3 }}>
      <Grid item xs={12} md={6}>
        <Card sx={{ background: 'rgba(71, 85, 105, 0.5)' }}>
          <CardContent>
            <Typography variant="h6" sx={{ color: 'white', mb: 3 }}>
              Physical Measurements
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Height (inches)"
                  type="number"
                  value={editData.height || ''}
                  onChange={(e) => handleEditDataChange('height', parseFloat(e.target.value))}
                  disabled={!isEditing}
                  sx={{
                    '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' }
                    }
                  }}
                />
              </Grid>
              
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Weight (lbs)"
                  type="number"
                  value={editData.weight || ''}
                  onChange={(e) => handleEditDataChange('weight', parseFloat(e.target.value))}
                  disabled={!isEditing}
                  sx={{
                    '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' }
                    }
                  }}
                />
              </Grid>
              
              <Grid item xs={12}>
                {editData.height && editData.weight && (
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    BMI: {(editData.weight / Math.pow(editData.height / 12, 2) * 703).toFixed(1)}
                  </Typography>
                )}
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Card sx={{ background: 'rgba(71, 85, 105, 0.5)' }}>
          <CardContent>
            <Typography variant="h6" sx={{ color: 'white', mb: 3 }}>
              Fitness Goals & Experience
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Primary Fitness Goal"
                  value={editData.fitnessGoal || ''}
                  onChange={(e) => handleEditDataChange('fitnessGoal', e.target.value)}
                  disabled={!isEditing}
                  sx={{
                    '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' }
                    }
                  }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Training Experience"
                  value={editData.trainingExperience || ''}
                  onChange={(e) => handleEditDataChange('trainingExperience', e.target.value)}
                  disabled={!isEditing}
                  sx={{
                    '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' }
                    }
                  }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12}>
        <Card sx={{ background: 'rgba(71, 85, 105, 0.5)' }}>
          <CardContent>
            <Typography variant="h6" sx={{ color: 'white', mb: 3 }}>
              Health Concerns & Limitations
            </Typography>
            
            <TextField
              fullWidth
              label="Health Concerns"
              value={editData.healthConcerns || ''}
              onChange={(e) => handleEditDataChange('healthConcerns', e.target.value)}
              disabled={!isEditing}
              multiline
              rows={4}
              placeholder="Any injuries, medical conditions, or physical limitations..."
              sx={{
                '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                '& .MuiOutlinedInput-root': {
                  color: 'white',
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' }
                }
              }}
            />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
  
  const renderSessions = () => (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6" sx={{ color: 'white' }}>
          Session Management
        </Typography>
        <Box display="flex" gap={2}>
          <Chip
            label={`${client.availableSessions} Available`}
            color={client.availableSessions > 0 ? 'success' : 'error'}
          />
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleAddSessions(1)}
            sx={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}
          >
            Add Sessions
          </Button>
        </Box>
      </Box>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ background: 'rgba(71, 85, 105, 0.5)' }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Date</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Trainer</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Duration</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sessions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)' }}>
                        No sessions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    sessions.map((session: any) => (
                      <TableRow key={session.id}>
                        <TableCell sx={{ color: 'white' }}>
                          {new Date(session.sessionDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell sx={{ color: 'white' }}>
                          {session.trainer ? `${session.trainer.firstName} ${session.trainer.lastName}` : 'Unassigned'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={session.status}
                            color={
                              session.status === 'completed' ? 'success' :
                              session.status === 'scheduled' ? 'info' :
                              session.status === 'cancelled' ? 'error' : 'default'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell sx={{ color: 'white' }}>
                          {session.duration || 60} min
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" sx={{ color: 'white' }}>
                            <Visibility />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card sx={{ background: 'rgba(71, 85, 105, 0.5)' }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                Session Statistics
              </Typography>
              
              <Box mb={2}>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  Total Sessions: {sessions.length}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  Completed: {sessions.filter((s: any) => s.status === 'completed').length}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  Upcoming: {sessions.filter((s: any) => s.status === 'scheduled').length}
                </Typography>
              </Box>
              
              <Divider sx={{ my: 2, backgroundColor: 'rgba(255,255,255,0.1)' }} />
              
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
                Session Package Actions
              </Typography>
              
              <Box display="flex" gap={1} flexDirection="column">
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Add />}
                  onClick={() => handleAddSessions(5)}
                  sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
                >
                  Add 5 Sessions
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Add />}
                  onClick={() => handleAddSessions(10)}
                  sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
                >
                  Add 10 Sessions
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
  
  const renderPayments = () => (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ color: 'white', mb: 3 }}>
        Payment History
      </Typography>
      
      <Paper sx={{ background: 'rgba(71, 85, 105, 0.5)' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Date</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Amount</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Method</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Package</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)' }}>
                    No payment history found
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((payment: any) => (
                  <TableRow key={payment.id}>
                    <TableCell sx={{ color: 'white' }}>
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell sx={{ color: 'white' }}>
                      ${payment.amount}
                    </TableCell>
                    <TableCell sx={{ color: 'white' }}>
                      {payment.paymentMethod || 'Card'}
                    </TableCell>
                    <TableCell sx={{ color: 'white' }}>
                      {payment.package?.name || 'Session Package'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={payment.status || 'completed'}
                        color={payment.status === 'completed' ? 'success' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" sx={{ color: 'white' }}>
                        <Download />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
  
  // Render Main Component
  return (
    <>
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        color: 'white',
        background: 'rgba(0,0,0,0.3)',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar src={client.photo} sx={{ width: 40, height: 40 }}>
            {client.firstName[0]}
          </Avatar>
          <Box>
            <Typography variant="h6">
              {client.firstName} {client.lastName}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              Client Details & Management
            </Typography>
          </Box>
        </Box>
        
        <Box display="flex" gap={1}>
          {isEditing ? (
            <>
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={handleSave}
                disabled={loading}
                sx={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
              >
                Save
              </Button>
              <Button
                variant="outlined"
                startIcon={<Cancel />}
                onClick={handleEditToggle}
                sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              variant="outlined"
              startIcon={<Edit />}
              onClick={handleEditToggle}
              sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
            >
              Edit
            </Button>
          )}
          
          <IconButton onClick={onClose} sx={{ color: 'white' }}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ p: 0, background: 'rgba(0,0,0,0.5)' }}>
        {error && (
          <Alert severity="error" sx={{ m: 2 }}>
            <AlertTitle>Error</AlertTitle>
            {error}
          </Alert>
        )}
        
        {loading && (
          <LinearProgress sx={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
        )}
        
        <Box sx={{ borderBottom: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            sx={{
              '& .MuiTab-root': {
                color: 'rgba(255,255,255,0.7)',
                '&.Mui-selected': {
                  color: '#3b82f6'
                }
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#3b82f6'
              }
            }}
          >
            <Tab icon={<Person />} label="Personal" />
            <Tab icon={<FitnessCenter />} label="Health & Fitness" />
            <Tab icon={<Schedule />} label="Sessions" />
            <Tab icon={<Payment />} label="Payments" />
            <Tab icon={<TrendingUp />} label="Progress" />
            <Tab icon={<Message />} label="Notes" />
          </Tabs>
        </Box>
        
        <TabPanel value={activeTab} index={0}>
          {renderPersonalInfo()}
        </TabPanel>
        
        <TabPanel value={activeTab} index={1}>
          {renderHealthFitness()}
        </TabPanel>
        
        <TabPanel value={activeTab} index={2}>
          {renderSessions()}
        </TabPanel>
        
        <TabPanel value={activeTab} index={3}>
          {renderPayments()}
        </TabPanel>
        
        <TabPanel value={activeTab} index={4}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
              Progress Tracking
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              Progress tracking features will be implemented here.
            </Typography>
          </Box>
        </TabPanel>
        
        <TabPanel value={activeTab} index={5}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
              Client Notes
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              Notes and communication features will be implemented here.
            </Typography>
          </Box>
        </TabPanel>
      </DialogContent>
    </>
  );
};

export default ClientDetailsPanel;