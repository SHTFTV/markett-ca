import {createHash} from 'node:crypto';
import {sanitizeEvent,roleAlertInputs} from '../../api/publication-activity.js';
export function matchPullDelivery(domain,source,reader,{now=Date.now(),incidentId=null,probeRunId=null,format=null}={}){
 const sourceEvents=format==='site-role-alerts-v1'?roleAlertInputs({site:domain},source):source.events??[];
 const raw=sourceEvents.filter(e=>e.site===domain&&e.status==='failed'&&/^(role-alert:|role-canary:)/.test(e.id??''));
 const required=incidentId?raw.filter(e=>e.incidentId===incidentId||(e.id.startsWith('role-canary:')&&!!probeRunId&&e.probeRunId===probeRunId)):raw;
 const expected=required.filter(e=>e.site===domain&&e.status==='failed'&&/^(role-alert:|role-canary:)/.test(e.id??'')).map(e=>sanitizeEvent({site:domain,brand:domain},e)).filter(Boolean);
 const matches=expected.filter(e=>(reader.events??[]).some(r=>r.id===e.id&&r.status===e.status&&r.runUrl===e.runUrl&&r.title===e.title));
 const fresh=e=>now-Date.parse(e.checkedAt)>=0&&now-Date.parse(e.checkedAt)<=1200000;
 const incidentPresent=!incidentId||required.some(e=>e.incidentId===incidentId);const canaryBound=!incidentId||required.some(e=>e.id.startsWith('role-canary:')&&e.probeRunId===probeRunId);
 const complete=incidentPresent&&canaryBound&&expected.length>0&&expected.some(e=>e.id.includes(':role-canary:'))&&matches.length===expected.length&&expected.every(fresh);
 const fields=matches.map(e=>({id:e.id,status:e.status,runUrl:e.runUrl,title:e.title,sourceAt:e.checkedAt}));
 return {status:complete?'delivered':'unverified',route:'authorized-command-center-pull-reader',observedAt:new Date(now).toISOString(),deliveryRef:complete?'command-center-pull:'+createHash('sha256').update(JSON.stringify(fields)).digest('hex'):null,incidentId,probeRunId,expectedIds:expected.map(e=>e.id),deliveredIds:matches.map(e=>e.id),matchedEvents:fields,ownerReadVerified:false,scope:'Actual normalized source alerts matched in the authorized Command Center reader; no owner-read or push-channel assertion.'};
}
