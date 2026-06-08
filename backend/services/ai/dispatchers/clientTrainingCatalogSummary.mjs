/**
 * Client training catalog summary
 * ===============================
 *
 * Keeps Swan Coach self-service plan-vault context useful without exposing
 * freeform plan titles, notes, or client-identifying text.
 */

export const summarizeTrainingPlanCatalog = (catalog = {}) => {
  const slots = Array.isArray(catalog.slots) ? catalog.slots : [];
  const safeSlots = slots.map((slot) => {
    const plan = slot?.plan && typeof slot.plan === 'object' ? slot.plan : null;
    return {
      horizonKey: slot?.horizonKey ?? null,
      label: slot?.label ?? null,
      durationWeeks: slot?.durationWeeks ?? null,
      durationDays: slot?.durationDays ?? null,
      isDefaultHorizon: Boolean(slot?.isDefaultHorizon),
      isFilled: Boolean(slot?.isFilled),
      isPrimary: Boolean(slot?.isPrimary),
      planId: plan?.id ?? null,
      status: plan?.status ?? null,
      assignmentDefault: plan?.assignmentDefault ?? null,
      billingIntent: plan?.billingIntent ?? null,
      defaultShouldDeductSession: Boolean(plan?.defaultShouldDeductSession),
      currentWeek: plan?.currentWeek ?? null,
      currentDay: plan?.currentDay ?? null,
      hasPdf: Boolean(plan?.pdfFile?.url || plan?.planPdf?.url),
    };
  });
  const primary = safeSlots.find((slot) => slot.isPrimary) || null;
  return {
    defaultHorizonKey: catalog.defaultHorizonKey ?? 'six_month',
    primaryPlanId: catalog.primaryPlanId ?? null,
    primaryHorizonKey: primary?.horizonKey ?? catalog.primaryHorizonKey ?? null,
    primaryHorizonLabel: primary?.label ?? null,
    filledHorizonKeys: safeSlots.filter((slot) => slot.isFilled).map((slot) => slot.horizonKey),
    slotCount: safeSlots.length,
    slots: safeSlots,
  };
};
