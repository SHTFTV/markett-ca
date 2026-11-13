"""Restore only this branch's latest unexpired discovery artifact, with read-only token."""
import io,json,os,urllib.request,zipfile
from pathlib import Path
repo=os.environ['GITHUB_REPOSITORY'];branch=os.environ['GITHUB_REF_NAME']
headers={'Authorization':'Bearer '+os.environ['GH_TOKEN'],'Accept':'application/vnd.github+json'}
class Redirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,req,fp,code,msg,response_headers,newurl):
        from urllib.parse import urlsplit
        if urlsplit(newurl).scheme!='https':raise ValueError('HTTPS artifact redirect required')
        result=super().redirect_request(req,fp,code,msg,response_headers,newurl)
        if urlsplit(newurl).netloc!=urlsplit(req.full_url).netloc:
            result.remove_header('Authorization')
        return result
opener=urllib.request.build_opener(Redirect())
def get(url):
    request=urllib.request.Request(url,headers=headers)
    with opener.open(request,timeout=30) as response:return response.read()
base='https://api.github.com/repos/'+repo
artifacts=json.loads(get(base+'/actions/artifacts?name=curator-isolation-state&per_page=50'))['artifacts']
artifact=next((a for a in artifacts if not a['expired'] and a.get('workflow_run',{}).get('head_branch')==branch),None)
if artifact:
    archive=zipfile.ZipFile(io.BytesIO(get(artifact['archive_download_url'])))
    # Do not extract arbitrary archive paths.
    names=[n for n in archive.namelist() if n=='discovery.sqlite']
    if not names:raise ValueError('Expected discovery.sqlite missing from prior state artifact')
    Path(os.environ['STATE_PATH']).write_bytes(archive.read(names[0]))
    print('Restored artifact',artifact['id'],'from same branch',branch)
else:print('No earlier same-branch state artifact; starting explicit first collection')
