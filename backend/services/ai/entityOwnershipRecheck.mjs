/** Re-anchor target-scoped confirmation against current canonical authority.
 * Unknown authority cannot authorize a mutation. Reads occur before consumption;
 * downstream domain writers retain their own transactional authorization checks.
 * Multiple active trainer assignments are valid; inactive/missing rows are not.
 */
import { QueryTypes } from 'sequelize';
import logger from '../../utils/logger.mjs';
const positiveId = value => ((typeof value === 'number' || typeof value === 'string')
  && /^[1-9]\d*$/.test(String(value)) && Number.isSafeInteger(Number(value))) ? Number(value) : null;
function rows(value) {
  if (Array.isArray(value)) return Array.isArray(value[0]) ? value[0] : value;
  return Array.isArray(value?.rows) ? value.rows : [];
}
export async function recheckEntityOwnership({ operation, user, sequelize }) {
  const targetValues=[operation?.clientId,operation?.params?.clientId,operation?.projection?.targetUserId].filter(v=>v!=null);
  const targetClientId=positiveId(targetValues[0]);
  const result={refuse:false,reason:null,targetClientId};
  const deny=reason=>({...result,refuse:true,reason});
  // Non-targeted commands keep their existing command-role policy. This helper
  // does not claim a complete entity-version or transaction-wide authorization.
  if(!targetValues.length) return result;
  if(!targetClientId || targetValues.some(v=>positiveId(v)!==targetClientId))return deny('target_invalid');
  const actorId=positiveId(user?.id);
  if(!actorId)return deny('actor_role_revoked');
  const select=async(sql,replacements)=>rows(await sequelize.query(sql,{replacements,type:QueryTypes.SELECT}));
  try {
    const actorRows=await select('SELECT id, role FROM "Users" WHERE id = :id LIMIT 1; -- user-role-recheck',{id:actorId});
    const actor=actorRows.find(row=>positiveId(row?.id)===actorId);
    if(!actor || !['admin','trainer','client','user'].includes(actor.role) || actor.role!==user.role)return deny('actor_role_revoked');
    const targetRows=await select('SELECT id, role FROM "Users" WHERE id = :id LIMIT 1; -- target-user-recheck',{id:targetClientId});
    if(!targetRows.some(row=>positiveId(row?.id)===targetClientId && ['client','user'].includes(row.role)))return deny('target_unavailable');
    if(actor.role==='admin')return result;
    if(['client','user'].includes(actor.role))return actorId===targetClientId?result:deny('target_reassigned');
    const assignments=await select('SELECT "clientId", "trainerId", status FROM client_trainer_assignments WHERE "clientId" = :clientId AND "trainerId" = :trainerId AND status = :status; -- target-client-recheck', {clientId:targetClientId,trainerId:actorId,status:'active'});
    return assignments.some(row=>positiveId(row?.clientId)===targetClientId && positiveId(row?.trainerId)===actorId && row.status==='active')?result:deny('target_reassigned');
  } catch {
    logger.warn('[EntityRecheck] current authority unavailable', {reason:'db_error'});
    return deny('db_error');
  }
}
export default { recheckEntityOwnership };
