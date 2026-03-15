/**
 * BadgeArtGallery — Admin Badge Art Gallery (Full-Featured)
 * ==========================================================
 * Architecture: React 18 + TypeScript + styled-components
 * Theme: Enchanted Apex — Crystalline Swan
 *
 * Features:
 * - Dual manifest loading (/badges/ + /badges/achievements/)
 * - 20 style filters, 9 category filters, 6 skill tree filters
 * - Rarity border glow based on filename pattern
 * - Focus-trapped detail modal with keyboard accessibility
 * - Skeleton shimmer loaders, lazy image loading
 * - Responsive CSS grid (375px to 3840px)
 * - 44px minimum touch targets, WCAG focus-visible rings
 * - prefers-reduced-motion support
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { Award, Filter, Search, Heart, X, ChevronDown, Layers } from 'lucide-react';

// ── Color Tokens (Crystalline Swan) ──
const C = {
  midnightSapphire: '#002060',
  royalDepth: '#003080',
  iceWing: '#60C0F0',
  arcticCyan: '#50A0F0',
  wingPurple: '#8B5CF6',
  gildedFern: '#C6A84B',
  frostWhite: '#E0ECF4',
  swanLavender: '#4070C0',
  textSecondary: 'rgba(224, 236, 244, 0.75)',
} as const;

const hexAlpha = (hex: string, alpha: number) =>
  `${hex}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;

// ── Rarity Config ──
const RARITY_MAP: Record<string, { label: string; color: string; glow: string }> = {
  common:    { label: 'Common',    color: C.swanLavender, glow: hexAlpha(C.swanLavender, 0.4) },
  rare:      { label: 'Rare',      color: C.gildedFern,   glow: hexAlpha(C.gildedFern, 0.5) },
  epic:      { label: 'Epic',      color: C.wingPurple,   glow: hexAlpha(C.wingPurple, 0.5) },
  legendary: { label: 'Legendary', color: 'url(#legendaryGrad)', glow: hexAlpha(C.wingPurple, 0.7) },
};

function detectRarity(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.includes('legendary') || lower.includes('_lg_')) return 'legendary';
  if (lower.includes('epic') || lower.includes('_ep_')) return 'epic';
  if (lower.includes('rare') || lower.includes('_ra_')) return 'rare';
  return 'common';
}

// ── Static Filter Options ──
const BADGE_STYLES = [
  { id: 'claymation', name: 'Claymation' },
  { id: 'glass', name: 'Glass' },
  { id: 'metallic', name: 'Metallic' },
  { id: 'lowpoly-crystal', name: 'Low-Poly Crystal' },
  { id: 'isometric', name: 'Isometric' },
  { id: 'popmart', name: 'Pop Mart' },
  { id: 'chibi', name: 'Chibi' },
  { id: 'watercolor', name: 'Watercolor' },
  { id: 'neon-wireframe', name: 'Neon Wireframe' },
  { id: 'pixel-art', name: 'Pixel Art' },
  { id: 'origami', name: 'Origami' },
  { id: 'steampunk', name: 'Steampunk' },
  { id: 'cyberpunk', name: 'Cyberpunk' },
  { id: 'art-deco', name: 'Art Deco' },
  { id: 'ukiyo-e', name: 'Ukiyo-e' },
  { id: 'stained-glass', name: 'Stained Glass' },
  { id: 'embroidery', name: 'Embroidery' },
  { id: 'holographic', name: 'Holographic' },
  { id: 'brutalist', name: 'Brutalist' },
  { id: 'cel-shaded', name: 'Cel-Shaded' },
];

const BADGE_CATEGORIES = [
  { id: 'swan', name: 'Swan' },
  { id: 'fitness', name: 'Fitness' },
  { id: 'nature', name: 'Nature' },
  { id: 'achievement', name: 'Achievement' },
  { id: 'social', name: 'Social' },
  { id: 'abstract', name: 'Abstract' },
  { id: 'seasonal', name: 'Seasonal' },
  { id: 'wellness', name: 'Wellness' },
  { id: 'luxury', name: 'Luxury' },
];

const SKILL_TREES = [
  { id: 'awakening', name: 'Awakening' },
  { id: 'forge_nasm', name: 'Forge NASM' },
  { id: 'iron_gravity', name: 'Iron Gravity' },
  { id: 'tribe_social', name: 'Tribe Social' },
  { id: 'free_spirit', name: 'Free Spirit' },
  { id: 'unbroken_streaks', name: 'Unbroken Streaks' },
];

// ── Types ──
interface BadgeManifestStyle {
  id: string;
  name: string;
}

interface BadgeManifestCategory {
  id: string;
  name: string;
  count: number;
  subjects: string[];
}

interface BadgeManifest {
  meta: { totalBadges: number; styles: number; outputDir: string; namingConvention: string };
  styles: BadgeManifestStyle[];
  categories: BadgeManifestCategory[];
}

interface AchievementBadgeEntry {
  filename: string;
  name: string;
  style: string;
  category: string;
  skillTree?: string;
  rarity?: string;
}

interface AchievementManifest {
  badges: AchievementBadgeEntry[];
}

interface BadgeItem {
  id: string;
  name: string;
  style: string;
  styleName: string;
  category: string;
  categoryName: string;
  skillTree: string;
  rarity: string;
  filename: string;
  url: string;
  source: 'generic' | 'achievement';
}

// ── Build badge list from generic manifest ──
function buildGenericBadges(manifest: BadgeManifest): BadgeItem[] {
  const items: BadgeItem[] = [];
  const allSubjects: { subject: string; categoryId: string; categoryName: string }[] = [];

  for (const cat of manifest.categories) {
    for (const subject of cat.subjects) {
      allSubjects.push({ subject, categoryId: cat.id, categoryName: cat.name });
    }
  }

  for (let i = 0; i < allSubjects.length; i++) {
    const style = manifest.styles[i % manifest.styles.length];
    const { subject, categoryId, categoryName } = allSubjects[i];
    const slug = subject.replace(/[^a-z0-9]+/gi, '-').toLowerCase().replace(/-+$/, '');
    const filename = `badge_${style.id}_${categoryId}_${slug}.png`;

    items.push({
      id: `generic-${filename}`,
      name: subject,
      style: style.id,
      styleName: style.name,
      category: categoryId,
      categoryName,
      skillTree: '',
      rarity: detectRarity(filename),
      filename,
      url: `/badges/${filename}`,
      source: 'generic',
    });
  }

  return items;
}

// ── Build badge list from achievement manifest ──
function buildAchievementBadges(manifest: AchievementManifest): BadgeItem[] {
  return manifest.badges.map((b) => {
    const styleEntry = BADGE_STYLES.find((s) => s.id === b.style);
    const catEntry = BADGE_CATEGORIES.find((c) => c.id === b.category);
    return {
      id: `achievement-${b.filename}`,
      name: b.name,
      style: b.style || '',
      styleName: styleEntry?.name || b.style || 'Unknown',
      category: b.category || '',
      categoryName: catEntry?.name || b.category || 'Unknown',
      skillTree: b.skillTree || '',
      rarity: b.rarity || detectRarity(b.filename),
      filename: b.filename,
      url: `/badges/achievements/${b.filename}`,
      source: 'achievement' as const,
    };
  });
}

// ── Focus Trap Hook ──
function useFocusTrap(active: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    const container = containerRef.current;
    const focusableSelector =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusableElements = container.querySelectorAll<HTMLElement>(focusableSelector);
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    // Focus the first element on open
    firstFocusable?.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTab);
    return () => container.removeEventListener('keydown', handleTab);
  }, [active]);

  return containerRef;
}

// ── Component ──
const BadgeArtGallery: React.FC = () => {
  const [allBadges, setAllBadges] = useState<BadgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStyle, setFilterStyle] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterSkillTree, setFilterSkillTree] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('ss-badge-art-favorites');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<BadgeItem | null>(null);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [recentlyFavorited, setRecentlyFavorited] = useState<string | null>(null);

  const modalRef = useFocusTrap(!!selectedBadge);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // ── Load manifests ──
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const badges: BadgeItem[] = [];

      // Generic badges manifest
      try {
        const res = await fetch('/badges/badge-manifest.json');
        if (res.ok) {
          const data: BadgeManifest = await res.json();
          badges.push(...buildGenericBadges(data));
        }
      } catch {
        // Graceful fallback
      }

      // Achievement badges manifest
      try {
        const res = await fetch('/badges/achievements/achievement-badge-manifest.json');
        if (res.ok) {
          const data: AchievementManifest = await res.json();
          badges.push(...buildAchievementBadges(data));
        }
      } catch {
        // Graceful fallback
      }

      setAllBadges(badges);
      setLoading(false);
    };
    load();
  }, []);

  // Persist favorites
  useEffect(() => {
    localStorage.setItem('ss-badge-art-favorites', JSON.stringify([...favorites]));
  }, [favorites]);

  // Escape to close modal + restore focus
  useEffect(() => {
    if (!selectedBadge) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedBadge(null);
        previousFocusRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [selectedBadge]);

  // ── Filters ──
  const filteredBadges = useMemo(() => {
    let result = allBadges;
    if (filterStyle !== 'all') result = result.filter((b) => b.style === filterStyle);
    if (filterCategory !== 'all') result = result.filter((b) => b.category === filterCategory);
    if (filterSkillTree !== 'all') result = result.filter((b) => b.skillTree === filterSkillTree);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.styleName.toLowerCase().includes(q) ||
          b.categoryName.toLowerCase().includes(q) ||
          b.skillTree.toLowerCase().includes(q)
      );
    }
    if (showFavoritesOnly) result = result.filter((b) => favorites.has(b.id));
    return result;
  }, [allBadges, filterStyle, filterCategory, filterSkillTree, searchQuery, showFavoritesOnly, favorites]);

  // ── Actions ──
  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      const wasAdded = !next.has(id);
      if (wasAdded) next.add(id);
      else next.delete(id);
      if (wasAdded) {
        setRecentlyFavorited(id);
        setTimeout(() => setRecentlyFavorited(null), 400);
      }
      return next;
    });
  }, []);

  const handleImageLoad = useCallback((id: string) => {
    setLoadedImages((prev) => new Set(prev).add(id));
  }, []);

  const handleImageError = useCallback((id: string) => {
    setFailedImages((prev) => new Set(prev).add(id));
  }, []);

  const openModal = useCallback((badge: BadgeItem) => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    setSelectedBadge(badge);
  }, []);

  const closeModal = useCallback(() => {
    setSelectedBadge(null);
    previousFocusRef.current?.focus();
  }, []);

  // ── Stats ──
  const generatedCount = filteredBadges.filter((b) => loadedImages.has(b.id)).length;
  const failedCount = filteredBadges.filter((b) => failedImages.has(b.id)).length;
  const pendingCount = Math.max(0, filteredBadges.length - generatedCount - failedCount);

  // ── Derived style options from data ──
  const activeStyles = useMemo(() => {
    const ids = new Set(allBadges.map((b) => b.style));
    const fromData = BADGE_STYLES.filter((s) => ids.has(s.id));
    // Include any styles from manifest not in our static list
    const extraIds = [...ids].filter((id) => !BADGE_STYLES.some((s) => s.id === id));
    const extras = extraIds.map((id) => ({ id, name: id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }));
    return [...fromData, ...extras];
  }, [allBadges]);

  const activeCategories = useMemo(() => {
    const ids = new Set(allBadges.map((b) => b.category));
    const fromData = BADGE_CATEGORIES.filter((c) => ids.has(c.id));
    const extraIds = [...ids].filter((id) => !BADGE_CATEGORIES.some((c) => c.id === id));
    const extras = extraIds.map((id) => ({ id, name: id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }));
    return [...fromData, ...extras];
  }, [allBadges]);

  const activeSkillTrees = useMemo(() => {
    const ids = new Set(allBadges.map((b) => b.skillTree).filter(Boolean));
    return SKILL_TREES.filter((s) => ids.has(s.id));
  }, [allBadges]);

  // ── Render ──
  if (loading) {
    return (
      <GalleryRoot>
        <Header>
          <IconWrap><Award size={28} /></IconWrap>
          <div>
            <Title>Badge Art Gallery</Title>
            <Subtitle>Loading badge manifests...</Subtitle>
          </div>
        </Header>
        <SkeletonGrid>
          {Array.from({ length: 12 }).map((_, i) => (
            <SkeletonCard key={i}>
              <SkeletonImage><ShimmerBar style={{ width: '80%', height: 12 }} /></SkeletonImage>
              <SkeletonText><ShimmerBar style={{ width: '60%', height: 10 }} /></SkeletonText>
              <SkeletonText><ShimmerBar style={{ width: '40%', height: 8 }} /></SkeletonText>
            </SkeletonCard>
          ))}
        </SkeletonGrid>
      </GalleryRoot>
    );
  }

  if (allBadges.length === 0) {
    return (
      <GalleryRoot>
        <Header>
          <IconWrap><Award size={28} /></IconWrap>
          <div>
            <Title>Badge Art Gallery</Title>
            <Subtitle>No badges found</Subtitle>
          </div>
        </Header>
        <EmptyState>
          <Award size={48} />
          <p>Badge manifests not found. Generate badges first:</p>
          <CodeBlock>node scripts/generate-badges.mjs --sample</CodeBlock>
          <p style={{ fontSize: 12, marginTop: 8 }}>
            Expected manifests at <code>/badges/badge-manifest.json</code> and{' '}
            <code>/badges/achievements/achievement-badge-manifest.json</code>
          </p>
        </EmptyState>
      </GalleryRoot>
    );
  }

  return (
    <GalleryRoot>
      {/* Legendary gradient SVG definition */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="legendaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={C.midnightSapphire} />
            <stop offset="25%" stopColor={C.wingPurple} />
            <stop offset="50%" stopColor={C.arcticCyan} />
            <stop offset="75%" stopColor={C.gildedFern} />
            <stop offset="100%" stopColor={C.midnightSapphire} />
          </linearGradient>
        </defs>
      </svg>

      <Header>
        <IconWrap><Award size={28} /></IconWrap>
        <div>
          <Title>Badge Art Gallery</Title>
          <Subtitle>
            {allBadges.length} badges across {activeStyles.length} styles &middot;{' '}
            {favorites.size} favorited
          </Subtitle>
        </div>
        <StatsRow>
          <StatChip $color={C.iceWing}>{generatedCount} generated</StatChip>
          <StatChip $color={C.gildedFern}>{pendingCount} pending</StatChip>
          <StatChip $color={C.wingPurple}>{favorites.size} favorites</StatChip>
        </StatsRow>
      </Header>

      {/* ── Filter Bar ── */}
      <FilterBar>
        <SearchBox>
          <Search size={16} />
          <input
            type="text"
            placeholder="Search badges..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search badges by name, style, or category"
          />
          {searchQuery && (
            <ClearButton onClick={() => setSearchQuery('')} aria-label="Clear search">
              <X size={14} />
            </ClearButton>
          )}
        </SearchBox>

        <FilterSelect
          value={filterStyle}
          onChange={(e) => setFilterStyle(e.target.value)}
          aria-label="Filter by style"
        >
          <option value="all">All Styles ({activeStyles.length})</option>
          {activeStyles.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </FilterSelect>

        <FilterSelect
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          aria-label="Filter by category"
        >
          <option value="all">All Categories ({activeCategories.length})</option>
          {activeCategories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </FilterSelect>

        {activeSkillTrees.length > 0 && (
          <FilterSelect
            value={filterSkillTree}
            onChange={(e) => setFilterSkillTree(e.target.value)}
            aria-label="Filter by skill tree"
          >
            <option value="all">All Skill Trees</option>
            {activeSkillTrees.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </FilterSelect>
        )}

        <ToggleButton
          $active={showFavoritesOnly}
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          aria-label="Show favorites only"
          aria-pressed={showFavoritesOnly}
        >
          <Heart size={16} />
          Favorites
        </ToggleButton>
      </FilterBar>

      {/* ── Results Count ── */}
      <ResultsBar>
        Showing {filteredBadges.length} of {allBadges.length} badges
      </ResultsBar>

      {/* ── Badge Grid ── */}
      {filteredBadges.length === 0 ? (
        <EmptyState>
          <Filter size={48} />
          <p>No badges match your filters.</p>
        </EmptyState>
      ) : (
        <BadgeGrid>
          {filteredBadges.map((badge) => {
            const isLoaded = loadedImages.has(badge.id);
            const isFailed = failedImages.has(badge.id);
            const isFav = favorites.has(badge.id);
            const rarity = RARITY_MAP[badge.rarity] || RARITY_MAP.common;

            return (
              <BadgeCard
                key={badge.id}
                $rarityColor={rarity.color}
                $rarityGlow={rarity.glow}
                onClick={() => openModal(badge)}
                role="button"
                tabIndex={0}
                aria-label={`${badge.name} - ${badge.styleName} - ${rarity.label}`}
                onKeyDown={(e) => e.key === 'Enter' && openModal(badge)}
              >
                <BadgeImageWrap>
                  {!isFailed ? (
                    <BadgeImage
                      src={badge.url}
                      alt={badge.name}
                      loading="lazy"
                      $loaded={isLoaded}
                      onLoad={() => handleImageLoad(badge.id)}
                      onError={() => handleImageError(badge.id)}
                    />
                  ) : (
                    <PlaceholderBadge>
                      <Award size={32} />
                      <span>Not generated</span>
                    </PlaceholderBadge>
                  )}
                  {!isLoaded && !isFailed && (
                    <PlaceholderBadge>
                      <ShimmerBar />
                    </PlaceholderBadge>
                  )}
                </BadgeImageWrap>

                <BadgeInfo>
                  <BadgeName>{badge.name}</BadgeName>
                  <BadgeMeta>
                    <StyleTag>{badge.styleName}</StyleTag>
                    <CategoryTag>{badge.categoryName}</CategoryTag>
                  </BadgeMeta>
                  <RarityTag $color={rarity.color}>{rarity.label}</RarityTag>
                </BadgeInfo>

                <FavoriteButton
                  $active={isFav}
                  $animate={recentlyFavorited === badge.id}
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(badge.id); }}
                  aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Heart size={16} fill={isFav ? C.wingPurple : 'none'} />
                </FavoriteButton>
              </BadgeCard>
            );
          })}
        </BadgeGrid>
      )}

      {/* ── Detail Modal ── */}
      {selectedBadge && (
        <ModalOverlay
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-label={`Badge detail: ${selectedBadge.name}`}
        >
          <ModalContent ref={modalRef} onClick={(e) => e.stopPropagation()}>
            <ModalClose onClick={closeModal} aria-label="Close badge detail">
              <X size={20} />
            </ModalClose>

            <ModalImage>
              {!failedImages.has(selectedBadge.id) ? (
                <img src={selectedBadge.url} alt={selectedBadge.name} />
              ) : (
                <PlaceholderBadge style={{ width: 300, height: 300 }}>
                  <Award size={64} />
                  <span>Not yet generated</span>
                </PlaceholderBadge>
              )}
            </ModalImage>

            <ModalDetails>
              <h2>{selectedBadge.name}</h2>
              <DramaSubtitle>A Crystalline Swan Artifact</DramaSubtitle>

              <DetailRow>
                <DetailLabel>Style</DetailLabel>
                <DetailValue>{selectedBadge.styleName}</DetailValue>
              </DetailRow>
              <DetailRow>
                <DetailLabel>Category</DetailLabel>
                <DetailValue>{selectedBadge.categoryName}</DetailValue>
              </DetailRow>
              <DetailRow>
                <DetailLabel>Rarity</DetailLabel>
                <DetailValue>
                  <RarityTag $color={(RARITY_MAP[selectedBadge.rarity] || RARITY_MAP.common).color}>
                    {(RARITY_MAP[selectedBadge.rarity] || RARITY_MAP.common).label}
                  </RarityTag>
                </DetailValue>
              </DetailRow>
              {selectedBadge.skillTree && (
                <DetailRow>
                  <DetailLabel>Skill Tree</DetailLabel>
                  <DetailValue>
                    <Layers size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    {SKILL_TREES.find((s) => s.id === selectedBadge.skillTree)?.name || selectedBadge.skillTree}
                  </DetailValue>
                </DetailRow>
              )}
              <DetailRow>
                <DetailLabel>Source</DetailLabel>
                <DetailValue>{selectedBadge.source === 'achievement' ? 'Achievement Badge' : 'Generic Badge'}</DetailValue>
              </DetailRow>
              <DetailRow>
                <DetailLabel>Filename</DetailLabel>
                <DetailValue><code>{selectedBadge.filename}</code></DetailValue>
              </DetailRow>

              {/* Assign to Achievement - disabled placeholder */}
              <AssignSection>
                <AssignLabel>
                  <ChevronDown size={14} />
                  Assign to Achievement
                </AssignLabel>
                <AssignSelect disabled aria-label="Assign to achievement (coming soon)">
                  <option>Coming soon</option>
                </AssignSelect>
              </AssignSection>

              <ModalActions>
                <ActionButton
                  $variant="primary"
                  onClick={() => toggleFavorite(selectedBadge.id)}
                >
                  <Heart
                    size={16}
                    fill={favorites.has(selectedBadge.id) ? C.wingPurple : 'none'}
                  />
                  {favorites.has(selectedBadge.id) ? 'Favorited' : 'Add to Favorites'}
                </ActionButton>
                <ActionButton $variant="secondary" onClick={closeModal}>
                  Close
                </ActionButton>
              </ModalActions>
            </ModalDetails>
          </ModalContent>
        </ModalOverlay>
      )}
    </GalleryRoot>
  );
};

