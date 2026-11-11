import {writeFile,mkdir} from 'node:fs/promises';import {dirname,resolve} from 'node:path';import {pathToFileURL} from 'node:url';
export const probeConfig={model:'gpt-5.4-mini-2026-03-17',maxOutputTokens:32,maxRequests:1,store:false,inputUsdPerMillion:.75,outputUsdPerMillion:4.5,maxExpectedCostUsd:.01};
export async function probeWritingApi({key,fetchImpl=fetch,now=()=>new Date().toISOString()}={}){
 const base={schemaVersion:1,checkedAt:now(),provider:'OpenAI',projectLabel:'iam / Default project',runtimeScope:'SHTFTV/markett-ca GitHub Actions',model:probeConfig.model,requestsAttempted:0,publicationVerified:false,otherSitesConnected:false};
 if(typeof key!=='string'||!key.trim())return {...base,status:'blocked',reason:'credential-not-configured'};
 let response;try{response=await fetchImpl('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model:probeConfig.model,input:'Reply exactly OK.',max_output_tokens:probeConfig.maxOutputTokens,reasoning:{effort:'none'},store:false}),signal:AbortSignal.timeout(20000),redirect:'error'});}catch{return {...base,requestsAttempted:1,status:'failed',reason:'request-failed-or-timeout'};}
 const result={...base,requestsAttempted:1,httpStatus:response.status};
 if(!response.ok)return {...result,status:'failed',reason:response.status===401?'authentication-denied':response.status===403?'permission-denied':response.status===429?'quota-or-rate-limit':'provider-request-failed'};
 let data;try{data=await response.json();}catch{return {...result,status:'failed',reason:'malformed-provider-response'};}
 const text=(data.output??[]).filter(x=>x.type==='message').flatMap(x=>x.content??[]).filter(x=>x.type==='output_text').map(x=>x.text).join('').trim();
 const usage=data.usage;const cost=usage&&Number.isInteger(usage.input_tokens)&&Number.isInteger(usage.output_tokens)?(usage.input_tokens*probeConfig.inputUsdPerMillion+usage.output_tokens*probeConfig.outputUsdPerMillion)/1e6:null;
 if(data.status!=='completed'||text!=='OK'||cost===null||cost>probeConfig.maxExpectedCostUsd)return {...result,status:'unverified',reason:'response-or-usage-outside-probe-contract'};
 return {...result,status:'verified-api-connectivity',reason:null,completedAt:now(),inputTokens:usage.input_tokens,outputTokens:usage.output_tokens,estimatedCostUsd:cost,requestId:response.headers.get('x-request-id')??null};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){const result=await probeWritingApi({key:process.env.OPENAI_API_KEY});const output=resolve(process.argv[2]??'work/worker-api-connectivity.json');await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));if(result.status!=='verified-api-connectivity')process.exitCode=1;}
