import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'src/components/BodyMap/index.tsx'), 'utf8');

describe('BodyMap client target selection', () => {
  it('does not fall back to a trainer/admin account id for client pain-entry reads', () => {
    expect(source).toContain("import GlobalClientContext from '../../context/GlobalClientContext'");
    expect(source).not.toContain('const userId = userIdProp ?? user?.id;');
    expect(source).toContain('const verifiedActiveClientId = globalClient?.activeClient && globalClient.clientList.some(');
    expect(source).toContain('const staffTargetClientId = userIdProp ?? verifiedActiveClientId;');
    expect(source).toContain('const userId = isTrainerOrAdmin ? staffTargetClientId : userIdProp ?? user?.id;');
    expect(source).toContain('if (!entryService || !userId) {');
    expect(source).toContain('Select a client to view pain and injury entries.');
  });

  it('passes a decorative profile photo to the body-map SVG without changing evidence logic', () => {
    expect(source).toContain('const profilePhotoUrl = isTrainerOrAdmin ? activeClientProfile?.photo ?? null : user?.photo ?? user?.profileImageUrl ?? null;');
    expect(source).toContain('profilePhotoUrl={profilePhotoUrl}');
    expect(source).toContain('<BodyMapEvidenceSection');
  });
});
