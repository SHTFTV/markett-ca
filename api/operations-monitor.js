import {handleMonitor} from '../lib/operations-monitor-runtime.mjs';import {connect} from '../lib/operations-connect.mjs';import {collect} from './cloud-execution-status.js';import {completionRecords} from './completion-records.js';
export default function handler(req,res){return handleMonitor(req,res,{connect,collect,records:completionRecords});}
