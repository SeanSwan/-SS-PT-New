/**
 * MembersVaultTab.tsx
 * ===================
 * Members-only content management.
 * Shows videos with visibility='members_only', grouped by access_tier.
 * Access grant management: add/revoke grants for specific users.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import {
  Lock,
  Eye,
  Play,
  Search,
  UserPlus,
  UserMinus,
  Shield,
  Crown,
  Star,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  return res.json();
};

// ─── Types ───────────────────────────────────────────
interface Video {
  id: number;
  title: string;
  source: 'upload' | 'youtube';
  status: string;
  visibility: string;
  accessTier: string;
  thumbnailUrl: string | null;
  viewCount: number;
}

interface UserResult {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

// ─── Styled Components ──────────────────────────────
const Container = styled.div``;

const TierSection = styled.div`
  margin-bottom: 28px;
`;

const TierHeader = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  background: rgba(30, 58, 138, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 12px;
  padding: 14px 20px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  transition: all 0.2s;

  &:hover {
    border-color: rgba(0, 255, 255, 0.4);
    background: rgba(30, 58, 138, 0.25);
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

const TierIcon = styled.span<{ $tier: string }>`
  color: ${(p) => {
    switch (p.$tier) {
      case 'premium':
        return '#fbbf24';
      case 'member':
        return '#00ffff';
      default:
        return '#22c55e';
    }
  }};
  display: flex;
`;

const VideoCount = styled.span`
  margin-left: auto;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 400;
`;

const ChevronWrap = styled.span`
  color: rgba(255, 255, 255, 0.4);
  display: flex;
`;

const TierContent = styled(motion.div)`
  margin-top: 12px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  background: rgba(30, 58, 138, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 12px;
  overflow: hidden;
  transition: border-color 0.2s;

  &:hover {
    border-color: rgba(0, 255, 255, 0.4);
  }
`;

const Thumbnail = styled.div<{ $src?: string | null }>`
  width: 100%;
  aspect-ratio: 16 / 9;
  background: ${(p) =>
    p.$src ? `url(${p.$src}) center/cover no-repeat` : 'rgba(0, 0, 0, 0.4)'};
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;

  svg {
    color: rgba(255, 255, 255, 0.3);
    width: 36px;
    height: 36px;
  }
`;

const LockOverlay = styled.div`
  position: absolute;
  top: 8px;
  left: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 6px;
  font-size: 11px;
  color: #00ffff;

  svg {
    width: 12px;
    height: 12px;
    color: #00ffff;
  }
`;

const CardBody = styled.div`
  padding: 12px;
`;

const CardTitle = styled.h3`
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 8px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CardActions = styled.div`
  display: flex;
  gap: 6px;
`;

const SmallButton = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid rgba(59, 130, 246, 0.3);
  background: rgba(30, 58, 138, 0.2);
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  cursor: pointer;
  min-height: 36px;
  transition: all 0.2s;

  &:hover {
    background: rgba(59, 130, 246, 0.3);
    color: white;
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

// Grant management panel
const GrantPanel = styled.div`
  background: rgba(30, 58, 138, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;

  @media (max-width: 768px) {
    padding: 16px;
  }
`;

const GrantTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 10px;

  svg {
    width: 20px;
    height: 20px;
    color: #00ffff;
  }
`;

const GrantForm = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: flex-end;
`;

const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 180px;
`;

const Label = styled.label`
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const Input = styled.input`
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  padding: 10px 14px;
  color: white;
  font-size: 14px;
  min-height: 44px;

  &::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }
  &:focus {
    outline: none;
    border-color: #00ffff;
  }
`;

const Select = styled.select`
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  padding: 10px 14px;
  color: white;
  font-size: 14px;
  min-height: 44px;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #00ffff;
  }

  option {
    background: #0a0a1a;
  }
`;

const PrimaryButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(45deg, #3b82f6, #00ffff);
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  white-space: nowrap;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.9;
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const UserList = styled.div`
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const UserRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
`;

const StatusMsg = styled.p<{ $error?: boolean }>`
  font-size: 14px;
  color: ${(p) => (p.$error ? '#ef4444' : '#22c55e')};
  margin: 8px 0 0;
`;

const EmptyState = styled.p`
  text-align: center;
  padding: 40px 20px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 14px;
`;

const LoadingText = styled.p`
  text-align: center;
  padding: 40px;
  color: rgba(255, 255, 255, 0.5);
`;

// ─── Component ───────────────────────────────────────
const tierIcon = (tier: string) => {
  switch (tier) {
    case 'premium':
      return <Crown />;
    case 'member':
      return <Star />;
    default:
      return <Shield />;
  }
};

const MembersVaultTab: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTiers, setExpandedTiers] = useState<Set<string>>(new Set(['free', 'member', 'premium']));

  // Grant form
  const [grantUserSearch, setGrantUserSearch] = useState('');
  const [grantVideoId, setGrantVideoId] = useState('');
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);
  const [grantMsg, setGrantMsg] = useState<{ text: string; error: boolean } | null>(null);

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchWithAuth('/api/v2/admin/videos?visibility=members_only&limit=100');
      setVideos(data.videos || data.data || []);
    } catch (err) {
      console.error('Failed to fetch members vault videos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // Search users for grant
  useEffect(() => {
    if (grantUserSearch.length < 2) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const data = await fetchWithAuth(`/api/v2/admin/users?search=${encodeURIComponent(grantUserSearch)}&limit=5`);
        setSearchResults(data.users || data.data || []);
      } catch {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [grantUserSearch]);

  const handleGrant = async () => {
    if (!selectedUser || !grantVideoId) return;
    setGrantMsg(null);
    try {
      const data = await fetchWithAuth('/api/v2/admin/video-access/grant', {
        method: 'POST',
        body: JSON.stringify({ userId: selectedUser.id, videoId: Number(grantVideoId) }),
      });
      if (data.error) {
        setGrantMsg({ text: data.error, error: true });
      } else {
        setGrantMsg({ text: `Access granted to ${selectedUser.firstName} ${selectedUser.lastName}`, error: false });
        setSelectedUser(null);
        setGrantUserSearch('');
        setGrantVideoId('');
      }
    } catch (err: any) {
      setGrantMsg({ text: err.message || 'Grant failed', error: true });
    }
  };

  const handleRevoke = async (userId: number, videoId: number) => {
    try {
      await fetchWithAuth('/api/v2/admin/video-access/revoke', {
        method: 'POST',
        body: JSON.stringify({ userId, videoId }),
      });
    } catch (err) {
      console.error('Failed to revoke access:', err);
    }
  };

  const toggleTier = (tier: string) => {
    setExpandedTiers((prev) => {
      const next = new Set(prev);
      if (next.has(tier)) {
        next.delete(tier);
      } else {
        next.add(tier);
      }
      return next;
    });
  };

  const grouped = videos.reduce<Record<string, Video[]>>((acc, v) => {
    const tier = v.accessTier || 'free';
    if (!acc[tier]) acc[tier] = [];
    acc[tier].push(v);
    return acc;
  }, {});

  const tiers = ['free', 'member', 'premium'];

  return (
    <Container>
      {/* Access Grant Panel */}
      <GrantPanel>
        <GrantTitle>
          <UserPlus /> Grant Video Access
        </GrantTitle>
        <GrantForm>
          <FormField>
            <Label>Search User</Label>
            <Input
              placeholder="Search by name or email..."
              value={grantUserSearch}
              onChange={(e) => {
                setGrantUserSearch(e.target.value);
                setSelectedUser(null);
              }}
            />
            {searchResults.length > 0 && !selectedUser && (
              <UserList>
                {searchResults.map((u) => (
                  <UserRow
                    key={u.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      setSelectedUser(u);
                      setGrantUserSearch(`${u.firstName} ${u.lastName} (${u.email})`);
                      setSearchResults([]);
                    }}
                  >
                    {u.firstName} {u.lastName} - {u.email}
                  </UserRow>
                ))}
              </UserList>
            )}
          </FormField>
          <FormField>
            <Label>Video ID</Label>
            <Select value={grantVideoId} onChange={(e) => setGrantVideoId(e.target.value)}>
              <option value="">Select Video</option>
              {videos.map((v) => (
                <option key={v.id} value={v.id}>
                  #{v.id} - {v.title}
                </option>
              ))}
            </Select>
          </FormField>
          <PrimaryButton onClick={handleGrant} disabled={!selectedUser || !grantVideoId}>
            <UserPlus /> Grant Access
          </PrimaryButton>
        </GrantForm>
        {grantMsg && <StatusMsg $error={grantMsg.error}>{grantMsg.text}</StatusMsg>}
      </GrantPanel>

      {/* Tier-grouped video grid */}
      {loading ? (
        <LoadingText>Loading members vault...</LoadingText>
      ) : videos.length === 0 ? (
        <EmptyState>No members-only content yet. Set video visibility to "Members Only" to see them here.</EmptyState>
      ) : (
        tiers.map((tier) => {
          const tierVideos = grouped[tier] || [];
          if (tierVideos.length === 0) return null;
          const isExpanded = expandedTiers.has(tier);
          return (
            <TierSection key={tier}>
              <TierHeader onClick={() => toggleTier(tier)}>
                <TierIcon $tier={tier}>{tierIcon(tier)}</TierIcon>
                {tier.charAt(0).toUpperCase() + tier.slice(1)} Tier
                <VideoCount>{tierVideos.length} video{tierVideos.length !== 1 ? 's' : ''}</VideoCount>
                <ChevronWrap>{isExpanded ? <ChevronUp /> : <ChevronDown />}</ChevronWrap>
              </TierHeader>
              <AnimatePresence>
                {isExpanded && (
                  <TierContent
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <Grid>
                      {tierVideos.map((video) => (
                        <Card key={video.id}>
                          <Thumbnail $src={video.thumbnailUrl}>
                            {!video.thumbnailUrl && <Play />}
                            <LockOverlay>
                              <Lock /> {tier}
                            </LockOverlay>
                          </Thumbnail>
                          <CardBody>
                            <CardTitle>{video.title}</CardTitle>
                            <CardActions>
                              <SmallButton onClick={() => alert(`Manage access for video #${video.id}`)}>
                                <UserPlus /> Manage Access
                              </SmallButton>
                            </CardActions>
                          </CardBody>
                        </Card>
                      ))}
                    </Grid>
                  </TierContent>
                )}
              </AnimatePresence>
            </TierSection>
          );
        })
      )}
    </Container>
  );
};

export default MembersVaultTab;
