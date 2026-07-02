import {
  getCompanionBridgeSummaries,
  runWithCompanionBridgeContext,
} from '../services/gamification/CompanionEventBridgeService.mjs';

export const companionEventBridgeResponseMiddleware = (_req, res, next) => (
  runWithCompanionBridgeContext(() => {
    const originalJson = res.json.bind(res);

    res.json = (body) => {
      const summaries = getCompanionBridgeSummaries();
      if (
        summaries.length > 0
        && body
        && typeof body === 'object'
        && !Array.isArray(body)
        && body.companionEvents === undefined
      ) {
        return originalJson({ ...body, companionEvents: summaries });
      }
      return originalJson(body);
    };

    return next();
  })
);

export default companionEventBridgeResponseMiddleware;
