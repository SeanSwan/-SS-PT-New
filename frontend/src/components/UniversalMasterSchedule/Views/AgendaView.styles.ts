import styled from 'styled-components';
import { AGENDA_VIEW_THEME } from './AgendaView.logic';

export const AgendaContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;

  @media (max-width: 768px) {
    gap: 1.25rem;
  }

  @media (max-width: 480px) {
    gap: 1rem;
  }
`;

export const AgendaGroup = styled.section`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

export const GroupLabel = styled.div`
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: ${AGENDA_VIEW_THEME.textSoft};

  @media (max-width: 768px) {
    font-size: 0.8rem;
    letter-spacing: 0.08em;
  }

  @media (max-width: 480px) {
    font-size: 0.75rem;
  }
`;

export const GroupList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

export const AgendaRow = styled.div`
  display: grid;
  grid-template-columns: 90px 1fr 180px;
  gap: 1rem;
  padding: 0.9rem 1rem;
  border-radius: 14px;
  background: ${AGENDA_VIEW_THEME.surface};
  border: 1px solid ${AGENDA_VIEW_THEME.border};
  transition: all 150ms ease-out;
  cursor: pointer;

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${AGENDA_VIEW_THEME.activeGlow};
  }

  &:active {
    transform: scale(0.99);
  }

  &:focus-visible {
    outline: 2px solid ${AGENDA_VIEW_THEME.primary};
    outline-offset: 2px;
  }

  @media (max-width: 1024px) {
    grid-template-columns: 80px 1fr 150px;
    gap: 0.75rem;
    padding: 0.75rem;
    border-radius: 12px;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 0.5rem;
    padding: 0.75rem;
  }

  @media (max-width: 480px) {
    padding: 0.625rem;
    border-radius: 10px;
  }
`;

export const TimeBlock = styled.div`
  font-weight: 600;
  color: ${AGENDA_VIEW_THEME.primary};
  font-size: 0.95rem;
`;

export const DetailsBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

export const RowTitle = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: ${AGENDA_VIEW_THEME.text};
`;

export const RowMeta = styled.div`
  font-size: 0.8rem;
  color: ${AGENDA_VIEW_THEME.textSoft};
`;

export const StatusBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: flex-end;
  justify-content: center;

  @media (max-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
`;

export const StatusBadge = styled.div<{ $status: string }>`
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  background: ${({ $status }) => {
    if ($status === 'blocked') return `color-mix(in srgb, ${AGENDA_VIEW_THEME.secondary} 26%, transparent)`;
    if ($status === 'confirmed') return `color-mix(in srgb, ${AGENDA_VIEW_THEME.success} 20%, transparent)`;
    if ($status === 'completed') return `color-mix(in srgb, ${AGENDA_VIEW_THEME.completed} 20%, transparent)`;
    if ($status === 'cancelled') return `color-mix(in srgb, ${AGENDA_VIEW_THEME.danger} 20%, transparent)`;
    return `color-mix(in srgb, ${AGENDA_VIEW_THEME.secondary} 20%, transparent)`;
  }};
  color: ${AGENDA_VIEW_THEME.text};
  border: 1px solid ${AGENDA_VIEW_THEME.border};
`;

export const ActionRow = styled.div`
  display: flex;
  gap: 0.5rem;
`;

export const ActionButton = styled.button`
  border: 1px solid ${AGENDA_VIEW_THEME.border};
  background: transparent;
  color: ${AGENDA_VIEW_THEME.text};
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 150ms ease-out;
  min-height: 44px;

  &:hover {
    border-color: ${AGENDA_VIEW_THEME.primary};
    box-shadow: ${AGENDA_VIEW_THEME.activeGlow};
  }

  &:active {
    transform: scale(0.96);
  }

  &:focus-visible {
    outline: 2px solid ${AGENDA_VIEW_THEME.primary};
    outline-offset: 2px;
  }

  @media (max-width: 480px) {
    padding: 0.35rem 0.75rem;
    font-size: 0.75rem;
  }
`;

export const EmptyState = styled.div`
  padding: 2rem;
  border-radius: 16px;
  border: 1px dashed ${AGENDA_VIEW_THEME.border};
  text-align: center;
  color: ${AGENDA_VIEW_THEME.textSoft};
`;
