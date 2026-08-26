/**
 * ============================================================================
 * FILE: AtelierLibrary.tsx
 * PURPOSE: Assets — everything Compose has ever made, findable again.
 * ============================================================================
 *
 * WHY THIS EXISTS. Compose renders four candidates. One gets picked, bound to
 * Motion, published. The other three became rows nothing could list, filter or
 * reach — real work, real GPU time, invisible forever. Every slice before this
 * one made assets; none made them findable.
 *
 * NOT THE SAME AS "Video Library". That tab (VideoLibraryV3) lists the exercise
 * and marketing video COLLECTIONS from /api/v2/videos. This lists what the
 * studio GENERATED. Two surfaces, two names, on purpose — a shared label would
 * have people looking for their renders in the wrong place.
 *
 * HONESTY RULES (pinned by AtelierLibrary.test.tsx):
 *   1. An empty list says WHICH — nothing made yet, or nothing matching the
 *      filter. "No assets" under an active filter reads as lost work.
 *   2. A failed load is never rendered as an empty library, for the same reason.
 *   3. Filter options come from the server's brand kits, not a constant here.
 *   4. Paging is a cursor the server issued; there is no page-number arithmetic
 *      in this file to get wrong.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Image as ImageIcon, RefreshCw, Filter } from 'lucide-react';
import type { AxiosInstance } from 'axios';
import type { BrandKitView, LimitsView } from './AtelierCompose.types';
import {
  Panel, Card, CardTitle, CardHint, QuietButton, Field, Caption, Select, Notice, Workspace,
} from './AtelierCompose.styles';
import { AssetGrid, AssetCard, AssetThumb, AssetImage, AssetMeta, FilterRow } from './AtelierLibrary.styles';

export interface LibraryAsset {
  id: string; kind: string; mime: string;
  width: number | null; height: number | null; sizeBytes: number | null;
  status: 'draft' | 'approved' | 'published';
  createdAt: string;
  brandKit: string | null; brandKitHash: string | null;
  workspaceId: string | null; lane: string | null; seed: number | null;
  prompt: string | null; promptTruncated: boolean;
  /** Short-lived signed URL, or null when the object would not sign. Null is a degraded
   *  card that falls back to dimensions — never an error, never an empty page. */
  previewUrl: string | null;
}

interface Page {
  assets: LibraryAsset[]; hasMore: boolean; nextCursor: string | null; pageSize: number;
  /** Every image on the page failed to sign — a broken signer, not broken objects. */
  previewsUnavailable?: boolean;
}

/** The empty state has to say WHICH emptiness it is. */
export function describeEmpty(filtered: boolean, configured = true): string {
  // Three different emptinesses, and telling a person the wrong one is the whole problem.
  // "You have made nothing" is the most alarming thing a studio can say, so it is only
  // ever said when it is actually true.
  if (!configured) return 'The library could not be reached — this is a connection problem, not an empty library.';
  return filtered
    ? 'Nothing matches these filters. Your other assets are still here — clear a filter to see them.'
    : 'Nothing here yet. Anything Compose renders lands in this library automatically.';
}

