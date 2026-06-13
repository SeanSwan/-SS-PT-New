// admin-packages-view.dialogs.tsx
// Extracted from admin-packages-view.tsx (2026-06-13) to keep the canonical
// admin store manager under the rule-4 / style-extraction line budget after the
// physical-product (drink / supplements / merch) editor was added.
// State stays owned by the parent view; these are presentational dialogs whose
// props are aliased to the parent's variable names so the JSX is verbatim.
import React from 'react';
import { Edit, Plus, CheckSquare } from 'lucide-react';
import GlowButton from '../../../ui/buttons/GlowButton';
import {
  StyledDialog,
  DialogPanel,
  DialogTitleBar,
  DialogContentArea,
  DialogActionsBar,
} from '../admin-sessions/styled-admin-sessions';
import { DialogHintText, FlexRow, Heading6 } from './admin-packages-view.layoutStyles';
import {
  CenteredFormField,
  FormField,
  FormGrid,
  FormGridFull,
  FormInput,
  FormInputAccent,
  FormLabel,
  FormSelect,
  FormTextarea,
  HiddenCheckbox,
  SwitchLabel,
  SwitchThumb,
  SwitchTrack,
} from './admin-packages-view.formStyles';
import ProductImageField from './ProductImageField';
import ProductVariantsManager from './ProductVariantsManager';

type Kind = 'training_package' | 'physical_product';
type PackageType = 'fixed' | 'monthly';
type FormatCurrency = (value: number | null | undefined) => string;

export interface EditPackageDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  itemId: number | null; // the product being edited (for variant management)
  formatCurrency: FormatCurrency;
  packageName: string; setPackageName: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  packageType: PackageType; setPackageType: (v: PackageType) => void;
  pricePerSession: number; setPricePerSession: (v: number) => void;
  sessions: number; setSessions: (v: number) => void;
  months: number; setMonths: (v: number) => void;
  sessionsPerWeek: number; setSessionsPerWeek: (v: number) => void;
  theme: string; setTheme: (v: string) => void;
  isActive: boolean; setIsActive: (v: boolean) => void;
  itemKind: Kind; setItemKind: (v: Kind) => void;
  isTaxable: boolean; setIsTaxable: (v: boolean) => void;
  fulfillmentType: string; setFulfillmentType: (v: string) => void;
  sku: string; setSku: (v: string) => void;
  stockQuantity: string; setStockQuantity: (v: string) => void;
  productPrice: number; setProductPrice: (v: number) => void;
  imageUrl: string; setImageUrl: (v: string) => void;
}

