import React from 'react';
import { 
  UserCircle, 
  Mail, 
  Phone, 
  Edit, 
  Camera,
  MapPin,
  Calendar,
  Dumbbell,
  Music,
  Palette,
  Activity,
  Award,
  Settings
} from 'lucide-react';
import ClientMainContent, { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  Grid, 
  Flex,
  Badge,
  Button
} from '../ClientMainContent';

/**
 * ProfileSection Component
 * 
 * Displays and allows editing of the client's profile information,
 * including personal details, preferences, and achievements.
 */
const ProfileSection: React.FC = () => {
  // Mock user data
  const user = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1 (555) 123-4567',
    address: '123 Main St, Anytown, CA 12345',
    dateJoined: '2024-12-15T10:30:00',
    bio: 'Fitness enthusiast and aspiring artist. Love to challenge myself with new workouts and creative pursuits.',
    interests: ['Strength Training', 'Contemporary Dance', 'Watercolor Painting', 'Vocal Training'],
    achievements: 12,
    sessions: 48,
    connections: 15,
    creations: 8,
    socialLinks: {
      instagram: 'johndoe_fitness',
      facebook: 'johndoe.fitness',
      youtube: 'JohnDoeFitness',
    },
    fitnessPreferences: {
      workoutFrequency: '3-4 times per week',
      preferredWorkouts: ['HIIT', 'Strength Training', 'Yoga'],
      fitnessGoals: ['Increase strength', 'Improve flexibility', 'Reduce stress'],
    },
    creativePreferences: {
      artForms: ['Painting', 'Dance', 'Singing'],
      experience: 'Beginner',
      creativeGoals: ['Express emotions', 'Build confidence', 'Learn new techniques'],
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <ClientMainContent
      title="My Profile"
      actions={
        <Button variant="outline">
          <Settings size={18} style={{ marginRight: '0.5rem' }} />
          Account Settings
        </Button>
      }
    >
      {/* Profile Header */}
      <Card>
        <CardContent>
          <Flex align="flex-start">
            {/* Profile Image */}
            <div style={{ 
              position: 'relative',
              marginRight: '2rem',
            }}>
              <div style={{ 
                width: '120px', 
                height: '120px', 
                borderRadius: '50%', 
                backgroundColor: 'var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.5rem',
                fontWeight: 'bold',
                color: 'var(--text-muted)',
                overflow: 'hidden',
              }}>
                {user.name.charAt(0)}
              </div>
              
              <Button 
                style={{
                  position: 'absolute',
                  bottom: '5px',
                  right: '5px',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'var(--primary-color)',
                }}
              >
                <Camera size={16} />
              </Button>
            </div>
            
            {/* Profile Info */}
            <div style={{ flex: 1 }}>
              <Flex align="center" style={{ marginBottom: '0.5rem' }}>
                <h2 style={{ margin: '0', fontSize: '1.5rem' }}>{user.name}</h2>
                <Button 
                  variant="text" 
                  style={{ marginLeft: '0.5rem' }}
                  aria-label="Edit profile"
                >
                  <Edit size={16} />
                </Button>
              </Flex>
              
              <p style={{ 
                margin: '0 0 1rem', 
                color: 'var(--text-muted)',
                fontSize: '0.9rem',
              }}>
                Member since {formatDate(user.dateJoined)}
              </p>
              
              <p style={{ 
                margin: '0 0 1rem',
                fontSize: '0.95rem',
                maxWidth: '600px',
              }}>
                {user.bio}
              </p>
              
              <Flex gap="0.5rem" style={{ marginBottom: '0.5rem' }}>
                <Mail size={16} style={{ color: 'var(--text-muted)' }} />
                <span>{user.email}</span>
              </Flex>
              
              <Flex gap="0.5rem" style={{ marginBottom: '0.5rem' }}>
                <Phone size={16} style={{ color: 'var(--text-muted)' }} />
                <span>{user.phone}</span>
              </Flex>
              
              <Flex gap="0.5rem">
                <MapPin size={16} style={{ color: 'var(--text-muted)' }} />
                <span>{user.address}</span>
              </Flex>
            </div>
            
            {/* Stats */}
            <Flex style={{ 
              gap: '1.5rem',
              padding: '1rem',
              background: 'linear-gradient(to right, var(--primary-color)11, var(--primary-color)22)',
              borderRadius: '8px',
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: 'bold',
                  color: 'var(--primary-color)',
                }}>
                  {user.sessions}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sessions</div>
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: 'bold',
                  color: 'var(--primary-color)',
                }}>
                  {user.achievements}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Achievements</div>
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: 'bold',
                  color: 'var(--primary-color)',
                }}>
                  {user.connections}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Connections</div>
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: 'bold',
                  color: 'var(--primary-color)',
                }}>
                  {user.creations}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Creations</div>
              </div>
            </Flex>
          </Flex>
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <Grid columns={2}>
        {/* Fitness Information */}
        <Card>
          <CardHeader>
            <CardTitle>
              <Flex align="center" gap="0.5rem">
                <Dumbbell size={20} />
                Fitness & Wellness Information
              </Flex>
            </CardTitle>
            <Button variant="text">
              <Edit size={16} />
            </Button>
          </CardHeader>
          
          <CardContent>
            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ 
                margin: '0 0 0.5rem', 
                fontSize: '1rem',
                color: 'var(--text-muted)', 
              }}>
                Workout Frequency
              </h3>
              <p style={{ margin: '0', fontSize: '0.95rem' }}>
                {user.fitnessPreferences.workoutFrequency}
              </p>
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ 
                margin: '0 0 0.5rem', 
                fontSize: '1rem',
                color: 'var(--text-muted)', 
              }}>
                Preferred Workout Types
              </h3>
              <Flex gap="0.5rem" style={{ flexWrap: 'wrap' }}>
                {user.fitnessPreferences.preferredWorkouts.map((workout, index) => (
                  <Badge key={index}>{workout}</Badge>
                ))}
              </Flex>
            </div>
            
            <div>
              <h3 style={{ 
                margin: '0 0 0.5rem', 
                fontSize: '1rem',
                color: 'var(--text-muted)', 
              }}>
                Fitness Goals
              </h3>
              <ul style={{ 
                margin: '0',
                paddingLeft: '1.5rem',
                fontSize: '0.95rem',
              }}>
                {user.fitnessPreferences.fitnessGoals.map((goal, index) => (
                  <li key={index}>{goal}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
        
        {/* Creative Information */}
        <Card>
          <CardHeader>
            <CardTitle>
              <Flex align="center" gap="0.5rem">
                <Palette size={20} />
                Creative Expression Information
              </Flex>
            </CardTitle>
            <Button variant="text">
              <Edit size={16} />
            </Button>
          </CardHeader>
          
          <CardContent>
            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ 
                margin: '0 0 0.5rem', 
                fontSize: '1rem',
                color: 'var(--text-muted)', 
              }}>
                Art Forms
              </h3>
              <Flex gap="0.5rem" style={{ flexWrap: 'wrap' }}>
                {user.creativePreferences.artForms.map((artForm, index) => (
                  <Badge key={index} color="var(--secondary-color)">{artForm}</Badge>
                ))}
              </Flex>
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ 
                margin: '0 0 0.5rem', 
                fontSize: '1rem',
                color: 'var(--text-muted)', 
              }}>
                Experience Level
              </h3>
              <p style={{ margin: '0', fontSize: '0.95rem' }}>
                {user.creativePreferences.experience}
              </p>
            </div>
            
            <div>
              <h3 style={{ 
                margin: '0 0 0.5rem', 
                fontSize: '1rem',
                color: 'var(--text-muted)', 
              }}>
                Creative Goals
              </h3>
              <ul style={{ 
                margin: '0',
                paddingLeft: '1.5rem',
                fontSize: '0.95rem',
              }}>
                {user.creativePreferences.creativeGoals.map((goal, index) => (
                  <li key={index}>{goal}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </Grid>

      {/* Interests & Social Media */}
      <Grid columns={2}>
        {/* Interests */}
        <Card>
          <CardHeader>
            <CardTitle>
              <Flex align="center" gap="0.5rem">
                <Activity size={20} />
                Interests
              </Flex>
            </CardTitle>
            <Button variant="text">
              <Edit size={16} />
            </Button>
          </CardHeader>
          
          <CardContent>
            <Flex gap="0.5rem" style={{ flexWrap: 'wrap' }}>
              {user.interests.map((interest, index) => (
                <Badge 
                  key={index} 
                  style={{
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.9rem',
                  }}
                >
                  {interest}
                </Badge>
              ))}
              
              <Button 
                variant="outline" 
                style={{
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.9rem',
                }}
              >
                + Add Interest
              </Button>
            </Flex>
          </CardContent>
        </Card>
        
        {/* Social Media */}
        <Card>
          <CardHeader>
            <CardTitle>
              <Flex align="center" gap="0.5rem">
                <Award size={20} />
                Social Media
              </Flex>
            </CardTitle>
            <Button variant="text">
              <Edit size={16} />
            </Button>
          </CardHeader>
          
          <CardContent>
            <Flex 
              direction="column" 
              gap="0.75rem"
              style={{ padding: '0.5rem' }}
            >
              <Flex align="center" gap="0.75rem">
                <div style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C14.717 2 15.056 2.01 16.122 2.06C17.187 2.11 17.912 2.277 18.55 2.525C19.21 2.779 19.766 3.123 20.322 3.678C20.8305 4.1779 21.224 4.78259 21.475 5.45C21.722 6.087 21.89 6.813 21.94 7.878C21.987 8.944 22 9.283 22 12C22 14.717 21.99 15.056 21.94 16.122C21.89 17.187 21.722 17.912 21.475 18.55C21.2247 19.2178 20.8311 19.8226 20.322 20.322C19.822 20.8303 19.2173 21.2238 18.55 21.475C17.913 21.722 17.187 21.89 16.122 21.94C15.056 21.987 14.717 22 12 22C9.283 22 8.944 21.99 7.878 21.94C6.813 21.89 6.088 21.722 5.45 21.475C4.78233 21.2245 4.17753 20.8309 3.678 20.322C3.16941 19.8222 2.77593 19.2175 2.525 18.55C2.277 17.913 2.11 17.187 2.06 16.122C2.013 15.056 2 14.717 2 12C2 9.283 2.01 8.944 2.06 7.878C2.11 6.812 2.277 6.088 2.525 5.45C2.77524 4.78218 3.1688 4.17732 3.678 3.678C4.17767 3.16923 4.78243 2.77573 5.45 2.525C6.088 2.277 6.812 2.11 7.878 2.06C8.944 2.013 9.283 2 12 2Z" stroke="#C13584" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M17.5 6.5L17.51 6.5" stroke="#C13584" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16Z" stroke="#C13584" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span style={{ flex: 1 }}>Instagram</span>
                <span style={{ color: 'var(--text-muted)' }}>@{user.socialLinks.instagram}</span>
              </Flex>
              
              <Flex align="center" gap="0.75rem">
                <div style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 2H15C13.6739 2 12.4021 2.52678 11.4645 3.46447C10.5268 4.40215 10 5.67392 10 7V10H7V14H10V22H14V14H17L18 10H14V7C14 6.73478 14.1054 6.48043 14.2929 6.29289C14.4804 6.10536 14.7348 6 15 6H18V2Z" stroke="#1877F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span style={{ flex: 1 }}>Facebook</span>
                <span style={{ color: 'var(--text-muted)' }}>{user.socialLinks.facebook}</span>
              </Flex>
              
              <Flex align="center" gap="0.75rem">
                <div style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.54 6.42C22.4212 5.94541 22.1793 5.51057 21.8387 5.15941C21.498 4.80824 21.0708 4.55318 20.6 4.42C18.88 4 12 4 12 4C12 4 5.12 4 3.4 4.46C2.92922 4.59318 2.50197 4.84824 2.16134 5.19941C1.82071 5.55057 1.57878 5.98541 1.46 6.46C1.14521 8.20556 0.991 9.97631 1 11.75C0.988 13.537 1.14521 15.3214 1.46 17.08C1.59032 17.5398 1.83988 17.9581 2.17674 18.2945C2.51361 18.6308 2.9357 18.8738 3.4 19C5.12 19.46 12 19.46 12 19.46C12 19.46 18.88 19.46 20.6 19C21.0708 18.8668 21.498 18.6118 21.8387 18.2606C22.1793 17.9094 22.4212 17.4746 22.54 17C22.8524 15.2676 23.0063 13.5103 23 11.75C23.012 9.96295 22.8524 8.1786 22.54 6.42Z" stroke="#FF0000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9.75 15.02L15.5 11.75L9.75 8.48001V15.02Z" stroke="#FF0000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span style={{ flex: 1 }}>YouTube</span>
                <span style={{ color: 'var(--text-muted)' }}>{user.socialLinks.youtube}</span>
              </Flex>
              
              <Button variant="outline" style={{ marginTop: '0.5rem' }}>
                + Add Social Media
              </Button>
            </Flex>
          </CardContent>
        </Card>
      </Grid>
    </ClientMainContent>
  );
};

export default ProfileSection;