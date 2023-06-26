import sql from 'mssql'
export const sqltypes = sql.TYPES
import { coerceBooleanProperty, coerceNumberProperty } from './utility.mjs'


const CONFIG: sql.config = {

   user: process.env.DTS_SQL_User || 'USER-FALLBACK',
   password: process.env.DTS_SQL_Password || 'PASSWORD-FALLBACK',
   server: process.env.DTS_SQL_Server || 'SERVER-FALLBACK',
   database: process.env.DTS_SQL_Database || 'DB-FALLBACK',
   port: coerceNumberProperty(process.env.DTS_SQL_Port, 1433),
   options: {
      encrypt: coerceBooleanProperty(process.env.DTS_SQL_Encrypt),
      enableArithAbort: true,
      trustServerCertificate: coerceBooleanProperty(process.env.DTS_SQL_TrustServerCertificate),
   },
   connectionTimeout: coerceNumberProperty(process.env.DTS_SQL_Timeout, 5) * 1000,
   requestTimeout: 10000,
   pool: {
      min: 2,
      max: 50,
      idleTimeoutMillis: 1000 * 60 * 10
   },
   beforeConnect: connection =>
   {
      connection.on('connect', (err) => { err ? console.error(err, 'SQL connection error') : console.log('SQL connection established') })
      connection.on('end', () => { console.log('SQL connection closed') })
   }
}

export const CONNECTION_POOL = new sql.ConnectionPool(CONFIG)