export const EditPackageDialog: React.FC<EditPackageDialogProps> = (p) => {
  const {
    open, onClose, onSave, itemId, formatCurrency,
    packageName: editPackageName, setPackageName: setEditPackageName,
    description: editPackageDescription, setDescription: setEditPackageDescription,
    packageType: editPackageType, setPackageType: setEditPackageType,
    pricePerSession: editPricePerSession, setPricePerSession: setEditPricePerSession,
    sessions: editSessions, setSessions: setEditSessions,
    months: editMonths, setMonths: setEditMonths,
    sessionsPerWeek: editSessionsPerWeek, setSessionsPerWeek: setEditSessionsPerWeek,
    theme: editTheme, setTheme: setEditTheme,
    isActive: editIsActive, setIsActive: setEditIsActive,
    itemKind: editItemKind, setItemKind: setEditItemKind,
    isTaxable: editIsTaxable, setIsTaxable: setEditIsTaxable,
    fulfillmentType: editFulfillmentType, setFulfillmentType: setEditFulfillmentType,
    sku: editSku, setSku: setEditSku,
    stockQuantity: editStockQuantity, setStockQuantity: setEditStockQuantity,
    productPrice: editProductPrice, setProductPrice: setEditProductPrice,
    imageUrl: editImageUrl, setImageUrl: setEditImageUrl,
  } = p;

  return (
    <StyledDialog $open={open} onClick={onClose}>
      <DialogPanel onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <DialogTitleBar>
          <FlexRow $gap="0.75rem">
            <Edit size={20} />
            <Heading6>{editItemKind === 'physical_product' ? 'Edit Product' : 'Edit Package'}</Heading6>
          </FlexRow>
        </DialogTitleBar>
        <DialogContentArea>
          <DialogHintText>
            {editItemKind === 'physical_product'
              ? 'Update the details, price, tax, and fulfillment for this product.'
              : 'Update the details for this session package.'}
          </DialogHintText>
          <FormGrid>
            {/* Package Name */}
            <FormGridFull>
              <FormField>
                <FormLabel htmlFor="edit-package-name">
                  {editItemKind === 'physical_product' ? 'Product Name *' : 'Package Name *'}
                </FormLabel>
                <FormInput
                  id="edit-package-name"
                  value={editPackageName}
                  onChange={(e) => setEditPackageName(e.target.value)}
                  required
                />
              </FormField>
            </FormGridFull>

            {/* Item Kind — training package vs physical product */}
            <FormField>
              <FormLabel htmlFor="edit-item-kind">Item Kind</FormLabel>
              <FormSelect
                id="edit-item-kind"
                value={editItemKind}
                onChange={(e) => {
                  const kind = e.target.value as Kind;
                  setEditItemKind(kind);
                  if (kind === 'physical_product') {
                    setEditIsTaxable(true); // physical goods are CA sales-taxable
                    if (editFulfillmentType === 'none') setEditFulfillmentType('self_ship');
                  } else {
                    setEditIsTaxable(false);
                    setEditFulfillmentType('none');
                  }
                }}
              >
                <option value="training_package">Training Package (service)</option>
                <option value="physical_product">Physical Product (goods)</option>
              </FormSelect>
            </FormField>

            {/* Package Type (packages only) */}
            {editItemKind !== 'physical_product' && (
              <FormField>
                <FormLabel htmlFor="edit-package-type">Package Type</FormLabel>
                <FormSelect
                  id="edit-package-type"
                  value={editPackageType}
                  onChange={(e) => setEditPackageType(e.target.value as PackageType)}
                >
                  <option value="fixed">Fixed Sessions</option>
                  <option value="monthly">Monthly Subscription</option>
                </FormSelect>
              </FormField>
            )}

            {/* Theme */}
            <FormField>
              <FormLabel htmlFor="edit-package-theme">Theme</FormLabel>
              <FormSelect
                id="edit-package-theme"
                value={editTheme}
                onChange={(e) => setEditTheme(e.target.value)}
              >
                <option value="cosmic">Cosmic (Blue/Purple)</option>
                <option value="purple">Purple</option>
                <option value="ruby">Ruby (Red)</option>
                <option value="emerald">Emerald (Green)</option>
              </FormSelect>
            </FormField>

            {/* Price Per Session (packages only) */}
            {editItemKind !== 'physical_product' && (
              <FormField>
                <FormLabel htmlFor="edit-price-per-session">Price Per Session ($) *</FormLabel>
                <FormInput
                  id="edit-price-per-session"
                  type="number"
                  value={editPricePerSession}
                  onChange={(e) => setEditPricePerSession(Number(e.target.value))}
                  required
                  min={0}
                  step={5}
                />
              </FormField>
            )}

            {/* Sessions (for fixed packages) */}
            {editItemKind !== 'physical_product' && editPackageType === 'fixed' && (
              <FormField>
                <FormLabel htmlFor="edit-number-of-sessions">Number of Sessions *</FormLabel>
                <FormInput
                  id="edit-number-of-sessions"
                  type="number"
                  value={editSessions}
                  onChange={(e) => setEditSessions(Number(e.target.value))}
                  required
                  min={1}
                />
              </FormField>
            )}

            {/* Months (for monthly packages) */}
            {editItemKind !== 'physical_product' && editPackageType === 'monthly' && (
              <>
                <FormField>
                  <FormLabel htmlFor="edit-number-of-months">Number of Months *</FormLabel>
                  <FormInput
                    id="edit-number-of-months"
                    type="number"
                    value={editMonths}
                    onChange={(e) => setEditMonths(Number(e.target.value))}
                    required
                    min={1}
                  />
                </FormField>
                <FormField>
                  <FormLabel htmlFor="edit-sessions-per-week">Sessions Per Week *</FormLabel>
                  <FormInput
                    id="edit-sessions-per-week"
                    type="number"
                    value={editSessionsPerWeek}
                    onChange={(e) => setEditSessionsPerWeek(Number(e.target.value))}
                    required
                    min={1}
                  />
                </FormField>
              </>
            )}

            {/* Total Price Preview (packages only) */}
            {editItemKind !== 'physical_product' && (
              <FormField>
                <FormLabel htmlFor="edit-total-price">Total Price</FormLabel>
                <FormInputAccent
                  id="edit-total-price"
                  readOnly
                  value={formatCurrency(editPackageType === 'fixed'
                    ? editPricePerSession * editSessions
                    : editPricePerSession * editMonths * editSessionsPerWeek * 4)}
                />
              </FormField>
            )}

            {/* Product settings (physical products only) */}
            {editItemKind === 'physical_product' && (
              <>
                <FormField>
                  <FormLabel htmlFor="edit-product-price">Price ($) *</FormLabel>
                  <FormInput
                    id="edit-product-price"
                    type="number"
                    value={editProductPrice}
                    onChange={(e) => setEditProductPrice(Number(e.target.value))}
                    required
                    min={0}
                    step={1}
                  />
                </FormField>

                <FormField>
                  <FormLabel htmlFor="edit-fulfillment-type">Fulfillment</FormLabel>
                  <FormSelect
                    id="edit-fulfillment-type"
                    value={editFulfillmentType}
                    onChange={(e) => setEditFulfillmentType(e.target.value)}
                  >
                    <option value="self_ship">Self-ship (inventory)</option>
                    <option value="dropship">Dropship (AGI)</option>
                    <option value="local_delivery">Local delivery</option>
                    <option value="pickup">Pickup</option>
                    <option value="none">No shipping</option>
                  </FormSelect>
                </FormField>

                <FormField>
                  <FormLabel htmlFor="edit-product-sku">SKU</FormLabel>
                  <FormInput
                    id="edit-product-sku"
                    value={editSku}
                    onChange={(e) => setEditSku(e.target.value)}
                    placeholder="e.g. BFS-ORG-1500"
                  />
                </FormField>

                <FormField>
                  <FormLabel htmlFor="edit-product-stock">Stock (blank = not tracked)</FormLabel>
                  <FormInput
                    id="edit-product-stock"
                    type="number"
                    value={editStockQuantity}
                    onChange={(e) => setEditStockQuantity(e.target.value)}
                    min={0}
                    placeholder="—"
                  />
                </FormField>

                <CenteredFormField>
                  <SwitchLabel htmlFor="edit-product-taxable">
                    <HiddenCheckbox
                      id="edit-product-taxable"
                      type="checkbox"
                      checked={editIsTaxable}
                      onChange={(e) => setEditIsTaxable(e.target.checked)}
                    />
                    <SwitchTrack $checked={editIsTaxable}>
                      <SwitchThumb $checked={editIsTaxable} />
                    </SwitchTrack>
                    Taxable (CA sales tax)
                  </SwitchLabel>
                </CenteredFormField>
              </>
            )}

            {/* Active Status */}
            <CenteredFormField>
              <SwitchLabel htmlFor="edit-package-active">
                <HiddenCheckbox
                  id="edit-package-active"
                  type="checkbox"
                  checked={editIsActive ?? false}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                />
                <SwitchTrack $checked={editIsActive}>
                  <SwitchThumb $checked={editIsActive} />
                </SwitchTrack>
                Active and Visible
              </SwitchLabel>
            </CenteredFormField>

            {/* Description */}
            <FormGridFull>
              <FormField>
                <FormLabel htmlFor="edit-package-description">Description</FormLabel>
                <FormTextarea
                  id="edit-package-description"
                  value={editPackageDescription}
                  onChange={(e) => setEditPackageDescription(e.target.value)}
                  rows={3}
                />
              </FormField>
            </FormGridFull>

            {/* Image (upload or paste URL) — used on the storefront card */}
            <FormGridFull>
              <ProductImageField value={editImageUrl} onChange={setEditImageUrl} />
            </FormGridFull>

            {/* Variants (physical products only, once the item exists) */}
            {editItemKind === 'physical_product' && itemId && (
              <FormGridFull>
                <ProductVariantsManager itemId={itemId} />
              </FormGridFull>
            )}
          </FormGrid>
        </DialogContentArea>
        <DialogActionsBar>
          <GlowButton text="Cancel" theme="cosmic" size="small" onClick={onClose} />
          <GlowButton
            text="Save Changes"
            theme="emerald"
            size="small"
            leftIcon={<CheckSquare size={16} />}
            onClick={onSave}
          />
        </DialogActionsBar>
      </DialogPanel>
    </StyledDialog>
  );
};

