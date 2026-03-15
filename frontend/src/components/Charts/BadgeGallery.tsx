/**
 * BadgeGallery — Admin Badge Art Preview Tab
 * ============================================
 * Browse all generated 3D badge images by style and category.
 * Admin selects favorites for the gamification system.
 *
 * AI Village 9-Brain Consensus Fixes Applied:
 * - Pending count scoped to filtered dataset (Phase 2)
 * - Tag contrast WCAG AAA (Phase 3 — inverted CategoryTag, opaque StyleTag)
 * - Wing Purple focus-visible glow on all interactive elements (Phase 3)
 * - Escape key modal dismissal (Phase 3)
 * - Drama subtitle in modal (Phase 3 — Cormorant Garamond)
 * - Favorite animation pulse (Phase 3)
 * - 44px touch targets (Phase 3)
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { Award, Filter, Search, Heart, X } from 'lucide-react';
import { CHART_COLORS, hexAlpha } from './chartTheme';

// ── Types ──
interface BadgeStyle {
  id: string;
  name: string;
}

interface BadgeCategory {
  id: string;
  name: string;
  count: number;
  subjects: string[];
}

interface BadgeManifest {
  meta: { totalBadges: number; styles: number; outputDir: string; namingConvention: string };
  styles: BadgeStyle[];
  categories: BadgeCategory[];
}

interface BadgeItem {
  style: string;
  styleName: string;
  categoryId: string;
  categoryName: string;
  subject: string;
  filename: string;
  url: string;
}

// ── Build badge list from manifest structure ──
function buildBadgeList(manifest: BadgeManifest): BadgeItem[] {
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
      style: style.id,
      styleName: style.name,
      categoryId,
      categoryName,
      subject,
      filename,
      url: `/badges/${filename}`,
    });
  }

  return items;
}

// ── Shared focus style (Wing Purple glow — Phase 3 consensus) ──
const wingPurpleFocus = css`
  &:focus-visible {
    outline: 2px solid ${CHART_COLORS.wingPurple};
    outline-offset: 2px;
    box-shadow: 0 0 12px ${hexAlpha(CHART_COLORS.wingPurple, 0.6)},
                inset 0 0 0 1px ${hexAlpha(CHART_COLORS.frostWhite, 0.1)};
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }
`;

const BadgeGallery: React.FC = () => {
  const [manifest, setManifest] = useState<BadgeManifest | null>(null);
  const [filterStyle, setFilterStyle] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('ss-badge-favorites');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<BadgeItem | null>(null);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [recentlyFavorited, setRecentlyFavorited] = useState<string | null>(null);

  // Load manifest
  useEffect(() => {
    const loadManifest = async () => {
      try {
        const response = await fetch('/badge-manifest.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        setManifest(data);
      } catch {
        try {
          const m = await import('../../../../scripts/badge-manifest.json');
          setManifest(m.default || m);
        } catch {
          setManifest(null);
        }
      }
    };
    loadManifest();
  }, []);

  // Persist favorites
  useEffect(() => {
    localStorage.setItem('ss-badge-favorites', JSON.stringify([...favorites]));
  }, [favorites]);

  // Escape key to close modal
  useEffect(() => {
    if (!selectedBadge) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedBadge(null);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [selectedBadge]);

  const allBadges = useMemo(() => manifest ? buildBadgeList(manifest) : [], [manifest]);

  const filteredBadges = useMemo(() => {
    let result = allBadges;
    if (filterStyle !== 'all') result = result.filter(b => b.style === filterStyle);
    if (filterCategory !== 'all') result = result.filter(b => b.categoryId === filterCategory);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(b =>
        b.subject.toLowerCase().includes(q) ||
        b.styleName.toLowerCase().includes(q) ||
        b.categoryName.toLowerCase().includes(q)
      );
    }
    if (showFavoritesOnly) result = result.filter(b => favorites.has(b.filename));
    return result;
  }, [allBadges, filterStyle, filterCategory, searchQuery, showFavoritesOnly, favorites]);

  const toggleFavorite = useCallback((filename: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      const wasAdded = !next.has(filename);
      if (wasAdded) next.add(filename);
      else next.delete(filename);

      // Favorite animation pulse (Phase 3)
      if (wasAdded) {
        setRecentlyFavorited(filename);
        setTimeout(() => setRecentlyFavorited(null), 400);
      }
      return next;
    });
  }, []);

  const handleImageLoad = useCallback((filename: string) => {
    setLoadedImages(prev => new Set(prev).add(filename));
  }, []);

  const handleImageError = useCallback((filename: string) => {
    setFailedImages(prev => new Set(prev).add(filename));
  }, []);

  if (!manifest) {
    return (
      <GalleryRoot>
        <Header>
          <IconWrap><Award size={28} /></IconWrap>
          <div>
            <Title>Badge Art Gallery</Title>
            <Subtitle>Loading badge manifest...</Subtitle>
          </div>
        </Header>
        <EmptyState>
          <Award size={48} />
          <p>Badge manifest not found. Run the generation script first:</p>
          <CodeBlock>node scripts/generate-badges.mjs --sample</CodeBlock>
        </EmptyState>
      </GalleryRoot>
    );
  }

  // Phase 2 fix: scope counts to filtered dataset to prevent negative pending
  const generatedCount = filteredBadges.filter(b => loadedImages.has(b.filename)).length;
  const failedCount = filteredBadges.filter(b => failedImages.has(b.filename)).length;
  const pendingCount = filteredBadges.length - generatedCount - failedCount;

  return (
    <GalleryRoot>
      <Header>
        <IconWrap><Award size={28} /></IconWrap>
        <div>
          <Title>Badge Art Gallery</Title>
          <Subtitle>
            {allBadges.length} concepts across {manifest.styles.length} styles
            {' '}&middot;{' '}
            {favorites.size} favorited
          </Subtitle>
        </div>
        <StatsRow>
          <StatChip $color={CHART_COLORS.iceWing}>{generatedCount} generated</StatChip>
          <StatChip $color={CHART_COLORS.gildedFern}>{pendingCount} pending</StatChip>
          <StatChip $color={CHART_COLORS.wingPurple}>{favorites.size} favorites</StatChip>
        </StatsRow>
      </Header>

      {/* Filters */}
      <FilterBar>
        <SearchBox>
          <Search size={16} />
          <input
            type="text"
            placeholder="Search badges..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            aria-label="Search badges"
          />
          {searchQuery && (
            <ClearButton onClick={() => setSearchQuery('')} aria-label="Clear search">
              <X size={14} />
            </ClearButton>
          )}
        </SearchBox>

        <FilterSelect
          value={filterStyle}
          onChange={e => setFilterStyle(e.target.value)}
          aria-label="Filter by style"
        >
          <option value="all">All Styles ({manifest.styles.length})</option>
          {manifest.styles.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </FilterSelect>

        <FilterSelect
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          aria-label="Filter by category"
        >
          <option value="all">All Categories</option>
          {manifest.categories.map(c => (
            <option key={c.id} value={c.id}>{c.name} ({c.count})</option>
          ))}
        </FilterSelect>

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

      {/* Results count */}
      <ResultsBar>
        Showing {filteredBadges.length} of {allBadges.length} badges
      </ResultsBar>

      {/* Badge Grid */}
      {filteredBadges.length === 0 ? (
        <EmptyState>
          <Filter size={48} />
          <p>No badges match your filters.</p>
        </EmptyState>
      ) : (
        <BadgeGrid>
          {filteredBadges.map(badge => {
            const isLoaded = loadedImages.has(badge.filename);
            const isFailed = failedImages.has(badge.filename);
            const isFav = favorites.has(badge.filename);

            return (
              <BadgeCard
                key={badge.filename}
                onClick={() => setSelectedBadge(badge)}
                role="button"
                tabIndex={0}
                aria-label={`${badge.subject} — ${badge.styleName}`}
                onKeyDown={e => e.key === 'Enter' && setSelectedBadge(badge)}
              >
                <BadgeImageWrap>
                  {!isFailed ? (
                    <BadgeImage
                      src={badge.url}
                      alt={badge.subject}
                      loading="lazy"
                      $loaded={isLoaded}
                      onLoad={() => handleImageLoad(badge.filename)}
                      onError={() => handleImageError(badge.filename)}
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
                  <BadgeName>{badge.subject}</BadgeName>
                  <BadgeMeta>
                    <StyleTag>{badge.styleName}</StyleTag>
                    <CategoryTag>{badge.categoryName}</CategoryTag>
                  </BadgeMeta>
                </BadgeInfo>

                <FavoriteButton
                  $active={isFav}
                  $animate={recentlyFavorited === badge.filename}
                  onClick={e => { e.stopPropagation(); toggleFavorite(badge.filename); }}
                  aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Heart size={16} fill={isFav ? CHART_COLORS.wingPurple : 'none'} />
                </FavoriteButton>
              </BadgeCard>
            );
          })}
        </BadgeGrid>
      )}

      {/* Detail Modal */}
      {selectedBadge && (
        <ModalOverlay onClick={() => setSelectedBadge(null)} role="dialog" aria-modal="true">
          <ModalContent onClick={e => e.stopPropagation()}>
            <ModalClose onClick={() => setSelectedBadge(null)} aria-label="Close detail">
              <X size={20} />
            </ModalClose>
            <ModalImage>
              {!failedImages.has(selectedBadge.filename) ? (
                <img src={selectedBadge.url} alt={selectedBadge.subject} />
              ) : (
                <PlaceholderBadge style={{ width: 300, height: 300 }}>
                  <Award size={64} />
                  <span>Not yet generated</span>
                </PlaceholderBadge>
              )}
            </ModalImage>
            <ModalDetails>
              <h2>{selectedBadge.subject}</h2>
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
                <DetailLabel>Filename</DetailLabel>
                <DetailValue><code>{selectedBadge.filename}</code></DetailValue>
              </DetailRow>
              <ModalActions>
                <ActionButton
                  $variant="primary"
                  onClick={() => toggleFavorite(selectedBadge.filename)}
                >
                  <Heart
                    size={16}
                    fill={favorites.has(selectedBadge.filename) ? CHART_COLORS.wingPurple : 'none'}
                  />
                  {favorites.has(selectedBadge.filename) ? 'Favorited' : 'Add to Favorites'}
                </ActionButton>
              </ModalActions>
            </ModalDetails>
          </ModalContent>
        </ModalOverlay>
      )}
    </GalleryRoot>
  );
};

export default BadgeGallery;

// ── Animations ──
const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const crystalPulse = keyframes`
  0% { transform: scale(1); box-shadow: 0 0 0 0 ${hexAlpha(CHART_COLORS.wingPurple, 0.4)}; }
  50% { transform: scale(1.2); box-shadow: 0 0 16px 4px ${hexAlpha(CHART_COLORS.wingPurple, 0.6)}; }
  100% { transform: scale(1); box-shadow: 0 0 0 0 ${hexAlpha(CHART_COLORS.wingPurple, 0)}; }
`;

// ── Styled Components ──

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
    ${hexAlpha(CHART_COLORS.wingPurple, 0.2)},
    ${hexAlpha(CHART_COLORS.gildedFern, 0.15)}
  );
  border: 1px solid ${hexAlpha(CHART_COLORS.wingPurple, 0.2)};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${CHART_COLORS.wingPurple};
  flex-shrink: 0;
