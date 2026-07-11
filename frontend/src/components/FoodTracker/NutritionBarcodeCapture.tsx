import React, { useCallback, useState } from 'react';
import { AlertTriangle, ClipboardCheck, RefreshCw, ScanBarcode } from 'lucide-react';
import apiService from '../../services/api.service';
import BarcodeScanner from '../FoodScanner/BarcodeScanner';
import { cleanMacro, MEAL_TYPE_OPTIONS, normalizeMealType } from './mealPhotoLog';
import { barcodeProductToNutritionDraft, type BarcodeNutritionProduct } from './nutritionDraft.adapters';
import type { NutrientMap, NutritionEntryDraft } from './nutritionDraft.types';
import {
  BarcodeHeader,
  BarcodeShell,
  ButtonRow,
  FieldGrid,
  FieldLabel,
  FormInput,
  FormSelect,
  HeaderCopy,
  HeaderIcon,
  ManualDraftButton,
  RecoveryForm,
  RecoveryHint,
  RetryButton,
  ScannerStatus,
} from './NutritionBarcodeCapture.styles';

interface NutritionBarcodeCaptureProps {
  onReviewDraft: (draft: NutritionEntryDraft) => void;
}

type LookupState = 'idle' | 'missing' | 'error';

const MANUAL_FIELDS: Array<{ key: keyof NutrientMap; label: string }> = [
  { key: 'calories', label: 'Calories' },
  { key: 'protein', label: 'Protein' },
  { key: 'carbs', label: 'Carbs' },
  { key: 'fat', label: 'Fat' },
  { key: 'fiber', label: 'Fiber' },
  { key: 'sugar', label: 'Sugar' },
  { key: 'sodium', label: 'Sodium' },
];

const emptyNutrients = (): Record<keyof NutrientMap, string> => ({
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  fiber: '',
  sugar: '',
  sodium: '',
  addedSugar: '',
  saturatedFat: '',
  transFat: '',
  cholesterol: '',
});

