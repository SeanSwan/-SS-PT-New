/**
 * UserProfilePage.tsx
 * Public profile view for viewing another user's profile.
 * Fetched via /api/profile/:userId and /api/profile/:userId/posts
 *
 * Theme: Crystalline Swan (Enchanted Apex)
 * AI Village 9-Brain Consensus (2026-03-15): Crystalline Swan purge,
 * Midnight Sapphire backgrounds, Royal Depth surfaces, Frost White text.
 */
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { sanitizeImageUrl, cssUrlValue } from '../../utils/imageUrl';
import { ArrowLeft, MapPin, Calendar, Award, Lock } from 'lucide-react';
import MembershipBadge from '../../components/MembershipBadge/MembershipBadge';
import api from '../../services/api';
import { useAppSelector } from '../../store';
import ProfileChartsGrid from '../../components/UserDashboard/components/ProfileChartsGrid';
import TransformationPhotoShowcase from '../../components/UserDashboard/components/TransformationPhotoShowcase';
import type { TransformationPhoto } from '../../components/UserDashboard/components/TransformationPhotoTypes';
import type { ChartVisibility } from './components/ChartVisibilityToggle';
import RPGProfileHeader from '../../components/Social/RPGProfileHeader';
import { FactionSelector, BadgeShowcase } from '../../components/Social/RPG';
import type { ShowcaseBadge } from '../../components/Social/RPG';

// ── Crystalline Swan Tokens ──
const TOKENS = {
  midnightSapphire: '#002060',
  royalDepth: '#003080',
  iceWing: '#60C0F0',
  arcticCyan: '#50A0F0',
  gildedFern: '#C6A84B',
  frostWhite: '#E0ECF4',
  swanLavender: '#4070C0',
  wingPurple: '#8B5CF6',
};

interface UserBadge {
  id: string;
  title: string;
  iconEmoji: string;
  iconUrl?: string | null;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  earnedAt?: string;
}

interface UserProfile {
  id: string | number;
  firstName: string;
  lastName: string;
  username: string;
  photo?: string;
  clientSource?: 'swanstudios' | 'move_fitness' | 'external';
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
  tier?: string;
  jobClass?: string | null;
  streakDays?: number;
  profileVisibility?: string;
  showBadges?: boolean;
  showStats?: boolean;
  showLevel?: boolean;
  showCharts?: boolean;
  chartVisibility?: Partial<ChartVisibility>;
}

interface UserPost {
  id: string | number;
  content: string;
  postType?: string;
  createdAt: string;
  likesCount?: number;
  commentsCount?: number;
}

// ── Animations ──
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
`;

// ── Styled Components (Crystalline Swan) ──
const PageWrapper = styled.div`
  min-height: 100vh;
  background: var(--bg-base, ${TOKENS.midnightSapphire});
  color: var(--text-primary, ${TOKENS.frostWhite});
  padding-bottom: 48px;
  font-family: 'Plus Jakarta Sans', 'Sora', system-ui, sans-serif;
`;

const BackButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(96, 192, 240, 0.08);
  border: 1px solid rgba(96, 192, 240, 0.2);
  color: ${TOKENS.iceWing};
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-family: 'Sora', sans-serif;
  margin: 16px 24px;
  min-height: 44px;
  min-width: 44px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(96, 192, 240, 0.15);
    border-color: rgba(96, 192, 240, 0.4);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, ${TOKENS.iceWing});
    outline-offset: 4px;
    box-shadow: 0 0 16px rgba(96, 192, 240, 0.4), inset 0 0 0 1px rgba(139, 92, 246, 0.2);
  }
`;

const BannerSection = styled.div<{ $src?: string }>`
  width: 100%;
  height: 200px;
  background: ${({ $src }) => {
    const safe = $src ? sanitizeImageUrl($src) : null;
    return safe
      ? `url(${cssUrlValue(safe)}) center/cover no-repeat`
      : `linear-gradient(135deg, ${TOKENS.royalDepth} 0%, ${TOKENS.swanLavender} 50%, ${TOKENS.midnightSapphire} 100%)`;
  }};
  position: relative;

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 80px;
    background: linear-gradient(transparent, ${TOKENS.midnightSapphire});
  }
`;

