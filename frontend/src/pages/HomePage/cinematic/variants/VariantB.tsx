/**
 * VariantB.tsx — Crystalline Swan (Preset F-Alt) [PRIMARY CANDIDATE]
 *
 * Frozen enchanted forest, ice crystals, aurora borealis, sapphire glass.
 * Brand-exact match to SwanStudios logo palette.
 */

import React from 'react';
import styled from 'styled-components';
import { Helmet } from 'react-helmet-async';

import { crystallineSwanTokens } from '../cinematic-tokens';
import { homepageContent } from '../HomepageContent';
import { NoiseOverlay, CinematicDivider } from '../cinematic-shared';
import {
  CinematicNavbar,
  CinematicHero,
  CinematicPrograms,
  CinematicFeatures,
  CinematicCreative,
  CinematicTrainers,
  CinematicTestimonials,
  CinematicStats,
  CinematicSocialFeed,
  CinematicNewsletter,
  CinematicFooter,
} from '../sections';

const tokens = crystallineSwanTokens;
const content = homepageContent;

const PageRoot = styled.div`
  position: relative;
  width: 100%;
  min-height: 100vh;
  overflow-x: hidden;
  background: ${tokens.palette.bg};
  color: ${tokens.palette.textPrimary};
`;

const VariantB: React.FC = () => (
  <>
    <Helmet>
      <title>{content.seo.title}</title>
      <meta name="description" content={content.seo.description} />
      <meta name="keywords" content={content.seo.keywords} />
      <meta property="og:title" content={content.seo.ogTitle} />
      <meta property="og:description" content={content.seo.ogDescription} />
      <meta property="og:type" content={content.seo.ogType} />
      <link rel="canonical" href={content.seo.canonicalUrl} />
    </Helmet>

    <PageRoot>
      <NoiseOverlay $tokens={tokens} />

      <CinematicNavbar
        tokens={tokens}
        marketingLinks={content.nav.marketingLinks}
        ctaLabel={content.nav.ctaLabel}
        ctaPath={content.nav.ctaPath}
      />

      <CinematicHero content={content.hero} tokens={tokens} />

      <CinematicDivider $tokens={tokens} />

      <CinematicPrograms
        sectionTitle={content.programs.sectionTitle}
        sectionDescription={content.programs.sectionDescription}
        cards={content.programs.cards}
        bottomCta={content.programs.bottomCta}
        tokens={tokens}
      />

      <CinematicDivider $tokens={tokens} />

      <CinematicFeatures
        sectionTitle={content.features.sectionTitle}
        sectionDescription={content.features.sectionDescription}
        items={content.features.items}
        tokens={tokens}
      />

      <CinematicDivider $tokens={tokens} />

      <CinematicCreative
        sectionTitle={content.creativeExpression.sectionTitle}
        sectionBody={content.creativeExpression.sectionBody}
        sectionBodyBold={content.creativeExpression.sectionBodyBold}
        sectionBodyContinued={content.creativeExpression.sectionBodyContinued}
        cards={content.creativeExpression.cards}
        tokens={tokens}
      />

      <CinematicDivider $tokens={tokens} />

      <CinematicTrainers
        sectionTitle={content.trainers.sectionTitle}
        sectionDescription={content.trainers.sectionDescription}
        profiles={content.trainers.profiles}
        tokens={tokens}
      />

      <CinematicDivider $tokens={tokens} />

      <CinematicTestimonials
        sectionTitle={content.testimonials.sectionTitle}
        sectionDescription={content.testimonials.sectionDescription}
        items={content.testimonials.items}
        tokens={tokens}
      />

      <CinematicDivider $tokens={tokens} />

      <CinematicStats
        sectionTitle={content.fitnessStats.sectionTitle}
        sectionDescription={content.fitnessStats.sectionDescription}
        stats={content.fitnessStats.stats}
        tokens={tokens}
      />

      <CinematicDivider $tokens={tokens} />

      <CinematicSocialFeed
        sectionTitle={content.socialFeed.sectionTitle}
        sectionDescription={content.socialFeed.sectionDescription}
        platforms={content.socialFeed.platforms}
        tokens={tokens}
      />

      <CinematicDivider $tokens={tokens} />

      <CinematicNewsletter
        heading={content.newsletter.heading}
        subheading={content.newsletter.subheading}
        namePlaceholder={content.newsletter.namePlaceholder}
        emailPlaceholder={content.newsletter.emailPlaceholder}
        buttonText={content.newsletter.buttonText}
        privacyNote={content.newsletter.privacyNote}
        benefits={content.newsletter.benefits}
        tokens={tokens}
      />

      <CinematicFooter footer={content.footer} tokens={tokens} />
    </PageRoot>
  </>
);

export default VariantB;
