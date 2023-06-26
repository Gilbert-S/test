import { AzureFunction, Context, errorHandler, CONNECTION_POOL, HttpResponse, MethodNotAllowed } from '../common.mjs'



async function trigger (context: Context): Promise<void>
{
   switch (true)
   {
      case context.req.method === 'GET' && context.req.params.sub.toLowerCase() === 'dependencies':
         return GET_IntegrationDependencies(context)

      case context.req.method === 'GET' && context.req.params.sub.toLowerCase() === 'supersedence':
         return GET_IntegrationSupersedence(context)

      case context.req.method === 'GET' && context.req.params.sub.toLowerCase() === 'members':
         return GET_IntegrationMembers(context)

      case context.req.method === 'GET':
         return GET_IntegrationJobs(context)

      case context.req.method === 'POST':
      default:
         return MethodNotAllowed(context)
   }
}



async function GET_IntegrationJobs (context: Context): Promise<void>
{
   const filterJobId = context.req.params.jobid || null,
      filterState = context.req.query.state || null,
      filterCustomer = context.req.query.customer || null,
      res = context.res as HttpResponse,
      pool = await CONNECTION_POOL.connect()

   const result = await pool.query`
      SELECT  *
      FROM    [v_JOB_Integration] 
      WHERE   (${filterState} IS NULL     OR  [State] = ${filterState})
      AND     (${filterCustomer} IS NULL  OR  [Customer] = ${filterCustomer})
      AND     (${filterJobId} IS NULL     OR  [JobID] = ${filterJobId})
   `

   // respond with HTTP status code 404 if an explicit JobID was requested but not found in the database
   if (filterJobId && result.recordset.length === 0) res.status = 404

   res.body    = result.recordset
   res.headers = { 'Content-Type': 'application/json' }
}



async function GET_IntegrationDependencies (context: Context): Promise<void>
{
   const jobId = context.req.params.jobid,
      res = context.res as HttpResponse,
      pool = await CONNECTION_POOL.connect()

   const result = await pool.query`
      SELECT  [ApplicationName], [AutoInstall]
      FROM    [v_JOB_Integration_Dependencies] 
      WHERE   [JobID] = ${jobId}
   `

   // respond with HTTP status code 404 if an explicit JobID was requested but not found in the database
   if (result.recordset.length === 0) res.status = 404

   res.body    = result.recordset
   res.headers = { 'Content-Type': 'application/json' }
}



async function GET_IntegrationSupersedence (context: Context): Promise<void>
{
   const jobId = context.req.params.jobid,
      res = context.res as HttpResponse,
      pool = await CONNECTION_POOL.connect()

   const result = await pool.query`
      SELECT  [ApplicationName], [JobID]
      FROM    [v_JOB_Integration_Supersedence] 
      WHERE   [JobID] = ${jobId}
   `

   // respond with HTTP status code 404 if an explicit JobID was requested but not found in the database
   if (result.recordset.length === 0) res.status = 404

   res.body    = result.recordset
   res.headers = { 'Content-Type': 'application/json' }
}



async function GET_IntegrationMembers (context: Context): Promise<void>
{
   const jobId = context.req.params.jobid,
      res = context.res as HttpResponse,
      pool = await CONNECTION_POOL.connect()

   const result = await pool.query`
      SELECT  [Member]
      FROM    [v_JOB_Integration_Members] 
      WHERE   [JobID] = ${jobId}
   `

   // respond with HTTP status code 404 if an explicit JobID was requested but not found in the database
   if (result.recordset.length === 0) res.status = 404

   res.body    = result.recordset
   res.headers = { 'Content-Type': 'application/json' }
}



const azureFunction: AzureFunction = errorHandler(trigger)
export default azureFunction