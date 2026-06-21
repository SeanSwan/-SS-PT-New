/**
 * COMPONENT: HomeWorld
 * PURPOSE: Dashboard-mounted Avatar Home room preview and navigation.
 * PARENT: AvatarHomePage
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';
import { Bed, Dumbbell, Home, Sparkles, UtensilsCrossed } from 'lucide-react';

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const TIER_TOKENS = {
  luxury: ['color-mix(in srgb, var(--accent-warning, #C6A84B) 15%, transparent)', 'color-mix(in srgb, var(--accent-warning, #C6A84B) 40%, transparent)', 'var(--accent-warning, #C6A84B)'],
  premium: ['color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent)', 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 40%, transparent)', 'var(--accent-secondary, #8B5CF6)'],
  mid: ['color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent)', 'color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent)', 'var(--accent-primary, #60C0F0)'],
  fallback: ['color-mix(in srgb, var(--text-primary, #E0ECF4) 8%, transparent)', 'color-mix(in srgb, var(--text-primary, #E0ECF4) 15%, transparent)', 'var(--text-secondary, #A8B7C7)'],
} as const;

const tierToken = (tier: string) =>
  TIER_TOKENS[tier as keyof typeof TIER_TOKENS] ?? TIER_TOKENS.fallback;

const Wrapper = styled.div`
  padding: 24px;
  max-width: 1000px;
  margin: 0 auto;
`;

const SceneContainer = styled.div`
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 16px;
  overflow: hidden;
  background: linear-gradient(135deg, var(--bg-base, #0A0A0F) 0%, var(--surface-primary, #002060) 50%, var(--bg-base, #0A0A0F) 100%);
  background-size: 200% 100%;
  animation: ${shimmer} 8s ease-in-out infinite;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  position: relative;
  min-height: 300px;

  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

const SceneOverlay = styled.div`
  text-align: center;
  color: var(--text-primary, #E0ECF4);
  z-index: 2;
`;

const SceneTitle = styled.h2`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;

  @media (max-width: 640px) { font-size: 20px; }
`;

const SceneHint = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  color: var(--accent-primary, #60C0F0);
  margin: 0 0 16px;
`;

const RoomBadge = styled.div`
  position: absolute;
  top: 16px;
  left: 16px;
  max-width: calc(50% - 24px);
  padding: 6px 14px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--surface-primary, #002060) 80%, transparent);
  backdrop-filter: blur(8px);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: var(--accent-primary, #60C0F0);
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-wrap: anywhere;
`;

const TierBadge = styled.div<{ $tier: string }>`
  position: absolute;
  top: 16px;
  right: 16px;
  max-width: calc(50% - 24px);
  padding: 6px 14px;
  border-radius: 8px;
  background: ${({ $tier }) => tierToken($tier)[0]};
  border: 1px solid ${({ $tier }) => tierToken($tier)[1]};
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: ${({ $tier }) => tierToken($tier)[2]};
  overflow-wrap: anywhere;
`;

const RoomNav = styled.div`
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 20px;
`;

const RoomBtn = styled.button<{ $active: boolean }>`
  flex: 1 1 160px;
  min-height: 44px;
  padding: 10px 20px;
  border-radius: 10px;
  border: 2px solid ${({ $active }) => ($active ? 'var(--accent-primary, #60C0F0)' : 'transparent')};
  background: ${({ $active }) => $active ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent)' : 'var(--bg-elevated, #141419)'};
  color: ${({ $active }) => ($active ? 'var(--accent-primary, #60C0F0)' : 'var(--text-secondary, #A8B7C7)')};
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;

  &:hover { border-color: var(--accent-primary, #60C0F0); }

  @media (prefers-reduced-motion: reduce) { transition: none; }
`;

const FurnitureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
`;

const FurnitureCard = styled.div`
  padding: 16px;
  border-radius: 10px;
  background: var(--bg-elevated, #141419);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
`;

const FurnitureSlot = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary, #A8B7C7);
  margin-bottom: 4px;
`;

const FurnitureItem = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 13px;
  color: var(--accent-primary, #60C0F0);
`;

const EmptyRoomState = styled.div`
  padding: 16px;
  border-radius: 8px;
  border: 1px dashed color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  color: var(--text-secondary, #A8B7C7);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  text-align: center;
`;

const SetupHint = styled.div`
  text-align: center;
  padding: 16px;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: var(--text-secondary, #A8B7C7);
  border-radius: 10px;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 6%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent);
`;

const SetupIcon = styled(Sparkles)`vertical-align: middle; margin-right: 6px;`;

const ROOMS = [
  { id: 'training_room' as const, label: 'Training Room', icon: <Dumbbell size={16} /> },
  { id: 'bedroom' as const, label: 'Bedroom', icon: <Bed size={16} /> },
  { id: 'kitchen' as const, label: 'Kitchen', icon: <UtensilsCrossed size={16} /> },
];

const formatItem = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

interface HomeWorldProps {
  homeTier: string;
  activeRoom: string;
  furniture: Record<string, Record<string, string>>;
  onRoomChange: (room: string) => void;
}

const HomeWorld: React.FC<HomeWorldProps> = ({ homeTier, activeRoom, furniture, onRoomChange }) => {
  const currentRoom = ROOMS.find((room) => room.id === activeRoom) || ROOMS[0];
  const activeRoomId = currentRoom.id;
  const roomFurniture = furniture?.[activeRoomId] || {};
  const furnitureEntries = Object.entries(roomFurniture);

  return (
    <Wrapper>
      <SceneContainer>
        <RoomBadge>
          {currentRoom.icon} {currentRoom.label}
        </RoomBadge>
        <TierBadge $tier={homeTier}>
          {formatItem(homeTier)} Home
        </TierBadge>
        <SceneOverlay>
          <SceneTitle>
            <Home size={28} /> Your SwanStudios Home
          </SceneTitle>
          <SceneHint>
            Your private training habitat evolves with logged progress.
            <br />
            Room upgrades, companion rewards, and faction style stay synced to your journey.
          </SceneHint>
          <SetupHint>
            <SetupIcon size={14} aria-hidden="true" />
            Habitat link active: room state synced to your SwanStudios profile.
          </SetupHint>
        </SceneOverlay>
      </SceneContainer>

      <RoomNav>
        {ROOMS.map((room) => (
          <RoomBtn
            key={room.id}
            $active={activeRoomId === room.id}
            type="button"
            aria-pressed={activeRoomId === room.id}
            onClick={() => onRoomChange(room.id)}
          >
            {room.icon} {room.label}
          </RoomBtn>
        ))}
      </RoomNav>

      <FurnitureGrid>
        {furnitureEntries.map(([slot, item]) => (
          <FurnitureCard key={slot}>
            <FurnitureSlot>{formatItem(slot)}</FurnitureSlot>
            <FurnitureItem>{formatItem(item)}</FurnitureItem>
          </FurnitureCard>
        ))}
      </FurnitureGrid>
      {furnitureEntries.length === 0 && (
        <EmptyRoomState>No furniture placed in this room yet.</EmptyRoomState>
      )}
    </Wrapper>
  );
};

export default HomeWorld;
