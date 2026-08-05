import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'src/components/BodyMap/index.tsx'), 'utf8');

describe('BodyMap client target selection', () => {
  it('does not fall back to a trainer/admin account id for client pain-entry reads', () => {
    expect(source).toContain("import GlobalClientContext from '../../context/GlobalClientContext'");
    expect(source).not.toContain('const userId = userIdProp ?? user?.id;');
    expect(source).toContain('const verifiedActiveClient = globalClient?.activeClient && globalClient.clientList.some(');
    expect(source).toContain('const staffTargetClientId = userIdProp ?? verifiedActiveClient?.id;');
    expect(source).toContain('const userId = isTrainerOrAdmin ? staffTargetClientId : userIdProp ?? user?.id;');
    expect(source).toContain('if (!entryService || !userId) {');
    expect(source).toContain('Select a client to view pain and injury entries.');
  });

  it('resolves photo + gender from the TARGET client by userId, never the global selection (Slice 2, A2)', () => {
    // The old chain read activeClientProfile (globally selected client), so
    // embedded mounts could show client A's pain on client B's face/figure.
    expect(source).not.toContain('activeClientProfile?.photo');
    expect(source).not.toContain('activeClientProfile?.gender');
    expect(source).toContain('globalClient?.clientList?.find((client) => Number(client.id) === Number(userId))');
    expect(source).toContain('targetClientProfile?.bodyMapHeadPhoto ?? targetClientProfile?.photo ?? null');
    expect(source).toContain('user?.bodyMapHeadPhoto ?? user?.photo ?? user?.profileImageUrl ?? null');
    expect(source).toContain('profilePhotoUrl={displayedPhotoUrl}');
    expect(source).toContain('<BodyMapEvidenceSection');
  });

  it('defaults to the NEUTRAL figure for unresolvable gender (Slice 2, A5)', () => {
    expect(source).toContain("useState<AnatomyGender>('neutral')");
    expect(source).toContain("return 'neutral';");
  });

  it('keeps standalone staff Pain Charts editable through an explicit target selector', () => {
    expect(source).toContain("import BodyMapClientTargetSelector from './BodyMapClientTargetSelector';");
    expect(source).toContain('const showStaffClientSelector = isTrainerOrAdmin && !userIdProp;');
    expect(source).toContain('<BodyMapClientTargetSelector');
    expect(source).toContain("setTargetNotice('Select a client before adding pain details.');");
    expect(source).toContain('setPanelOpen(true);');
  });
});
