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

module.exports = function LimitingQueue(opts) {
    opts.__proto__ = defaults;
    this.opts = opts;
    var queueHead = null
        , queueTail = null
        , queueSize = 0
        , workers = 0
        , working = this.opts.autoStart
        ;

    /**
     *  Consume queue Items... This internal function fills the available worker space with 
     *  workers (so long as there are queue items still waiting to be processes) and calls
     *  the Progress callback.
     */
    var consume = function(){
        while(working && (this.opts.maxWorkers < 0 || workers < this.opts.maxWorkers)) {
            if (!(function() {
                var toWork = queueHead;
                if (!toWork) {
                    return false;
                }//if not toWork

                queueSize--;
                workers++;
                queueHead = queueHead.next;
                if (!queueHead) {
                    queueTail = null;
                }//if not queueHead

                //This is the deferred that we'll pass into the worker function.
                var deferred = q.defer();
                //This is the timeout for expiration.
                var waitItOut = false;
                try {

                    /**
                     *  If the queue function returns a function, we'll call it on expiration.
                     */
                    var timeoutCallback = this.opts.callback(toWork.payload, toWork.retries, deferred);

                    /**
                     *  If there's a maximum execution time, set a callback.
                     */
                    if (this.opts.maxWait >= 0) {
                        waitItOut = setTimeout(function() {
                            if (typeof timeoutCallback == 'function') {
                                timeoutCallback();
                            }//if Callback
                            deferred.reject(new Error('Maximum Time'));
                        }, this.opts.maxWait);
                    }//if time limit.
                } catch (err) {//Try
                    deferred.reject(err);
                }//Catch Err
                deferred.promise.then(function(result) {

                    /**
                     *  ON success, note worker completion, clear any existing timeout,
                     *  and cycle back around on the queue.
                     */
                    workers--;
                    if (waitItOut !== false)
                        clearTimeout(waitItOut);
                    consume();
                }.bind(this), function(error) {

                    /**
                     *  On failure, note worker completion.  Add the error to the error
                     *  array.  If there are still retries left, replace it at the back of the
                     *  queue, If there are not - replace the item in the queue. Then loop back.
                     */
                    workers--;
                    try {
                        //Null this bitch out to avoid any infinite loops in the queue.
                        toWork.next = null;
                        toWork.errors.push(error);
                        if (this.opts.maxRetries < 0 || toWork.retries < this.opts.maxRetries) {
                            toWork.retries++;
                            if (this.opts.retryImmediately) {
                                privatePush(toWork);
                            } else {//If retry Immediately
                                privateAppend(toWork);
                            }//else
                        } else {//If should retry
                            this.opts.failure(toWork.payload, toWork.retries + 1, toWork.errors);
                        }//If total failure
                        if (waitItOut !== false) {
                            clearTimeout(waitItOut);
                        }//If there's a timeout.
                        consume();
                    } catch (e) {//Try
                        console.log(e.stack);
                    } //Catch Error
                }.bind(this));
                return true;
            }.bind(this))()) {
                break;
            }//if there are no more workers
        }//while there is still worker space

        this.opts.progress(queueSize, workers);

        //If there are no workers, but still items in the queue (and we're supposed to be working)
        //Recurse back.
        if (working && workers == 0 && queueSize > 0) {
            consume();
        }//If should retry
    }.bind(this)//consume()

    /**
     *  Push to the front of the queue.  Private function.
     *  
     *  @param newWork a queue item to be added to the queue
     */
    var privatePush = function(newWork) {
        //If there is a head.
        if (queueHead) {
            newWork.next = queueHead;
            queueHead = newWork;
        } else { //If there's a head
            //If there's no head, there's no tail.
            queueTail = queueHead = newWork;
        }//else, no head
        queueSize++;
    }.bind(this)//privatePush(newWork)

    /**
     *  Append to the back of the queue.  Private function.
     *  
     *  @param newWork a queue item to be added to the queue
     */
    var privateAppend = function(newWork) {
        //If there is a tail.
        if (queueTail) {
            queueTail = queueTail.next = newWork;
        } else {//If there's a tail
            //If there's no tail, there's no head.
            queueTail = queueHead = newWork;
        }//If there's no tail
        queueSize++;
    }.bind(this)//privatePush(newWork)

    /**
     *  Generalized private function to abstract queue node generation
     *  and adding.
     *  
     *  @param payload the payload to be (eventually) delivered back to the
     *    workers.
     *  @param addAction a callback which takes a queue node and adds it to the queue.
     *  
     *  @return true if the payload is added, false otherwise.
     */
    var addPayload = function(payload, addAction) {
        var newWork = {
            payload: payload
            , retries: 0
            , next: null
            , errors: []
        };//newWork Object

        var toReturn = false;
        if (queueSize < this.opts.maxQueueSize || this.opts.maxQueueSize < 0) {
            addAction(newWork);
            toReturn = true;
        }//If there's room in the queue.
        //Make sure to call consume in case there are no workers running.
        consume();
        return toReturn;
    }.bind(this)//addPayload(payload, addAction)

    /**
     *  Push to the front of the queue.
     *  
     *  @param payload The data to eventually be delivered back.
     *  
     *  @return true if the payload is added, false otherwise.
     */
    this.push = function(payload) {
        return addPayload(payload, privatePush);
    }.bind(this)//push(payload)

    /**
     *  Append to the back of the queue.
     *  
     *  @param payload The data to eventually be delivered back.
     *  
     *  @return true if the payload is added, false otherwise.
     */
    this.append = function(payload) {
        return addPayload(payload, privateAppend);
    }.bind(this)//append(payload)

    /**
     *  Check the size of the queue.
     *  
     *  @return the number of objects waiting in the queue.
     */
    this.size = function() {
        return queueSize;
    }.bind(this)//size()

    /**
     *  Check how many workers are currently doing work.
     *  
     *  @return the number of active workers.
     */
    this.workers = function() {
        return workers;
    }.bind(this)//workers()

    /**
     *  Start the queue.
     */
    this.start = function() {
        working = true;
        consume();
    }.bind(this)//start()

    /**
     *  Stop the queue.  This does not cancel working workers - it just ceases the creation of new workers.
     */
    this.stop = function() {
        working = false;
    }.bind(this)//stop()
}
