/**
 * UserProfilePage.tsx
 * Public profile view for viewing another user's profile.
 * Fetched via /api/profile/:userId and /api/profile/:userId/posts
 * Galaxy-Swan themed with styled-components.
 */
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { ArrowLeft, MapPin, Calendar, Award, Users, Dumbbell } from 'lucide-react';
import api from '../../services/api';

interface UserProfile {
  id: string | number;
  firstName: string;
  lastName: string;
  username: string;
  photo?: string;
  bannerPhoto?: string;
  bio?: string;
  location?: string;
  role?: string;
  createdAt?: string;
  followers?: number;
  following?: number;
  totalWorkouts?: number;
  points?: number;
  level?: number;
  streakDays?: number;
}

interface UserPost {
  id: string | number;
  content: string;
  postType?: string;
  createdAt: string;
  likesCount?: number;
  commentsCount?: number;
}

// Galaxy-Swan styled components
const PageWrapper = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0a0a1a 0%, #1a1a3e 50%, #0a0a1a 100%);
  color: #e2e8f0;
  padding-bottom: 48px;
`;

const BackButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(14, 165, 233, 0.1);
  border: 1px solid rgba(14, 165, 233, 0.3);
  color: #7dd3fc;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  margin: 16px 24px;
  min-height: 44px;
  min-width: 44px;
  transition: background 0.2s;

  &:hover {
    background: rgba(14, 165, 233, 0.2);
  }
`;

const BannerSection = styled.div<{ $src?: string }>`
  width: 100%;
  height: 200px;
  background: ${({ $src }) =>
    $src
      ? `url(${$src}) center/cover no-repeat`
      : 'linear-gradient(135deg, #7851a9 0%, #0ea5e9 50%, #7851a9 100%)'};
  position: relative;
`;

const ProfileHeader = styled.div`
  max-width: 960px;
  margin: -60px auto 0;
  padding: 0 24px;
  position: relative;
  z-index: 1;
`;

const AvatarRow = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 20px;
  flex-wrap: wrap;
