/**
 * ShoppingCartItem.tsx — Crystalline cart line-item card
 * =======================================================
 * One cart row for the header-mounted cart modal: name, session breakdown,
 * price, 44px quantity stepper, and remove control.
 * Styles live in ShoppingCartItem.styles.ts; modal chrome in ShoppingCart.styles.ts.
 */
import React from 'react';
import { type Variants } from 'framer-motion';
import { Dumbbell, X } from 'lucide-react';
import { SmartTooltip } from '../AdvancedCartInteractions';
import {
  CartItemContainer,
  ItemLayout,
  ItemDetails,
  ItemName,
  ItemDescription,
  SessionInfo,
  PriceContainer,
  ItemPrice,
  QuantityControls,
  QuantityButton,
  QuantityValue,
  RemoveButton
} from './ShoppingCartItem.styles';

export interface CartLineItem {
  id: number;
  quantity: number;
  price: number;
  storefrontItemId: number;
  storefrontItem?: {
    name?: string;
    description?: string;
    sessions?: number;
    totalSessions?: number;
    packageType?: string;
  } | null;
  productVariant?: { label?: string } | null;
}

const buildSessionDetails = (item: CartLineItem, itemSessions: number): string => {
  const packageType = item.storefrontItem?.packageType || 'unknown';
  if (itemSessions <= 0) {
    return item.storefrontItem?.description || 'Premium training package';
  }
  if (packageType === 'fixed') {
    return `Personal training package with ${itemSessions} session${itemSessions !== 1 ? 's' : ''} per package`;
  }
  if (packageType === 'monthly') {
    return `Monthly training package with ${itemSessions} sessions included`;
  }
  return `Training package with ${itemSessions} session${itemSessions !== 1 ? 's' : ''}`;
};

interface ShoppingCartItemProps {
  item: CartLineItem;
  variants: Variants;
  formatPrice: (price: number | undefined) => string;
  onUpdateQuantity: (itemId: number, quantity: number) => void;
  onRemove: (itemId: number) => void;
}

const ShoppingCartItem: React.FC<ShoppingCartItemProps> = ({
  item, variants, formatPrice, onUpdateQuantity, onRemove
}) => {
  const storefrontItem = item.storefrontItem;
  const itemSessions = storefrontItem?.sessions || storefrontItem?.totalSessions || 0;
  const hasSessionData = itemSessions > 0;
  const packageType = storefrontItem?.packageType || 'unknown';
  const displayName = `${storefrontItem?.name || `Package #${item.storefrontItemId}`}${item.productVariant?.label ? ` - ${item.productVariant.label}` : ''}`;

  return (
    <CartItemContainer variants={variants} initial="hidden" animate="visible" exit="exit">
      <ItemLayout>
        <ItemDetails>
          <ItemName>{displayName}</ItemName>
          <ItemDescription>{buildSessionDetails(item, itemSessions)}</ItemDescription>
          {hasSessionData && (
            <SessionInfo>
              <div className="session-count">
                <Dumbbell size={16} aria-hidden="true" />
                {itemSessions * item.quantity} Total Sessions
              </div>
              <div className="session-details">
                <SmartTooltip content="Price per individual training session">
                  <span className="hint">${(item.price / itemSessions).toFixed(0)} per session</span>
                </SmartTooltip>
                {' • '}
                <SmartTooltip content={`This is a ${packageType === 'monthly' ? 'monthly subscription' : 'one-time purchase'} package`}>
                  <span className="hint">{packageType === 'monthly' ? 'Monthly' : 'Fixed'} Package</span>
                </SmartTooltip>
              </div>
            </SessionInfo>
          )}
        </ItemDetails>
        <PriceContainer>
          <ItemPrice>
            ${formatPrice(item.price * item.quantity)}
            <span className="unit-price">
              {item.quantity > 1 ? `${item.quantity}× ${formatPrice(item.price)} each` : ''}
            </span>
          </ItemPrice>
          <QuantityControls>
            <QuantityButton
              onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
              disabled={item.quantity <= 1}
              aria-label="Decrease quantity"
            >
              −
            </QuantityButton>
            <QuantityValue aria-live="polite">{item.quantity}</QuantityValue>
            <QuantityButton
              onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
              aria-label="Increase quantity"
            >
              +
            </QuantityButton>
          </QuantityControls>
        </PriceContainer>
      </ItemLayout>
      <RemoveButton
        onClick={() => onRemove(item.id)}
        aria-label={`Remove ${storefrontItem?.name || 'item'} from cart`}
      >
        <X size={18} aria-hidden="true" />
      </RemoveButton>
    </CartItemContainer>
  );
};

export default ShoppingCartItem;
