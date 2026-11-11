import pg from 'pg';
export async function connect(config){
 const db=new pg.Client({connectionString:config.connectionString,ssl:config.ssl,connectionTimeoutMillis:10000,application_name:'markett-operations-events'});
 await db.connect();return db;
}
