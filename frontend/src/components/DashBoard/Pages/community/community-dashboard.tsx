import React from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { Users, Calendar, MessageCircle, Dumbbell, Trophy, Activity } from 'lucide-react';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      when: "beforeChildren",
      staggerChildren: 0.1,
      duration: 0.3
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 10
    }
  }
};

// Styled components
const DashboardContainer = styled(motion.div)`
  width: 100%;
`;

const GridContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;

  @media (min-width: 900px) {
    grid-template-columns: 2fr 1fr;
  }
`;

const GridFull = styled.div`
  @media (min-width: 900px) {
    grid-column: 1 / -1;
  }
`;

const GroupsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;

  @media (min-width: 600px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const ChallengesGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;

  @media (min-width: 900px) {
    grid-template-columns: 1fr 1fr 1fr;
  }
`;

const StyledCard = styled.div`
  border-radius: 12px;
  overflow: hidden;
  height: 100%;
  transition: all 0.3s ease;
  background: rgba(30, 30, 60, 0.6);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  padding: 24px;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.25);
  }
`;

const GlowBtn = styled.button`
  background: linear-gradient(90deg, #00ffff, #7851a9);
  color: white;
  padding: 8px 24px;
  min-height: 44px;
  border-radius: 8px;
  border: none;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: linear-gradient(90deg, #00e5e5, #6a4897);
    box-shadow: 0 0 20px #00ffff;
  }
`;

const GlowBtnSmall = styled(GlowBtn)`
  padding: 6px 16px;
  min-height: 36px;
  font-size: 0.8125rem;
`;

const SectionHeading = styled.h5`
  font-size: 1.25rem;
  font-weight: 600;
  color: #00ffff;
  margin: 0 0 24px;
`;

const PageHeading = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;

  h1 {
    font-size: 2.125rem;
    font-weight: 700;
    color: white;
    margin: 0;
  }
`;

const GroupCard = styled.div<{ $accent: string }>`
  padding: 16px;
  background: ${({ $accent }) => $accent};
  border-radius: 8px;
  border: 1px solid ${({ $accent }) => $accent.replace('0.1)', '0.2)')};
`;

const GroupHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
`;

const AvatarCircle = styled.div<{ $bg: string; $color: string }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
  flex-shrink: 0;
`;

const GroupTitle = styled.h6`
  font-size: 1.125rem;
  font-weight: 600;
  color: white;
  margin: 0;
`;

const BodyText = styled.p`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.8);
  margin: 0 0 16px;
  line-height: 1.5;
`;

const GroupFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ChipTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 0.8125rem;
  background: rgba(0, 0, 0, 0.3);
  color: rgba(255, 255, 255, 0.8);
`;

const EventCard = styled.div<{ $accent: string }>`
  padding: 16px;
  margin-bottom: 16px;
  background: ${({ $accent }) => $accent};
  border-radius: 8px;
  border: 1px solid ${({ $accent }) => $accent.replace('0.1)', '0.2)')};
  display: flex;
  gap: 16px;
  align-items: flex-start;

  &:last-of-type { margin-bottom: 0; }
`;

const DateBox = styled.div<{ $bg: string }>`
  background: ${({ $bg }) => $bg};
  padding: 12px;
  border-radius: 4px;
  text-align: center;
  min-width: 60px;
`;

const DateMonth = styled.span`
  display: block;
  font-size: 0.75rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.85);
`;

const DateDay = styled.span`
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
`;

const EventTitle = styled.span`
  font-size: 0.9375rem;
  font-weight: 500;
  color: white;
  display: block;
`;

const EventDetail = styled.span`
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.7);
  display: block;
  margin: 4px 0 8px;
`;

const ChallengeCard = styled.div<{ $accent: string }>`
  padding: 16px;
  background: ${({ $accent }) => $accent};
  border-radius: 8px;
  border: 1px solid ${({ $accent }) => $accent.replace('0.1)', '0.2)')};
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const ChallengeTitle = styled.h6`
  font-size: 1.125rem;
  font-weight: 600;
  color: white;
  margin: 0 0 8px;
`;

const ChallengeFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const CaptionText = styled.span`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
`;

const CenterRow = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 24px;
`;

