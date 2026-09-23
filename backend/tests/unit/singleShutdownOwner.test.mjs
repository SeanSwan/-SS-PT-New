import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(join(__dirname, '../../', p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ');

const serverSrc = read('server.mjs');
const startupSrc = read('core/startup.mjs');
const serverCompact = strip(serverSrc);
const startupCompact = strip(startupSrc);

/**
 * E-08 regression guard (hostile review seat 3, 2026-09-18).
 *
 * server.mjs registered SIGTERM/SIGINT at MODULE scope, which runs before
 * initializeServer() -> setupGracefulShutdown() registers its own pair. Node
 * invokes signal listeners in registration order, so the server.mjs handler
 * always won and its process.exit(0) fired as soon as Redis was closed.
 * core/startup.mjs's real sequence — close HTTP server, close Socket.io,
 * close Postgres — never completed on any Render deploy.
 *
 * Invariant: exactly one shutdown owner in the server process.
 */
describe('single graceful-shutdown owner (E-08)', () => {
  it('server.mjs no longer registers its own signal handlers', () => {
    expect(serverCompact).not.toContain("process.on('SIGTERM'");
    expect(serverCompact).not.toContain("process.on('SIGINT'");
  });

  it('server.mjs exports its cleanup instead of exiting the process', () => {
    expect(serverCompact).toContain('export async function shutdownServerResources()');
    // it must NOT call process.exit — that is the orchestrator's job
    expect(serverCompact).not.toContain('process.exit(0)');
  });

  it('server.mjs hands the cleanup to the orchestrator via app.locals', () => {
    expect(serverCompact).toContain('app.locals.shutdownCleanup = shutdownServerResources');
  });

  it('core/startup.mjs remains the single owner and invokes the cleanup', () => {
    expect(startupCompact).toContain("process.on('SIGTERM'");
    expect(startupCompact).toContain("process.on('SIGINT'");
    expect(startupCompact).toContain('await app?.locals?.shutdownCleanup?.()');
  });

  it('runs the cleanup before closing the database, after closing sockets', () => {
    const socketsIdx = startupCompact.indexOf('closeSocketIO();');
    const cleanupIdx = startupCompact.indexOf('await app?.locals?.shutdownCleanup?.()');
    const dbIdx = startupCompact.indexOf('await sequelize.close();');
    expect(socketsIdx).toBeGreaterThan(-1);
    expect(cleanupIdx).toBeGreaterThan(socketsIdx);
    expect(dbIdx).toBeGreaterThan(cleanupIdx);
  });

  it('startup passes the app through to setupGracefulShutdown', () => {
    expect(startupCompact).toContain('setupGracefulShutdown({ ...serverObjects, app })');
    expect(startupCompact).toContain('const setupGracefulShutdown = ({ server, httpServer, app })');
  });
});
