/**
 * "Make me a PDF" is recognised on the device (Sean, 2026-09-23): the ask and the
 * client it names never go to Swan Coach. The recogniser must stay narrow, so a
 * question ABOUT a PDF still reaches the coach.
 */
import { describe, expect, it } from 'vitest';
import { isPdfRequest, pdfTarget, resolveNamedClient } from './coachPdfRequest';

describe('isPdfRequest', () => {
  it.each([
    'I need you to go ahead and create a PDF file for me based off their workout plan',
    'make a pdf of her plan and progress',
    "Generate Jesse's progress PDF",
    'PDF of Maria Rios progress please',
    'can you get me a PDF for Jesse?',
    'how do I make a PDF of her progress?',
  ])('asks for a PDF: %s', (text) => {
    expect(isPdfRequest(text)).toBe(true);
  });

  it.each([
    'what is a PDF?',
    "why won't the PDF open",
    'why did the download of her PDF fail?', // a verb before "PDF", but a question about one
    'does the send button attach the PDF?',
    'The last PDF I sent Maria was wrong',
    '/pdf',
    'Log bench 4x8 at 185',
    '',
  ])('does not hijack: %s', (text) => {
    expect(isPdfRequest(text)).toBe(false);
  });
});

describe('resolveNamedClient — names on screen, never guessed', () => {
  const roster = [
    { id: 84, label: 'Jesse Moreno' },
    { id: 7, label: 'Maria Rios' },
    { id: 9, label: 'Maria Chen' },
    { id: 12, label: 'Client #12' },
  ];

  it('a full name wins, possessives included', () => {
    expect(resolveNamedClient("make a PDF of Jesse Moreno's plan", roster)?.id).toBe(84);
    expect(resolveNamedClient('pdf for maria chen', roster)?.id).toBe(9);
  });

  it('a first name counts only when exactly one client carries it', () => {
    expect(resolveNamedClient("make Jesse's pdf", roster)?.id).toBe(84);
    expect(resolveNamedClient("make Maria's pdf", roster)).toBeNull();
  });

  it('CONTROL: no name, a partial word, or the ID fallback label resolve to nobody', () => {
    expect(resolveNamedClient('make her pdf', roster)).toBeNull();
    expect(resolveNamedClient('make a pdf for Jess', roster)).toBeNull();
    expect(resolveNamedClient('make a pdf for Client', roster)).toBeNull();
  });
});

describe('pdfTarget', () => {
  const roster = [{ id: 84, label: 'Jesse Moreno' }, { id: 7, label: 'Maria Rios' }];
  it('the client you name beats the pinned client; no name → the pinned one; neither → nobody', () => {
    expect(pdfTarget("make Jesse's pdf", roster, 7)?.id).toBe(84);
    expect(pdfTarget('make her pdf', roster, 7)?.id).toBe(7);
    expect(pdfTarget('make her pdf', roster, null)).toBeNull();
    expect(pdfTarget('make her pdf', roster, 999)).toBeNull(); // a pin outside the roster is not trusted
  });
});
