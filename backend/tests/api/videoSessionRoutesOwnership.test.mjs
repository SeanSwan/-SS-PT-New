import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const routeSource = readFileSync(resolve(__dirname, '../../routes/videoSessionRoutes.mjs'), 'utf8');
const coreRoutesSource = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');

function routeSlice(signature, nextSignature) {
  return routeSource.slice(
    routeSource.indexOf(signature),
    routeSource.indexOf(nextSignature)
  );
}

describe('video session route ownership', () => {
  it('keeps video session routes mounted behind auth and type-safe participant checks', () => {
    expect(coreRoutesSource).toContain("app.use('/api/video-sessions', videoSessionRoutes)");
    expect(routeSource).toContain('router.use(protect);');
    expect(routeSource).toContain('return String(left) === String(right);');
    expect(routeSource).toContain('function isSessionParticipant(session, userId, userRole)');
    expect(routeSource).toContain('if (!isSessionParticipant(session, userId, userRole))');
  });

  it('requires participant ownership for trainer management actions', () => {
    const endRoute = routeSlice("router.patch('/:id/end'", "router.patch('/:id/notes'");
    const notesRoute = routeSlice("router.patch('/:id/notes'", "router.post('/:id/micro-win'");
    const microWinRoute = routeSlice("router.post('/:id/micro-win'", "router.get('/'");

    for (const source of [endRoute, notesRoute, microWinRoute]) {
      expect(source).toContain("authorize(['admin', 'trainer'])");
      expect(source).toContain('getSessionIfParticipant(req.params.id, req.user.id, req.user.role)');
      expect(source).not.toContain('VideoSession.findByPk(req.params.id)');
    }
  });

  it('requires client assignment access before creating a video session for a client', () => {
    expect(routeSource).toContain("import { verifyClientAccessByUserId } from '../middleware/verifyClientAccess.mjs';");
    expect(routeSource).toContain(
      "router.post('/', authorize(['admin', 'trainer']), verifyClientAccessByUserId({ bodyField: 'clientId' })"
    );
  });

  it('keeps trainer video-session listings scoped to the requesting trainer', () => {
    const listRoute = routeSlice("router.get('/', authorize(['admin', 'trainer'])", "router.get('/:id'");

    expect(listRoute).toContain("const where = req.user.role === 'admin' ? undefined : { trainerId: req.user.id };");
    expect(listRoute).toContain('VideoSession.findAll({');
    expect(listRoute).toContain('where,');
  });
});
