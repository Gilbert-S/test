import { Context, HttpResponse } from "@azure/functions"


/** Coerces a value (typically a string) to a boolean. 
 * has to be boolean true or the string 'true' (case insensitive) 
 * to return true, returns false in any other case */
export function coerceBooleanProperty (value: any): boolean
{
   return `${value}`.toLowerCase() === 'true'
}




/** Coerces a value (typically a string) to a number. */
export function coerceNumberProperty (value: any): number
export function coerceNumberProperty<D> (value: any, fallback: D): number | D
export function coerceNumberProperty (value: any, fallbackValue = 0)
{
   return _isNumberValue(value) ? Number(value) : fallbackValue
}

/** Whether the provided value is considered a number. */
export function _isNumberValue (value: any): boolean
{
   // parseFloat(value) handles most of the cases we're interested in (it treats null, empty string,
   // and other non-number values as NaN, where Number just uses 0) but it considers the string
   // '123hello' to be a valid number. Therefore we also check if Number(value) is NaN.
   return !isNaN(parseFloat(value as any)) && !isNaN(Number(value))
}




// a helper function to catch Promise rejections
// catches rejected Promises and hands them over 
// to the regular error handling middleware.
export const errorHandler = fn =>
   function errorHandlerWrap (...args)
   {
      const fnReturn = fn(...args)
      const context = args[0]
      return Promise.resolve(fnReturn).catch(error => handleUncaughtPromiseRejection(error, context))
   }

function handleUncaughtPromiseRejection (error: Error, context: Context)
{
   let response: HttpResponse = context.res 
   
   context.log.error(error)
   response.status = 500
}



/** Responds to a request with HTTP status code 405 (Method not allowed) */
export async function MethodNotAllowed (context: Context): Promise<void>
{
   const res = context.res as HttpResponse
   res.status = 405
   res.body = { message: 'Method not allowed' }
   res.headers = { 'Content-Type': 'application/json' }
}