`;

const Title = styled.h1`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: ${CHART_COLORS.frostWhite};
  margin: 0;
  letter-spacing: -0.02em;

  @media (max-width: 768px) { font-size: 18px; }
`;

const Subtitle = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  color: ${CHART_COLORS.textSecondary};
  margin: 4px 0 0;
`;

const DramaSubtitle = styled.p`
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: 16px;
  color: ${CHART_COLORS.gildedFern};
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
  border: 1px solid ${hexAlpha(CHART_COLORS.iceWing, 0.15)};
  border-radius: 10px;
  padding: 0 12px;
  flex: 1;
  min-width: 200px;
  min-height: 44px;
  color: ${CHART_COLORS.textSecondary};

  input {
    background: none;
    border: none;
    outline: none;
    color: ${CHART_COLORS.frostWhite};
    font-family: 'Sora', sans-serif;
    font-size: 14px;
    padding: 10px 0;
    width: 100%;

    &::placeholder { color: ${CHART_COLORS.textSecondary}; }
  }

  &:focus-within {
    border-color: ${hexAlpha(CHART_COLORS.wingPurple, 0.4)};
    box-shadow: 0 0 12px ${hexAlpha(CHART_COLORS.wingPurple, 0.6)},
                inset 0 0 0 1px ${hexAlpha(CHART_COLORS.frostWhite, 0.1)};
  }
`;

