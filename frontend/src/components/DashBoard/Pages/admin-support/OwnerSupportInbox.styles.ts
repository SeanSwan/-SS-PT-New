/**
 * FILE: OwnerSupportInbox.styles.ts
 * PURPOSE: Dense, calm C12 owner support command surface.
 */
import styled, { css } from 'styled-components';

export const Page = styled.main`
  display: grid;
  gap: 24px;
  min-height: 100%;
  padding: clamp(20px, 3vw, 36px);
  color: var(--frost-white, #E0ECF4);
  background: var(--bg-base, #030712);
`;

export const Header = styled.header`
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 20px;
  @media (max-width: 720px) { align-items: stretch; flex-direction: column; }
`;

export const Eyebrow = styled.p`
  margin: 0 0 8px;
  color: var(--gilded-fern, #C6A84B);
  font: 700 12px 'Sora', sans-serif;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`;

export const Title = styled.h1`
  margin: 0;
  font: 700 clamp(30px, 4vw, 48px)/1 'Plus Jakarta Sans', sans-serif;
`;

export const Copy = styled.p`
  max-width: 68ch;
  margin: 10px 0 0;
  color: var(--text-secondary, #B8C7D9);
  font: 400 15px/1.6 'Plus Jakarta Sans', sans-serif;
`;

export const Filters = styled.form`
  display: grid;
  grid-template-columns: minmax(180px, 2fr) repeat(2, minmax(140px, 1fr)) auto;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.16));
  border-radius: 16px;
  background: var(--carbon, #141419);
  @media (max-width: 900px) { grid-template-columns: 1fr 1fr; }
  @media (max-width: 560px) { grid-template-columns: 1fr; }
`;

export const FieldLabel = styled.label`
  display: grid;
  gap: 7px;
  color: var(--text-secondary, #B8C7D9);
  font: 650 12px 'Sora', sans-serif;
`;

const fieldCss = css`
  min-height: 44px;
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid var(--border-electric, rgba(96, 192, 240, 0.28));
  border-radius: 10px;
  color: var(--frost-white, #E0ECF4);
  background: var(--graphite, #1A1A24);
  font: 500 14px/1.5 'Plus Jakarta Sans', sans-serif;
  &:focus-visible { outline: 2px solid var(--wing-purple, #8B5CF6); outline-offset: 2px; }
`;

export const Input = styled.input`${fieldCss}`;
export const Select = styled.select`${fieldCss}`;
export const TextArea = styled.textarea`
  ${fieldCss}
  min-height: 92px;
  resize: vertical;
`;

export const Button = styled.button<{ $primary?: boolean }>`
  min-height: 44px;
  padding: 10px 16px;
  border: 1px solid ${({ $primary }) => $primary
    ? 'var(--ice-wing, #60C0F0)'
    : 'var(--border-electric, rgba(96, 192, 240, 0.3))'};
  border-radius: 10px;
  color: var(--frost-white, #E0ECF4);
  background: ${({ $primary }) => $primary
    ? 'var(--midnight-sapphire, #002060)'
    : 'transparent'};
  cursor: pointer;
  font: 700 14px 'Plus Jakarta Sans', sans-serif;
  &:focus-visible { outline: 2px solid var(--wing-purple, #8B5CF6); outline-offset: 2px; }
  &:disabled { opacity: 0.55; cursor: not-allowed; }
`;

export const Workspace = styled.div`
  display: grid;
  grid-template-columns: minmax(280px, 2fr) minmax(0, 5fr);
  gap: 20px;
  align-items: start;
  @media (max-width: 1024px) { grid-template-columns: 1fr; }
`;

export const Panel = styled.section`
  min-width: 0;
  padding: 20px;
  border: 1px solid var(--border-electric, rgba(96, 192, 240, 0.2));
  border-radius: 16px;
  background: var(--surface-sapphire, linear-gradient(135deg, rgba(0, 32, 96, 0.58), rgba(20, 20, 25, 0.78)));
`;

export const PanelTitle = styled.h2`
  margin: 0;
  font: 700 22px/1.25 'Plus Jakarta Sans', sans-serif;
`;

export const Queue = styled.ol`
  display: grid;
  gap: 10px;
  margin: 16px 0 0;
  padding: 0;
  list-style: none;
`;

export const QueueButton = styled.button<{ $active: boolean }>`
  display: grid;
  gap: 8px;
  min-height: 72px;
  width: 100%;
  padding: 14px;
  border: 1px solid ${({ $active }) => $active
    ? 'var(--gilded-fern, #C6A84B)'
    : 'var(--border-subtle, rgba(96, 192, 240, 0.16))'};
  border-radius: 12px;
  color: var(--frost-white, #E0ECF4);
  text-align: left;
  background: ${({ $active }) => $active
    ? 'var(--queue-active, rgba(0, 48, 128, 0.65))'
    : 'var(--carbon, #141419)'};
  cursor: pointer;
  &:focus-visible { outline: 2px solid var(--wing-purple, #8B5CF6); outline-offset: 2px; }
`;

export const Meta = styled.span`
  color: var(--text-muted, #91A2B6);
  font: 600 11px/1.4 'Sora', sans-serif;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

export const DetailHeader = styled.header`
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  @media (max-width: 640px) { flex-direction: column; }
`;

export const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  @media (max-width: 720px) { grid-template-columns: 1fr; }
`;

export const Fact = styled.div`
  padding: 14px;
  border-radius: 12px;
  background: var(--carbon, #141419);
  h3 { margin: 0 0 7px; color: var(--ice-wing, #60C0F0); font: 700 13px 'Sora', sans-serif; }
  p, ol, pre { margin: 0; color: var(--text-secondary, #B8C7D9); font: 400 14px/1.6 'Plus Jakarta Sans', sans-serif; white-space: pre-wrap; overflow-wrap: anywhere; }
`;

export const ActionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 20px;
  @media (max-width: 720px) { grid-template-columns: 1fr; }
`;

export const ActionCard = styled.div`
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.16));
  border-radius: 12px;
  background: var(--carbon, #141419);
`;

export const Alert = styled.div`
  padding: 12px 14px;
  border: 1px solid var(--danger-border, rgba(229, 72, 77, 0.5));
  border-radius: 10px;
  color: var(--danger-text, #F0938A);
  background: var(--danger-wash, rgba(229, 72, 77, 0.1));
  font: 600 14px/1.5 'Plus Jakarta Sans', sans-serif;
`;

export const Status = styled.p`
  margin: 0;
  color: var(--ice-wing, #60C0F0);
  font: 600 13px/1.5 'Plus Jakarta Sans', sans-serif;
`;
export const PaginationBar = styled.nav`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
  @media (max-width: 560px) {
    justify-content: stretch;
    ${Button} { flex: 1 1 130px; }
    ${Status} { order: -1; width: 100%; text-align: center; }
  }
`;

export const AuditList = styled.ol`
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
  li {
    display: grid;
    grid-template-columns: minmax(110px, auto) minmax(150px, auto) 1fr;
    gap: 10px;
    padding-top: 10px;
    border-top: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.16));
    color: var(--text-secondary, #B8C7D9);
    font: 500 13px/1.5 'Plus Jakarta Sans', sans-serif;
  }
  strong { color: var(--ice-wing, #60C0F0); text-transform: capitalize; }
  time { color: var(--text-muted, #91A2B6); }
  @media (max-width: 720px) { li { grid-template-columns: 1fr; } }
`;