export default BadgeArtGallery;

// ══════════════════════════════════════════════════════════
// ── Animations ──
// ══════════════════════════════════════════════════════════

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const shimmer = keyframes`
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

const crystalPulse = keyframes`
  0%   { transform: scale(1);   box-shadow: 0 0 0 0 ${hexAlpha(C.wingPurple, 0.4)}; }
  50%  { transform: scale(1.2); box-shadow: 0 0 16px 4px ${hexAlpha(C.wingPurple, 0.6)}; }
  100% { transform: scale(1);   box-shadow: 0 0 0 0 ${hexAlpha(C.wingPurple, 0)}; }
`;

const legendaryBorderShift = keyframes`
  0%   { border-color: ${C.midnightSapphire}; box-shadow: 0 0 12px ${hexAlpha(C.wingPurple, 0.3)}; }
  25%  { border-color: ${C.wingPurple};        box-shadow: 0 0 16px ${hexAlpha(C.wingPurple, 0.5)}; }
  50%  { border-color: ${C.arcticCyan};        box-shadow: 0 0 16px ${hexAlpha(C.arcticCyan, 0.5)}; }
  75%  { border-color: ${C.gildedFern};        box-shadow: 0 0 16px ${hexAlpha(C.gildedFern, 0.5)}; }
  100% { border-color: ${C.midnightSapphire}; box-shadow: 0 0 12px ${hexAlpha(C.wingPurple, 0.3)}; }
