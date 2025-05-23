import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
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
  IconButton,
  CircularProgress,
  Tooltip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { 
  InfoOutlined as InfoIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  HealthAndSafety as HealthIcon,
  FitnessCenter as FitnessIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { format } from 'date-fns';

// Import from Redux store
import { RootState } from '../../../../../store';
import { fetchAllOrientations, OrientationData } from '../../../../../store/slices/orientationSlice';

// Styled components for table rows and cells
const StyledTableRow = ({ 
  children, 
  onClick, 
  isSelected = false,
  ...rest 
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  isSelected?: boolean; 
  [key: string]: any;
}) => {
  const theme = useTheme();
  
  return (
    <TableRow 
      onClick={onClick}
      sx={{ 
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': { backgroundColor: theme.palette.action.hover },
        ...(isSelected ? { backgroundColor: `${theme.palette.primary.light}30` } : {}),
        transition: 'background-color 0.2s ease',
      }}
      {...rest}
    >
      {children}
    </TableRow>
  );
};

const DetailsRow = ({ label, value, icon }: { label: string; value: string | null; icon?: React.ReactNode }) => (
  <Box sx={{ display: 'flex', mb: 2, alignItems: 'flex-start' }}>
    {icon && <Box sx={{ mr: 1, color: 'primary.main', mt: 0.5 }}>{icon}</Box>}
    <Box>
      <Typography variant="subtitle2" color="text.secondary">{label}</Typography>
      <Typography variant="body1">{value || 'Not provided'}</Typography>
    </Box>
  </Box>
);

/**
 * OrientationList Component
 * 
 * Displays a list of client orientation submissions with detailed view functionality
 */
const OrientationList: React.FC = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Get orientation data from Redux store
  const { orientations, loading, error } = useSelector(
    (state: RootState) => state.orientation
  );
  
  // Local state for dialog
  const [selectedOrientation, setSelectedOrientation] = useState<OrientationData | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Fetch orientation data on component mount
  useEffect(() => {
    // @ts-ignore (dispatch type issue with async thunk)
    dispatch(fetchAllOrientations());
  }, [dispatch]);
  
  // Handle dialog open/close
  const handleOpenDialog = (orientation: OrientationData) => {
    setSelectedOrientation(orientation);
    setDialogOpen(true);
  };
  
  const handleCloseDialog = () => {
    setDialogOpen(false);
    // Clear the selection after animation completes
    setTimeout(() => setSelectedOrientation(null), 300);
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch (e) {
      return 'Invalid date';
    }
  };
  
  // Handle experience level display
  const getExperienceLevelChip = (level: string | null) => {
    if (!level) return <Chip size="small" label="Not specified" />;
    
    const levels: { [key: string]: { color: "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"; label: string; } } = {
      'Beginner': { color: 'primary', label: 'Beginner' },
      'Intermediate': { color: 'info', label: 'Intermediate' },
      'Advanced': { color: 'success', label: 'Advanced' }
    };
    
    const chipConfig = levels[level] || { color: 'default', label: level };
    return <Chip size="small" color={chipConfig.color} label={chipConfig.label} />;
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error" variant="h6">Error loading orientation data</Typography>
        <Typography color="error">{error}</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          sx={{ mt: 2 }}
          onClick={() => dispatch(fetchAllOrientations())}
        >
          Try Again
        </Button>
      </Box>
    );
  }
  
  return (
    <Box sx={{ width: '100%' }}>
      <Paper elevation={3} sx={{ width: '100%', mb: 2, overflow: 'hidden' }}>
        <Box sx={{ p: 3, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="h6" component="h2" gutterBottom>
            Client Orientation Submissions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Review prospective client orientation forms submitted through the platform.
          </Typography>
        </Box>
        
        <TableContainer sx={{ maxHeight: '60vh' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                {!isMobile && <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>}
                {!isMobile && <TableCell sx={{ fontWeight: 'bold' }}>Phone</TableCell>}
                <TableCell sx={{ fontWeight: 'bold' }}>Experience</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Submitted</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orientations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isMobile ? 4 : 6}>
                    <Typography variant="body1" sx={{ textAlign: 'center', py: 3 }}>
                      No orientation submissions found.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                orientations.map((orientation) => (
                  <StyledTableRow key={orientation.id}>
                    <TableCell>{orientation.fullName}</TableCell>
                    {!isMobile && <TableCell>{orientation.email}</TableCell>}
                    {!isMobile && <TableCell>{orientation.phone}</TableCell>}
                    <TableCell>{getExperienceLevelChip(orientation.experienceLevel)}</TableCell>
                    <TableCell>{formatDate(orientation.createdAt)}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="View Details">
                        <IconButton 
                          size="small" 
                          color="primary" 
                          onClick={() => handleOpenDialog(orientation)}
                        >
                          <InfoIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </StyledTableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      
      {/* Detailed View Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        {selectedOrientation && (
          <>
            <DialogTitle sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              borderBottom: `1px solid ${theme.palette.divider}`
            }}>
              <Typography variant="h6">
                Orientation Details: {selectedOrientation.fullName}
              </Typography>
              <IconButton 
                edge="end" 
                color="inherit" 
                onClick={handleCloseDialog} 
                aria-label="close"
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent sx={{ pb: 4, pt: 3 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 4 }}>
                  {/* Left column */}
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                      Contact Information
                    </Typography>
                    <DetailsRow 
                      label="Full Name" 
                      value={selectedOrientation.fullName} 
                    />
                    <DetailsRow 
                      label="Email" 
                      value={selectedOrientation.email}
                      icon={<EmailIcon fontSize="small" />}
                    />
                    <DetailsRow 
                      label="Phone" 
                      value={selectedOrientation.phone}
                      icon={<PhoneIcon fontSize="small" />}
                    />
                    <DetailsRow 
                      label="Date Submitted" 
                      value={formatDate(selectedOrientation.createdAt)}
                    />
                    <DetailsRow 
                      label="Waiver Initials" 
                      value={selectedOrientation.waiverInitials}
                    />
                  </Box>
                  
                  {/* Right column */}
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                      Fitness Information
                    </Typography>
                    <DetailsRow 
                      label="Experience Level" 
                      value={selectedOrientation.experienceLevel}
                      icon={<FitnessIcon fontSize="small" />}
                    />
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Training Goals
                    </Typography>
                    <Paper 
                      variant="outlined" 
                      sx={{ p: 2, mb: 2, backgroundColor: 'background.paper', minHeight: '80px' }}
                    >
                      <Typography variant="body1">
                        {selectedOrientation.trainingGoals || 'No training goals specified'}
                      </Typography>
                    </Paper>
                  </Box>
                </Box>
                
                {/* Health Information */}
                <Box sx={{ mt: 2 }}>
                  <Typography 
                    variant="subtitle1" 
                    gutterBottom 
                    fontWeight="medium"
                    sx={{ display: 'flex', alignItems: 'center' }}
                  >
                    <HealthIcon fontSize="small" sx={{ mr: 1 }} />
                    Health Information
                  </Typography>
                  <Paper 
                    variant="outlined" 
                    sx={{ p: 2, backgroundColor: 'background.paper', minHeight: '100px' }}
                  >
                    <Typography variant="body1">
                      {selectedOrientation.healthInfo}
                    </Typography>
                  </Paper>
                </Box>
              </Box>
            </DialogContent>
            <DialogActions sx={{ borderTop: `1px solid ${theme.palette.divider}`, p: 2 }}>
              <Button 
                variant="outlined" 
                onClick={handleCloseDialog}
              >
                Close
              </Button>
              <Button 
                variant="contained" 
                color="primary"
                href={`mailto:${selectedOrientation.email}?subject=Your Swan Studios Orientation`}
              >
                Contact Client
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default OrientationList;