/**
 * Gallery vNext — money/support modal composition. Every modal here is REUSED BIND-ONLY from
 * `pages/gallery/*` with the exact prop contract the shipped page passes (GalleryPage.tsx:2134-2170):
 * VIPConversionModal (in-gallery conversion — never a signup bounce), MessageModal, DonationModal,
 * ReferralModal (+ onReferralSubmitted → credits refresh), plus the vNext UpgradeModal (pricing parity).
 * The visitor email comes from React memory only (Kimi Q4 — never persisted).
 */
import DonationModal from '../gallery/DonationModal';
import MessageModal from '../gallery/MessageModal';
import ReferralModal from '../gallery/ReferralModal';
import VIPConversionModal from '../gallery/VIPConversionModal';
import { UpgradeModal } from './UpgradeModal';
import type { CreditPackage } from './gallery.types';

export interface GalleryVNextModalsProps {
  email: string;
  galleryToken: string;
  eventSlug: string;
  showUpgrade: boolean;
  showVip: boolean;
  showMessage: boolean;
  showDonation: boolean;
  showReferral: boolean;
  purchaseLoading: CreditPackage | null;
  onPurchase(pkg: CreditPackage): void;
  onCloseUpgrade(): void;
  /** upgrade→VIP chain (truth-locked): close pricing, open the in-gallery VIP modal */
  onUpgradeVip(): void;
  /** upgrade→referral chain (truth-locked): close pricing, open the referral modal */
  onUpgradeReferral(): void;
  onCloseVip(): void;
  onCloseMessage(): void;
  onCloseDonation(): void;
  onCloseReferral(): void;
  /** VIP activated / referral submitted → refresh the credit balance (parity with the shipped page) */
  onCreditsRefresh(): void;
}

export function GalleryVNextModals(props: GalleryVNextModalsProps) {
  const {
    email, galleryToken, eventSlug, showUpgrade, showVip, showMessage, showDonation, showReferral,
    purchaseLoading, onPurchase, onCloseUpgrade, onUpgradeVip, onUpgradeReferral,
    onCloseVip, onCloseMessage, onCloseDonation, onCloseReferral, onCreditsRefresh,
  } = props;

  return (
    <>
      <UpgradeModal
        isOpen={showUpgrade}
        purchaseLoading={purchaseLoading}
        onPurchase={onPurchase}
        onOpenVip={onUpgradeVip}
        onOpenReferral={onUpgradeReferral}
        onClose={onCloseUpgrade}
      />

      <VIPConversionModal
        isOpen={showVip}
        onClose={onCloseVip}
        email={email}
        eventSlug={eventSlug}
        galleryToken={galleryToken}
        onVipActivated={() => {
          onCreditsRefresh();
          onCloseVip();
        }}
      />

      <MessageModal
        isOpen={showMessage}
        onClose={onCloseMessage}
        email={email}
        galleryToken={galleryToken}
        eventSlug={eventSlug}
      />

      <DonationModal
        isOpen={showDonation}
        onClose={onCloseDonation}
        email={email}
        galleryToken={galleryToken}
        eventSlug={eventSlug}
      />

      <ReferralModal
        isOpen={showReferral}
        onClose={onCloseReferral}
        email={email}
        galleryToken={galleryToken}
        eventSlug={eventSlug}
        onReferralSubmitted={onCreditsRefresh}
      />
    </>
  );
}

export default GalleryVNextModals;
