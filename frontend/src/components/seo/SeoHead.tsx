/**
 * SeoHead.tsx — per-route title/description + OpenGraph/Twitter tags
 * ====================================================================
 * Launch charter BP04 §6.4: og:/twitter: tags previously existed ONLY as
 * static strings in index.html, so every SPA route shared one generic link
 * preview. This helper emits per-route social meta via react-helmet-async
 * (HelmetProvider already wired in App.tsx).
 *
 * REUSABLE-CORE (§6 doctrine): zero app-specific imports beyond React +
 * react-helmet-async; brand defaults are overridable props.
 */
import React from 'react';
import { Helmet } from 'react-helmet-async';

export interface SeoHeadProps {
  title: string;
  description: string;
  /** Absolute or root-relative image for link previews. */
  image?: string;
  /** Canonical path (e.g. '/about'); origin resolved at runtime. */
  path?: string;
  type?: 'website' | 'article' | 'profile';
}

const DEFAULT_IMAGE = '/Logo.png';

const SeoHead: React.FC<SeoHeadProps> = ({
  title,
  description,
  image = DEFAULT_IMAGE,
  path,
  type = 'website',
}) => {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const url = path && origin ? `${origin}${path}` : undefined;
  const absoluteImage = image.startsWith('http') ? image : origin ? `${origin}${image}` : image;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={absoluteImage} />
      {url && <meta property="og:url" content={url} />}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={absoluteImage} />
    </Helmet>
  );
};

export default SeoHead;
