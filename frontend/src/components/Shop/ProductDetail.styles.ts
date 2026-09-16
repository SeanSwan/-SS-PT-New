import styled, { createGlobalStyle } from 'styled-components';

// The shop shell's overflow-x:hidden implicitly makes overflow-y:auto. Its
// full-height main then traps sticky positioning without actually scrolling.
// Clip only the detail route horizontally while keeping the document scroller.
export const ProductDetailViewport = createGlobalStyle`
  body:has([data-product-detail]), main:has([data-product-detail]) {
    overflow-x: clip; overflow-y: visible;
  }
`;

export const ProductDetailContainer = styled.section`
  padding: 2rem;
  margin-bottom: 2rem;
  border-radius: 15px;
  background: linear-gradient(145deg, rgba(20, 20, 40, 0.72), rgba(0, 32, 96, 0.42));
  border: 1px solid rgba(96, 192, 240, 0.18);
  backdrop-filter: blur(10px);
  @media (max-width: 768px) { padding: 1rem; margin-bottom: 1rem; }
`;

export const BackButton = styled.button`
  min-height: 44px;
  padding: 0.5rem 0;
  margin-bottom: 1.25rem;
  border: 0;
  background: transparent;
  color: rgba(224, 236, 244, 0.78);
  cursor: pointer;
  font: inherit;
  &:hover, &:focus-visible { color: var(--text-primary, #E0ECF4); }
  &:focus-visible { outline: 2px solid var(--accent-primary, #60c0f0); outline-offset: 3px; }
`;

export const ProductContent = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 1fr);
  gap: 2rem;
  padding-bottom: 1rem;
  @media (max-width: 768px) { grid-template-columns: 1fr; gap: 1.25rem; padding-bottom: 5.5rem; }
`;

export const ImageContainer = styled.div`
  min-height: 320px;
  height: clamp(300px, 42vw, 480px);
  position: relative;
  overflow: hidden;
  border-radius: 12px;
  background: linear-gradient(145deg, var(--surface-dark, #10152e), var(--accent-primary, #253863));
`;
export const ProductImage = styled.div`width: 100%; height: 100%; background-position: center; background-size: cover;`;
export const ImagePlaceholder = styled.div`display: grid; place-items: center; width: 100%; height: 100%; color: rgba(224, 236, 244, 0.62);`;
export const ThemeBadge = styled.span`position: absolute; top: 1rem; right: 1rem; padding: 0.35rem 0.75rem; border-radius: 999px; color: var(--text-primary, #e0ecf4); background: rgba(0, 32, 96, 0.72); border: 1px solid rgba(198, 168, 75, 0.42); text-transform: capitalize;`;
export const InfoContainer = styled.div`display: flex; flex-direction: column; min-width: 0;`;
export const ProductName = styled.h1`color: var(--text-primary, #e0ecf4); font-size: clamp(1.8rem, 4vw, 2.5rem); margin: 0 0 0.75rem;`;
export const ProductPrice = styled.div`color: var(--text-primary, #E0ECF4); font-size: 1.8rem; font-weight: 600; margin-bottom: 1rem;`;
export const UnavailablePrice = styled.span`color: rgba(224, 236, 244, 0.74); font-size: 1rem; font-weight: 400;`;
export const PriceDetails = styled.dl`display: grid; gap: 0.55rem; margin: 0 0 1.25rem; padding: 1rem; border-radius: 8px; background: rgba(30, 30, 60, 0.42);`;
export const PriceDetail = styled.div`display: flex; justify-content: space-between; gap: 1rem; color: rgba(224, 236, 244, 0.8); &:last-child { padding-top: 0.55rem; border-top: 1px solid rgba(255,255,255,0.12); }`;
export const ProductDescription = styled.p`color: rgba(224, 236, 244, 0.82); line-height: 1.6; white-space: pre-line;`;
export const FeaturesTitle = styled.h2`font-size: 1.1rem; color: var(--text-primary, #e0ecf4); margin: 0.75rem 0;`;
export const FeaturesList = styled.ul`margin: 0 0 1rem; padding-left: 1.25rem; color: rgba(224, 236, 244, 0.82); line-height: 1.7;`;
export const VariantField = styled.label`display: grid; gap: 0.5rem; margin: 0.75rem 0; color: rgba(224, 236, 244, 0.82); select { min-height: 44px; padding: 0.6rem; color: var(--text-primary, #e0ecf4); background: var(--surface-dark, #10152e); border: 1px solid rgba(96, 192, 240, 0.38); border-radius: 8px; }`;
export const InventoryMessage = styled.p`margin: 0.5rem 0; color: var(--accent-gold, #f6c177);`;
export const PurchasePanel = styled.div`position: sticky; top: calc(var(--header-height, 64px) + 1rem); z-index: 2; flex-shrink: 0; padding: 1rem; margin-bottom: 1rem; border-radius: 12px; background: var(--surface-dark, #10152e); border: 1px solid rgba(96, 192, 240, 0.3); box-shadow: 0 8px 24px rgba(0,0,0,0.25); @media (max-width: 768px) { padding: .65rem; top: calc(var(--header-height, 64px) + .5rem); }`;
export const CartActions = styled.div`display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; margin-top: .5rem;`;
export const QuantityControl = styled.div`display: flex; align-items: center; min-height: 44px; border: 1px solid rgba(96, 192, 240, 0.24); border-radius: 8px; overflow: hidden;`;
export const QuantityButton = styled.button`width: 44px; min-height: 44px; border: 0; color: var(--text-primary, #E0ECF4); background: transparent; cursor: pointer; font-size: 1.25rem; &:focus-visible { outline: 2px solid var(--accent-primary, #60c0f0); outline-offset: -2px; } &:disabled { opacity: 0.45; cursor: not-allowed; }`;
export const QuantityDisplay = styled.span`min-width: 2rem; text-align: center; color: var(--text-primary, #E0ECF4);`;
export const PurchaseButton = styled.button`flex: 1; min-height: 44px; padding: 0.7rem 1rem; border: 1px solid var(--accent-primary, #60c0f0); border-radius: 8px; color: var(--text-on-accent, #061221); background: var(--accent-primary, #60c0f0); font-weight: 700; cursor: pointer; &:focus-visible { outline: 2px solid var(--accent-gold, #c6a84b); outline-offset: 3px; } &:disabled { opacity: 0.5; cursor: not-allowed; }`;
export const InquiryButton = styled.button`min-height: 44px; width: 100%; padding: 0.7rem 1rem; border: 1px solid var(--accent-gold, #c6a84b); border-radius: 8px; color: var(--text-primary, #e0ecf4); background: transparent; cursor: pointer; &:focus-visible { outline: 2px solid var(--accent-primary, #60c0f0); outline-offset: 3px; }`;
export const ErrorMessage = styled.div`padding: 1rem; border-radius: 8px; color: var(--accent-error, #ffb4c5); background: rgba(224, 36, 94, 0.12); border: 1px solid rgba(224, 36, 94, 0.3);`;
export const LoadingSpinner = styled.div`width: 30px; height: 30px; margin: 2rem auto; border: 4px solid rgba(255,255,255,0.25); border-top-color: var(--accent-primary, #60c0f0); border-radius: 50%; animation: spin 1s linear infinite; @keyframes spin { to { transform: rotate(360deg); } } @media (prefers-reduced-motion: reduce) { animation: none; }`;