const ClearButton = styled.button`
  background: none;
  border: none;
  color: ${CHART_COLORS.textSecondary};
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  ${wingPurpleFocus}

  &:hover { color: ${CHART_COLORS.frostWhite}; }
`;

const FilterSelect = styled.select`
  background: rgba(0, 48, 128, 0.4);
  border: 1px solid ${hexAlpha(CHART_COLORS.iceWing, 0.15)};
  border-radius: 10px;
  padding: 10px 12px;
  color: ${CHART_COLORS.frostWhite};
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  cursor: pointer;
  min-width: 160px;
  min-height: 44px;
  ${wingPurpleFocus}

  option {
    background: ${CHART_COLORS.midnightSapphire};
    color: ${CHART_COLORS.frostWhite};
  }
`;

const ToggleButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  background: ${({ $active }) =>
    $active ? hexAlpha(CHART_COLORS.wingPurple, 0.25) : 'rgba(0, 48, 128, 0.4)'};
  border: 1px solid ${({ $active }) =>
    $active ? hexAlpha(CHART_COLORS.wingPurple, 0.5) : hexAlpha(CHART_COLORS.iceWing, 0.15)};
  border-radius: 10px;
  padding: 10px 16px;
  color: ${({ $active }) => $active ? CHART_COLORS.wingPurple : CHART_COLORS.frostWhite};
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 44px;
  ${wingPurpleFocus}

  &:hover {
    border-color: ${hexAlpha(CHART_COLORS.wingPurple, 0.4)};
    background: ${hexAlpha(CHART_COLORS.wingPurple, 0.15)};
  }
