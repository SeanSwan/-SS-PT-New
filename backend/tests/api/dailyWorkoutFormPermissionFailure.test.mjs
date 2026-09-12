
import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express'; import request from 'supertest';
const m=vi.hoisted(()=>({ permission:vi.fn(), user:vi.fn(), assignment:vi.fn(), count:vi.fn(), formRead:vi.fn(), write:vi.fn(), xp:vi.fn(), billing:vi.fn(), rollback:vi.fn(), commit:vi.fn(), transaction:vi.fn(), log: {info:vi.fn(),warn:vi.fn(),error:vi.fn(),debug:vi.fn()} }));
vi.mock('../../middleware/authMiddleware.mjs',()=>({ protect:(q,s,n)=>{q.user={id:'7',role:'trainer'};n();}, trainerOrAdminOnly:(q,s,n)=>n(),adminOnly:(q,s,n)=>n(),checkTrainerClientRelationship:(q,s,n)=>n() }));
vi.mock('../../models/index.mjs',()=>({
  getUser:()=>({findOne:m.user,findByPk:m.user}), getClientTrainerAssignment:()=>({findOne:m.assignment}),
  getTrainerPermissions:()=>({findOne:m.permission}), getDailyWorkoutForm:()=>({count:m.count,findOne:m.formRead,create:m.write}),
  getAllModels:()=>({}),getWorkoutLog:()=>({create:m.write}),getWorkoutSession:()=>({create:m.write}),getWorkoutPlan:()=>({}),getWorkoutPlanCompletionReceipt:()=>({}),getSession:()=>({}),getSessionType:()=>({}),getBodyMeasurement:()=>({}),getChallenge:()=>({}),getChallengeParticipant:()=>({}),getVariationLog:()=>({})
}));
vi.mock('../../models/TrainerPermissions.mjs',()=>({PERMISSION_TYPES:{EDIT_WORKOUTS:'edit_workouts'}}));
vi.mock('../../database.mjs',()=>({default:{transaction:m.transaction}}));
vi.mock('../../utils/logger.mjs',()=>({default:m.log}));
vi.mock('../../services/awardWorkoutXP.mjs',()=>({awardWorkoutXP:m.xp}));
vi.mock('../../services/sessionBillingPolicy.mjs',()=>({buildWorkoutSessionBillingDecision:m.billing,normalizePaidSessionCount:Number}));
vi.mock('../../services/trainerSessionEarningService.mjs',()=>({accrueFlatSessionEarning:vi.fn()}));
vi.mock('../../services/badgeGamificationBridge.mjs',()=>({fireWorkoutBadgeChecks:vi.fn()}));
vi.mock('../../services/postSaveHandoffAssembler.mjs',()=>({safeAssemble:vi.fn()}));
vi.mock('../../services/workout/workoutPrDetectionService.mjs',()=>({detectAndRecordPersonalRecords:vi.fn()}));
const {default:router}=await import('../../routes/dailyWorkoutFormRoutes.mjs');
const app=express();app.use(express.json());app.use('/api/workout-forms',router);
beforeEach(()=>{vi.clearAllMocks();m.user.mockReset().mockResolvedValue({id:42,firstName:'Synthetic',lastName:'Client',availableSessions:2,timeZone:'UTC',timeZoneConfigured:true});m.assignment.mockResolvedValue({id:1});m.permission.mockReset();m.count.mockResolvedValue(0);m.formRead.mockResolvedValue(null);m.transaction.mockResolvedValue({rollback:m.rollback,commit:m.commit,LOCK:{UPDATE:'UPDATE'}});m.billing.mockReturnValue({requiresSessionCredit:false});});
describe('G04RA permission error denial on mounted workout router',()=>{
  it('permission lookup failure denies info before workout data reads',async()=>{
    m.permission.mockRejectedValue(new Error('synthetic schema error'));
    const res=await request(app).get('/api/workout-forms/client/42/info');expect(res.status).toBe(403);expect(res.body).not.toHaveProperty('client');
    expect(m.count).not.toHaveBeenCalled();expect(m.formRead).not.toHaveBeenCalled();
  });
  it('permission lookup failure denies submit before workout/billing/XP writes',async()=>{
    m.permission.mockRejectedValue(new Error('synthetic schema error'));
    const res=await request(app).post('/api/workout-forms').send({clientId:42,date:'2026-09-12',exercises:[{exerciseName:'Synthetic squat',sets:[{reps:8,weight:20}]}]});
    expect(res.status).toBe(403);expect(m.rollback).toHaveBeenCalledTimes(1);expect(m.write).not.toHaveBeenCalled();expect(m.billing).not.toHaveBeenCalled();expect(m.xp).not.toHaveBeenCalled();expect(m.user).not.toHaveBeenCalled();
  });
  it('retains zero configured permission rows default allow',async()=>{
    m.permission.mockResolvedValue(null);expect((await request(app).get('/api/workout-forms/client/42/info')).status).toBe(200);expect(m.permission).toHaveBeenCalledTimes(2);
  });
  it('retains explicit active grant allow',async()=>{
    m.permission.mockResolvedValue({id:1});expect((await request(app).get('/api/workout-forms/client/42/info')).status).toBe(200);expect(m.permission).toHaveBeenCalledTimes(1);
  });
  it('retains configured but withheld/expired/inactive deny',async()=>{
    m.permission.mockResolvedValueOnce(null).mockResolvedValueOnce({id:1});expect((await request(app).get('/api/workout-forms/client/42/info')).status).toBe(403);expect(m.count).not.toHaveBeenCalled();
  });
});