const CommunityDashboard = () => {
  return (
    <DashboardContainer
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div variants={itemVariants}>
        <PageHeading>
          <Users size={36} color="#00ffff" />
          <h1>Community Hub</h1>
        </PageHeading>
      </motion.div>

      <GridContainer>
        {/* Active Groups Section */}
        <motion.div variants={itemVariants}>
          <StyledCard>
            <SectionHeading>Active Groups</SectionHeading>

            <GroupsGrid>
              {/* Group 1 */}
              <GroupCard $accent="rgba(0, 255, 255, 0.1)">
                <GroupHeader>
                  <AvatarCircle $bg="#00ffff" $color="#0a0a1a">
                    <Dumbbell size={20} />
                  </AvatarCircle>
                  <GroupTitle>HIIT Warriors</GroupTitle>
                </GroupHeader>
                <BodyText>High-intensity interval training group with daily challenges</BodyText>
                <GroupFooter>
                  <ChipTag><Users size={14} /> 126 members</ChipTag>
                  <GlowBtnSmall>Join</GlowBtnSmall>
                </GroupFooter>
              </GroupCard>

              {/* Group 2 */}
              <GroupCard $accent="rgba(120, 81, 169, 0.1)">
                <GroupHeader>
                  <AvatarCircle $bg="#7851a9" $color="#ffffff">
                    <Activity size={20} />
                  </AvatarCircle>
                  <GroupTitle>Marathon Prep</GroupTitle>
                </GroupHeader>
                <BodyText>Training together for upcoming marathon events</BodyText>
                <GroupFooter>
                  <ChipTag><Users size={14} /> 89 members</ChipTag>
                  <GlowBtnSmall>Join</GlowBtnSmall>
                </GroupFooter>
              </GroupCard>

              {/* Group 3 */}
              <GroupCard $accent="rgba(255, 183, 0, 0.1)">
                <GroupHeader>
                  <AvatarCircle $bg="#ffb700" $color="#0a0a1a">
                    <Trophy size={20} />
                  </AvatarCircle>
                  <GroupTitle>Wellness Journey</GroupTitle>
                </GroupHeader>
                <BodyText>Holistic wellness combining fitness, nutrition, and mindfulness</BodyText>
                <GroupFooter>
                  <ChipTag><Users size={14} /> 204 members</ChipTag>
                  <GlowBtnSmall>Join</GlowBtnSmall>
                </GroupFooter>
              </GroupCard>

              {/* Group 4 */}
              <GroupCard $accent="rgba(0, 191, 143, 0.1)">
                <GroupHeader>
                  <AvatarCircle $bg="#00bf8f" $color="#ffffff">
                    <MessageCircle size={20} />
                  </AvatarCircle>
                  <GroupTitle>Nutrition Support</GroupTitle>
                </GroupHeader>
                <BodyText>Share meal plans, recipes, and nutrition advice</BodyText>
                <GroupFooter>
                  <ChipTag><Users size={14} /> 153 members</ChipTag>
                  <GlowBtnSmall>Join</GlowBtnSmall>
                </GroupFooter>
              </GroupCard>
            </GroupsGrid>

            <CenterRow>
              <GlowBtn>View All Groups</GlowBtn>
            </CenterRow>
          </StyledCard>
        </motion.div>

        {/* Upcoming Events Section */}
        <motion.div variants={itemVariants}>
          <StyledCard>
            <SectionHeading>Upcoming Events</SectionHeading>

            <EventCard $accent="rgba(255, 65, 108, 0.1)">
              <DateBox $bg="rgba(255, 65, 108, 0.2)">
                <DateMonth>JUN</DateMonth>
                <DateDay>15</DateDay>
              </DateBox>
              <div>
                <EventTitle>Group HIIT Session</EventTitle>
                <EventDetail>10:00 AM - 11:30 AM &bull; Studio A</EventDetail>
                <GlowBtnSmall>Register</GlowBtnSmall>
              </div>
            </EventCard>

            <EventCard $accent="rgba(0, 191, 143, 0.1)">
              <DateBox $bg="rgba(0, 191, 143, 0.2)">
                <DateMonth>JUN</DateMonth>
                <DateDay>18</DateDay>
              </DateBox>
              <div>
                <EventTitle>Nutrition Workshop</EventTitle>
                <EventDetail>6:00 PM - 7:30 PM &bull; Online</EventDetail>
                <GlowBtnSmall>Register</GlowBtnSmall>
              </div>
            </EventCard>

            <EventCard $accent="rgba(120, 81, 169, 0.1)">
              <DateBox $bg="rgba(120, 81, 169, 0.2)">
                <DateMonth>JUN</DateMonth>
                <DateDay>22</DateDay>
              </DateBox>
              <div>
                <EventTitle>Charity Run</EventTitle>
                <EventDetail>8:00 AM - 11:00 AM &bull; City Park</EventDetail>
                <GlowBtnSmall>Register</GlowBtnSmall>
              </div>
            </EventCard>

            <CenterRow>
              <GlowBtn>View All Events</GlowBtn>
            </CenterRow>
          </StyledCard>
        </motion.div>

        {/* Community Challenges Section */}
        <GridFull>
          <motion.div variants={itemVariants}>
            <StyledCard>
              <SectionHeading>Community Challenges</SectionHeading>

              <ChallengesGrid>
                <ChallengeCard $accent="rgba(0, 255, 255, 0.1)">
                  <ChallengeTitle>30-Day Fitness</ChallengeTitle>
                  <BodyText style={{ flex: 1 }}>
                    Complete a workout every day for 30 days and track your progress
                  </BodyText>
                  <ChallengeFooter>
                    <ChipTag>621 participants</ChipTag>
                    <CaptionText>Ends in 12 days</CaptionText>
                  </ChallengeFooter>
                </ChallengeCard>

                <ChallengeCard $accent="rgba(255, 183, 0, 0.1)">
                  <ChallengeTitle>100-Mile Club</ChallengeTitle>
                  <BodyText style={{ flex: 1 }}>
                    Run, walk, or jog a total of 100 miles this month
                  </BodyText>
                  <ChallengeFooter>
                    <ChipTag>332 participants</ChipTag>
                    <CaptionText>Ends in 18 days</CaptionText>
                  </ChallengeFooter>
                </ChallengeCard>

                <ChallengeCard $accent="rgba(120, 81, 169, 0.1)">
                  <ChallengeTitle>Healthy Habits</ChallengeTitle>
                  <BodyText style={{ flex: 1 }}>
                    Build 5 new healthy habits over the course of 30 days
                  </BodyText>
                  <ChallengeFooter>
                    <ChipTag>479 participants</ChipTag>
                    <CaptionText>Ends in 6 days</CaptionText>
                  </ChallengeFooter>
                </ChallengeCard>
              </ChallengesGrid>

              <CenterRow>
                <GlowBtn>Join a Challenge</GlowBtn>
              </CenterRow>
            </StyledCard>
          </motion.div>
        </GridFull>
      </GridContainer>
    </DashboardContainer>
  );
};

export default CommunityDashboard;
