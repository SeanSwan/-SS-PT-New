/** Feature-preview whitelist contract: URL previewing may never become a back door for design routing. */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PREVIEW_OK_KEY, previewOverride } from './previewFlags';

describe('previewOverride', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/?swanpreview=prismCapture');
    localStorage.setItem(PREVIEW_OK_KEY, '1');
  });

  afterEach(() => {
    localStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  it('allows the two surviving browser-preview feature keys', () => {
    expect(previewOverride('prismCapture')).toBe(true);
    window.history.replaceState({}, '', '/?swanpreview=postSaveHandoff');
    expect(previewOverride('postSaveHandoff')).toBe(true);
  });

  it.each(['homeVNext', 'storeV4', 'aboutVNext', 'contactVNext', 'videoVNext', 'galleryVNext', 'dashboardV2'])(
    'rejects retired design key %s even when the URL and admin marker request it',
    (flag) => {
      window.history.replaceState({}, '', `/?swanpreview=${flag}`);
      expect(previewOverride(flag as 'prismCapture')).toBe(false);
    },
  );
});
