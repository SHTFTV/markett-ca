import {configuration} from '../lib/operations-transport.mjs';
import {connect} from '../lib/operations-connect.mjs';
import {authorized,runRecovery} from '../lib/mining-recovery-runtime.mjs';
export default async function handler(req,res) {
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET'){res.status(405).json({error:'METHOD_NOT_ALLOWED'});return;}
 if(!authorized(req,process.env.CRON_SECRET)){res.status(401).json({error:'UNAUTHORIZED'});return;}
 if(!process.env.MINING_GITHUB_ACTIONS_TOKEN){res.status(503).json({error:'MINING_GITHUB_ACTIONS_TOKEN_MISSING'});return;}
 let db;
 try {
  db=await connect(configuration(process.env));
  const result=await runRecovery({db,token:process.env.MINING_GITHUB_ACTIONS_TOKEN});
  res.status(200).json({site:'theminingminute.com',...result});
 }catch(e){
  const code=/^(?:RECOVERY_[A-Z0-9_]+|EVENT_BACKEND_NOT_CONFIGURED)$/.test(e.message)?e.message:'RECOVERY_RUNTIME_UNAVAILABLE';
  res.status(503).json({site:'theminingminute.com',error:code,recovered:false});
 }finally{await db?.end?.();}
}
