// Public digest manifest only. The canonical policy text and rejection details stay private.
import fs from 'node:fs';
import crypto from 'node:crypto';
const standardPath='docs/completion/OPERATING-STANDARD.md';
const registerPath='docs/operation-preflight/rejection-register.json';
const standard=fs.readFileSync(standardPath),register=fs.readFileSync(registerPath);
const parsed=JSON.parse(register),version=Number(standard.toString().match(/^# Portfolio definition of DONE — version (\d+)/)?.[1]);
if(!version||parsed.schemaVersion!==1||!parsed.version)throw Error('Approved canonical protocol identity missing');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const result={schemaVersion:1,doesNotGrantPermissions:true,sourceCommit:process.env.VERCEL_GIT_COMMIT_SHA||null,
 sharedStandard:{version,sha256:sha(standard),canonicalRef:'https://github.com/SHTFTV/markett-ca/blob/main/'+standardPath},
 rejectionRegister:{version:parsed.version,sha256:sha(register),canonicalRef:'https://github.com/SHTFTV/markett-ca/blob/main/'+registerPath}};
fs.mkdirSync('lib/generated',{recursive:true});
fs.writeFileSync('lib/generated/approved-policy-digests.mjs','// Build-generated public versions and hashes only.\nexport default '+JSON.stringify(result,null,2)+';\n');
console.log('Generated public approved-policy digests; private policy contents were not exported');

// Keep raw policy inputs build-only; never publish their contents as static assets.
if(process.env.VERCEL === '1'){
 for(const file of [standardPath,registerPath,'scripts/operation-preflight-manifest.mjs'])fs.rmSync(file,{force:true});
}
