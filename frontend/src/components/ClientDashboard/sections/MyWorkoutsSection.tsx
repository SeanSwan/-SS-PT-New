import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';

// Import context
import { useAuth } from '../../../context/AuthContext';

// Icons (lucide-react equivalents)
import {
  Dumbbell,
  Play,
  Calendar,
  Clock,
  ChevronDown,
  Check,
  Bookmark,
  History
} from 'lucide-react';

// ─── Styled Components ───────────────────────────────────────────────

const Section = styled.div`
  width: 100%;
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 24px;
  gap: 12px;
`;

const HeaderIcon = styled.span`
  display: inline-flex;
  align-items: center;
  color: #00ffff;
`;

const PageTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: #ffffff;
  margin: 0 0 16px 0;
`;

const BodyText = styled.p<{ $secondary?: boolean; $small?: boolean; $gutterBottom?: boolean }>`
  font-size: ${({ $small }) => ($small ? '0.75rem' : '0.875rem')};
  color: ${({ $secondary }) => ($secondary ? 'rgba(255, 255, 255, 0.55)' : 'rgba(255, 255, 255, 0.85)')};
  margin: 0;
  margin-bottom: ${({ $gutterBottom }) => ($gutterBottom ? '8px' : '0')};
  line-height: 1.5;
`;

const SubtitleText = styled.p`
  font-size: 1rem;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
`;

const LargeText = styled.p<{ $gutterBottom?: boolean }>`
  font-size: 1.5rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
  margin-bottom: ${({ $gutterBottom }) => ($gutterBottom ? '8px' : '0')};
`;

/* ── Tab bar ─────────────────────────────────────────────────── */

const TabBarWrapper = styled.div`
  background: rgba(29, 31, 43, 0.8);
  border-radius: 12px;
  margin-bottom: 24px;
  display: flex;
  overflow: hidden;
`;

const TabButton = styled.button<{ $active: boolean }>`
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  padding: 12px 16px;
  border: none;
  background: ${({ $active }) => ($active ? 'rgba(0, 255, 255, 0.1)' : 'transparent')};
  color: ${({ $active }) => ($active ? '#00ffff' : 'rgba(255, 255, 255, 0.6)')};
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.25s ease, color 0.25s ease;
  border-bottom: 2px solid ${({ $active }) => ($active ? '#00ffff' : 'transparent')};

  &:hover {
    background: rgba(0, 255, 255, 0.06);
    color: #00ffff;
  }
`;

/* ── Grid ─────────────────────────────────────────────────────── */

const GridContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

/* ── Card ─────────────────────────────────────────────────────── */

const StyledCard = styled.div`
  background: rgba(29, 31, 43, 0.8);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  }
`;

const CardBody = styled.div`
  padding: 20px;
`;

const CardFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
`;

/* ── Paper / Surface ──────────────────────────────────────────── */

const Surface = styled.div<{ $highlight?: boolean; $centered?: boolean }>`
  background: ${({ $highlight }) =>
    $highlight
      ? 'linear-gradient(135deg, rgba(0, 255, 255, 0.15) 0%, rgba(120, 81, 169, 0.15) 100%)'
      : 'rgba(29, 31, 43, 0.8)'};
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 24px;
  margin-bottom: 24px;
  text-align: ${({ $centered }) => ($centered ? 'center' : 'left')};
`;

/* ── Buttons ──────────────────────────────────────────────────── */

const PrimaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #00ffff 0%, #7851a9 100%);
  color: #0a0a1a;
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.2s ease, transform 0.15s ease;

  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const OutlinedButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 20px;
  border: 1px solid #00ffff;
  border-radius: 8px;
  background: transparent;
  color: #00ffff;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(0, 255, 255, 0.08);
  }
`;

const TextButton = styled.button<{ $color?: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 44px;
  padding: 8px 14px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: ${({ $color }) => $color || '#00ffff'};
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.06);
  }
`;

/* ── Chip ─────────────────────────────────────────────────────── */

const chipColorMap: Record<string, { bg: string; text: string; border: string }> = {
  Strength: { bg: 'rgba(0, 255, 255, 0.12)', text: '#00ffff', border: 'rgba(0, 255, 255, 0.3)' },
  Cardio: { bg: 'rgba(255, 82, 82, 0.12)', text: '#ff5252', border: 'rgba(255, 82, 82, 0.3)' },
  Dance: { bg: 'rgba(120, 81, 169, 0.15)', text: '#b388ff', border: 'rgba(120, 81, 169, 0.3)' },
  success: { bg: 'transparent', text: '#66bb6a', border: 'rgba(102, 187, 106, 0.5)' }
};

