/**
 * Video V-next — orchestrator. Renders THROUGH the lens frame (so `--world-*`/`--lens-*` resolve +
 * `[data-style-lens-shell]` exists for the gate's contract check) + the `.video-vnext-shell` token scope.
 * The signature moment is the VideoRefractionHero (channel-split) + the SEMANTIC VideoGlassCard grid
 * (locked→diffuse, unlocked→clear+fringe). Chrome (controls, pagination) stays monastic. Data/auth is the
 * REUSED VideoLibraryV3 logic (bind-only, /api/v2/videos untouched). Wording frozen from V3.
 */
import { useMemo } from 'react';
import styled from 'styled-components';
import SeoHead from '../../components/seo/SeoHead';
import { VideoLensFrame } from './videoManifest';
import { VideoVNextTokens } from './video.tokens';
import { useVideoLibrary } from './useVideoLibrary';
import { VideoRefractionHero } from './VideoRefractionHero';
import { VideoControls } from './VideoControls';
import { VideoGlassCard } from './VideoGlassCard';
import { VideoPagination } from './VideoPagination';

const HERO_SUB = 'Find the right movement demo, coaching lesson, or member story before the next set starts.';

const Main = styled.main`
  position: relative;
  min-height: 100vh;
  background: var(--video-bg);
  color: var(--video-ink);
`;
const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
  max-width: 1200px;
  margin: 0 auto;
  padding: 8px var(--video-pad, 24px) 0;
`;
const State = styled.p`
  max-width: 1200px;
  margin: 8vh auto;
  text-align: center;
  color: var(--video-ink-2);
  padding: 0 var(--video-pad, 24px);
`;
const Skeleton = styled.div`
  aspect-ratio: 16 / 9;
  border-radius: var(--video-r-card, 16px);
  background: var(--video-glass);
  border: 1px solid var(--video-ice-14);
`;

export default function VideoLibraryVNext() {
  const lib = useVideoLibrary();
  const contentTypes = useMemo(
    () => Array.from(new Set(lib.videos.map((v) => v.contentType).filter(Boolean))).sort(),
    [lib.videos],
  );

  return (
    <VideoLensFrame>
      <VideoVNextTokens />
      <div className="video-vnext-shell" data-testid="video-vnext-root">
        <Main>
          <SeoHead
            title="Video Library | SwanStudios"
            description="Movement demos, coaching lessons, and member stories from SwanStudios."
            path="/videos"
          />
          <VideoRefractionHero title="Video Library" subtitle={HERO_SUB} />
          <VideoControls
            contentTypes={contentTypes}
            contentType={lib.contentType}
            onContentType={lib.setContentType}
            onSearch={lib.submitSearch}
          />

          {lib.loading ? (
            <Grid aria-hidden="true">
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} />
              ))}
            </Grid>
          ) : lib.error ? (
            <State data-testid="video-error">{lib.error}</State>
          ) : lib.videos.length === 0 ? (
            <State data-testid="video-empty">No videos match your search yet. Try clearing the filters.</State>
          ) : (
            <>
              <Grid data-testid="video-grid">
                {lib.videos.map((v) => (
                  <VideoGlassCard key={v.id} video={v} />
                ))}
              </Grid>
              <VideoPagination page={lib.pagination.page} totalPages={lib.pagination.totalPages} onPage={lib.goToPage} />
            </>
          )}
        </Main>
      </div>
    </VideoLensFrame>
  );
}
