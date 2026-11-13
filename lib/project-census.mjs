// Project identity evidence is independent of dated domain and routing evidence.
export function applyProjectCensus(view,census,now=Date.now()){
 if(!census?.pagination?.exhausted||Date.parse(census.checkedAt)<=Date.parse(view.projectCensusCheckedAt??view.checkedAt??0))return view;
 const projects=[...new Map(census.projects.map(p=>[p.id,{id:p.id,name:p.name}])).values()];
 const age=now-Date.parse(census.checkedAt);
 return {...view,lastVerifiedProjectCount:projects.length,projectCensusCheckedAt:census.checkedAt,projectCensusSource:census.source,projectCensusFreshness:age>=0&&age<=1800000?'fresh':'stale',currentProviderCountVerified:age>=0&&age<=1800000,projectCensusPagination:census.pagination,providerProjects:projects};
}
