import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import styled from 'styled-components';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';

// material-ui
import { Badge, Box, Button, ClickAwayListener, Divider, Grow, IconButton, List, ListItem, ListItemAvatar, ListItemText, Paper, Popper, Typography, CircularProgress, Chip, Avatar } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import InfoIcon from '@mui/icons-material/Info';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import { alpha } from '@mui/material/styles';

// Redux and API
import { RootState } from '../../redux/store';
import { fetchNotifications, markAsRead, markAllAsRead, removeNotification, Notification } from '../../store/slices/notificationSlice';
import api from '../../services/api';

// Styled components
const NotificationBell = styled(IconButton)`
  position: relative;
  transition: transform 0.2s ease-in-out;
  
  &:hover {
    transform: rotate(8deg);
  }
`;

const NotificationScrollArea = styled(Box)`
  max-height: 440px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 160, 227, 0.3) transparent;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: rgba(0, 160, 227, 0.3);
    border-radius: 3px;
  }
`;

const NotificationItem = styled(ListItem)<{ read: boolean }>`
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  background-color: ${props => props.read ? 'transparent' : 'rgba(0, 160, 227, 0.08)'};
  transition: background-color 0.2s ease;
  
  &:hover {
    background-color: rgba(0, 160, 227, 0.12);
    cursor: pointer;
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const EmptyState = styled(Box)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  text-align: center;
`;

// Get icon based on notification type
const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'orientation':
      return <AssignmentIcon color="primary" />;
    case 'workout':
      return <FitnessCenterIcon style={{ color: '#00bf8f' }} />;
    case 'order':
      return <ShoppingCartIcon style={{ color: '#ec4899' }} />;
    case 'client':
      return <EventAvailableIcon style={{ color: '#7851a9' }} />;
    default:
      return <InfoIcon color="info" />;
  }
};

// Format the notification date
const formatNotificationDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    
    if (isToday(date)) {
      return formatDistanceToNow(date, { addSuffix: true });
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'MMM d, yyyy');
    }
  } catch {
    return 'Unknown date';
  }
};

/**
 * Enhanced Notification Section Component
 * Shows notifications in a dropdown with animations and real-time updates
 */
