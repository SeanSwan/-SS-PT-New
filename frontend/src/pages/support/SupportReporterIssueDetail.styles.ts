/** Reporter-visible support detail and conversation styles. */
import styled from 'styled-components';

export const Detail = styled.section`
  display: grid;
  gap: 16px;
  margin-top: 18px;
  padding: 18px;
  border: 1px solid var(--border-electric, rgba(96, 192, 240, 0.28));
  border-radius: 16px;
  background: var(--carbon, #141419);
`;

export const DetailHeader = styled.header`
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 12px;
`;

export const DetailTitle = styled.h3`
  margin: 0;
  color: var(--frost-white, #E0ECF4);
  font: 700 18px/1.35 'Plus Jakarta Sans', sans-serif;
`;

export const CloseButton = styled.button`
  min-width: 44px;
  min-height: 44px;
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.2));
  border-radius: 10px;
  color: var(--frost-white, #E0ECF4);
  background: transparent;
  cursor: pointer;
  &:focus-visible { outline: 2px solid var(--wing-purple, #8B5CF6); outline-offset: 2px; }
`;

export const Conversation = styled.ol`
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
`;

export const Message = styled.li`
  padding: 12px 14px;
  border-left: 3px solid var(--ice-wing, #60C0F0);
  border-radius: 8px;
  background: var(--graphite, #1A1A24);
  p { margin: 5px 0 0; color: var(--text-secondary, #B8C7D9); font: 400 14px/1.55 'Plus Jakarta Sans', sans-serif; }
`;

export const MessageMeta = styled.span`
  color: var(--gilded-fern, #C6A84B);
  font: 700 11px 'Sora', sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

export const ReplyLabel = styled.label`
  display: grid;
  gap: 8px;
  color: var(--frost-white, #E0ECF4);
  font: 650 14px 'Plus Jakarta Sans', sans-serif;
`;

export const ReplyArea = styled.textarea`
  min-height: 96px;
  width: 100%;
  box-sizing: border-box;
  padding: 12px;
  border: 1px solid var(--border-electric, rgba(96, 192, 240, 0.3));
  border-radius: 10px;
  color: var(--frost-white, #E0ECF4);
  background: var(--obsidian-black, #0A0A0F);
  font: 400 16px/1.5 'Plus Jakarta Sans', sans-serif;
  resize: vertical;
  &:focus-visible { outline: 2px solid var(--wing-purple, #8B5CF6); outline-offset: 2px; }
`;

export const ReplyButton = styled.button`
  min-height: 44px;
  width: fit-content;
  padding: 10px 16px;
  border: 1px solid var(--ice-wing, #60C0F0);
  border-radius: 10px;
  color: var(--frost-white, #E0ECF4);
  background: var(--midnight-sapphire, #002060);
  cursor: pointer;
  font: 700 14px 'Plus Jakarta Sans', sans-serif;
  &:focus-visible { outline: 2px solid var(--wing-purple, #8B5CF6); outline-offset: 2px; }
  &:disabled { opacity: 0.55; cursor: not-allowed; }
`;
