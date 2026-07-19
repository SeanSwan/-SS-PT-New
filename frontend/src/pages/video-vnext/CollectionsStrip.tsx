/**
 * Video V-next — CollectionsStrip. Preserves V3's collections feature (the vNext hook already fetches them;
 * flag-on would otherwise silently drop them). Monastic quiet chips (no glass/fringe — chrome stays silent),
 * horizontal scroll-snap on mobile, one link each → getCollectionPath. 44px targets.
 */
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import type { CollectionItem } from '../VideoLibraryV3.types';
import { getCollectionPath } from '../VideoLibraryV3.logic';

const Section = styled.section`
  max-width: 1200px;
  margin: 0 auto;
  padding: 8px var(--video-pad, 24px) 0;
`;
const Head = styled.h2`
  margin: 0 0 10px;
  font: 700 14px / 1 var(--video-font-display, inherit);
  letter-spacing: 0.04em;
  color: var(--video-ink-2);
  text-transform: uppercase;
`;
const Strip = styled.ul`
  display: flex;
  gap: 10px;
  margin: 0;
  padding: 0 0 6px;
  list-style: none;
  overflow-x: auto;
  scroll-snap-type: x proximity;
  scrollbar-width: thin;
`;
const Chip = styled(Link)`
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 0 0 auto;
  scroll-snap-align: start;
  min-height: var(--video-target, 44px);
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid var(--video-ice-14);
  background: var(--video-surface);
  color: var(--video-ink);
  text-decoration: none;
  transition: border-color 160ms var(--video-ease-standard);
  &:hover {
    border-color: color-mix(in oklab, var(--video-ice) 40%, transparent);
  }
`;
const Name = styled.span`
  font: 600 14px / 1.2 var(--video-font-display, inherit);
  white-space: nowrap;
`;
const Count = styled.span`
  font-size: 12px;
  color: var(--video-ink-2);
`;

export function CollectionsStrip({ collections }: { collections: CollectionItem[] }) {
  const linkedCollections = collections.flatMap((collection) => {
    const path = getCollectionPath(collection.slug);
    return path ? [{ collection, path }] : [];
  });
  if (!linkedCollections.length) return null;
  return (
    <Section aria-label="Collections">
      <Head>Collections</Head>
      <Strip>
        {linkedCollections.map(({ collection, path }) => (
          <li key={collection.id}>
            <Chip to={path}>
              <Name>{collection.title}</Name>
              <Count>{collection.videoCount} video{collection.videoCount === 1 ? '' : 's'}</Count>
            </Chip>
          </li>
        ))}
      </Strip>
    </Section>
  );
}
