import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

const models = vi.hoisted(() => ({
  template: { findAll: vi.fn() },
  station: {},
  exercise: {},
  overflow: {},
  stretch: {},
  libraryExercise: { findAll: vi.fn() },
}));

vi.mock('../../../backend/models/index.mjs', () => ({
  getBootcampTemplate: () => models.template,
  getBootcampStation: () => models.station,
  getBootcampExercise: () => models.exercise,
  getBootcampOverflowPlan: () => models.overflow,
  getBootcampStretch: () => models.stretch,
  getExercise: () => models.libraryExercise,
}));

let getTemplates;

beforeEach(async () => {
  vi.clearAllMocks();
  models.libraryExercise.findAll.mockResolvedValue([]);
  models.template.findAll.mockResolvedValue([{
    id: 501,
    trainerId: 41,
    classFormat: 'full_group',
    equipmentProfileId: 17,
    spaceProfileId: 27,
    metadata: {
      selectionManifestV1: {
        version: 1,
        entries: {
          '701': {
            source: { name: 'Original Movement' },
            resolution: 'verified_replacement',
            reasonCode: 'requested_region_mod',
          },
        },
      },
    },
    exercises: [{ id: 701, exerciseName: 'Full Group Movement', exerciseLibraryId: null, sortOrder: 7, board: 'alternative' }],
    stations: [{
      id: 601,
      sortOrder: 0,
      exercises: [{ id: 702, exerciseName: 'Station Movement', exerciseLibraryId: null, sortOrder: 0, board: 'main' }],
    }],
    overflowPlans: [],
    stretches: [],
  }]);
  ({ getTemplates } = await import('../../../backend/services/bootcamp/bootcampCrud.mjs'));
});

describe('server RED: bootcamp template read contract', () => {
  it('loads direct full-group exercises alongside stations without dropping provenance', async () => {
    const templates = await getTemplates(41);
    const query = models.template.findAll.mock.calls[0][0];
    const directInclude = query.include.find((item) => item.as === 'exercises');

    expect(directInclude).toBeTruthy();
    expect(directInclude.include).toBeUndefined();
    expect(templates[0].exercises).toHaveLength(1);
    expect(templates[0].stations[0].exercises).toHaveLength(1);
    expect(templates[0].metadata.selectionManifestV1.version).toBe(1);
    expect(templates[0].equipmentProfileId).toBe(17);
    expect(templates[0].spaceProfileId).toBe(27);
  });
});