const AtelierLibrary: React.FC<{ api: AxiosInstance | null }> = ({ api }) => {
  const [assets, setAssets] = useState<LibraryAsset[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kits, setKits] = useState<BrandKitView[]>([]);
  const [brandKit, setBrandKit] = useState('');
  const [status, setStatus] = useState('');
  // Per-asset, because an expired URL is a fact about one card, not the page.
  const [broken, setBroken] = useState<Record<string, boolean>>({});
  const [previewsDown, setPreviewsDown] = useState(false);
  const filtered = Boolean(brandKit || status);

  useEffect(() => {
    if (!api) return;
    api.get('/api/atelier/compose/limits')
      .then((r) => setKits(((r.data?.data ?? {}) as LimitsView).brandKits ?? []))
      .catch(() => { /* the picker degrades to "any brand"; the list still works */ });
  }, [api]);

  const load = useCallback(async (append: string | null) => {
    if (!api) return;
    setBusy(true);
    if (!append) {
      setError(null);
      // A fresh page means freshly signed URLs, so previously-expired cards must be given
      // another chance. Without this, Refresh — the exact action a person takes when a
      // preview has gone stale — returns a working URL to a card that still refuses to
      // render it, and the placeholder is permanent until the tab is reloaded.
      setBroken({});
    }
    try {
      const params: Record<string, string> = {};
      if (brandKit) params.brandKit = brandKit;
      if (status) params.status = status;
      if (append) params.cursor = append;
      const r = await api.get('/api/atelier/compose/assets', { params });
      const page = (r.data?.data ?? {}) as Page;
      setAssets((prev) => (append ? [...prev, ...(page.assets ?? [])] : (page.assets ?? [])));
      setHasMore(Boolean(page.hasMore));
      setPreviewsDown(Boolean(page.previewsUnavailable));
      setCursor(page.nextCursor ?? null);
    } catch (e) {
      const err = e as { response?: { data?: { error?: string } } };
      // NEVER fall through to an empty list: "you have made nothing" is a lie about
      // someone's work, and it is the most alarming possible way to report a 500.
      setError(err.response?.data?.error || 'The library could not be loaded. Your assets are safe; this is a read failure.');
      if (!append) { setAssets([]); setHasMore(false); setCursor(null); }
    } finally { setBusy(false); }
  }, [api, brandKit, status]);

  useEffect(() => { load(null); }, [load]);

  return (
    <Panel aria-label="Atelier Assets">
      <Workspace>
        <Card $accent="ice">
          <CardTitle><ImageIcon size={16} aria-hidden /> Assets</CardTitle>
          <CardHint>
            Everything Compose has rendered. Not the same as Video Library, which holds the
            exercise and marketing collections.
          </CardHint>

          <FilterRow>
            <Field>Brand
              <Select value={brandKit} onChange={(e) => setBrandKit(e.target.value)} aria-label="Filter by brand kit">
                <option value="">Any brand</option>
                {kits.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
              </Select>
            </Field>
            <Field>Status
              <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
                <option value="">Any status</option>
                <option value="draft">Draft</option>
                <option value="approved">Approved</option>
                <option value="published">Published</option>
              </Select>
            </Field>
            <QuietButton type="button" onClick={() => load(null)} disabled={busy}>
              <RefreshCw size={14} aria-hidden /> Refresh
            </QuietButton>
          </FilterRow>

          {error && <Notice $tone="off" role="status">{error}</Notice>}

          {/* One missing preview is a quiet placeholder. EVERY preview missing is a broken
              signer, and the operator must not be left concluding their renders are gone. */}
          {!error && previewsDown && (
            <Notice $tone="unproven" role="status">
              Previews are unavailable right now — this is a preview-signing problem, not a
              problem with your assets. Everything below is still here.
            </Notice>
          )}

          {!error && assets.length === 0 && !busy && (
            <Notice $tone="unproven" role="status">
              <Filter size={14} aria-hidden /> {describeEmpty(filtered, Boolean(api))}
            </Notice>
          )}

          <AssetGrid>
            {assets.map((a) => (
              <AssetCard key={a.id}>
                {a.previewUrl && !broken[a.id] ? (
                  <AssetImage
                    src={a.previewUrl}
                    alt={a.prompt || 'Rendered asset'}
                    loading="lazy"
                    // A signed URL expires while you scroll. When it does the card falls
                    // back to the SAME placeholder an unsignable object gets. The first
                    // version hid the image instead, which left a hole — contradicting the
                    // very principle it was written to serve, and a reviewer said so.
                    onError={() => setBroken((b) => ({ ...b, [a.id]: true }))}
                  />
                ) : (
                  <AssetThumb aria-label={a.prompt || 'Rendered asset'}>
                    {a.width && a.height ? `${a.width}x${a.height}` : a.kind}
                  </AssetThumb>
                )}
                <AssetMeta>
                  <strong>{a.status}</strong>
                  {a.brandKit && <span> · {a.brandKit}</span>}
                  {a.lane && <span> · {a.lane}</span>}
                </AssetMeta>
                {a.prompt && <Caption>{a.prompt}{a.promptTruncated ? '…' : ''}</Caption>}
              </AssetCard>
            ))}
          </AssetGrid>

          {hasMore && (
            <QuietButton type="button" onClick={() => load(cursor)} disabled={busy}>
              {busy ? 'Loading…' : 'Load more'}
            </QuietButton>
          )}
          {busy && assets.length === 0 && <Caption role="status">Loading your assets…</Caption>}
        </Card>
      </Workspace>
    </Panel>
  );
};

export default AtelierLibrary;
