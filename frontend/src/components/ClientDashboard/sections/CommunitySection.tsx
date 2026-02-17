import React, { useState } from 'react';
import styled from 'styled-components';
import {
  Users,
  Calendar,
  MessageCircle,
  MoreVertical,
  ThumbsUp,
  MessageSquare,
  Share2,
  UserPlus,
} from 'lucide-react';

/* ─── styled-components ─────────────────────────────────────────── */

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
  color: #00ffff;
  display: inline-flex;
  align-items: center;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
`;

const Panel = styled.div`
  background: rgba(29, 31, 43, 0.8);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.06);
`;

/* ─── Tabs ───────────────────────────────────────────────────────── */

const TabBar = styled.div`
  display: flex;
  width: 100%;
  background: rgba(29, 31, 43, 0.8);
  border-radius: 12px;
  margin-bottom: 24px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.06);
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
  background: ${({ $active }) =>
    $active ? 'rgba(0, 255, 255, 0.1)' : 'transparent'};
  color: ${({ $active }) =>
    $active ? '#00ffff' : 'rgba(255, 255, 255, 0.6)'};
  font-size: 0.95rem;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  border-bottom: 2px solid
    ${({ $active }) => ($active ? '#00ffff' : 'transparent')};

  &:hover {
    background: rgba(0, 255, 255, 0.06);
    color: #00ffff;
  }
`;

/* ─── Post composer ──────────────────────────────────────────────── */

const TextArea = styled.textarea`
  width: 100%;
  min-height: 80px;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(10, 10, 26, 0.6);
  color: #ffffff;
  font-family: inherit;
  font-size: 0.95rem;
  resize: vertical;
  margin-bottom: 16px;
  box-sizing: border-box;

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }

  &:focus {
    outline: none;
    border-color: #00ffff;
    box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.15);
  }
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
`;

/* ─── Buttons ────────────────────────────────────────────────────── */

const PrimaryButton = styled.button<{ $fullWidth?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #00ffff 0%, #7851a9 100%);
  color: #0a0a1a;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.15s;
  width: ${({ $fullWidth }) => ($fullWidth ? '100%' : 'auto')};

  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
  }
`;

const OutlineButton = styled.button`
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
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: rgba(0, 255, 255, 0.08);
  }
`;

const GhostButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 44px;
  padding: 8px 14px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.06);
    color: #00ffff;
  }
`;

const SmallIconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  min-width: 44px;
  padding: 8px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }
`;

/* ─── Post card pieces ───────────────────────────────────────────── */

const PostHeader = styled.div`
  display: flex;
  align-items: flex-start;
  margin-bottom: 12px;
  gap: 12px;
`;

const AvatarCircle = styled.div`
  width: 40px;
  height: 40px;
  min-width: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #00ffff 0%, #7851a9 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #0a0a1a;
  font-weight: 700;
  font-size: 1rem;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const PostMeta = styled.div`
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const UserName = styled.span`
  font-weight: 600;
  color: #ffffff;
  font-size: 0.95rem;
`;

const TimeStamp = styled.span`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.45);
`;

const PostBody = styled.p`
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.6;
  margin: 0 0 16px;
`;

const HorizontalRule = styled.hr`
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  margin: 16px 0;
`;

const ActionRow = styled.div`
  display: flex;
  justify-content: space-between;
`;

/* ─── Grid helpers ───────────────────────────────────────────────── */

