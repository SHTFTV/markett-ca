import {registry} from '../../api/registry-data.js';
import {readFile,writeFile} from 'node:fs/promises';
const recovered=JSON.parse(await readFile(process.argv[2],'utf8'));
const explicit={
 'irrigation.ltd':{repository:'SHTFTV/irrigation.ltd',path:'site/SITE-SOT.md',owner:'Irrigation build owner',blobSha:'5b21e5a7c72ad214f952b56545159e10c2563e03'},
 'naturopaths.io':{repository:'SHTFTV/naturopaths.io',path:'docs/NATUROPATHS-IO-SOT.md',owner:'Naturopaths build owner',blobSha:'8520e41897597fce1c5658ebe599e56883422ddf'},
 'fireproofing.tv':{repository:'SHTFTV/fireproofing.tv',path:'docs/bot/FIREPROOFING-TV-SOT.md',owner:'Fireproofing build owner',blobSha:'2b19796f174f0e77c77590632ed157661c94e9d3'},
 'theminingminute.com':{repository:'SHTFTV/theminingminute.com',path:'operations/site-sop.json',owner:'Existing Mining sole owner; no competing policy write'},
 'loveourlistings.com':{repository:'SHTFTV/loveourlistings.com',path:'operations/site-sop.json',blobSha:'97b4c55654e7a6b41ae0ed8d66c2343940f855c5'},
 'weddings.io':{repository:'SHTFTV/weddings.io',path:'docs/WEDDINGS-IO-SOT.md',blobSha:'da3c948e82c1572eac2e59256bc96057a0329ac4'},
 'estimators.io':{repository:'SHTFTV/estimators-io',path:'docs/ESTIMATORS-IO-PRODUCT-SOT.md',blobSha:'0c7adfcc2fdafbacd3ec8334969019a577092a3f'},
 'talc.tv':{repository:'SHTFTV/talc.tv',path:null,owner:null,blocker:'Current recursive tree contains AGENTS.md but no identifiable canonical site SOT; do not invent a path.'},
 'industryarmymarketing.com':{repository:'SHTFTV/industryarmymarketing.com',path:null,owner:'Canonical coordinator owns finite campaign safeguards',blocker:'Build journal and campaign contracts recovered; single canonical site SOT path not verified. Preserve finite queue and writer lock.'},
 'eyespyr.com':{repository:null,path:null,owner:'Canonical coordinator actively owns provider confirmation',blocker:'Canonical source/SOT mapping not verified here; coordinator-owned active work, no competing write.'}
};
const rows=registry.map(s=>{
 const history=recovered.filter(x=>x.siteId?.toLowerCase()===s.domain.toLowerCase());
 const candidates=history.filter(x=>/source.of.truth|site-sop|sot\.md/i.test(x.authority+' '+x.path));
 const current=explicit[s.domain];
 return {domain:s.domain,inventoryKind:s.registryKind,activationAuthorized:Object.hasOwn(explicit,s.domain),canonicalRepository:current?.repository??null,canonicalSotPath:current?.path??null,verifiedBlobSha:current?.blobSha??null,sourceCommit:null,requiredRuleVersion:1,committedRuleVersion:null,deployedRuntimeSotLoadingProof:null,owner:current?.owner??null,status:'incomplete',blocker:current?.blocker??(current?.owner?'Policy propagation reserved to assigned site owner; latest approved runtime loading not verified.':current?.path?'Canonical SOT verified; completion policy not yet propagated and deployed loading unproven.':'Canonical per-site SOT repository/path not verified; historical candidate is not current ownership or runtime proof.'),historicalCandidates:candidates.map(x=>({repository:x.repository,path:x.path,commitSha:x.commitSha,authority:x.authority})),historicalSourceCount:history.length};
});
const report={standardVersion:1,generatedAt:new Date().toISOString(),inventorySource:'SHTFTV/markett-ca api/registry-data.js; current canonical registry plus verified owner-authorized Irrigation registration',inventoryCompleteness:'Known canonical registry only; not verified full registrar portfolio or ownership inventory',coverageComplete:false,sites:rows};
await writeFile(process.argv[3],JSON.stringify(report,null,2)+'\n');
