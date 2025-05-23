import React from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  Button, 
  Typography, 
  Avatar, 
  Box, 
  Divider, 
  List, 
  ListItem, 
  ListItemAvatar, 
  ListItemText,
  Skeleton,
  IconButton
} from '@mui/material';
import { UserCheck, UserX, Clock, AlertCircle } from 'lucide-react';
import { useSocialFriends } from '../../../hooks/social/useSocialFriends';
import styled from 'styled-components';

// Styled components
const RequestItem = styled(ListItem)`
  border-radius: 8px;
  margin-bottom: 8px;
  transition: background-color 0.2s ease;
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.04);
  }
`;

const EmptyStateWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  text-align: center;
  color: #666;
`;

const ActionButtons = styled(Box)`
  display: flex;
  gap: 8px;
`;

interface FriendRequestsProps {
  open: boolean;
  onClose: () => void;
}

/**
 * FriendRequests Component
 * Displays incoming friend requests with accept/decline options
 */
const FriendRequests: React.FC<FriendRequestsProps> = ({ open, onClose }) => {
  const { 
    friendRequests, 
    isLoadingRequests, 
    acceptFriendRequest, 
    declineFriendRequest 
  } = useSocialFriends();
  
  // Handle accept friend request
  const handleAccept = async (requestId: string) => {
    await acceptFriendRequest(requestId);
  };
  
  // Handle decline friend request
  const handleDecline = async (requestId: string) => {
    await declineFriendRequest(requestId);
  };
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center">
          <UserCheck size={20} style={{ marginRight: '8px' }} />
          Friend Requests
        </Box>
      </DialogTitle>
      <DialogContent>
        {isLoadingRequests ? (
          <List>
            {[1, 2, 3].map((item) => (
              <ListItem key={item} divider>
                <ListItemAvatar>
                  <Skeleton variant="circular" width={40} height={40} />
                </ListItemAvatar>
                <ListItemText
                  primary={<Skeleton variant="text" width={120} />}
                  secondary={<Skeleton variant="text" width={80} />}
                />
                <Box>
                  <Skeleton variant="rectangular" width={160} height={36} />
                </Box>
              </ListItem>
            ))}
          </List>
        ) : friendRequests.length > 0 ? (
          <List>
            {friendRequests.map((request) => (
              <React.Fragment key={request.id}>
                <RequestItem alignItems="center">
                  <ListItemAvatar>
                    <Avatar 
                      src={request.requester.photo || undefined}
                      alt={`${request.requester.firstName} ${request.requester.lastName}`}
                    >
                      {request.requester.firstName[0]}{request.requester.lastName[0]}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={`${request.requester.firstName} ${request.requester.lastName}`}
                    secondary={
                      <Box display="flex" alignItems="center">
                        <Clock size={14} style={{ marginRight: '4px', opacity: 0.7 }} />
                        <Typography variant="caption" color="text.secondary">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                    }
                  />
                  <ActionButtons>
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      startIcon={<UserCheck size={16} />}
                      onClick={() => handleAccept(request.id)}
                    >
                      Accept
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      startIcon={<UserX size={16} />}
                      onClick={() => handleDecline(request.id)}
                    >
                      Decline
                    </Button>
                  </ActionButtons>
                </RequestItem>
                <Divider variant="inset" component="li" />
              </React.Fragment>
            ))}
          </List>
        ) : (
          <EmptyStateWrapper>
            <AlertCircle size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
            <Typography variant="h6" gutterBottom>
              No pending requests
            </Typography>
            <Typography variant="body2" color="text.secondary">
              When someone sends you a friend request, you'll see it here
            </Typography>
          </EmptyStateWrapper>
        )}
        
        <Box display="flex" justifyContent="flex-end" mt={2}>
          <Button onClick={onClose} color="primary">
            Close
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default FriendRequests;
