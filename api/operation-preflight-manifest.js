// Read-only policy digests. Never return the private policy or rejection contents.
import digests from '../lib/generated/approved-policy-digests.mjs';
export default function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'METHOD_NOT_ALLOWED'});}
 try{
  res.setHeader('Cache-Control','no-store');
  return res.status(200).json({...digests,sourceCommit:process.env.VERCEL_GIT_COMMIT_SHA||digests.sourceCommit});
 }catch{return res.status(503).json({error:'APPROVED_POLICY_DIGESTS_UNAVAILABLE'});}
}
