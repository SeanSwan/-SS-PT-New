import styled from 'styled-components';
import { FROST, ICE_WING, MIDNIGHT, WING_PURPLE } from './VisitorGeoWidget.styles';

export const DetailPanel = styled.div`
  background: color-mix(in srgb, var(--surface-elevated, #003080) 52%, transparent);
  border-top: 1px solid color-mix(in srgb, ${WING_PURPLE} 18%, transparent);
  padding: 1rem;
`;

export const DetailHeader = styled.div`
  align-items: center;
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.75rem;
`;

export const DetailTitle = styled.h4`
  color: ${FROST};
  font-size: 0.95rem;
  letter-spacing: 0;
  margin: 0;
`;

export const CloseDetailBtn = styled.button`
  align-items: center;
  background: color-mix(in srgb, ${FROST} 6%, transparent);
  border: 1px solid color-mix(in srgb, ${FROST} 12%, transparent);
  border-radius: 10px;
  color: var(--text-secondary, #b8c7d8);
  cursor: pointer;
  display: inline-flex;
  height: 44px;
  justify-content: center;
  min-height: 44px;
  min-width: 44px;
  width: 44px;

  &:hover { background: color-mix(in srgb, ${WING_PURPLE} 16%, transparent); color: ${WING_PURPLE}; }
  &:focus-visible { outline: 2px solid ${ICE_WING}; outline-offset: 3px; }
`;

export const DetailContent = styled.div`
  display: grid;
  gap: 0.55rem;
`;

export const DetailRow = styled.div`
  display: grid;
  gap: 0.5rem;
  grid-template-columns: minmax(90px, 0.35fr) 1fr;
`;

export const DetailLabel = styled.span`
  color: var(--text-muted, #8a96a8);
  font-size: 0.78rem;
`;

export const DetailValue = styled.span`
  color: ${FROST};
  font-size: 0.84rem;
`;

export const PagesList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
`;

export const PageTag = styled.span`
  background: color-mix(in srgb, ${WING_PURPLE} 12%, transparent);
  border: 1px solid color-mix(in srgb, ${WING_PURPLE} 18%, transparent);
  border-radius: 999px;
  color: ${WING_PURPLE};
  font-size: 0.68rem;
  font-weight: 800;
  padding: 0.24rem 0.5rem;
`;

export const ModalOverlay = styled.div`
  align-items: center;
  background: color-mix(in srgb, #000000 74%, transparent);
  display: flex;
  inset: 0;
  justify-content: center;
  padding: 1rem;
  position: fixed;
  z-index: 9999;
`;

export const ModalContent = styled.div`
  background: linear-gradient(145deg, color-mix(in srgb, var(--surface-elevated, #003080) 84%, transparent), ${MIDNIGHT});
  border: 1px solid color-mix(in srgb, ${WING_PURPLE} 24%, transparent);
  border-radius: 20px;
  box-shadow: 0 24px 80px color-mix(in srgb, #000000 56%, transparent);
  max-height: 90vh;
  max-width: 1040px;
  overflow: hidden;
  width: min(96vw, 1040px);
`;

export const ModalHeader = styled.div`
  align-items: center;
  border-bottom: 1px solid color-mix(in srgb, ${FROST} 7%, transparent);
  display: flex;
  justify-content: space-between;
  padding: 1rem 1.25rem;
`;

export const ModalTitle = styled.h3`
  align-items: center;
  color: ${FROST};
  display: flex;
  font-size: 1rem;
  gap: 0.5rem;
  letter-spacing: 0;
  margin: 0;
`;

export const ModalBody = styled.div`
  display: grid;
  gap: 1rem;
  max-height: calc(90vh - 76px);
  overflow-y: auto;
  padding: 1rem;
`;

export const ModalSection = styled.section`
  display: grid;
  gap: 0.6rem;
`;

export const ModalSectionTitle = styled.h4`
  align-items: center;
  color: ${ICE_WING};
  display: flex;
  font-size: 0.9rem;
  gap: 0.5rem;
  letter-spacing: 0;
  margin: 0;
`;

export const ModalList = styled.div`
  display: grid;
  gap: 0.45rem;
`;

export const ModalRow = styled.button`
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: 12px;
  color: inherit;
  cursor: pointer;
  display: grid;
  gap: 0.75rem;
  grid-template-columns: auto 1fr auto;
  min-height: 56px;
  padding: 0.65rem;
  text-align: left;

  &:hover { background: color-mix(in srgb, ${WING_PURPLE} 10%, transparent); }
  &:focus-visible { outline: 2px solid ${ICE_WING}; outline-offset: 2px; }
`;

export const ModalRowInfo = styled.div`display: flex; flex-direction: column; gap: 0.2rem;`;
export const ModalRowMeta = styled.div`color: var(--text-muted, #8a96a8); font-size: 0.76rem;`;
export const ModalRowPages = styled.div`display: flex; flex-wrap: wrap; gap: 0.35rem; justify-content: flex-end;`;

export const PaginationRow = styled.div`
  align-items: center;
  border-top: 1px solid color-mix(in srgb, ${FROST} 7%, transparent);
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  padding-top: 0.75rem;
`;

export const PaginationBtn = styled.button`
  background: color-mix(in srgb, ${WING_PURPLE} 12%, transparent);
  border: 1px solid color-mix(in srgb, ${WING_PURPLE} 24%, transparent);
  border-radius: 10px;
  color: ${FROST};
  cursor: pointer;
  min-height: 44px;
  padding: 0.5rem 0.85rem;

  &:disabled { cursor: not-allowed; opacity: 0.5; }
  &:focus-visible { outline: 2px solid ${ICE_WING}; outline-offset: 3px; }
`;

export const PaginationInfo = styled.span`
  color: var(--text-muted, #8a96a8);
  font-size: 0.8rem;
`;