`;

// Shared focus style
const wingPurpleFocus = css`
  &:focus-visible {
    outline: 2px solid ${C.wingPurple};
    outline-offset: 2px;
    box-shadow: 0 0 12px ${hexAlpha(C.wingPurple, 0.6)},
                inset 0 0 0 1px ${hexAlpha(C.frostWhite, 0.1)};
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }
`;

// ══════════════════════════════════════════════════════════
// ── Styled Components ──
// ══════════════════════════════════════════════════════════

const GalleryRoot = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
  width: 100%;
  min-height: 100vh;
  animation: ${fadeUp} 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;

  @media (max-width: 768px) {
    padding: 16px;
    gap: 16px;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 0.5rem;
  flex-wrap: wrap;
`;

const IconWrap = styled.div`
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: linear-gradient(
    135deg,
    ${hexAlpha(C.wingPurple, 0.2)},
    ${hexAlpha(C.gildedFern, 0.15)}
  );
  border: 1px solid ${hexAlpha(C.wingPurple, 0.2)};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${C.wingPurple};
  flex-shrink: 0;
`;

const Title = styled.h1`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: ${C.frostWhite};
  margin: 0;
  letter-spacing: -0.02em;

  @media (max-width: 768px) { font-size: 18px; }
`;

const Subtitle = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  color: ${C.textSecondary};
  margin: 4px 0 0;
