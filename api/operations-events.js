import {ingest} from '../lib/operations-transport.mjs';
import {connect} from '../lib/operations-connect.mjs';
export default function handler(req,res){return ingest(req,res,{connect});}
