import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import SectionVideoBackground from '../../components/ui/backgrounds/SectionVideoBackground';
import { VIDEO } from '../../config/videoAssets';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { CheckoutView } from '../../components/NewCheckout';
import OrientationForm from '../../components/OrientationForm/orientationForm';
import PricingInquiryModal from './components/PricingInquiryModal';
import YourSpecialCard from './components/YourSpecialCard';
import MembershipsSection from './components/MembershipsSection';
import PackagesGrid from './components/PackagesGrid';
import StoreCartDock from './components/StoreCartDock';
import StoreStory from './components/StoreStory';
import StoreSpotlight from './components/StoreSpotlight';
import StoreComparison from './components/StoreComparison';
import useCartDeepLink from './useCartDeepLink';
import useStorefrontCatalog from './useStorefrontCatalog';
import { isPhysicalProduct } from './components/storeCatalog';
import type { ProductVariant, StoreItem } from './components/storeCatalog.types';
import {
  AuthBanner, CartStatus, CatalogScene, CatalogState, ConsultationCta, CtaHeading, CtaText,
  CheckoutMount, Hero, HeroActions, HeroInner, HeroLogo, HeroSubtitle, HeroTitle,
  StateText, StateTitle, StoreButton, StoreContainer, StoreContent,
} from './StoreV3.styles';

