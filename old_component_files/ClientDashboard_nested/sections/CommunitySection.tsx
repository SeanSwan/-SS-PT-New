import React, { useState } from 'react';
import { 
  Users, 
  MapPin, 
  Calendar, 
  Clock, 
  MessageSquare, 
  UserPlus,
  Heart,
  ThumbsUp,
  Share,
  Search,
  Filter,
  Bell,
  UserCheck,
  AlertCircle,
  Check
} from 'lucide-react';
import ClientMainContent, { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  CardFooter, 
  Grid, 
  Flex,
  Badge,
  Button
} from '../ClientMainContent';

// Mock meetup data
const meetups = [
  {
    id: 1,
    title: 'Weekend Dance Jam',
    description: 'Join us for a fun, all-levels dance session focusing on hip-hop and contemporary styles.',
    category: 'Dance',
    location: 'Central Park Studio',
    date: '2025-05-15T10:00:00',
    duration: 120,
    attendees: 12,
    maxAttendees: 20,
    isRegistered: false,
  },
  {
    id: 2,
    title: 'Art Therapy Workshop',
    description: 'Express yourself through various art media with guidance from our wellness expert.',
    category: 'Art',
    location: 'Community Arts Center',
    date: '2025-05-18T14:30:00',
    duration: 90,
    attendees: 8,
    maxAttendees: 15,
    isRegistered: true,
  },
  {
    id: 3,
    title: 'Group Vocal Session',
    description: 'Practice singing techniques and harmonizing with fellow music enthusiasts.',
    category: 'Singing',
    location: 'Music Studio Downtown',
    date: '2025-05-20T18:00:00',
    duration: 60,
    attendees: 5,
    maxAttendees: 10,
    isRegistered: false,
  },
  {
    id: 4,
    title: 'Fitness & Dance Fusion',
    description: 'Combine cardio workout with dance movements for a fun and effective session.',
    category: 'Fitness/Dance',
    location: 'Wellness Center',
    date: '2025-05-17T09:00:00',
    duration: 75,
    attendees: 15,
    maxAttendees: 20,
    isRegistered: true,
  }
];

// Mock community feed
const communityPosts = [
  {
    id: 101,
    user: {
      id: 1001,
      name: 'Sarah J.',
      avatar: null,
    },
    content: 'Just completed my first contemporary dance routine! Thanks to everyone who supported me along the way. 💃 #DanceProgress',
    type: 'text',
    category: 'Dance',
    postedAt: '2025-05-06T15:30:00',
    likes: 24,
    comments: 7,
    isLiked: true,
  },
  {
    id: 102,
    user: {
      id: 1002,
      name: 'Michael T.',
      avatar: null,
    },
    content: 'Check out my latest painting from the watercolor workshop last weekend. Still learning but really enjoying the process!',
    type: 'image',
    category: 'Art',
    postedAt: '2025-05-05T12:45:00',
    likes: 18,
    comments: 5,
    isLiked: false,
  },
  {
    id: 103,
    user: {
      id: 1003,
      name: 'Trainer Alex',
      avatar: null,
      isStaff: true,
    },
    content: 'New group HIIT session starting next week! Limited spots available. Sign up through the app or message me directly. #FitnessGoals',
    type: 'announcement',
    category: 'Fitness',
    postedAt: '2025-05-04T09:15:00',
    likes: 32,
    comments: 11,
    isLiked: true,
  },
];

// Mock friend suggestions
const friendSuggestions = [
  {
    id: 201,
    name: 'Jessica R.',
    avatar: null,
    mutualConnections: 3,
    interests: ['Dance', 'Fitness'],
  },
  {
    id: 202,
    name: 'David L.',
    avatar: null,
    mutualConnections: 2,
    interests: ['Art', 'Singing'],
  },
  {
    id: 203,
    name: 'Sophia M.',
    avatar: null,
    mutualConnections: 5,
    interests: ['Dance', 'Art'],
  },
];

// Mock friend requests
const friendRequests = [
  {
    id: 301,
    name: 'Robert K.',
    avatar: null,
    requestedAt: '2025-05-03T10:20:00',
    mutualConnections: 1,
  },
  {
    id: 302,
    name: 'Emma S.',
    avatar: null,
    requestedAt: '2025-05-01T14:45:00',
    mutualConnections: 4,
  },
];

