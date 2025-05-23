import React, { useState } from 'react';
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
  TextField,
  InputAdornment,
  Tab,
  Tabs,
  CircularProgress
} from '@mui/material';
import { UserPlus, Search, Users, CheckCircle } from 'lucide-react';
import { useSocialFriends } from '../../../hooks/social/useSocialFriends';
import styled from 'styled-components';

// Styled components
const SuggestionItem = styled(ListItem)`
  border-radius: 8px;
  margin-bottom: 8px;
  transition: background-color 0.2s ease;
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.04);
  }
`;

const SearchWrapper = styled.div`
  margin-bottom: 16px;
  margin-top: 16px;
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

interface FriendSuggestionsProps {
  open: boolean;
  onClose: () => void;
}

/**
 * FriendSuggestions Component
 * Displays user suggestions and allows sending friend requests
 */
const FriendSuggestions: React.FC<FriendSuggestionsProps> = ({ open, onClose }) => {
  const { 
    friendSuggestions, 
    isLoadingSuggestions, 
    sendFriendRequest,
    searchUsers
  } = useSocialFriends();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [sentRequests, setSentRequests] = useState<string[]>([]);
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    const results = await searchUsers(searchQuery);
    setSearchResults(results);
    setIsSearching(false);
  };
  
  // Handle search input keydown
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };
  
  // Handle send friend request
  const handleSendRequest = async (userId: string) => {
    await sendFriendRequest(userId);
    setSentRequests([...sentRequests, userId]);
  };
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center">
          <UserPlus size={20} style={{ marginRight: '8px' }} />
          Find Friends
        </Box>
      </DialogTitle>
      <DialogContent>
        <Tabs value={tabValue} onChange={handleTabChange} centered>
          <Tab label="Suggestions" icon={<Users size={16} />} iconPosition="start" />
          <Tab label="Search" icon={<Search size={16} />} iconPosition="start" />
        </Tabs>
        
        {tabValue === 0 && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
              People you may know
            </Typography>
            
            {isLoadingSuggestions ? (
              <List>
                {[1, 2, 3, 4].map((item) => (
                  <ListItem key={item} divider>
                    <ListItemAvatar>
                      <Skeleton variant="circular" width={40} height={40} />
                    </ListItemAvatar>
                    <ListItemText
                      primary={<Skeleton variant="text" width={120} />}
                      secondary={<Skeleton variant="text" width={80} />}
                    />
                    <Box>
                      <Skeleton variant="rectangular" width={100} height={36} />
                    </Box>
                  </ListItem>
                ))}
              </List>
            ) : friendSuggestions.length > 0 ? (
              <List>
                {friendSuggestions.map((user) => (
                  <React.Fragment key={user.id}>
                    <SuggestionItem alignItems="center">
                      <ListItemAvatar>
                        <Avatar 
                          src={user.photo || undefined}
                          alt={`${user.firstName} ${user.lastName}`}
                        >
                          {user.firstName[0]}{user.lastName[0]}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={`${user.firstName} ${user.lastName}`}
                        secondary={`@${user.username}`}
                      />
                      {sentRequests.includes(user.id) ? (
                        <Box display="flex" alignItems="center">
                          <CheckCircle size={16} color="green" style={{ marginRight: '8px' }} />
                          <Typography variant="body2" color="success.main">
                            Request Sent
                          </Typography>
                        </Box>
                      ) : (
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleSendRequest(user.id)}
                          startIcon={<UserPlus size={16} />}
                        >
                          Add Friend
                        </Button>
                      )}
                    </SuggestionItem>
                    <Divider variant="inset" component="li" />
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <EmptyStateWrapper>
                <Users size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
                <Typography variant="h6" gutterBottom>
                  No suggestions available
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Try searching for people you may know
                </Typography>
              </EmptyStateWrapper>
            )}
          </>
        )}
        
        {tabValue === 1 && (
          <>
            <SearchWrapper>
              <TextField
                fullWidth
                placeholder="Search by name or username"
                variant="outlined"
                size="small"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={20} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button 
                        variant="contained" 
                        size="small" 
                        onClick={handleSearch}
                        disabled={!searchQuery.trim() || isSearching}
                      >
                        {isSearching ? <CircularProgress size={20} /> : 'Search'}
                      </Button>
                    </InputAdornment>
                  )
                }}
              />
            </SearchWrapper>
            
            {isSearching ? (
              <Box display="flex" justifyContent="center" my={4}>
                <CircularProgress />
              </Box>
            ) : searchResults.length > 0 ? (
              <List>
                {searchResults.map((user) => (
                  <React.Fragment key={user.id}>
                    <SuggestionItem alignItems="center">
                      <ListItemAvatar>
                        <Avatar 
                          src={user.photo || undefined}
                          alt={`${user.firstName} ${user.lastName}`}
                        >
                          {user.firstName[0]}{user.lastName[0]}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={`${user.firstName} ${user.lastName}`}
                        secondary={`@${user.username}`}
                      />
                      {sentRequests.includes(user.id) ? (
                        <Box display="flex" alignItems="center">
                          <CheckCircle size={16} color="green" style={{ marginRight: '8px' }} />
                          <Typography variant="body2" color="success.main">
                            Request Sent
                          </Typography>
                        </Box>
                      ) : (
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleSendRequest(user.id)}
                          startIcon={<UserPlus size={16} />}
                        >
                          Add Friend
                        </Button>
                      )}
                    </SuggestionItem>
                    <Divider variant="inset" component="li" />
                  </React.Fragment>
                ))}
              </List>
            ) : searchQuery && !isSearching ? (
              <EmptyStateWrapper>
                <Typography variant="body1" gutterBottom>
                  No results found for "{searchQuery}"
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Try a different search term
                </Typography>
              </EmptyStateWrapper>
            ) : (
              <EmptyStateWrapper>
                <Search size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
                <Typography variant="body1" gutterBottom>
                  Search for friends
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Find people by name or username
                </Typography>
              </EmptyStateWrapper>
            )}
          </>
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

export default FriendSuggestions;
