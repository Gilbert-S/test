import { AzureFunction, Context, errorHandler, CONNECTION_POOL, HttpResponse, MethodNotAllowed } from '../common.mjs'



async function trigger (context: Context): Promise<void>
{
   const method      = context.req.method,
         sub         = context.req.params.sub?.toLowerCase(),
         rollouttype = context.req.query.rollouttype?.toLowerCase(),
         inputError  = validateInputs(context)

   if (inputError)
   {
      context.res = <HttpResponse> {
         status: 400,
         body: inputError,
         headers: { 'Content-Type': 'application/json' }
      }
      return
   }

   switch (true) {
      case method === 'GET' && sub === 'schedules' && rollouttype === 'optional': 
         return GET_OPTIONAL_Schedules(context)

      case method === 'GET' && sub === 'schedules' && rollouttype === 'basis':
         return GET_BASIS_Schedules(context)

      case method === 'GET' && sub === 'clients':
         return GET_OPTIONAL_Clients(context)

      case method === 'PUT' && sub === 'readytodeploy':
         return PUT_ReadyToDeploy(context)

      case method === 'GET' && sub === 'jobs':
      case method === 'GET':
         return GET_Rollouts(context)

      case method === 'POST':
      case method === 'PUT':
      default:
         return MethodNotAllowed(context)
   }
}





async function GET_Rollouts (context: Context): Promise<void>
{
   const filterJobId    = context.req.params.jobid   || null,
         filterState    = context.req.query.state    || null,
         filterCustomer = context.req.query.customer || null,
         res            = context.res as HttpResponse,
         pool           = await CONNECTION_POOL.connect()

   const result = await pool.query`
      SELECT  [Type], [JobID], [ApplicationName], [ActionType], [RemovePreviousRollout], [LimitingCollection], [Variant], [ITSM], [State] 
      FROM    [v_Job_Rollout] 
      WHERE   (${filterState} IS NULL     OR  [State] = ${filterState})
      AND     (${filterCustomer} IS NULL  OR  [Customer] = ${filterCustomer})
      AND     (${filterJobId} IS NULL     OR  [JobID] = ${filterJobId})
   `

   // respond with HTTP status code 404 if an explicit JobID was requested but not found in the database
   if (filterJobId && result.recordset.length === 0) res.status = 404

   res.body = result.recordset
   res.headers = { 'Content-Type': 'application/json' }
}



async function GET_BASIS_Schedules (context: Context): Promise<void>
{
   const filterJobId         = context.req.params.jobid || null,
         filterJobState      = context.req.query.jobstate || null,
         filterScheduleState = context.req.query.schedulestate || null,
         filterReadyToDeploy = context.req.query.readytodeploy || null,
         filterBeginDate     = context.req.query.begindatereached || null,
         filterCustomer      = context.req.query.customer || null,
         res                 = context.res as HttpResponse,
         pool                = await CONNECTION_POOL.connect()

   const result = await pool.query`
      SELECT    SCHEDULE.*, JOB.[ApplicationName], JOB.[ActionType], JOB.[Variant]
      FROM      [v_Job_Rollout_Schedule_Basis] AS SCHEDULE
      LEFT JOIN [v_Job_Rollout] AS JOB ON SCHEDULE.[JobID] = JOB.[JobID]
      WHERE     (${filterBeginDate} IS NULL       OR   BeginDate <= GETDATE())
      AND       (${filterReadyToDeploy} IS NULL   OR   ReadyToDeploy = ${filterReadyToDeploy})
      AND       (${filterScheduleState} IS NULL   OR   SCHEDULE.State = ${filterScheduleState})
      AND       (${filterCustomer} IS NULL        OR   JOB.Customer = ${filterCustomer})
      AND       (${filterJobState} IS NULL        OR   JOB.State = ${filterJobState})
      AND       (${filterJobId} IS NULL           OR   SCHEDULE.[JobID] = ${filterJobId})
      ORDER BY  BeginDate ASC, CollectionShortName ASC
   `

   res.body = result.recordset
   res.headers = { 'Content-Type': 'application/json' }
}





