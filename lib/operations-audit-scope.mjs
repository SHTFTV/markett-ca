// Bounded reconciliation of the existing 205-site public homepage audit.
// These 76 existing canonical sites were rejected by the legacy actor domain scope
// in run 43662908209. All were confirmed in portfolio_worker.sites and registry-data;
// 75 match registrar-inventory and lsfencingandmetalwork.com has connected GSC
// siteOwner verification (account observation 2026-11-14T02:00:12.224Z).
// This grant applies only to observed homepage check outcomes, never publication
// or arbitrary tasks. Existing actor authentication/type permissions still apply.
const domains=new Set([
 "acustiq.ca",
 "aibuildr.io",
 "animalhospitals.io",
 "beautycare.io",
 "beegoods.co",
 "brinesalters.ca",
 "brinesprayer.com",
 "brinesprayerkit.ca",
 "brinesprayerkit.com",
 "buds.ltd",
 "bugout.tv",
 "burglaralarms.io",
 "cabins.ltd",
 "cannabiniod.ca",
 "cannabiniod.tv",
 "cargelligold.com",
 "chalet.ltd",
 "choaroofers.ca",
 "conspiracyfactualist.ca",
 "farmorseed.ca",
 "farmorseed.com",
 "fiberal.ca",
 "floathomes.tv",
 "freebarryyoung.com",
 "glaziers.io",
 "growers.ltd",
 "haltmrna.com",
 "hibarinsulation.ca",
 "hibarinsulation.com",
 "hpoa.ca",
 "irpr.ca",
 "irrigation.ltd",
 "jamesbaypowerplay.com",
 "justdoors.co",
 "kingkongtractors.ca",
 "kingkongtractors.com",
 "kongtenders.com",
 "lawyers.ltd",
 "leahhill.ca",
 "livingwellfestivals.ca",
 "livingwellfestivals.com",
 "logcabin.ltd",
 "logcabins.ltd",
 "lsfence.ca",
 "lsfencingandmetalwork.com",
 "medbeetate.ca",
 "medbeetate.com",
 "monoglassinsulation.ca",
 "monoglassinsulation.com",
 "mwc.ltd",
 "optometrists.ltd",
 "plow.ltd",
 "plowinstallations.ca",
 "plowinstallations.com",
 "prefabulousbuildings.com",
 "processofdeliberation.com",
 "protestivals.com",
 "pushpigs.ca",
 "pushpigs.com",
 "rambowalls.ca",
 "ranchers.tv",
 "restorations.info",
 "shtf.tv",
 "snowhitsthefan.com",
 "snowremovalcalculator.com",
 "snowremovalmarketing.com",
 "solarsystems.ltd",
 "steelstudccontractors.com",
 "timetobrine.ca",
 "timetobrine.com",
 "towing.ltd",
 "towservice.io",
 "uloas.com",
 "ulous.ca",
 "weddingsaas.com",
 "wnpd.ca"
]);
export function permitsReconciledHomepageAudit(input,actor){
 if(actor.id!=='operations-audit'||!actor.types.includes(input.type)||!domains.has(input.domain))return false;
 if(input.taskKey!=='homepage-http-check'||!Object.hasOwn(input,'httpStatus')||typeof input.requestSucceeded!=='boolean')return false;
 return input.type==='task_completed'
  ? input.status==='verified'&&input.httpStatus===200&&input.requestSucceeded===true
  : input.type==='task_blocked'&&input.status==='blocked'&&input.requestSucceeded===false
   &&(input.httpStatus===null||(Number.isInteger(input.httpStatus)&&input.httpStatus>=100&&input.httpStatus<=599&&input.httpStatus!==200));
}
