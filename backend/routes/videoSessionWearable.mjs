/**
 * Contain the legacy client-asserted wearable path until verified ingestion exists.
 * Stored values have no provenance contract: preserve them, but never present them
 * as measurements. Nothing in this module writes to a session or calls a provider.
 */
function unavailableWearableData(stored) {
  return {
    wearableData: null,
    wearableStatus: {
      availability: 'unavailable',
      verification: stored == null ? 'none' : 'unverified',
      code: 'VERIFIED_WEARABLE_SOURCE_UNAVAILABLE',
      message: 'Verified wearable data is unavailable.',
    },
  };
}

// Keep generic detail/list/end responses from bypassing the wearable quarantine.
// toJSON creates a plain Sequelize snapshot; the original model/history is intact.
export function serializeVideoSession(session, actor) {
  const snapshot = typeof session.toJSON === 'function' ? session.toJSON() : session;
  // Stored credentials belong to no general DTO; fresh joining has its own route.
  const { joinToken: _storedCredential, trainerNotes, ...data } = snapshot;
  const canViewNotes = actor?.role === 'admin' || (
    actor?.role === 'trainer' && String(actor.id) === String(snapshot.trainerId)
  );
  return {
    ...data,
    ...(canViewNotes ? { trainerNotes } : {}),
    ...unavailableWearableData(data.wearableData),
  };
}

export function createUnavailableWearableHandlers(getSessionIfParticipant, logger) {
  return {
    async write(req, res) {
      try {
        const { session, error, status } = await getSessionIfParticipant(req.params.id, req.user.id, req.user.role);
        if (!session) return res.status(status).json({ success: false, message: error });

        // Do not inspect a caller's source/metrics/proof: none authenticates a device.
        return res.status(409).json({
          success: false,
          code: 'WEARABLE_INGESTION_DISABLED',
          message: 'Wearable sync is unavailable until verified device ingestion is connected. No data was saved.',
        });
      } catch (err) {
        logger.error('Wearable sync error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to sync wearable data' });
      }
    },

    async read(req, res) {
      try {
        const { session, error, status } = await getSessionIfParticipant(req.params.id, req.user.id, req.user.role);
        if (!session) return res.status(status).json({ success: false, message: error });

        return res.json({ success: true, data: unavailableWearableData(session.wearableData) });
      } catch (err) {
        logger.error('Wearable fetch error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch wearable data' });
      }
    },
  };
}
