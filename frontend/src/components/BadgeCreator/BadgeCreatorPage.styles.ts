import styled, { css, keyframes } from 'styled-components';

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;
const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;
const focusRing = css`
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;
const shimmerAnimation = css`
  animation: ${shimmer} 2s ease-in-out infinite;
  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

export const PageWrapper = styled.div`
  padding: 24px;
  max-width: 1100px;
  margin: 0 auto;
`;
export const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
`;
export const Title = styled.h1`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
`;
export const CreditBadge = styled.div`
  padding: 6px 14px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent-gold, #C6A84B) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 28%, transparent);
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  color: var(--accent-gold, #C6A84B);
`;
export const ModeTabs = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
`;
export const ModeTab = styled.button<{ $active: boolean }>`
  min-height: 44px;
  padding: 10px 20px;
  border-radius: 10px;
  border: 2px solid ${({ $active }) => $active ? 'var(--accent-secondary, #8B5CF6)' : 'transparent'};
  background: ${({ $active }) => $active ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 14%, transparent)' : 'var(--bg-elevated, #141419)'};
  color: ${({ $active }) => $active ? 'var(--accent-secondary, #8B5CF6)' : 'var(--text-secondary, #B7C4CF)'};
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
  ${focusRing}
  &:hover:not(:disabled) { border-color: var(--accent-secondary, #8B5CF6); }
  &:disabled { opacity: 0.48; cursor: not-allowed; }
`;
export const StudioGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 24px;
  @media (max-width: 900px) { grid-template-columns: 1fr; }
`;
export const Card = styled.div`
  padding: 20px;
  border-radius: 16px;
  background: var(--bg-elevated, #141419);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent);
`;
export const Label = styled.label`
  display: block;
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary, #B7C4CF);
  margin-bottom: 6px;
`;
export const GroupLabel = styled.div`
  display: block;
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary, #B7C4CF);
  margin-bottom: 6px;
`;
export const TextArea = styled.textarea`
  width: 100%;
  min-height: 80px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent);
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  resize: vertical;
  outline: none;
  margin-bottom: 16px;
  transition: border-color 0.15s ease;
  ${focusRing}
  &:focus { border-color: var(--accent-secondary, #8B5CF6); }
  &::placeholder { color: color-mix(in srgb, var(--text-primary, #E0ECF4) 50%, transparent); }
`;
export const Input = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent);
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  outline: none;
  margin-bottom: 12px;
  transition: border-color 0.15s ease;
  ${focusRing}
  &:focus { border-color: var(--accent-secondary, #8B5CF6); }
`;
export const ActionBtn = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  min-height: 48px;
  padding: 12px 24px;
  border-radius: 10px;
  border: ${({ $variant }) => $variant === 'secondary' ? '1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent)' : 'none'};
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: opacity 0.15s ease;
  width: 100%;
  background: ${({ $variant }) => $variant === 'secondary' ? 'var(--bg-elevated, #141419)' : 'linear-gradient(135deg, var(--accent-primary, #60C0F0), var(--accent-secondary, #8B5CF6))'};
  color: ${({ $variant }) => $variant === 'secondary' ? 'var(--text-primary, #E0ECF4)' : 'var(--text-on-accent, #FFFFFF)'};
  ${focusRing}
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  &:hover:not(:disabled) { opacity: 0.9; }
`;
export const PreviewArea = styled.div`
  width: 100%;
  aspect-ratio: 1;
  max-width: 300px;
  margin: 0 auto 16px;
  border-radius: 16px;
  overflow: hidden;
  background: linear-gradient(135deg, var(--bg-base, #0A0A0F), var(--surface-primary, #002060), var(--bg-base, #0A0A0F));
  background-size: 200% 100%;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  img { width: 100%; height: 100%; object-fit: contain; }
`;
export const GeneratingOverlay = styled.div`
  ${shimmerAnimation}
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent), transparent);
  background-size: 200% 100%;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--accent-primary, #60C0F0);
  font-family: 'Sora', sans-serif;
  font-size: 14px;
`;
export const EmptyPreview = styled.div`
  color: var(--text-secondary, #B7C4CF);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  text-align: center;
  padding: 24px;
`;
export const RaritySelect = styled.select`
  width: 100%;
  min-height: 44px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent);
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  outline: none;
  margin-bottom: 12px;
  ${focusRing}
`;
export const StatusMsg = styled.div<{ $type: 'success' | 'error' }>`
  padding: 12px 16px;
  border-radius: 10px;
  margin-bottom: 16px;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: ${({ $type }) => $type === 'success' ? 'color-mix(in srgb, var(--success, #10B981) 12%, transparent)' : 'color-mix(in srgb, var(--error, #EF4444) 12%, transparent)'};
  border: 1px solid ${({ $type }) => $type === 'success' ? 'color-mix(in srgb, var(--success, #10B981) 30%, transparent)' : 'color-mix(in srgb, var(--error, #EF4444) 30%, transparent)'};
  color: ${({ $type }) => $type === 'success' ? 'var(--success, #10B981)' : 'var(--error, #EF4444)'};
`;
export const CreditZap = styled.span`
  display: inline-flex;
  vertical-align: middle;
  margin-right: 4px;
`;
export const SpinningRefresh = styled.span<{ $duration: string }>`
  display: inline-flex;
  animation: ${spin} ${({ $duration }) => $duration} linear infinite;
  svg { display: block; }
  @media (prefers-reduced-motion: reduce) { animation: none; }
`;
export const PreviewIcon = styled.span`
  display: inline-flex;
  margin-bottom: 8px;
  opacity: 0.4;
`;
export const ActionSpacing = styled.div`
  margin-top: 10px;
`;
