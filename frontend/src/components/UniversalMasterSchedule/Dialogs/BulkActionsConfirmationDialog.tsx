/**
 * Bulk Actions Confirmation Dialog Component
 * =========================================
 * Advanced bulk operations dialog with previews, undo functionality, and progress tracking
 * 
 * Features:
 * - Action preview with affected sessions
 * - Progress indicators during execution
 * - Undo functionality for reversible actions
 * - Detailed success/failure reporting
 * - Batch processing with error handling
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';

// Material-UI Components
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Chip,
  LinearProgress,
  CircularProgress,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  Grid,
  Divider,
  Collapse,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch,
  FormControlLabel,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';

// Icons
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  Calendar,
  RotateCcw,
  Play,
  Pause,
  Square,
  ChevronDown,
  ChevronUp,
  Info,
  Warning,
  Zap,
  Target,
  Users,
  Trash2,
  Edit,
  Copy,
  Move,
  FileSpreadsheet,
  Download,
  Upload
} from 'lucide-react';

// Custom Components
import GlowButton from '../../ui/buttons/GlowButton';
import { useToast } from '../../../hooks/use-toast';

// Services
import sessionService from '../../../services/sessionService';

// Types
import type { SessionEvent, BulkActionType } from '../types';

interface BulkActionResult {
  sessionId: string;
  success: boolean;
  error?: string;
  originalData?: any;
}

interface BulkActionsConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  action: BulkActionType;
  selectedSessions: SessionEvent[];
  onActionComplete: (results: BulkActionResult[]) => void;
  onUndo?: (sessionId: string) => void;
}

interface ActionConfig {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  confirmationText: string;
  warningLevel: 'low' | 'medium' | 'high';
  reversible: boolean;
  requiresInput: boolean;
  inputFields?: Array<{
    key: string;
    label: string;
    type: 'text' | 'select' | 'date' | 'number';
    options?: Array<{ value: string; label: string }>;
    required: boolean;
  }>;
}

const BulkActionsConfirmationDialog: React.FC<BulkActionsConfirmationDialogProps> = ({
  open,
  onClose,
  action,
  selectedSessions,
  onActionComplete,
  onUndo
}) => {
  const { toast } = useToast();
  
  // Component state
  const [activeStep, setActiveStep] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [paused, setPaused] = useState(false);
  const [results, setResults] = useState<BulkActionResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [actionInputs, setActionInputs] = useState<Record<string, any>>({});
  const [previewExpanded, setPreviewExpanded] = useState(true);
  
  // Action configurations
  const actionConfigs: Record<BulkActionType, ActionConfig> = {
    confirm: {
      title: 'Confirm Sessions',
      description: 'Mark selected sessions as confirmed',
      icon: <CheckCircle />,
      color: '#22c55e',
      confirmationText: 'Confirm all selected sessions?',
      warningLevel: 'low',
      reversible: true,
      requiresInput: false
    },
    cancel: {
      title: 'Cancel Sessions',
      description: 'Cancel selected sessions and notify clients',
      icon: <XCircle />,
      color: '#ef4444',
      confirmationText: 'Cancel all selected sessions? This action will notify clients.',
      warningLevel: 'high',
      reversible: true,
      requiresInput: true,
      inputFields: [
        {
          key: 'reason',
          label: 'Cancellation Reason',
          type: 'select',
          options: [
            { value: 'trainer_illness', label: 'Trainer Illness' },
            { value: 'facility_closure', label: 'Facility Closure' },
            { value: 'equipment_malfunction', label: 'Equipment Issue' },
            { value: 'schedule_conflict', label: 'Schedule Conflict' },
            { value: 'other', label: 'Other' }
          ],
          required: true
        },
        {
          key: 'notifyClients',
          label: 'Send Notification to Clients',
          type: 'select',
          options: [
            { value: 'email', label: 'Email Only' },
            { value: 'sms', label: 'SMS Only' },
            { value: 'both', label: 'Email & SMS' },
            { value: 'none', label: 'No Notification' }
          ],
          required: true
        }
      ]
    },
    delete: {
      title: 'Delete Sessions',
      description: 'Permanently delete selected sessions',
      icon: <Trash2 />,
      color: '#dc2626',
      confirmationText: 'Permanently delete all selected sessions? This action cannot be undone.',
      warningLevel: 'high',
      reversible: false,
      requiresInput: true,
      inputFields: [
        {
          key: 'confirmation',
          label: 'Type "DELETE" to confirm',
          type: 'text',
          required: true
        }
      ]
    },
    reassign: {
      title: 'Reassign Trainer',
      description: 'Assign selected sessions to a different trainer',
      icon: <Move />,
      color: '#3b82f6',
      confirmationText: 'Reassign all selected sessions to the chosen trainer?',
      warningLevel: 'medium',
      reversible: true,
      requiresInput: true,
      inputFields: [
        {
          key: 'newTrainerId',
          label: 'New Trainer',
          type: 'select',
          options: [], // Will be populated with trainers
          required: true
        },
        {
          key: 'notifyClients',
          label: 'Notify Clients of Change',
          type: 'select',
          options: [
            { value: 'yes', label: 'Yes, notify clients' },
            { value: 'no', label: 'No notification' }
          ],
          required: true
        }
      ]
    },
    reschedule: {
      title: 'Reschedule Sessions',
      description: 'Move selected sessions to different times',
      icon: <Calendar />,
      color: '#f59e0b',
      confirmationText: 'Reschedule all selected sessions?',
      warningLevel: 'medium',
      reversible: true,
      requiresInput: true,
      inputFields: [
        {
          key: 'timeOffset',
          label: 'Time Adjustment',
          type: 'select',
          options: [
            { value: '60', label: '+1 hour' },
            { value: '120', label: '+2 hours' },
            { value: '-60', label: '-1 hour' },
            { value: '-120', label: '-2 hours' },
            { value: '1440', label: '+1 day' },
            { value: '-1440', label: '-1 day' }
          ],
          required: true
        }
      ]
    },
    duplicate: {
      title: 'Duplicate Sessions',
      description: 'Create copies of selected sessions',
      icon: <Copy />,
      color: '#8b5cf6',
      confirmationText: 'Create duplicates of all selected sessions?',
      warningLevel: 'low',
      reversible: true,
      requiresInput: true,
      inputFields: [
        {
          key: 'dateOffset',
          label: 'Schedule duplicates for',
          type: 'select',
          options: [
            { value: '7', label: 'Next week (same times)' },
            { value: '14', label: 'Two weeks later' },
            { value: '30', label: 'Next month' },
            { value: 'custom', label: 'Custom date' }
          ],
          required: true
        }
      ]
    },
    export: {
      title: 'Export Sessions',
      description: 'Export selected sessions to file',
      icon: <Download />,
      color: '#06b6d4',
      confirmationText: 'Export all selected sessions?',
      warningLevel: 'low',
      reversible: false,
      requiresInput: true,
      inputFields: [
        {
          key: 'format',
          label: 'Export Format',
          type: 'select',
          options: [
            { value: 'csv', label: 'CSV (Excel Compatible)' },
            { value: 'pdf', label: 'PDF Report' },
            { value: 'json', label: 'JSON Data' }
          ],
          required: true
        },
        {
          key: 'includeDetails',
          label: 'Include Client Details',
          type: 'select',
          options: [
            { value: 'yes', label: 'Yes, include client info' },
            { value: 'no', label: 'Sessions only' }
          ],
          required: true
        }
      ]
    }
  };
  
  const currentConfig = actionConfigs[action];
  
  // Steps for the multi-step process
  const steps = [
    'Review Selection',
    ...(currentConfig.requiresInput ? ['Configure Action'] : []),
    'Confirm & Execute',
    'Results'
  ];
  
  // Calculate session statistics
  const sessionStats = useMemo(() => {
    const byStatus = selectedSessions.reduce((acc, session) => {
      acc[session.status] = (acc[session.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const byTrainer = selectedSessions.reduce((acc, session) => {
      const trainerName = session.trainer ? 
        `${session.trainer.firstName} ${session.trainer.lastName}` : 
        'Unassigned';
      acc[trainerName] = (acc[trainerName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return { byStatus, byTrainer };
  }, [selectedSessions]);
  
  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setActiveStep(0);
      setProcessing(false);
      setPaused(false);
      setResults([]);
      setProgress(0);
      setActionInputs({});
      setShowDetails(false);
      setPreviewExpanded(true);
    }
  }, [open, action]);
  
  // Validate inputs
  const inputsValid = useMemo(() => {
    if (!currentConfig.requiresInput) return true;
    
    return currentConfig.inputFields?.every(field => {
      if (!field.required) return true;
      const value = actionInputs[field.key];
      if (field.key === 'confirmation' && field.label.includes('DELETE')) {
        return value === 'DELETE';
      }
      return value && value.trim() !== '';
    }) || false;
  }, [currentConfig, actionInputs]);
  
  // Execute bulk action
  const executeBulkAction = async () => {
    setProcessing(true);
    setActiveStep(2);
    const newResults: BulkActionResult[] = [];
    
    try {
      for (let i = 0; i < selectedSessions.length; i++) {
        if (paused) {
          await new Promise(resolve => {
            const checkPause = () => {
              if (!paused) resolve(undefined);
              else setTimeout(checkPause, 100);
            };
            checkPause();
          });
        }
        
        const session = selectedSessions[i];
        
        try {
          let result: any;
          
          switch (action) {
            case 'confirm':
              result = await sessionService.updateSession(session.id, { status: 'confirmed' });
              break;
            case 'cancel':
              result = await sessionService.cancelSession(session.id, {
                reason: actionInputs.reason,
                notifyClient: actionInputs.notifyClients !== 'none'
              });
              break;
            case 'delete':
              result = await sessionService.deleteSession(session.id);
              break;
            case 'reassign':
              result = await sessionService.reassignSession(session.id, {
                newTrainerId: actionInputs.newTrainerId,
                notifyClient: actionInputs.notifyClients === 'yes'
              });
              break;
            case 'reschedule':
              const offsetMinutes = parseInt(actionInputs.timeOffset);
              const newDate = new Date(session.start.getTime() + offsetMinutes * 60000);
              result = await sessionService.updateSession(session.id, {
                sessionDate: newDate.toISOString()
              });
              break;
            case 'duplicate':
              const dayOffset = parseInt(actionInputs.dateOffset);
              const duplicateDate = new Date(session.start.getTime() + dayOffset * 24 * 60 * 60 * 1000);
              result = await sessionService.createSession({
                sessionDate: duplicateDate.toISOString(),
                duration: session.duration,
                userId: session.userId,
                trainerId: session.trainerId,
                location: session.location,
                notes: session.notes,
                status: 'available'
              });
              break;
            case 'export':
              // Export would be handled differently, creating a file
              result = { exported: true };
              break;
            default:
              throw new Error(`Unknown action: ${action}`);
          }
          
          newResults.push({
            sessionId: session.id,
            success: true,
            originalData: session
          });
          
        } catch (error: any) {
          newResults.push({
            sessionId: session.id,
            success: false,
            error: error.message || 'Unknown error',
            originalData: session
          });
        }
        
        setProgress(((i + 1) / selectedSessions.length) * 100);
        setResults([...newResults]);
        
        // Small delay for better UX
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      setActiveStep(3);
      onActionComplete(newResults);
      
      const successCount = newResults.filter(r => r.success).length;
      const failureCount = newResults.length - successCount;
      
      if (failureCount === 0) {
        toast({
          title: 'Bulk Action Completed',
          description: `Successfully ${action}ed ${successCount} sessions`,
          variant: 'default'
        });
      } else {
        toast({
          title: 'Bulk Action Completed with Errors',
          description: `${successCount} succeeded, ${failureCount} failed`,
          variant: 'destructive'
        });
      }
      
    } catch (error: any) {
      console.error('Bulk action failed:', error);
      toast({
        title: 'Bulk Action Failed',
        description: error.message || 'Unknown error occurred',
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };
  
  // Handle input changes
  const handleInputChange = (key: string, value: any) => {
    setActionInputs(prev => ({ ...prev, [key]: value }));
  };
  
  // Render step content
  const renderStepContent = (step: number) => {
    switch (step) {
      case 0: // Review Selection
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Selected Sessions ({selectedSessions.length})
            </Typography>
            
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    By Status
                  </Typography>
                  {Object.entries(sessionStats.byStatus).map(([status, count]) => (
                    <Box key={status} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                        {status}
                      </Typography>
                      <Chip label={count} size="small" />
                    </Box>
                  ))}
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    By Trainer
                  </Typography>
                  {Object.entries(sessionStats.byTrainer).map(([trainer, count]) => (
                    <Box key={trainer} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">
                        {trainer}
                      </Typography>
                      <Chip label={count} size="small" />
                    </Box>
                  ))}
                </Paper>
              </Grid>
            </Grid>
            
            <FormControlLabel
              control={
                <Switch
                  checked={previewExpanded}
                  onChange={(e) => setPreviewExpanded(e.target.checked)}
                />
              }
              label="Show session details"
            />
            
            <Collapse in={previewExpanded}>
              <TableContainer component={Paper} sx={{ mt: 2, maxHeight: 300 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date & Time</TableCell>
                      <TableCell>Client</TableCell>
                      <TableCell>Trainer</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Location</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedSessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell>
                          {session.start.toLocaleDateString()} {session.start.toLocaleTimeString()}
                        </TableCell>
                        <TableCell>
                          {session.client ? 
                            `${session.client.firstName} ${session.client.lastName}` : 
                            'Available'
                          }
                        </TableCell>
                        <TableCell>
                          {session.trainer ? 
                            `${session.trainer.firstName} ${session.trainer.lastName}` : 
                            'Unassigned'
                          }
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={session.status} 
                            size="small" 
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{session.location}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Collapse>
          </Box>
        );
        
      case 1: // Configure Action (if needed)
        if (!currentConfig.requiresInput) return null;
        
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Configure {currentConfig.title}
            </Typography>
            
            <Grid container spacing={3}>
              {currentConfig.inputFields?.map((field) => (
                <Grid item xs={12} md={6} key={field.key}>
                  {field.type === 'select' ? (
                    <FormControl fullWidth>
                      <InputLabel>{field.label}</InputLabel>
                      <Select
                        value={actionInputs[field.key] || ''}
                        onChange={(e) => handleInputChange(field.key, e.target.value)}
                      >
                        {field.options?.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  ) : (
                    <TextField
                      fullWidth
                      label={field.label}
                      type={field.type}
                      value={actionInputs[field.key] || ''}
                      onChange={(e) => handleInputChange(field.key, e.target.value)}
                      required={field.required}
                    />
                  )}
                </Grid>
              ))}
            </Grid>
          </Box>
        );
        
      case 2: // Confirm & Execute
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              {processing ? 'Processing...' : 'Ready to Execute'}
            </Typography>
            
            <Alert 
              severity={currentConfig.warningLevel === 'high' ? 'error' : 
                       currentConfig.warningLevel === 'medium' ? 'warning' : 'info'}
              sx={{ mb: 3 }}
            >
              {currentConfig.confirmationText}
            </Alert>
            
            {processing && (
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">
                    Progress: {Math.round(progress)}%
                  </Typography>
                  <Typography variant="body2">
                    {results.filter(r => r.success).length} / {selectedSessions.length} completed
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={progress}
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: currentConfig.color
                    }
                  }}
                />
                
                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    onClick={() => setPaused(!paused)}
                    startIcon={paused ? <Play size={16} /> : <Pause size={16} />}
                  >
                    {paused ? 'Resume' : 'Pause'}
                  </Button>
                  
                  <Button
                    size="small"
                    onClick={() => setProcessing(false)}
                    startIcon={<Square size={16} />}
                  >
                    Stop
                  </Button>
                </Box>
              </Box>
            )}
            
            {results.length > 0 && (
              <FormControlLabel
                control={
                  <Switch
                    checked={showDetails}
                    onChange={(e) => setShowDetails(e.target.checked)}
                  />
                }
                label="Show detailed results"
              />
            )}
            
            <Collapse in={showDetails}>
              <List sx={{ maxHeight: 200, overflow: 'auto' }}>
                {results.map((result, index) => {
                  const session = selectedSessions.find(s => s.id === result.sessionId);
                  return (
                    <ListItem key={result.sessionId}>
                      <ListItemIcon>
                        {result.success ? 
                          <CheckCircle size={20} color="#22c55e" /> : 
                          <XCircle size={20} color="#ef4444" />
                        }
                      </ListItemIcon>
                      <ListItemText
                        primary={session?.title || `Session ${index + 1}`}
                        secondary={result.success ? 'Completed' : result.error}
                      />
                    </ListItem>
                  );
                })}
              </List>
            </Collapse>
          </Box>
        );
        
      case 3: // Results
        const successCount = results.filter(r => r.success).length;
        const failureCount = results.length - successCount;
        
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Action Results
            </Typography>
            
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6}>
                <Paper sx={{ p: 2, backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
                  <Typography variant="h4" color="#22c55e" align="center">
                    {successCount}
                  </Typography>
                  <Typography variant="body2" align="center">
                    Successful
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={6}>
                <Paper sx={{ p: 2, backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                  <Typography variant="h4" color="#ef4444" align="center">
                    {failureCount}
                  </Typography>
                  <Typography variant="body2" align="center">
                    Failed
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
            
            {failureCount > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Some sessions could not be processed. Review the details below.
              </Alert>
            )}
            
            <List sx={{ maxHeight: 300, overflow: 'auto' }}>
              {results.map((result, index) => {
                const session = selectedSessions.find(s => s.id === result.sessionId);
                return (
                  <ListItem key={result.sessionId}>
                    <ListItemIcon>
                      {result.success ? 
                        <CheckCircle size={20} color="#22c55e" /> : 
                        <XCircle size={20} color="#ef4444" />
                      }
                    </ListItemIcon>
                    <ListItemText
                      primary={session?.title || `Session ${index + 1}`}
                      secondary={result.success ? 
                        `Successfully ${action}ed` : 
                        `Failed: ${result.error}`
                      }
                    />
                    {result.success && currentConfig.reversible && onUndo && (
                      <ListItemSecondaryAction>
                        <Tooltip title="Undo this action">
                          <IconButton
                            size="small"
                            onClick={() => onUndo(result.sessionId)}
                          >
                            <RotateCcw size={16} />
                          </IconButton>
                        </Tooltip>
                      </ListItemSecondaryAction>
                    )}
                  </ListItem>
                );
              })}
            </List>
          </Box>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          background: 'linear-gradient(135deg, #0a0a0f, #1e1e3f)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: 'white'
        }
      }}
    >
      <DialogTitle sx={{ 
        background: `linear-gradient(135deg, ${currentConfig.color}20, ${currentConfig.color}40)`,
        display: 'flex',
        alignItems: 'center',
        gap: 1
      }}>
        {currentConfig.icon}
        {currentConfig.title}
        <Chip 
          label={`${selectedSessions.length} sessions`}
          size="small"
          sx={{ ml: 'auto' }}
        />
      </DialogTitle>
      
      <DialogContent sx={{ p: 3 }}>
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((label, index) => (
            <Step key={label}>
              <StepLabel sx={{
                '& .MuiStepLabel-label': { color: 'rgba(255, 255, 255, 0.7)' },
                '& .MuiStepLabel-label.Mui-active': { color: 'white' },
                '& .MuiStepLabel-label.Mui-completed': { color: '#22c55e' }
              }}>
                {label}
              </StepLabel>
              <StepContent>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    {renderStepContent(index)}
                  </motion.div>
                </AnimatePresence>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </DialogContent>
      
      <DialogActions sx={{ p: 3, gap: 1 }}>
        <Button 
          onClick={onClose}
          sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
          disabled={processing}
        >
          {activeStep === steps.length - 1 ? 'Close' : 'Cancel'}
        </Button>
        
        {activeStep > 0 && activeStep < steps.length - 1 && (
          <Button
            onClick={() => setActiveStep(prev => prev - 1)}
            sx={{ color: 'white' }}
            disabled={processing}
          >
            Back
          </Button>
        )}
        
        {activeStep < steps.length - 2 && (
          <GlowButton
            text="Next"
            variant="primary"
            onClick={() => setActiveStep(prev => prev + 1)}
            disabled={processing || (activeStep === 1 && !inputsValid)}
          />
        )}
        
        {activeStep === steps.length - 2 && !processing && (
          <GlowButton
            text={`${currentConfig.title} (${selectedSessions.length})`}
            variant={currentConfig.warningLevel === 'high' ? 'ruby' : 
                     currentConfig.warningLevel === 'medium' ? 'cosmic' : 'emerald'}
            leftIcon={currentConfig.icon}
            onClick={executeBulkAction}
            disabled={currentConfig.requiresInput && !inputsValid}
          />
        )}
      </DialogActions>
    </Dialog>
  );
};

export default BulkActionsConfirmationDialog;