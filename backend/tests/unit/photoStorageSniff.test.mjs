import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { sniffFileType, uploadPhoto } from '../../services/photoStorageService.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Build a buffer with `head` bytes followed by padding (sniff reads <=12 bytes). */
const buf = (head, pad = 32) => Buffer.concat([Buffer.from(head, 'latin1'), Buffer.alloc(pad)]);

describe('sniffFileType — magic-byte identification (E-07)', () => {
  it('identifies jpeg', () => {
    expect(sniffFileType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Buffer.alloc(16)]))).toEqual({
      ext: 'jpg', mime: 'image/jpeg',
    });
  });

  it('identifies png', () => {
    expect(sniffFileType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Buffer.alloc(16)]))).toEqual({
      ext: 'png', mime: 'image/png',
    });
  });

  it('identifies gif', () => {
    expect(sniffFileType(buf('GIF89a'))).toEqual({ ext: 'gif', mime: 'image/gif' });
  });

  it('identifies webp', () => {
    expect(sniffFileType(buf('RIFF\u0000\u0000\u0000\u0000WEBP'))).toEqual({ ext: 'webp', mime: 'image/webp' });
  });

  it('identifies heic and does not mistake it for mp4', () => {
    // HEIC and MP4 both carry 'ftyp' at offset 4; only the brand distinguishes them.
    expect(sniffFileType(buf('\u0000\u0000\u0000\u0018ftypheic'))).toEqual({ ext: 'heic', mime: 'image/heic' });
  });

  it('identifies mp4 video (social posts upload video through uploadPhoto)', () => {
    expect(sniffFileType(buf('\u0000\u0000\u0000\u0018ftypisom'))).toEqual({ ext: 'mp4', mime: 'video/mp4' });
  });

  it('identifies webm/matroska video', () => {
    expect(sniffFileType(Buffer.from([0x1a, 0x45, 0xdf, 0xa3, ...Buffer.alloc(16)]))).toEqual({
      ext: 'webm', mime: 'video/webm',
    });
  });

  it('identifies pdf (trainer credential uploads)', () => {
    expect(sniffFileType(buf('%PDF-1.4'))).toEqual({ ext: 'pdf', mime: 'application/pdf' });
  });

  it('rejects an html payload masquerading as a .jpg', () => {
    // the exact attack E-07 closes: text/html bytes named "avatar.jpg"
    expect(sniffFileType(buf('<!DOCTYPE html><script>alert(1)</script>'))).toBeNull();
  });

  it('rejects svg (script-bearing image type)', () => {
    expect(sniffFileType(buf('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script>'))).toBeNull();
  });

  it('rejects buffers too short to identify', () => {
    expect(sniffFileType(Buffer.from([0xff, 0xd8]))).toBeNull();
    expect(sniffFileType(null)).toBeNull();
    expect(sniffFileType('not a buffer')).toBeNull();
  });
});

describe('uploadPhoto derives storage metadata from bytes, not the request (E-07)', () => {
  it('rejects an html upload even when the caller declares image/jpeg and names it .jpg', async () => {
    await expect(
      uploadPhoto(buf('<!DOCTYPE html><script>alert(1)</script>'), {
        userId: '1',
        category: 'profiles',
        originalFilename: 'avatar.jpg',
        contentType: 'image/jpeg',
      })
    ).rejects.toThrow(/not a recognized image, video or PDF/);
  });

  it('stored Content-Type comes from the sniff, never the declared type', async () => {
    const source = readFileSync(join(__dirname, '../../services/photoStorageService.mjs'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\s+/g, ' ');
    // the R2 PutObject must use the sniffed type
    expect(source).toContain('ContentType: safeContentType');
    expect(source).not.toContain('ContentType: contentType ||');
    // and the extension used in the object key must come from the sniff
    expect(source).toContain('const ext = sniffed.ext;');
    expect(source).not.toContain("path.extname(originalFilename).toLowerCase()");
  });
});