async function GET_OPTIONAL_Schedules (context: Context): Promise<void>
{
   const filterJobId         = context.req.params.jobid || null,
         filterJobState      = context.req.query.jobstate || null,
         filterScheduleState = context.req.query.schedulestate || null,
         filterReadyToDeploy = context.req.query.readytodeploy || null,
         filterBeginDate     = context.req.query.begindatereached || null,
         filterCustomer      = context.req.query.customer || null,
         res                 = context.res as HttpResponse,
         pool                = await CONNECTION_POOL.connect()

   const result = await pool.query`
      SELECT SCHEDULE.*, JOB.[ApplicationName], JOB.[ActionType], JOB.[Variant]
      FROM v_Job_Rollout_Schedule_Optional AS SCHEDULE
      LEFT JOIN v_JOB_Rollout AS JOB ON SCHEDULE.[JobID] = JOB.[JobID]
      WHERE     (${filterBeginDate} IS NULL       OR   BeginDate <= GETDATE())
      AND       (${filterReadyToDeploy} IS NULL   OR   ReadyToDeploy = ${filterReadyToDeploy})
      AND       (${filterCustomer} IS NULL        OR   JOB.Customer = ${filterCustomer})
      AND       (${filterScheduleState} IS NULL   OR   SCHEDULE.State = ${filterScheduleState})
      AND       (${filterJobState} IS NULL        OR   JOB.State = ${filterJobState})
      AND       (${filterJobId} IS NULL           OR   SCHEDULE.[JobID] = ${filterJobId})
      ORDER BY BeginDate ASC
   `

   res.body = result.recordset
   res.headers = { 'Content-Type': 'application/json' }
}



async function GET_OPTIONAL_Clients (context: Context): Promise<void>
{
   const JobID  = context.req.params.jobid,
         Charge = context.req.query.charge || null,
         res    = context.res as HttpResponse,
         pool   = await CONNECTION_POOL.connect()


   const result = await pool.query`
      SELECT   [Member]
      FROM     [v_JOB_Rollout_Member_Optional]
      WHERE    JobID = ${JobID}
      AND      (${Charge} IS NULL OR Charge = ${Charge})
   `

   res.body = result.recordset
   res.headers = { 'Content-Type': 'application/json' }
}



async function PUT_ReadyToDeploy (context: Context): Promise<void>
{
   const jobId       = context.req.params.jobid,
         rolloutType = context.req.query.rollouttype?.toLowerCase(),
         res         = context.res as HttpResponse,
         pool        = await CONNECTION_POOL.connect()
   
   let result

   if (rolloutType === 'basis')
      result = await pool.query`
         UPDATE [v_Job_Rollout_Schedule_Basis] 
         SET    ReadyToDeploy = '1' 
         WHERE  JobID = ${jobId}
      `
   else if (rolloutType === 'optional')
      result = await pool.query`
         UPDATE [v_Job_Rollout_Schedule_Optional]
         SET    ReadyToDeploy = '1'
         WHERE  JobID = ${jobId}
      `

   res.body = { rowsAffected: result.rowsAffected[0] }
   res.headers = { 'Content-Type': 'application/json' }
}



function validateInputs (context: Context): string | void
{
   const method      = context.req.method,
         sub         = context.req.params.sub?.toLowerCase(),
         rollouttype = context.req.query.rollouttype?.toLowerCase(),
         jobId       = context.req.params.jobid


   switch (true)
   {
      case sub === 'clients' && parseInt(jobId) > 0 === false:
         return "input 'jobId' (number) is required when requesting a client list."

      case sub === 'schedules' && (rollouttype === 'basis' || rollouttype === 'optional') === false:
         return `input 'rollouttype' is required and has to be basis or optional when requesting schedules.`
      
      case sub === 'readytodeploy' && parseInt(jobId) > 0 === false:
         return "input 'jobId' (number) is required when changing readytodeploy status."
   }

   return
}



const azureFunction: AzureFunction = errorHandler(trigger)
export default azureFunction