const GridRow = styled.div`
  display: grid;
  gap: 24px;

  @media (min-width: 600px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const GridRowThirds = styled.div`
  display: grid;
  gap: 24px;

  @media (min-width: 600px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 900px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

/* ─── Card ───────────────────────────────────────────────────────── */

const StyledCard = styled.div`
  background: rgba(29, 31, 43, 0.8);
  border-radius: 12px;
  padding: 24px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(12px);
  display: flex;
  flex-direction: column;
  height: 100%;
  box-sizing: border-box;
`;

/* ─── Chip ───────────────────────────────────────────────────────── */

const Chip = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 0.8rem;
  font-weight: 500;
  border: 1px solid #00ffff;
  color: #00ffff;
  background: transparent;
`;

/* ─── Event / group detail row ───────────────────────────────────── */

const DetailRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.9rem;
`;

const SpaceBetween = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
`;

const CenterRow = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 16px;
`;

/* ─── Placeholder data ───────────────────────────────────────────── */

const placeholderPosts = [
  {
    id: 1,
    user: {
      name: 'Sarah Johnson',
      avatar: '/placeholder-avatar-1.jpg',
    },
    content:
      'Just completed my first 5K run! Thanks to my trainer for all the motivation and support.',
    likes: 24,
    comments: 8,
    timeAgo: '2 hours ago',
  },
  {
    id: 2,
    user: {
      name: 'Michael Chen',
      avatar: '/placeholder-avatar-2.jpg',
    },
    content:
      'Looking for workout buddies in the downtown area. Anyone interested in meeting up on Saturdays?',
    likes: 15,
    comments: 12,
    timeAgo: '5 hours ago',
  },
  {
    id: 3,
    user: {
      name: 'Emma Williams',
      avatar: '/placeholder-avatar-3.jpg',
    },
    content:
      "Here's my progress after 3 months of consistent training. So happy with the results!",
    likes: 42,
    comments: 7,
    timeAgo: '1 day ago',
  },
];

const placeholderEvents = [
  {
    id: 1,
    title: 'Group HIIT Session',
    date: 'May 15, 2025',
    time: '10:00 AM',
    location: 'Central Park',
    attendees: 12,
  },
  {
    id: 2,
    title: 'Yoga & Meditation',
    date: 'May 18, 2025',
    time: '9:00 AM',
    location: 'Beach Front',
    attendees: 8,
  },
];

const placeholderGroups = [
  {
    id: 1,
    name: 'Morning Runners',
    members: 56,
    category: 'Fitness',
  },
  {
    id: 2,
    name: 'Dance Enthusiasts',
    members: 34,
    category: 'Dance',
  },
  {
    id: 3,
    name: 'Wellness Warriors',
    members: 89,
    category: 'Wellness',
  },
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

  const handleTabChange = (newValue: number) => {
    setTabValue(newValue);
  };

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Post submitted: ${postText}`);
    setPostText('');
  };

  return (
    <Section>
      <HeaderRow>
        <HeaderIcon>
          <Users size={32} />
        </HeaderIcon>
        <Title>Community</Title>
      </HeaderRow>

      <TabBar>
        <TabButton $active={tabValue === 0} onClick={() => handleTabChange(0)}>
          <MessageCircle size={18} />
          Feed
        </TabButton>
        <TabButton $active={tabValue === 1} onClick={() => handleTabChange(1)}>
          <Calendar size={18} />
          Events
        </TabButton>
        <TabButton $active={tabValue === 2} onClick={() => handleTabChange(2)}>
          <Users size={18} />
          Groups
        </TabButton>
      </TabBar>

      {/* Feed Tab */}
      {tabValue === 0 && (
        <>
          <Panel>
            <SectionTitle style={{ marginBottom: 16 }}>
              Share with the community
            </SectionTitle>
            <form onSubmit={handlePostSubmit}>
              <TextArea
                placeholder="What's on your mind?"
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                rows={3}
              />
              <ButtonRow>
                <PrimaryButton type="submit" disabled={!postText.trim()}>
                  Post
                </PrimaryButton>
              </ButtonRow>
            </form>
          </Panel>

          {/* Community Posts */}
          {placeholderPosts.map((post) => (
            <Panel key={post.id}>
              <PostHeader>
                <AvatarCircle>{post.user.name[0]}</AvatarCircle>
                <PostMeta>
                  <div>
                    <UserName>{post.user.name}</UserName>
                  </div>
                  <TimeStamp>{post.timeAgo}</TimeStamp>
                </PostMeta>
                <SmallIconButton>
                  <MoreVertical size={18} />
                </SmallIconButton>
              </PostHeader>

              <PostBody>{post.content}</PostBody>

              <HorizontalRule />

              <ActionRow>
                <GhostButton>
                  <ThumbsUp size={16} />
                  Like ({post.likes})
                </GhostButton>
                <GhostButton>
                  <MessageSquare size={16} />
                  Comment ({post.comments})
                </GhostButton>
                <GhostButton>
                  <Share2 size={16} />
                  Share
                </GhostButton>
              </ActionRow>
            </Panel>
          ))}
        </>
      )}

      {/* Events Tab */}
      {tabValue === 1 && (
        <>
          <SpaceBetween style={{ marginBottom: 24 }}>
            <SectionTitle>Upcoming Events</SectionTitle>
            <OutlineButton>
              <Calendar size={18} />
              Create Event
            </OutlineButton>
          </SpaceBetween>

          <GridRow>
            {placeholderEvents.map((event) => (
              <StyledCard key={event.id}>
                <SectionTitle style={{ marginBottom: 12 }}>
                  {event.title}
                </SectionTitle>

                <DetailRow>
                  <Calendar size={18} />
                  <span>
                    {event.date} at {event.time}
                  </span>
                </DetailRow>

                <DetailRow>
                  <Users size={18} />
                  <span>{event.attendees} attending</span>
                </DetailRow>

                <SpaceBetween>
                  <Chip>{event.location}</Chip>
                  <PrimaryButton>Join</PrimaryButton>
                </SpaceBetween>
              </StyledCard>
            ))}
          </GridRow>
        </>
      )}

      {/* Groups Tab */}
      {tabValue === 2 && (
        <>
          <SpaceBetween style={{ marginBottom: 24 }}>
            <SectionTitle>Suggested Groups</SectionTitle>
            <OutlineButton>
              <Users size={18} />
              Browse All
            </OutlineButton>
          </SpaceBetween>

          <GridRowThirds>
            {placeholderGroups.map((group) => (
              <StyledCard key={group.id}>
                <SectionTitle style={{ marginBottom: 12 }}>
                  {group.name}
                </SectionTitle>

                <DetailRow>
                  <Users size={18} />
                  <span>{group.members} members</span>
                </DetailRow>

                <Chip style={{ marginBottom: 16 }}>{group.category}</Chip>

                <CenterRow>
                  <PrimaryButton $fullWidth>
                    <UserPlus size={18} />
                    Join Group
                  </PrimaryButton>
                </CenterRow>
              </StyledCard>
            ))}
          </GridRowThirds>
        </>
      )}
    </Section>
  );
};

export default CommunitySection;
