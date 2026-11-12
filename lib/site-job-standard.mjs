import {resolveSourceBinding} from './publication-source-binding.mjs';
import {createHash} from 'node:crypto';
import {inspectPage,PAGE_QUALITY_VERSION} from './page-quality-standard.mjs';
const hash=content=>createHash('sha256').update(content).digest('hex');
function verified(site,sot){
 if(!sot||sot.site!==site||sot.approved!==true||!sot.revision||!sot.canonicalRef||typeof sot.content!=='string'||sot.contentHash!==hash(sot.content)||sot.operatingStandardVersion!==2)throw Error('LATEST_APPROVED_SITE_SOT_REQUIRED');
 return sot;
}
// Adapter binds the existing site's approved durable store and receipts, not a new publisher/store.
export async function executeSiteJob({site,jobId,sourceCommit,store,execute}){
 if(!site||!jobId||!/^[a-f0-9]{40}$/.test(sourceCommit??''))throw Error('SITE_JOB_IDENTITY_REQUIRED');
 const sot=verified(site,await store.latestApproved(site));
 await store.recordSotLoad({site,jobId,sourceCommit,canonicalRef:sot.canonicalRef,loadedRevision:sot.revision,loadedHash:sot.contentHash,operatingStandardVersion:2,pageQualityVersion:sot.pageQualityVersion??null,loadedAt:new Date().toISOString()});
 const assertStillApproved=async()=>{const current=verified(site,await store.latestApproved(site));if(current.revision!==sot.revision||current.contentHash!==sot.contentHash)throw Error('SITE_SOT_CHANGED_RETRY_UNDER_CURRENT_RULES');};
 // Existing queue/lease/publisher owns mutation. It must invoke guard inside its commit boundary.
 const assertPageReady=async page=>{await assertStillApproved();if(sot.pageQualityVersion!==PAGE_QUALITY_VERSION)throw Error('SITE_PAGE_QUALITY_POLICY_NOT_ADOPTED');const deploymentSourceCommit=page.deploymentSourceCommit??sourceCommit;let binding={status:'same-commit',runtimeSourceCommit:sourceCommit,deploymentSourceCommit};if(deploymentSourceCommit!==sourceCommit){const contract=sot.publicationSourceContract;if(contract?.site!==site||contract?.sourceCommit!==sourceCommit)throw Error('APPROVED_PUBLICATION_SOURCE_CONTRACT_REQUIRED');binding=resolveSourceBinding(contract,page.transactionEvidence??[],{deploymentSourceCommit});if(binding.status==='unproven'||binding.loadedSotHash!==sot.contentHash){if(binding.status!=='unproven')binding={...binding,status:'unproven',reason:'Transaction policy hash does not match the actual approved SOT loaded by this job'};await store.recordPageQuality({site,jobId,sourceCommit,runtimeSourceCommit:sourceCommit,deploymentSourceCommit,status:'failed',sourceBinding:binding});const error=Error('PUBLICATION_SOURCE_TRANSACTION_UNPROVEN');error.binding=binding;throw error;}}const result=inspectPage({...page,sourceCommit:deploymentSourceCommit,runtimeSourceCommit:sourceCommit,sotLoad:{site,sourceCommit,pageQualityVersion:sot.pageQualityVersion,loadedRevision:sot.revision,loadedHash:sot.contentHash,runRef:page.runRef}});await store.recordPageQuality({site,jobId,sourceCommit,runtimeSourceCommit:sourceCommit,deploymentSourceCommit,sourceBinding:binding,loadedRevision:sot.revision,loadedHash:sot.contentHash,result});if(!result.publicationAllowed){const error=Error('AFFECTED_PAGE_QUALITY_BLOCKED');error.result=result;throw error;}return result;};
 return execute({sot,assertStillApproved,assertPageReady});
}
