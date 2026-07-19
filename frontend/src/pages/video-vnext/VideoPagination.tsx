/**
 * Video V-next — VideoPagination (Kimi (b)7: monastic chrome). Solid, quiet pills — no glass, no glow.
 * Reuses the shipped `getVisiblePaginationPages` window logic. 44px targets; current page marked aria-current.
 */
import styled from 'styled-components';
import { getVisiblePaginationPages } from '../VideoLibraryV3.logic';

const Row = styled.nav`
  display: flex;
  gap: 6px;
  justify-content: center;
  flex-wrap: wrap;
  padding: 24px var(--video-pad, 24px) 64px;
`;
const Pill = styled.button<{ $active: boolean }>`
  min-width: var(--video-target, 44px);
  min-height: var(--video-target, 44px);
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid ${({ $active }) => ($active ? 'var(--video-ice)' : 'var(--video-ice-14)')};
  background: ${({ $active }) => ($active ? 'var(--video-ice-14)' : 'var(--video-surface)')};
  color: var(--video-ink);
  font: 600 14px / 1 var(--video-font-display, inherit);
  cursor: pointer;
  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`;

export function VideoPagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const pages = getVisiblePaginationPages({ page, totalPages, total: 0 });
  return (
    <Row aria-label="Pagination">
      <Pill $active={false} onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page">
        ‹
      </Pill>
      {pages.map((p) => (
        <Pill key={p} $active={p === page} onClick={() => onPage(p)} aria-current={p === page ? 'page' : undefined}>
          {p}
        </Pill>
      ))}
      <Pill $active={false} onClick={() => onPage(page + 1)} disabled={page >= totalPages} aria-label="Next page">
        ›
      </Pill>
    </Row>
  );
}
