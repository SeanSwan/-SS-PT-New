// src/components/Header/ProfileSection.tsx
import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';

// material-ui
import { useTheme } from '@mui/material/styles';
import Avatar from '@mui/material/Avatar';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid2';
import InputAdornment from '@mui/material/InputAdornment';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import OutlinedInput from '@mui/material/OutlinedInput';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

// project imports
import MainCard from '../ui/MainCard';
import Transitions from '../ui/Transitions';
import useConfig from '../../hooks/useConfig';
import { useAuth } from '../../context/AuthContext';

// assets
import DefaultUserImage from '../../assets/users/user-round.svg';
import { IconLogout, IconSearch, IconSettings, IconUser, IconCamera, IconUpload } from '@tabler/icons-react';

// Styled components
const ProfileChip = styled(Chip)`
  height: 48px;
  align-items: center;
  border-radius: 27px;
  
  & .MuiChip-label {
    line-height: 0;
  }
`;

const UserAvatar = styled(Avatar)`
  margin: 8px 0 8px 8px !important;
  cursor: pointer;
  border: 2px solid #00ffff;
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
  transition: all 0.3s ease;
  
  &:hover {
    box-shadow: 0 0 15px rgba(0, 255, 255, 0.5);
    transform: scale(1.05);
  }
`;

const ProfilePopper = styled(Popper)`
  z-index: 1200;
  width: 300px;
`;

const ScrollableContent = styled(Box)`
  padding: 16px;
  padding-bottom: 0;
  height: 100%;
  max-height: calc(100vh - 250px);
  overflow-x: hidden;
  
  &::-webkit-scrollbar {
    width: 5px;
  }
`;

const AvatarContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
`;

const BigAvatar = styled(Avatar)`
  width: 80px;
  height: 80px;
  border: 3px solid #00ffff;
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.4);
  margin-bottom: 16px;
  
  &:hover {
    cursor: pointer;
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.6);
  }
`;

const UploadButton = styled.label`
  position: absolute;
  bottom: -5px;
  right: -5px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #7851a9;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: white;
  border: 2px solid #f0f0f0;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  
  &:hover {
    transform: scale(1.1);
    background: #00ffff;
    color: #000;
  }
  
  input {
    display: none;
  }
