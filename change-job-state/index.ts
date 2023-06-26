import { AzureFunction, Context, errorHandler, CONNECTION_POOL, HttpResponseSimple, JobStateUpdate, sqltypes } from '../common.mjs'



async function trigger (context: Context): Promise<void>
{
   const options    = context.req.body as JobStateUpdate,
         inputError = validateInputs(options)

   if (inputError)
   {
      context.res = <HttpResponseSimple> {
         status : 400,
         body   : inputError,
         headers: { 'Content-Type': 'application/json' }
      }
      return
   }

   const pool = await CONNECTION_POOL.connect()
   const request = pool.request()

   request.input('jobId', sqltypes.Int, options.jobId)
   request.input('message', sqltypes.VarChar(50), options.message||null)
   request.input('state', sqltypes.TinyInt, options.state)
   request.input('subId', sqltypes.Int, null)

   let tableName:string
   let subIdColumn: string = 'JobID'

   switch (options.jobType)
   {
      case 'integration': 
         tableName = 'Job_Integration'
         break

      case 'report': 
         tableName = 'Job_Report'
         break

      case 'rollout': 
         tableName = 'Job_Rollout'
         break

      case 'rolloutmembers': 
         tableName = 'Job_Rollout_Member_Optional'
         subIdColumn = 'Charge'
         break

      case 'rolloutschedulebasis': 
         tableName   = 'Job_Rollout_Schedule_Basis'
         subIdColumn = 'Charge'
         request.replaceInput('subId', sqltypes.Int, options.charge || null)
         break

      case 'rolloutscheduleoptional':
         tableName   = 'Job_Rollout_Schedule_Optional'
         subIdColumn = 'Charge'
         request.replaceInput('subId', sqltypes.Int, options.charge || null)
         break
   
      case 'setproductive': 
         tableName = 'Job_SetProductive'
         break

      case 'update': 
         tableName = 'Job_DeploySoftwareUpdates'
         break

      case 'updatecis': 
         tableName   = 'Job_DeploySoftwareUpdates_CIs'
         subIdColumn = 'CI_ID'
         request.replaceInput('subId', sqltypes.Int, options.ciId || null)
         break

      case 'updateschedules': 
         tableName   = 'Job_DeploySoftwareUpdates_Schedules'
         subIdColumn = 'CollectionID'
         request.replaceInput('subId', sqltypes.Int, options.collectionId || null)
         break
   }

   

   
   const result = await request.query(`
      UPDATE [Jobs]
      SET    [JobStartedOn]     = ISNULL([JobStartedOn], GETDATE())
      ,      [StateChangedOn]   = GETDATE()
      ,      [LastStateMessage] = ISNULL(@message, [LastStateMessage])
      WHERE  [JobID] = @jobId;

      UPDATE [${tableName}]
      SET    [State] = @state 
      WHERE  [JobID] = @jobId
      AND    (@subId IS NULL OR [${subIdColumn}] = @subId);
   `)      
   

   context.res = <HttpResponseSimple> {
      body   : { rowsAffected: result.rowsAffected[0] },
      headers: { 'Content-Type': 'application/json' }
   }
}


function validateInputs (options: JobStateUpdate): string|void
{
   /** input parameter jobType has to be one of the following */
   const jobTypes = [
      'integration',
      'report',
      'rollout',
      'rolloutmembers',
      'rolloutschedulebasis',
      'rolloutscheduleoptional',
      'setproductive',
      'update',
      'updatecis',
      'updateschedules',
   ]

   switch (true)
   {
      case (options.jobId > 0) === false:
         return "input 'jobId' (number) is required."

      case jobTypes.includes(options.jobType.toLowerCase()) === false:
         return `input 'jobType' is required and has to be one of the following: ${jobTypes.join()}.`

      case Number.isInteger(options.state) === false:
         return `input 'state' (number) is required.`

      case options.jobType.toLowerCase() === 'updatecis' && options.ciId > 0 === false:
         return `input 'ciId' (number) is required for jobType 'updatecis'.`

      case options.jobType.toLowerCase() === 'updateschedules' && (typeof options.collectionId === 'string' && options.collectionId.length > 0) === false:
         return `input 'collectionId' (string) is required for jobType 'updateschedules'.`
   }

   return
}



const azureFunction: AzureFunction = errorHandler(trigger)
export default azureFunction