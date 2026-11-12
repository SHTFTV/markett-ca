// Narrow public build receipts. Publishing and runtime states remain separate.
export const buildReceipts = {
 'interiordesigners.io':{url:'https://interiordesigners.io/',checkedAt:'2026-11-12T05:30:00Z',detail:'Existing InteriorDesigners frontend is live; retain completed build. Publishing and functional checks are separate.'},
 'weddings.io':{url:'https://weddings.io/',checkedAt:'2026-11-12T05:30:00Z',detail:'Existing Weddings magazine frontend is live; retain completed build. Publishing and functional checks are separate.'},
 'fireproofing.tv':{url:'https://fireproofing.tv/',checkedAt:'2026-11-12T05:31:24.672684Z',detail:'Live substantive Fireproofing publication HTML verified; existing build, not a new-build candidate.'},
 'naturopaths.io':{url:'https://naturopaths.io/',checkedAt:'2026-11-12T05:31:25.085461Z',detail:'Live substantive Naturopaths publication HTML verified; existing build, not a new-build candidate.'},
 'pitchdeck.tv':{url:'https://pitchdeck.tv/',checkedAt:'2026-11-12T05:31:26.025182Z',detail:'Existing Pitchdeck title and application asset are served; rendered app and functional flows remain unverified.'}
};
export const buildOwners={
 'homestagers.io':{owner:'HomeStagers build owner',state:'Active build; READY preview reported; custom-domain release, GitHub and Four Roles pending',checkedAt:'2026-11-12T05:30:00Z'},
 'customclosets.io':{owner:'CustomClosets launch owner',state:'Existing build at customclosets-io.vercel.app; custom-domain and operating completion remain with assigned owner',url:'https://customclosets-io.vercel.app',checkedAt:'2026-11-12T05:22:03.956Z'},
 'fireproofing.tv':{owner:'Fireproofing build owner',state:'Existing live build; remaining launch work reserved to current owner',checkedAt:'2026-11-12T05:31:24.672684Z'},
 'irrigation.ltd':{owner:'Irrigation build owner',state:'Existing build and remaining launch work reserved to current owner',checkedAt:'2026-11-12T05:30:00Z'}
};
export function withBuildQueue(overview){
 const rows=overview.rows.map(row=>{const receipt=buildReceipts[row.domain],owner=buildOwners[row.domain];return {...row,...(receipt?{build:{...row.build,status:'built-and-live',detail:receipt.detail,checkedAt:receipt.checkedAt,evidenceUrl:receipt.url,scope:'frontend-observation-only'}}:{}),buildAssignment:owner??null};});
 const projected=rows.map(row=>({...row,buildQueueState:row.buildAssignment?'reserved-active-owner':row.build?.status==='built-and-live'?'completed-build':row.ownershipScope!=='registrar-account-listed'?'ownership-unconfirmed':row.build?.status==='genuinely-unbuilt'?'confirmed-new-build':row.build?.status==='built-but-broken-or-notdeployed'?'repair-existing-build':'inspect-before-build'}));
 const candidate=r=>({domain:r.domain,state:r.buildQueueState,detail:r.build?.detail??'Build evidence not recovered',checkedAt:r.build?.checkedAt??null,ownership:r.ownershipScope,proofGap:r.buildQueueState==='confirmed-new-build'?'Recover approved scope and source before work begins.':'Recover source repository, provider/deployment association and current build ownership before deciding build versus repair.'});
 return {...overview,rows:projected,buildQueue:{order:'Alphabetical for selection; no recovered next-ten build priority order',confirmedNewBuilds:projected.filter(r=>r.buildQueueState==='confirmed-new-build').map(candidate),inspectionCandidates:projected.filter(r=>r.buildQueueState==='inspect-before-build').sort((a,b)=>a.domain.localeCompare(b.domain)).map(candidate),reserved:projected.filter(r=>r.buildAssignment).map(r=>({domain:r.domain,...r.buildAssignment})),completed:projected.filter(r=>r.buildQueueState==='completed-build').map(r=>r.domain),repairs:projected.filter(r=>r.buildQueueState==='repair-existing-build').map(candidate),ownershipUnconfirmed:projected.filter(r=>r.buildQueueState==='ownership-unconfirmed').map(r=>r.domain)}};
}
