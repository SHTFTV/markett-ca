// Read-only policy digests. Never return the private policy or rejection contents.
import fs from 'node:fs';
import crypto from 'node:crypto';
export default function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'METHOD_NOT_ALLOWED'});}
 try{
  const standard=fs.readFileSync(new URL('../docs/completion/OPERATING-STANDARD.md',import.meta.url));
  const register=fs.readFileSync(new URL('../docs/operation-preflight/rejection-register.json',import.meta.url));
  const parsed=JSON.parse(register),version=Number(standard.toString().match(/^# Portfolio definition of DONE — version (\d+)/)?.[1]);
  if(!version||parsed.schemaVersion!==1||!parsed.version)throw Error('Invalid approved canonical protocol');
  const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
  res.setHeader('Cache-Control','no-store');
  return res.status(200).json({schemaVersion:1,doesNotGrantPermissions:true,sourceCommit:process.env.VERCEL_GIT_COMMIT_SHA||null,
   sharedStandard:{version,sha256:sha(standard),canonicalRef:'https://github.com/SHTFTV/markett-ca/blob/main/docs/completion/OPERATING-STANDARD.md'},
   rejectionRegister:{version:parsed.version,sha256:sha(register),canonicalRef:'https://github.com/SHTFTV/markett-ca/blob/main/docs/operation-preflight/rejection-register.json'}});
 }catch{return res.status(503).json({error:'APPROVED_POLICY_DIGESTS_UNAVAILABLE'});}
}
