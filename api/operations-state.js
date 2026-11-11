import {configuration} from '../lib/operations-transport.mjs';
import {connect} from '../lib/operations-connect.mjs';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.setHeader('X-Content-Type-Options','nosniff');let db;
 try{
  const cfg=configuration(process.env);db=await connect(cfg);
  const sites=(await db.query('SELECT domain FROM portfolio_worker.sites ORDER BY domain')).rows;
  const latest=(await db.query('SELECT DISTINCT ON(site_id) public_data,accepted_at,cursor FROM portfolio_worker.operation_events ORDER BY site_id,cursor DESC')).rows;
  const publication=(await db.query("SELECT DISTINCT ON(site_id) public_data,accepted_at,cursor FROM portfolio_worker.operation_events WHERE public_data->>'type'='publication_verified' ORDER BY site_id,cursor DESC")).rows;
  const tasks=(await db.query("SELECT DISTINCT ON(site_id,public_data->>'taskKey') public_data,accepted_at,cursor FROM portfolio_worker.operation_events WHERE public_data ? 'taskKey' ORDER BY site_id,public_data->>'taskKey',cursor DESC")).rows;
  const website=(await db.query("SELECT DISTINCT ON(site_id) public_data,accepted_at,cursor FROM portfolio_worker.operation_events WHERE public_data->>'checkKind'='homepage-http' ORDER BY site_id,cursor DESC")).rows;
  const byDomain=new Map(latest.map(r=>[r.public_data.domain,r]));
  res.statusCode=200;res.end(JSON.stringify({schemaVersion:1,connected:true,checkedAt:new Date().toISOString(),knownSites:sites.length,scope:'Committed event receipts; publisher operation remains independently verified',sites:sites.map(s=>({domain:s.domain,status:byDomain.get(s.domain)?.public_data.status??'unconnected',lastEvent:byDomain.has(s.domain)?{...byDomain.get(s.domain).public_data,acceptedAt:byDomain.get(s.domain).accepted_at,cursor:String(byDomain.get(s.domain).cursor)}:null,latestPublication:publication.find(r=>r.public_data.domain===s.domain)?.public_data??null,latestWebsiteCheck:website.find(r=>r.public_data.domain===s.domain)?{...website.find(r=>r.public_data.domain===s.domain).public_data,acceptedAt:website.find(r=>r.public_data.domain===s.domain).accepted_at}:null,tasks:tasks.filter(r=>r.public_data.domain===s.domain).map(r=>({...r.public_data,acceptedAt:r.accepted_at,cursor:String(r.cursor)}))}))}));
 }catch(error){const code=/^[A-Z0-9_]{2,48}$/.test(error.code??error.message??'')?(error.code??error.message):'STATE_READ_FAILED';console.error('MARKETT_EVENT_STATE_'+code);res.statusCode=503;res.end(JSON.stringify({connected:false,error:'EVENT_BACKEND_NOT_CONNECTED',knownSites:null}));}finally{await db?.end?.();}
}