const NutritionBarcodeCapture: React.FC<NutritionBarcodeCaptureProps> = ({ onReviewDraft }) => {
  const [barcode, setBarcode] = useState('');
  const [lookupState, setLookupState] = useState<LookupState>('idle');
  const [loading, setLoading] = useState(false);
  const [manualName, setManualName] = useState('');
  const [mealType, setMealType] = useState('snack');
  const [servingQuantity, setServingQuantity] = useState('1');
  const [servingUnit, setServingUnit] = useState('serving');
  const [nutrients, setNutrients] = useState(emptyNutrients);
  const [manualError, setManualError] = useState('');

  const lookupBarcode = useCallback(async (nextBarcode: string) => {
    setBarcode(nextBarcode);
    setLoading(true);
    setLookupState('idle');
    setManualError('');
    try {
      const response = await apiService.get(`/api/food-scanner/scan/${nextBarcode}`);
      const product = response?.data?.success ? response.data.product as BarcodeNutritionProduct : null;
      if (!product) {
        setLookupState('missing');
        return;
      }
      onReviewDraft(barcodeProductToNutritionDraft(product, { mealType }));
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      setLookupState(status === 404 ? 'missing' : 'error');
    } finally {
      setLoading(false);
    }
  }, [mealType, onReviewDraft]);

  const updateNutrient = (field: keyof NutrientMap, value: string) => {
    setNutrients((current) => ({ ...current, [field]: value }));
  };

  const submitManualDraft = (event: React.FormEvent) => {
    event.preventDefault();
    const name = manualName.trim();
    if (!name) {
      setManualError('Add the food name from the package before review.');
      return;
    }

    const typedNutrients: NutrientMap = {
      calories: cleanMacro(nutrients.calories),
      protein: cleanMacro(nutrients.protein),
      carbs: cleanMacro(nutrients.carbs),
      fat: cleanMacro(nutrients.fat),
      fiber: cleanMacro(nutrients.fiber),
      sugar: cleanMacro(nutrients.sugar),
      sodium: cleanMacro(nutrients.sodium),
    };
    const quantity = cleanMacro(servingQuantity);
    const draft: NutritionEntryDraft = {
      contractVersion: '1.0',
      id: `barcode-manual-${barcode}-${Date.now().toString(36)}`,
      userId: null,
      loggedByUserId: null,
      title: `Review ${name}`,
      source: 'barcode',
      sourceLabel: 'Manual barcode override',
      sourceConfidence: 'community',
      workoutProximity: 'none',
      rawPayloadRef: {
        provider: 'Manual barcode override',
        barcode,
      },
      reviewReason: 'barcode_unmatched',
      reviewNotes: [
        lookupState === 'error'
          ? 'The barcode provider was unavailable. Verify values against the package label.'
          : 'The catalog did not match this barcode. Verify values against the package label.',
      ],
      verified: false,
      foods: [{
        id: `barcode-manual-food-${barcode}`,
        description: name,
        displayName: name,
        mealType: normalizeMealType(mealType),
        serving: {
          basis: 'estimated',
          quantity,
          unit: servingUnit.trim() || 'serving',
          label: [quantity, servingUnit.trim() || 'serving'].filter(Boolean).join(' '),
        },
        nutrients: typedNutrients,
        confidence: 0.5,
        provider: 'Manual barcode override',
        sourceLabel: 'Unmatched barcode',
        verified: false,
      }],
    };
    onReviewDraft(draft);
  };

  const showRecovery = lookupState !== 'idle';

  return (
    <BarcodeShell aria-label="Nutrition barcode capture">
      <BarcodeHeader>
        <HeaderIcon aria-hidden="true"><ScanBarcode size={22} /></HeaderIcon>
        <HeaderCopy>
          <h3>Scan into review</h3>
          <p>Barcode results stay editable and do not enter your diary until you approve the serving.</p>
        </HeaderCopy>
      </BarcodeHeader>

      <BarcodeScanner onDetected={lookupBarcode} disabled={loading} />
      {loading && <ScannerStatus role="status" aria-live="polite">Looking up barcode {barcode}...</ScannerStatus>}

      {lookupState === 'missing' && (
        <ScannerStatus role="status" aria-live="polite">
          Barcode {barcode} is not in the provider catalog. Add the package label details below.
        </ScannerStatus>
      )}
      {lookupState === 'error' && (
        <ScannerStatus role="alert" $error>
          <AlertTriangle size={17} />
          Barcode lookup is temporarily unavailable. Retry or continue with the package label.
        </ScannerStatus>
      )}

      {showRecovery && (
        <RecoveryForm onSubmit={submitManualDraft}>
          <RecoveryHint>
            The barcode stays attached to this manual draft so a coach can see why it needs review.
          </RecoveryHint>
          <FieldGrid>
            <FieldLabel $wide>
              Food name
              <FormInput
                aria-label="Food name"
                value={manualName}
                onChange={(event) => {
                  setManualName(event.target.value);
                  setManualError('');
                }}
              />
            </FieldLabel>
            <FieldLabel>
              Meal
              <FormSelect value={mealType} onChange={(event) => setMealType(event.target.value)}>
                {MEAL_TYPE_OPTIONS.map((type) => <option key={type} value={type}>{type}</option>)}
              </FormSelect>
            </FieldLabel>
            <FieldLabel>
              Serving quantity
              <FormInput
                type="number"
                min="0"
                step="0.1"
                value={servingQuantity}
                onChange={(event) => setServingQuantity(event.target.value)}
              />
            </FieldLabel>
            <FieldLabel>
              Serving unit
              <FormInput value={servingUnit} onChange={(event) => setServingUnit(event.target.value)} />
            </FieldLabel>
            {MANUAL_FIELDS.map(({ key, label }) => (
              <FieldLabel key={key}>
                {label}
                <FormInput
                  aria-label={label}
                  type="number"
                  min="0"
                  step="0.1"
                  value={nutrients[key]}
                  onChange={(event) => updateNutrient(key, event.target.value)}
                />
              </FieldLabel>
            ))}
          </FieldGrid>
          {manualError && <ScannerStatus role="alert" $error>{manualError}</ScannerStatus>}
          <ButtonRow>
            <ManualDraftButton type="submit">
              <ClipboardCheck size={17} /> Review manual barcode entry
            </ManualDraftButton>
            <RetryButton type="button" onClick={() => lookupBarcode(barcode)} disabled={loading}>
              <RefreshCw size={17} /> Retry barcode lookup
            </RetryButton>
          </ButtonRow>
        </RecoveryForm>
      )}
    </BarcodeShell>
  );
};

export default NutritionBarcodeCapture;
