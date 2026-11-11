const root = document.getElementById('cloud-publishing-setup');
if (root) {
  const el = (tag, text) => { const n = document.createElement(tag); n.textContent = text; return n; };
  const fact = (box, title, value) => { const p=el('p','');p.append(el('strong',title+': '),document.createTextNode(value ?? 'Unknown'));box.append(p); };
  fetch('/cloud-publishing-status.json', {cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Setup evidence unavailable');return r.json();}).then(data=>{
    root.replaceChildren(el('h2','Cloud publishing setup — first seven sites'),el('p',data.notice),el('p','Snapshot updated: '+data.updatedAt));
    const queue=el('a','Open the full known-domain build and setup queue');queue.href='/site-setup-queue.html';root.append(queue);
    for (const site of data.sites) {
      const box=el('details','');box.style.cssText='border-top:1px solid #35434d;padding:18px 0;font-size:16px';
      const summary=el('summary','🔴 '+site.domain+' — '+(site.blocker?'action required':'verification required'));summary.style.cssText='font-size:20px;font-weight:700;cursor:pointer;color:#ffadb0';box.append(summary);
      fact(box,'Saved SOT',site.sotVersion+(site.sotComplete?' — recovered complete contract':' — gaps remain'));
      const repo=el('a',site.repository);repo.href=site.repository;box.append(repo);
      fact(box,'Canonical host',site.host);
      fact(box,'Credential configured',site.credentialConfigured===true?'Yes':site.credentialConfigured===false?'No':'Not verified');
      fact(box,'Credential scope',site.credentialScope);
      fact(box,'API / endpoint / provider evidence',site.apiStatus);
      fact(box,'GitHub repository / environment secrets present',[site.githubRepositorySecretsPresent,site.githubEnvironmentSecretsPresent].map(v=>v?'yes':'no').join(' / '));
      fact(box,'Vercel project env variables present',site.vercelProjectEnvConfigured===false?'No':'Not checked in this record');
      fact(box,'Durable queue/state',site.durableState);fact(box,'Sole writer/lease',site.soleWriter);fact(box,'Schedule/timezone',site.schedule);
      fact(box,'Enabled / deployed / automatic publication verified',[site.enabled,site.deployed,site.automaticPublicationVerified].map(v=>v?'yes':'not proven').join(' / '));
      if(site.lastRemoteRun){const r=site.lastRemoteRun;fact(box,'Latest recorded remote run',r.event+' · '+r.result+' · '+r.at);const link=el('a','Inspect actual run');link.href=r.url;box.append(link);}else fact(box,'Remote run','No current acceptance receipt in this snapshot; prior setup is not assumed absent');
      if(site.lastVerifiedArticle){const a=site.lastVerifiedArticle;fact(box,'Last verified article',a.publishedAt+' · '+a.trigger);const link=el('a','Open verified article');link.href=a.url;box.append(link);}else fact(box,'Last verified article','Not reconciled in this section; see existing publication history');
      fact(box,'Blocker',site.blocker);fact(box,'Exact next action',site.nextAction);fact(box,'Evidence checked',site.checkedAt);root.append(box);
    }
  }).catch(e=>root.replaceChildren(el('h2','Cloud publishing setup'),el('p','🔴 '+e.message+'. Status is unknown, not complete.')));
}
