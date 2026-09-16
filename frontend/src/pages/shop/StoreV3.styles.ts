import styled from 'styled-components';

export const StoreContainer = styled.main`
  min-height: 100vh;
  overflow-x: hidden;
  background: radial-gradient(circle at 10% 0%, rgba(96,192,240,.08), transparent 28%), var(--bg-primary, #0A0A0F);
  color: var(--text-primary, #e0ecf4);
`;
export const StoreContent = styled.div`position: relative; z-index: 1;`;
export const AuthBanner = styled.div`display: flex; align-items: center; justify-content: center; min-height: 3rem; padding: .7rem 1rem; border-bottom: 1px solid rgba(198,168,75,.28); background: rgba(0,32,96,.9); color: var(--text-secondary, rgba(224,236,244,.86)); font-size: .86rem; text-align: center;`;
export const Hero = styled.section`display: grid; place-items: center; min-height: min(66vh, 680px); padding: 5rem 1rem 3.5rem; background: radial-gradient(circle at 50% 8%, rgba(198,168,75,.24), transparent 25%), radial-gradient(circle at 18% 42%, rgba(96,192,240,.14), transparent 24%), linear-gradient(145deg, rgba(0,32,96,.62), rgba(10,8,30,.82)), url("/images/parallax/store-hero-bg.png") center / cover; position: relative; overflow: hidden; text-align: center; &::before { content: ''; position: absolute; width: min(58vw, 38rem); aspect-ratio: 1; border: 1px solid rgba(198,168,75,.22); border-radius: 42% 58% 55% 45%; transform: rotate(-18deg); box-shadow: 0 0 5rem rgba(96,192,240,.12), inset 0 0 3rem rgba(198,168,75,.08); pointer-events: none; } &::after { content: ''; position: absolute; inset: 0; background: linear-gradient(115deg, transparent 42%, rgba(255,255,255,.08) 48%, transparent 54%); opacity: .28; pointer-events: none; @media (prefers-reduced-motion: reduce) { opacity: .14; } }`;
export const HeroInner = styled.div`position: relative; z-index: 2; display: grid; justify-items: center; gap: 1rem; width: min(100%, 760px);`;
export const HeroLogo = styled.img`width: clamp(5rem, 12vw, 8rem); max-width: 100%; border-radius: 50%; filter: drop-shadow(0 0 1.4rem rgba(198,168,75,.3));`;
export const HeroTitle = styled.h1`color: var(--text-heading, #E0ECF4); font-family: var(--font-drama, "Cormorant Garamond", Georgia, serif); font-size: clamp(2.5rem, 7vw, 5.7rem); line-height: .95; margin: 0; max-width: 12ch;`;
export const HeroSubtitle = styled.p`color: var(--text-secondary, rgba(224,236,244,.84)); font-size: clamp(1rem, 2vw, 1.2rem); line-height: 1.6; margin: 0; max-width: 58ch;`;
export const HeroActions = styled.div`display: flex; flex-wrap: wrap; justify-content: center; gap: .75rem; margin-top: .8rem;`;
export const StoreButton = styled.button<{ $secondary?: boolean }>`min-width: 44px; min-height: 48px; padding: .8rem 1.2rem; border: 1px solid ${({ $secondary }) => $secondary ? 'rgba(224,236,244,.28)' : 'var(--accent-primary, #60c0f0)'}; border-radius: 999px; background: ${({ $secondary }) => $secondary ? 'rgba(0,48,128,.26)' : 'linear-gradient(135deg,var(--accent-primary, #002060),var(--accent-purple, #493082))'}; color: var(--text-primary, #e0ecf4); cursor: pointer; font: inherit; font-weight: 800; &:focus-visible { outline: 2px solid var(--accent-gold, #c6a84b); outline-offset: 3px; } @media (max-width: 430px) { width: min(100%, 20rem); }`;
export const CatalogState = styled.section`display: grid; gap: .8rem; justify-items: center; min-height: 12rem; margin: 0 auto; padding: 3rem 1rem; text-align: center;`;
export const StateTitle = styled.h2`color: var(--text-heading, #e0ecf4); font-family: var(--font-drama, "Cormorant Garamond", Georgia, serif); font-size: clamp(1.8rem, 4vw, 3rem); margin: 0;`;
export const StateText = styled.p`color: var(--text-secondary, rgba(224,236,244,.78)); line-height: 1.6; margin: 0; max-width: 52ch;`;
export const CartStatus = styled.div`position: sticky; bottom: .8rem; z-index: 20; width: min(100% - 2rem, 34rem); margin: 0 auto 1rem; padding: .8rem 1rem; border: 1px solid rgba(198,168,75,.42); border-radius: .85rem; background: rgba(6,18,52,.95); color: var(--text-primary, #e0ecf4); box-shadow: 0 .8rem 2rem rgba(0,0,0,.28); text-align: center;`;
export const CheckoutMount = styled.div`scroll-margin-top: 5rem; padding: 1rem; @media (max-width: 768px) { padding-bottom: 5rem; }`;
export const ConsultationCta = styled.section`width: min(100% - 2rem, 760px); margin: 0 auto; padding: clamp(3rem, 7vw, 7rem) 0; text-align: center;`;
export const CtaHeading = styled.h2`color: var(--text-heading, #e0ecf4); font-family: var(--font-drama, "Cormorant Garamond", Georgia, serif); font-size: clamp(2rem, 5vw, 3.8rem); line-height: 1; margin: 0;`;
export const CtaText = styled.p`color: var(--text-secondary, rgba(224,236,244,.8)); font-size: 1rem; line-height: 1.7; margin: 1rem auto 1.5rem; max-width: 58ch;`;

export const CatalogScene = styled.div`position: relative; isolation: isolate; > section { position: relative; z-index: 1; }`;
