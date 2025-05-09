import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  IconButton,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  Alert,
  useTheme
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Notifications as NotificationsIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import api from '../../../../../services/api';

// Types for notification settings
interface NotificationSetting {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  notificationType: 'ADMIN' | 'ORIENTATION' | 'ORDER' | 'SYSTEM' | 'ALL';
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

// Notification types with display names
const notificationTypes = [
  { value: 'ALL', label: 'All Notifications' },
  { value: 'ADMIN', label: 'Admin Notifications' },
  { value: 'ORIENTATION', label: 'Orientation Forms' },
  { value: 'ORDER', label: 'Order Notifications' },
  { value: 'SYSTEM', label: 'System Alerts' }
];

/**
 * Component for managing notification settings
 */
const NotificationSettingsList: React.FC = () => {
  const theme = useTheme();
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentSetting, setCurrentSetting] = useState<Partial<NotificationSetting> | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Mock API functions (replace with actual API calls)
  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      // Replace with actual API call when ready
      // const response = await api.get('/notification-settings');
      // setSettings(response.data);
      
      // Hardcoded settings for demo
      const mockSettings: NotificationSetting[] = [
        {
          id: 1,
          name: 'Sean Swan',
          email: 'ogpswan@yahoo.com',
          phone: '+13239968153',
          isActive: true,
          notificationType: 'ALL',
          isPrimary: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 2,
          name: 'Jasmine Hearon',
          email: 'jasminehearon@gmail.com',
          phone: '+13239944779',
          isActive: true,
          notificationType: 'ALL',
          isPrimary: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 3,
          name: 'Swan Studios',
          email: 'loveswanstudios@protonmail.com',
          phone: null,
          isActive: true,
          notificationType: 'ALL',
          isPrimary: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
      setSettings(mockSettings);
    } catch (err: any) {
      setError(`Failed to load notification settings: ${err.message}`);
      console.error('Error loading notification settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveSetting = async (setting: Partial<NotificationSetting>) => {
    setSaveError(null);
    try {
      // For new settings
      if (!setting.id) {
        // Replace with actual API call when ready
        // const response = await api.post('/notification-settings', setting);
        // setSettings([...settings, response.data]);
        
        // For demo, just add to the local state
        const newSetting: NotificationSetting = {
          ...setting,
          id: Math.max(0, ...settings.map(s => s.id)) + 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isActive: setting.isActive ?? true,
          isPrimary: setting.isPrimary ?? false,
          notificationType: setting.notificationType ?? 'ALL'
        } as NotificationSetting;
        
        setSettings([...settings, newSetting]);
        setSuccessMessage('Notification setting added successfully');
      } else {
        // For existing settings
        // Replace with actual API call when ready
        // const response = await api.put(`/notification-settings/${setting.id}`, setting);
        // setSettings(settings.map(s => s.id === setting.id ? response.data : s));
        
        // For demo, just update the local state
        setSettings(settings.map(s => s.id === setting.id ? {
          ...s,
          ...setting,
          updatedAt: new Date().toISOString()
        } : s));
        setSuccessMessage('Notification setting updated successfully');
      }
      
      setDialogOpen(false);
    } catch (err: any) {
      setSaveError(`Failed to save: ${err.message}`);
      console.error('Error saving notification setting:', err);
    }
  };

  const deleteSetting = async (id: number) => {
    try {
      // Replace with actual API call when ready
      // await api.delete(`/notification-settings/${id}`);
      
      // For demo, just remove from local state
      setSettings(settings.filter(s => s.id !== id));
      setDeleteDialogOpen(false);
      setSuccessMessage('Notification setting deleted successfully');
    } catch (err: any) {
      setError(`Failed to delete: ${err.message}`);
      console.error('Error deleting notification setting:', err);
    }
  };

  // Load settings on component mount
  useEffect(() => {
    fetchSettings();
  }, []);

  // Clear success message after a timeout
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Handle opening the add/edit dialog
  const handleOpenDialog = (setting: Partial<NotificationSetting> | null = null) => {
    setCurrentSetting(setting || {
      name: '',
      email: '',
      phone: '',
      isActive: true,
      notificationType: 'ALL',
      isPrimary: false
    });
    setDialogOpen(true);
    setSaveError(null);
  };

  // Handle opening the delete confirmation dialog
  const handleDeleteConfirm = (setting: NotificationSetting) => {
    setCurrentSetting(setting);
    setDeleteDialogOpen(true);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch (e) {
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper elevation={3} sx={{ width: '100%', mb: 2, overflow: 'hidden' }}>
      <Box sx={{ p: 3, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <NotificationsIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
            <Typography variant="h6" component="h2">
              Notification Settings
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Contact
          </Button>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Manage email and SMS notification recipients for different notification types.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ m: 2 }}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert severity="success" sx={{ m: 2 }}>
          {successMessage}
        </Alert>
      )}

      <TableContainer sx={{ maxHeight: '60vh' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Phone</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Priority</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {settings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography variant="body1" sx={{ textAlign: 'center', py: 3 }}>
                    No notification settings found.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              settings.map((setting) => (
                <TableRow key={setting.id} hover>
                  <TableCell>{setting.name}</TableCell>
                  <TableCell>{setting.email || 'None'}</TableCell>
                  <TableCell>{setting.phone || 'None'}</TableCell>
                  <TableCell>
                    {notificationTypes.find(t => t.value === setting.notificationType)?.label || setting.notificationType}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={setting.isActive ? 'Active' : 'Inactive'}
                      color={setting.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {setting.isPrimary && (
                      <Chip
                        label="Primary"
                        color="primary"
                        size="small"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleOpenDialog(setting)}
                      aria-label={`Edit ${setting.name}`}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteConfirm(setting)}
                      aria-label={`Delete ${setting.name}`}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {currentSetting?.id ? 'Edit Notification Setting' : 'Add Notification Setting'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Name"
                  value={currentSetting?.name || ''}
                  onChange={(e) => setCurrentSetting({ ...currentSetting, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={currentSetting?.email || ''}
                  onChange={(e) => setCurrentSetting({ ...currentSetting, email: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  placeholder="+1234567890"
                  value={currentSetting?.phone || ''}
                  onChange={(e) => setCurrentSetting({ ...currentSetting, phone: e.target.value })}
                  helperText="Include country code (e.g., +1 for US)"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Notification Type</InputLabel>
                  <Select
                    value={currentSetting?.notificationType || 'ALL'}
                    onChange={(e) => setCurrentSetting({
                      ...currentSetting,
                      notificationType: e.target.value as any
                    })}
                    label="Notification Type"
                  >
                    {notificationTypes.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={currentSetting?.isActive ?? true}
                      onChange={(e) => setCurrentSetting({
                        ...currentSetting,
                        isActive: e.target.checked
                      })}
                      color="primary"
                    />
                  }
                  label="Active"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={currentSetting?.isPrimary ?? false}
                      onChange={(e) => setCurrentSetting({
                        ...currentSetting,
                        isPrimary: e.target.checked
                      })}
                      color="primary"
                    />
                  }
                  label="Priority Contact"
                />
              </Grid>
            </Grid>

            {saveError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {saveError}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => currentSetting && saveSetting(currentSetting)}
            disabled={!currentSetting?.name}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the notification setting for{' '}
            <strong>{currentSetting?.name}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => currentSetting?.id && deleteSetting(currentSetting.id)}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default NotificationSettingsList;