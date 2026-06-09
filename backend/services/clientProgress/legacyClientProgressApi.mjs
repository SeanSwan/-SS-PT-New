// backend/services/clientProgress/legacyClientProgressApi.mjs

import { getAllModels, Op } from '../../models/index.mjs';

const MEASUREMENT_FIELDS = {
  weight: 'weight',
  bodyFat: 'bodyFatPercentage',
  chest: 'chest',
  waist: 'naturalWaist',
  hips: 'hips',
};

const MEASUREMENT_INPUT_KEYS = ['weight', 'bodyFat', 'chest', 'waist', 'hips', 'arms', 'thighs'];
const BODY_MEASUREMENT_FIELD_MAP = [
  ['weight', 'weight'],
  ['bodyFatPercentage', 'bodyFat'],
  ['chest', 'chest'],
  ['naturalWaist', 'waist'],
  ['hips', 'hips'],
  ['rightBicep', 'arms'],
  ['leftBicep', 'arms'],
  ['rightThigh', 'thighs'],
  ['leftThigh', 'thighs'],
  ['notes', 'notes'],
];
const POSITIVE_INT_RE = /^[1-9]\d*$/;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const firstNumber = (...values) => {
  for (const value of values) {
    const numericValue = toNumber(value);
    if (numericValue !== null) return numericValue;
  }
  return null;
};

const objectValue = (object, field) => (object ? object[field] : undefined);

const getMeasurementInfo = (client) => {
  const masterPromptJson = objectValue(client, 'masterPromptJson');
  return objectValue(masterPromptJson, 'measurements') || {};
};

const parsePositiveInt = (value) => {
  const normalized = String(value ?? '').trim();
  if (!POSITIVE_INT_RE.test(normalized)) return null;
  const num = Number.parseInt(normalized, 10);
  return Number.isSafeInteger(num) ? num : null;
};

const parseOptionalPositiveInt = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  return parsePositiveInt(value);
};

const getRequesterId = (req) => parsePositiveInt(req.user?.id);

const getClientOr404 = async (res, clientId, attributes) => {
  const { User } = getAllModels();
  const client = await User.findByPk(clientId, { attributes });
  if (client?.role === 'client') return client;
  res.status(404).json({ success: false, message: 'Client not found' });
  return null;
};

const requireLegacyClientId = (req, res) => {
  const clientId = parsePositiveInt(req.params.userId);
  if (clientId) return clientId;
  res.status(400).json({ success: false, message: 'Invalid user ID' });
  return null;
};

const getLegacyClientContext = async (req, res, attributes) => {
  const clientId = requireLegacyClientId(req, res);
  if (!clientId) return null;
  const client = await getClientOr404(res, clientId, attributes);
  return client ? { clientId, client } : null;
};

const getMeasurementField = (req, res) => {
  const type = String(req.query.type || 'weight');
  const field = MEASUREMENT_FIELDS[type];
  if (field) return { field, type };
  res.status(400).json({
    success: false,
    message: `Unsupported measurement type: ${type}`,
  });
  return null;
};

const getMeasurementLimit = (req, res) => {
  const requestedLimit = parseOptionalPositiveInt(req.query.limit, 30);
  if (requestedLimit) return Math.min(requestedLimit, 365);
  res.status(400).json({ success: false, message: 'Invalid limit' });
  return null;
};

const getParsedMeasurementDate = (value, res) => {
  const parsedDate = value ? new Date(value) : new Date();
  if (!Number.isNaN(parsedDate.getTime())) return parsedDate;
  res.status(400).json({ success: false, message: 'Invalid measurementDate' });
  return null;
};

const isProvided = (value) => value !== undefined && value !== null && value !== '';

const hasMeasurementMetrics = (body = {}) => MEASUREMENT_INPUT_KEYS
  .some((field) => isProvided(body[field]));

const findOneOrNull = (model, options) => (model ? model.findOne(options) : null);

const countOrZero = async (model, options) => (model ? Number(await model.count(options) || 0) : 0);

const recentMeasurementWindow = () => new Date(Date.now() - THIRTY_DAYS_MS);

const getRecentMeasurements = (BodyMeasurement, clientId) => {
  if (!BodyMeasurement) return [];
  return BodyMeasurement.findAll({
    where: { userId: clientId, measurementDate: { [Op.gte]: recentMeasurementWindow() } },
    attributes: ['measurementDate', 'weight', 'bodyFatPercentage'],
    order: [['measurementDate', 'DESC']],
    limit: 30,
  });
};

const getLastCompletedSession = (Session, clientId) => findOneOrNull(Session, {
  where: { userId: clientId, status: 'completed', sessionDate: { [Op.not]: null } },
  order: [['sessionDate', 'DESC']],
});

const getLegacyProgressRows = async ({ ClientBaselineMeasurements, BodyMeasurement, Session }, clientId) => {
  const [latestBaseline, latestMeasurement, firstMeasurement, sessionsCompleted, lastSession, recentMeasurements] =
    await Promise.all([
      findOneOrNull(ClientBaselineMeasurements, { where: { userId: clientId }, order: [['takenAt', 'DESC']] }),
      findOneOrNull(BodyMeasurement, { where: { userId: clientId }, order: [['measurementDate', 'DESC']] }),
      findOneOrNull(BodyMeasurement, { where: { userId: clientId }, order: [['measurementDate', 'ASC']] }),
      countOrZero(Session, { where: { userId: clientId, status: 'completed' } }),
      getLastCompletedSession(Session, clientId),
      getRecentMeasurements(BodyMeasurement, clientId),
    ]);
  return { latestBaseline, latestMeasurement, firstMeasurement, sessionsCompleted, lastSession, recentMeasurements };
};

