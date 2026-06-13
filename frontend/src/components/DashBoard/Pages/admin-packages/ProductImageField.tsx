// ProductImageField.tsx
// Reusable admin image field for storefront items (packages + physical products).
// Upload a file (→ R2 via /api/admin/storefront/upload-image) OR paste a URL.
// Shows a sanitized preview. Used by the Edit + New dialogs.
import React, { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import styled from 'styled-components';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../hooks/use-toast';
import { sanitizeImageUrl, cssUrlValue } from '../../../../utils/imageUrl';
import { FormField, FormInput, FormLabel } from './admin-packages-view.formStyles';

const Row = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const Preview = styled.div<{ $src?: string | null }>`
  width: 72px;
  height: 72px;
  border-radius: 10px;
  flex-shrink: 0;
  border: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 16%, transparent);
  background: ${({ $src }) => {
    const safe = $src ? sanitizeImageUrl($src) : null;
    return safe
      ? `var(--bg-surface, #1A1A24) url(${cssUrlValue(safe)}) center/cover no-repeat`
      : 'color-mix(in srgb, var(--bg-surface, #1A1A24) 80%, transparent)';
  }};
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted, rgba(224, 236, 244, 0.55));
`;

const Controls = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  flex: 1;
  min-width: 180px;
`;

const UploadButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 44px;
  padding: 0 0.9rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  color: var(--text-primary, #E0ECF4);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 45%, transparent);
  transition: background 0.15s ease;

  &:hover:not(:disabled) {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 26%, transparent);
  }
  &:disabled { opacity: 0.6; cursor: progress; }
  .spin { animation: pif-spin 0.9s linear infinite; }
  @keyframes pif-spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) { .spin { animation: none; } }
`;

const ClearButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  min-width: 44px;
  border-radius: 8px;
  cursor: pointer;
  color: var(--text-secondary, rgba(224, 236, 244, 0.68));
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 16%, transparent);
  &:hover { color: var(--danger, #ef4444); border-color: color-mix(in srgb, var(--danger, #ef4444) 50%, transparent); }
`;

const HiddenFileInput = styled.input`
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
`;

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

interface ProductImageFieldProps {
  value: string;
  onChange: (url: string) => void;
}

const ProductImageField: React.FC<ProductImageFieldProps> = ({ value, onChange }) => {
  const { authAxios } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Allow re-selecting the same file later
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;

    if (!ALLOWED.includes(file.type)) {
      toast({ title: 'Unsupported image', description: 'Use JPG, PNG, or WEBP.', variant: 'destructive' });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast({ title: 'Image too large', description: 'Max 5MB.', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await authAxios.post('/api/admin/storefront/upload-image', formData);
      const url = res?.data?.imageUrl;
      if (res?.data?.success && typeof url === 'string') {
        onChange(url);
        toast({ title: 'Image uploaded', description: 'The product image is set.' });
      } else {
        toast({ title: 'Upload failed', description: 'Unexpected response from server.', variant: 'destructive' });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not upload the image';
      toast({ title: 'Upload failed', description: msg, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <FormField>
      <FormLabel htmlFor="product-image-url">Image (upload or paste a URL)</FormLabel>
      <Row>
        <Preview $src={value} aria-hidden={!value}>
          {!value && <ImagePlus size={22} />}
        </Preview>
        <Controls>
          <FormInput
            id="product-image-url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://… or upload below"
          />
          <Row>
            <UploadButton
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              aria-label="Upload product image"
            >
              {uploading ? <Loader2 size={16} className="spin" /> : <ImagePlus size={16} />}
              {uploading ? 'Uploading…' : 'Upload Image'}
            </UploadButton>
            {value && (
              <ClearButton type="button" onClick={() => onChange('')} aria-label="Remove image" title="Remove image">
                <X size={16} />
              </ClearButton>
            )}
          </Row>
        </Controls>
      </Row>
      <HiddenFileInput
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFile}
      />
    </FormField>
  );
};

export default ProductImageField;
