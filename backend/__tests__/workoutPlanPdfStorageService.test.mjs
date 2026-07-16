import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  deleteStoredWorkoutPlanPdf,
  storeWorkoutPlanPdf,
} from '../services/workoutPlanPdfStorageService.mjs';

const tempRoots = [];

async function makeUploadsRoot() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'swan-workout-plan-pdf-'));
  tempRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('workoutPlanPdfStorageService', () => {
  it('stores a valid PDF locally with a stable root-relative app URL', async () => {
    const uploadsRoot = await makeUploadsRoot();
    const pdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n');

    const result = await storeWorkoutPlanPdf({
      file: {
        originalname: ' Six Month Foundation Plan.pdf ',
        mimetype: 'application/pdf',
        size: pdfBuffer.length,
        buffer: pdfBuffer,
      },
      planId: 'plan-1',
      clientId: 42,
      uploadedBy: 7,
      uploadsRoot,
      idFactory: () => 'upload-id',
      now: new Date('2026-06-06T12:00:00.000Z'),
    });

    expect(result).toMatchObject({
      url: '/api/workout-plans/plan-1/pdf/content.pdf',
      fileName: 'Six Month Foundation Plan.pdf',
      contentType: 'application/pdf',
      storage: 'local',
      storageKey: 'workout-plans/42/plan-1-upload-id-six-month-foundation-plan.pdf',
      size: pdfBuffer.length,
      updatedBy: 7,
      updatedAt: '2026-06-06T12:00:00.000Z',
    });

    const written = await readFile(path.join(uploadsRoot, result.storageKey));
    expect(written.equals(pdfBuffer)).toBe(true);
  });

  it('removes an uncommitted local PDF by its validated storage key', async () => {
    const uploadsRoot = await makeUploadsRoot();
    const pdfBuffer = Buffer.from('%PDF-1.4\n%%EOF\n');
    const stored = await storeWorkoutPlanPdf({
      file: {
        originalname: 'Cleanup Plan.pdf',
        mimetype: 'application/pdf',
        size: pdfBuffer.length,
        buffer: pdfBuffer,
      },
      planId: 'plan-1',
      clientId: 42,
      uploadedBy: 7,
      uploadsRoot,
      idFactory: () => 'cleanup-id',
    });

    await expect(deleteStoredWorkoutPlanPdf({ ...stored, uploadsRoot })).resolves.toBe(true);
    await expect(readFile(path.join(uploadsRoot, stored.storageKey))).rejects.toMatchObject({
      code: 'ENOENT',
    });
    await expect(deleteStoredWorkoutPlanPdf({
      storage: 'local', storageKey: '../outside.pdf', uploadsRoot,
    })).resolves.toBe(false);
  });
  it('rejects files that do not have a PDF MIME type, extension, and magic header', async () => {
    const badFiles = [
      {
        originalname: 'plan.pdf',
        mimetype: 'text/plain',
        size: 12,
        buffer: Buffer.from('%PDF-1.4\n'),
      },
      {
        originalname: 'plan.txt',
        mimetype: 'application/pdf',
        size: 12,
        buffer: Buffer.from('%PDF-1.4\n'),
      },
      {
        originalname: 'plan.pdf',
        mimetype: 'application/pdf',
        size: 12,
        buffer: Buffer.from('not a pdf'),
      },
    ];

    for (const file of badFiles) {
      await expect(storeWorkoutPlanPdf({
        file,
        planId: 'plan-1',
        clientId: 42,
        uploadedBy: 7,
        uploadsRoot: await makeUploadsRoot(),
      })).rejects.toThrow(/valid PDF/i);
    }
  });
});
