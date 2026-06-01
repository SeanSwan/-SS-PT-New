import styled from 'styled-components';

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 72%, transparent);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1300;
  padding: 1rem;
`;

export const ModalPanel = styled.div`
  background: linear-gradient(135deg, var(--bg-surface, #1A1A24), var(--bg-base, #0A0A0F));
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  border-radius: 16px;
  width: 100%;
  max-width: 640px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 12px 48px color-mix(in srgb, var(--primary, #002060) 52%, transparent);
`;

export const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent);
`;

export const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

export const HeaderAccentIcon = styled.span`
  display: inline-flex;
  color: var(--accent-primary, #60C0F0);
`;

export const ModalTitle = styled.h2`
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
`;

export const CloseBtn = styled.button`
  background: transparent;
  border: 0;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 55%, transparent);
  font-size: 1.5rem;
  cursor: pointer;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;

  &:hover {
    color: var(--text-primary, #E0ECF4);
    background: color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent);
  }
`;

export const ModalBody = styled.div`
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
`;

export const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 7%, transparent);
  flex-wrap: wrap;
`;

export const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.25rem;

  @media (max-width: 500px) {
    grid-template-columns: 1fr;
  }
`;

export const InfoItem = styled.div``;

export const InfoLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 60%, transparent);
  margin-bottom: 4px;
`;

export const InfoValue = styled.div`
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--text-primary, #E0ECF4);
`;

export const PersonRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0.75rem;
  background: color-mix(in srgb, var(--text-primary, #E0ECF4) 4%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  border-radius: 10px;
  margin-bottom: 1rem;
`;

export const PersonAvatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 22%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-secondary, #8B5CF6);
  font-weight: 700;
  font-size: 0.85rem;
  overflow: hidden;
  flex: 0 0 auto;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

export const PersonInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

export const PersonName = styled.div`
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

export const PersonEmail = styled.div`
  font-size: 0.8rem;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 52%, transparent);
  overflow-wrap: anywhere;
`;

export const SessionsBadge = styled.span`
  padding: 4px 10px;
  border-radius: 20px;
  border: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 20%, transparent);
  font-size: 0.75rem;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 68%, transparent);
  white-space: nowrap;
`;

export const NotesSection = styled.div`
  margin-bottom: 1rem;
`;

export const NotesBox = styled.div`
  padding: 0.75rem;
  background: color-mix(in srgb, var(--text-primary, #E0ECF4) 4%, transparent);
  border: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 9%, transparent);
  border-radius: 8px;
  color: var(--text-primary, #E0ECF4);
  font-size: 0.875rem;
  white-space: pre-wrap;
  min-height: 40px;
`;
