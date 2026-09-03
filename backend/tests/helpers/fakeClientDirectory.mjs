/**
 * fakeClientDirectory.mjs
 * =======================
 * A stand-in `sequelize` for tests that must exercise the REAL `clientResolver`.
 *
 * WHY IT IS SHAPED THIS WAY
 * -------------------------
 * The obvious fake — one that returns a client row whenever asked — makes every
 * ownership assertion vacuous: the denial under test would have to come from
 * somewhere other than the scope clause, and deleting that clause would not fail
 * the suite. So this fake is a MIRROR, not an oracle: it reads the predicates
 * present in the SQL it is handed and applies exactly those, and no others.
 *
 * Consequence, which is the point: remove the `client_trainer_assignments` EXISTS
 * clause from `clientResolver.mjs` and this fake stops filtering by assignment,
 * the foreign client resolves, and the ownership tests fail. A fake that enforced
 * assignment on its own would keep them green.
 *
 * It deliberately does NOT implement general SQL. It covers the two shapes
 * `clientResolver.mjs` issues: a direct-id lookup and a bounded list scan.
 */

/**
 * @param {object} fixture
 * @param {Array<{id:number,firstName:string,lastName:string,email?:string,isActive?:boolean,role?:string,version?:number}>} fixture.clients
 * @param {Array<{clientId:number,trainerId:number,status?:string}>} fixture.assignments
 * @returns {{ query: Function, calls: Array<{sql:string,replacements:object,scopedByAssignment:boolean}> }}
 */
export function makeClientDirectory({ clients = [], assignments = [] } = {}) {
  const calls = [];

  const query = async (sql, options = {}) => {
    const replacements = options.replacements || {};
    // Read the predicates the query actually carries — never assume them.
    const scopedByAssignment = sql.includes('client_trainer_assignments');
    const filtersActive = sql.includes('"isActive" = true');
    const filtersClientRole = sql.includes("role = 'client'");
    calls.push({ sql, replacements, scopedByAssignment });

    let visible = clients;
    if (filtersActive) visible = visible.filter((c) => c.isActive !== false);
    if (filtersClientRole) visible = visible.filter((c) => (c.role || 'client') === 'client');
    if (scopedByAssignment) {
      const trainerId = Number(replacements.trainerId);
      visible = visible.filter((c) => assignments.some(
        (a) => a.clientId === c.id
          && a.trainerId === trainerId
          && (a.status || 'active') === 'active',
      ));
    }

    const row = (c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email || `${c.firstName}@example.test`.toLowerCase(),
      isActive: c.isActive !== false,
      version: c.version ?? 1,
    });

    // Direct-id lookup: the resolver destructures the FIRST element as the row.
    if (sql.includes('WHERE id = :id')) {
      const hit = visible.find((c) => c.id === Number(replacements.id));
      return hit ? [row(hit)] : [];
    }
    // Bounded list scan for fuzzy matching.
    return visible.map(row);
  };

  return { query, calls };
}

export default makeClientDirectory;
