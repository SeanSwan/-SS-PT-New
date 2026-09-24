/**
 * "Make me a PDF" is recognised on the device (Sean, 2026-09-23): the ask and the
 * client it names never go to Swan Coach. The recogniser must stay narrow, so a
 * question ABOUT a PDF still reaches the coach.
 */
import { describe, expect, it } from 'vitest';
import { isPdfRequest, pdfSubject, pdfTarget, resolveNamedClient } from './coachPdfRequest';

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
    expect((resolveNamedClient("make a PDF of Jesse Moreno's plan", roster) as { id: number }).id).toBe(84);
    expect((resolveNamedClient('pdf for maria chen', roster) as { id: number }).id).toBe(9);
  });

  it('a first name counts only when exactly one client carries it — two is ambiguous, never a guess', () => {
    expect((resolveNamedClient("make Jesse's pdf", roster) as { id: number }).id).toBe(84);
    expect((resolveNamedClient('can you get me a PDF for Jesse?', roster) as { id: number }).id).toBe(84);
    expect(resolveNamedClient("make Maria's pdf", roster)).toBe('ambiguous');
  });

  it('a first name alone must read as a name, not an ordinary word', () => {
    const withWill = [...roster, { id: 30, label: 'Will Smith' }];
    expect(resolveNamedClient('Will you make me a PDF?', withWill)).toBeNull();
    expect((resolveNamedClient('make a PDF for Will', withWill) as { id: number }).id).toBe(30);
  });

  it('the longest full name wins when one contains another; a hyphenated name is not its prefix', () => {
    const lees = [{ id: 1, label: 'Ann Lee' }, { id: 2, label: 'Ann Lee-Park' }];
    expect((resolveNamedClient('PDF for Ann Lee-Park', lees) as { id: number }).id).toBe(2);
    expect((resolveNamedClient('PDF for Ann Lee please', lees) as { id: number }).id).toBe(1);
  });

  it('CONTROL: no name, a partial word, or the ID fallback label resolve to nobody', () => {
    expect(resolveNamedClient('make her pdf', roster)).toBeNull();
    expect(resolveNamedClient('make a pdf for Jess', roster)).toBeNull();
    expect(resolveNamedClient('make a pdf for Client', roster)).toBeNull();
  });
});

describe('pdfTarget', () => {
  const roster = [{ id: 84, label: 'Jesse Moreno' }, { id: 7, label: 'Maria Rios' }];
  it('an ambiguous name is refused — it never falls back to the pinned client', () => {
    const marias = [...roster, { id: 9, label: 'Maria Chen' }];
    expect(pdfTarget("make Maria's pdf", marias, 84)).toBe('ambiguous');
  });

  it('the client you name beats the pinned client; no name → the pinned one; neither → nobody', () => {
    expect((pdfTarget("make Jesse's pdf", roster, 7) as { id: number }).id).toBe(84);
    expect((pdfTarget('make her pdf', roster, 7) as { id: number }).id).toBe(7);
    expect(pdfTarget('make her pdf', roster, null)).toBeNull();
    expect(pdfTarget('make her pdf', roster, 999)).toBeNull(); // a pin outside the roster is not trusted
  });
});

describe('pdfSubject — the pin stands in ONLY when nobody is named (Astra F4)', () => {
  const roster = [{ id: 84, label: 'Jesse Moreno' }, { id: 85, label: 'Maria Rios' }, { id: 86, label: 'Maria Chen' }];
  const kind = (text: string) => pdfSubject(text, roster, 84).kind;
  const who = (text: string) => { const s = pdfSubject(text, roster, 84); return s.kind === 'client' ? s.client.id : s.kind; };

  it('any capitalisation, possessives and speech-style lowercase resolve the same way', () => {
    expect(who('make a pdf for jesse moreno')).toBe(84);
    expect(who('MAKE A PDF FOR MARIA CHEN')).toBe(86);
    expect(who("make maria rios's pdf")).toBe(85);
    expect(kind('Make a PDF for maria')).toBe('ambiguous');
    expect(kind("maria's pdf please")).toBe('ambiguous');
  });

  it('a name that matches nobody is refused — never the pinned client', () => {
    expect(kind('Make a PDF for Olivia Patel')).toBe('unknown');
    expect(kind('Make a PDF for Jess')).toBe('unknown');
    expect(pdfTarget('Make a PDF for Olivia Patel', roster, 84)).toBeNull();
  });

  it('two named clients are refused regardless of name length or form', () => {
    expect(kind('Make a PDF comparing Maria Rios with Jesse Moreno')).toBe('multiple');
    expect(kind('pdf for Jesse Moreno and maria chen')).toBe('multiple');
    expect(kind('PDF for Maria Chen vs Olivia Patel')).toBe('multiple');
    expect(pdfTarget('Make a PDF comparing Maria Rios with Jesse Moreno', roster, 84)).toBe('ambiguous');
  });

  it('the same client named twice is one subject', () => {
    expect(who("Make a PDF for Maria Rios — Maria's knee plan")).toBe(85);
    expect(who("Jesse Moreno's PDF, the one for Jesse Moreno")).toBe(84);
  });

  it('CONTROL: ordinary words after "for/of" are not names, so the pinned client is used', () => {
    for (const text of ['Make a PDF for me', 'Make a PDF of Week 6', 'make a pdf of their workout plan', 'Create a PDF for Today', 'make a PDF for Client']) {
      expect(who(text)).toBe(84);
    }
    expect(pdfSubject('make her pdf', roster, null).kind).toBe('none');
  });
});

describe('pdfSubject — precision after the hostile review (ordinary words are not people)', () => {
  const roster = [
    { id: 85, label: 'Maria Rios' }, { id: 40, label: 'June Park' }, { id: 41, label: 'Will Carter' }, { id: 42, label: 'Mark Diaz' },
  ];
  const who = (text: string, pin = 85) => { const s = pdfSubject(text, roster, pin); return s.kind === 'client' ? s.client.id : s.kind; };

  it('a lowercase ordinary word never becomes a client: months, "and will", "and mark", "with will"', () => {
    expect(who('make a pdf of her progress for june')).toBe(85);
    expect(who('Make a PDF of her progress and will you email it')).toBe(85);
    expect(who('make a pdf of her plan and mark the changes')).toBe(85);
    expect(who('make a pdf of her plan with will')).toBe(85);
    expect(who("Let's make a PDF of her plan")).toBe(85);
  });

  it('the same names, written as names, still resolve', () => {
    expect(who('make a pdf for Will')).toBe(41);
    expect(who("make mark's pdf")).toBe(42);
    expect(who('make a pdf of her plan with Will')).toBe(41); // a capitalised name is a named subject; the preview shows whose PDF it is
  });

  it('a first name followed by a surname that matches nobody is a different person', () => {
    expect(who('Make a PDF for Maria Smith', 41)).toBe('unknown');
  });

  it('unknown names are refused in more shapes: possessive, "on", "to"', () => {
    for (const text of ["Get me Olivia's PDF", "Make Olivia Patel's PDF", 'Make a PDF on Olivia Patel', 'Send a PDF to Olivia Patel']) {
      expect(who(text)).toBe('unknown');
    }
  });

  it('labels, acronyms and month abbreviations are not names', () => {
    expect(who("Make Maria Rios's PDF for Sept", 41)).toBe(85);
    expect(who('Make a PDF of her plan with NASM scores')).toBe(85);
    expect(who('Make a PDF of her plan for Q3')).toBe(85);
  });
});
