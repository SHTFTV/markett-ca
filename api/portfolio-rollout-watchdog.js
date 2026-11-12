import {connect} from '../lib/operations-connect.mjs';import {configuration} from '../lib/operations-transport.mjs';import {handlePortfolioRollout} from '../lib/portfolio-rollout-database.mjs';
export default {fetch:request=>handlePortfolioRollout(request,{connect,configuration,kind:'watchdog'})};
