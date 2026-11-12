import {readFile} from 'node:fs/promises';import {authorizeBuildWork} from '../../lib/site-build-gate.mjs';
const [input,workId]=process.argv.slice(2);if(!input||!workId)throw Error('Usage: node scripts/completion/authorize-build.mjs site-record.json explicit-work-id');
const r=JSON.parse(await readFile(input,'utf8')),decision=authorizeBuildWork(r.contract,r.evidence,workId);console.log(JSON.stringify(decision,null,2));if(!decision.allowed)process.exitCode=1;
