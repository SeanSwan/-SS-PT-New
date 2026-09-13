import React, { memo, useMemo } from 'react';
import { SpecialBadge } from './SpecialBadge';
import { formatStorePrice } from './storeCatalog';
import type { StoreItem } from './storeCatalog.types';
import { cssUrlValue, sanitizeImageUrl } from '../../../utils/imageUrl';
import {
  CardAction,
  PackageBody,
  PackageCardShell,
  PackageDescription,
  PackageFacts,
  PackageMedia,
  PackagePrice,
  PackageTitle,
  PriceLabel,
  PriceValue,
} from './PackageCard.styles';

export interface PackageCardProps {
  package: StoreItem;
  canViewPrices: boolean;
  canPurchase: boolean;
  isAdding: boolean;
  isCartBusy?: boolean;
  onAddToCart: (pkg: StoreItem) => void;
  onInquire?: (pkg: StoreItem) => void;
  activeSpecial?: StoreItem['activeSpecial'];
}

const sessionCopy = (pkg: StoreItem, activeSpecial?: StoreItem['activeSpecial']): string => {
  if (pkg.packageType === 'monthly') {
    const schedule = pkg.months && pkg.sessionsPerWeek
      ? `${pkg.months} months - ${pkg.sessionsPerWeek} sessions/week`
      : 'Schedule details unavailable';
    return pkg.totalSessions ? `${schedule} - ${pkg.totalSessions} total sessions` : schedule;
  }
  const sessions = pkg.sessions ?? pkg.totalSessions;
  return sessions
    ? `${sessions} session${sessions === 1 ? '' : 's'} included${activeSpecial?.bonusSessions ? ` + ${activeSpecial.bonusSessions} bonus training sessions` : ''}`
    : 'Session count unavailable';
};

const perSessionCopy = (pkg: StoreItem): string | null => (
  pkg.pricePerSession == null ? null : `${formatStorePrice(pkg.pricePerSession)}/session`
);

const PackageCard: React.FC<PackageCardProps> = memo(({
  package: pkg,
  canViewPrices,
  canPurchase,
  isAdding,
  isCartBusy = false,
  onAddToCart,
  onInquire,
  activeSpecial,
}) => {
  const isPriced = pkg.displayPrice != null;
  const safeImageUrl = sanitizeImageUrl(pkg.imageUrl);
  const imageCssValue = safeImageUrl ? cssUrlValue(safeImageUrl) : null;
  const canAdd = canViewPrices && canPurchase && isPriced && !isAdding && pkg.isActive !== false && Number.isInteger(pkg.id) && pkg.id > 0;
  const perSession = useMemo(() => perSessionCopy(pkg), [pkg]);
  const actionLabel = !canViewPrices && onInquire
    ? 'Ask About Pricing'
    : !canViewPrices
      ? 'Add to Cart'
    : isAdding
      ? 'Adding…'
      : canAdd
        ? 'Add to Cart'
          : pkg.isActive === false
          ? 'Unavailable'
          : !isPriced
            ? 'Price unavailable'
            : 'Sign in to purchase';
  const actionDisabled = isAdding || (isCartBusy && canViewPrices) || (!canAdd && !(Boolean(!canViewPrices && onInquire)));

  return (
    <PackageCardShell aria-label={`View details for ${pkg.name}`}>
      {activeSpecial && (
        <SpecialBadge name={activeSpecial.name} bonusSessions={activeSpecial.bonusSessions} endsAt={activeSpecial.endsAt} />
      )}
      <PackageMedia $imageUrl={imageCssValue} aria-hidden="true" />
      <PackageBody>
        <PackageTitle>{pkg.name}</PackageTitle>
        <PackageDescription>{pkg.description || 'Training details are being prepared.'}</PackageDescription>
        <PackageFacts aria-label="Package details">
          <span>{sessionCopy(pkg, activeSpecial)}</span>
          {perSession && <span>{perSession}</span>}
        </PackageFacts>
        <PackagePrice aria-live="polite">
          <PriceLabel>{canViewPrices ? 'Total Investment' : 'Price access'}</PriceLabel>
          <PriceValue>{canViewPrices ? formatStorePrice(pkg.displayPrice) : 'Pricing is by invitation — ask about this package below'}</PriceValue>
        </PackagePrice>
        <CardAction
          type="button"
          disabled={actionDisabled}
          aria-busy={isAdding}
          aria-label={actionLabel === 'Add to Cart' ? `Add ${pkg.name} to cart` : `${actionLabel} for ${pkg.name}`}
          onClick={() => {
            if (!canViewPrices && onInquire) onInquire(pkg);
            else if (canAdd && !isCartBusy) onAddToCart(pkg);
          }}
        >
          {actionLabel}
        </CardAction>
      </PackageBody>
    </PackageCardShell>
  );
});

PackageCard.displayName = 'PackageCard';
export default PackageCard;