const EnhancedNotificationSection: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  // Local state
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  
  // Redux state
  const { notifications, unreadCount, loading, error } = useSelector(
    (state: RootState) => state.notifications
  );
  
  // Fetch notifications on mount and when the dropdown is opened
  useEffect(() => {
    if (open) {
      dispatch(fetchNotifications());
    }
  }, [dispatch, open]);
  
  // Toggle notification dropdown
  const handleToggle = () => {
    setOpen((prevOpen) => !prevOpen);
  };
  
  // Close dropdown when clicking away
  const handleClose = (event: MouseEvent | TouchEvent) => {
    if (
      anchorRef.current &&
      anchorRef.current.contains(event.target as Node)
    ) {
      return;
    }
    
    setOpen(false);
  };
  
  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    dispatch(markAsRead(notification.id));
    
    // Navigate to the link if provided
    if (notification.link) {
      navigate(notification.link);
      setOpen(false);
    }
  };
  
  // Handle mark all as read
  const handleMarkAllAsRead = () => {
    dispatch(markAllAsRead());
  };
  
  // Handle delete notification
  const handleDeleteNotification = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent the parent click handler from firing
    dispatch(removeNotification(id));
    
    // Call API to delete from server
    api.delete(`/notifications/${id}`).catch(err => {
      console.error('Failed to delete notification:', err);
    });
  };
  
  return (
    <>
      <NotificationBell
        color="inherit"
        ref={anchorRef}
        aria-haspopup="true"
        onClick={handleToggle}
        sx={{ 
          color: 'white',
          '&:hover': {
            color: '#00a0e3',
            backgroundColor: 'rgba(0, 160, 227, 0.05)'
          }
        }}
      >
        <Badge 
          badgeContent={unreadCount} 
          color="error"
          sx={{ 
            '& .MuiBadge-badge': {
              backgroundColor: '#ec4899',
              fontSize: '0.65rem',
              minWidth: '18px',
              height: '18px'
            }
          }}
        >
          <NotificationsIcon fontSize="small" />
        </Badge>
      </NotificationBell>
      
      <Popper
        open={open}
        anchorEl={anchorRef.current}
        role={undefined}
        placement="bottom-end"
        transition
        disablePortal
        style={{ zIndex: 1300 }}
        modifiers={[
          {
            name: 'offset',
            options: {
              offset: [0, 10],
            },
          },
        ]}
      >
        {({ TransitionProps }) => (
          <Grow
            {...TransitionProps}
            style={{ transformOrigin: 'top right' }}
          >
            <Paper
              elevation={6}
              sx={{
                width: 320,
                maxWidth: '100%',
                maxHeight: '80vh',
                overflow: 'hidden',
                backgroundColor: '#0a0a1a',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                color: 'white',
                borderRadius: '8px',
              }}
            >
              <ClickAwayListener onClickAway={handleClose}>
                <Box sx={{ width: '100%' }}>
                  <Box
                    sx={{
                      p: 2,
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                      Notifications
                    </Typography>
                    
                    {unreadCount > 0 && (
                      <Button
                        size="small"
                        startIcon={<CheckCircleIcon fontSize="small" />}
                        onClick={handleMarkAllAsRead}
                        sx={{ 
                          color: '#00a0e3',
                          '&:hover': {
                            backgroundColor: 'rgba(0, 160, 227, 0.08)'
                          }
                        }}
                      >
                        Mark all as read
                      </Button>
                    )}
                  </Box>
                  
                  <Box sx={{ position: 'relative' }}>
                    {loading && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: 'rgba(10, 10, 26, 0.7)',
                          zIndex: 10,
                        }}
                      >
                        <CircularProgress size={32} sx={{ color: '#00a0e3' }} />
                      </Box>
                    )}
                    
                    <NotificationScrollArea>
                      {notifications.length === 0 ? (
                        <EmptyState>
                          <NotificationsOffIcon sx={{ fontSize: 40, color: 'rgba(255,255,255,0.2)', mb: 2 }} />
                          <Typography variant="body1" color="textSecondary">
                            No notifications yet
                          </Typography>
                          <Typography variant="body2" color="textSecondary" sx={{ mt: 1, maxWidth: 250 }}>
                            We'll notify you here when there's new activity in your account
                          </Typography>
                        </EmptyState>
                      ) : (
                        <List sx={{ p: 0 }}>
                          {notifications.map((notification) => (
                            <NotificationItem
                              key={notification.id}
                              read={notification.read}
                              onClick={() => handleNotificationClick(notification)}
                              secondaryAction={
                                <IconButton
                                  edge="end"
                                  size="small"
                                  onClick={(e) => handleDeleteNotification(e, notification.id)}
                                  sx={{ 
                                    color: 'rgba(255,255,255,0.5)',
                                    '&:hover': {
                                      color: '#ec4899',
                                      backgroundColor: 'rgba(236, 72, 153, 0.08)'
                                    }
                                  }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              }
                            >
                              <ListItemAvatar>
                                <Avatar
                                  sx={{
                                    bgcolor: notification.read ?
                                      'rgba(255, 255, 255, 0.1)' :
                                      alpha('#00d9ff', 0.15),
                                  }}
                                >
                                  {getNotificationIcon(notification.type)}
                                </Avatar>
                              </ListItemAvatar>
                              <ListItemText
                                primary={
                                  <Typography
                                    variant="subtitle2"
                                    sx={{
                                      fontWeight: notification.read ? 400 : 600,
                                      color: notification.read ? 'rgba(255,255,255,0.87)' : '#00a0e3',
                                      fontSize: '0.875rem',
                                      mb: 0.5,
                                    }}
                                  >
                                    {notification.title}
                                  </Typography>
                                }
                                secondary={
                                  <Box>
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        color: 'rgba(255,255,255,0.6)',
                                        fontSize: '0.8rem',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                        mb: 0.5,
                                      }}
                                    >
                                      {notification.message}
                                    </Typography>
                                    <Box
                                      sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                      }}
                                    >
                                      <Typography
                                        variant="caption"
                                        sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}
                                      >
                                        {formatNotificationDate(notification.createdAt)}
                                      </Typography>
                                      
                                      {!notification.read && (
                                        <Chip
                                          label="New"
                                          size="small"
                                          sx={{
                                            height: 18,
                                            fontSize: '0.65rem',
                                            backgroundColor: '#00a0e3',
                                            color: 'white',
                                            fontWeight: 600,
                                          }}
                                        />
                                      )}
                                    </Box>
                                  </Box>
                                }
                              />
                            </NotificationItem>
                          ))}
                        </List>
                      )}
                    </NotificationScrollArea>
                  </Box>
                </Box>
              </ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>
    </>
  );
};

export default EnhancedNotificationSection;
