import React from 'react';
import styled, { keyframes } from 'styled-components';
import { Dumbbell, Heart, Flame, Star } from 'lucide-react';
import { FaWalking, FaHeartbeat } from 'react-icons/fa';

const shimmer = keyframes`
  0% { background-position: -100% 0; }
  100% { background-position: 200% 0; }
`;

interface PopularWorkoutsCardProps {
  isLoading?: boolean;
}

const CardContainer = styled.div`
  border-radius: 12px;
  height: 100%;
  background: rgba(29, 31, 43, 0.8);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  overflow: hidden;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 6px 25px rgba(0, 0, 0, 0.12);
  }
`;

const CardBody = styled.div`
  padding: 16px;
`;

const Title = styled.h5`
  font-size: 1.5rem;
  font-weight: 600;
  color: white;
  margin: 0 0 4px;
`;

const Subtitle = styled.p`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
  margin: 0 0 16px;
`;

const WorkoutList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 16px 0 0;
`;

const WorkoutItem = styled.li`
  display: flex;
  align-items: flex-start;
  padding: 12px 0;
`;

const WorkoutAvatar = styled.div<{ $color: string }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${props => props.$color}20;
  color: ${props => props.$color};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-right: 12px;
`;

const WorkoutInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const WorkoutName = styled.span`
  font-size: 1rem;
  font-weight: 500;
  color: white;
  display: block;
`;

const WorkoutMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
`;

const StarRating = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
`;

const WorkoutDivider = styled.hr`
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  margin: 0;
`;

const SkeletonBlock = styled.div<{ $width?: string; $height?: string; $borderRadius?: string }>`
  background: linear-gradient(90deg,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(255, 255, 255, 0.1) 50%,
    rgba(255, 255, 255, 0.05) 100%);
  background-size: 200% 100%;
  animation: ${shimmer} 2s infinite linear;
  width: ${props => props.$width || '100%'};
  height: ${props => props.$height || '20px'};
  border-radius: ${props => props.$borderRadius || '4px'};
`;

const SkeletonRow = styled.div`
  display: flex;
  padding: 12px 0;
`;

/**
 * Popular Workouts Card Component
 *
 * Displays a list of trending workout programs with effectiveness ratings and
 * quick access for trainers to assign to clients.
 */
const PopularWorkoutsCard: React.FC<PopularWorkoutsCardProps> = ({ isLoading = false }) => {
  const workoutData = [
    {
      id: 1,
      name: 'HIIT Circuit Training',
      category: 'Cardio & Strength',
      rating: 4.9,
      clients: 18,
      icon: <Flame size={22} />
    },
    {
      id: 2,
      name: 'Progressive Strength',
      category: 'Strength Training',
      rating: 4.7,
      clients: 15,
      icon: <Dumbbell size={22} />
    },
    {
      id: 3,
      name: 'Endurance Builder',
      category: 'Cardio',
      rating: 4.5,
      clients: 12,
      icon: <FaWalking size={22} />
    },
    {
      id: 4,
      name: 'Functional Mobility',
      category: 'Flexibility & Recovery',
      rating: 4.6,
      clients: 10,
      icon: <FaWalking size={22} />
    },
    {
      id: 5,
      name: 'Heart Rate Training',
      category: 'Cardio & Endurance',
      rating: 4.8,
      clients: 14,
      icon: <FaHeartbeat size={22} />
    }
  ];

  const categoryColors: Record<string, string> = {
    'Cardio & Strength': '#e91e63',
    'Strength Training': '#673ab7',
    'Cardio': '#2196f3',
    'Flexibility & Recovery': '#009688',
    'Cardio & Endurance': '#f44336'
  };

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    return (
      <StarRating>
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            size={12}
            fill={i < fullStars ? '#ffc107' : 'none'}
            color={i < fullStars ? '#ffc107' : 'rgba(255,255,255,0.3)'}
          />
        ))}
      </StarRating>
    );
  };

  return (
    <CardContainer>
      <CardBody>
        {isLoading ? (
          <div>
            <SkeletonBlock $width="80%" $height="40px" />
            <SkeletonBlock $width="60%" $height="25px" style={{ marginTop: 8 }} />
            <div style={{ marginTop: 24 }}>
              {[1, 2, 3, 4, 5].map(item => (
                <React.Fragment key={item}>
                  <SkeletonRow>
                    <SkeletonBlock $width="40px" $height="40px" $borderRadius="50%" />
                    <div style={{ marginLeft: 12, flex: 1 }}>
                      <SkeletonBlock $width="80%" $height="24px" />
                      <SkeletonBlock $width="60%" $height="20px" style={{ marginTop: 4 }} />
                    </div>
                  </SkeletonRow>
                  {item < 5 && <WorkoutDivider />}
                </React.Fragment>
              ))}
            </div>
          </div>
        ) : (
          <>
            <Title>Popular Workouts</Title>
            <Subtitle>Most assigned training programs</Subtitle>

            <WorkoutList>
              {workoutData.map((workout, index) => (
                <React.Fragment key={workout.id}>
                  <WorkoutItem>
                    <WorkoutAvatar $color={categoryColors[workout.category] || '#2196f3'}>
                      {workout.icon}
                    </WorkoutAvatar>
                    <WorkoutInfo>
                      <WorkoutName>{workout.name}</WorkoutName>
                      <WorkoutMeta>
                        {renderStars(workout.rating)}
                        <span>({workout.rating}) • {workout.clients} clients</span>
                      </WorkoutMeta>
                    </WorkoutInfo>
                  </WorkoutItem>
                  {index < workoutData.length - 1 && <WorkoutDivider />}
                </React.Fragment>
              ))}
            </WorkoutList>
          </>
        )}
      </CardBody>
    </CardContainer>
  );
};

export default PopularWorkoutsCard;
