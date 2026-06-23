import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

export const LoadingWrapper = styled.div`
  display: flex;
  min-height: 50vh;
  align-items: center;
  justify-content: center;
`;

export const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 18%, transparent);
  border-top-color: var(--accent-primary, #60C0F0);
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

export const PageTitle = styled.h1`
  margin: 0 0 16px;
  color: var(--text-primary, #E0ECF4);
  font-size: 2.125rem;
  font-weight: 700;
`;

export const BodyText = styled.p`
  margin: 0 0 8px;
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 78%, transparent));
  font-size: 1rem;
  line-height: 1.6;
`;

export const DescriptionText = styled.p`
  margin: 0 0 24px;
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 62%, transparent));
  font-size: 0.875rem;
  line-height: 1.5;
`;

export const SectionTitle = styled.h2`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-size: 1.25rem;
  font-weight: 700;
`;

export const IntroBlock = styled.div`
  margin-bottom: 32px;
`;

export const TabBar = styled.div`
  display: flex;
  gap: 0;
  margin-bottom: 16px;
  overflow-x: auto;
  border-bottom: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 12%, transparent);
`;

export const TabButton = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border: 0;
  border-bottom: 2px solid ${({ $active }) => ($active ? 'var(--accent-primary, #60C0F0)' : 'transparent')};
  background: transparent;
  color: ${({ $active }) => ($active ? 'var(--accent-primary, #60C0F0)' : 'var(--text-secondary, #94A3B8)')};
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 600;
  white-space: nowrap;
  transition: color 0.2s ease, border-color 0.2s ease;

  &:hover {
    color: var(--text-primary, #E0ECF4);
  }
`;

export const TabContent = styled.div`
  padding: 24px 0;
`;

export const HeaderRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
`;

export const SearchWrapper = styled.div`
  position: relative;
  width: min(100%, 300px);
`;

export const SearchIcon = styled.div`
  position: absolute;
  top: 50%;
  left: 12px;
  display: flex;
  align-items: center;
  color: var(--text-muted, #64748B);
  transform: translateY(-50%);
`;

export const SearchInput = styled.input`
  width: 100%;
  min-height: 44px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 35%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 86%, transparent);
  color: var(--text-primary, #E0ECF4);
  padding: 8px 12px 8px 40px;
  font-size: 0.875rem;
  transition: border-color 0.2s ease;

  &::placeholder { color: var(--text-muted, #64748B); }
  &:focus { outline: none; border-color: var(--accent-primary, #60C0F0); }
`;

export const RpgPanelStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

export const RpgUnavailableState = styled.div`
  padding: 40px;
  text-align: center;
  color: var(--text-muted, #64748B);
  font-family: 'Plus Jakarta Sans', sans-serif;
`;

export const RpgLoadingState = styled.div`
  padding: 24px;
  text-align: center;
  color: var(--text-secondary, #94A3B8);
`;
