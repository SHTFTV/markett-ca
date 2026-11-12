import {evaluateCompletion} from './operational-completion.mjs';
export function withCompletion(overview,records,{now=Date.now()}={}){
 const bySite=new Map(records.map(r=>[r.contract?.site,r]));
 const rows=overview.rows.map(row=>{
  const record=bySite.get(row.domain);
  const completion=evaluateCompletion(record?.contract,record?.evidence,{now});
  completion.site=row.domain;
  return {...row,completion,operationally_complete:completion.operationally_complete,completionStatus:completion.status,build:row.build?{...row.build,scope:'frontend-observation-only',operationally_complete:completion.operationally_complete}:null};
 });
 return {...overview,rows,completionStandard:{version:2,definition:'All required applicable production evidence must be current and verified; missing contract is incomplete.',contractedSites:rows.filter(r=>bySite.has(r.domain)).length,operationallyComplete:rows.filter(r=>r.operationally_complete).length,unregisteredContractSites:[...bySite.keys()].filter(s=>!rows.some(r=>r.domain===s)),proofScope:'Task/article done is scoped success, never whole-site completion.'}};
}
