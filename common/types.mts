export interface noop {
   
}

export interface JobStateUpdate {
   jobId: number
   jobType: string
   state: number
   message?: string
   collectionId?: string
   charge?: number
   ciId?: number
}

export interface Report extends Job
{
   StartDate: string
   EndDate: string
   Occurrence: number
   Interval: number
   Weekdays: number
   LastRun: string
   NextRun: string
   ReportPath: string
   ReportName: string
   Parameters: string
   Action: string
   Share: string
   MailRecipients: string
}

export interface Job
{
   JobID: number
   JobType: string
   CreatedBy: number
   CreatedOn: string
   StateChangedOn: string
   JobStartedOn: string
   LastStateMessage: string
   Customer: string
}