`;

const DramaSubtitle = styled.p`
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: 16px;
  color: ${C.gildedFern};
  margin: -4px 0 16px 0;
  letter-spacing: 0.02em;
`;

const StatsRow = styled.div`
  display: flex;
  gap: 8px;
  margin-left: auto;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    margin-left: 0;
    width: 100%;
  }
`;

const StatChip = styled.span<{ $color: string }>`
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 8px;
  background: ${({ $color }) => hexAlpha($color, 0.15)};
  color: ${({ $color }) => $color};
  border: 1px solid ${({ $color }) => hexAlpha($color, 0.2)};
`;

const FilterBar = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  padding: 0 0.5rem;
`;

const SearchBox = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 48, 128, 0.4);
  border: 1px solid ${hexAlpha(C.iceWing, 0.15)};
  border-radius: 10px;
  padding: 0 12px;
  flex: 1;
  min-width: 200px;
  min-height: 44px;
  color: ${C.textSecondary};

  input {
    background: none;
    border: none;
    outline: none;
    color: ${C.frostWhite};
    font-family: 'Sora', sans-serif;
    font-size: 14px;
    padding: 10px 0;
    width: 100%;

    &::placeholder { color: ${C.textSecondary}; }
  }

  &:focus-within {
    border-color: ${hexAlpha(C.wingPurple, 0.4)};
    box-shadow: 0 0 12px ${hexAlpha(C.wingPurple, 0.6)},
                inset 0 0 0 1px ${hexAlpha(C.frostWhite, 0.1)};
  }
