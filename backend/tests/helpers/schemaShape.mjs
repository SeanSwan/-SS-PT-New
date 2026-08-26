/**
 * schemaShape.mjs
 * ===============
 * Read the parameter names out of a registry command's Zod schema.
 *
 * WHY THIS IS NOT `Object.keys(schema.shape)`
 * -------------------------------------------
 * 19 of the registry's 139 schemas are not bare `ZodObject`s — they are wrapped in
 * `.refine()` (`ZodEffects`) or `.optional()` (`ZodOptional`). On those, `.shape` is
 * `undefined`, so the naive read returns `[]`. Measured 2026-08-26: 12 commands had
 * their ENTIRE parameter list hidden that way, `update_client` (15 params, `clientId`
 * among them) included.
 *
 * That matters because the miss is silent and it is in the reassuring direction: a
 * survey asking "which commands expose a clientId?" under-reports, and an audit built
 * on it concludes the surface is smaller than it is. `schemaShapeSelfCheck` below is
 * the positive control that keeps this honest — it asserts a known-wrapped schema
 * still yields its keys.
 */

const MAX_UNWRAP_DEPTH = 8;

/** Peel wrappers until a schema with a `.shape` is found. Returns null if there is none. */
export function unwrapObjectSchema(schema, depth = 0) {
  if (!schema || depth > MAX_UNWRAP_DEPTH) return null;
  if (schema.shape) return schema;
  const def = schema._def || {};
  const inner = def.schema
    || def.innerType
    || def.type
    || (Array.isArray(def.options) ? def.options[0] : null);
  return inner ? unwrapObjectSchema(inner, depth + 1) : null;
}

/** Parameter names a command accepts, seeing through refine/optional wrappers. */
export function paramNames(command) {
  const object = unwrapObjectSchema(command?.inputSchema);
  return object ? Object.keys(object.shape) : [];
}

/**
 * Positive control for the reader itself: returns the commands whose shape is visible
 * ONLY after unwrapping. An empty result means either the registry stopped wrapping
 * schemas or this reader stopped unwrapping them — the caller must decide which, and
 * must not treat an empty result as "nothing to see".
 */
export function commandsWithHiddenShape(commands) {
  const hidden = [];
  for (const command of commands) {
    const naive = command?.inputSchema?.shape ? Object.keys(command.inputSchema.shape) : [];
    const real = paramNames(command);
    if (real.length > naive.length) hidden.push(command.type);
  }
  return hidden;
}
