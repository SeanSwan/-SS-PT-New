/**
 * COMPONENT: MinimalistView
 * PURPOSE: 2D Avatar Home fallback for users who prefer a reduced visual surface.
 * PARENT: AvatarHomePage
 */

import React from 'react';
import styled from 'styled-components';
import { Bed, Dumbbell, Eye, Home, UtensilsCrossed, User } from 'lucide-react';

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 24px;
  max-width: 800px;
  margin: 0 auto;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    padding: 16px;
  }
`;

const Card = styled.div`
  padding: 20px;
  border-radius: 8px;
  background: var(--bg-elevated, #141419);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
`;

const CardTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin: 0 0 12px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Row = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent);
  font-family: 'Sora', sans-serif;
  font-size: 13px;

  &:last-child {
    border-bottom: none;
  }
`;

const Label = styled.span`
  color: var(--text-secondary, #A8B7C7);
`;

const Value = styled.span`
  font-family: 'Fira Code', monospace;
  color: var(--accent-primary, #60C0F0);
  font-size: 12px;
  text-align: right;
  overflow-wrap: anywhere;
`;

const ToggleWrap = styled.div`
  display: flex;
  justify-content: center;
  padding: 0 16px 24px;
`;

const ToggleBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
  color: var(--accent-primary, #60C0F0);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  }
`;

interface AvatarHomeData {
  avatarBodyType: string;
  avatarSkinTone: string;
  avatarHairStyle: string;
  avatarOutfit: string;
  homeTier: string;
  activeRoom: string;
  furniture: Record<string, Record<string, string>>;
}

interface MinimalistViewProps {
  data: AvatarHomeData;
  onToggle3D: () => void;
}

const formatItem = (value?: string) =>
  (value || 'not_set').replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());

const ROOM_ICONS: Record<string, React.ReactNode> = {
  bedroom: <Bed size={16} />,
  kitchen: <UtensilsCrossed size={16} />,
  training_room: <Dumbbell size={16} />,
};

const MinimalistView: React.FC<MinimalistViewProps> = ({ data, onToggle3D }) => (
  <>
    <Grid>
      <Card>
        <CardTitle><User size={16} /> Avatar</CardTitle>
        <Row><Label>Body Type</Label><Value>{formatItem(data.avatarBodyType)}</Value></Row>
        <Row><Label>Hair</Label><Value>{formatItem(data.avatarHairStyle)}</Value></Row>
        <Row><Label>Outfit</Label><Value>{formatItem(data.avatarOutfit)}</Value></Row>
      </Card>

      <Card>
        <CardTitle><Home size={16} /> Home - {formatItem(data.homeTier)}</CardTitle>
        <Row><Label>Active Room</Label><Value>{formatItem(data.activeRoom)}</Value></Row>
      </Card>

      {Object.entries(data.furniture || {}).map(([room, items]) => (
        <Card key={room}>
          <CardTitle>{ROOM_ICONS[room] || <Home size={16} />} {formatItem(room)}</CardTitle>
          {Object.entries(items).map(([slot, item]) => (
            <Row key={slot}>
              <Label>{formatItem(slot)}</Label>
              <Value>{formatItem(item)}</Value>
            </Row>
          ))}
        </Card>
      ))}
    </Grid>

    <ToggleWrap>
      <ToggleBtn type="button" onClick={onToggle3D}>
        <Eye size={14} aria-hidden="true" /> Switch to 3D View
      </ToggleBtn>
    </ToggleWrap>
  </>
);

export default MinimalistView;
