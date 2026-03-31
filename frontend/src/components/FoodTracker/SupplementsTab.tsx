/**
 * ============================================================================
 * FILE: SupplementsTab.tsx
 * PURPOSE: Supplement store with AG1 hero, category grid, AI nutrition gap
 *          analysis, product cards with affiliate links, FTC disclosure
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * AI VILLAGE VALIDATED: 2026-03-31
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Displays curated supplement recommendations based on
 * NASM nutrition science. Includes AI-powered gap analysis from user's macro
 * logs, Sean's trainer picks, and category browsing with FTC-compliant
 * affiliate disclosures.
 *
 * HOW IT FITS IN THE APP: NutritionWorkspace → SupplementsTab
 * KEY DECISIONS: Static catalog (no DB for affiliate products). Gap analysis
 *   requires auth and uses DailyMacroLog data from last 7 days.
 *
 * CLICK-OUTCOMES:
 * [Category chip] → filters product grid by category
 * [Product card] → expands to show NASM context + affiliate link
 * [Analyze My Gaps] → GET /api/supplements/gaps → shows deficiency cards
 * [Shop link] → opens affiliate URL in new tab (FTC disclosure shown)
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Leaf, Dumbbell, Zap, Sun, Heart, Shield, Moon,
  Star, ExternalLink, ChevronDown, ChevronUp,
  AlertTriangle, TrendingDown, Award, Info,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────
interface Supplement {
  id: string;
  name: string;
  category: string;
  description: string;
  price: string;
  rating: number;
  seansPick: boolean;
  nasmContext: string;
  affiliateUrl: string;
  imageTag: string;
  badges: string[];
}

interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
}

interface NutritionGap {
  nutrient: string;
  avgDaily: string;
  target: string;
  percentMet: number | null;
  severity: string;
  recommendation: string;
  suggestedProducts?: Supplement[];
}

interface GapAnalysis {
  gaps: NutritionGap[];
  summary: Record<string, unknown>;
  daysAnalyzed: number;
  daysWithData: number;
  ftcDisclosure: string;
  fdaDisclaimer: string;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Icon Map
// ─────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ReactNode> = {
  leaf: <Leaf size={18} />,
  dumbbell: <Dumbbell size={18} />,
  zap: <Zap size={18} />,
  sun: <Sun size={18} />,
  heart: <Heart size={18} />,
  shield: <Shield size={18} />,
  moon: <Moon size={18} />,
};

const API = import.meta.env.VITE_API_BASE || '';

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
const SupplementsTab: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Supplement[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [gapAnalysis, setGapAnalysis] = useState<GapAnalysis | null>(null);
  const [gapLoading, setGapLoading] = useState(false);
  const [gapError, setGapError] = useState('');
  const [ftcDisclosure, setFtcDisclosure] = useState('');

  // Fetch categories + products on mount
  useEffect(() => {
    fetch(`${API}/api/supplements/categories`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setCategories(d.categories);
          setFtcDisclosure(d.ftcDisclosure || '');
        }
      })
      .catch(() => {});

    fetch(`${API}/api/supplements/products`)
      .then(r => r.json())
      .then(d => { if (d.success) setProducts(d.products); })
      .catch(() => {});
  }, []);

  const filteredProducts = selectedCategory
    ? products.filter(p => p.category === selectedCategory)
    : products;

  const seansPicks = products.filter(p => p.seansPick);

  const analyzeGaps = useCallback(async () => {
    setGapLoading(true);
    setGapError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/supplements/gaps?days=7`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(res.status === 401 ? 'Log in to analyze your nutrition' : 'Analysis failed');
      const data = await res.json();
      setGapAnalysis(data);
    } catch (err: unknown) {
      setGapError(err instanceof Error ? err.message : 'Failed to analyze gaps');
    } finally {
      setGapLoading(false);
    }
  }, []);

  const severityColor = (s: string) => {
    if (s === 'high') return 'var(--accent-error, #C92A54)';
    if (s === 'moderate') return 'var(--accent-gold, #C6A84B)';
    return 'var(--accent-primary, #60C0F0)';
  };

  return (
    <TabRoot>
      {/* FTC Disclosure */}
      <FtcBanner>
        <Info size={14} />
        <span>{ftcDisclosure || 'This page contains affiliate links. Recommendations are based on trainer experience and NASM-aligned nutrition science.'}</span>
      </FtcBanner>

      {/* AG1 Hero — Sean's Pick */}
      {seansPicks.length > 0 && (
        <HeroSection>
          <HeroBadge><Award size={14} /> Trainer&apos;s Pick</HeroBadge>
          <HeroTitle>{seansPicks[0].name}</HeroTitle>
          <HeroDesc>{seansPicks[0].description}</HeroDesc>
          <HeroMeta>
            <HeroPrice>{seansPicks[0].price}</HeroPrice>
            <HeroRating><Star size={14} /> {seansPicks[0].rating}</HeroRating>
          </HeroMeta>
          <NasmTag>{seansPicks[0].nasmContext}</NasmTag>
        </HeroSection>
      )}

      {/* AI Gap Analysis */}
      <GapSection>
        <SectionTitle>
          <TrendingDown size={18} />
          Your Nutrition Gaps
        </SectionTitle>
        <SectionDesc>
          AI analyzes your logged meals to identify nutritional deficiencies and recommend targeted supplements.
        </SectionDesc>
        {!gapAnalysis && !gapLoading && (
          <AnalyzeBtn onClick={analyzeGaps} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            Analyze My Last 7 Days
          </AnalyzeBtn>
        )}
        {gapLoading && <LoadingText>Analyzing your macro logs...</LoadingText>}
        {gapError && <ErrorText><AlertTriangle size={14} /> {gapError}</ErrorText>}
        {gapAnalysis && (
          <>
            <GapMeta>
              {gapAnalysis.daysWithData} days of data analyzed
              {gapAnalysis.summary && typeof gapAnalysis.summary === 'object' && 'avgCalories' in gapAnalysis.summary && (
                <> · Avg {(gapAnalysis.summary as Record<string, number>).avgCalories} cal/day</>
              )}
            </GapMeta>
            <GapGrid>
              {gapAnalysis.gaps.map((gap, i) => (
                <GapCard key={i} $severity={gap.severity}>
                  <GapHeader>
                    <GapNutrient>{gap.nutrient}</GapNutrient>
                    {gap.percentMet !== null && (
                      <GapPct $color={severityColor(gap.severity)}>{gap.percentMet}%</GapPct>
                    )}
                  </GapHeader>
                  {gap.avgDaily !== 'N/A' && (
                    <GapValues>
                      <span>You: {gap.avgDaily}</span>
                      <span>Target: {gap.target}</span>
                    </GapValues>
                  )}
                  <GapRec>{gap.recommendation}</GapRec>
                  {gap.suggestedProducts && gap.suggestedProducts.length > 0 && (
                    <GapSuggestions>
                      {gap.suggestedProducts.map(p => (
                        <MiniProductChip key={p.id} onClick={() => setExpandedProduct(p.id)}>
                          {p.name}
                        </MiniProductChip>
                      ))}
                    </GapSuggestions>
                  )}
                </GapCard>
              ))}
            </GapGrid>
            {gapAnalysis.fdaDisclaimer && (
              <FdaDisclaimer>{gapAnalysis.fdaDisclaimer}</FdaDisclaimer>
            )}
          </>
        )}
      </GapSection>

      {/* Category Filter */}
      <SectionTitle style={{ marginTop: 24 }}>Browse by Category</SectionTitle>
      <CategoryRow>
        <CatChip
          $active={selectedCategory === null}
          onClick={() => setSelectedCategory(null)}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          All
        </CatChip>
        {categories.map(cat => (
          <CatChip
            key={cat.id}
            $active={selectedCategory === cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            {ICON_MAP[cat.icon] || null}
            {cat.name}
          </CatChip>
        ))}
      </CategoryRow>

      {/* Product Grid */}
      <ProductGrid>
        <AnimatePresence mode="popLayout">
          {filteredProducts.map(product => (
            <ProductCard
              key={product.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <ProductHeader onClick={() => setExpandedProduct(expandedProduct === product.id ? null : product.id)}>
                <ProductName>
                  {product.seansPick && <PickBadge><Award size={12} /></PickBadge>}
                  {product.name}
                </ProductName>
                <ProductMeta>
                  <ProductPrice>{product.price}</ProductPrice>
                  <ProductRating><Star size={12} /> {product.rating}</ProductRating>
                  {expandedProduct === product.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </ProductMeta>
              </ProductHeader>
              <ProductDesc>{product.description}</ProductDesc>
              <BadgeRow>
                {product.badges.map(b => (
                  <ProductBadge key={b}>{b}</ProductBadge>
                ))}
              </BadgeRow>
              <AnimatePresence>
                {expandedProduct === product.id && (
                  <ExpandedDetail
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <NasmBox>
                      <NasmLabel>NASM Context</NasmLabel>
                      <NasmText>{product.nasmContext}</NasmText>
                    </NasmBox>
                    {product.affiliateUrl ? (
                      <ShopLink href={product.affiliateUrl} target="_blank" rel="noopener noreferrer sponsored">
                        <ExternalLink size={14} /> Shop Now
                      </ShopLink>
                    ) : (
                      <ComingSoon>Affiliate link coming soon</ComingSoon>
                    )}
                  </ExpandedDetail>
                )}
              </AnimatePresence>
            </ProductCard>
          ))}
        </AnimatePresence>
      </ProductGrid>

      {/* FDA Disclaimer */}
      <FdaDisclaimer>
        These statements have not been evaluated by the Food and Drug Administration.
        These products are not intended to diagnose, treat, cure, or prevent any disease.
        Consult your healthcare provider before starting any supplement regimen.
      </FdaDisclaimer>
    </TabRoot>
  );
};

export default SupplementsTab;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────
const TabRoot = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const FtcBanner = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 14px;
  background: color-mix(in srgb, var(--accent-gold, #C6A84B) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 20%, transparent);
  border-radius: 8px;
  font-size: 11px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
  line-height: 1.4;

  svg { flex-shrink: 0; margin-top: 1px; color: var(--accent-gold, #C6A84B); }
`;

const HeroSection = styled.div`
  background: linear-gradient(135deg,
    color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent),
    color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent)
  );
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent);
  border-radius: 12px;
  padding: 20px;
`;

const HeroBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: color-mix(in srgb, var(--accent-gold, #C6A84B) 15%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 30%, transparent);
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  color: var(--accent-gold, #C6A84B);
  margin-bottom: 10px;
`;

const HeroTitle = styled.h3`
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin: 0 0 8px;
  font-family: 'Plus Jakarta Sans', sans-serif;
`;

const HeroDesc = styled.p`
  font-size: 14px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  margin: 0 0 12px;
  line-height: 1.5;
`;

const HeroMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 10px;
`;

const HeroPrice = styled.span`
  font-size: 16px;
  font-weight: 700;
  color: var(--accent-gold, #C6A84B);
`;

const HeroRating = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: var(--accent-gold, #C6A84B);
`;

const NasmTag = styled.p`
  font-size: 12px;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  font-style: italic;
  margin: 0;
  padding-top: 8px;
  border-top: 1px solid color-mix(in srgb, var(--border-soft, rgba(96,192,240,0.08)) 50%, transparent);
`;

const GapSection = styled.div`
  background: color-mix(in srgb, var(--bg-elevated, #141419) 80%, transparent);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  border-radius: 12px;
  padding: 20px;
`;

const SectionTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  margin: 0 0 6px;
  font-family: 'Plus Jakarta Sans', sans-serif;
`;

const SectionDesc = styled.p`
  font-size: 13px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
  margin: 0 0 14px;
`;

const AnalyzeBtn = styled(motion.button)`
  padding: 12px 24px;
  background: var(--accent-secondary, #8B5CF6);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;

  &:hover { box-shadow: 0 0 16px color-mix(in srgb, var(--accent-primary, #60C0F0) 40%, transparent); }
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

const LoadingText = styled.p`
  font-size: 13px;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  font-style: italic;
`;

const ErrorText = styled.p`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--accent-error, #C92A54);
`;

const GapMeta = styled.p`
  font-size: 12px;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  margin: 0 0 12px;
`;

const GapGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const GapCard = styled.div<{ $severity: string }>`
  padding: 14px;
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 90%, transparent);
  border: 1px solid ${p =>
    p.$severity === 'high' ? 'color-mix(in srgb, var(--accent-error, #C92A54) 25%, transparent)' :
    p.$severity === 'moderate' ? 'color-mix(in srgb, var(--accent-gold, #C6A84B) 20%, transparent)' :
    'var(--border-soft, rgba(96, 192, 240, 0.08))'
  };
  border-radius: 8px;
`;

const GapHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
`;

const GapNutrient = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

const GapPct = styled.span<{ $color: string }>`
  font-size: 14px;
  font-weight: 700;
  color: ${p => p.$color};
  font-family: 'Fira Code', monospace;
`;

const GapValues = styled.div`
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  margin-bottom: 6px;
  font-family: 'Fira Code', monospace;
`;

const GapRec = styled.p`
  font-size: 13px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  margin: 0;
  line-height: 1.4;
`;

const GapSuggestions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
`;

const MiniProductChip = styled.button`
  padding: 4px 10px;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 25%, transparent);
  border-radius: 12px;
  color: var(--accent-secondary, #8B5CF6);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  min-height: 28px;

  &:hover { background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent); }
`;

const CategoryRow = styled.div`
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: thin;

  &::-webkit-scrollbar { height: 3px; }
  &::-webkit-scrollbar-thumb { background: var(--border-soft, rgba(96,192,240,0.12)); border-radius: 3px; }
`;

const CatChip = styled(motion.button)<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid ${p => p.$active
    ? 'var(--accent-secondary, #8B5CF6)'
    : 'var(--border-soft, rgba(96, 192, 240, 0.12))'};
  background: ${p => p.$active
    ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent)'
    : 'transparent'};
  color: ${p => p.$active
    ? 'var(--accent-secondary, #8B5CF6)'
    : 'var(--text-secondary, rgba(224, 236, 244, 0.6))'};
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  min-height: 36px;

  &:hover { color: var(--text-primary, #E0ECF4); }
`;

const ProductGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const ProductCard = styled(motion.div)`
  background: color-mix(in srgb, var(--bg-elevated, #141419) 90%, transparent);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  border-radius: 10px;
  padding: 14px;
`;

const ProductHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  min-height: 44px;
`;

const ProductName = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

const PickBadge = styled.span`
  display: flex;
  align-items: center;
  color: var(--accent-gold, #C6A84B);
`;

const ProductMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
`;

const ProductPrice = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: var(--accent-gold, #C6A84B);
`;

const ProductRating = styled.span`
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  color: var(--accent-gold, #C6A84B);
`;

const ProductDesc = styled.p`
  font-size: 13px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  margin: 8px 0;
  line-height: 1.4;
`;

const BadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const ProductBadge = styled.span`
  padding: 3px 8px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  border-radius: 10px;
  font-size: 10px;
  font-weight: 500;
  color: var(--accent-primary, #60C0F0);
`;

const ExpandedDetail = styled(motion.div)`
  overflow: hidden;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
`;

const NasmBox = styled.div`
  padding: 10px;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 6%, transparent);
  border-radius: 6px;
  margin-bottom: 10px;
`;

const NasmLabel = styled.span`
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--accent-secondary, #8B5CF6);
  display: block;
  margin-bottom: 4px;
`;

const NasmText = styled.p`
  font-size: 13px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  margin: 0;
  line-height: 1.4;
`;

const ShopLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  background: var(--accent-secondary, #8B5CF6);
  color: #fff;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  min-height: 44px;
  transition: box-shadow 0.15s;

  &:hover { box-shadow: 0 0 16px color-mix(in srgb, var(--accent-primary, #60C0F0) 40%, transparent); }
`;

const ComingSoon = styled.span`
  font-size: 12px;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  font-style: italic;
`;

const FdaDisclaimer = styled.p`
  font-size: 10px;
  color: var(--text-muted, rgba(224, 236, 244, 0.35));
  line-height: 1.4;
  margin: 8px 0 0;
  padding: 10px;
  border-top: 1px solid var(--border-soft, rgba(96, 192, 240, 0.06));
`;
