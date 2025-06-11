import React from 'react';
import { 
  Dumbbell, 
  Play, 
  Calendar, 
  Clock, 
  Flame, 
  Award,
  ChevronRight,
  Dance
} from 'lucide-react';
import ClientMainContent, { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  CardFooter, 
  Grid, 
  Flex,
  ProgressBar,
  Badge,
  Button
} from '../ClientMainContent';

// Mock data for workouts
const upcomingWorkouts = [
  {
    id: 1,
    title: 'Upper Body Strength',
    type: 'Fitness',
    scheduled: '2025-05-10T10:00:00',
    duration: 60,
    trainer: 'Alex Johnson',
    difficulty: 'Intermediate',
  },
  {
    id: 2,
    title: 'Contemporary Dance',
    type: 'Dance',
    scheduled: '2025-05-12T15:30:00',
    duration: 45,
    trainer: 'Maria Garcia',
    difficulty: 'Beginner',
  },
  {
    id: 3,
    title: 'Core & Cardio',
    type: 'Fitness',
    scheduled: '2025-05-14T11:00:00',
    duration: 50,
    trainer: 'Alex Johnson',
    difficulty: 'Advanced',
  },
];

const recentWorkouts = [
  {
    id: 101,
    title: 'Lower Body Focus',
    type: 'Fitness',
    completed: '2025-05-05T09:00:00',
    duration: 55,
    calories: 320,
    intensity: 'High',
  },
  {
    id: 102,
    title: 'Hip Hop Basics',
    type: 'Dance',
    completed: '2025-05-03T14:00:00',
    duration: 45,
    calories: 280,
    intensity: 'Medium',
  },
];

const recommendedWorkouts = [
  {
    id: 201,
    title: 'Full Body HIIT',
    type: 'Fitness',
    duration: 30,
    difficulty: 'Intermediate',
    matchScore: 95,
  },
  {
    id: 202,
    title: 'Ballet Fundamentals',
    type: 'Dance',
    duration: 45,
    difficulty: 'Beginner',
    matchScore: 90,
  },
  {
    id: 203,
    title: 'Mobility & Flexibility',
    type: 'Fitness',
    duration: 40,
    difficulty: 'All Levels',
    matchScore: 88,
  },
];

/**
 * MyWorkoutsSection Component
 * 
 * Displays the client's workout and dance routine information,
 * including upcoming sessions, workout history, and recommendations.
 */
const MyWorkoutsSection: React.FC = () => {
  // Function to format date
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

  // Actions for the header
  const headerActions = (
    <>
      <Button variant="outline">View Calendar</Button>
      <Button variant="primary">New Workout</Button>
    </>
  );

  return (
    <ClientMainContent
      title="My Workouts"
      actions={headerActions}
    >
      {/* Upcoming Workouts Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Workouts & Dance Sessions</CardTitle>
          <Button variant="text">View All</Button>
        </CardHeader>

        <CardContent>
          {upcomingWorkouts.map((workout) => (
            <Flex 
              key={workout.id}
              style={{
                padding: '0.75rem',
                borderBottom: '1px solid var(--border-color)',
                marginBottom: '0.5rem',
              }}
            >
              {/* Icon based on workout type */}
              <div style={{ padding: '0.75rem', borderRadius: '50%', backgroundColor: 'rgba(0, 255, 255, 0.1)' }}>
                {workout.type === 'Fitness' ? (
                  <Dumbbell size={24} color="var(--primary-color)" />
                ) : (
                  <Dance size={24} color="var(--primary-color)" />
                )}
              </div>
              
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>{workout.title}</h3>
                <Flex gap="0.5rem">
                  <Badge>{workout.type}</Badge>
                  <Badge color="var(--grey)">{workout.difficulty}</Badge>
                </Flex>
                <Flex gap="1rem" style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <Flex gap="0.25rem">
                    <Calendar size={16} />
                    <span>{formatDate(workout.scheduled)}</span>
                  </Flex>
                  <Flex gap="0.25rem">
                    <Clock size={16} />
                    <span>{workout.duration} min</span>
                  </Flex>
                </Flex>
              </div>
              
              <Button variant="text" aria-label={`Start ${workout.title}`}>
                <Play size={20} />
              </Button>
            </Flex>
          ))}
        </CardContent>
      </Card>

      {/* Two Column Layout for Recent and Recommended */}
      <Grid columns={2}>
        {/* Recent Workouts */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          
          <CardContent>
            {recentWorkouts.map((workout) => (
              <Flex 
                key={workout.id}
                style={{
                  padding: '0.75rem',
                  borderBottom: '1px solid var(--border-color)',
                  marginBottom: '0.5rem',
                }}
              >
                <div style={{ padding: '0.75rem', borderRadius: '50%', backgroundColor: 'rgba(0, 255, 255, 0.1)' }}>
                  {workout.type === 'Fitness' ? (
                    <Dumbbell size={20} color="var(--primary-color)" />
                  ) : (
                    <Dance size={20} color="var(--primary-color)" />
                  )}
                </div>
                
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>{workout.title}</h3>
                  <Flex gap="0.5rem">
                    <Badge>{workout.type}</Badge>
                    <Badge color="var(--accent)">{workout.intensity}</Badge>
                  </Flex>
                  <Flex gap="1rem" style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <Flex gap="0.25rem">
                      <Clock size={16} />
                      <span>{workout.duration} min</span>
                    </Flex>
                    <Flex gap="0.25rem">
                      <Flame size={16} />
                      <span>{workout.calories} cal</span>
                    </Flex>
                  </Flex>
                </div>
                
                <Button variant="text" aria-label={`View details for ${workout.title}`}>
                  <ChevronRight size={20} />
                </Button>
              </Flex>
            ))}
          </CardContent>
          
          <CardFooter>
            <Button variant="outline">View All History</Button>
          </CardFooter>
        </Card>

        {/* Recommended Workouts */}
        <Card>
          <CardHeader>
            <CardTitle>Recommended For You</CardTitle>
          </CardHeader>
          
          <CardContent>
            {recommendedWorkouts.map((workout) => (
              <Flex 
                key={workout.id}
                style={{
                  padding: '0.75rem',
                  borderBottom: '1px solid var(--border-color)',
                  marginBottom: '0.5rem',
                }}
              >
                <div style={{ padding: '0.75rem', borderRadius: '50%', backgroundColor: 'rgba(0, 255, 255, 0.1)' }}>
                  {workout.type === 'Fitness' ? (
                    <Dumbbell size={20} color="var(--primary-color)" />
                  ) : (
                    <Dance size={20} color="var(--primary-color)" />
                  )}
                </div>
                
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>{workout.title}</h3>
                  <Flex gap="0.5rem">
                    <Badge>{workout.type}</Badge>
                    <Badge color="var(--grey)">{workout.difficulty}</Badge>
                  </Flex>
                  <Flex gap="1rem" style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <Flex gap="0.25rem">
                      <Clock size={16} />
                      <span>{workout.duration} min</span>
                    </Flex>
                    <Flex gap="0.25rem">
                      <Award size={16} />
                      <span>{workout.matchScore}% match</span>
                    </Flex>
                  </Flex>
                </div>
                
                <Button variant="text" aria-label={`Add ${workout.title} to your schedule`}>
                  <Play size={20} />
                </Button>
              </Flex>
            ))}
          </CardContent>
          
          <CardFooter>
            <Button variant="outline">View More Recommendations</Button>
          </CardFooter>
        </Card>
      </Grid>
    </ClientMainContent>
  );
};

export default MyWorkoutsSection;