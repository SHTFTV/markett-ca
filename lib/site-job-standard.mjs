import {createHash} from 'node:crypto';
const hash=content=>createHash('sha256').update(content).digest('hex');
function verified(site,sot){
 if(!sot||sot.site!==site||sot.approved!==true||!sot.revision||!sot.canonicalRef||typeof sot.content!=='string'||sot.contentHash!==hash(sot.content)||sot.operatingStandardVersion!==2)throw Error('LATEST_APPROVED_SITE_SOT_REQUIRED');
 return sot;
}
// Adapter binds the existing site's approved durable store and receipts, not a new publisher/store.
export async function executeSiteJob({site,jobId,sourceCommit,store,execute}){
 if(!site||!jobId||!/^[a-f0-9]{40}$/.test(sourceCommit??''))throw Error('SITE_JOB_IDENTITY_REQUIRED');
 const sot=verified(site,await store.latestApproved(site));
 await store.recordSotLoad({site,jobId,sourceCommit,canonicalRef:sot.canonicalRef,loadedRevision:sot.revision,loadedHash:sot.contentHash,operatingStandardVersion:2});
 const assertStillApproved=async()=>{const current=verified(site,await store.latestApproved(site));if(current.revision!==sot.revision||current.contentHash!==sot.contentHash)throw Error('SITE_SOT_CHANGED_RETRY_UNDER_CURRENT_RULES');};
 // Existing queue/lease/publisher owns mutation. It must invoke guard inside its commit boundary.
 return execute({sot,assertStillApproved});
}