`;

const AvatarCircle = styled.div<{ $src?: string }>`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 4px solid #0a0a1a;
  background: ${({ $src }) =>
    $src ? `url(${$src}) center/cover no-repeat` : 'linear-gradient(135deg, #7851a9, #0ea5e9)'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
`;

const NameBlock = styled.div`
  padding-bottom: 8px;
`;

const DisplayName = styled.h1`
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0;
  color: #f1f5f9;
`;

const Username = styled.p`
  font-size: 0.95rem;
  color: #94a3b8;
  margin: 4px 0 0;
`;

const Bio = styled.p`
  max-width: 960px;
  margin: 16px auto 0;
  padding: 0 24px;
  color: #cbd5e1;
  font-size: 0.95rem;
  line-height: 1.6;
`;

const MetaRow = styled.div`
  max-width: 960px;
  margin: 12px auto 0;
  padding: 0 24px;
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  color: #94a3b8;
  font-size: 0.85rem;
`;

const MetaItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`;

const StatsGrid = styled.div`
  max-width: 960px;
  margin: 24px auto 0;
  padding: 0 24px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
`;

const StatCard = styled.div`
  background: rgba(14, 165, 233, 0.08);
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: #7dd3fc;
`;

const StatLabel = styled.div`
  font-size: 0.8rem;
  color: #94a3b8;
  margin-top: 4px;
`;

const SectionTitle = styled.h2`
  max-width: 960px;
  margin: 32px auto 16px;
  padding: 0 24px;
  font-size: 1.25rem;
  font-weight: 600;
  color: #e2e8f0;
`;

const PostsList = styled.div`
  max-width: 960px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const PostCard = styled.div`
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(14, 165, 233, 0.15);
  border-radius: 12px;
  padding: 20px;
`;

const PostContent = styled.p`
  color: #cbd5e1;
  margin: 0 0 12px;
  line-height: 1.5;
`;

const PostMeta = styled.div`
  display: flex;
  gap: 16px;
  color: #64748b;
  font-size: 0.8rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 48px 24px;
  color: #64748b;
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  padding: 80px 0;

  &::after {
    content: '';
    width: 40px;
    height: 40px;
    border: 3px solid rgba(14, 165, 233, 0.2);
    border-top-color: #0ea5e9;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const ErrorMessage = styled.div`
  max-width: 960px;
  margin: 80px auto;
  padding: 32px 24px;
  text-align: center;
  color: #f87171;
  background: rgba(248, 113, 113, 0.08);
  border: 1px solid rgba(248, 113, 113, 0.2);
  border-radius: 12px;
`;

const UserProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const [profileRes, postsRes] = await Promise.allSettled([
          api.get(`/api/profile/${userId}`),
          api.get(`/api/profile/${userId}/posts`),
        ]);

        if (profileRes.status === 'fulfilled' && profileRes.value.data?.success) {
          setProfile(profileRes.value.data.data || profileRes.value.data.user);
        } else {
          setError('User not found');
          return;
        }

        if (postsRes.status === 'fulfilled' && postsRes.value.data?.success) {
          setPosts(postsRes.value.data.posts || postsRes.value.data.data || []);
        }
      } catch {
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  if (loading) {
    return (
      <PageWrapper>
        <BackButton onClick={() => navigate(-1)}>
          <ArrowLeft size={18} /> Back
        </BackButton>
        <LoadingSpinner />
      </PageWrapper>
    );
  }

  if (error || !profile) {
    return (
      <PageWrapper>
        <BackButton onClick={() => navigate(-1)}>
          <ArrowLeft size={18} /> Back
        </BackButton>
        <ErrorMessage>{error || 'User not found'}</ErrorMessage>
      </PageWrapper>
    );
  }

  const initials = `${(profile.firstName || '')[0] || ''}${(profile.lastName || '')[0] || ''}`.toUpperCase();
  const joinDate = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  return (
    <PageWrapper>
      <BackButton onClick={() => navigate(-1)}>
        <ArrowLeft size={18} /> Back
      </BackButton>

      <BannerSection $src={profile.bannerPhoto || undefined} />

      <ProfileHeader>
        <AvatarRow>
          <AvatarCircle $src={profile.photo || undefined}>
            {!profile.photo && initials}
          </AvatarCircle>
          <NameBlock>
            <DisplayName>{profile.firstName} {profile.lastName}</DisplayName>
            <Username>@{profile.username}</Username>
          </NameBlock>
        </AvatarRow>
      </ProfileHeader>

      {profile.bio && <Bio>{profile.bio}</Bio>}

      <MetaRow>
        {profile.location && (
          <MetaItem><MapPin size={14} /> {profile.location}</MetaItem>
        )}
        {joinDate && (
          <MetaItem><Calendar size={14} /> Joined {joinDate}</MetaItem>
        )}
        {profile.role && (
          <MetaItem><Award size={14} /> {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}</MetaItem>
        )}
      </MetaRow>

      <StatsGrid>
        {profile.followers !== undefined && (
          <StatCard>
            <StatValue>{profile.followers}</StatValue>
            <StatLabel>Followers</StatLabel>
          </StatCard>
        )}
        {profile.following !== undefined && (
          <StatCard>
            <StatValue>{profile.following}</StatValue>
            <StatLabel>Following</StatLabel>
          </StatCard>
        )}
        {profile.totalWorkouts !== undefined && (
          <StatCard>
            <StatValue>{profile.totalWorkouts}</StatValue>
            <StatLabel>Workouts</StatLabel>
          </StatCard>
        )}
        {profile.points !== undefined && (
          <StatCard>
            <StatValue>{profile.points.toLocaleString()}</StatValue>
            <StatLabel>Points</StatLabel>
          </StatCard>
        )}
        {profile.streakDays !== undefined && profile.streakDays > 0 && (
          <StatCard>
            <StatValue>{profile.streakDays}</StatValue>
            <StatLabel>Day Streak</StatLabel>
          </StatCard>
        )}
      </StatsGrid>

      <SectionTitle>Posts</SectionTitle>

      <PostsList>
        {posts.length === 0 ? (
          <EmptyState>No posts yet</EmptyState>
        ) : (
          posts.map((post) => (
            <PostCard key={post.id}>
              <PostContent>{post.content}</PostContent>
              <PostMeta>
                <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                {post.likesCount !== undefined && <span>{post.likesCount} likes</span>}
                {post.commentsCount !== undefined && <span>{post.commentsCount} comments</span>}
              </PostMeta>
            </PostCard>
          ))
        )}
      </PostsList>
    </PageWrapper>
  );
};

export default UserProfilePage;
