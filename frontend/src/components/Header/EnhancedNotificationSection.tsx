import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import styled, { keyframes } from 'styled-components';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';

// Swan primitives
import {
  Avatar,
  Badge,
  Box,
  Button,
  Chip,
  CircularProgress,
  ClickAwayListener,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Popper,
  Typography,
} from '../ui/primitives/components';

// Icons (lucide-react replacements for MUI icons)
import {
  Bell,
  BellOff,
  CheckCircle,
  Dumbbell,
  CalendarCheck,
  ClipboardList,
  ShoppingCart,
  Info,
  Trash2,
} from 'lucide-react';

// alpha utility
import { alpha } from '../../styles/mui-replacements';

// Redux and API
import { RootState } from '../../redux/store';
import { fetchNotifications, markAsRead, markAllAsRead, removeNotification, Notification } from '../../store/slices/notificationSlice';
import api from '../../services/api';

// Grow animation (CSS replacement for MUI Grow)
const growIn = keyframes`
  from {
    opacity: 0;
    transform: scale(0.85);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;

// Styled components
const NotificationBell = styled(IconButton)`
  position: relative;
  transition: transform 0.2s ease-in-out;
  color: white;

  &:hover {
    transform: rotate(8deg);
    color: #00a0e3;
    background-color: rgba(0, 160, 227, 0.05);
  }
`;

const GrowWrapper = styled.div`
  transform-origin: top right;
  animation: ${growIn} 0.2s ease-out;
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

const NotificationItem = styled(ListItem)<{ $read: boolean }>`
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  background-color: ${props => props.$read ? 'transparent' : 'rgba(0, 160, 227, 0.08)'};
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

const DeleteButton = styled(IconButton)`
  color: rgba(255, 255, 255, 0.5);

  &:hover {
    color: #ec4899;
    background-color: rgba(236, 72, 153, 0.08);
  }
`;

const MarkAllReadButton = styled(Button)`
  color: #00a0e3;

  &:hover {
    background-color: rgba(0, 160, 227, 0.08);
  }
`;

// Get icon based on notification type
const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'orientation':
      return <ClipboardList size={20} style={{ color: '#00FFFF' }} />;
    case 'workout':
      return <Dumbbell size={20} style={{ color: '#00bf8f' }} />;
    case 'order':
      return <ShoppingCart size={20} style={{ color: '#ec4899' }} />;
    case 'client':
      return <CalendarCheck size={20} style={{ color: '#7851a9' }} />;
    default:
      return <Info size={20} style={{ color: '#03a9f4' }} />;
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
        ref={anchorRef}
        aria-haspopup="true"
        onClick={handleToggle}
      >
        <Badge
          badgeContent={unreadCount}
          color="#ec4899"
        >
          <Bell size={20} />
        </Badge>
      </NotificationBell>

      <Popper
        open={open}
        anchorEl={anchorRef.current}
        placement="bottom-end"
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
        {() => (
          <GrowWrapper>
            <Paper
              style={{
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
                <Box style={{ width: '100%' }}>
                  <Box
                    style={{
                      padding: 16,
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Typography variant="h6" style={{ fontSize: '1rem', fontWeight: 600 }}>
                      Notifications
                    </Typography>

                    {unreadCount > 0 && (
                      <MarkAllReadButton
                        size="small"
                        startIcon={<CheckCircle size={16} />}
                        onClick={handleMarkAllAsRead}
                      >
                        Mark all as read
                      </MarkAllReadButton>
                    )}
                  </Box>

                  <Box style={{ position: 'relative' }}>
                    {loading && (
                      <Box
                        style={{
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
                        <CircularProgress size={32} style={{ color: '#00a0e3' }} />
                      </Box>
                    )}

                    <NotificationScrollArea>
                      {notifications.length === 0 ? (
                        <EmptyState>
                          <BellOff size={40} style={{ color: 'rgba(255,255,255,0.2)', marginBottom: 16 }} />
                          <Typography variant="body1" style={{ color: 'rgba(255,255,255,0.6)' }}>
                            No notifications yet
                          </Typography>
                          <Typography variant="body2" style={{ color: 'rgba(255,255,255,0.6)', marginTop: 8, maxWidth: 250 }}>
                            We'll notify you here when there's new activity in your account
                          </Typography>
                        </EmptyState>
                      ) : (
                        <List style={{ padding: 0 }}>
                          {notifications.map((notification) => (
                            <NotificationItem
                              key={notification.id}
                              $read={notification.read}
                              onClick={() => handleNotificationClick(notification)}
                              secondaryAction={
                                <DeleteButton
                                  size="small"
                                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => handleDeleteNotification(e, notification.id)}
                                >
                                  <Trash2 size={16} />
                                </DeleteButton>
                              }
                            >
                              <ListItemAvatar>
                                <Avatar
                                  style={{
                                    background: notification.read
                                      ? 'rgba(255, 255, 255, 0.1)'
                                      : alpha('#00d9ff', 0.15),
                                  }}
                                >
                                  {getNotificationIcon(notification.type)}
                                </Avatar>
                              </ListItemAvatar>
                              <ListItemText
                                primary={
                                  <Typography
                                    variant="subtitle2"
                                    style={{
                                      fontWeight: notification.read ? 400 : 600,
                                      color: notification.read ? 'rgba(255,255,255,0.87)' : '#00a0e3',
                                      fontSize: '0.875rem',
                                      marginBottom: 4,
                                    }}
                                  >
                                    {notification.title}
                                  </Typography>
                                }
                                secondary={
                                  <Box>
                                    <Typography
                                      variant="body2"
                                      style={{
                                        color: 'rgba(255,255,255,0.6)',
                                        fontSize: '0.8rem',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                        marginBottom: 4,
                                      }}
                                    >
                                      {notification.message}
                                    </Typography>
                                    <Box
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                      }}
                                    >
                                      <Typography
                                        variant="caption"
                                        style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}
                                      >
                                        {formatNotificationDate(notification.createdAt)}
                                      </Typography>

                                      {!notification.read && (
                                        <Chip
                                          label="New"
                                          size="small"
                                          style={{
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
          </GrowWrapper>
        )}
      </Popper>
    </>
  );
};

export default EnhancedNotificationSection;
