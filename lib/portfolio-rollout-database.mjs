import {randomUUID,timingSafeEqual} from 'node:crypto';
import {runPortfolioRollout} from './portfolio-rollout-runner.mjs';
import baseline from '../portfolio-rollout-status.json' with {type:'json'};
import priorWatchdog from '../portfolio-rollout-watchdog.json' with {type:'json'};
const keys={'portfolio-rollout-status.json':'queue','portfolio-rollout-watchdog.json':'watchdog'};
export function authorizedRollout(request,env){const a=request.headers.get('authorization')??'',b='Bearer '+(env.CRON_SECRET??'');return !!env.CRON_SECRET&&Buffer.byteLength(a)===Buffer.byteLength(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b));}
export function databaseStorage(db){return {read:async(path,fallback)=>{const key=keys[path];if(!key)throw Error('INVALID_ROLLOUT_KEY');const q=await db.query('SELECT payload FROM portfolio_rollout.state WHERE key=$1',[key]);return q.rows[0]?.payload??(key==='queue'?baseline:priorWatchdog)??fallback;},write:async(path,payload)=>{const key=keys[path];if(!key)throw Error('INVALID_ROLLOUT_KEY');await db.query('INSERT INTO portfolio_rollout.state(key,payload,updated_at) VALUES($1,$2::jsonb,now()) ON CONFLICT(key) DO UPDATE SET payload=EXCLUDED.payload,updated_at=now()',[key,JSON.stringify(payload)]);}};}
export async function readRolloutDatabase(db){const r=await db.query('SELECT key,payload,updated_at FROM portfolio_rollout.state ORDER BY key');const values=Object.fromEntries(r.rows.map(r=>[r.key,r.payload]));return {connected:true,authority:'supabase-portfolio-rollout',state:values.queue??baseline,watchdog:values.watchdog??priorWatchdog};}
export async function handlePortfolioRollout(request,{connect,configuration,env=process.env,kind:requestedKind,run=runPortfolioRollout}={}){
 if(request.method!=='GET')return Response.json({error:'METHOD_NOT_ALLOWED'},{status:405});
 if(!authorizedRollout(request,env))return Response.json({error:'UNAUTHORIZED'},{status:401});
 const url=new URL(request.url),kind=requestedKind??(url.searchParams.get('kind')==='watchdog'?'watchdog':'coordinator');let db;
 try{db=await connect(configuration(env));const lock=await db.query('SELECT pg_try_advisory_lock(hashtextextended($1,0)) AS acquired',['portfolio-rollout:'+kind]);if(!lock.rows[0]?.acquired)return Response.json({error:'ROLLOUT_ALREADY_RUNNING'},{status:409});
  const runId=randomUUID(),schedule=request.headers.get('x-vercel-cron-schedule'),native=['*/5 * * * *','3-58/5 * * * *'].includes(schedule??'');
  const identity={runId,trigger:native?'native-vercel-cron':'authenticated-request',runUrl:'https://markett-ca.vercel.app/api/portfolio-rollout-runs?id='+runId,sourceCommit:env.VERCEL_GIT_COMMIT_SHA??null,executionProvider:'vercel',schedule:native?schedule:null,requestId:request.headers.get('x-vercel-id')};
  await db.query('INSERT INTO portfolio_rollout.runs(id,kind,payload) VALUES($1,$2,$3::jsonb)',[runId,kind,JSON.stringify({...identity,status:'running',startedAt:new Date().toISOString()})]);
  const result=await run({storage:databaseStorage(db),identity,kind});
  await db.query("UPDATE portfolio_rollout.runs SET payload=payload || $2::jsonb WHERE id=$1",[runId,JSON.stringify({status:'completed',completedAt:new Date().toISOString(),result})]);
  console.log(JSON.stringify({event:'portfolio-rollout-completed',runId,kind,trigger:identity.trigger}));
  return Response.json({runId,kind,trigger:identity.trigger,result},{headers:{'Cache-Control':'no-store'}});
 }catch(error){console.error('PORTFOLIO_ROLLOUT_UNAVAILABLE',/^[A-Z0-9_]{1,60}$/.test(error.code??'')?error.code:'RUNTIME_ERROR');return Response.json({error:'ROLLOUT_RUNTIME_UNAVAILABLE',authority:'supabase-portfolio-rollout',operationallyComplete:false},{status:503});}finally{await db?.end?.();}
}

export async function currentRollout({connect,configuration,env=process.env}){let db;try{db=await connect(configuration(env));return await readRolloutDatabase(db);}catch{return {connected:false,authority:'dated-git-baseline-only',runtimeError:'DATABASE_ROLLOUT_UNAVAILABLE',state:baseline,watchdog:priorWatchdog};}finally{await db?.end?.();}}
