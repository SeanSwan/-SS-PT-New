/**
 * ShoppingCartFooter.tsx — cart order summary + action row
 * ==========================================================
 * Sticky footer for the cart modal: subtotal/items/sessions rows, the
 * gilded total, and the Clear Cart / Secure Checkout actions.
 * Rendered by ShoppingCart.tsx only when the cart has items.
 */
import React from 'react';
import { type Variants } from 'framer-motion';
import GlowButton from '../ui/buttons/GlowButton';
import { SmartTooltip } from '../AdvancedCartInteractions';
import { CartFooter } from './ShoppingCart.styles';
import {
  CartSummary,
  SummaryRow,
  SummaryLabel,
  SummaryValue,
  ButtonsContainer
} from './ShoppingCart.summaryStyles';

interface ShoppingCartFooterProps {
  total: number | undefined;
  itemCount: number;
  totalSessions: number;
  variants: Variants;
  formatPrice: (price: number | undefined) => string;
  onClearCart: () => void;
  onCheckout: () => void;
}

const ShoppingCartFooter: React.FC<ShoppingCartFooterProps> = ({
  total, itemCount, totalSessions, variants, formatPrice, onClearCart, onCheckout
}) => (
  <CartFooter variants={variants}>
    <CartSummary>
      <SummaryRow>
        <SummaryLabel>Subtotal</SummaryLabel>
        <SummaryValue>${formatPrice(total)}</SummaryValue>
      </SummaryRow>
      <SummaryRow>
        <SummaryLabel>Items</SummaryLabel>
        <SummaryValue>
          {itemCount} package{itemCount !== 1 ? 's' : ''}
        </SummaryValue>
      </SummaryRow>
      {totalSessions > 0 && (
        <SummaryRow className="sessions">
          <SummaryLabel>Total Sessions</SummaryLabel>
          <SummaryValue $accent>{totalSessions}</SummaryValue>
        </SummaryRow>
      )}
      <SummaryRow className="total">
        <SummaryLabel>Total</SummaryLabel>
        <SummaryValue className="total-value">${formatPrice(total)}</SummaryValue>
      </SummaryRow>
    </CartSummary>

    <ButtonsContainer>
      <SmartTooltip content="Remove all items from cart">
        <GlowButton
          text="Clear Cart"
          theme="ruby"
          size="medium"
          onClick={onClearCart}
        />
      </SmartTooltip>
      <SmartTooltip content="Proceed to secure Stripe checkout">
        <GlowButton
          text="Secure Checkout"
          theme="emerald"
          size="large"
          onClick={onCheckout}
        />
      </SmartTooltip>
    </ButtonsContainer>
  </CartFooter>
);

export default ShoppingCartFooter;
