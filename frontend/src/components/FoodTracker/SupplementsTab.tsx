/**
 * ┌─── SUB-COMPONENT: SupplementsTab ──────────────────────────┐
 * │ PARENT: NutritionWorkspace                                  │
 * │ PURPOSE: Supplement store with AG1 hero, category filter,   │
 * │   AI nutrition gap analysis, FTC-compliant affiliate links  │
 * │ API: GET /api/supplements/categories (public)               │
 * │      GET /api/supplements/products?category= (public)       │
 * │      GET /api/supplements/gaps?days=7 (auth-required)       │
 * └─────────────────────────────────────────────────────────────┘
 */
import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  Leaf, Dumbbell, Zap, Sun, Heart, Shield, Moon,
  Star, ExternalLink, ChevronDown, ChevronUp,
  AlertTriangle, TrendingDown, Award, Info,
} from 'lucide-react';
import {
  TabRoot, FtcBanner, LoadError, HeroSection, HeroBadge, HeroTitle, HeroDesc,
  HeroMeta, HeroPrice, HeroRating, NasmTag, GapSection, SectionTitle, SectionDesc,
  AnalyzeBtn, LoadingText, ErrorText, GapMeta, GapGrid, GapCard, GapHeader,
  GapNutrient, GapPct, GapValues, GapRec, GapSuggestions, FdaDisclaimer,
} from './SupplementsTab.styles';
import {
  MiniProductChip, CategoryRow, CatChip, ProductGrid, ProductCard, ProductHeader,
  ProductName, PickBadge, ProductMeta, ProductPrice, ProductRating, ProductDesc,
  BadgeRow, ProductBadge, ExpandedDetail, NasmBox, NasmLabel, NasmText,
  ShopLink, ComingSoon,
} from './SupplementsTab.catalog.styles';

// ── Types ──────────────────────────────────────────────────────
interface Supplement {
  id: string; name: string; category: string; description: string;
  price: string; rating: number; seansPick: boolean; nasmContext: string;
  affiliateUrl: string; imageTag: string; badges: string[];
}

interface Category { id: string; name: string; icon: string; description: string; }

interface NutritionGap {
  nutrient: string; avgDaily: string; target: string;
  percentMet: number | null; severity: string; recommendation: string;
  suggestedProducts?: Supplement[];
}

interface GapAnalysis {
  gaps: NutritionGap[]; summary: Record<string, unknown>;
  daysAnalyzed: number; daysWithData: number;
  ftcDisclosure: string; fdaDisclaimer: string;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  leaf: <Leaf size={18} />, dumbbell: <Dumbbell size={18} />, zap: <Zap size={18} />,
  sun: <Sun size={18} />, heart: <Heart size={18} />, shield: <Shield size={18} />,
  moon: <Moon size={18} />,
};

const API = import.meta.env.VITE_API_BASE || (import.meta.env.PROD ? '' : 'http://localhost:10000');

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const severityColor = (s: string) => {
  if (s === 'high') return 'var(--accent-error, #C92A54)';
  if (s === 'moderate') return 'var(--accent-gold, #C6A84B)';
  return 'var(--accent-primary, #60C0F0)';
};

// ── Component ──────────────────────────────────────────────────
const SupplementsTab: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Supplement[]>([]);
  const [loadError, setLoadError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [gapAnalysis, setGapAnalysis] = useState<GapAnalysis | null>(null);
  const [gapLoading, setGapLoading] = useState(false);
  const [gapError, setGapError] = useState('');
  const [ftcDisclosure, setFtcDisclosure] = useState('');

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/supplements/categories`).then(r => r.json()),
      fetch(`${API}/api/supplements/products`).then(r => r.json()),
    ])
      .then(([catData, prodData]) => {
        if (catData.success) { setCategories(catData.categories); setFtcDisclosure(catData.ftcDisclosure || ''); }
        if (prodData.success) setProducts(prodData.products);
      })
      .catch(() => setLoadError('Could not load supplement catalog. Check your connection.'));
  }, []);

  const filteredProducts = selectedCategory ? products.filter(p => p.category === selectedCategory) : products;
  const seansPicks = products.filter(p => p.seansPick);

  const analyzeGaps = useCallback(async () => {
    setGapLoading(true);
    setGapError('');
    try {
      const res = await fetch(`${API}/api/supplements/gaps?days=7`, { headers: authHeaders() });
      if (!res.ok) throw new Error(res.status === 401 ? 'Log in to analyze your nutrition' : 'Analysis failed');
      const data = await res.json();
      setGapAnalysis(data);
    } catch (err: unknown) {
      setGapError(err instanceof Error ? err.message : 'Failed to analyze gaps');
    } finally {
      setGapLoading(false);
    }
  }, []);

  return (
    <TabRoot>
      <FtcBanner>
        <Info size={14} />
        <span>{ftcDisclosure || 'This page contains affiliate links. Recommendations are based on trainer experience and NASM-aligned nutrition science.'}</span>
      </FtcBanner>

      {loadError && <LoadError>{loadError}</LoadError>}

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

      <GapSection>
        <SectionTitle><TrendingDown size={18} /> Your Nutrition Gaps</SectionTitle>
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
                    <GapValues><span>You: {gap.avgDaily}</span><span>Target: {gap.target}</span></GapValues>
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
            {gapAnalysis.fdaDisclaimer && <FdaDisclaimer>{gapAnalysis.fdaDisclaimer}</FdaDisclaimer>}
          </>
        )}
      </GapSection>

      <SectionTitle style={{ marginTop: 24 }}>Browse by Category</SectionTitle>
      <CategoryRow>
        <CatChip $active={selectedCategory === null} onClick={() => setSelectedCategory(null)}
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          All
        </CatChip>
        {categories.map(cat => (
          <CatChip key={cat.id} $active={selectedCategory === cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            {ICON_MAP[cat.icon] || null} {cat.name}
          </CatChip>
        ))}
      </CategoryRow>

      <ProductGrid>
        <AnimatePresence mode="popLayout">
          {filteredProducts.map(product => (
            <ProductCard key={product.id} layout
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}>
              {/* Trigger is a button; ShopLink anchor lives in ExpandedDetail sibling — no nesting */}
              <ProductHeader
                type="button"
                aria-expanded={expandedProduct === product.id}
                aria-label={`${product.name}, ${product.price}, tap to ${expandedProduct === product.id ? 'collapse' : 'expand'}`}
                onClick={() => setExpandedProduct(expandedProduct === product.id ? null : product.id)}
              >
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
                {product.badges.map(b => <ProductBadge key={b}>{b}</ProductBadge>)}
              </BadgeRow>
              <AnimatePresence>
                {expandedProduct === product.id && (
                  <ExpandedDetail initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
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

      <FdaDisclaimer>
        These statements have not been evaluated by the Food and Drug Administration.
        These products are not intended to diagnose, treat, cure, or prevent any disease.
        Consult your healthcare provider before starting any supplement regimen.
      </FdaDisclaimer>
    </TabRoot>
  );
};

export default SupplementsTab;
