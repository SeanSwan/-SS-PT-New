/**
 * Runtime safety contract for parked Design Studio previews.
 *
 * Source-string contracts lock the boundary's shape; this suite proves React capture semantics still block
 * direct DOM events, native target listeners, form submission, and React portals outside the inert DOM subtree.
 */
import { fireEvent, render } from '@testing-library/react';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { describe, expect, it, vi } from 'vitest';
import { PreviewReadOnlyBoundary } from './DesignPlaygroundLayout';

interface MutationProbeProps {
  onInlineClick: () => void;
  onNativeClick: () => void;
  onPortalClick: () => void;
  onSubmit: () => void;
}

function MutationProbe({
  onInlineClick,
  onNativeClick,
  onPortalClick,
  onSubmit,
}: MutationProbeProps) {
  const nativeTarget = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const target = nativeTarget.current;
    if (!target) return;
    target.addEventListener('click', onNativeClick);
    return () => target.removeEventListener('click', onNativeClick);
  }, [onNativeClick]);

  return (
    <>
      <form data-testid="mutation-form" onSubmit={onSubmit}>
        <button ref={nativeTarget} type="button" onClick={onInlineClick}>
          Attempt inline mutation
        </button>
      </form>
      {createPortal(
        <button data-testid="portal-mutation" type="button" onClick={onPortalClick}>
          Attempt portal mutation
        </button>,
        document.body,
      )}
    </>
  );
}

describe('PreviewReadOnlyBoundary runtime safety', () => {
  it('blocks direct, native-listener, form-submit, and portal mutation events', () => {
    const onInlineClick = vi.fn();
    const onNativeClick = vi.fn();
    const onPortalClick = vi.fn();
    const onSubmit = vi.fn();
    const { container } = render(
      <PreviewReadOnlyBoundary>
        <MutationProbe {...{ onInlineClick, onNativeClick, onPortalClick, onSubmit }} />
      </PreviewReadOnlyBoundary>,
    );

    const root = container.querySelector<HTMLElement>('[data-testid="preview-read-only-root"]')!;
    expect(root).toHaveAttribute('inert');
    const nativeInput = document.createElement('input');
    const onNativeChange = vi.fn();
    nativeInput.addEventListener('change', onNativeChange);
    root.appendChild(nativeInput);
    const nativeChangeEvent = new Event('change', { bubbles: true, cancelable: true });
    nativeInput.dispatchEvent(nativeChangeEvent);
    container.querySelector('button')?.click();
    fireEvent.submit(container.querySelector('form')!);
    document.querySelector<HTMLButtonElement>('[data-testid="portal-mutation"]')?.click();

    expect(nativeChangeEvent.defaultPrevented).toBe(true);
    expect([onInlineClick, onNativeClick, onNativeChange, onPortalClick, onSubmit].some((spy) => spy.mock.calls.length)).toBe(false);
  });
});
