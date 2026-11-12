import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {evaluateCompletion} from '../../lib/operational-completion.mjs';
export function auditCompletion(records,options){return {standardVersion:1,sites:records.map(r=>evaluateCompletion(r.contract,r.evidence,options))};}
export async function main(args=process.argv.slice(2)){
 const [input,output]=args;if(!input||!output)throw Error('Usage: node scripts/completion/report.mjs records.json output-directory [--require-complete]');
 const report=auditCompletion(JSON.parse(await readFile(input,'utf8')));await mkdir(output,{recursive:true});
 await writeFile(resolve(output,'completion-report.json'),JSON.stringify(report,null,2)+'\n');
 const rows=report.sites.flatMap(s=>s.matrix.map(c=>`| ${s.site} | ${c.id} | ${c.status} | ${(c.reason??'').replaceAll('|','/')} | ${c.proofRef??''} |`));
 await writeFile(resolve(output,'completion-report.md'),'# Operational completion evidence\n\nIncomplete means required production evidence is missing; a deployment or homepage is not DONE.\n\n| Site | Check | Result | Blocker | Proof |\n|---|---|---|---|---|\n'+rows.join('\n')+'\n');
 console.log(JSON.stringify(report.sites.map(({site,status,blockers})=>({site,status,blockers:blockers.length}))));
 if(args.includes('--require-complete')&&report.sites.some(s=>!s.operationally_complete))process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await main();
