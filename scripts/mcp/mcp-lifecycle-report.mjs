/**
 * ============================================================================
 * FILE: mcp-lifecycle-report.mjs
 * PURPOSE: Render sanitized MCP lifecycle warnings from proven inventory data.
 * AUTHOR: Codex | LAST MODIFIED: 2026-08-08
 * AI VILLAGE VALIDATED: Not run (permission-gated)
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Groups duplicate managed roots by exact Claude owner.
 * HOW IT FITS IN THE APP: Lifecycle core re-export -> SessionStart hook output.
 * KEY DECISIONS: Counts and allowlisted labels only; never expose PIDs or argv.
 * NASM PROTOCOL CONTEXT: Not applicable; this is agent infrastructure.
 */

// SECTION: Sanitized warnings
// PURPOSE: Warn about duplicate managed roots without revealing process details.
// WHY: The agent needs an actionable signal while sensitive argv stays private.

/** Build a sanitized warning when one Claude owner has duplicate managed roots. */
export function buildStartWarning(inventory) {
  const countsByOwner = new Map();
  for (const group of inventory.groups.filter((item) => item.agentKind === 'claude')) {
    const ownerKey = `${group.agentPid}:${group.agentCreatedAt}`;
    const counts = countsByOwner.get(ownerKey) || new Map();
    for (const label of group.aliases) counts.set(label, (counts.get(label) || 0) + 1);
    countsByOwner.set(ownerKey, counts);
  }
  const duplicated = [...countsByOwner.values()].flatMap((counts) => [...counts])
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (!duplicated.length) return '';
  const detail = duplicated.map(([label, count]) => `${count} ${label} groups`).join(', ');
  return `[mcp-hygiene] duplicated Claude-owned MCP trees detected (${detail}); other sessions remain protected.\n`;
}
