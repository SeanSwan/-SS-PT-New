// src/components/Header/ProfileSection.tsx
import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';

// Swan primitives
import {
  Avatar,
  Card,
  CardContent,
  Chip,
  ClickAwayListener,
  Divider,
  Grid,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  OutlinedInput,
  Paper,
  Popper,
  Stack,
  Switch,
  Typography,
  Box,
  CircularProgress,
  Tooltip,
  Snackbar,
  Alert,
} from '../ui/primitives/components';

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
  margin-left: 16px;
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

const ProfilePopperWrapper = styled.div<{ $open?: boolean }>`
  z-index: 1200;
  width: 300px;
  position: absolute;
  pointer-events: ${({ $open }) => ($open ? 'auto' : 'none')};
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
 */
const ProfileSection: React.FC = () => {
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
        icon={
          <UserAvatar
            src={userPhotoUrl}
            alt={userName}
            ref={anchorRef}
            aria-controls={open ? 'menu-list-grow' : undefined}
            aria-haspopup="true"
          />
        }
        label={<IconSettings stroke={1.5} size="24px" />}
        ref={anchorRef}
        aria-controls={open ? 'menu-list-grow' : undefined}
        aria-haspopup="true"
        onClick={handleToggle}
        aria-label="user-account"
      />
      <Popper
        placement="bottom"
        open={open}
        anchorEl={anchorRef.current}
        modifiers={[{ name: 'offset', options: { offset: [0, 14] } }]}
      >
        {({ TransitionProps }: any) => (
          <ClickAwayListener onClickAway={handleClose}>
            <Transitions in={open} {...TransitionProps}>
              <Paper
                style={{ pointerEvents: open ? 'auto' : 'none' }}
                tabIndex={-1}
                {...(!open ? { inert: 'true' } : {})}
              >
                {open && (
                  <MainCard border={false} elevation={16} content={false} boxShadow="0 16px 48px rgba(0, 0, 0, 0.3)">
                    <Box style={{ padding: 16, paddingBottom: 0 }}>
                      <Stack>
                        <AvatarContainer>
                          <Box style={{ position: 'relative' }}>
                            <BigAvatar src={userPhotoUrl} alt={userName} />
                            <Tooltip title="Upload profile photo">
                              <UploadButton htmlFor="profile-photo-upload">
                                {isUploading ? (
                                  <CircularProgress size={16} />
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
                        <Stack direction="row" spacing={0.5} style={{ alignItems: 'center', justifyContent: 'center' }}>
                          <Typography variant="h4">Hello,</Typography>
                          <Typography variant="h4" style={{ fontWeight: 400 }}>
                            {userName}
                          </Typography>
                        </Stack>
                        <Typography variant="subtitle2" style={{ textAlign: 'center', marginBottom: 16 }}>
                          {userRole}
                        </Typography>
                      </Stack>
                      <OutlinedInput
                        style={{ width: '100%', paddingRight: 8, paddingLeft: 16, margin: '16px 0' }}
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
                      />
                      <Divider />
                    </Box>
                    <ScrollableContent>
                      <Card style={{ background: 'rgba(0, 255, 255, 0.08)', margin: '16px 0' }}>
                        <CardContent>
                          <Grid container spacing={3} style={{ flexDirection: 'column' }}>
                            <Grid item xs={12}>
                              <Grid container style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                                <Grid item>
                                  <Typography variant="subtitle1">Do Not Disturb</Typography>
                                </Grid>
                                <Grid item>
                                  <Switch
                                    checked={sdm}
                                    onChange={(e) => setSdm(e.target.checked)}
                                    name="sdm"
                                    size="small"
                                  />
                                </Grid>
                              </Grid>
                            </Grid>
                            <Grid item xs={12}>
                              <Grid container style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                                <Grid item>
                                  <Typography variant="subtitle1">Allow Notifications</Typography>
                                </Grid>
                                <Grid item>
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
                        style={{
                          width: '100%',
                          maxWidth: 350,
                          minWidth: 300,
                          borderRadius: `${borderRadius}px`,
                        }}
                        tabIndex={open ? 0 : -1}
                      >
                        <ListItemButton
                          selected={selectedIndex === 0}
                          onClick={() => navigate('/account-settings')}
                          tabIndex={open ? 0 : -1}
                          disabled={!open}
                          style={{ borderRadius: `${borderRadius}px` }}
                        >
                          <ListItemIcon>
                            <IconSettings stroke={1.5} size="20px" />
                          </ListItemIcon>
                          <ListItemText primary={<Typography variant="body2">Account Settings</Typography>} />
                        </ListItemButton>
                        <ListItemButton
                          selected={selectedIndex === 1}
                          onClick={() => navigate('/social')}
                          tabIndex={open ? 0 : -1}
                          disabled={!open}
                          style={{ borderRadius: `${borderRadius}px` }}
                        >
                          <ListItemIcon>
                            <IconUser stroke={1.5} size="20px" />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Grid container spacing={1} style={{ justifyContent: 'space-between' }}>
                                <Grid item>
                                  <Typography variant="body2">Social Profile</Typography>
                                </Grid>
                                <Grid item>
                                  <Chip
                                    label="02"
                                    size="small"
                                    color="warning"
                                  />
                                </Grid>
                              </Grid>
                            }
                          />
                        </ListItemButton>
                        <ListItemButton
                          selected={selectedIndex === 4}
                          onClick={handleLogout}
                          tabIndex={open ? 0 : -1}
                          disabled={!open}
                          style={{ borderRadius: `${borderRadius}px` }}
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
      </Popper>

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
          style={{ width: '100%' }}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ProfileSection;
