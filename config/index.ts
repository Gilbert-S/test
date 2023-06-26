import { AzureFunction, Context, errorHandler, CONNECTION_POOL, HttpResponse } from '../common.mjs'



async function trigger (context: Context): Promise<void>
{
   const customer = context.req.params.customer.toUpperCase(),
         res = context.res as HttpResponse,
         pool = await CONNECTION_POOL.connect()


   const result = await pool.query`
      SELECT TOP 1 * 
      FROM Customers_Configurations 
      WHERE CustomerCode = ${customer}
      AND Environment = 'PROD'
   `

   if (result.recordset.length === 0) res.status = 404

   res.body = result.recordset?.[0]
   res.headers = { 'Content-Type': 'application/json' }
}



const azureFunction: AzureFunction = errorHandler(trigger)
export default azureFunction