/** Inject only CoachIntent's database dependency; accidental other app DB imports fail.
 * This loads the real model and Sequelize, never a copied/stubbed model schema.
 */
const productionDatabase = new URL('../../database.mjs', import.meta.url).href;
const model = new URL('../../models/CoachIntent.mjs', import.meta.url).href;
const testDatabase = new URL('./coachTestDatabase.mjs', import.meta.url).href;
export async function resolve(specifier, context, nextResolve) {
  const resolved = await nextResolve(specifier, context);
  if (resolved.url !== productionDatabase) return resolved;
  if (context.parentURL !== model) throw new Error('Unexpected application database import in isolated Coach test');
  return { url: testDatabase, shortCircuit: true };
}