const ProfileHeader = styled.div`
  max-width: 960px;
  margin: -60px auto 0;
  padding: 0 24px;
  position: relative;
  z-index: 1;
  animation: ${fadeIn} 0.4s ease-out;
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
  border: 3px solid ${TOKENS.royalDepth};
  box-shadow: 0 0 20px rgba(96, 192, 240, 0.15), inset 0 0 20px rgba(0, 0, 0, 0.2);
  background: ${({ $src }) => {
    const safe = $src ? sanitizeImageUrl($src) : null;
    return safe
      ? `url(${cssUrlValue(safe)}) center/cover no-repeat`
      : `linear-gradient(135deg, ${TOKENS.swanLavender}, ${TOKENS.wingPurple})`;
  }};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  font-weight: 700;
  color: ${TOKENS.frostWhite};
  flex-shrink: 0;
`;

const NameBlock = styled.div`
  padding-bottom: 8px;
`;

const DisplayName = styled.h1`
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0;
  color: ${TOKENS.frostWhite};
  font-family: 'Plus Jakarta Sans', sans-serif;
`;

const Username = styled.p`
  font-size: 0.95rem;
  color: ${TOKENS.iceWing};
  margin: 4px 0 0;
  opacity: 0.8;
`;

const LevelBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(139, 92, 246, 0.15);
  border: 1px solid rgba(139, 92, 246, 0.3);
  color: ${TOKENS.frostWhite};
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-family: 'Fira Code', monospace;
  margin-left: 8px;
  vertical-align: middle;
`;

const Bio = styled.p`
  max-width: 960px;
  margin: 16px auto 0;
  padding: 0 24px;
  color: ${TOKENS.frostWhite};
  opacity: 0.85;
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
  color: ${TOKENS.iceWing};
  font-size: 0.85rem;
  opacity: 0.7;
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
  animation: ${fadeIn} 0.5s ease-out 0.1s both;
`;

const StatCard = styled.div`
  background: ${TOKENS.royalDepth};
  border: 1px solid rgba(96, 192, 240, 0.12);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(96, 192, 240, 0.25);
    box-shadow: 0 4px 16px rgba(0, 32, 96, 0.4);
  }
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${TOKENS.iceWing};
  font-family: 'Fira Code', monospace;
`;

const StatLabel = styled.div`
  font-size: 0.8rem;
  color: ${TOKENS.frostWhite};
  opacity: 0.6;
  margin-top: 4px;
  font-family: 'Sora', sans-serif;
`;

const SectionTitle = styled.h2`
  max-width: 960px;
  margin: 32px auto 16px;
  padding: 0 24px;
  font-size: 1.25rem;
  font-weight: 600;
  color: ${TOKENS.frostWhite};
  font-family: 'Plus Jakarta Sans', sans-serif;
`;

const PostsList = styled.div`
  max-width: 960px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  animation: ${fadeIn} 0.5s ease-out 0.2s both;
`;

const PostCard = styled.div`
  background: ${TOKENS.royalDepth};
  border: 1px solid rgba(96, 192, 240, 0.1);
  border-radius: 12px;
  padding: 20px;
  transition: border-color 0.2s ease;

  &:hover {
    border-color: rgba(96, 192, 240, 0.2);
  }
`;

const PostContent = styled.p`
  color: ${TOKENS.frostWhite};
  opacity: 0.9;
  margin: 0 0 12px;
  line-height: 1.5;
`;

const PostMeta = styled.div`
  display: flex;
  gap: 16px;
  color: ${TOKENS.iceWing};
  opacity: 0.5;
  font-size: 0.8rem;
  font-family: 'Fira Code', monospace;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 48px 24px;
  color: ${TOKENS.swanLavender};
  opacity: 0.6;
