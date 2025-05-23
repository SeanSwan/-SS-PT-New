import React, { useState, useEffect } from 'react';
import { Typography, Avatar, Button, Card, CardContent, Box, Divider, Skeleton, List, ListItem, ListItemAvatar, ListItemText, TextField, InputAdornment, IconButton } from '@mui/material';
import { Search, UserPlus, Users, UserCheck, UserX, MoreHorizontal } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useSocialFriends } from '../../../hooks/social/useSocialFriends';
import FriendRequests from './FriendRequests';
import FriendSuggestions from './FriendSuggestions';
import styled from 'styled-components';

// Styled components
const FriendsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
`;

const SearchBarWrapper = styled.div`
  margin-bottom: 16px;
`;

const FriendItem = styled(ListItem)`
  border-radius: 8px;
  transition: background-color 0.2s ease;
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.04);
  }
`;

const ActionButton = styled(Button)`
  min-width: 100px;
`;

const EmptyStateWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  text-align: center;
`;

/**
 * FriendsList Component
 * Displays a list of friends with search and filter capabilities
 */
const FriendsList: React.FC = () => {
  const { user } = useAuth();
  const { friends, isLoading, removeFriend } = useSocialFriends();
  const [searchQuery, setSearchQuery] = useState('');
  const [showRequests, setShowRequests] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Filter friends based on search query
  const filteredFriends = friends.filter(friend => {
    const fullName = `${friend.firstName} ${friend.lastName}`.toLowerCase();
    const username = friend.username.toLowerCase();
    const query = searchQuery.toLowerCase();
    
    return fullName.includes(query) || username.includes(query);
  });
  
  // Handle remove friend
  const handleRemoveFriend = async (friendId: string, friendshipId: string) => {
    if (window.confirm('Are you sure you want to remove this friend?')) {
      await removeFriend(friendshipId);
    }
  };
  
  // Handle view profile
  const handleViewProfile = (friendId: string) => {
    // Navigate to friend's profile
    window.location.href = `/profile/${friendId}`;
  };
  
  // Render loading state
  if (isLoading) {
    return (
      <FriendsContainer>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Friends
            </Typography>
            <SearchBarWrapper>
              <Skeleton variant="rectangular" height={56} width="100%" />
            </SearchBarWrapper>
            <List>
              {[1, 2, 3, 4, 5].map((item) => (
                <ListItem key={item} divider>
                  <ListItemAvatar>
                    <Skeleton variant="circular" width={40} height={40} />
                  </ListItemAvatar>
                  <ListItemText
                    primary={<Skeleton variant="text" width={120} />}
                    secondary={<Skeleton variant="text" width={80} />}
                  />
                  <Skeleton variant="rectangular" width={100} height={36} />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      </FriendsContainer>
    );
  }
  
  return (
    <FriendsContainer>
      <Card variant="outlined">
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Box display="flex" alignItems="center">
              <Users size={20} style={{ marginRight: '8px' }} />
              <Typography variant="h6">Friends</Typography>
            </Box>
            <Box>
              <Button
                variant="outlined"
                size="small"
                startIcon={<UserPlus size={16} />}
                onClick={() => setShowSuggestions(true)}
              >
                Add Friends
              </Button>
            </Box>
          </Box>
          
          <SearchBarWrapper>
            <TextField
              fullWidth
              placeholder="Search friends..."
              variant="outlined"
              size="small"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={20} />
                  </InputAdornment>
                ),
              }}
            />
          </SearchBarWrapper>
          
          <Box display="flex" justifyContent="space-between" mb={2}>
            <Typography variant="body2" color="text.secondary">
              {friends.length} {friends.length === 1 ? 'Friend' : 'Friends'}
            </Typography>
            <Button
              size="small"
              color="primary"
              onClick={() => setShowRequests(true)}
              startIcon={<UserCheck size={16} />}
            >
              Friend Requests
            </Button>
          </Box>
          
          {friends.length === 0 ? (
            <EmptyStateWrapper>
              <Users size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
              <Typography variant="h6" gutterBottom>
                No friends yet
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Connect with other users to see them here
              </Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<UserPlus size={16} />}
                onClick={() => setShowSuggestions(true)}
                sx={{ mt: 2 }}
              >
                Find Friends
              </Button>
            </EmptyStateWrapper>
          ) : (
            <List>
              {filteredFriends.map((friend) => (
                <React.Fragment key={friend.id}>
                  <FriendItem alignItems="center">
                    <ListItemAvatar>
                      <Avatar 
                        src={friend.photo || undefined}
                        alt={`${friend.firstName} ${friend.lastName}`}
                      >
                        {friend.firstName[0]}{friend.lastName[0]}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={`${friend.firstName} ${friend.lastName}`}
                      secondary={`@${friend.username}`}
                    />
                    <Box>
                      <ActionButton
                        variant="outlined"
                        size="small"
                        onClick={() => handleViewProfile(friend.id)}
                      >
                        View Profile
                      </ActionButton>
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleRemoveFriend(friend.id, friend.friendshipId)}
                        title="Remove friend"
                      >
                        <UserX size={18} />
                      </IconButton>
                    </Box>
                  </FriendItem>
                  <Divider variant="inset" component="li" />
                </React.Fragment>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
      
      {/* Friend Requests Dialog */}
      <FriendRequests 
        open={showRequests} 
        onClose={() => setShowRequests(false)} 
      />
      
      {/* Friend Suggestions Dialog */}
      <FriendSuggestions
        open={showSuggestions}
        onClose={() => setShowSuggestions(false)}
      />
    </FriendsContainer>
  );
};

export default FriendsList;
