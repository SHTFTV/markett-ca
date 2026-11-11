import pg from 'pg';
export async function connect(config){
 const db=new pg.Client({connectionString:config.connectionString,ssl:config.ssl,connectionTimeoutMillis:10000,application_name:'markett-operations-events'});
 try{await db.connect();return db;}catch(error){
  // Log only a bounded provider code; never a connection URL, password or raw error message.
  const code=/^[A-Z0-9_]{2,48}$/.test(error.code??'')?error.code:'CONNECTION_FAILED';
  console.error('MARKETT_EVENT_DATABASE_'+code);throw error;
 }
}
