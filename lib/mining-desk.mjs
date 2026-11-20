const PACIFIC='America/Los_Angeles'
const money=value=>value==null?'unknown':'$'+Number(value).toFixed(2)
export function miningDesk(status,{now=Date.now()}={}){
 const desk=status?.commandCentre??{}
 const heartbeat=Date.parse(desk.heartbeatAt??status?.lastAutomaticRunAt??'')
 const heartbeatMinutes=Number.isFinite(heartbeat)?Math.max(0,Math.floor((now-heartbeat)/60000)):null
 const runStatus=desk.runStatus??status?.status??'unknown'
 const alive=heartbeatMinutes!==null&&heartbeatMinutes<=20&&!['generation-failed','budget-cap-reached','all-sources-failed','build-failed','publication-verification-failed'].includes(runStatus)
 const spend=desk.spend??{}
 const stories=desk.storiesToday??[]
 const held=desk.held??[]
 const last=status?.lastVerifiedPublication?.[0]??null
 return {
  tone:alive?'ok':'attention',
  headline:alive?'Mining Minute publisher is running':'Mining Minute needs attention',
  lines:[
   heartbeatMinutes===null?'No publisher heartbeat yet.':`Last automatic run ${heartbeatMinutes} minute${heartbeatMinutes===1?'':'s'} ago.`,
   `Latest run: ${runStatus}.`,
   `Pacing: at most ${desk.pacing?.maxStoriesPerRun??'unknown'} stories per run.`,
   `Spend counted today (UTC day, resets 4:00 PM Pacific): ${money(spend.countedUSD)} of ${money(spend.capUSD)}. Reported actual text cost: ${money(spend.actualUSD)}.`,
   stories.length?`${stories.length} story${stories.length===1?'':'s'} published since midnight Pacific.`:'No story published since midnight Pacific.',
   held.length?`${held.length} item${held.length===1?'':'s'} held. First reason: ${held[0].reason}`:'No held items in the latest run.'
  ],
  last,
  stories,
  runUrl:desk.runUrl??status?.runUrl??null
 }
}
