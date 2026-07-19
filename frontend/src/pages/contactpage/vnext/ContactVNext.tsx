/**
 * Contact V-next — orchestrator. Renders THROUGH the lens frame (so `--world-*`/`--lens-*` resolve +
 * `[data-style-lens-shell]` exists for the gate's contract check) + the `.contact-vnext-shell` token scope.
 * The signature is the Crystallize Submit inside ContactForm (the page's one emotional peak). The form POST
 * is BIND-ONLY (same /api/contact via resolveContactApiBase — the pipeline is untouched). Conversion core:
 * heading + form + contact methods. [Deferred, additive: the V3 FAQ accordion — secondary content, not the
 * signature; a follow-up port, tracked. Flag-off users keep the full V3 FAQ meanwhile.]
 */
import styled from 'styled-components';
import SeoHead from '../../../components/seo/SeoHead';
import { ContactLensFrame } from './contactManifest';
import { ContactVNextTokens } from './contact.tokens';
import { ContactForm } from './ContactForm';

const Main = styled.main`
  position: relative;
  min-height: 100vh;
  background: radial-gradient(120% 80% at 50% 0%, var(--contact-ice-soft), var(--contact-bg) 62%);
  color: var(--contact-ink);
  padding: clamp(40px, 8vh, 96px) var(--contact-pad, 24px) 80px;
`;
const Inner = styled.div`
  max-width: 1040px;
  margin: 0 auto;
  display: grid;
  gap: clamp(24px, 5vw, 48px);
  @media (min-width: 900px) {
    grid-template-columns: 1fr 1fr;
    align-items: start;
  }
`;
const Intro = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 460px;
`;
const Kicker = styled.span`
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--contact-ice);
`;
const Title = styled.h1`
  margin: 0;
  font: 800 clamp(30px, 6vw, 52px) / 1.04 var(--contact-font-display, inherit);
  color: var(--contact-ink);
`;
const Sub = styled.p`
  margin: 0;
  font-size: clamp(15px, 2.2vw, 18px);
  color: var(--contact-ink-2);
`;
const Methods = styled.dl`
  margin: 8px 0 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;
const Method = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: var(--contact-target, 44px);
  color: var(--contact-ink);
  text-decoration: none;
  font-size: 15px;
  &:hover {
    color: var(--contact-ice);
  }
`;

export default function ContactVNext() {
  return (
    <ContactLensFrame>
      <ContactVNextTokens />
      <div className="contact-vnext-shell" data-testid="contact-vnext-root">
        <Main>
          <SeoHead
            title="Contact SwanStudios | Get in touch"
            description="Reach the SwanStudios team — send a message, call, or email to start training."
            path="/contact"
          />
          <Inner>
            <Intro>
              <Kicker>Contact</Kicker>
              <Title>Let’s start your training.</Title>
              <Sub>Tell us your goals and we’ll match you with the right coach. We usually reply within a day.</Sub>
              <Methods>
                <Method href="mailto:loveswanstudios@protonmail.com">✉ loveswanstudios@protonmail.com</Method>
                <Method href="tel:+17144853950">✆ (714) 485-3950</Method>
              </Methods>
            </Intro>
            <ContactForm />
          </Inner>
        </Main>
      </div>
    </ContactLensFrame>
  );
}
