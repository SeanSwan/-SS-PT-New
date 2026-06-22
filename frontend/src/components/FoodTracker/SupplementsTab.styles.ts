/**
 * Styled components for SupplementsTab — FTC banner, hero, gap analysis, footer.
 * Product catalog styles → SupplementsTab.catalog.styles.ts
 * Extracted to keep all files under 300 lines (CLAUDE.md rule).
 * All colors use var(--token, #fallback) pattern per CLAUDE.md rule 6.
 */
import styled from 'styled-components';
import { motion } from 'framer-motion';

export const TabRoot = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const FtcBanner = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 14px;
  background: var(--accent-gold-subtle, rgba(198, 168, 75, 0.08));
  border: 1px solid var(--accent-gold-border, rgba(198, 168, 75, 0.20));
  border-radius: 8px;
  font-size: 11px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
  line-height: 1.4;
  svg { flex-shrink: 0; margin-top: 1px; color: var(--accent-gold, #C6A84B); }
`;

export const LoadError = styled.div`
  padding: 10px 14px;
  border-radius: 8px;
  background: var(--accent-error-subtle, rgba(201, 42, 84, 0.1));
  border-left: 3px solid var(--accent-error, #C92A54);
  color: var(--text-primary, #E0ECF4);
  font-size: 13px;
`;

export const HeroSection = styled.div`
  background: linear-gradient(
    135deg,
    var(--accent-secondary-subtle, rgba(139, 92, 246, 0.12)),
    var(--accent-primary-subtle, rgba(96, 192, 240, 0.08))
  );
  border: 1px solid var(--accent-secondary-border, rgba(139, 92, 246, 0.20));
  border-radius: 12px;
  padding: 20px;
`;

export const HeroBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: var(--accent-gold-light, rgba(198, 168, 75, 0.15));
  border: 1px solid var(--accent-gold-strong, rgba(198, 168, 75, 0.30));
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  color: var(--accent-gold, #C6A84B);
  margin-bottom: 10px;
`;

export const HeroTitle = styled.h3`
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin: 0 0 8px;
  font-family: 'Plus Jakarta Sans', sans-serif;
`;

export const HeroDesc = styled.p`
  font-size: 14px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  margin: 0 0 12px;
  line-height: 1.5;
`;

export const HeroMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 10px;
`;

export const HeroPrice = styled.span`
  font-size: 16px;
  font-weight: 700;
  color: var(--accent-gold, #C6A84B);
`;

export const HeroRating = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: var(--accent-gold, #C6A84B);
`;

export const NasmTag = styled.p`
  font-size: 12px;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  font-style: italic;
  margin: 0;
  padding-top: 8px;
  border-top: 1px solid var(--accent-primary-faint, rgba(96, 192, 240, 0.04));
`;

export const GapSection = styled.div`
  background: var(--bg-elevated-80, rgba(20, 20, 25, 0.80));
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  border-radius: 12px;
  padding: 20px;
`;

export const SectionTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  margin: 0 0 6px;
  font-family: 'Plus Jakarta Sans', sans-serif;
`;

export const SectionDesc = styled.p`
  font-size: 13px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
  margin: 0 0 14px;
`;

export const AnalyzeBtn = styled(motion.button)`
  padding: 12px 24px;
  background: var(--accent-secondary, #8B5CF6);
  color: var(--color-on-accent, #fff);
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  &:hover { box-shadow: 0 0 16px var(--accent-primary-glow, rgba(96, 192, 240, 0.40)); }
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

export const LoadingText = styled.p`
  font-size: 13px;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  font-style: italic;
`;

export const ErrorText = styled.p`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--accent-error, #C92A54);
`;

export const GapMeta = styled.p`
  font-size: 12px;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  margin: 0 0 12px;
`;

export const GapGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

export const GapCard = styled.div<{ $severity: string }>`
  padding: 14px;
  background: var(--bg-surface-90, rgba(26, 26, 36, 0.90));
  border: 1px solid ${p =>
    p.$severity === 'high'     ? 'var(--accent-gold-border, rgba(198, 168, 75, 0.25))' :
    p.$severity === 'moderate' ? 'var(--accent-secondary-border, rgba(139, 92, 246, 0.20))' :
    'var(--border-soft, rgba(96, 192, 240, 0.08))'};
  border-radius: 8px;
`;

export const GapHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
`;

export const GapNutrient = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

export const GapPct = styled.span<{ $color: string }>`
  font-size: 14px;
  font-weight: 700;
  color: ${p => p.$color};
  font-family: 'Fira Code', monospace;
`;

export const GapValues = styled.div`
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  margin-bottom: 6px;
  font-family: 'Fira Code', monospace;
`;

export const GapRec = styled.p`
  font-size: 13px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  margin: 0;
  line-height: 1.4;
`;

export const GapSuggestions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
`;

export const FdaDisclaimer = styled.p`
  font-size: 10px;
  color: var(--text-muted, rgba(224, 236, 244, 0.35));
  line-height: 1.4;
  margin: 8px 0 0;
  padding: 10px;
  border-top: 1px solid var(--border-soft, rgba(96, 192, 240, 0.06));
`;
