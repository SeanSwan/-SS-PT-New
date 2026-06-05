import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const TEXT_MUTED = 'var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 50%, transparent))';
const TEXT_FAINT = 'var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 40%, transparent))';

const methodStyles = {
  zelle: {
    background: 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent)',
    color: 'var(--accent-secondary, #8B5CF6)',
  },
  check: {
    background: 'color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent)',
    color: 'var(--accent-primary, #60C0F0)',
  },
  default: {
    background: 'color-mix(in srgb, var(--accent-gold, #C6A84B) 15%, transparent)',
    color: 'var(--accent-gold, #C6A84B)',
  },
};

const getMethodStyle = (method: string) =>
  methodStyles[method as keyof typeof methodStyles] ?? methodStyles.default;

export const WidgetCard = styled.div`
  background: color-mix(in srgb, var(--royal-depth, #003080) 45%, transparent);
  backdrop-filter: blur(20px) saturate(160%);
  border-radius: 20px;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 20%, transparent);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--text-primary, #E0ECF4) 5%, transparent),
    0 8px 32px color-mix(in srgb, var(--obsidian-black, #0A0A0F) 30%, transparent);
  margin-bottom: 24px;
  overflow: hidden;
`;

export const Header = styled.div`
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 5%, transparent);
`;

export const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--accent-gold, #C6A84B);
`;

export const Title = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
`;

export const Badge = styled.span`
  padding: 2px 8px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--accent-gold, #C6A84B) 20%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 30%, transparent);
  color: var(--accent-gold, #C6A84B);
  font-size: 0.7rem;
  font-weight: 700;
`;

export const RefreshBtn = styled.button`
  width: 44px;
  height: 44px;
  min-height: 44px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--text-primary, #E0ECF4) 4%, transparent);
  border: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 8%, transparent);
  color: ${TEXT_MUTED};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: color-mix(in srgb, var(--accent-gold, #C6A84B) 10%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  .spinning { animation: ${spin} 1s linear infinite; }
`;

export const EmptyState = styled.div`
  text-align: center;
  padding: 24px;
  color: ${TEXT_FAINT};
  font-size: 0.85rem;
`;

export const ErrorState = styled.div`
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  margin: 16px;
  min-height: 56px;
  padding: 12px 14px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--accent-gold, #C6A84B) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 24%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-size: 0.85rem;
`;

export const RetryBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 44px;
  padding: 0 12px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--royal-depth, #003080) 45%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 35%, transparent);
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 700;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const InlineError = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 16px 0;
  min-height: 44px;
  padding: 10px 12px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent-gold, #C6A84B) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 20%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-size: 0.8rem;
`;

export const OrderList = styled.div`
  padding: 8px 16px;
  max-height: 300px;
  overflow-y: auto;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, var(--accent-gold, #C6A84B) 30%, transparent);
    border-radius: 4px;
  }
`;

export const OrderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 10px;
  transition: all 0.2s;

  &:hover {
    background: color-mix(in srgb, var(--accent-gold, #C6A84B) 5%, transparent);
  }

  & + & {
    border-top: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 3%, transparent);
  }
`;

export const OrderInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

export const OrderNumber = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--accent-primary, #60C0F0);
  display: block;
`;

export const OrderMeta = styled.span`
  font-size: 0.72rem;
  color: ${TEXT_FAINT};
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
`;

export const MethodBadge = styled.span<{ $method: string }>`
  display: inline-block;
  padding: 1px 6px;
  border-radius: 6px;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  background: ${({ $method }) => getMethodStyle($method).background};
  color: ${({ $method }) => getMethodStyle($method).color};
`;

export const OrderAmount = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--accent-gold, #C6A84B);
  flex-shrink: 0;
`;

export const ConfirmBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--success, #22C55E) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--success, #22C55E) 20%, transparent);
  color: var(--success, #22C55E);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 44px;
  flex-shrink: 0;

  &:hover {
    background: color-mix(in srgb, var(--success, #22C55E) 20%, transparent);
    border-color: var(--success, #22C55E);
  }

  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;
