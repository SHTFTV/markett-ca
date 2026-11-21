import test from 'node:test'
import assert from 'node:assert/strict'
import {miningDesk} from '../lib/mining-desk.mjs'
const now=Date.parse('2026-11-20T22:30:00Z')
test('a fresh verified run is the desk the owner sees',()=>{
 const view=miningDesk({status:'published-and-verified',lastAutomaticRunAt:'2026-11-20T22:20:00Z',runUrl:'https://github.com/SHTFTV/theminingminute.com/actions/runs/1',lastVerifiedPublication:[{url:'https://theminingminute.com/article/one',id:'one'}],commandCentre:{heartbeatAt:'2026-11-20T22:20:00Z',runStatus:'published-and-verified',pacing:{maxStoriesPerRun:2},spend:{countedUSD:0.42,actualUSD:0.11,capUSD:4},storiesToday:[{id:'one',title:'One',url:'https://theminingminute.com/article/one'}],held:[],runUrl:'https://github.com/SHTFTV/theminingminute.com/actions/runs/1'}},{now})
 assert.equal(view.tone,'ok')
 assert.match(view.lines[2],/at most 2 stories/)
 assert.match(view.lines[3],/\$0\.42 of \$4\.00/)
 assert.equal(view.stories.length,1)
})
test('a stale or failed run is attention',()=>{
 const stale=miningDesk({status:'nothing-new',lastAutomaticRunAt:'2026-11-20T18:00:00Z',commandCentre:{heartbeatAt:'2026-11-20T18:00:00Z',runStatus:'nothing-new',spend:{},storiesToday:[],held:[]}},{now})
 const failed=miningDesk({status:'generation-failed',lastAutomaticRunAt:'2026-11-20T22:28:00Z',commandCentre:{heartbeatAt:'2026-11-20T22:28:00Z',runStatus:'generation-failed',spend:{countedUSD:4,capUSD:4,actualUSD:1.2},storiesToday:[],held:[{reason:'OpenAI daily cap reached'}]}},{now})
 assert.equal(stale.tone,'attention')
 assert.equal(failed.tone,'attention')
 assert.match(failed.lines.at(-1),/OpenAI daily cap reached/)
})