const StoreV3: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { cart, addToCart, refreshCart } = useCart();
  const catalog = useStorefrontCatalog();
  const checkoutPanelRef = useRef<HTMLDivElement | null>(null);
  const pendingItem = useRef<number | null>(null);
  const [showOrientation, setShowOrientation] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [inquiryPackage, setInquiryPackage] = useState<StoreItem | null>(null);
  const [cartOutcome, setCartOutcome] = useState<string | null>(null);
  const [isAddingToCart, setIsAddingToCart] = useState<number | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const [motionPaused, setMotionPaused] = useState(false);
  const [deviceAllowsMotion] = useState(() => {
    if (typeof navigator === 'undefined') return false;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    return !connection?.saveData && !['slow-2g', '2g'].includes(connection?.effectiveType ?? '');
  });
  // The shared hook initializes false; check the browser preference on the
  // first render as well so reduced-motion users never start a media request.
  const motionAvailable = deviceAllowsMotion && !prefersReducedMotion
    && !(typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const motionEnabled = motionAvailable && !motionPaused;

  const canPurchase = isAuthenticated && Boolean(user);
  const scrollTo = useCallback((id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }, []);
  const openCart = useCallback(() => {
    setShowCart(true);
    window.requestAnimationFrame(() => {
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (typeof checkoutPanelRef.current?.scrollIntoView === 'function') checkoutPanelRef.current.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    });
  }, []);
  useCartDeepLink(isAuthenticated, openCart);

  const handleAddToCart = useCallback(async (item: StoreItem, variant?: ProductVariant | null) => {
    if (!canPurchase) {
      setCartOutcome('Sign in to purchase.');
      return;
    }
    if (!Number.isInteger(item.id) || item.id <= 0) {
      setCartOutcome('This item is not available yet.');
      return;
    }
    if (!isPhysicalProduct(item) && item.displayPrice == null) {
      setCartOutcome('This training package does not have a purchase price yet.');
      return;
    }
    if (pendingItem.current !== null) return;
    pendingItem.current = item.id;
    setIsAddingToCart(item.id);
    setCartOutcome(`Adding ${variant ? `${item.name} · ${variant.label}` : item.name}…`);
    try {
      await addToCart({ id: item.id, quantity: 1, productVariantId: variant?.id, name: variant ? `${item.name} - ${variant.label}` : item.name });
      setCartOutcome(`${item.name} is in your cart.`);
      try {
        await refreshCart();
      } catch {
        setCartOutcome(`${item.name} was added. Open your cart to confirm the latest contents.`);
      }
    } catch {
      setCartOutcome('We could not confirm that addition. Review your cart before trying again.');
    } finally {
      pendingItem.current = null;
      setIsAddingToCart(null);
    }
  }, [addToCart, canPurchase, refreshCart]);

  useEffect(() => {
    if (isAuthenticated && user?.id) void refreshCart();
  }, [isAuthenticated, refreshCart, user?.id]);

  const packagesReady = catalog.status === 'ready';
  const showCatalogState = catalog.status === 'loading' || catalog.status === 'error' || catalog.status === 'empty';

  return (
    <StoreContainer>
      {!isAuthenticated && <AuthBanner>Physical recovery products show their public price. Sign in to purchase, or ask about training access.</AuthBanner>}
      <StoreContent>
        <Hero>
          {motionEnabled && <SectionVideoBackground src={VIDEO.swans} fallbackGradient="transparent" overlayOpacity={0.45} />}
          <HeroInner>
            <HeroLogo src="/Logo.png" alt="SwanStudios" />
            <HeroTitle>Training with a clear next step.</HeroTitle>
            <HeroSubtitle>Explore the live training choices, understand the method, and choose the next conversation or purchase that fits your goals.</HeroSubtitle>
            <HeroActions>
              <StoreButton type="button" onClick={() => setShowOrientation(true)}>Book a consultation</StoreButton>
              <StoreButton type="button" $secondary onClick={() => scrollTo('packages-section')}>Explore packages</StoreButton>
            </HeroActions>
            {motionAvailable && <StoreButton type="button" $secondary onClick={() => setMotionPaused(paused => !paused)}>{motionPaused ? 'Play background motion' : 'Pause background motion'}</StoreButton>}
          </HeroInner>
        </Hero>

        <StoreStory />
        <YourSpecialCard />
        <MembershipsSection />

        {showCatalogState && (
          <CatalogState aria-live="polite" aria-busy={catalog.status === 'loading'}>
            <StateTitle>{catalog.status === 'loading' ? 'Opening the live catalog' : catalog.status === 'empty' ? 'No catalog items are available' : 'Failed to load packages'}</StateTitle>
            <StateText>{catalog.status === 'loading' ? 'Checking current choices and access.' : catalog.status === 'empty' ? 'The consultation and membership paths remain available while choices are being updated.' : "We couldn't load the training choices. Please try again, or start a consultation."}</StateText>
            {catalog.status === 'error' && <StoreButton type="button" onClick={catalog.retry}>Retry loading</StoreButton>}
          </CatalogState>
        )}

        {packagesReady && <>
          <StoreSpotlight items={catalog.items} canViewPrices={catalog.pricesVisible} canPurchase={canPurchase} isCartBusy={isAddingToCart !== null} onAddToCart={handleAddToCart} onInquire={setInquiryPackage} />
          <StoreComparison items={catalog.items} canViewPrices={catalog.pricesVisible} />
          <CatalogScene>
            {motionEnabled && <SectionVideoBackground src={VIDEO.swanGolden} overlayOpacity={0.7} />}
            <PackagesGrid packages={catalog.items} canViewPrices={catalog.pricesVisible} canPurchase={canPurchase} isAddingToCart={isAddingToCart} onAddToCart={handleAddToCart} onInquire={setInquiryPackage} />
          </CatalogScene>
        </>}

        <ConsultationCta>
          <CtaHeading>Have a question before you choose?</CtaHeading>
          <CtaText>Bring your schedule, current training context, and the commitment you are considering. We can clarify the options and help you choose a next step.</CtaText>
          <StoreButton type="button" onClick={() => setShowOrientation(true)}>Start a consultation</StoreButton>
        </ConsultationCta>
      </StoreContent>

      {cartOutcome && <CartStatus role="status" aria-live="polite">{cartOutcome}</CartStatus>}
      {!showCart && <StoreCartDock isAuthenticated={isAuthenticated} cartItemCount={cart?.itemCount || 0} showPulse={Boolean(cartOutcome?.includes('in your cart'))} onOpenCart={openCart} />}
      <AnimatePresence mode="wait">
        {showOrientation && <OrientationForm key="orientation-modal" onClose={() => setShowOrientation(false)} />}
        {showCart && <CheckoutMount ref={checkoutPanelRef}><CheckoutView onCancel={() => setShowCart(false)} onSuccess={() => { setShowCart(false); setCartOutcome('Checkout completed.'); }} /></CheckoutMount>}
        {inquiryPackage && <PricingInquiryModal key="pricing-inquiry-modal" package={inquiryPackage} prefillName={[user?.firstName, user?.lastName].filter(Boolean).join(' ')} prefillEmail={user?.email ?? ''} onClose={() => setInquiryPackage(null)} />}
      </AnimatePresence>
    </StoreContainer>
  );
};

export default StoreV3;