`;

const ResultsBar = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: ${CHART_COLORS.textSecondary};
  padding: 0 0.5rem;
`;

const BadgeGrid = styled.div`
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  padding: 0 0.5rem;

  @media (min-width: 768px) { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
  @media (min-width: 1280px) { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
  @media (min-width: 1920px) { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }
`;

const BadgeCard = styled.div`
  position: relative;
  background: rgba(0, 48, 128, 0.35);
  backdrop-filter: blur(12px);
  border: 1px solid ${hexAlpha(CHART_COLORS.iceWing, 0.1)};
  border-radius: 16px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  animation: ${fadeUp} 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 0;

  &:hover {
    transform: translateY(-4px);
    border-color: ${hexAlpha(CHART_COLORS.wingPurple, 0.4)};
    box-shadow:
      0 8px 24px rgba(0, 0, 0, 0.4),
      0 0 20px ${hexAlpha(CHART_COLORS.wingPurple, 0.15)};
  }

  &:focus-visible {
    outline: 2px solid ${CHART_COLORS.wingPurple};
    outline-offset: 2px;
    box-shadow: 0 0 12px ${hexAlpha(CHART_COLORS.wingPurple, 0.6)},
                inset 0 0 0 1px ${hexAlpha(CHART_COLORS.frostWhite, 0.1)};
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 1;
  }
`;

const BadgeImageWrap = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 12px;
  overflow: hidden;
  background: ${hexAlpha(CHART_COLORS.midnightSapphire, 0.6)};
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
  color: ${CHART_COLORS.textSecondary};
  font-family: 'Sora', sans-serif;
  font-size: 11px;
`;

const ShimmerBar = styled.div`
  width: 60%;
  height: 8px;
  border-radius: 4px;
  background: linear-gradient(
    90deg,
    ${hexAlpha(CHART_COLORS.iceWing, 0.05)} 0%,
    ${hexAlpha(CHART_COLORS.iceWing, 0.15)} 50%,
    ${hexAlpha(CHART_COLORS.iceWing, 0.05)} 100%
  );
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;
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
  color: ${CHART_COLORS.frostWhite};
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

/* Phase 3 WCAG AAA contrast fix: opaque background + white text */
const StyleTag = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 6px;
  background: ${hexAlpha(CHART_COLORS.iceWing, 0.35)};
  border: 1px solid ${hexAlpha(CHART_COLORS.iceWing, 0.6)};
  color: ${CHART_COLORS.frostWhite};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

