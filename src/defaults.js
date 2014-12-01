
/**
 *  Here is where I will document the default values for the various arguments to be passed into this constructor.
 */
module.exports = {

    /**
     *  The maximum numbers of simultaneous workers.  An integer greater than zero.  Any negative number will
     *  be interpreted as "no limit."
     */
    maxWorkers: -1

    /**
     *  The maximum number of retries for a queue entry.  An integer greater than zero.  Any negative number will be 
     *  interpreted as "no limit."
     */
    , maxRetries: -1

    /**
     *  The number of milliseconds to wait before declaring a job failed by timeout.  
     *  An integer greater than zero.  Any negative number will be 
     *  interpreted as "no limit."
     */
    , maxWait: -1

    /**
     *  The maximum allowed number of items waiting in the queue.  Integer greater than zero.  Any negative number will
     *  be interpreted as no limit.
     */
    , maxQueueSize: -1

    /**
     *  The function to call to do work on a queue entry.
     *  
     *  @param payload The information previously passed into the "push" function.
     *  @param previousAttempts the number of times this payload has previously been pushed to this function.
     *  @param deferred The deferred object to declare success or failure on the queue item.
     *  
     *  @return (Optional) a function to be called in case of a timeout (to do any necessary cleanup).
     */
    , callback: function(payload, previousAttempts, deferred){deferred.fulfill()}

    /**
     *  The function to call when a queue entry flunks out of the queue entirely.
     *  
     *  @param payload The information previously passed into the "push" function.
     *  @param totalAttempts the total number of attempts made to process this information.
     *  @param errors The list of errors that caused this to error out.
     */
    , failure: function(payload, totalAttempts, errors){}

    /**
     *  A progress callback to be called every time a new worker starts.
     *  
     *  @param queueSize - The number of jobs in the queue.
     *  @param workers - The number of workers currently working.
     */
    , progress: function(queueSize, workers){}

    /**
     *  Pass true to start the queue immediately, false to let it wait.
     */
    , autoStart: true

    /**
     *  Pass true to push failed jobs to the head of the queue, false to push them to the back.
     */
    , retryImmediately: false
}
