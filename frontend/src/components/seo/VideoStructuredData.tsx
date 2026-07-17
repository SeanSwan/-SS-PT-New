import React from 'react';

interface VideoStructuredDataProps {
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
  durationSeconds: number;
  slug: string;
}

/**
 * Convert seconds to ISO 8601 duration (e.g. PT1H23M45S).
 */
function toISO8601Duration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  let iso = 'PT';
  if (h > 0) iso += `${h}H`;
  if (m > 0) iso += `${m}M`;
  if (s > 0 || iso === 'PT') iso += `${s}S`;
  return iso;
}

/**
 * VideoStructuredData -- renders a JSON-LD script tag with
 * schema.org VideoObject markup. Only rendered for published,
 * publicly-visible videos to improve SEO.
 */
const VideoStructuredData: React.FC<VideoStructuredDataProps> = ({
  title,
  description,
  thumbnailUrl,
  publishedAt,
  durationSeconds,
  slug,
}) => {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: title,
    description: description || title,
    thumbnailUrl: [thumbnailUrl],
    uploadDate: publishedAt,
    duration: toISO8601Duration(durationSeconds),
    contentUrl: `${origin}/watch/${slug}`,
    embedUrl: `${origin}/watch/${slug}`,
    publisher: {
      '@type': 'Organization',
      name: 'SwanStudios',
      logo: {
        '@type': 'ImageObject',
        url: `${origin}/logo.png`,
      },
    },
  };

  // Escape `<`, `>`, and `&` so a value containing `</script>` cannot break out
  // of the JSON-LD <script> block and inject executable markup (XSS). JSON.stringify
  // does not escape these on its own; the \u-escaped forms remain valid JSON.
  const safeJson = JSON.stringify(schema)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJson }}
    />
  );
};

export default VideoStructuredData;
