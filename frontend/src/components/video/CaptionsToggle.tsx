/**
 * CaptionsToggle — WebVTT captions on/off toggle for <video>
 * ============================================================
 * Works with the native <track> element on an HTML5 video player.
 */

import React, { useState, useCallback } from 'react';
import styled from 'styled-components';

const ToggleButton = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  min-height: 44px;
  min-width: 44px;
  border: 1px solid ${({ $active }) => ($active ? '#00ffff' : 'rgba(255,255,255,0.2)')};
  border-radius: 8px;
  background: ${({ $active }) => ($active ? 'rgba(0,255,255,0.15)' : 'rgba(255,255,255,0.05)')};
  color: ${({ $active }) => ($active ? '#00ffff' : 'rgba(255,255,255,0.7)')};
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(0, 255, 255, 0.1);
    border-color: rgba(0, 255, 255, 0.4);
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

interface CaptionsToggleProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  captionsUrl?: string;
  label?: string;
}

export const CaptionsToggle: React.FC<CaptionsToggleProps> = ({
  videoRef,
  captionsUrl,
  label = 'CC',
}) => {
  const [active, setActive] = useState(false);

  const toggle = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const tracks = video.textTracks;
    if (tracks.length === 0) return;

    const newMode = active ? 'hidden' : 'showing';
    for (let i = 0; i < tracks.length; i++) {
      tracks[i].mode = newMode;
    }
    setActive(!active);
  }, [active, videoRef]);

  if (!captionsUrl) return null;

  return (
    <ToggleButton $active={active} onClick={toggle} aria-label="Toggle captions">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" />
        <path d="M7 9h4M13 9h4M7 13h2M11 13h6" />
      </svg>
      {label}
    </ToggleButton>
  );
};

export default CaptionsToggle;
