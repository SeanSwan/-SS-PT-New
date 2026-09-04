/**
 * SCU S5c — model output boundary.
 *
 * Model text can suggest a proposal, but it cannot assert identity, approval,
 * persistence, or a database result. The server resolves those fields later.
 */
const TYPES = new Set(['answer', 'proposal', 'clarification']);

const boundedMessage = (value) => (
  typeof value === 'string' && value.trim() ? value.trim().slice(0, 4000) : null
);

const boundedProposal = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const commandType = typeof value.commandType === 'string' ? value.commandType.trim().slice(0, 100) : null;
  const params = value.params && typeof value.params === 'object' && !Array.isArray(value.params)
    ? value.params
    : null;
  return commandType && params ? { commandType, params } : null;
};

export function normalizeCoachModelResponse(response = {}) {
  const type = String(response.type || '').trim().toLowerCase();
  const message = boundedMessage(response.message);

  if (!TYPES.has(type) || !message) {
    return {
      type: 'clarification',
      message: 'I need a clearer request before I can help.',
      reasonCode: 'MODEL_RESPONSE_INVALID',
    };
  }
  if (type === 'answer') return { type, message };
  if (type === 'clarification') return { type, message };

  const proposal = boundedProposal(response.proposal);
  if (!proposal) {
    return { type: 'clarification', message: 'I need more detail before I can draft that.', reasonCode: 'PROPOSAL_INVALID' };
  }
  return { type, message, proposal, requiresServerResolution: true };
}
