import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Card, 
  CardContent, 
  Avatar, 
  Chip,
  Button,
  TextField,
  Tabs,
  Tab,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  IconButton
} from '@mui/material';

// Icons
import GroupIcon from '@mui/icons-material/Group';
import EventIcon from '@mui/icons-material/Event';
import ChatIcon from '@mui/icons-material/Chat';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import PeopleIcon from '@mui/icons-material/People';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import CommentIcon from '@mui/icons-material/Comment';
import ShareIcon from '@mui/icons-material/Share';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

// Placeholder data for community posts
const placeholderPosts = [
  {
    id: 1,
    user: {
      name: 'Sarah Johnson',
      avatar: '/placeholder-avatar-1.jpg'
    },
    content: 'Just completed my first 5K run! Thanks to my trainer for all the motivation and support.',
    likes: 24,
    comments: 8,
    timeAgo: '2 hours ago'
  },
  {
    id: 2,
    user: {
      name: 'Michael Chen',
      avatar: '/placeholder-avatar-2.jpg'
    },
    content: 'Looking for workout buddies in the downtown area. Anyone interested in meeting up on Saturdays?',
    likes: 15,
    comments: 12,
    timeAgo: '5 hours ago'
  },
  {
    id: 3,
    user: {
      name: 'Emma Williams',
      avatar: '/placeholder-avatar-3.jpg'
    },
    content: 'Here\'s my progress after 3 months of consistent training. So happy with the results!',
    likes: 42,
    comments: 7,
    timeAgo: '1 day ago'
  },
];

// Placeholder data for upcoming events
const placeholderEvents = [
  {
    id: 1,
    title: 'Group HIIT Session',
    date: 'May 15, 2025',
    time: '10:00 AM',
    location: 'Central Park',
    attendees: 12
  },
  {
    id: 2,
    title: 'Yoga & Meditation',
    date: 'May 18, 2025',
    time: '9:00 AM',
    location: 'Beach Front',
    attendees: 8
  }
];

// Placeholder data for group suggestions
const placeholderGroups = [
  {
    id: 1,
    name: 'Morning Runners',
    members: 56,
    category: 'Fitness'
  },
  {
    id: 2,
    name: 'Dance Enthusiasts',
    members: 34,
    category: 'Dance'
  },
  {
    id: 3,
    name: 'Wellness Warriors',
    members: 89,
    category: 'Wellness'
  }
];

/**
 * CommunitySection Component
 * 
 * A comprehensive community hub for clients to connect with others,
 * join groups, participate in events, and share their fitness journey.
 */
const CommunitySection: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [postText, setPostText] = useState('');

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Post submitted: ${postText}`);
    setPostText('');
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <GroupIcon sx={{ fontSize: 32, mr: 2, color: 'primary.main' }} />
        <Typography variant="h4" component="h1">Community</Typography>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Feed" icon={<ChatIcon />} iconPosition="start" />
          <Tab label="Events" icon={<EventIcon />} iconPosition="start" />
          <Tab label="Groups" icon={<GroupIcon />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Feed Tab */}
      {tabValue === 0 && (
        <>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Share with the community</Typography>
            <form onSubmit={handlePostSubmit}>
              <TextField
                fullWidth
                multiline
                rows={3}
                placeholder="What's on your mind?"
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                sx={{ mb: 2 }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button 
                  variant="contained" 
                  type="submit"
                  disabled={!postText.trim()}
                >
                  Post
                </Button>
              </Box>
            </form>
          </Paper>

          {/* Community Posts */}
          {placeholderPosts.map(post => (
            <Paper key={post.id} sx={{ p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                <Avatar 
                  src={post.user.avatar} 
                  alt={post.user.name}
                  sx={{ mr: 2 }}
                >
                  {post.user.name[0]}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {post.user.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {post.timeAgo}
                    </Typography>
                  </Box>
                </Box>
                <IconButton size="small">
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              </Box>
              
              <Typography paragraph>
                {post.content}
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Button 
                  startIcon={<ThumbUpIcon />} 
                  size="small"
                >
                  Like ({post.likes})
                </Button>
                <Button 
                  startIcon={<CommentIcon />} 
                  size="small"
                >
                  Comment ({post.comments})
                </Button>
                <Button 
                  startIcon={<ShareIcon />} 
                  size="small"
                >
                  Share
                </Button>
              </Box>
            </Paper>
          ))}
        </>
      )}

      {/* Events Tab */}
      {tabValue === 1 && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">Upcoming Events</Typography>
            <Button variant="outlined" startIcon={<EventIcon />}>
              Create Event
            </Button>
          </Box>

          <Grid container spacing={3}>
            {placeholderEvents.map(event => (
              <Grid item xs={12} sm={6} key={event.id}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>{event.title}</Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <EventIcon sx={{ mr: 1, fontSize: 18, color: 'text.secondary' }} />
                      <Typography variant="body2">
                        {event.date} at {event.time}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <PeopleIcon sx={{ mr: 1, fontSize: 18, color: 'text.secondary' }} />
                      <Typography variant="body2">
                        {event.attendees} attending
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                      <Chip 
                        label={event.location} 
                        size="small" 
                        variant="outlined" 
                      />
                      <Button variant="contained" size="small">
                        Join
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}

      {/* Groups Tab */}
      {tabValue === 2 && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">Suggested Groups</Typography>
            <Button variant="outlined" startIcon={<GroupIcon />}>
              Browse All
            </Button>
          </Box>

          <Grid container spacing={3}>
            {placeholderGroups.map(group => (
              <Grid item xs={12} sm={6} md={4} key={group.id}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>{group.name}</Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <PeopleIcon sx={{ mr: 1, fontSize: 18, color: 'text.secondary' }} />
                      <Typography variant="body2">
                        {group.members} members
                      </Typography>
                    </Box>
                    
                    <Chip 
                      label={group.category} 
                      size="small" 
                      color="primary"
                      variant="outlined"
                      sx={{ mb: 2 }}
                    />
                    
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                      <Button 
                        variant="contained" 
                        size="small" 
                        startIcon={<PersonAddIcon />}
                        fullWidth
                      >
                        Join Group
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}
    </Box>
  );
};

export default CommunitySection;