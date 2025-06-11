import React, { useState } from 'react';
import { 
  Palette, 
  Music, 
  Video, 
  Image, 
  Upload, 
  Play, 
  Heart, 
  MessageSquare,
  Share,
  PlusCircle,
  Filter,
  Layout,
  Grid as GridIcon
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

// Mock data for creative works
const creativeWorks = [
  {
    id: 1,
    title: 'My First Dance Routine',
    type: 'video',
    category: 'Dance',
    thumbnail: '/placeholder-dance.jpg',
    dateCreated: '2025-05-02T14:30:00',
    likes: 12,
    comments: 3,
    isPublic: true,
  },
  {
    id: 2,
    title: 'Watercolor Inspiration',
    type: 'image',
    category: 'Art',
    thumbnail: '/placeholder-art.jpg',
    dateCreated: '2025-04-28T09:15:00',
    likes: 8,
    comments: 2,
    isPublic: true,
  },
  {
    id: 3,
    title: 'Cover Song - Practice Session',
    type: 'audio',
    category: 'Singing',
    thumbnail: '/placeholder-audio.jpg',
    dateCreated: '2025-05-01T16:45:00',
    likes: 5,
    comments: 1,
    isPublic: false,
  },
  {
    id: 4,
    title: 'Contemporary Dance Study',
    type: 'video',
    category: 'Dance',
    thumbnail: '/placeholder-dance2.jpg',
    dateCreated: '2025-04-25T10:20:00',
    likes: 15,
    comments: 4,
    isPublic: true,
  },
  {
    id: 5,
    title: 'Abstract Painting Series',
    type: 'image',
    category: 'Art',
    thumbnail: '/placeholder-art2.jpg',
    dateCreated: '2025-04-20T11:00:00',
    likes: 20,
    comments: 7,
    isPublic: true,
  },
];

// Mock data for featured community works
const communityWorks = [
  {
    id: 101,
    title: 'Urban Dance Showcase',
    type: 'video',
    category: 'Dance',
    thumbnail: '/placeholder-community1.jpg',
    creator: 'Michelle K.',
    dateCreated: '2025-05-03T15:30:00',
    likes: 45,
    comments: 12,
  },
  {
    id: 102,
    title: 'Mixed Media Collection',
    type: 'image',
    category: 'Art',
    thumbnail: '/placeholder-community2.jpg',
    creator: 'James T.',
    dateCreated: '2025-05-01T09:15:00',
    likes: 38,
    comments: 8,
  },
  {
    id: 103,
    title: 'Vocal Performance - Original Song',
    type: 'audio',
    category: 'Singing',
    thumbnail: '/placeholder-community3.jpg',
    creator: 'Sophia R.',
    dateCreated: '2025-05-02T14:45:00',
    likes: 52,
    comments: 15,
  },
];

// Mock creative resources
const creativeResources = [
  {
    id: 201,
    title: 'Dance Fundamentals Workshop',
    type: 'Course',
    category: 'Dance',
    description: 'Learn the basics of multiple dance styles with expert instruction',
    duration: '8 weeks',
  },
  {
    id: 202,
    title: 'Art Therapy & Expression',
    type: 'Guide',
    category: 'Art',
    description: 'Using art for mental wellness and emotional expression',
    duration: 'Self-paced',
  },
  {
    id: 203,
    title: 'Vocal Techniques for Beginners',
    type: 'Course',
    category: 'Singing',
    description: 'Develop your singing voice from the ground up',
    duration: '6 weeks',
  },
];

// Type for creative work category
type CreativeCategory = 'All' | 'Art' | 'Dance' | 'Singing';

/**
 * CreativeHubSection Component
 * 
 * Showcase for client's creative works including art, dance videos, and singing recordings.
 * Provides tools for uploading, sharing, and discovering creative content.
 */
const CreativeHubSection: React.FC = () => {
  // State for active category filter
  const [activeCategory, setActiveCategory] = useState<CreativeCategory>('All');
  
  // State for view mode (grid or list)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Filter works by category
  const filteredWorks = activeCategory === 'All' 
    ? creativeWorks 
    : creativeWorks.filter(work => work.category === activeCategory);

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Get icon for creative work type
  const getIconForType = (type: string) => {
    switch (type) {
      case 'video':
        return <Video size={20} />;
      case 'image':
        return <Image size={20} />;
      case 'audio':
        return <Music size={20} />;
      default:
        return <Palette size={20} />;
    }
  };

  // Actions for header
  const headerActions = (
    <Button variant="primary">
      <PlusCircle size={18} style={{ marginRight: '0.5rem' }} />
      New Creation
    </Button>
  );

  return (
    <ClientMainContent
      title="Creative Hub"
      actions={headerActions}
    >
      {/* Category filters and view options */}
      <Flex justify="space-between" align="center">
        <Flex gap="0.5rem">
          <Button 
            variant={activeCategory === 'All' ? "primary" : "outline"}
            onClick={() => setActiveCategory('All')}
          >
            All
          </Button>
          <Button 
            variant={activeCategory === 'Art' ? "primary" : "outline"}
            onClick={() => setActiveCategory('Art')}
          >
            <Palette size={18} style={{ marginRight: '0.5rem' }} />
            Art
          </Button>
          <Button 
            variant={activeCategory === 'Dance' ? "primary" : "outline"}
            onClick={() => setActiveCategory('Dance')}
          >
            <Video size={18} style={{ marginRight: '0.5rem' }} />
            Dance
          </Button>
          <Button 
            variant={activeCategory === 'Singing' ? "primary" : "outline"}
            onClick={() => setActiveCategory('Singing')}
          >
            <Music size={18} style={{ marginRight: '0.5rem' }} />
            Singing
          </Button>
        </Flex>
        
        <Flex gap="0.5rem">
          <Button 
            variant={viewMode === 'grid' ? "outline" : "text"}
            onClick={() => setViewMode('grid')}
            aria-label="Grid view"
          >
            <GridIcon size={20} />
          </Button>
          <Button 
            variant={viewMode === 'list' ? "outline" : "text"}
            onClick={() => setViewMode('list')}
            aria-label="List view"
          >
            <Layout size={20} />
          </Button>
          <Button variant="text" aria-label="Filter options">
            <Filter size={20} />
          </Button>
        </Flex>
      </Flex>

      {/* My Creations Section */}
      <Card>
        <CardHeader>
          <CardTitle>My Creations</CardTitle>
          <Flex gap="0.5rem">
            <Badge>{filteredWorks.length} Items</Badge>
            <Button variant="text">View All</Button>
          </Flex>
        </CardHeader>
        
        <CardContent>
          {viewMode === 'grid' ? (
            /* Grid View */
            <Grid columns={3}>
              {filteredWorks.map((work) => (
                <div 
                  key={work.id}
                  style={{
                    borderRadius: '8px',
                    overflow: 'hidden',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <div style={{
                    height: '160px',
                    backgroundColor: 'var(--border-color)',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {getIconForType(work.type)}
                    
                    {work.type === 'video' && (
                      <Button
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          borderRadius: '50%',
                          width: '40px',
                          height: '40px',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Play size={20} />
                      </Button>
                    )}
                    
                    <Badge
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                      }}
                    >
                      {work.category}
                    </Badge>
                  </div>
                  
                  <div style={{ padding: '0.75rem' }}>
                    <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>{work.title}</h3>
                    
                    <Flex justify="space-between">
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {formatDate(work.dateCreated)}
                      </span>
                      
                      <Flex gap="0.5rem">
                        <Flex gap="0.25rem" align="center">
                          <Heart size={16} color="var(--accent)" />
                          <span style={{ fontSize: '0.8rem' }}>{work.likes}</span>
                        </Flex>
                        
                        <Flex gap="0.25rem" align="center">
                          <MessageSquare size={16} color="var(--text-muted)" />
                          <span style={{ fontSize: '0.8rem' }}>{work.comments}</span>
                        </Flex>
                      </Flex>
                    </Flex>
                  </div>
                </div>
              ))}
              
              {/* Upload card */}
              <div
                style={{
                  borderRadius: '8px',
                  border: '2px dashed var(--border-color)',
                  height: '240px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <Upload size={32} color="var(--primary-color)" />
                <p style={{ margin: '1rem 0 0', color: 'var(--text-muted)' }}>Upload New Creation</p>
              </div>
            </Grid>
          ) : (
            /* List View */
            <div>
              {filteredWorks.map((work) => (
                <Flex 
                  key={work.id}
                  style={{
                    padding: '0.75rem',
                    borderBottom: '1px solid var(--border-color)',
                    marginBottom: '0.5rem',
                  }}
                >
                  <div style={{ 
                    padding: '1rem', 
                    borderRadius: '8px', 
                    backgroundColor: 'var(--border-color)',
                    marginRight: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {getIconForType(work.type)}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>{work.title}</h3>
                    
                    <Flex gap="0.5rem">
                      <Badge>{work.category}</Badge>
                      <Badge color={work.isPublic ? 'var(--success)' : 'var(--grey)'}>
                        {work.isPublic ? 'Public' : 'Private'}
                      </Badge>
                    </Flex>
                    
                    <Flex gap="1rem" style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <span>{formatDate(work.dateCreated)}</span>
                      
                      <Flex gap="0.25rem" align="center">
                        <Heart size={16} color="var(--accent)" />
                        <span>{work.likes}</span>
                      </Flex>
                      
                      <Flex gap="0.25rem" align="center">
                        <MessageSquare size={16} />
                        <span>{work.comments}</span>
                      </Flex>
                    </Flex>
                  </div>
                  
                  <Flex gap="0.5rem">
                    {work.type === 'video' && (
                      <Button variant="outline" aria-label="Play video">
                        <Play size={18} />
                      </Button>
                    )}
                    
                    <Button variant="outline" aria-label="Share creation">
                      <Share size={18} />
                    </Button>
                  </Flex>
                </Flex>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Community Showcase */}
      <Card>
        <CardHeader>
          <CardTitle>Community Showcase</CardTitle>
          <Button variant="text">Browse All</Button>
        </CardHeader>
        
        <CardContent>
          <Grid columns={3}>
            {communityWorks.map((work) => (
              <div 
                key={work.id}
                style={{
                  borderRadius: '8px',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{
                  height: '160px',
                  backgroundColor: 'var(--border-color)',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {getIconForType(work.type)}
                  
                  {work.type === 'video' && (
                    <Button
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Play size={20} />
                    </Button>
                  )}
                  
                  <Badge
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                    }}
                  >
                    {work.category}
                  </Badge>
                </div>
                
                <div style={{ padding: '0.75rem' }}>
                  <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>{work.title}</h3>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    By {work.creator}
                  </p>
                  
                  <Flex justify="space-between">
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {formatDate(work.dateCreated)}
                    </span>
                    
                    <Flex gap="0.5rem">
                      <Flex gap="0.25rem" align="center">
                        <Heart size={16} color="var(--accent)" />
                        <span style={{ fontSize: '0.8rem' }}>{work.likes}</span>
                      </Flex>
                      
                      <Flex gap="0.25rem" align="center">
                        <MessageSquare size={16} color="var(--text-muted)" />
                        <span style={{ fontSize: '0.8rem' }}>{work.comments}</span>
                      </Flex>
                    </Flex>
                  </Flex>
                </div>
              </div>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Resources & Tutorials */}
      <Card>
        <CardHeader>
          <CardTitle>Resources & Tutorials</CardTitle>
          <Button variant="text">View All</Button>
        </CardHeader>
        
        <CardContent>
          <Grid columns={3}>
            {creativeResources.map((resource) => (
              <div 
                key={resource.id}
                style={{
                  borderRadius: '8px',
                  padding: '1rem',
                  boxShadow: 'var(--shadow-sm)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <Badge>{resource.category}</Badge>
                <Badge color="var(--secondary-color)" style={{ marginLeft: '0.5rem' }}>
                  {resource.type}
                </Badge>
                
                <h3 style={{ margin: '0.75rem 0', fontSize: '1.1rem' }}>{resource.title}</h3>
                
                <p style={{ margin: '0 0 1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  {resource.description}
                </p>
                
                <Flex justify="space-between" align="center">
                  <span style={{ fontSize: '0.8rem' }}>
                    Duration: {resource.duration}
                  </span>
                  
                  <Button variant="outline" size="small">
                    View Details
                  </Button>
                </Flex>
              </div>
            ))}
          </Grid>
        </CardContent>
      </Card>
    </ClientMainContent>
  );
};

export default CreativeHubSection;