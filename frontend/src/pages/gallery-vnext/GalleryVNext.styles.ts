/**
 * Gallery vNext — shell styles. Extracted from GalleryVNext.tsx to hold the orchestrator under the
 * 300-line cap (Rule 4 / LAW 9). Every color reads `var(--gallery-*)` from the token bridge — this file
 * contains ZERO raw hex (CI-enforced by check-token-discipline).
 */
import styled from 'styled-components';
import { EventCover } from './GalleryVNext.chrome.styles';

export const Shell = styled.main`
  min-height: 100dvh;
  background: var(--gallery-bg);
  color: var(--gallery-ink);
  padding: 0 var(--gallery-pad, 16px) 96px;
`;

export const Content = styled.div`
  max-width: 1600px;
  margin: 0 auto;
`;

export const Title = styled.h1`
  margin: 0 0 8px;
  font-family: var(--gallery-font-display);
  font-size: clamp(1.7rem, 4vw, 2.6rem);
  line-height: 1.1;
`;

export const Sub = styled.p`
  margin: 0;
  color: var(--gallery-ink-2);
  max-width: 60ch;
`;

export const EventList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
`;

export const EventCard = styled.button`
  position: relative;
  padding: 0;
  overflow: hidden;
  text-align: left;
  border-radius: var(--gallery-r-card, 12px);
  border: 1px solid var(--gallery-chrome-edge);
  background: var(--gallery-surface-1);
  color: var(--gallery-ink);
  cursor: pointer;
  box-shadow: var(--gallery-elev-1);

  /* Kimi b3: the chrome stays STILL; the photograph breathes inside its frame (scale-in-frame, transform-only).
     translateY+shadow-lift was the template-tell — removed. */
  &:hover ${EventCover}, &:focus-visible ${EventCover} {
    transform: scale(1.03);
  }

  @media (prefers-reduced-motion: reduce) {
    &:hover ${EventCover}, &:focus-visible ${EventCover} { transform: none; }
  }
`;

export const RetryBtn = styled.button`
  min-height: 44px;
  margin-left: 8px;
  padding: 0 14px;
  border-radius: 10px;
  border: 1px solid var(--gallery-line);
  background: var(--gallery-surface-2);
  color: var(--gallery-ink);
  cursor: pointer;
  font-size: 0.9rem;
`;

export const EventName = styled.span`
  display: block;
  font-weight: 600;
  margin-bottom: 4px;
`;

export const EventMeta = styled.span`
  display: block;
  color: var(--gallery-ink-2);
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
`;

export const GateWrap = styled.div`
  display: flex;
  justify-content: center;
  padding: 32px 0 48px;
`;

export const State = styled.p`
  margin: 12vh auto;
  text-align: center;
  color: var(--gallery-ink-2);
`;