`;

// ── Badge Showcase Components ──

const RARITY_COLORS: Record<string, string> = {
  common: TOKENS.swanLavender,
  rare: TOKENS.gildedFern,
  epic: TOKENS.wingPurple,
  legendary: TOKENS.gildedFern,
};

const BadgesGrid = styled.div`
  max-width: 960px;
  margin: 0 auto;
  padding: 0 24px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
  animation: ${fadeIn} 0.5s ease-out 0.15s both;
`;

const BadgeItem = styled.div<{ $rarity: string }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 8px;
  background: ${TOKENS.royalDepth};
  border: 1px solid ${({ $rarity }) => `${RARITY_COLORS[$rarity] || TOKENS.swanLavender}33`};
  border-radius: 12px;
  transition: all 0.2s ease;
  min-height: 44px;

  &:hover {
    border-color: ${({ $rarity }) => `${RARITY_COLORS[$rarity] || TOKENS.swanLavender}66`};
    box-shadow: 0 4px 16px rgba(0, 32, 96, 0.4);
    transform: translateY(-2px);
  }
`;

const BadgeIconWrap = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const BadgeImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 12px;
`;

const BadgeEmojiIcon = styled.span`
  font-size: 2rem;
  line-height: 1;
`;

const BadgeName = styled.span`
  font-size: 0.65rem;
  color: ${TOKENS.frostWhite};
  opacity: 0.7;
  text-align: center;
  line-height: 1.2;
  font-family: 'Sora', sans-serif;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const PrivateProfileNotice = styled.div`
  max-width: 960px;
  margin: 60px auto;
  padding: 40px 24px;
  text-align: center;
  color: ${TOKENS.frostWhite};
  opacity: 0.7;

  svg {
    margin-bottom: 16px;
    opacity: 0.5;
  }

  h3 {
    font-size: 1.2rem;
    margin: 0 0 8px;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }

  p {
    font-size: 0.9rem;
    opacity: 0.6;
    margin: 0;
  }
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  padding: 80px 0;

  &::after {
    content: '';
    width: 40px;
    height: 40px;
    border: 3px solid rgba(96, 192, 240, 0.15);
    border-top-color: ${TOKENS.iceWing};
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
  background: rgba(248, 113, 113, 0.06);
  border: 1px solid rgba(248, 113, 113, 0.15);
  border-radius: 12px;
`;

const UserProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);

  // Detect if the viewer is viewing their own profile
  const currentUser = useAppSelector(state => state.auth?.user);
  const isOwnProfile = useMemo(() => {
    if (!currentUser || !userId) return false;
    return String(currentUser.id) === String(userId);
  }, [currentUser, userId]);

  useEffect(() => {
    if (!userId) return;

    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      setIsPrivate(false);
      try {
        const [profileRes, postsRes, badgesRes] = await Promise.allSettled([
          api.get(`/api/profile/${userId}`),
          api.get(`/api/profile/${userId}/posts`),
          api.get(`/api/profile/${userId}/badges`),
        ]);

        if (profileRes.status === 'fulfilled' && profileRes.value.data?.success) {
          const data = profileRes.value.data.data || profileRes.value.data.user;
          setProfile(data);

          // Handle privacy — if profile is private and not self/friend, show notice
          if (data.profileVisibility === 'private') {
            setIsPrivate(true);
          }
        } else {
          setError('User not found');
          return;
        }

        if (postsRes.status === 'fulfilled' && postsRes.value.data?.success) {
          setPosts(postsRes.value.data.posts || postsRes.value.data.data || []);
        }

        if (badgesRes.status === 'fulfilled' && badgesRes.value.data?.success) {
          setBadges(badgesRes.value.data.badges || badgesRes.value.data.data || []);
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
        <BackButton onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft size={18} /> Back
        </BackButton>
        <LoadingSpinner aria-label="Loading profile" />
      </PageWrapper>
    );
  }

  if (error || !profile) {
    return (
      <PageWrapper>
        <BackButton onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft size={18} /> Back
        </BackButton>
        <ErrorMessage role="alert">{error || 'User not found'}</ErrorMessage>
      </PageWrapper>
    );
  }

  const initials = `${(profile.firstName || '')[0] || ''}${(profile.lastName || '')[0] || ''}`.toUpperCase();
  const joinDate = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  // Privacy-aware visibility
  const canShowStats = profile.showStats !== false;
  const canShowLevel = profile.showLevel !== false;
  const canShowBadges = profile.showBadges !== false;
  const canShowCharts = profile.showCharts !== false || isOwnProfile;

  return (
    <PageWrapper>
      <BackButton onClick={() => navigate(-1)} aria-label="Go back">
        <ArrowLeft size={18} /> Back
      </BackButton>

      <BannerSection $src={profile.bannerPhoto || undefined} />

      <ProfileHeader>
        <AvatarRow>
          <AvatarCircle $src={profile.photo || undefined}>
            {!profile.photo && initials}
          </AvatarCircle>
          <NameBlock>
            <DisplayName>
              {profile.firstName} {profile.lastName}
              {profile.clientSource && profile.clientSource !== 'external' && (
                <MembershipBadge clientSource={profile.clientSource} size="sm" />
              )}
              {canShowLevel && profile.level && profile.tier && (
                <RPGProfileHeader
                  level={profile.level}
                  tier={profile.tier as any}
                  xp={profile.points}
                  jobClass={profile.jobClass}
                />
              )}
            </DisplayName>
            <Username>@{profile.username}</Username>
          </NameBlock>
        </AvatarRow>
      </ProfileHeader>

      {isPrivate ? (
        <PrivateProfileNotice>
          <Lock size={48} />
          <h3>This profile is private</h3>
          <p>Only this user can see their full profile.</p>
        </PrivateProfileNotice>
      ) : (
        <>
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

          {canShowStats && (
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
          )}

          {/* RPG Faction Selector — own profile only */}
          {isOwnProfile && (
            <FactionSelector />
          )}

          {canShowBadges && badges.length > 0 && (
            <>
              <SectionTitle>Badges ({badges.length})</SectionTitle>
              <BadgesGrid>
                {badges.slice(0, 20).map((badge) => (
                  <BadgeItem key={badge.id} $rarity={badge.rarity}>
                    <BadgeIconWrap>
                      {badge.iconUrl ? (
                        <BadgeImg
                          src={badge.iconUrl}
                          alt={`${badge.title} badge`}
                          loading="lazy"
                        />
                      ) : (
                        <BadgeEmojiIcon role="img" aria-label={badge.title}>
                          {badge.iconEmoji}
                        </BadgeEmojiIcon>
                      )}
                    </BadgeIconWrap>
                    <BadgeName>{badge.title}</BadgeName>
                  </BadgeItem>
                ))}
              </BadgesGrid>
            </>
          )}

          {/* Transformation Before/After Photos (respects visibility) */}
          {(() => {
            const settings = (profile as Record<string, unknown>)?.transformationSettings as Record<string, unknown> | undefined;
            const photos = ((profile as Record<string, unknown>)?.transformationPhotos || []) as TransformationPhoto[];
            const showOnProfile = settings?.showOnProfile ?? false;
            const vis = (settings?.defaultVisibility as string) || 'private';
            if (!showOnProfile && !isOwnProfile) return null;
            if (photos.length === 0 && !isOwnProfile) return null;
            return (
              <div style={{ marginBottom: '1.5rem' }}>
                <TransformationPhotoShowcase
                  photos={photos}
                  visibility={vis as 'public' | 'friends' | 'private' | 'hidden'}
                  isOwnProfile={isOwnProfile}
                />
              </div>
            );
          })()}

          {canShowCharts && (
            <ProfileChartsGrid
              userId={profile.id}
              chartVisibility={profile.chartVisibility}
              isOwnProfile={isOwnProfile}
            />
          )}

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
        </>
      )}
    </PageWrapper>
  );
};

export default UserProfilePage;
