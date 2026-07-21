/**
 * Admin Design Studio — the always-available preview home for parked redesigns and legacy concepts.
 *
 * BLUEPRINT: docs/ai-workflow/AI-HANDOFF/MASTER-HANDOFF-degate-design-overhaul-2026-07-21.md, S2.
 * Designs are previewed here, never promoted by a flag. A normal route-import commit is the only promotion path.
 */
import { lazy, Suspense, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ExternalLink, Monitor, Smartphone, Tablet } from 'lucide-react';
import { allConcepts } from './concepts/shared/conceptRegistry';
import { getPlaygroundEntry, playgroundRegistry } from './playgroundRegistry';
import {
  ArchiveGrid,
  ArchiveLink,
  ArchiveSection,
  Description,
  Eyebrow,
  PreviewBanner,
  PreviewControls,
  PreviewFrame,
  PreviewIdentity,
  PreviewMeta,
  PreviewPanel,
  PreviewStage,
  PreviewState,
  PreviewTitle,
  PreviewToolbar,
  StudioHeader,
  StudioShell,
  SurfaceButton,
  SurfaceGrid,
  Title,
  ViewportButton,
} from './DesignPlaygroundLayout.styles';

type ViewportId = 'desktop' | 'tablet' | 'mobile';

const VIEWPORTS = [
  { id: 'desktop', label: 'Desktop', width: '100%', Icon: Monitor },
  { id: 'tablet', label: 'Tablet', width: '768px', Icon: Tablet },
  { id: 'mobile', label: 'Mobile', width: '390px', Icon: Smartphone },
] as const;

const DesignPlaygroundLayout: React.FC = () => {
  const [selectedId, setSelectedId] = useState(playgroundRegistry[0].id);
  const [viewportId, setViewportId] = useState<ViewportId>('desktop');
  const selectedEntry = useMemo(
    () => playgroundRegistry.find((entry) => entry.id === selectedId) ?? playgroundRegistry[0],
    [selectedId],
  );
  const viewport = VIEWPORTS.find((option) => option.id === viewportId) ?? VIEWPORTS[0];

  return (
    <StudioShell>
      <StudioHeader>
        <Eyebrow>Admin preview workspace</Eyebrow>
        <Title>Design Studio</Title>
        <Description>
          Parked redesigns remain reviewable here while the committed public routes stay authoritative. Select
          a surface and viewport; promotion requires a normal reviewed route change, never a flag flip.
        </Description>
      </StudioHeader>

      <SurfaceGrid aria-label="Parked redesigns">
        {playgroundRegistry.map((entry) => (
          <SurfaceButton
            key={entry.id}
            type="button"
            $active={entry.id === selectedEntry.id}
            aria-pressed={entry.id === selectedEntry.id}
            onClick={() => setSelectedId(entry.id)}
          >
            {entry.title}
          </SurfaceButton>
        ))}
      </SurfaceGrid>

      <PreviewPanel aria-labelledby="design-preview-title">
        <PreviewBanner>PREVIEW — not live</PreviewBanner>
        <PreviewToolbar>
          <PreviewIdentity>
            <PreviewTitle id="design-preview-title">{selectedEntry.title}</PreviewTitle>
            <PreviewMeta>{selectedEntry.sourceRoute} · {selectedEntry.status}</PreviewMeta>
          </PreviewIdentity>
          <PreviewControls aria-label="Preview viewport">
            {VIEWPORTS.map(({ id, label, Icon }) => (
              <ViewportButton
                key={id}
                type="button"
                $active={viewportId === id}
                aria-pressed={viewportId === id}
                onClick={() => setViewportId(id)}
              >
                <Icon size={17} aria-hidden="true" /> {label}
              </ViewportButton>
            ))}
          </PreviewControls>
        </PreviewToolbar>
        <Description>{selectedEntry.notes}</Description>
        <PreviewStage>
          <PreviewFrame
            key={selectedEntry.id}
            $width={viewport.width}
            src={`/design-previews/${selectedEntry.id}`}
            title={`${selectedEntry.title} ${viewport.label} preview`}
            sandbox="allow-scripts allow-same-origin"
          />
        </PreviewStage>
      </PreviewPanel>

      <ArchiveSection aria-labelledby="legacy-concepts-title">
        <PreviewTitle id="legacy-concepts-title">Legacy concept archive</PreviewTitle>
        <Description>The original twelve concept studies remain available for comparison.</Description>
        <ArchiveGrid>
          {allConcepts.map((concept) => (
            <ArchiveLink key={concept.id} href={`/designs/${concept.id}`}>
              {concept.name} v{concept.version}
              <ExternalLink size={16} aria-hidden="true" />
            </ArchiveLink>
          ))}
        </ArchiveGrid>
      </ArchiveSection>
    </StudioShell>
  );
};

export const ParkedPreviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const entry = getPlaygroundEntry(id);
  const Preview = useMemo(() => (entry ? lazy(entry.lazyImport) : null), [entry]);

  if (!entry || !Preview) {
    return <PreviewState role="status">This parked preview is not registered.</PreviewState>;
  }

  return (
    <Suspense fallback={<PreviewState role="status">Loading {entry.title} preview…</PreviewState>}>
      <Preview />
    </Suspense>
  );
};

export default DesignPlaygroundLayout;