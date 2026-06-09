import React from 'react';
import { ShoppingCart } from 'lucide-react';
import styled, { css, keyframes } from 'styled-components';
interface StoreCartDockProps {
  isAuthenticated: boolean;
  cartItemCount: number;
  showPulse: boolean;
  onOpenCart: () => void;
}
const dockPulse = keyframes`
  0%, 100% {
    transform: translate3d(0, 0, 0) scale(1);
    box-shadow: 0 16px 34px color-mix(in srgb, var(--wing-purple, #8B5CF6) 28%, transparent);
  }
  50% {
    transform: translate3d(0, -3px, 0) scale(1.04);
    box-shadow: 0 18px 42px color-mix(in srgb, var(--accent-primary, #60C0F0) 34%, transparent);
  }
`;
const DockButton = styled.button<{ $pulse: boolean }>`
  position: fixed;
  right: max(1rem, env(safe-area-inset-right));
  bottom: max(5.25rem, calc(env(safe-area-inset-bottom) + 1rem));
  z-index: var(--z-fab, 1250);
  width: 64px;
  height: 64px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 34%, transparent);
  border-radius: 50%;
  background:
    linear-gradient(135deg, var(--midnight-sapphire, #002060), var(--wing-purple, #8B5CF6)),
    var(--midnight-sapphire, #002060);
  color: var(--text-primary, #E0ECF4);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 16px 34px color-mix(in srgb, var(--wing-purple, #8B5CF6) 24%, transparent);
  touch-action: manipulation;

  ${({ $pulse }) => $pulse && css`
    animation: ${dockPulse} 1.4s cubic-bezier(0.22, 1, 0.36, 1) infinite;
  `}
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 4px;
  }
  @media (hover: hover) {
    &:hover {
      transform: translate3d(0, -2px, 0);
      box-shadow: 0 20px 42px color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent);
    }
  }
  @media (max-width: 480px) {
    width: 58px;
    height: 58px;
  }
  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transition: none;
  }
`;
const CountBadge = styled.span`
  position: absolute;
  top: -7px;
  right: -7px;
  min-width: 26px;
  height: 26px;
  padding: 0 0.35rem;
  border-radius: 999px;
  border: 2px solid var(--midnight-sapphire, #002060);
  background: var(--accent-gold, #C6A84B);
  color: var(--bg-base, #0A0A0F);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 800;
  line-height: 1;
`;
const StoreCartDock: React.FC<StoreCartDockProps> = ({ isAuthenticated, cartItemCount, showPulse, onOpenCart }) => {
  if (!isAuthenticated) return null;
  const visibleCount = Math.max(0, cartItemCount || 0);
  const label = `View Cart (${visibleCount} ${visibleCount === 1 ? 'item' : 'items'})`;
  return (
    <DockButton
      type="button"
      $pulse={showPulse}
      aria-label={label}
      title={label}
      onClick={onOpenCart}
    >
      <ShoppingCart size={24} aria-hidden="true" strokeWidth={2.2} />
      {visibleCount > 0 && <CountBadge>{visibleCount > 99 ? '99+' : visibleCount}</CountBadge>}
    </DockButton>
  );
};
export default StoreCartDock;
