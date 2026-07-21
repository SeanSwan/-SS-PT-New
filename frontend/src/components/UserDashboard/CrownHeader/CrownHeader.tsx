/**
 * ============================================================================
 * FILE: CrownHeader.tsx — FUSION F2 (BLUEPRINT-lens-world-fusion, slice 3)
 * PURPOSE: The user dashboard's lens-wearing cover band + Looks Carousel —
 * the user-facing "wear it" surface. The BAND is the preview stage: tapping
 * a card re-skins THE HEADER ONLY (scoped frame; v2-capable looks also wear
 * their full recipe + F0 atmosphere here); "Wear this" commits (the F1
 * bridge then syncs it to every device) and fires the confirmation chip.
 * PLACEMENT RULING: first child of the HOME tab content, BELOW the existing
 * cover studio (that cover is the KIMI Cover/Gallery lane's surface).
 * [⚙ Fine-tune] arrives with F4 — nothing renders for it yet.
 * ============================================================================
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ScopedLensFrame, useStyleLensAppearance } from '../../../core/style-lens-os';
import { useAuth } from '../../../context/authContextState';
import { SWAN_STYLE_LENS_VISUALS } from '../../../adapters/style-lens-swan';
import { V2_RECIPE_BY_CATALOG_ID } from '../../../adapters/style-lens-swan/v2/catalogV2Map';
import LensPlanFrame from '../../DashBoard/Pages/workout-design-lab/LensPlanFrame';
import LabConfirmationChip from '../../DashBoard/Pages/workout-design-lab/LabConfirmationChip';
import { WORKOUT_DESIGN_STYLE_LENSES } from '../../DashBoard/Pages/workout-design-lab/workoutDesignStyleCatalog';
import { orderedLooks } from './crownHeaderLooks';
import LooksCarousel from './LooksCarousel';
import {
  Caption,
  CrownBand,
  CrownContent,
  CrownShell,
  CrownTopRow,
  Kicker,
  LookDescription,
  LookName,
  SignInLine,
  WearButton,
} from './CrownHeader.styles';

const findLook = (id: string) => WORKOUT_DESIGN_STYLE_LENSES.find((lens) => lens.id === id);

const CrownHeader: React.FC = () => {
  const auth = useAuth();
  const { state, registry, beginPreview, cancelPreview, commitPreview } =
    useStyleLensAppearance();
  const committedId = state.committed.styleLensId;
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{ message: string; token: number } | null>(null);

  // Fresh users commit nothing — committedId is the runtime-only
  // 'default-safety' (NOT in the catalog). Synthesize their committed card
  // from the registry so the WORN badge + a REAL name always exist (R2-1).
  const committedManifest = useMemo(
    () => findLook(committedId) ?? registry?.resolve?.(committedId) ?? null,
    [committedId, registry],
  );
  const activeId = previewId ?? committedId;
  const activeLook = findLook(activeId) ?? committedManifest;
  const looks = useMemo(() => {
    const catalog = orderedLooks(committedId);
    return findLook(committedId) || !committedManifest
      ? catalog
      : [committedManifest, ...catalog];
  }, [committedId, committedManifest]);
  const visual = SWAN_STYLE_LENS_VISUALS[activeId];
  const v2Entry = V2_RECIPE_BY_CATALOG_ID[activeId];

  // Never leak a staged preview when the user navigates away (Lab law).
  useEffect(() => () => cancelPreview(), [cancelPreview]);

  const previewLook = (id: string) => {
    // Tap the previewed card AGAIN (or the committed card) = dismiss (R2-1).
    if ((previewId && id === previewId) || id === committedId) {
      setPreviewId(null);
      cancelPreview();
      return;
    }
    setPreviewId(id);
    beginPreview({
      ...state.committed,
      styleLensId: id,
      updatedAt: new Date().toISOString(),
    });
  };

  const wearLook = async () => {
    const name = findLook(previewId ?? committedId)?.name ?? 'Your look';
    const applied = await commitPreview();
    if (applied) {
      setConfirmation((current) => ({
        message: `${name} is now your look everywhere.`,
        token: (current?.token ?? 0) + 1,
      }));
      setPreviewId(null);
    }
  };

  const band = (
    <>
      <CrownBand
        data-crown-band
        aria-hidden="true"
        $canvas={visual?.backgroundFallback ?? '#0A0A0F'}
        $accent={visual?.accentFallback ?? '#60C0F0'}
      />
      <CrownContent>
        <CrownTopRow>
          <Kicker>YOUR LOOK</Kicker>
          {!auth?.user ? <SignInLine>Sign in to keep your look on every device.</SignInLine> : null}
        </CrownTopRow>
        {/* Name always comes from a REAL manifest (catalog or registry) —
            never invented copy (R2-1); raw id is the honest last resort. */}
        <LookName>{activeLook?.name ?? activeId}</LookName>
        <LookDescription>{activeLook?.description ?? ''}</LookDescription>
        <LooksCarousel
          looks={looks}
          committedId={committedId}
          activeId={activeId}
          onPreview={previewLook}
        />
        <Caption>Tap a look to preview it here · nothing changes until you wear it.</Caption>
        {previewId && previewId !== committedId ? (
          <WearButton type="button" onClick={() => void wearLook()}>
            Wear this
          </WearButton>
        ) : null}
      </CrownContent>
    </>
  );

  return (
    <div data-crown-frame>
      <ScopedLensFrame
        styleLensId={activeId}
        aria-label={`Your look preview: ${activeLook?.name ?? activeId}`}
      >
        <CrownShell>
          {v2Entry ? <LensPlanFrame recipe={v2Entry.recipe}>{band}</LensPlanFrame> : band}
        </CrownShell>
      </ScopedLensFrame>
      <LabConfirmationChip confirmation={confirmation} />
    </div>
  );
};

export default CrownHeader;
