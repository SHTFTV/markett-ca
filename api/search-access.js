import observation from '../gsc-wizard-observation.json' with {type:'json'};
import inventory from '../production-search-inventory.json' with {type:'json'};
import {searchAccess} from '../lib/search-access-model.mjs';
import {readInventoryStore} from '../lib/inventory-refresh-store.mjs';
export default {async fetch(request){if(request.method!=='GET')return new Response('Method not allowed',{status:405});const stored=await readInventoryStore();const result=searchAccess(observation,inventory);result.cloudEvidenceAudit={connected:stored.connected,lastReceiptAt:stored.latest?.completed_at??null,audit:stored.latest?.public_summary?.searchAccessAudit??null,scope:"Existing scheduled executor audits retained access evidence only; it cannot query GSC Wizard without a server-authorized connection. Not provider execution or alert delivery proof."};return Response.json(result,{headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}};
