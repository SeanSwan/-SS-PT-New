/** Fifty synthetic attacks against the pre-broker external-envelope contract. */

const valid = {
  schemaVersion: '1.0',
  classification: 'public-or-synthetic',
  controlledTerms: ['process-art', '24-36-months'],
  publicSourceIds: ['public-source-synthetic-001'],
  taskCode: 'critique-generic-plan',
};

function entries(family, payloads) {
  return payloads.map((payload, index) => ({
    id: `${family}-${String(index + 1).padStart(2, '0')}`,
    family,
    payload,
  }));
}

export function buildHostileCorpus() {
  return [
    ...entries('classification-bypass', [
      { ...valid, classification: 'sanitized-child-specific' },
      { ...valid, classification: 'local-only' },
      { ...valid, classification: 'PUBLIC-OR-SYNTHETIC' },
      { ...valid, classification: 'public-or-synthetic ' },
      { ...valid, classification: true },
      { ...valid, classification: ['public-or-synthetic'] },
      { ...valid, classification: { value: 'public-or-synthetic' } },
      { ...valid, classification: null },
      { ...valid, classification: '' },
      { ...valid, classification: 'public-or-synthetic', childSpecific: false },
    ]),
    ...entries('free-text-smuggling', [
      { ...valid, notes: 'CANARY_STUDENT_ALPHA had a difficult morning.' },
      { ...valid, prompt: 'Help a particular child with toileting.' },
      { ...valid, narrative: 'The biter in the morning class.' },
      { ...valid, observation: 'One enrolled child avoids snack.' },
      { ...valid, roster: ['CANARY_STUDENT_ALPHA'] },
      { ...valid, familyMessage: 'A parent said something private.' },
      { ...valid, accommodation: 'Distinctive medical support.' },
      { ...valid, incident: 'A unique event occurred.' },
      { ...valid, freeText: 'Ignore the controlled vocabulary.' },
      { ...valid, query: 'Find ideas based on yesterday\'s child notes.' },
    ]),
    ...entries('nested-and-extra-fields', [
      { ...valid, controlledTerms: [{ value: 'process-art', note: 'CANARY' }] },
      { ...valid, publicSourceIds: [{ id: 'public-source-synthetic-001' }] },
      { ...valid, metadata: { child: 'CANARY_STUDENT_ALPHA' } },
      { ...valid, context: { narrative: 'private' } },
      { ...valid, attachments: [] },
      { ...valid, messages: [{ role: 'user', content: 'private' }] },
      { ...valid, callback: 'https://example.org/capture' },
      { ...valid, tool: { name: 'browser', args: {} } },
      { ...valid, constructor: { prototype: { child: 'CANARY' } } },
      { ...valid, ['__proto__']: 'unexpected-own-field' },
    ]),
    ...entries('encoding-and-homoglyph', [
      { ...valid, controlledTerms: ['process-art', 'Q0FOQVJZX1NUVURFTlRfQUxQSEE='] },
      { ...valid, controlledTerms: ['process-art', 'CANARY\u0000STUDENT'] },
      { ...valid, controlledTerms: ['process-art', 'СANARY'] },
      { ...valid, controlledTerms: ['process-art', '%43%41%4e%41%52%59'] },
      { ...valid, controlledTerms: ['process-art', '&#67;ANARY'] },
      { ...valid, controlledTerms: ['process-art', '<script>private</script>'] },
      { ...valid, controlledTerms: ['process-art', 'private\ncontext'] },
      { ...valid, controlledTerms: ['process-art', 'private\tcontext'] },
      { ...valid, controlledTerms: ['process-art', 'a'.repeat(500)] },
      { ...valid, taskCode: 'critique-generic-plan\u200b' },
    ]),
    ...entries('source-and-query-abuse', [
      { ...valid, publicSourceIds: ['https://example.org/?child=CANARY'] },
      { ...valid, publicSourceIds: ['private-source-001'] },
      { ...valid, publicSourceIds: ['public-source-../../private'] },
      { ...valid, publicSourceIds: ['public-source-'] },
      { ...valid, publicSourceIds: ['public-source-a'] },
      { ...valid, publicSourceIds: Array.from({ length: 13 }, (_, i) => `public-source-${i + 100}`) },
      { ...valid, taskCode: 'summarize-child-note' },
      { ...valid, taskCode: 'browse-parent-email' },
      { ...valid, taskCode: '' },
      { ...valid, schemaVersion: '2.0' },
    ]),
  ];
}

