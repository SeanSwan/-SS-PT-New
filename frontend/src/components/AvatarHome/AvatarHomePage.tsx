/**
 * ┌─── PAGE: AvatarHomePage ───────────────────────────────────┐
 * │ PURPOSE: Main entry for the 3D avatar home feature.        │
 * │ Shows LevelGate (< Lv10), MinimalistView, or HomeWorld.   │
 * │ Fetches avatar home data from /api/avatar-home.            │
 * │ CEO RULING: Progressive unlock at Lv10, Minimalist Mode.  │
 * └────────────────────────────────────────────────────────────┘
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { Home, Eye, EyeOff, Loader } from 'lucide-react';
import LevelGate from './LevelGate';
import MinimalistView from './MinimalistView';
import HomeWorld from './HomeWorld';

const PageWrapper = styled.div`
  min-height: 100%;
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid rgba(96, 192, 240, 0.12);
  flex-wrap: wrap;
  gap: 12px;
`;

const HeaderTitle = styled.h1`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 18px;
  font-weight: 700;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ModeToggle = styled.button<{ $minimalist: boolean }>`
  min-height: 44px;
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid ${({ $minimalist }) =>
    $minimalist ? 'rgba(198, 168, 75, 0.3)' : 'rgba(96, 192, 240, 0.2)'};
  background: ${({ $minimalist }) =>
    $minimalist ? 'rgba(198, 168, 75, 0.08)' : 'rgba(96, 192, 240, 0.08)'};
  color: ${({ $minimalist }) =>
    $minimalist ? '#C6A84B' : 'var(--accent-primary, #60C0F0)'};
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s;

  &:hover { opacity: 0.85; }
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.85));
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  gap: 8px;
`;

const ErrorBanner = styled.div`
  padding: 16px 24px;
  margin: 16px 24px;
  border-radius: 10px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #EF4444;
  font-family: 'Sora', sans-serif;
  font-size: 14px;
`;

interface HomeData {
  unlocked: boolean;
  avatarBodyType: string;
  avatarSkinTone: string;
  avatarHairStyle: string;
  avatarOutfit: string;
  homeTier: string;
  activeRoom: string;
  furniture: Record<string, Record<string, string>>;
  minimalistMode: boolean;
}

const AvatarHomePage: React.FC = () => {
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [userLevel, setUserLevel] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const token = localStorage.getItem('token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  useEffect(() => {
    // Fetch avatar home data
    fetch('/api/avatar-home', { headers })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setHomeData(d.data);
        } else {
          setError(d.message || 'Failed to load avatar home');
        }
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));

    // Fetch user level from gamification
    fetch('/api/gamification/profile', { headers })
      .then(r => r.json())
      .then(d => {
        if (d.data?.level) setUserLevel(d.data.level);
        else if (d.level) setUserLevel(d.level);
      })
      .catch(() => {/* gamification may not be set up */});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMinimalistMode = useCallback(async () => {
    try {
      const res = await fetch('/api/avatar-home/minimalist-mode', {
        method: 'PATCH',
        headers,
      });
      const d = await res.json();
      if (d.success && homeData) {
        setHomeData({ ...homeData, minimalistMode: d.data.minimalistMode });
      }
    } catch { /* best-effort */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeData]);

  const handleRoomChange = useCallback(async (room: string) => {
    try {
      const res = await fetch('/api/avatar-home/room', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ room }),
      });
      const d = await res.json();
      if (d.success && homeData) {
        setHomeData({ ...homeData, activeRoom: room });
      }
    } catch { /* best-effort */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeData]);

  if (loading) {
    return (
      <PageWrapper>
        <LoadingState>
          <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
          Loading your home...
        </LoadingState>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper>
        <ErrorBanner>{error}</ErrorBanner>
      </PageWrapper>
    );
  }

  // Level gate — user hasn't reached Level 10
  if (!homeData?.unlocked) {
    return (
      <PageWrapper>
        <LevelGate currentLevel={userLevel} requiredLevel={10} />
      </PageWrapper>
    );
  }

  // Unlocked — show 3D or minimalist view
  return (
    <PageWrapper>
      <Header>
        <HeaderTitle>
          <Home size={20} /> My Home
        </HeaderTitle>
        <ModeToggle $minimalist={homeData.minimalistMode} onClick={toggleMinimalistMode}>
          {homeData.minimalistMode ? <Eye size={14} /> : <EyeOff size={14} />}
          {homeData.minimalistMode ? 'Minimalist Mode' : '3D Mode'}
        </ModeToggle>
      </Header>

      {homeData.minimalistMode ? (
        <MinimalistView data={homeData} onToggle3D={toggleMinimalistMode} />
      ) : (
        <HomeWorld
          homeTier={homeData.homeTier}
          activeRoom={homeData.activeRoom}
          furniture={homeData.furniture}
          onRoomChange={handleRoomChange}
        />
      )}
    </PageWrapper>
  );
};

export default AvatarHomePage;