`;

/**
 * ProfileSection Component
 * 
 * Displays the user's profile information in the header and
 * provides a dropdown with account settings and logout options.
 * 
 * Enhanced with:
 * - User's profile photo from database
 * - Ability to upload/change profile photo
 * - Improved UI styling and animations
 */
const ProfileSection: React.FC = () => {
  const theme = useTheme();
  const { borderRadius } = useConfig();
  const { user, logout, uploadProfilePhoto } = useAuth();
  const navigate = useNavigate();
  
  const [sdm, setSdm] = useState(true);
  const [value, setValue] = useState('');
  const [notification, setNotification] = useState(false);
  const [selectedIndex] = useState(-1);
  const [open, setOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'success' as 'success' | 'error' });

  const anchorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleToggle = () => {
    setOpen((prevOpen) => !prevOpen);
  };

  const handleClose = (event: Event | React.SyntheticEvent) => {
    if (anchorRef.current && anchorRef.current.contains(event.target as Node)) {
      return;
    }
    setOpen(false);
  };

  const handleLogout = () => {
    logout();
    handleClose(new Event('logout'));
    navigate('/');
  };

  // Function to handle profile photo upload
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setAlert({
        show: true,
        message: 'Please select an image file (JPG, PNG, etc.)',
        severity: 'error'
      });
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setAlert({
        show: true,
        message: 'File size exceeds 5MB limit',
        severity: 'error'
      });
      return;
    }
    
    try {
      setIsUploading(true);
      
      // Upload the photo using the context method
      await uploadProfilePhoto(file);
      
      setAlert({
        show: true,
        message: 'Profile photo updated successfully',
        severity: 'success'
      });
      
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      setAlert({
        show: true,
        message: error instanceof Error ? error.message : 'Failed to upload profile photo',
        severity: 'error'
      });
    } finally {
      setIsUploading(false);
      
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Get user's name from user object or fallback to 'User'
  const userName = user?.firstName ? `${user.firstName} ${user.lastName || ''}` : (user?.username || 'User');
  
  // Get user's role from user object or fallback to 'User'
  const userRole = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User';
  
  // Get user's profile photo URL from user object or fallback to default
  const userPhotoUrl = user?.photo || DefaultUserImage;

  const prevOpen = useRef(open);
  useEffect(() => {
    if (prevOpen.current === true && open === false) {
      if (anchorRef.current) {
        anchorRef.current.focus();
      }
    }
    prevOpen.current = open;
  }, [open]);

  return (
    <>
      <ProfileChip
        sx={{ ml: 2 }}
        icon={
          <UserAvatar
            src={userPhotoUrl}
            alt={userName}
            ref={anchorRef}
            aria-controls={open ? 'menu-list-grow' : undefined}
            aria-haspopup="true"
            color="inherit"
          />
        }
        label={<IconSettings stroke={1.5} size="24px" />}
        variant="outlined"
        ref={anchorRef}
        aria-controls={open ? 'menu-list-grow' : undefined}
        aria-haspopup="true"
        onClick={handleToggle}
        color="primary"
        aria-label="user-account"
      />
      <ProfilePopper
        placement="bottom"
        open={open}
        anchorEl={anchorRef.current}
        role={undefined}
        transition
        disablePortal
        modifiers={[
          {
            name: 'offset',
            options: {
              offset: [0, 14]
            }
          }
        ]}
      >
        {({ TransitionProps }) => (
          <ClickAwayListener onClickAway={handleClose}>
            <Transitions in={open} {...TransitionProps}>
              <Paper>
                {open && (
                  <MainCard border={false} elevation={16} content={false} boxShadow={theme.shadows[16]}>
                    <Box sx={{ p: 2, pb: 0 }}>
                      <Stack>
                        <AvatarContainer>
                          <Box sx={{ position: 'relative' }}>
                            <BigAvatar src={userPhotoUrl} alt={userName} />
                            <Tooltip title="Upload profile photo">
                              <UploadButton htmlFor="profile-photo-upload">
                                {isUploading ? (
                                  <CircularProgress size={16} color="inherit" />
                                ) : (
                                  <IconCamera size={16} />
                                )}
                                <input
                                  id="profile-photo-upload"
                                  type="file"
                                  accept="image/*"
                                  ref={fileInputRef}
                                  onChange={handlePhotoUpload}
                                  disabled={isUploading}
                                />
                              </UploadButton>
                            </Tooltip>
                          </Box>
                        </AvatarContainer>
                        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                          <Typography variant="h4">Hello,</Typography>
                          <Typography component="span" variant="h4" sx={{ fontWeight: 400 }}>
                            {userName}
                          </Typography>
                        </Stack>
                        <Typography variant="subtitle2" textAlign="center" sx={{ mb: 2 }}>
                          {userRole}
                        </Typography>
                      </Stack>
                      <OutlinedInput
                        sx={{ width: '100%', pr: 1, pl: 2, my: 2 }}
                        id="input-search-profile"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder="Search profile options"
                        startAdornment={
                          <InputAdornment position="start">
                            <IconSearch stroke={1.5} size="16px" />
                          </InputAdornment>
                        }
                        aria-describedby="search-helper-text"
                        inputProps={{
                          'aria-label': 'weight'
                        }}
                      />
                      <Divider />
                    </Box>
                    <ScrollableContent>
                      <Card sx={{ bgcolor: 'primary.light', my: 2 }}>
                        <CardContent>
                          <Grid container spacing={3} direction="column">
                            <Grid>
                              <Grid container alignItems="center" justifyContent="space-between">
                                <Grid>
                                  <Typography variant="subtitle1">Do Not Disturb</Typography>
                                </Grid>
                                <Grid>
                                  <Switch
                                    color="primary"
                                    checked={sdm}
                                    onChange={(e) => setSdm(e.target.checked)}
                                    name="sdm"
                                    size="small"
                                  />
                                </Grid>
                              </Grid>
                            </Grid>
                            <Grid>
                              <Grid container alignItems="center" justifyContent="space-between">
                                <Grid>
                                  <Typography variant="subtitle1">Allow Notifications</Typography>
                                </Grid>
                                <Grid>
                                  <Switch
                                    checked={notification}
                                    onChange={(e) => setNotification(e.target.checked)}
                                    name="sdm"
                                    size="small"
                                  />
                                </Grid>
                              </Grid>
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                      <Divider />
                      <List
                        component="nav"
                        sx={{
                          width: '100%',
                          maxWidth: 350,
                          minWidth: 300,
                          borderRadius: `${borderRadius}px`,
                          '& .MuiListItemButton-root': { mt: 0.5 }
                        }}
                      >
                        <ListItemButton 
                          sx={{ borderRadius: `${borderRadius}px` }} 
                          selected={selectedIndex === 0}
                          onClick={() => navigate('/account-settings')}
                        >
                          <ListItemIcon>
                            <IconSettings stroke={1.5} size="20px" />
                          </ListItemIcon>
                          <ListItemText primary={<Typography variant="body2">Account Settings</Typography>} />
                        </ListItemButton>
                        <ListItemButton 
                          sx={{ borderRadius: `${borderRadius}px` }} 
                          selected={selectedIndex === 1}
                          onClick={() => navigate('/social-profile')}
                        >
                          <ListItemIcon>
                            <IconUser stroke={1.5} size="20px" />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Grid container spacing={1} justifyContent="space-between">
                                <Grid>
                                  <Typography variant="body2">Social Profile</Typography>
                                </Grid>
                                <Grid>
                                  <Chip
                                    label="02"
                                    size="small"
                                    color="warning"
                                    sx={{ '& .MuiChip-label': { mt: 0.25 } }}
                                  />
                                </Grid>
                              </Grid>
                            }
                          />
                        </ListItemButton>
                        <ListItemButton 
                          sx={{ borderRadius: `${borderRadius}px` }} 
                          selected={selectedIndex === 4}
                          onClick={handleLogout}
                        >
                          <ListItemIcon>
                            <IconLogout stroke={1.5} size="20px" />
                          </ListItemIcon>
                          <ListItemText primary={<Typography variant="body2">Logout</Typography>} />
                        </ListItemButton>
                      </List>
                    </ScrollableContent>
                  </MainCard>
                )}
              </Paper>
            </Transitions>
          </ClickAwayListener>
        )}
      </ProfilePopper>

      {/* Toast notifications for file upload status */}
      <Snackbar 
        open={alert.show} 
        autoHideDuration={6000} 
        onClose={() => setAlert({ ...alert, show: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setAlert({ ...alert, show: false })} 
          severity={alert.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ProfileSection;