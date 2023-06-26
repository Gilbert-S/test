import { AzureFunction, Context, errorHandler, CONNECTION_POOL, HttpResponseSimple, Report } from '../common.mjs'



async function trigger (context: Context): Promise<void>
{
   const options    = context.req.body as Report,
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
   
   const result = await pool.query`
      INSERT INTO Jobs 
      ([JobType], [CreatedBy], [Customer])
		VALUES ( 'Report', 1, ${options.Customer});

      INSERT INTO [Job_Report] 
      ([JobID], [StartDate], [EndDate], [Occurrence], [Interval], [Weekdays], [LastRun], [NextRun], [ReportPath], [ReportName], [Parameters], [Action], [Share], [MailRecipients], [State])
      OUTPUT INSERTED.*
      VALUES ( SCOPE_IDENTITY()
      ,        ${options.StartDate}
      ,        ${options.EndDate}
      ,        ${options.Occurrence     || 1}
      ,        ${options.Interval       || 480}
      ,        ${options.Weekdays       || 127}
      ,        ${options.LastRun        || null}
      ,        ${options.NextRun        || null}
      ,        ${options.ReportPath}
      ,        ${options.ReportName}
      ,        ${options.Parameters     || null}
      ,        ${options.Action         || 'share'}
      ,        ${options.Share          || null}
      ,        ${options.MailRecipients || null}
      ,        0);
   `      
   

   context.res = <HttpResponseSimple> {
      body   : result.recordset,
      headers: { 'Content-Type': 'application/json' }
   }
}



function validateInputs (options: Report): string|void
{
   switch (true)
   {
      case (isNaN(Date.parse(options.StartDate))) === true:
         return "input 'StartDate' (datetime) is required."

      case (isNaN(Date.parse(options.EndDate))) === true:
         return "input 'EndDate' (datetime) is required."

      case (typeof options.ReportPath === 'string' && options.ReportPath.length > 0 ) === false:
         return `input 'ReportPath' is required.}.`

      case (typeof options.ReportName === 'string' && options.ReportName.length > 0) === false:
         return `input 'ReportName' is required.}.`

      case (typeof options.Customer === 'string' && options.Customer.length === 3) === false:
         return `input 'Customer' (3 letters/numbers) is required.}.`
   }

   return
}



const azureFunction: AzureFunction = errorHandler(trigger)
export default azureFunction