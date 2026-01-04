import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  Grid,
  Autocomplete,
  CircularProgress,
  Chip,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  IconButton,
} from '@mui/material';
import { Save, ContentCopy, TrendingUp, TrendingDown, UploadCloud, X } from 'lucide-react';
import { useToast } from '../../../../hooks/use-toast';
import apiService from '../../../../services/api.service';
import GlowButton from '../../../ui/buttons/GlowButton';

// Interfaces based on blueprint
interface Client { id: string; name: string; }
interface BodyMeasurement {
  id?: string;
  userId: string;
  measurementDate: string;
  weight?: number;
  weightUnit?: 'lbs' | 'kg';
  bodyFatPercentage?: number;
  muscleMassPercentage?: number;
  bmi?: number;
  circumferenceUnit?: 'inches' | 'cm';
  neck?: number;
  shoulders?: number;
  chest?: number;
  rightBicep?: number;
  leftBicep?: number;
  naturalWaist?: number;
  hips?: number;
  rightThigh?: number;
  leftThigh?: number;
  rightCalf?: number;
  leftCalf?: number;
  notes?: string;
  photoUrls?: string[];
}
interface RecentMeasurement {
  id: string;
  measurementDate: string;
  weight?: number;
  bodyFatPercentage?: number;
  naturalWaist?: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

const measurementFields: { key: keyof BodyMeasurement, label: string }[] = [
  { key: 'weight', label: 'Weight' },
  { key: 'bodyFatPercentage', label: 'Body Fat %' },
  { key: 'muscleMassPercentage', label: 'Muscle Mass %' },
  { key: 'neck', label: 'Neck' },
  { key: 'chest', label: 'Chest' },
  { key: 'naturalWaist', label: 'Natural Waist' },
  { key: 'hips', label: 'Hips' },
  { key: 'rightBicep', label: 'Right Bicep' },
  { key: 'leftBicep', label: 'Left Bicep' },
  { key: 'rightThigh', label: 'Right Thigh' },
  { key: 'leftThigh', label: 'Left Thigh' },
];

const negativeIsBetter = ['weight', 'bodyFatPercentage', 'naturalWaist', 'hips', 'neck'];

const MeasurementEntry: React.FC = () => {
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [latestMeasurement, setLatestMeasurement] = useState<BodyMeasurement | null>(null);
  const [newMeasurement, setNewMeasurement] = useState<Partial<BodyMeasurement>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recentMeasurements, setRecentMeasurements] = useState<RecentMeasurement[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const clientsRes = await apiService.get('/api/admin/clients');
        setClients(clientsRes.data);
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to load clients.', variant: 'destructive' });
      }
    };
    fetchClients();
  }, [toast]);

  useEffect(() => {
    if (selectedClient) {
      const fetchLatest = async () => {
        setIsLoading(true);
        try {
          const response = await apiService.get(`/api/measurements/${selectedClient.id}/latest`);
          setLatestMeasurement(response.data);
          setNewMeasurement({
            userId: selectedClient.id,
            measurementDate: new Date().toISOString().split('T')[0],
            weightUnit: response.data?.weightUnit || 'lbs',
            circumferenceUnit: response.data?.circumferenceUnit || 'inches',
          });
        } catch (error) {
          setLatestMeasurement(null);
          setNewMeasurement({
            userId: selectedClient.id,
            measurementDate: new Date().toISOString().split('T')[0],
            weightUnit: 'lbs',
            circumferenceUnit: 'inches',
          });
          toast({ title: 'Info', description: 'No previous measurements found for this client.', variant: 'default' });
        } finally {
          setIsLoading(false);
        }
      };
      const fetchRecent = async () => {
        setLoadingRecent(true);
        try {
          // Endpoint from blueprint: GET /api/measurements/:userId
          const response = await apiService.get(`/api/measurements/${selectedClient.id}?limit=3`);
          setRecentMeasurements(response.data?.measurements || []);
        } catch (error) {
          console.error("Failed to load recent measurements", error);
          setRecentMeasurements([]);
        } finally {
          setLoadingRecent(false);
        }
      };

      fetchLatest();
      fetchRecent();
    } else {
      setLatestMeasurement(null);
      setNewMeasurement({});
      setRecentMeasurements([]);
      setPhotoFiles([]);
      setPhotoPreviews([]);
    }
  }, [selectedClient, toast]);

  const handleCopyLast = () => {
    if (!latestMeasurement) return;
    setNewMeasurement({
      ...latestMeasurement,
      id: undefined,
      measurementDate: new Date().toISOString().split('T')[0],
      notes: '',
      photoUrls: latestMeasurement.photoUrls || [],
    });
    toast({ title: 'Copied', description: 'Previous measurements copied. Update any changes.' });
  };

  const handleInputChange = (field: keyof BodyMeasurement, value: string) => {
    setNewMeasurement(prev => ({
      ...prev,
      [field]: value === '' ? undefined : Number(value),
    }));
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const files = Array.from(event.target.files);
      setPhotoFiles(prev => [...prev, ...files]);

      const newPreviews = files.map(file => URL.createObjectURL(file));
      setPhotoPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => {
      const urlToRemove = prev[index];
      URL.revokeObjectURL(urlToRemove); // Clean up memory
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSave = async () => {
    if (!selectedClient) {
      toast({ title: 'Error', description: 'Please select a client.', variant: 'destructive' });
      return;
    }
    setIsSaving(true);

    try {
      let uploadedPhotoUrls: string[] = newMeasurement.photoUrls || [];

      // 1. Upload new photos if any exist
      if (photoFiles.length > 0) {
        const formData = new FormData();
        photoFiles.forEach(file => {
          formData.append('photos', file);
        });

        const uploadResponse = await apiService.post('/api/measurements/upload-photos', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        uploadedPhotoUrls = [...uploadedPhotoUrls, ...uploadResponse.data.photoUrls];
      }

      // 2. Create the measurement record with all photo URLs
      const payload = { ...newMeasurement, userId: selectedClient.id, photoUrls: uploadedPhotoUrls };
      const response = await apiService.post('/api/measurements', payload);

      toast({ title: 'Success', description: 'Measurements saved successfully!' });
      if (response.data?.milestonesAchieved?.length > 0) {
        response.data.milestonesAchieved.forEach((milestone: any) => {
          toast({ title: 'Milestone!', description: milestone.celebrationMessage, variant: 'success' });
        });
      }
      setSelectedClient(null);
      setPhotoFiles([]);
      setPhotoPreviews([]);
    } catch (error) {
      toast({ title: 'Save Error', description: 'Failed to save measurements.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const renderChange = (field: keyof BodyMeasurement) => {
    const prevValue = latestMeasurement?.[field] as number | undefined;
    const newValue = newMeasurement?.[field] as number | undefined;

    if (prevValue === undefined || newValue === undefined || isNaN(prevValue) || isNaN(newValue)) return <Chip label="N/A" size="small" />;

    const change = newValue - prevValue;
    const isGood = negativeIsBetter.includes(field) ? change < 0 : change > 0;

    if (change === 0) return <Chip label="→ 0.0" size="small" />;

    return (
      <Chip
        icon={isGood ? <TrendingDown /> : <TrendingUp />}
        label={`${change > 0 ? '+' : ''}${change.toFixed(2)}`}
        color={isGood ? 'success' : 'error'}
        size="small"
        variant="outlined"
      />
    );
  };

  return (
    <Box component={motion.div} variants={containerVariants} initial="hidden" animate="visible" p={{ xs: 2, md: 4 }}>
      <Paper component={motion.div} variants={itemVariants} sx={{ p: { xs: 2, md: 3 }, mb: 4, background: 'rgba(30, 41, 59, 0.6)', backdropFilter: 'blur(10px)' }}>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          📏 Body Measurements Entry
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Autocomplete
              options={clients}
              getOptionLabel={(option) => option.name}
              value={selectedClient}
              onChange={(_, newValue) => setSelectedClient(newValue)}
              renderInput={(params) => <TextField {...params} label="Select Client" />}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Measurement Date"
              type="date"
              value={newMeasurement.measurementDate || ''}
              onChange={(e) => setNewMeasurement(p => ({ ...p, measurementDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              disabled={!selectedClient}
            />
          </Grid>
        </Grid>
      </Paper>

      <AnimatePresence>
        {selectedClient && (
          <Paper component={motion.div} variants={itemVariants} sx={{ p: { xs: 2, md: 3 }, mb: 4, background: 'rgba(30, 41, 59, 0.6)', backdropFilter: 'blur(10px)' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.light' }}>
              Recent Measurements for {selectedClient.name}
            </Typography>
            {loadingRecent ? (
              <Typography>Loading recent measurements...</Typography>
            ) : recentMeasurements.length > 0 ? (
              <List dense>
                {recentMeasurements.map((measurement) => (
                  <ListItem key={measurement.id} sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)', py: 1 }}>
                    <ListItemText
                      primary={`Date: ${new Date(measurement.measurementDate).toLocaleDateString()}`}
                      secondary={`Weight: ${measurement.weight || 'N/A'} lbs, Waist: ${measurement.naturalWaist || 'N/A'}", Body Fat: ${measurement.bodyFatPercentage || 'N/A'}%`}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography>No recent measurements found for this client.</Typography>
            )}
          </Paper>
        )}
      </AnimatePresence>

      {selectedClient && (
        isLoading ? <CircularProgress /> :
        <motion.div variants={itemVariants}>
          <Paper sx={{ p: { xs: 2, md: 3 }, mb: 4, background: 'rgba(30, 41, 59, 0.6)' }}>
            <Stack direction={{xs: 'column', sm: 'row'}} justifyContent="space-between" alignItems="center" mb={2} spacing={2}>
              <Typography variant="h6">
                New Measurements for {selectedClient.name}
              </Typography>
              <Button startIcon={<ContentCopy />} onClick={handleCopyLast} disabled={!latestMeasurement} variant="outlined">
                Copy from Last
              </Button>
            </Stack>

            <Grid container spacing={3}>
              {measurementFields.map(({key, label}) => (
                <Grid item xs={12} md={6} lg={4} key={key}>
                  <Paper sx={{ p: 2, background: 'rgba(0,0,0,0.2)', height: '100%' }}>
                    <Typography variant="subtitle1" sx={{ textTransform: 'capitalize' }}>{label}</Typography>
                    <Stack spacing={1.5} mt={1.5}>
                      <TextField
                        label="Previous"
                        value={latestMeasurement?.[key] ?? 'N/A'}
                        size="small"
                        disabled
                      />
                      <TextField
                        label="New"
                        type="number"
                        size="small"
                        value={newMeasurement[key] ?? ''}
                        onChange={(e) => handleInputChange(key, e.target.value)}
                        InputProps={{
                          endAdornment: <InputAdornment position="end">{key === 'weight' ? newMeasurement.weightUnit : newMeasurement.circumferenceUnit}</InputAdornment>
                        }}
                      />
                      <Box textAlign="center" pt={1}>{renderChange(key)}</Box>
                    </Stack>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Paper>

          <Paper sx={{ p: { xs: 2, md: 3 }, mb: 4, background: 'rgba(30, 41, 59, 0.6)' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              📸 Progress Photos
            </Typography>
            <Grid container spacing={2}>
              {photoPreviews.map((previewUrl, index) => (
                <Grid item xs={6} sm={4} md={3} key={index}>
                  <Box sx={{ position: 'relative' }}>
                    <img src={previewUrl} alt={`Preview ${index + 1}`} style={{ width: '100%', height: 'auto', borderRadius: '8px' }} />
                    <IconButton
                      size="small"
                      onClick={() => removePhoto(index)}
                      sx={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.5)', '&:hover': { background: 'rgba(0,0,0,0.8)' } }}
                    >
                      <X size={16} color="white" />
                    </IconButton>
                  </Box>
                </Grid>
              ))}
              <Grid item xs={6} sm={4} md={3}>
                <Button
                  variant="outlined"
                  component="label"
                  fullWidth
                  sx={{
                    height: '100%',
                    minHeight: '120px',
                    borderStyle: 'dashed',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                  }}
                >
                  <UploadCloud />
                  Upload
                  <input
                    type="file"
                    hidden
                    multiple
                    accept="image/*"
                    onChange={handlePhotoChange}
                  />
                </Button>
              </Grid>
            </Grid>
          </Paper>

          <Box mt={4} textAlign="right">
            <GlowButton
              text="Save Measurements"
              theme="emerald"
              leftIcon={<Save />}
              onClick={handleSave}
              isLoading={isSaving}
            />
          </Box>
        </motion.div>
      )}
    </Box>
  );
};

export default MeasurementEntry;