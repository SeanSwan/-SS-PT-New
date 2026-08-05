/**
 * FILE: QuickAddFab.tsx
 * PURPOSE: Phase 4C — floating quick-add button for the nutrition workspace.
 *          56px Wing Purple fab (Arctic Cyan glow) opening a sheet with:
 *          Repeat yesterday · Scan barcode · Recent meals · Search food.
 * HOW IT FITS: NutritionWorkspace renders it once; repeat/recent taps hand a
 *          review draft to NutritionReviewDrawer (review-first atomic save),
 *          scan/search taps switch tabs.
 * KEY DECISIONS: Data loads lazily on first open (no cost while closed).
 *          Draft conversion reuses the existing repeat-meal logic — see
 *          quickAdd.logic.ts. Escape and backdrop close the sheet.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { History, Plus, ScanBarcode, Search, Utensils, X } from 'lucide-react';
import apiService from '../../services/api.service';
import {
  repeatMacroEntryToNutritionDraft,
  type RepeatMacroEntry,
} from '../DashBoard/workspaces/NutritionTodayPanel.repeatMeal';
import type { NutritionEntryDraft } from './nutritionDraft.types';
import { buildRepeatYesterdayDraft, loadQuickAddData, type QuickAddData } from './quickAdd.logic';
import {
  FabButton,
  Sheet,
  SheetBackdrop,
  SheetItem,
  SheetItemMeta,
  SheetNote,
  SheetTitle,
} from './QuickAddFab.styles';

interface QuickAddFabProps {
  onReviewDraft: (draft: NutritionEntryDraft) => void;
  onNavigate: (tab: 'barcode' | 'search') => void;
  reduceMotion: boolean;
  /** Gentle Mode hides calorie numbers in the recent-meal rows. */
  gentleMode?: boolean;
}

const QuickAddFab: React.FC<QuickAddFabProps> = ({
  onReviewDraft,
  onNavigate,
  reduceMotion,
  gentleMode = false,
}) => {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<QuickAddData | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  // Refetch on every open so freshly logged meals appear in "Recent meals".
  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoadingData(true);
    loadQuickAddData(apiService)
      .then((loaded) => { if (active) setData(loaded); })
      .catch(() => { if (active) setData({ yesterday: [], recent: [] }); })
      .finally(() => { if (active) setLoadingData(false); });
    return () => { active = false; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKeyDown);
    sheetRef.current?.focus();
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, close]);

  const repeatYesterday = () => {
    const draft = buildRepeatYesterdayDraft(data?.yesterday || []);
    if (!draft) return;
    close();
    onReviewDraft(draft);
  };

  const repeatEntry = (entry: RepeatMacroEntry) => {
    const draft = repeatMacroEntryToNutritionDraft(entry);
    if (!draft) return;
    close();
    onReviewDraft(draft);
  };

  const switchTab = (tab: 'barcode' | 'search') => {
    close();
    onNavigate(tab);
  };

  const yesterdayCount = data?.yesterday.length || 0;

  // Portal to <body>: the workspace shell uses container-type/backdrop-filter,
  // which turn it into the containing block for fixed descendants — without
  // the portal the fab would pin to the card, not the viewport (same pattern
  // as NutritionReviewDrawer).
  return createPortal(
    <>
      <FabButton
        type="button"
        aria-label={open ? 'Close quick add' : 'Quick add a meal'}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((current) => !current)}
      >
        {open ? <X size={24} aria-hidden="true" /> : <Plus size={24} aria-hidden="true" />}
      </FabButton>

      {open && (
        <>
          <SheetBackdrop onClick={close} aria-hidden="true" />
          <Sheet
            ref={sheetRef}
            role="dialog"
            aria-label="Quick add a meal"
            tabIndex={-1}
            $reduceMotion={reduceMotion}
          >
            <SheetTitle>Quick add</SheetTitle>
            <SheetItem
              type="button"
              onClick={repeatYesterday}
              disabled={loadingData || yesterdayCount === 0}
            >
              <History size={18} aria-hidden="true" />
              {loadingData
                ? 'Checking yesterday’s diary…'
                : yesterdayCount > 0
                  ? `Repeat yesterday (${yesterdayCount} ${yesterdayCount === 1 ? 'meal' : 'meals'})`
                  : 'Nothing to repeat yet'}
            </SheetItem>
            <SheetItem type="button" onClick={() => switchTab('barcode')}>
              <ScanBarcode size={18} aria-hidden="true" /> Scan barcode
            </SheetItem>
            <SheetItem type="button" onClick={() => switchTab('search')}>
              <Search size={18} aria-hidden="true" /> Search food
            </SheetItem>

            <SheetTitle as="p">Recent meals</SheetTitle>
            {loadingData && <SheetNote>Loading recent meals&hellip;</SheetNote>}
            {!loadingData && (data?.recent.length || 0) === 0 && (
              <SheetNote>Meals you log will appear here for one-tap repeats.</SheetNote>
            )}
            {!loadingData && data?.recent.map((entry, index) => (
              <SheetItem
                key={`${String(entry.id ?? 'recent')}-${index}`}
                type="button"
                onClick={() => repeatEntry(entry)}
              >
                <Utensils size={18} aria-hidden="true" />
                <span>{String(entry.description || '').trim()}</span>
                {!gentleMode && typeof entry.calories === 'number' && Number.isFinite(entry.calories) && (
                  <SheetItemMeta>{Math.round(entry.calories)} kcal</SheetItemMeta>
                )}
              </SheetItem>
            ))}
          </Sheet>
        </>
      )}
    </>,
    document.body,
  );
};

export default QuickAddFab;