`;

const ClearButton = styled.button`
  background: none;
  border: none;
  color: ${C.textSecondary};
  cursor: pointer;
  padding: 4px;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  ${wingPurpleFocus}

  &:hover { color: ${C.frostWhite}; }
`;

const FilterSelect = styled.select`
  background: rgba(0, 48, 128, 0.4);
  border: 1px solid ${hexAlpha(C.iceWing, 0.15)};
  border-radius: 10px;
  padding: 10px 12px;
  color: ${C.frostWhite};
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  cursor: pointer;
  min-width: 160px;
  min-height: 44px;
  ${wingPurpleFocus}

  option {
    background: ${C.midnightSapphire};
    color: ${C.frostWhite};
  }
`;

const ToggleButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  background: ${({ $active }) =>
    $active ? hexAlpha(C.wingPurple, 0.25) : 'rgba(0, 48, 128, 0.4)'};
  border: 1px solid ${({ $active }) =>
    $active ? hexAlpha(C.wingPurple, 0.5) : hexAlpha(C.iceWing, 0.15)};
  border-radius: 10px;
  padding: 10px 16px;
  color: ${({ $active }) => ($active ? C.wingPurple : C.frostWhite)};
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 44px;
  ${wingPurpleFocus}

  &:hover {
    border-color: ${hexAlpha(C.wingPurple, 0.4)};
    background: ${hexAlpha(C.wingPurple, 0.15)};
  }
`;