const StyledChip = styled.span<{ $variant: string; $outlined?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  background: ${({ $variant }) => chipColorMap[$variant]?.bg || 'rgba(255,255,255,0.08)'};
  color: ${({ $variant }) => chipColorMap[$variant]?.text || 'rgba(255,255,255,0.85)'};
  border: 1px solid ${({ $variant }) => chipColorMap[$variant]?.border || 'rgba(255,255,255,0.12)'};
`;

/* ── Divider ──────────────────────────────────────────────────── */

const StyledDivider = styled.hr`
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  margin: 16px 0;
`;

/* ── Progress Bar ─────────────────────────────────────────────── */

const ProgressTrack = styled.div`
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
  margin: 8px 0;
`;

const progressFillAnim = keyframes`
  from { width: 0%; }
`;

const ProgressFill = styled.div<{ $value: number }>`
  height: 100%;
  width: ${({ $value }) => $value}%;
  border-radius: 3px;
  background: linear-gradient(90deg, #00ffff, #7851a9);
  transition: width 0.6s ease;
  animation: ${progressFillAnim} 0.8s ease-out;
`;

/* ── List items ───────────────────────────────────────────────── */

const ExerciseList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const ExerciseItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
`;

const ExerciseIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  color: #00ffff;
`;

const ExerciseInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

/* ── Misc layout helpers ──────────────────────────────────────── */

const FlexRow = styled.div<{
  $justify?: string;
  $align?: string;
  $gap?: string;
  $mb?: string;
  $mt?: string;
}>`
  display: flex;
  justify-content: ${({ $justify }) => $justify || 'flex-start'};
  align-items: ${({ $align }) => $align || 'center'};
  gap: ${({ $gap }) => $gap || '0'};
  margin-bottom: ${({ $mb }) => $mb || '0'};
  margin-top: ${({ $mt }) => $mt || '0'};
`;

const MetaIcon = styled.span<{ $secondary?: boolean }>`
  display: inline-flex;
  align-items: center;
  color: ${({ $secondary }) => ($secondary ? 'rgba(255, 255, 255, 0.55)' : '#00ffff')};
`;

const ExpandIcon = styled.span<{ $expanded: boolean }>`
  display: inline-flex;
  align-items: center;
  transform: ${({ $expanded }) => ($expanded ? 'rotate(180deg)' : 'rotate(0deg)')};
  transition: transform 0.3s ease;
`;

const CenterBox = styled.div`
  display: flex;
  justify-content: center;
  padding: 24px;
`;

// ─── Data ────────────────────────────────────────────────────────────

// Placeholder workout plans
const workoutPlans = [
  {
    id: 1,
    name: "Full Body Workout",
    type: "Strength",
    duration: 45,
    lastCompleted: "2 days ago",
    progress: 80,
    exercises: [
      { name: "Squats", sets: 3, reps: 12 },
      { name: "Push-ups", sets: 3, reps: 15 },
      { name: "Deadlifts", sets: 3, reps: 10 },
      { name: "Lunges", sets: 2, reps: 12 },
      { name: "Plank", sets: 3, reps: "30 seconds" }
    ]
  },
  {
    id: 2,
    name: "HIIT Cardio",
    type: "Cardio",
    duration: 30,
    lastCompleted: "5 days ago",
    progress: 60,
    exercises: [
      { name: "Jumping Jacks", sets: 3, reps: "30 seconds" },
      { name: "Mountain Climbers", sets: 3, reps: "30 seconds" },
      { name: "Burpees", sets: 3, reps: 10 },
      { name: "High Knees", sets: 3, reps: "30 seconds" },
      { name: "Rest", sets: 3, reps: "15 seconds" }
    ]
  },
  {
    id: 3,
    name: "Dance Workout",
    type: "Dance",
    duration: 40,
    lastCompleted: "1 week ago",
    progress: 45,
    exercises: [
      { name: "Warm-up", sets: 1, reps: "5 minutes" },
      { name: "Hip-hop Routine", sets: 1, reps: "10 minutes" },
      { name: "Latin Dance", sets: 1, reps: "10 minutes" },
      { name: "Freestyle", sets: 1, reps: "10 minutes" },
      { name: "Cool Down", sets: 1, reps: "5 minutes" }
    ]
  }
];

// Past sessions
const pastSessions = [
  {
    id: 201,
    type: "Personal Training",
    dateTime: "May 8, 2025 - 11:00 AM",
    trainer: "Alex Johnson",
    completed: true
  },
  {
    id: 202,
    type: "Group Yoga",
    dateTime: "May 5, 2025 - 9:00 AM",
    trainer: "Sarah Chen",
    completed: true
  },
  {
    id: 203,
    type: "Personal Training",
    dateTime: "May 1, 2025 - 10:30 AM",
    trainer: "Alex Johnson",
    completed: true
  }
];

/**
 * MyWorkoutsSection Component
 *
 * Displays client workout plans, upcoming sessions, and workout history.
 */
const MyWorkoutsSection: React.FC = () => {
  const { user, authAxios } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [expandedWorkout, setExpandedWorkout] = useState<number | null>(null);
  const [availableSessions, setAvailableSessions] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sessionsInfo, setSessionsInfo] = useState<any>(null);

  // Upcoming sessions data (state)
  const [upcomingSessions, setUpcomingSessions] = useState([
    {
      id: 101,
      type: "Personal Training",
      dateTime: "May 22, 2025 - 10:00 AM",
      trainer: "Alex Johnson",
      focus: "Strength & Conditioning"
    },
    {
      id: 102,
      type: "Group Dance Class",
      dateTime: "May 25, 2025 - 6:00 PM",
      trainer: "Maria Rodriguez",
      focus: "Latin Dance Fundamentals"
    }
  ]);

  const handleTabChange = (newValue: number) => {
    setTabValue(newValue);
  };

  // Fetch user session data when component mounts
  useEffect(() => {
    const fetchUserSessions = async () => {
      if (!user || !user.id) return;

      setIsLoading(true);
      try {
        // Try to get user data from API
        const response = await authAxios.get('/api/users/me');

        if (response.data) {
          setAvailableSessions(response.data.availableSessions || 0);
          console.log('User session data:', response.data);

          // Also check local storage for recent purchases
          const lastOrderStr = localStorage.getItem('lastOrder');
          if (lastOrderStr) {
            try {
              const lastOrder = JSON.parse(lastOrderStr);
              setSessionsInfo({
                packageName: lastOrder.packageType || lastOrder.details?.packageName,
                totalSessions: lastOrder.sessions || lastOrder.details?.totalSessions,
                purchaseDate: lastOrder.date,
                validity: lastOrder.details?.validity
              });
            } catch (e) {
              console.error('Error parsing last order:', e);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user session data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserSessions();
  }, [user, authAxios]);

  const toggleWorkoutExpand = (workoutId: number) => {
    if (expandedWorkout === workoutId) {
      setExpandedWorkout(null);
    } else {
      setExpandedWorkout(workoutId);
    }
  };

  return (
    <Section>
      <HeaderRow>
        <HeaderIcon>
          <Dumbbell size={32} />
        </HeaderIcon>
        <PageTitle>My Workouts</PageTitle>
      </HeaderRow>

      <TabBarWrapper>
        <TabButton $active={tabValue === 0} onClick={() => handleTabChange(0)}>
          <Bookmark size={18} />
          My Plans
        </TabButton>
        <TabButton $active={tabValue === 1} onClick={() => handleTabChange(1)}>
          <Calendar size={18} />
          Upcoming
        </TabButton>
        <TabButton $active={tabValue === 2} onClick={() => handleTabChange(2)}>
          <History size={18} />
          History
        </TabButton>
      </TabBarWrapper>

      {/* My Plans Tab */}
      {tabValue === 0 && (
        <GridContainer>
          {workoutPlans.map(workout => (
            <StyledCard key={workout.id}>
              <CardBody>
                <FlexRow $justify="space-between" $align="flex-start">
                  <SectionTitle style={{ margin: 0 }}>{workout.name}</SectionTitle>
                  <StyledChip $variant={workout.type}>
                    {workout.type}
                  </StyledChip>
                </FlexRow>

                <FlexRow $align="center" $gap="8px" $mt="16px" $mb="8px">
                  <MetaIcon $secondary>
                    <Clock size={16} />
                  </MetaIcon>
                  <BodyText>{workout.duration} minutes</BodyText>
                </FlexRow>

                <FlexRow $justify="space-between" $align="center" $mt="16px">
                  <BodyText $secondary>Progress:</BodyText>
                  <BodyText $secondary>{workout.progress}%</BodyText>
                </FlexRow>
                <ProgressTrack>
                  <ProgressFill $value={workout.progress} />
                </ProgressTrack>

                <FlexRow $justify="flex-end" $mt="8px">
                  <BodyText $small $secondary>
                    Last completed: {workout.lastCompleted}
                  </BodyText>
                </FlexRow>

                {expandedWorkout === workout.id && (
                  <>
                    <StyledDivider />
                    <BodyText style={{ fontWeight: 600, marginBottom: 8 }}>
                      Exercises:
                    </BodyText>
                    <ExerciseList>
                      {workout.exercises.map((exercise, index) => (
                        <ExerciseItem key={index}>
                          <ExerciseIcon>
                            <Check size={16} />
                          </ExerciseIcon>
                          <ExerciseInfo>
                            <BodyText>{exercise.name}</BodyText>
                            <BodyText $small $secondary>
                              {exercise.sets} sets x {exercise.reps}
                            </BodyText>
                          </ExerciseInfo>
                        </ExerciseItem>
                      ))}
                    </ExerciseList>
                  </>
                )}
              </CardBody>
              <CardFooter>
                <TextButton onClick={() => toggleWorkoutExpand(workout.id)}>
                  <ExpandIcon $expanded={expandedWorkout === workout.id}>
                    <ChevronDown size={18} />
                  </ExpandIcon>
                  {expandedWorkout === workout.id ? 'Hide' : 'Details'}
                </TextButton>
                <PrimaryButton>
                  <Play size={16} />
                  Start Workout
                </PrimaryButton>
              </CardFooter>
            </StyledCard>
          ))}
        </GridContainer>
      )}

      {/* Upcoming Sessions Tab */}
      {tabValue === 1 && (
        <>
          <FlexRow $justify="space-between" $align="center" $mb="24px">
            <SectionTitle style={{ margin: 0 }}>Upcoming Sessions</SectionTitle>
            <OutlinedButton>
              <Calendar size={16} />
              Book New Session
            </OutlinedButton>
          </FlexRow>

          <Surface $highlight>
            <FlexRow $justify="space-between" $align="center">
              <div>
                <LargeText $gutterBottom>
                  Available Sessions: {availableSessions}
                </LargeText>
                {sessionsInfo && (
                  <BodyText>
                    Package: {sessionsInfo.packageName}
                    {sessionsInfo.validity ? ` (Valid until: ${sessionsInfo.validity})` : ''}
                  </BodyText>
                )}
              </div>
              <MetaIcon>
                <Calendar size={32} />
              </MetaIcon>
            </FlexRow>
          </Surface>

          {isLoading ? (
            <CenterBox>
              <BodyText>Loading your sessions...</BodyText>
            </CenterBox>
          ) : upcomingSessions.length > 0 ? (
            <GridContainer>
              {upcomingSessions.map(session => (
                <StyledCard key={session.id}>
                  <CardBody>
                    <SectionTitle>{session.type}</SectionTitle>

                    <FlexRow $align="center" $gap="8px" $mb="8px">
                      <MetaIcon $secondary>
                        <Calendar size={16} />
                      </MetaIcon>
                      <BodyText>{session.dateTime}</BodyText>
                    </FlexRow>

                    <BodyText $gutterBottom>
                      <strong>Trainer:</strong> {session.trainer}
                    </BodyText>

                    <BodyText>
                      <strong>Focus:</strong> {session.focus}
                    </BodyText>
                  </CardBody>
                  <CardFooter>
                    <TextButton $color="#ff5252">
                      Cancel
                    </TextButton>
                    <TextButton $color="#00ffff">
                      Reschedule
                    </TextButton>
                  </CardFooter>
                </StyledCard>
              ))}
            </GridContainer>
          ) : (
            <Surface $centered>
              <BodyText $gutterBottom>
                You don't have any upcoming sessions
              </BodyText>
              <PrimaryButton style={{ marginTop: 16 }}>
                <Calendar size={16} />
                Book a Session
              </PrimaryButton>
            </Surface>
          )}
        </>
      )}

      {/* History Tab */}
      {tabValue === 2 && (
        <>
          <SectionTitle>Session History</SectionTitle>

          {pastSessions.map(session => (
            <Surface key={session.id} style={{ padding: 16 }}>
              <FlexRow $justify="space-between" $align="center">
                <div>
                  <SubtitleText>{session.type}</SubtitleText>
                  <BodyText $secondary style={{ marginTop: 4 }}>
                    {session.dateTime}
                  </BodyText>
                  <BodyText style={{ marginTop: 4 }}>
                    Trainer: {session.trainer}
                  </BodyText>
                </div>
                <StyledChip $variant="success" $outlined>
                  <Check size={14} />
                  Completed
                </StyledChip>
              </FlexRow>
            </Surface>
          ))}
        </>
      )}
    </Section>
  );
};

export default MyWorkoutsSection;
