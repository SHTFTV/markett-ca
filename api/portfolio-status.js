import {searchEvidence} from './search-evidence.js';
import {portfolio} from './portfolio-data.js';
import {portfolioSupport} from './portfolio-support-data.js';
import {metrics} from './portfolio-metrics.js';
import {activity} from './publication-activity.js';
export function reconcile(data,events,now=Date.now(),search=searchEvidence,support=portfolioSupport){return metrics(data,events,search,support,now);}
export default {async fetch(request){if(request.method!=='GET')return new Response('Method not allowed',{status:405});const receipts=await activity();return Response.json(reconcile(portfolio,receipts.events),{headers:{'Cache-Control':'public, max-age=0, s-maxage=10','X-Content-Type-Options':'nosniff'}});}};
