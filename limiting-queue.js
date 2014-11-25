var q = require('q')
    ;

/**
 *  Here is where I will document the default values for the various arguments to be passed into this constructor.
 */
var defaults = {
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
     *  The function to call to do work on a queue entry.
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
}

module.exports = function LimitingQueue(opts) {
    opts.prototype = defaults;
    var queueHead = null
        , queueTail = null
        , queueSize = 0
        , workers = 0
        ;
    function consume(){
        var startWorkers = workers;
        for (; opts.maxWorkers == -1 || workers < opts.maxWorkers;) {
            if (!(function() {
                var toWork = queueHead;
                if (!toWork) {
                    return false;
                }
                queueSize--;
                workers++;
                queueHead = queueHead.next;
                if (!queueHead) {
                    queueTail = null;
                }
                //This is the deferred that we'll pass into the worker function.
                var deferred = q.defer();
                //This is the timeout for expiration.
                var waitItOut = false;
                try {
                    /**
                     *  If the queue function returns a function, we'll call it on expiration.
                     */
                    var timeoutCallback = opts.callback(toWork.payload, toWork.retries, deferred);
                    /**
                     *  If there's a maximum execution time, set a callback.
                     */
                    if (opts.maxWait != -1) {
                        waitItOut = setTimeout(function() {
                            if (typeof timeoutCallback == 'function') {
                                timeoutCallback();
                            }
                            deferred.reject(new Error('Maximum Time'));
                        }, opts.maxWait);
                    }
                } catch (err) {
                    deferred.reject(err);
                }
                deferred.promise.then(function(content) { //Success!
                    workers--;
                    consume();
                    clearTimeout(waitItOut);
                }, function(error) {
                    toWork.errors.push(error);
                    failures++;
                    if (toWork.retries <= opts.maxRetries) {
                        toWork.retries++;
                        this.push(toWork);
                    } else {
                        opts.failure(toWork.payload, toWork.retries, toWork.errors);
                    }
                    workers--;
                    consume();
                    if (waitItOut !== false) {
                        clearTimeout(waitItOut);
                    }
                });
                //Prep the timeout for time limiting.
                return true;
            })()) {
                break;
            }
        }
        if (startWorkers != workers) {
            opt.progress(queueSize, workers);
        }
    }
    this.push = function(payload) {
        var newWork = {
            payload: payload
            , retries: 0
            , next: null
            , errors: []
        }

        //If there is a tail.
        if (queueTail) {
            queueTail = queueTail.next = newWork;
        } else {
            //If there's no tail, there's no head.
            queueTail = queueHead = newWork;
        }
        queueSize++;
        //Make sure to call consume in case there are no workers running.
        consume();
    }
    this.inQueue = function() {
        return queueSize;
    }
    this.workers = function() {
        return workers;
    }
}
