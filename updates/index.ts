import { AzureFunction, Context, errorHandler, CONNECTION_POOL, HttpResponse, MethodNotAllowed } from '../common.mjs'



async function trigger (context: Context): Promise<void>
{
   const method = context.req.method,
         sub    = context.req.params.sub?.toLowerCase()

   switch (true)
   {
      case method === 'GET' && sub === 'schedules': 
         return GET_UpdateSchedules(context)

      case method === 'GET' && sub === 'cis': 
         return GET_UpdateCIs(context)

      case method === 'GET' && sub === 'jobs': 
      case method === 'GET': 
         return GET_UpdateJobs(context)

      case method === 'POST':
      default: 
         return MethodNotAllowed(context)
   }
}



async function GET_UpdateJobs (context: Context): Promise<void>
{
   const filterJobId    = context.req.params.jobid   || null,
         filterState    = context.req.query.state    || null,
         filterCustomer = context.req.query.customer || null,
         res            = context.res as HttpResponse,
         pool           = await CONNECTION_POOL.connect()

   const result = await pool.query`
      SELECT  [JobID], [O365], [SSU], [State], [CRQ], [SUGName]
      FROM    [v_Job_DeploySoftwareUpdates] 
      WHERE   (${filterState} IS NULL     OR  [State] = ${filterState})
      AND     (${filterCustomer} IS NULL  OR  [Customer] = ${filterCustomer})
      AND     (${filterJobId} IS NULL     OR  [JobID] = ${filterJobId})
   `

   // respond with HTTP status code 404 if an explicit JobID was requested but not found in the database
   if (filterJobId && result.recordset.length === 0) res.status = 404

   res.body = result.recordset,
   res.headers = { 'Content-Type': 'application/json' }
}



async function GET_UpdateSchedules (context: Context): Promise<void>
{
   const jobId       = context.req.params.jobid,
         filterState = context.req.query.state || null,
         res         = context.res as HttpResponse,
         pool        = await CONNECTION_POOL.connect()

   const result = await pool.query`
      SELECT  [JobID], [CollectionID], [DeploymentDate], [State]
      FROM    [v_Job_DeploySoftwareUpdates_Schedules] 
      WHERE   [JobID] = ${jobId}
      AND     (${filterState} IS NULL OR [State] = ${filterState})
   `

   if (result.recordset.length === 0) res.status = 404

   res.body = result.recordset,
   res.headers = { 'Content-Type': 'application/json' }
}



async function GET_UpdateCIs (context: Context): Promise<void>
{
   const jobId       = context.req.params.jobid,
         filterState = context.req.query.state || null,
         res         = context.res as HttpResponse,
         pool        = await CONNECTION_POOL.connect()

   const result = await pool.query`
      SELECT  [JobID], [CI_ID], [State]
      FROM    [v_Job_DeploySoftwareUpdates_CIs] 
      WHERE   [JobID] = ${jobId}
      AND     (${filterState} IS NULL OR [State] = ${filterState})
   `

   if (result.recordset.length === 0) res.status = 404

   res.body = result.recordset,
   res.headers = { 'Content-Type': 'application/json' }
}



const azureFunction: AzureFunction = errorHandler(trigger)
export default azureFunction