const getLegacyWeightSummary = (client, latestMeasurement, firstMeasurement) => {
  const measurementInfo = getMeasurementInfo(client);
  const currentWeight = firstNumber(
    objectValue(latestMeasurement, 'weight'),
    objectValue(client, 'weight'),
    objectValue(measurementInfo, 'currentWeight'),
  );
  const startingWeight = firstNumber(
    objectValue(firstMeasurement, 'weight'),
    objectValue(measurementInfo, 'currentWeight'),
    currentWeight,
  );
  return {
    currentWeight,
    startingWeight,
    targetWeight: toNumber(objectValue(measurementInfo, 'targetWeight')),
  };
};

const buildTargetWeightGoals = ({ targetWeight, currentWeight }) => (
  targetWeight === null
    ? []
    : [{ name: 'Target Weight', target: targetWeight, current: currentWeight, unit: 'lbs' }]
);

const mapRecentMeasurements = (recentMeasurements) => (recentMeasurements || []).map((row) => ({
  date: row.measurementDate,
  weight: toNumber(row.weight),
  bodyFat: toNumber(row.bodyFatPercentage),
})).reverse();

const weightChangeFor = ({ currentWeight, startingWeight }) => {
  if (currentWeight === null || startingWeight === null) return null;
  return currentWeight - startingWeight;
};

const lastSessionDateFrom = (lastSession) => lastSession?.sessionDate || null;

const buildLegacyProgressData = async (models, clientId, client) => {
  const rows = await getLegacyProgressRows(models, clientId);
  const weightSummary = getLegacyWeightSummary(client, rows.latestMeasurement, rows.firstMeasurement);
  return {
    currentWeight: weightSummary.currentWeight,
    startingWeight: weightSummary.startingWeight,
    weightChange: weightChangeFor(weightSummary),
    nasmScore: toNumber(rows.latestBaseline?.nasmAssessmentScore),
    sessionsCompleted: rows.sessionsCompleted,
    lastSessionDate: lastSessionDateFrom(rows.lastSession),
    goals: buildTargetWeightGoals(weightSummary),
    recentMeasurements: mapRecentMeasurements(rows.recentMeasurements),
  };
};

const sendMeasurementMetricsRequired = (res) => {
  res.status(400).json({ success: false, message: 'At least one measurement value is required' });
  return null;
};

const mappedMeasurementBody = (body = {}) => Object.fromEntries(
  BODY_MEASUREMENT_FIELD_MAP.map(([targetField, sourceField]) => [targetField, body[sourceField]]),
);

const buildMeasurementCreateFields = (body, clientId, measurementDate, recordedBy) => ({
  userId: clientId,
  recordedBy,
  measurementDate,
  ...mappedMeasurementBody(body),
});

const getRequesterIdOr401 = (req, res) => {
  const recordedBy = getRequesterId(req);
  if (recordedBy) return recordedBy;
  res.status(401).json({ success: false, message: 'Invalid auth context' });
  return null;
};

const requestBody = (req) => req.body || {};

const getMeasurementDateFromRequest = (req, res) => (
  getParsedMeasurementDate(requestBody(req).measurementDate, res)
);

const getMeasurementCreatePrerequisites = (req, res) => {
  const measurementDate = getMeasurementDateFromRequest(req, res);
  if (!measurementDate) return null;
  const recordedBy = getRequesterIdOr401(req, res);
  return recordedBy ? { measurementDate, recordedBy } : null;
};

const getMeasurementCreateFields = (req, res, clientId) => {
  if (!hasMeasurementMetrics(req.body)) return sendMeasurementMetricsRequired(res);
  const prerequisites = getMeasurementCreatePrerequisites(req, res);
  if (!prerequisites) return null;
  return buildMeasurementCreateFields(
    requestBody(req),
    clientId,
    prerequisites.measurementDate,
    prerequisites.recordedBy,
  );
};

export const getLegacyClientProgress = async (req, res) => {
  const context = await getLegacyClientContext(req, res, ['id', 'role', 'weight', 'masterPromptJson']);
  if (!context) return null;
  const data = await buildLegacyProgressData(getAllModels(), context.clientId, context.client);
  return res.status(200).json({
    success: true,
    data,
  });
};

export const getLegacyMeasurementHistory = async (req, res) => {
  const context = await getLegacyClientContext(req, res, ['id', 'role']);
  if (!context) return null;

  const measurementType = getMeasurementField(req, res);
  const limit = getMeasurementLimit(req, res);
  if (!measurementType || !limit) return null;

  const { BodyMeasurement } = getAllModels();
  const measurements = await BodyMeasurement.findAll({
    where: { userId: context.clientId, [measurementType.field]: { [Op.not]: null } },
    attributes: ['measurementDate', measurementType.field],
    order: [['measurementDate', 'DESC']],
    limit,
  });

  return res.status(200).json({
    success: true,
    data: measurements.map((row) => ({
      date: row.measurementDate,
      value: toNumber(row[measurementType.field]),
      type: measurementType.type,
    })).reverse(),
  });
};

export const createLegacyMeasurement = async (req, res) => {
  const context = await getLegacyClientContext(req, res, ['id', 'role']);
  if (!context) return null;
  const measurementFields = getMeasurementCreateFields(req, res, context.clientId);
  if (!measurementFields) return null;

  const { BodyMeasurement } = getAllModels();
  const measurement = await BodyMeasurement.create(measurementFields);
  return res.status(201).json({ success: true, measurement });
};
