import { AzureFunction, Context, errorHandler, CONNECTION_POOL, HttpResponse, MethodNotAllowed } from '../common.mjs'



async function trigger (context: Context): Promise<void>
{
   switch (context.req.method) {
      case 'GET': return GET_SetProductiveJobs(context)
      case 'POST': return MethodNotAllowed(context)
   }
}



async function GET_SetProductiveJobs (context: Context): Promise<void>
{
   const filterJobId    = context.req.params.jobid || null,
         filterState    = context.req.query.state || null,
         filterCustomer = context.req.query.customer || null,
         res            = context.res as HttpResponse,
         pool           = await CONNECTION_POOL.connect()

   const result = await pool.query`
      SELECT  [JobID], [ApplicationName], [AllowRepair], [State]
      FROM    [v_Job_SetProductive] 
      WHERE   (${filterState} IS NULL     OR  [State] = ${filterState})
      AND     (${filterCustomer} IS NULL  OR  [Customer] = ${filterCustomer})
      AND     (${filterJobId} IS NULL     OR  [JobID] = ${filterJobId})
   `

   // respond with HTTP status code 404 if an explicit JobID was requested but not found in the database
   if (filterJobId && result.recordset.length === 0) res.status = 404

   res.body    = result.recordset
   res.headers = { 'Content-Type': 'application/json' }
}



const azureFunction: AzureFunction = errorHandler(trigger)
export default azureFunction