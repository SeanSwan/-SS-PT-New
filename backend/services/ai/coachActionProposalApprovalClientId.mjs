export function parseProposalClientId(...candidates) {
  for (const value of candidates) {
    if (value === null || value === undefined || value === '') continue;

    if (typeof value === 'number') {
      return Number.isSafeInteger(value) && value > 0 ? value : null;
    }

    if (typeof value !== 'string') return null;

    if (!/^[1-9]\d*$/.test(value)) return null;

    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : null;
  }

  return null;
}

export function invalidProposalClientId() {
  return {
    status: 400,
    body: {
      success: false,
      code: 'PROPOSAL_INVALID_CLIENT_ID',
      error: 'Coach proposal client ID is invalid. Prepare a new draft review.',
    },
  };
}
