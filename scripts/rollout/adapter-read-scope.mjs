export function adapterReadDomain(adapter,site,value){
 const url=new URL(value);
 if(url.protocol!=='https:'||url.username||url.password||url.port||url.search||url.hash)throw Error('ADAPTER_SCOPE_INVALID');
 if(url.hostname.replace(/^www\./,'')===site)return site;
 if((adapter.authorizedReadOrigins??[]).includes(url.origin))return url.hostname;
 throw Error('ADAPTER_SCOPE_INVALID');
}
export function watchdogDeliveryBinding(role,proof){return {incidentId:proof?.incident?.id??role?.ownerAlertDelivery?.expectedEventId??role?.alerts?.[0]?.id??'missing-current-watchdog-incident',probeRunId:proof?.probe?.runId??proof?.probe?.id??role?.probeRunId??null};}
