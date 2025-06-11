import React, { useState } from "react";
import { 
  LineChart, 
  BarChart, 
  Calendar, 
  Clock, 
  ArrowUp, 
  ArrowDown,
  Calendar as CalendarIcon,
  Activity,
  Heart,
  Weight,
  Dumbbell,
  Ruler
} from "lucide-react";
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
} from "./ClientMainContent";

/**
 * ProgressSection Component
 * 
 * Displays the client's fitness and wellness progress data, including:
 * - Workout and training progress
 * - Body measurements and composition
 * - NASM protocol progress
 * - Performance metrics
 */
const ProgressSection: React.FC<any> = ({ data = {} }) => {
  // State for active time period
  const [timePeriod, setTimePeriod] = useState<'week' | 'month' | 'year'>('month');
  
  // This would come from the API in a real implementation
  const mockData = {
    lastUpdated: '2025-05-05T15:30:00',
    bodyStats: {
      weight: {
        current: 70.5,
        previous: 71.2,
        unit: 'kg',
        trend: 'down'
      },
      bodyFat: {
        current: 16.8,
        previous: 17.5,
        unit: '%',
        trend: 'down'
      },
      muscle: {
        current: 34.2,
        previous: 33.8,
        unit: '%',
        trend: 'up'
      },
      bmi: {
        current: 23.4,
        previous: 23.6,
        unit: '',
        trend: 'down'
      }
    },
    nasmProtocol: {
      categories: [
        { name: 'Core & Stability', progress: 65, level: 3 },
        { name: 'Balance', progress: 72, level: 4 },
        { name: 'Flexibility', progress: 80, level: 4 },
        { name: 'Calisthenics', progress: 60, level: 3 },
        { name: 'Isolation', progress: 78, level: 4 },
        { name: 'Stabilizers', progress: 85, level: 5 },
      ],
      overall: 73
    },
    keyExercises: [
      { name: 'Bench Press', current: 70, previous: 65, unit: 'kg', trend: 'up' },
      { name: 'Squat', current: 100, previous: 95, unit: 'kg', trend: 'up' },
      { name: 'Deadlift', current: 120, previous: 110, unit: 'kg', trend: 'up' },
      { name: 'Pull-up', current: 12, previous: 10, unit: 'reps', trend: 'up' },
      { name: 'Plank', current: 120, previous: 105, unit: 'sec', trend: 'up' },
    ],
    bodyParts: [
      { name: 'Chest', progress: 75 },
      { name: 'Back', progress: 80 },
      { name: 'Arms', progress: 70 },
      { name: 'Shoulders', progress: 65 },
      { name: 'Core', progress: 85 },
      { name: 'Legs', progress: 78 },
    ],
    monthlyProgress: [
      { month: 'Jan', weight: 72.5, strength: 65, cardio: 60 },
      { month: 'Feb', weight: 72.0, strength: 67, cardio: 62 },
      { month: 'Mar', weight: 71.5, strength: 70, cardio: 65 },
      { month: 'Apr', weight: 71.0, strength: 72, cardio: 70 },
      { month: 'May', weight: 70.5, strength: 75, cardio: 72 },
    ]
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  
  // Format change value with up/down indicator
  const formatChange = (current: number, previous: number, unit: string) => {
    const change = current - previous;
    const formattedChange = Math.abs(change).toFixed(1);
    
    if (change > 0) {
      return (
        <Flex align="center" style={{ color: 'var(--success)' }}>
          <ArrowUp size={16} style={{ marginRight: '0.25rem' }} />
          <span>+{formattedChange}{unit}</span>
        </Flex>
      );
    } else if (change < 0) {
      return (
        <Flex align="center" style={{ color: 'var(--error)' }}>
          <ArrowDown size={16} style={{ marginRight: '0.25rem' }} />
          <span>-{formattedChange}{unit}</span>
        </Flex>
      );
    } else {
      return (
        <span style={{ color: 'var(--text-muted)' }}>No change</span>
      );
    }
  };

  return (
    <ClientMainContent
      title="Progress Tracking"
      actions={
        <Flex gap="0.5rem">
          <Button 
            variant={timePeriod === 'week' ? 'primary' : 'outline'}
            onClick={() => setTimePeriod('week')}
          >
            Week
          </Button>
          <Button 
            variant={timePeriod === 'month' ? 'primary' : 'outline'}
            onClick={() => setTimePeriod('month')}
          >
            Month
          </Button>
          <Button 
            variant={timePeriod === 'year' ? 'primary' : 'outline'}
            onClick={() => setTimePeriod('year')}
          >
            Year
          </Button>
        </Flex>
      }
    >
      {/* Last Update Info */}
      <p style={{ 
        textAlign: 'right', 
        margin: '0 0 1rem', 
        fontSize: '0.9rem', 
        color: 'var(--text-muted)' 
      }}>
        <CalendarIcon size={16} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
        Last updated: {formatDate(mockData.lastUpdated)}
      </p>
      
      {/* Body Stats */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Flex align="center" gap="0.5rem">
              <Activity size={20} />
              Body Measurements & Composition
            </Flex>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <Grid columns={4}>
            <Flex direction="column" style={{ padding: '1rem', textAlign: 'center' }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '50%',
                backgroundColor: 'var(--primary-color)11',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 0.5rem',
              }}>
                <Weight size={20} color="var(--primary-color)" />
              </div>
              
              <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>Weight</h3>
              <div style={{ 
                fontSize: '1.5rem', 
                fontWeight: 'bold', 
                marginBottom: '0.25rem' 
              }}>
                {mockData.bodyStats.weight.current}{mockData.bodyStats.weight.unit}
              </div>
              
              {formatChange(
                mockData.bodyStats.weight.current,
                mockData.bodyStats.weight.previous,
                mockData.bodyStats.weight.unit
              )}
            </Flex>
            
            <Flex direction="column" style={{ padding: '1rem', textAlign: 'center' }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '50%',
                backgroundColor: 'var(--secondary-color)11',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 0.5rem',
              }}>
                <Heart size={20} color="var(--secondary-color)" />
              </div>
              
              <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>Body Fat</h3>
              <div style={{ 
                fontSize: '1.5rem', 
                fontWeight: 'bold', 
                marginBottom: '0.25rem' 
              }}>
                {mockData.bodyStats.bodyFat.current}{mockData.bodyStats.bodyFat.unit}
              </div>
              
              {formatChange(
                mockData.bodyStats.bodyFat.current,
                mockData.bodyStats.bodyFat.previous,
                mockData.bodyStats.bodyFat.unit
              )}
            </Flex>
            
            <Flex direction="column" style={{ padding: '1rem', textAlign: 'center' }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '50%',
                backgroundColor: 'var(--accent)11',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 0.5rem',
              }}>
                <Dumbbell size={20} color="var(--accent)" />
              </div>
              
              <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>Muscle Mass</h3>
              <div style={{ 
                fontSize: '1.5rem', 
                fontWeight: 'bold', 
                marginBottom: '0.25rem' 
              }}>
                {mockData.bodyStats.muscle.current}{mockData.bodyStats.muscle.unit}
              </div>
              
              {formatChange(
                mockData.bodyStats.muscle.current,
                mockData.bodyStats.muscle.previous,
                mockData.bodyStats.muscle.unit
              )}
            </Flex>
            
            <Flex direction="column" style={{ padding: '1rem', textAlign: 'center' }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '50%',
                backgroundColor: 'var(--success)11',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 0.5rem',
              }}>
                <Ruler size={20} color="var(--success)" />
              </div>
              
              <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>BMI</h3>
              <div style={{ 
                fontSize: '1.5rem', 
                fontWeight: 'bold', 
                marginBottom: '0.25rem' 
              }}>
                {mockData.bodyStats.bmi.current}
              </div>
              
              {formatChange(
                mockData.bodyStats.bmi.current,
                mockData.bodyStats.bmi.previous,
                ''
              )}
            </Flex>
          </Grid>
        </CardContent>
      </Card>

      {/* NASM Protocol & Body Part Progress */}
      <Grid columns={2}>
        {/* NASM Protocol */}
        <Card>
          <CardHeader>
            <CardTitle>NASM Protocol Progress</CardTitle>
            <Badge>{mockData.nasmProtocol.overall}% Complete</Badge>
          </CardHeader>
          
          <CardContent>
            <div style={{ 
              padding: '1.5rem 1rem',
              backgroundColor: 'var(--primary-color)11',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
            }}>
              <div style={{ 
                width: '80px', 
                height: '80px', 
                borderRadius: '50%', 
                backgroundColor: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: 'var(--primary-color)',
                boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
                marginBottom: '0.5rem',
              }}>
                {mockData.nasmProtocol.overall}%
              </div>
              <div style={{ fontWeight: 'bold' }}>Overall Progress</div>
            </div>
            
            {mockData.nasmProtocol.categories.map((category, index) => (
              <div key={index} style={{ marginBottom: '1rem' }}>
                <Flex justify="space-between" style={{ marginBottom: '0.25rem' }}>
                  <Flex gap="0.5rem" align="center">
                    <span>{category.name}</span>
                    <Badge>Level {category.level}</Badge>
                  </Flex>
                  <span>{category.progress}%</span>
                </Flex>
                <ProgressBar value={category.progress} max={100} />
              </div>
            ))}
          </CardContent>
          
          <CardFooter>
            <Button variant="outline">View Detailed Analysis</Button>
          </CardFooter>
        </Card>
        
        {/* Body Part Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Body Part Progress</CardTitle>
          </CardHeader>
          
          <CardContent>
            {mockData.bodyParts.map((part, index) => (
              <div key={index} style={{ marginBottom: '1rem' }}>
                <Flex justify="space-between" style={{ marginBottom: '0.25rem' }}>
                  <span>{part.name}</span>
                  <span>{part.progress}%</span>
                </Flex>
                <ProgressBar 
                  value={part.progress} 
                  max={100} 
                  color={
                    index % 3 === 0 ? 'var(--primary-color)' : 
                    index % 3 === 1 ? 'var(--secondary-color)' : 
                    'var(--accent)'
                  } 
                />
              </div>
            ))}
            
            <div style={{ 
              marginTop: '1.5rem',
              backgroundColor: 'var(--secondary-color)11',
              borderRadius: '8px',
              padding: '1rem',
            }}>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>Training Focus Recommendation</h3>
              <p style={{ margin: '0', fontSize: '0.9rem' }}>
                Based on your progress, we recommend focusing on <strong>Shoulders</strong> and <strong>Arms</strong> in your upcoming workouts to create a more balanced physique.
              </p>
            </div>
          </CardContent>
        </Card>
      </Grid>

      {/* Key Exercise Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Key Exercise Progress</CardTitle>
        </CardHeader>
        
        <CardContent>
          <Grid columns={3}>
            {mockData.keyExercises.map((exercise, index) => (
              <div key={index} style={{ 
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                backgroundColor: exercise.trend === 'up' ? 'var(--success)05' : 'transparent',
              }}>
                <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem' }}>{exercise.name}</h3>
                
                <Flex justify="space-between" align="center">
                  <div>
                    <div style={{ 
                      fontSize: '1.5rem', 
                      fontWeight: 'bold', 
                      marginBottom: '0.25rem',
                    }}>
                      {exercise.current} {exercise.unit}
                    </div>
                    
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      Previous: {exercise.previous} {exercise.unit}
                    </div>
                  </div>
                  
                  {formatChange(
                    exercise.current,
                    exercise.previous,
                    exercise.unit
                  )}
                </Flex>
              </div>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Monthly Progress Chart (Placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle>Progress Over Time</CardTitle>
          <Badge>{timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1)}ly View</Badge>
        </CardHeader>
        
        <CardContent>
          <div style={{ 
            height: '300px', 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            backgroundColor: 'var(--border-color)',
            borderRadius: '8px',
          }}>
            Chart placeholder - Integrated with Chart.js or Recharts
          </div>
          
          <p style={{ 
            margin: '1rem 0 0', 
            fontSize: '0.9rem', 
            color: 'var(--text-muted)',
            fontStyle: 'italic',
            textAlign: 'center',
          }}>
            This chart shows your progress in key metrics over time. Your consistency is paying off!
          </p>
        </CardContent>
      </Card>
    </ClientMainContent>
  );
};

export default ProgressSection;