const ResultsBar = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: ${C.textSecondary};
  padding: 0 0.5rem;
`;

const BadgeGrid = styled.div`
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  padding: 0 0.5rem;

  @media (min-width: 430px)  { grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); }
  @media (min-width: 768px)  { grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); }
  @media (min-width: 1024px) { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
  @media (min-width: 1280px) { grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); }
  @media (min-width: 1440px) { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
  @media (min-width: 1920px) { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }
  @media (min-width: 2560px) { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
  @media (min-width: 3840px) { grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
`;

const BadgeCard = styled.div<{ $rarityColor: string; $rarityGlow: string }>`
  position: relative;
  background: rgba(0, 48, 128, 0.35);
  backdrop-filter: blur(12px);
  border: 1.5px solid ${({ $rarityColor }) =>
    $rarityColor.startsWith('url') ? hexAlpha(C.wingPurple, 0.3) : hexAlpha($rarityColor, 0.35)};
  border-radius: 16px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  animation: ${fadeUp} 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 0;

  ${({ $rarityColor }) =>
    $rarityColor.startsWith('url') &&
    css`
      animation: ${fadeUp} 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards,
                 ${legendaryBorderShift} 4s linear infinite;
    `}

  &:hover {
    transform: scale(1.05);
    border-color: ${hexAlpha(C.wingPurple, 0.5)};
    box-shadow:
      0 8px 24px rgba(0, 0, 0, 0.4),
      0 0 20px ${({ $rarityGlow }) => $rarityGlow};
  }

  &:focus-visible {
    outline: 2px solid ${C.wingPurple};
    outline-offset: 2px;
    box-shadow: 0 0 12px ${hexAlpha(C.wingPurple, 0.6)},
                inset 0 0 0 1px ${hexAlpha(C.frostWhite, 0.1)};
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none !important;
    opacity: 1;
    &:hover { transform: none; }
  }
`;

const BadgeImageWrap = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 12px;
  overflow: hidden;
  background: ${hexAlpha(C.midnightSapphire, 0.6)};
  margin-bottom: 10px;
`;

const BadgeImage = styled.img<{ $loaded: boolean }>`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 12px;
  opacity: ${({ $loaded }) => ($loaded ? 1 : 0)};
  transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1);
`;

const PlaceholderBadge = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: ${C.textSecondary};
  font-family: 'Sora', sans-serif;
  font-size: 11px;
`;

const ShimmerBar = styled.div`
  width: 60%;
  height: 8px;
  border-radius: 4px;
  background: linear-gradient(
    90deg,
    ${hexAlpha(C.iceWing, 0.05)} 0%,
    ${hexAlpha(C.iceWing, 0.15)} 50%,
    ${hexAlpha(C.iceWing, 0.05)} 100%
  );
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    background: ${hexAlpha(C.iceWing, 0.1)};
  }
`;

const BadgeInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const BadgeName = styled.span`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: ${C.frostWhite};
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const BadgeMeta = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`;

const StyleTag = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 6px;
  background: ${hexAlpha(C.iceWing, 0.35)};
  border: 1px solid ${hexAlpha(C.iceWing, 0.6)};
  color: ${C.frostWhite};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const CategoryTag = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 6px;
  background: ${hexAlpha(C.gildedFern, 0.85)};
  border: 1px solid ${C.gildedFern};
  color: ${C.midnightSapphire};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const RarityTag = styled.span<{ $color: string }>`
  font-family: 'Fira Code', monospace;
  font-size: 9px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  background: ${({ $color }) =>
    $color.startsWith('url') ? hexAlpha(C.wingPurple, 0.25) : hexAlpha($color, 0.2)};
  color: ${({ $color }) =>
    $color.startsWith('url') ? C.gildedFern : $color};
  border: 1px solid ${({ $color }) =>
    $color.startsWith('url') ? hexAlpha(C.gildedFern, 0.4) : hexAlpha($color, 0.3)};
  text-transform: uppercase;
  letter-spacing: 0.08em;
  width: fit-content;
`;

const FavoriteButton = styled.button<{ $active: boolean; $animate: boolean }>`
  position: absolute;
  top: 8px;
  right: 8px;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  border: none;
  background: ${({ $active }) =>
    $active ? hexAlpha(C.wingPurple, 0.3) : 'rgba(0, 0, 0, 0.4)'};
  backdrop-filter: blur(8px);
  color: ${({ $active }) => ($active ? C.wingPurple : C.frostWhite)};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 2;
  animation: ${({ $animate }) =>
    $animate ? css`${crystalPulse} 0.4s cubic-bezier(0.16, 1, 0.3, 1)` : 'none'};
  ${wingPurpleFocus}

  &:hover {
    transform: scale(1.1);
    background: ${hexAlpha(C.wingPurple, 0.35)};
    color: ${C.wingPurple};
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none !important;
    &:hover { transform: none; }
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 80px 20px;
  color: ${C.textSecondary};
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  text-align: center;

  code {
    font-family: 'Fira Code', monospace;
    font-size: 11px;
    background: rgba(0, 48, 128, 0.4);
    padding: 2px 6px;
    border-radius: 4px;
    color: ${C.iceWing};
  }
`;

const CodeBlock = styled.code`
  font-family: 'Fira Code', monospace;
  font-size: 13px;
  background: rgba(0, 48, 128, 0.4);
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid ${hexAlpha(C.iceWing, 0.15)};
  color: ${C.iceWing};
`;

// ── Skeleton Loader ──

const SkeletonGrid = styled.div`
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  padding: 0 0.5rem;

  @media (min-width: 768px)  { grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); }
  @media (min-width: 1280px) { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
`;

const SkeletonCard = styled.div`
  background: rgba(0, 48, 128, 0.25);
  border: 1px solid ${hexAlpha(C.iceWing, 0.08)};
  border-radius: 16px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const SkeletonImage = styled.div`
  width: 100%;
  aspect-ratio: 1;
  border-radius: 12px;
  background: ${hexAlpha(C.midnightSapphire, 0.4)};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const SkeletonText = styled.div`
  display: flex;
  align-items: center;
`;

// ── Modal ──

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 24px;
  animation: ${fadeIn} 0.2s ease;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const ModalContent = styled.div`
  position: relative;
  background: rgba(0, 32, 96, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid ${hexAlpha(C.wingPurple, 0.3)};
  border-radius: 24px;
  padding: 32px;
  max-width: 640px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
  box-shadow:
    0 24px 64px rgba(0, 0, 0, 0.5),
    0 0 32px ${hexAlpha(C.wingPurple, 0.1)};
  animation: ${fadeUp} 0.3s cubic-bezier(0.16, 1, 0.3, 1);

  @media (max-width: 768px) {
    padding: 20px;
    margin: 12px;
    border-radius: 20px;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const ModalClose = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  border: 1px solid ${hexAlpha(C.iceWing, 0.15)};
  background: rgba(0, 48, 128, 0.4);
  color: ${C.frostWhite};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 2;
  ${wingPurpleFocus}

  &:hover {
    background: ${hexAlpha(C.wingPurple, 0.2)};
    border-color: ${hexAlpha(C.wingPurple, 0.4)};
  }
`;

const ModalImage = styled.div`
  width: 100%;
  max-height: 400px;
  border-radius: 16px;
  overflow: hidden;
  background: ${hexAlpha(C.midnightSapphire, 0.6)};
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    max-height: 400px;
  }
`;

const ModalDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;

  h2 {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 20px;
    font-weight: 700;
    color: ${C.frostWhite};
    margin: 0;
    text-transform: capitalize;
  }
`;

const DetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid ${hexAlpha(C.iceWing, 0.08)};
`;

const DetailLabel = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: ${C.textSecondary};
`;

const DetailValue = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: ${C.frostWhite};
  display: flex;
  align-items: center;

  code {
    font-family: 'Fira Code', monospace;
    font-size: 11px;
    background: rgba(0, 48, 128, 0.4);
    padding: 2px 6px;
    border-radius: 4px;
  }
`;

const AssignSection = styled.div`
  margin-top: 8px;
  padding: 12px;
  border-radius: 12px;
  background: ${hexAlpha(C.royalDepth, 0.4)};
  border: 1px solid ${hexAlpha(C.iceWing, 0.1)};
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const AssignLabel = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: ${C.textSecondary};
  display: flex;
  align-items: center;
  gap: 6px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const AssignSelect = styled.select`
  background: rgba(0, 48, 128, 0.3);
  border: 1px solid ${hexAlpha(C.iceWing, 0.1)};
  border-radius: 8px;
  padding: 10px 12px;
  color: ${C.textSecondary};
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  min-height: 44px;
  cursor: not-allowed;
  opacity: 0.6;
  ${wingPurpleFocus}

  option {
    background: ${C.midnightSapphire};
    color: ${C.frostWhite};
  }
`;

const ModalActions = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 8px;
  flex-wrap: wrap;
`;

const ActionButton = styled.button<{ $variant: 'primary' | 'secondary' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 12px;
  border: 1px solid ${({ $variant }) =>
    $variant === 'primary'
      ? hexAlpha(C.wingPurple, 0.4)
      : hexAlpha(C.iceWing, 0.15)};
  background: ${({ $variant }) =>
    $variant === 'primary'
      ? hexAlpha(C.wingPurple, 0.2)
      : 'rgba(0, 48, 128, 0.4)'};
  color: ${({ $variant }) =>
    $variant === 'primary' ? C.wingPurple : C.frostWhite};
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 44px;
  flex: 1;
  ${wingPurpleFocus}

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px ${hexAlpha(C.wingPurple, 0.2)};
  }

  @media (prefers-reduced-motion: reduce) {
    &:hover { transform: none; }
  }
`;
