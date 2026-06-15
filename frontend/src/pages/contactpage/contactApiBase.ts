/**
 * Contact API base resolver.
 * Keeps public contact forms same-origin on production, staging, and Render
 * previews while preserving the local dev backend port.
 */
export function resolveContactApiBase(hostname: string): string {
  return /^(localhost|127\.0\.0\.1)$/.test(hostname) ? 'http://localhost:5000' : '';
}

export default resolveContactApiBase;
