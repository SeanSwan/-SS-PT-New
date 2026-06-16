import React, { useEffect, useMemo, useState } from 'react';
import { CoachFormattedLogContent, formattedLogBodyToPlainText } from './CoachFormattedLogContent';
import { formatCommandLogBody } from './CoachCommandLogEntry.format';
import { LogBody, PacketDetails, StyleSwitch } from './CoachCommandLogEntry.styles';
import type { LogStyleVariantKey } from './CoachCommandLogEntry.types';
import type { ResponseStyle } from './SwanCoachTypes';

type CoachMessageResponseVariantsProps = {
  content: string;
  fallback: React.ReactNode;
  onVisibleTextChange?: (text: string | null) => void;
  preferredResponseStyle?: ResponseStyle;
};

export function getResponseStyleVariantKey(style?: ResponseStyle): LogStyleVariantKey {
  return style === 'simple_only' ? 'keep100' : 'science';
}

export function getInitialCoachResponseVariantText(
  content: string,
  preferredResponseStyle?: ResponseStyle,
): string | null {
  const formatted = formatCommandLogBody(content);
  const preferredKey = getResponseStyleVariantKey(preferredResponseStyle);
  const selectedVariant = formatted.variants?.find((variant) => variant.key === preferredKey) || formatted.variants?.[0];
  return selectedVariant ? formattedLogBodyToPlainText(selectedVariant.body) : null;
}

function CoachMessageResponseVariants({
  content,
  fallback,
  onVisibleTextChange,
  preferredResponseStyle,
}: CoachMessageResponseVariantsProps) {
  const formatted = useMemo(() => formatCommandLogBody(content), [content]);
  const preferredVariantKey = getResponseStyleVariantKey(preferredResponseStyle);
  const [activeVariant, setActiveVariant] = useState<LogStyleVariantKey>(
    () => preferredVariantKey,
  );
  const variants = formatted.variants || [];
  const selectedVariant = variants.find((variant) => variant.key === activeVariant) || variants[0];
  const visibleText = selectedVariant ? formattedLogBodyToPlainText(selectedVariant.body) : null;

  useEffect(() => {
    if (!variants.some((variant) => variant.key === preferredVariantKey)) return;
    setActiveVariant(preferredVariantKey);
  }, [preferredVariantKey, variants]);

  useEffect(() => {
    onVisibleTextChange?.(visibleText);
  }, [onVisibleTextChange, visibleText]);

  if (!variants.length) return <>{fallback}</>;

  return (
    <LogBody>
      <StyleSwitch role="group" aria-label="Coach answer style">
        {variants.map((variant) => (
          <button
            type="button"
            key={variant.key}
            aria-pressed={selectedVariant?.key === variant.key}
            onClick={() => setActiveVariant(variant.key)}
          >
            {variant.label}
          </button>
        ))}
      </StyleSwitch>

      {selectedVariant ? <CoachFormattedLogContent formatted={selectedVariant.body} /> : null}

      {formatted.structuredPacket ? (
        <PacketDetails>
          <summary>Structured packet</summary>
          <pre>{formatted.structuredPacket}</pre>
        </PacketDetails>
      ) : null}
    </LogBody>
  );
}

export default CoachMessageResponseVariants;
