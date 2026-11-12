import {configuration} from './operations-transport.mjs';
import {connect} from './operations-connect.mjs';
import {monitorEvents} from './operations-monitor-runtime.mjs';
export async function readOperationalEvidence(){
 let db;
 try{
  db=await connect(configuration(process.env));
  const website=(await db.query("SELECT DISTINCT ON(site_id) public_data,accepted_at FROM portfolio_worker.operation_events WHERE public_data->>'checkKind'='homepage-http' ORDER BY site_id,cursor DESC")).rows;
  const tasks=(await db.query("SELECT DISTINCT ON(site_id,public_data->>'taskKey') public_data,accepted_at,cursor FROM portfolio_worker.operation_events WHERE public_data ? 'taskKey' ORDER BY site_id,public_data->>'taskKey',cursor DESC")).rows;
  const publication=(await db.query("SELECT DISTINCT ON(site_id) public_data,accepted_at FROM portfolio_worker.operation_events WHERE public_data->>'type'='publication_verified' ORDER BY site_id,cursor DESC")).rows;
  const workerEvents=await monitorEvents(db);
  return {workerEvents,connected:true,readAt:new Date().toISOString(),website:website.map(r=>({...r.public_data,acceptedAt:r.accepted_at})),tasks:tasks.map(r=>({...r.public_data,acceptedAt:r.accepted_at,cursor:String(r.cursor)})),publication:publication.map(r=>({...r.public_data,acceptedAt:r.accepted_at}))};
 }catch{return {connected:false,readAt:new Date().toISOString(),website:[],tasks:[],publication:[]};}
 finally{await db?.end?.();}
}
export {mergeOperationalEvidence} from './operations-overview-merge.mjs';