export interface NewPackageDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: () => void;
  formatCurrency: FormatCurrency;
  packageName: string; setPackageName: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  packageType: PackageType; setPackageType: (v: PackageType) => void;
  pricePerSession: number; setPricePerSession: (v: number) => void;
  sessions: number; setSessions: (v: number) => void;
  months: number; setMonths: (v: number) => void;
  sessionsPerWeek: number; setSessionsPerWeek: (v: number) => void;
  theme: string; setTheme: (v: string) => void;
  itemKind: Kind; setItemKind: (v: Kind) => void;
  isTaxable: boolean; setIsTaxable: (v: boolean) => void;
  fulfillmentType: string; setFulfillmentType: (v: string) => void;
  sku: string; setSku: (v: string) => void;
  stockQuantity: string; setStockQuantity: (v: string) => void;
  productPrice: number; setProductPrice: (v: number) => void;
  imageUrl: string; setImageUrl: (v: string) => void;
}

export const NewPackageDialog: React.FC<NewPackageDialogProps> = (p) => {
  const {
    open, onClose, onCreate, formatCurrency,
    packageName: newPackageName, setPackageName: setNewPackageName,
    description: newPackageDescription, setDescription: setNewPackageDescription,
    packageType: newPackageType, setPackageType: setNewPackageType,
    pricePerSession: newPricePerSession, setPricePerSession: setNewPricePerSession,
    sessions: newSessions, setSessions: setNewSessions,
    months: newMonths, setMonths: setNewMonths,
    sessionsPerWeek: newSessionsPerWeek, setSessionsPerWeek: setNewSessionsPerWeek,
    theme: newTheme, setTheme: setNewTheme,
    itemKind: newItemKind, setItemKind: setNewItemKind,
    isTaxable: newIsTaxable, setIsTaxable: setNewIsTaxable,
    fulfillmentType: newFulfillmentType, setFulfillmentType: setNewFulfillmentType,
    sku: newSku, setSku: setNewSku,
    stockQuantity: newStockQuantity, setStockQuantity: setNewStockQuantity,
    productPrice: newProductPrice, setProductPrice: setNewProductPrice,
    imageUrl: newImageUrl, setImageUrl: setNewImageUrl,
  } = p;

  return (
    <StyledDialog $open={open} onClick={onClose}>
      <DialogPanel onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <DialogTitleBar>
          <FlexRow $gap="0.75rem">
            <Plus size={20} />
            <Heading6>{newItemKind === 'physical_product' ? 'Create New Product' : 'Create New Package'}</Heading6>
          </FlexRow>
        </DialogTitleBar>
        <DialogContentArea>
          <DialogHintText>
            {newItemKind === 'physical_product'
              ? 'Add a physical product (supplement, merch, recovery gear, drink) to the store.'
              : 'Create a new session package to offer to clients.'}
          </DialogHintText>
          <FormGrid>
            {/* Name */}
            <FormGridFull>
              <FormField>
                <FormLabel htmlFor="new-package-name">
                  {newItemKind === 'physical_product' ? 'Product Name *' : 'Package Name *'}
                </FormLabel>
                <FormInput
                  id="new-package-name"
                  value={newPackageName}
                  onChange={(e) => setNewPackageName(e.target.value)}
                  required
                  placeholder={newItemKind === 'physical_product'
                    ? 'e.g., Whey Protein, Recovery Foam Roller'
                    : 'e.g., Gold Glimmer, Platinum Plus'}
                />
              </FormField>
            </FormGridFull>

            {/* Item Kind — training package vs physical product */}
            <FormField>
              <FormLabel htmlFor="new-item-kind">Item Kind</FormLabel>
              <FormSelect
                id="new-item-kind"
                value={newItemKind}
                onChange={(e) => {
                  const kind = e.target.value as Kind;
                  setNewItemKind(kind);
                  if (kind === 'physical_product') {
                    setNewIsTaxable(true);
                    if (newFulfillmentType === 'none') setNewFulfillmentType('self_ship');
                  } else {
                    setNewIsTaxable(false);
                    setNewFulfillmentType('none');
                  }
                }}
              >
                <option value="training_package">Training Package (service)</option>
                <option value="physical_product">Physical Product (goods)</option>
              </FormSelect>
            </FormField>

            {/* Package Type (packages only) */}
            {newItemKind !== 'physical_product' && (
              <FormField>
                <FormLabel htmlFor="new-package-type">Package Type</FormLabel>
                <FormSelect
                  id="new-package-type"
                  value={newPackageType}
                  onChange={(e) => setNewPackageType(e.target.value as PackageType)}
                >
                  <option value="fixed">Fixed Sessions</option>
                  <option value="monthly">Monthly Subscription</option>
                </FormSelect>
              </FormField>
            )}

            {/* Theme */}
            <FormField>
              <FormLabel htmlFor="new-package-theme">Theme</FormLabel>
              <FormSelect
                id="new-package-theme"
                value={newTheme}
                onChange={(e) => setNewTheme(e.target.value)}
              >
                <option value="cosmic">Cosmic (Blue/Purple)</option>
                <option value="purple">Purple</option>
                <option value="ruby">Ruby (Red)</option>
                <option value="emerald">Emerald (Green)</option>
              </FormSelect>
            </FormField>

            {/* Price Per Session (packages only) */}
            {newItemKind !== 'physical_product' && (
              <FormField>
                <FormLabel htmlFor="new-price-per-session">Price Per Session ($) *</FormLabel>
                <FormInput
                  id="new-price-per-session"
                  type="number"
                  value={newPricePerSession}
                  onChange={(e) => setNewPricePerSession(Number(e.target.value))}
                  required
                  min={0}
                  step={5}
                />
              </FormField>
            )}

            {/* Sessions (for fixed packages) */}
            {newItemKind !== 'physical_product' && newPackageType === 'fixed' && (
              <FormField>
                <FormLabel htmlFor="new-number-of-sessions">Number of Sessions *</FormLabel>
                <FormInput
                  id="new-number-of-sessions"
                  type="number"
                  value={newSessions}
                  onChange={(e) => setNewSessions(Number(e.target.value))}
                  required
                  min={1}
                />
              </FormField>
            )}

            {/* Product settings (physical products only) */}
            {newItemKind === 'physical_product' && (
              <>
                <FormField>
                  <FormLabel htmlFor="new-product-price">Price ($) *</FormLabel>
                  <FormInput
                    id="new-product-price"
                    type="number"
                    value={newProductPrice}
                    onChange={(e) => setNewProductPrice(Number(e.target.value))}
                    required
                    min={0}
                    step={1}
                  />
                </FormField>

                <FormField>
                  <FormLabel htmlFor="new-fulfillment-type">Fulfillment</FormLabel>
                  <FormSelect
                    id="new-fulfillment-type"
                    value={newFulfillmentType}
                    onChange={(e) => setNewFulfillmentType(e.target.value)}
                  >
                    <option value="self_ship">Self-ship (inventory)</option>
                    <option value="dropship">Dropship (AGI)</option>
                    <option value="local_delivery">Local delivery</option>
                    <option value="pickup">Pickup</option>
                    <option value="none">No shipping</option>
                  </FormSelect>
                </FormField>

                <FormField>
                  <FormLabel htmlFor="new-product-sku">SKU</FormLabel>
                  <FormInput
                    id="new-product-sku"
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                    placeholder="e.g. WHEY-VAN-2LB"
                  />
                </FormField>

                <FormField>
                  <FormLabel htmlFor="new-product-stock">Stock (blank = not tracked)</FormLabel>
                  <FormInput
                    id="new-product-stock"
                    type="number"
                    value={newStockQuantity}
                    onChange={(e) => setNewStockQuantity(e.target.value)}
                    min={0}
                    placeholder="—"
                  />
                </FormField>

                <CenteredFormField>
                  <SwitchLabel htmlFor="new-product-taxable">
                    <HiddenCheckbox
                      id="new-product-taxable"
                      type="checkbox"
                      checked={newIsTaxable}
                      onChange={(e) => setNewIsTaxable(e.target.checked)}
                    />
                    <SwitchTrack $checked={newIsTaxable}>
                      <SwitchThumb $checked={newIsTaxable} />
                    </SwitchTrack>
                    Taxable (CA sales tax)
                  </SwitchLabel>
                </CenteredFormField>
              </>
            )}

            {/* Months (for monthly packages) */}
            {newItemKind !== 'physical_product' && newPackageType === 'monthly' && (
              <>
                <FormField>
                  <FormLabel htmlFor="new-number-of-months">Number of Months *</FormLabel>
                  <FormInput
                    id="new-number-of-months"
                    type="number"
                    value={newMonths}
                    onChange={(e) => setNewMonths(Number(e.target.value))}
                    required
                    min={1}
                  />
                </FormField>
                <FormField>
                  <FormLabel htmlFor="new-sessions-per-week">Sessions Per Week *</FormLabel>
                  <FormInput
                    id="new-sessions-per-week"
                    type="number"
                    value={newSessionsPerWeek}
                    onChange={(e) => setNewSessionsPerWeek(Number(e.target.value))}
                    required
                    min={1}
                  />
                </FormField>
              </>
            )}

            {/* Total Price Preview (packages only) */}
            {newItemKind !== 'physical_product' && (
              <FormGridFull>
                <FormField>
                  <FormLabel htmlFor="new-total-price-preview">Total Price (Preview)</FormLabel>
                  <FormInputAccent
                    id="new-total-price-preview"
                    readOnly
                    value={formatCurrency(newPackageType === 'fixed'
                      ? newPricePerSession * newSessions
                      : newPricePerSession * newMonths * newSessionsPerWeek * 4)}
                  />
                </FormField>
              </FormGridFull>
            )}

            {/* Description */}
            <FormGridFull>
              <FormField>
                <FormLabel htmlFor="new-package-description">Description</FormLabel>
                <FormTextarea
                  id="new-package-description"
                  value={newPackageDescription}
                  onChange={(e) => setNewPackageDescription(e.target.value)}
                  rows={3}
                  placeholder="Describe the key benefits and features of this package..."
                />
              </FormField>
            </FormGridFull>

            {/* Image (upload or paste URL) — used on the storefront card */}
            <FormGridFull>
              <ProductImageField value={newImageUrl} onChange={setNewImageUrl} />
            </FormGridFull>
          </FormGrid>
        </DialogContentArea>
        <DialogActionsBar>
          <GlowButton text="Cancel" theme="cosmic" size="small" onClick={onClose} />
          <GlowButton
            text={newItemKind === 'physical_product' ? 'Create Product' : 'Create Package'}
            theme="emerald"
            size="small"
            leftIcon={<Plus size={16} />}
            onClick={onCreate}
          />
        </DialogActionsBar>
      </DialogPanel>
    </StyledDialog>
  );
};
