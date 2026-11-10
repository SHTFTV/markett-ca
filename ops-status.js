export function indicator(status,{overdue=false,checkedAt=null,now=Date.now()}={}){
 if(overdue||/blocked|failed|not-listed|ownership-not-verified|unconfigured|missing|overdue/i.test(status??''))return {color:'red',label:'Needs work'};
 if(/^(done|succeeded|verified-sitemap-success|verified-new-publication)$/.test(status??'')){
  if(checkedAt&&(!Number.isFinite(Date.parse(checkedAt))||now-Date.parse(checkedAt)>48*3600000))return {color:'yellow',label:'Recheck due'};
  return {color:'green',label:'Verified'};
 }
 return {color:'yellow',label:/partial|processing|running|queued/i.test(status??'')?'In progress':'Not verified'};
}
export function siteIndicator(row,now=Date.now()){
 const values=Object.values(row.requirements??{}).map(r=>indicator(r.status,{now}));
 if(row.overdue||values.some(v=>v.color==='red'))return {color:'red',label:'Needs attention'};
 if(values.length&&values.every(v=>v.color==='green'))return {color:'green',label:'All checks verified'};
 return {color:'yellow',label:'Incomplete checks'};
}
export function pacificTime(value){const date=new Date(value);return value&&Number.isFinite(date.getTime())?new Intl.DateTimeFormat('en-US',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Los_Angeles'}).format(date)+' Pacific':'Time not verified';}
