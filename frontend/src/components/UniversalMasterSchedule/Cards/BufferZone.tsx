import React from 'react';
import styled from 'styled-components';

export interface BufferZoneProps {
  startTime: Date;
  durationMinutes: number;
  type: 'before' | 'after';
  pixelsPerHour: number;
}

const minutesToPixels = (minutes: number, pixelsPerHour: number) =>
  (minutes / 60) * pixelsPerHour;

const BufferZone: React.FC<BufferZoneProps> = ({
  startTime,
  durationMinutes,
  type,
  pixelsPerHour
}) => {
  const height = minutesToPixels(durationMinutes, pixelsPerHour);
  const label = `${durationMinutes} min buffer`;

  return (
    <ZoneContainer
      $height={height}
      $type={type}
      title={label}
      aria-label={label}
    >
      <ZoneLabel>{label}</ZoneLabel>
    </ZoneContainer>
  );
};

export default BufferZone;

const ZoneContainer = styled.div<{ $height: number; $type: 'before' | 'after' }>`
  height: ${({ $height }) => `${$height}px`};
  background: rgba(120, 81, 169, 0.15);
  border: 1px dashed rgba(120, 81, 169, 0.4);
  opacity: 0.7;
  pointer-events: none;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: ${({ $type }) => ($type === 'after' ? '0.35rem' : '0')};
  margin-bottom: ${({ $type }) => ($type === 'before' ? '0.35rem' : '0')};
`;

const ZoneLabel = styled.span`
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;
