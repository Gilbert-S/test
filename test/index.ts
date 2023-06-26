import { AzureFunction, Context, errorHandler, CONNECTION_POOL, HttpResponseSimple } from '../common.mjs'



async function trigger (context: Context): Promise<void>
{
    const pool = await CONNECTION_POOL.connect()

    const test = await Promise.all<any>([pool.query("SELECT 123;"), pool.query("SELECT 456;")]) // , pool.query("SELECT nonsense FROM NONEXISTINGTABLE;")
    
    const responseMessage = `connected: ${pool.connected}, healthy: ${pool.healthy}, free: ${pool.pool.numFree()}, used: ${pool.pool.numUsed()}, test: ${JSON.stringify(test)}`

    context.res = <HttpResponseSimple>{
        body: responseMessage
    }
}


const azureFunction: AzureFunction = errorHandler(trigger)
export default azureFunction