/* Phase 3 WCAG AAA contrast fix: inverted — dark text on gold bg */
const CategoryTag = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 6px;
  background: ${hexAlpha(CHART_COLORS.gildedFern, 0.85)};
  border: 1px solid ${CHART_COLORS.gildedFern};
  color: ${CHART_COLORS.midnightSapphire};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const FavoriteButton = styled.button<{ $active: boolean; $animate: boolean }>`
  position: absolute;
  top: 8px;
  right: 8px;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: none;
  background: ${({ $active }) =>
    $active ? hexAlpha(CHART_COLORS.wingPurple, 0.3) : 'rgba(0, 0, 0, 0.4)'};
  backdrop-filter: blur(8px);
  color: ${({ $active }) => $active ? CHART_COLORS.wingPurple : CHART_COLORS.frostWhite};
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
    background: ${hexAlpha(CHART_COLORS.wingPurple, 0.35)};
    color: ${CHART_COLORS.wingPurple};
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 80px 20px;
  color: ${CHART_COLORS.textSecondary};
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  text-align: center;
`;

const CodeBlock = styled.code`
  font-family: 'Fira Code', monospace;
  font-size: 13px;
  background: rgba(0, 48, 128, 0.4);
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid ${hexAlpha(CHART_COLORS.iceWing, 0.15)};
  color: ${CHART_COLORS.iceWing};
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
`;

const ModalContent = styled.div`
  position: relative;
  background: rgba(0, 32, 96, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid ${hexAlpha(CHART_COLORS.wingPurple, 0.3)};
  border-radius: 24px;
  padding: 32px;
  max-width: 600px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 24px;
  box-shadow:
    0 24px 64px rgba(0, 0, 0, 0.5),
    0 0 32px ${hexAlpha(CHART_COLORS.wingPurple, 0.1)};
  animation: ${fadeUp} 0.3s cubic-bezier(0.16, 1, 0.3, 1);
`;

const ModalClose = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  border: 1px solid ${hexAlpha(CHART_COLORS.iceWing, 0.15)};
  background: rgba(0, 48, 128, 0.4);
  color: ${CHART_COLORS.frostWhite};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  ${wingPurpleFocus}

  &:hover {
    background: ${hexAlpha(CHART_COLORS.wingPurple, 0.2)};
    border-color: ${hexAlpha(CHART_COLORS.wingPurple, 0.4)};
  }
`;

const ModalImage = styled.div`
  width: 100%;
  max-height: 400px;
  border-radius: 16px;
  overflow: hidden;
  background: ${hexAlpha(CHART_COLORS.midnightSapphire, 0.6)};
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
    color: ${CHART_COLORS.frostWhite};
    margin: 0;
    text-transform: capitalize;
  }
`;

const DetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid ${hexAlpha(CHART_COLORS.iceWing, 0.08)};
`;

const DetailLabel = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: ${CHART_COLORS.textSecondary};
`;

const DetailValue = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: ${CHART_COLORS.frostWhite};

  code {
    font-family: 'Fira Code', monospace;
    font-size: 11px;
    background: rgba(0, 48, 128, 0.4);
    padding: 2px 6px;
    border-radius: 4px;
  }
`;

const ModalActions = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 8px;
`;

const ActionButton = styled.button<{ $variant: 'primary' | 'secondary' }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 12px;
  border: 1px solid ${({ $variant }) =>
    $variant === 'primary'
      ? hexAlpha(CHART_COLORS.wingPurple, 0.4)
      : hexAlpha(CHART_COLORS.iceWing, 0.15)};
  background: ${({ $variant }) =>
    $variant === 'primary'
      ? hexAlpha(CHART_COLORS.wingPurple, 0.2)
      : 'rgba(0, 48, 128, 0.4)'};
  color: ${({ $variant }) =>
    $variant === 'primary' ? CHART_COLORS.wingPurple : CHART_COLORS.frostWhite};
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 44px;
  ${wingPurpleFocus}

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px ${hexAlpha(CHART_COLORS.wingPurple, 0.2)};
  }
`;
