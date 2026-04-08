/**
 * ┌─── COMPONENT: HomeWorld ───────────────────────────────────┐
 * │ PURPOSE: 3D avatar home environment placeholder.           │
 * │ When @react-three/fiber is installed, renders the actual   │
 * │ 3D scene. Until then, shows a styled preview with room     │
 * │ navigation and avatar customization controls.              │
 * │ CEO RULING: React Three Fiber + WebGPU, GLB assets.       │
 * └────────────────────────────────────────────────────────────┘
 */

import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  Home, Bed, UtensilsCrossed, Dumbbell, User, Settings,
  ChevronLeft, ChevronRight, Sparkles,
} from 'lucide-react';

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const Wrapper = styled.div`
  padding: 24px;
  max-width: 1000px;
  margin: 0 auto;
`;

const SceneContainer = styled.div`
  width: 100%;
  aspect-ratio: 16/9;
  border-radius: 16px;
  overflow: hidden;
  background: linear-gradient(135deg, #0A0A0F 0%, #002060 50%, #0A0A0F 100%);
  background-size: 200% 100%;
  animation: ${shimmer} 8s ease-in-out infinite;
  border: 1px solid rgba(96, 192, 240, 0.2);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  position: relative;
  min-height: 300px;
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
  padding: 6px 14px;
  border-radius: 8px;
  background: rgba(0, 32, 96, 0.8);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(96, 192, 240, 0.3);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: var(--accent-primary, #60C0F0);
  display: flex;
  align-items: center;
  gap: 6px;
`;

const TierBadge = styled.div<{ $tier: string }>`
  position: absolute;
  top: 16px;
  right: 16px;
  padding: 6px 14px;
  border-radius: 8px;
  background: ${({ $tier }) =>
    $tier === 'luxury' ? 'rgba(198, 168, 75, 0.15)' :
    $tier === 'premium' ? 'rgba(139, 92, 246, 0.15)' :
    $tier === 'mid' ? 'rgba(96, 192, 240, 0.15)' :
    'rgba(224, 236, 244, 0.08)'};
  border: 1px solid ${({ $tier }) =>
    $tier === 'luxury' ? 'rgba(198, 168, 75, 0.4)' :
    $tier === 'premium' ? 'rgba(139, 92, 246, 0.4)' :
    $tier === 'mid' ? 'rgba(96, 192, 240, 0.3)' :
    'rgba(224, 236, 244, 0.15)'};
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: ${({ $tier }) =>
    $tier === 'luxury' ? '#C6A84B' :
    $tier === 'premium' ? '#8B5CF6' :
    $tier === 'mid' ? '#60C0F0' :
    'rgba(224, 236, 244, 0.85)'};
`;

const RoomNav = styled.div`
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-bottom: 20px;
`;

const RoomBtn = styled.button<{ $active: boolean }>`
  min-height: 44px;
  padding: 10px 20px;
  border-radius: 10px;
  border: 2px solid ${({ $active }) => $active ? 'var(--accent-primary, #60C0F0)' : 'transparent'};
  background: ${({ $active }) => $active ? 'rgba(96, 192, 240, 0.1)' : 'var(--bg-elevated, #141419)'};
  color: ${({ $active }) => $active ? 'var(--accent-primary, #60C0F0)' : 'var(--text-secondary, rgba(224, 236, 244, 0.85))'};
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s;

  &:hover { border-color: var(--accent-primary, #60C0F0); }
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
  border: 1px solid rgba(96, 192, 240, 0.12);
`;

const FurnitureSlot = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary, rgba(224, 236, 244, 0.85));
  margin-bottom: 4px;
`;

const FurnitureItem = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 13px;
  color: var(--accent-primary, #60C0F0);
`;

const SetupHint = styled.div`
  text-align: center;
  padding: 16px;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.85));
  border-radius: 10px;
  background: rgba(139, 92, 246, 0.06);
  border: 1px solid rgba(139, 92, 246, 0.15);
`;

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
  const currentRoom = ROOMS.find(r => r.id === activeRoom) || ROOMS[0];
  const roomFurniture = furniture?.[activeRoom] || {};

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
            3D environment loads when @react-three/fiber is installed.
            <br />
            WebGPU renderer for 60fps on mobile.
          </SceneHint>
          <SetupHint>
            <Sparkles size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            Install React Three Fiber to enable the full 3D experience:
            <br />
            <code style={{ fontFamily: 'Fira Code, monospace', fontSize: 12, color: '#8B5CF6' }}>
              npm install @react-three/fiber @react-three/drei three
            </code>
          </SetupHint>
        </SceneOverlay>
      </SceneContainer>

      <RoomNav>
        {ROOMS.map(room => (
          <RoomBtn
            key={room.id}
            $active={activeRoom === room.id}
            onClick={() => onRoomChange(room.id)}
          >
            {room.icon} {room.label}
          </RoomBtn>
        ))}
      </RoomNav>

      <FurnitureGrid>
        {Object.entries(roomFurniture).map(([slot, item]) => (
          <FurnitureCard key={slot}>
            <FurnitureSlot>{formatItem(slot)}</FurnitureSlot>
            <FurnitureItem>{formatItem(item)}</FurnitureItem>
          </FurnitureCard>
        ))}
      </FurnitureGrid>
    </Wrapper>
  );
};

export default HomeWorld;
