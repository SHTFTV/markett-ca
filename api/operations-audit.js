import {cloudAudit} from '../lib/operations-cloud-audit.mjs';
import {connect} from '../lib/operations-connect.mjs';
import {auditSite} from '../scripts/agents/audit.mjs';
export default function handler(req,res){return cloudAudit(req,res,{connect,auditSite});}
