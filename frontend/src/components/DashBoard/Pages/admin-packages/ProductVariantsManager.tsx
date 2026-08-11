/**
 * ============================================================================
 * FILE: ProductVariantsManager.tsx
 * PURPOSE: Inline admin CRUD for physical product variants in the store editor.
 * AUTHOR: Codex | LAST MODIFIED: 2026-06-13
 * AI VILLAGE VALIDATED: N/A
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Lets an admin manage size, tier, or color variants for an existing physical
 * StorefrontItem without leaving the edit dialog. Each action persists through
 * the admin storefront API.
 *
 * HOW IT FITS IN THE APP:
 * AdminPackagesView -> EditPackageDialog -> ProductVariantsManager ->
 * /api/admin/storefront/:id/variants and /api/admin/storefront/variants/:id.
 *
 * KEY DECISIONS:
 * This stays isolated from the main package editor so paid-session semantics
 * remain untouched. Variants only appear after a physical product exists, so the
 * create flow stays simple and the edit flow handles SKU, stock, active state,
 * and optional price overrides.
 *
 * WIREFRAME:
 * +------------------------------------------------+
 * | Variants                                      |
 * | Organic 1.5L        $24       Active [edit x] |
 * | Trial 16oz          $9        Active [edit x] |
 * | Label | Price | Stock                         |
 * | SKU                                            |
 * | [Add variant] [Cancel edit]                   |
 * +------------------------------------------------+
 *
 * DATA FLOW:
 * Props In:  itemId
 * State:     variants, loading, busyId, draft fields, editingId
 * API Calls: GET /:id/variants, POST /:id/variants,
 *            PUT /variants/:variantId, DELETE /variants/:variantId
 * Events:    add, edit, active toggle, delete
 * Children:  styled form controls from admin-packages-view.formStyles
 *
 * ARCHITECTURE:
 * graph TD
 *   A[AdminPackagesView] --> B[EditPackageDialog]
 *   B --> C[ProductVariantsManager]
 *   C --> D[Admin Storefront Variant API]
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Check, Edit2, Loader2, Plus, Trash2, X } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../hooks/use-toast';
import {
  FormInput,
  FormLabel,
  HiddenCheckbox,
  SwitchLabel,
  SwitchThumb,
  SwitchTrack,
} from './admin-packages-view.formStyles';
import { AddBtn, Editor, Hint, IconBtn, Meta, Row, RowLabel, Title, Wrap } from './ProductVariantsManager.styles';
import ConfirmActionDialog from '../../../Shared/ConfirmActionDialog';
import { StyledBox } from '@/components/ui/StyledBox';

interface Variant {
  id: number;
  label: string;
  sku: string | null;
  price: number | string | null;
  stockQuantity: number | null;
  isActive: boolean;
}

const ADMIN_STOREFRONT_BASE = '/api/admin/storefront';

const numOrNull = (value: string): number | null => {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

const priceText = (value: Variant['price']): string => (
  value === null || value === undefined ? '' : String(value)
);

const buildVariantDraftPayload = (label: string, price: string, stock: string, sku: string) => ({
  label,
  price: numOrNull(price),
  stockQuantity: numOrNull(stock),
  sku: sku.trim() || null,
});

const errorMessage = (err: unknown, fallback: string): string => (
  err instanceof Error ? err.message : fallback
);

interface ProductVariantsManagerProps {
  itemId: number;
}

const ProductVariantsManager: React.FC<ProductVariantsManagerProps> = ({ itemId }) => {
  const { authAxios } = useAuth();
  const { toast } = useToast();
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Variant | null>(null);
  const [dLabel, setDLabel] = useState('');
  const [dPrice, setDPrice] = useState('');
  const [dStock, setDStock] = useState('');
  const [dSku, setDSku] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchVariants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authAxios.get(`${ADMIN_STOREFRONT_BASE}/${itemId}/variants`);
      const nextVariants = Array.isArray(res?.data?.variants) ? res.data.variants : [];
      setVariants(nextVariants);
    } catch {
      toast({ title: 'Error', description: 'Could not load variants', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [authAxios, itemId, toast]);

  useEffect(() => {
    fetchVariants();
  }, [fetchVariants]);

  const resetDraft = () => {
    setEditingId(null);
    setDLabel('');
    setDPrice('');
    setDStock('');
    setDSku('');
  };

  const startEdit = (variant: Variant) => {
    setEditingId(variant.id);
    setDLabel(variant.label);
    setDPrice(priceText(variant.price));
    setDStock(variant.stockQuantity === null || variant.stockQuantity === undefined ? '' : String(variant.stockQuantity));
    setDSku(variant.sku || '');
  };

  const handleSaveDraft = async () => {
    const label = dLabel.trim();
    if (!label) {
      toast({ title: 'Label required', description: 'Give the variant a label.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = buildVariantDraftPayload(label, dPrice, dStock, dSku);
    try {
      const request = editingId !== null
        ? authAxios.put(`${ADMIN_STOREFRONT_BASE}/variants/${editingId}`, payload)
        : authAxios.post(`${ADMIN_STOREFRONT_BASE}/${itemId}/variants`, payload);
      await request;
      resetDraft();
      await fetchVariants();
      toast({ title: 'Saved', description: 'Variant saved.' });
    } catch (err) {
      toast({ title: 'Error', description: errorMessage(err, 'Could not save variant'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Deleting a variant is irreversible and buyer-facing, so it confirms through
  // the branded dialog rather than the browser's grey system prompt.
  const handleDelete = async (variant: Variant) => {
    setPendingDelete(variant);
  };

  const confirmDelete = async () => {
    const variant = pendingDelete;
    if (!variant) return;
    setPendingDelete(null);
    setBusyId(variant.id);
    try {
      await authAxios.delete(`${ADMIN_STOREFRONT_BASE}/variants/${variant.id}`);
      setVariants((prev) => prev.filter((item) => item.id !== variant.id));
      if (editingId === variant.id) resetDraft();
    } catch {
      toast({ title: 'Error', description: 'Could not delete variant', variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const handleToggle = async (variant: Variant) => {
    setBusyId(variant.id);
    const next = !variant.isActive;
    setVariants((prev) => prev.map((item) => (item.id === variant.id ? { ...item, isActive: next } : item)));
    try {
      await authAxios.put(`${ADMIN_STOREFRONT_BASE}/variants/${variant.id}`, { isActive: next });
    } catch {
      setVariants((prev) => prev.map((item) => (item.id === variant.id ? { ...item, isActive: !next } : item)));
      toast({ title: 'Error', description: 'Could not update variant', variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Wrap>
      <Title>Variants</Title>
      <Hint>Sizes / tiers buyers choose, such as Organic 1.5L. Blank price inherits the product price; blank stock is not tracked.</Hint>
      {loading ? (
        <Hint>Loading variants...</Hint>
      ) : variants.length === 0 ? (
        <Hint>No variants yet. Add one below.</Hint>
      ) : (
        variants.map((variant) => (
          <Row key={variant.id}>
            <RowLabel $dim={!variant.isActive}>{variant.label}</RowLabel>
            <Meta>{variant.price === null || variant.price === undefined ? 'inherits' : `$${variant.price}`}</Meta>
            <Meta>{variant.stockQuantity === null || variant.stockQuantity === undefined ? '-' : `${variant.stockQuantity} in stock`}</Meta>
            <StyledBox as={SwitchLabel} htmlFor={`variant-active-${variant.id}`} title={variant.isActive ? 'Active' : 'Inactive'} $style={busyId === variant.id ? { opacity: 0.6, pointerEvents: 'none' } : undefined}>
              <HiddenCheckbox
                id={`variant-active-${variant.id}`}
                type="checkbox"
                checked={variant.isActive}
                disabled={busyId === variant.id}
                aria-label={`${variant.isActive ? 'Deactivate' : 'Activate'} ${variant.label}`}
                onChange={() => handleToggle(variant)}
              />
              <SwitchTrack $checked={variant.isActive}><SwitchThumb $checked={variant.isActive} /></SwitchTrack>
            </StyledBox>
            <IconBtn type="button" onClick={() => startEdit(variant)} aria-label={`Edit ${variant.label}`} title="Edit"><Edit2 size={15} /></IconBtn>
            <IconBtn type="button" className="danger" disabled={busyId === variant.id} onClick={() => handleDelete(variant)} aria-label={`Delete ${variant.label}`} title="Delete"><Trash2 size={15} /></IconBtn>
          </Row>
        ))
      )}
      <FormLabel htmlFor="variant-label">{editingId !== null ? 'Edit variant' : 'Add a variant'}</FormLabel>
      <Editor>
        <FormInput id="variant-label" value={dLabel} onChange={(e) => setDLabel(e.target.value)} placeholder="Label e.g. Organic 1.5L" />
        <FormInput id="variant-price" type="number" min={0} step={0.5} value={dPrice} onChange={(e) => setDPrice(e.target.value)} placeholder="Price (blank=inherit)" />
        <FormInput id="variant-stock" type="number" min={0} value={dStock} onChange={(e) => setDStock(e.target.value)} placeholder="Stock (blank=untracked)" />
      </Editor>
      <FormInput id="variant-sku" value={dSku} onChange={(e) => setDSku(e.target.value)} placeholder="SKU (optional)" />
      <StyledBox as={Row} $style={{ background: 'transparent', padding: 0 }}>
        <AddBtn type="button" onClick={handleSaveDraft} disabled={saving}>
          {saving ? <Loader2 size={15} className="spin" /> : editingId !== null ? <Check size={15} /> : <Plus size={15} />}
          {editingId !== null ? 'Save variant' : 'Add variant'}
        </AddBtn>
        {editingId !== null && (
          <IconBtn type="button" onClick={resetDraft} aria-label="Cancel edit" title="Cancel"><X size={15} /></IconBtn>
        )}
      </StyledBox>
      <ConfirmActionDialog
        open={pendingDelete !== null}
        title="Delete variant?"
        message={pendingDelete
          ? `Delete ${pendingDelete.label}? This removes it from the buyer variant list.`
          : ''}
        confirmLabel="Delete variant"
        tone="danger"
        busy={busyId !== null && busyId === pendingDelete?.id}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </Wrap>
  );
};

export default ProductVariantsManager;