// Type for active tab
type CommunityTab = 'feed' | 'meetups' | 'friends';

/**
 * CommunitySection Component
 * 
 * Community hub for connecting with other users, finding meetups,
 * and participating in social activities related to fitness, dance, and creative expression.
 */
const CommunitySection: React.FC = () => {
  // State for active tab
  const [activeTab, setActiveTab] = useState<CommunityTab>('feed');
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return formatDate(dateString).split(',')[0]; // Just the date part
  };

  // Render action buttons based on tab
  const renderActionButtons = () => {
    switch (activeTab) {
      case 'feed':
        return (
          <Button variant="primary">
            Create Post
          </Button>
        );
      case 'meetups':
        return (
          <Button variant="primary">
            Create Meetup
          </Button>
        );
      case 'friends':
        return (
          <Button variant="primary">
            Find Friends
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <ClientMainContent
      title="Community"
      actions={renderActionButtons()}
    >
      {/* Tabs */}
      <Flex style={{ borderBottom: '1px solid var(--border-color)' }}>
        <Button 
          variant={activeTab === 'feed' ? "text" : "text"}
          style={{ 
            borderBottom: activeTab === 'feed' ? '2px solid var(--primary-color)' : 'none',
            borderRadius: 0,
            padding: '0.5rem 1rem',
            opacity: activeTab === 'feed' ? 1 : 0.7,
          }}
          onClick={() => setActiveTab('feed')}
        >
          Community Feed
        </Button>
        <Button 
          variant={activeTab === 'meetups' ? "text" : "text"}
          style={{ 
            borderBottom: activeTab === 'meetups' ? '2px solid var(--primary-color)' : 'none',
            borderRadius: 0,
            padding: '0.5rem 1rem',
            opacity: activeTab === 'meetups' ? 1 : 0.7,
          }}
          onClick={() => setActiveTab('meetups')}
        >
          Meetups & Events
        </Button>
        <Button 
          variant={activeTab === 'friends' ? "text" : "text"}
          style={{ 
            borderBottom: activeTab === 'friends' ? '2px solid var(--primary-color)' : 'none',
            borderRadius: 0,
            padding: '0.5rem 1rem',
            opacity: activeTab === 'friends' ? 1 : 0.7,
          }}
          onClick={() => setActiveTab('friends')}
        >
          Connections
        </Button>
      </Flex>

      {/* Feed Tab */}
      {activeTab === 'feed' && (
        <>
          {/* Create Post Card */}
          <Card>
            <CardContent>
              <Flex style={{ padding: '0.5rem 0' }}>
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '50%', 
                  backgroundColor: 'var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '0.75rem',
                }}>
                  U
                </div>
                
                <div 
                  style={{ 
                    flex: 1, 
                    padding: '0.5rem 1rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '24px',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                  }}
                >
                  What's on your mind?
                </div>
              </Flex>
              
              <Flex style={{ marginTop: '0.75rem', justifyContent: 'space-around' }}>
                <Button variant="text">
                  <Users size={18} style={{ marginRight: '0.5rem' }} />
                  Tag People
                </Button>
                <Button variant="text">
                  <MapPin size={18} style={{ marginRight: '0.5rem' }} />
                  Add Location
                </Button>
                <Button variant="text">
                  <Heart size={18} style={{ marginRight: '0.5rem' }} />
                  Feeling/Activity
                </Button>
              </Flex>
            </CardContent>
          </Card>
          
          {/* Community Feed Posts */}
          {communityPosts.map((post) => (
            <Card key={post.id}>
              <CardContent>
                <Flex style={{ marginBottom: '0.75rem' }}>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '50%', 
                    backgroundColor: 'var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '0.75rem',
                  }}>
                    {post.user.avatar ? (
                      <img 
                        src={post.user.avatar} 
                        alt={post.user.name} 
                        style={{ width: '100%', height: '100%', borderRadius: '50%' }}
                      />
                    ) : (
                      post.user.name.charAt(0)
                    )}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <Flex align="center">
                      <h3 style={{ margin: '0', fontSize: '1rem' }}>
                        {post.user.name}
                      </h3>
                      
                      {post.user.isStaff && (
                        <Badge 
                          color="var(--primary-color)" 
                          style={{ marginLeft: '0.5rem' }}
                        >
                          Staff
                        </Badge>
                      )}
                    </Flex>
                    
                    <Flex align="center">
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {formatRelativeTime(post.postedAt)}
                      </span>
                      
                      {post.category && (
                        <Badge 
                          style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}
                        >
                          {post.category}
                        </Badge>
                      )}
                    </Flex>
                  </div>
                </Flex>
                
                <p style={{ margin: '0 0 1rem' }}>{post.content}</p>
                
                {post.type === 'image' && (
                  <div style={{
                    height: '200px',
                    backgroundColor: 'var(--border-color)',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    Image Placeholder
                  </div>
                )}
                
                <Flex style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                  <Button 
                    variant="text" 
                    style={{ flex: 1, justifyContent: 'center', color: post.isLiked ? 'var(--primary-color)' : undefined }}
                  >
                    <ThumbsUp size={18} style={{ marginRight: '0.5rem' }} />
                    Like ({post.likes})
                  </Button>
                  
                  <Button variant="text" style={{ flex: 1, justifyContent: 'center' }}>
                    <MessageSquare size={18} style={{ marginRight: '0.5rem' }} />
                    Comment ({post.comments})
                  </Button>
                  
                  <Button variant="text" style={{ flex: 1, justifyContent: 'center' }}>
                    <Share size={18} style={{ marginRight: '0.5rem' }} />
                    Share
                  </Button>
                </Flex>
              </CardContent>
            </Card>
          ))}
        </>
      )}

      {/* Meetups Tab */}
      {activeTab === 'meetups' && (
        <>
          {/* Search and Filter */}
          <Flex gap="0.5rem" style={{ marginBottom: '1rem' }}>
            <div style={{ 
              flex: 1,
              position: 'relative',
            }}>
              <input 
                type="text" 
                placeholder="Search meetups..."
                style={{
                  width: '100%',
                  padding: '0.5rem 1rem 0.5rem 2.5rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.9rem',
                }}
              />
              <Search 
                size={18} 
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
            </div>
            
            <Button variant="outline">
              <Filter size={18} style={{ marginRight: '0.5rem' }} />
              Filter
            </Button>
          </Flex>
          
          {/* Meetups Grid */}
          <Grid columns={2}>
            {meetups.map((meetup) => (
              <Card key={meetup.id}>
                <CardContent>
                  <Flex gap="0.5rem" style={{ marginBottom: '0.5rem' }}>
                    <Badge>{meetup.category}</Badge>
                    {meetup.isRegistered && (
                      <Badge color="var(--success)">Registered</Badge>
                    )}
                  </Flex>
                  
                  <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem' }}>{meetup.title}</h3>
                  
                  <p style={{ margin: '0 0 1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    {meetup.description}
                  </p>
                  
                  <Flex style={{ marginBottom: '0.5rem' }}>
                    <MapPin size={16} style={{ marginRight: '0.5rem', color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '0.9rem' }}>{meetup.location}</span>
                  </Flex>
                  
                  <Flex style={{ marginBottom: '0.5rem' }}>
                    <Calendar size={16} style={{ marginRight: '0.5rem', color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '0.9rem' }}>{formatDate(meetup.date)}</span>
                  </Flex>
                  
                  <Flex style={{ marginBottom: '0.5rem' }}>
                    <Clock size={16} style={{ marginRight: '0.5rem', color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '0.9rem' }}>{meetup.duration} minutes</span>
                  </Flex>
                  
                  <Flex style={{ marginBottom: '1rem' }}>
                    <Users size={16} style={{ marginRight: '0.5rem', color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '0.9rem' }}>{meetup.attendees}/{meetup.maxAttendees} Attendees</span>
                  </Flex>
                  
                  <Button 
                    variant={meetup.isRegistered ? "outline" : "primary"}
                    style={{ width: '100%' }}
                  >
                    {meetup.isRegistered ? 'Cancel Registration' : 'Register Now'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </Grid>
        </>
      )}

      {/* Friends Tab */}
      {activeTab === 'friends' && (
        <Grid columns={1}>
          {/* Friend Requests */}
          <Card>
            <CardHeader>
              <CardTitle>Friend Requests</CardTitle>
              <Badge>{friendRequests.length}</Badge>
            </CardHeader>
            
            <CardContent>
              {friendRequests.length > 0 ? (
                friendRequests.map((request) => (
                  <Flex 
                    key={request.id}
                    style={{
                      padding: '0.75rem',
                      borderBottom: '1px solid var(--border-color)',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <div style={{ 
                      width: '50px', 
                      height: '50px', 
                      borderRadius: '50%', 
                      backgroundColor: 'var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '1rem',
                    }}>
                      {request.avatar ? (
                        <img 
                          src={request.avatar} 
                          alt={request.name} 
                          style={{ width: '100%', height: '100%', borderRadius: '50%' }}
                        />
                      ) : (
                        request.name.charAt(0)
                      )}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>{request.name}</h3>
                      
                      <Flex align="center" gap="0.5rem">
                        <Users size={14} style={{ color: 'var(--text-muted)' }} />
                        <span style={{ fontSize: '0.85rem' }}>
                          {request.mutualConnections} mutual {request.mutualConnections === 1 ? 'connection' : 'connections'}
                        </span>
                      </Flex>
                      
                      <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Requested {formatRelativeTime(request.requestedAt)}
                      </span>
                    </div>
                    
                    <Flex gap="0.5rem">
                      <Button variant="primary">
                        <Check size={18} />
                      </Button>
                      <Button variant="outline">
                        <AlertCircle size={18} />
                      </Button>
                    </Flex>
                  </Flex>
                ))
              ) : (
                <p style={{ margin: '0', color: 'var(--text-muted)', textAlign: 'center' }}>
                  No pending friend requests
                </p>
              )}
            </CardContent>
          </Card>
          
          {/* Friend Suggestions */}
          <Card>
            <CardHeader>
              <CardTitle>People You May Know</CardTitle>
            </CardHeader>
            
            <CardContent>
              {friendSuggestions.map((suggestion) => (
                <Flex 
                  key={suggestion.id}
                  style={{
                    padding: '0.75rem',
                    borderBottom: '1px solid var(--border-color)',
                    marginBottom: '0.5rem',
                  }}
                >
                  <div style={{ 
                    width: '50px', 
                    height: '50px', 
                    borderRadius: '50%', 
                    backgroundColor: 'var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '1rem',
                  }}>
                    {suggestion.avatar ? (
                      <img 
                        src={suggestion.avatar} 
                        alt={suggestion.name} 
                        style={{ width: '100%', height: '100%', borderRadius: '50%' }}
                      />
                    ) : (
                      suggestion.name.charAt(0)
                    )}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>{suggestion.name}</h3>
                    
                    <Flex align="center" gap="0.5rem" style={{ marginBottom: '0.25rem' }}>
                      <Users size={14} style={{ color: 'var(--text-muted)' }} />
                      <span style={{ fontSize: '0.85rem' }}>
                        {suggestion.mutualConnections} mutual {suggestion.mutualConnections === 1 ? 'connection' : 'connections'}
                      </span>
                    </Flex>
                    
                    <Flex gap="0.25rem">
                      {suggestion.interests.map((interest, index) => (
                        <Badge key={index} style={{ fontSize: '0.7rem' }}>
                          {interest}
                        </Badge>
                      ))}
                    </Flex>
                  </div>
                  
                  <Button variant="outline">
                    <UserPlus size={18} style={{ marginRight: '0.5rem' }} />
                    Connect
                  </Button>
                </Flex>
              ))}
            </CardContent>
            
            <CardFooter>
              <Button variant="text" style={{ margin: '0 auto' }}>
                View More Suggestions
              </Button>
            </CardFooter>
          </Card>
          
          {/* Your Connections */}
          <Card>
            <CardHeader>
              <CardTitle>Your Connections</CardTitle>
              <Badge>24 Friends</Badge>
            </CardHeader>
            
            <CardContent>
              <Button variant="outline" style={{ width: '100%' }}>
                <UserCheck size={18} style={{ marginRight: '0.5rem' }} />
                View All Connections
              </Button>
            </CardContent>
          </Card>
        </Grid>
      )}
    </ClientMainContent>
  );
};

export default CommunitySection;