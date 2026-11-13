"""Additive operational preflight, not a replacement website policy or permission grant."""
import datetime,hashlib,json,os
from pathlib import Path

def load(path):
    raw=Path(path).read_bytes();value=json.loads(raw)
    if value.get('schemaVersion')!=1 or not value.get('version'):raise ValueError('INVALID_PREFLIGHT_REGISTER')
    return value,hashlib.sha256(raw).hexdigest()

def evaluate(register,site,operation,resource=None,permissions=None):
    applicability=next((r for r in register['siteApplicability']if r['site']==site),None)
    if applicability is None:return {'status':'missing','reasons':['Site absent from exact applicability roster'],'operation':operation}
    if operation=='public_metadata_fetch':
        if site not in register['authorizedIndependentSites']:
            return {'status':'missing','reasons':['No trusted independent discovery scope for this site'],'operation':operation}
        if set(permissions or [])-{'public-network:GET'}:
            return {'status':'missing','reasons':['Read-only discovery does not authorize additional permissions'],'operation':operation}
        return {'status':'verified-for-independent-read-only-discovery','operation':operation,
                'permissions':['public-network:GET'],'scope':'Public metadata only; not a publisher approval or private document/credential access'}
    held=[c for c in register['cases']if c['state']=='rejected-held' and c['operation']==operation
          and (c['site']==site or (c['site']=='shared' and operation=='portfolio_standard_release'))]
    if held:return {'status':'held','operation':operation,'caseIds':[c['id']for c in held],
                    'reasons':[c['reason']for c in held],'requiredPreflight':sorted({x for c in held for x in c['requiredPreflight']})}
    return {'status':'missing','operation':operation,'reasons':['No verified resource-specific permission, manifest and current policy-load evidence for this proposed operation; no approval is inferred from another site.'],
            'resource':resource,'permissions':permissions or [],'requiredPreflight':[
                'Exact site/repository/project/environment/secret or file-manifest identity',
                'Trusted authorization covering this actual operation and persistent scope',
                'Current approved site/shared/role protocol version and actual load receipt',
                'Single writer and existing source preserved',
                'Scoped tests, rollback and eventual production verification']}

def audit(path,config,output):
    register,digest=load(path);now=datetime.datetime.now(datetime.timezone.utc).isoformat()
    rows=[]
    for site in config['sites']:
        name=site['site'];app=next((a for a in register['siteApplicability']if a['site']==name),{})
        row={'site':name,'observedAt':now,'runtime':'independent-curator-discovery',
             'sourceCommit':os.environ.get('GITHUB_SHA'),'runRef':('https://github.com/'+os.environ['GITHUB_REPOSITORY']+'/actions/runs/'+os.environ['GITHUB_RUN_ID'])if os.environ.get('GITHUB_RUN_ID')else None,
             'actuallyLoadedPreflight':{'version':register['version'],'sha256':digest,'canonicalRef':register['canonicalRef']},
             'actuallyLoadedSourceConfigSha256':hashlib.sha256(json.dumps(site,sort_keys=True).encode()).hexdigest(),
             'operationChecks':{op:evaluate(register,name,op,{'repository':app.get('repository')},['public-network:GET']if op=='public_metadata_fetch'else[])for op in ['public_metadata_fetch','unattended_repository_write','production_secret_change','production_content_release','portfolio_standard_release','public_operational_document_access']},
             'publisherRuntimePreflightConsumption':'not-verified; this receipt attests only this actual independent discovery runtime',
             'existingPublisherLoadedSotVersion':None,'existingPublisherLoadedSotCommit':None,
             'siteSpecificHeldCases':app.get('specificHeldCases',[]),'globalPublishingHold':False}
        rows.append(row);print('PREFLIGHT_SITE_RECEIPT '+json.dumps(row),flush=True)
    Path(output).mkdir(parents=True,exist_ok=True)
    Path(output,'operation-preflight-audit.json').write_text(json.dumps({'version':register['version'],'registerSha256':digest,'rows':rows},indent=2)+'\n')
    return digest
