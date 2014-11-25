# A Limitedly parallel queue for NodeJS

## Usage

    var LimitingQueue = require('limiting-queue');

    var queue = new LimitingQueue({
        /**
         *  The maximum numbers of simultaneous workers.  An integer greater than zero.  Any negative number will
         *  be interpreted as "no limit."
         *  
         *  Defaults to -1.
         */
        maxWorkers: -1
        /**
         *  The maximum number of retries for a queue entry.  An integer greater than zero.  Any negative number will be 
         *  interpreted as "no limit."
         *  
         *  Defaults to -1.
         */
        , maxRetries: -1
        /**
         *  The number of milliseconds to wait before declaring a job failed by timeout.  
         *  An integer greater than zero.  Any negative number will be 
         *  interpreted as "no limit."
         *  
         *  Defaults to -1.
         */
        , maxWait: -1
        /**
         *  The function to call to do work on a queue entry.
         *  
         *  Defaults to an empty function.
         *  
         *  @param payload The information previously passed into the "push" function.
         *  @param previousAttempts the number of times this payload has previously been pushed to this function.
         *  @param deferred The deferred object to declare success or failure on the queue item.
         *  
         *  @return (Optional) a function to be called in case of a timeout (to do any necessary cleanup).
         */
        , callback: function(payload, previousAttempts, deferred){}
        /**
         *  The function to call when a queue entry flunks out of the queue entirely.
         *  
         *  Defaults to an empty function.
         *  
         *  @param payload The information previously passed into the "push" function.
         *  @param totalAttempts the total number of attempts made to process this information.
         *  @param errors The list of errors that caused this to error out.
         */
        , failure: function(payload, totalAttempts, errors){}
        /**
         *  A progress callback to be called every time a new worker starts.
         *  
         *  Defaults to an empty function.
         *  
         *  @param queueSize The number of jobs in the queue.
         *  @param workers The number of workers currently working.
         */
        , progress: function(queueSize, workers){}
    });
 

## Contributing

Please maintain the existing style - but do open a pull request if you have a bugfix or a cool feature.
Be sure to document your change.  Pull requests are preferred to bug reports (though if you submit a bug
report, you're welcome to fix your own bug).
