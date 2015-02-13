var q = require('q')
    , utils = require('./utils')
    ;

module.exports = function LimitingQueue(opts) {
    this.opts = new utils.Options(opts);
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
                            if (typeof timeoutCallback === 'function') {
                                timeoutCallback();
                            }//if Callback
                            deferred.reject(new Error('Maximum Time'));
                        }, this.opts.maxWait);
                    }//if time limit.
                } catch (err) {//Try
                    deferred.reject(err);
                }//Catch Err
                deferred.promise.then(function() {

                    /**
                     *  ON success, note worker completion, clear any existing timeout,
                     *  and cycle back around on the queue.
                     */
                    workers--;
                    if (waitItOut !== false) {
                        clearTimeout(waitItOut);
                    }
                    consume();
                }.bind(this), function(error) {

                    /**
                     *  On failure, note worker completion.  Add the error to the error
                     *  array.  If there are still retries left, replace it at the back of the
                     *  queue, If there are not - replace the item in the queue. Then loop back.
                     */
                    workers--;
                    try {
                        if (waitItOut !== false) {
                            clearTimeout(waitItOut);
                        }//If there's a timeout.
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
                    } catch (e) {//Try
                        //There's just nothing to be done here.
                    } //Catch Error
                    consume();
                }.bind(this));
                return true;
            }.bind(this))()) {
                break;
            }//if there are no more workers
        }//while there is still worker space

        this.opts.progress(queueSize, workers);

        //If there are no workers, but still items in the queue (and we're supposed to be working)
        //Recurse back.
        if (working && workers === 0 && queueSize > 0) {
            consume();
        }//If should retry
    }.bind(this);//consume()

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
    }.bind(this);//privatePush(newWork)

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
    }.bind(this);//privatePush(newWork)

    /**
     *  Adds an item into the queue after all the items with higher or equal
     *  priority, but before any items with lower priority.
     *  
     *  @param newWork a queue item to be added to the queue
     */
    var privatePrioritize = function(newWork) {
        //If there is a head.
        if (queueHead) {
            var curr = queueHead
                , prev = null;
            while(curr != null && curr.priority >= newWork.priority) {
                prev = curr;
                curr = curr.next;
            }
            if (prev != null) {
                //Inserting after the first
                prev.next = newWork;
            } else {
                //Inserting at the beginning
                queueHead = newWork;
            }
            newWork.next = curr; //No matter where you're inserting, 
            if (curr == null) {
                //newWork is now the tail, since we're clearly inserting at the end.
                queueTail = newWork;
            }
        } else { //If there's a head
            //If there's no head, there's no tail.
            queueTail = queueHead = newWork;
        }//else, no head
        queueSize++;
    }.bind(this);//privatePush(newWork)

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
    var addPayload = function(payload, addAction, priority) {
        priority = priority || 0;
        var newWork = {
            payload: payload
            , retries: 0
            , next: null
            , errors: []
            , priority: priority
        };//newWork Object

        var toReturn = false;
        if (queueSize < this.opts.maxQueueSize || this.opts.maxQueueSize < 0) {
            addAction(newWork);
            toReturn = true;
        }//If there's room in the queue.
        //Make sure to call consume in case there are no workers running.
        consume();
        return toReturn;
    }.bind(this);//addPayload(payload, addAction)

    /**
     *  Push to the front of the queue.
     *  
     *  @param payload The data to eventually be delivered back.
     *  
     *  @return true if the payload is added, false otherwise.
     */
    this.push = function(payload) {
        return addPayload(payload, privatePush);
    }.bind(this);//push(payload)

    /**
     *  Append to the back of the queue.
     *  
     *  @param payload The data to eventually be delivered back.
     *  
     *  @return true if the payload is added, false otherwise.
     */
    this.append = function(payload) {
        return addPayload(payload, privateAppend);
    }.bind(this);//append(payload)

    /**
     *  Adds an item into the queue after all the items with higher or equal
     *  priority, but before any items with lower priority.  Default priority is 0.
     *  
     *  @param payload The data to eventually be delivered back.
     *  @param priority the numeric priority assigned to this payload.
     *  
     *  @return true if the payload is added, false otherwise.
     */
    this.prioritize = function(payload, priority) {
        return addPayload(payload, privatePrioritize, priority);
    }.bind(this);//append(payload)

    /**
     *  Check the size of the queue.
     *  
     *  @return the number of objects waiting in the queue.
     */
    this.size = function() {
        return queueSize;
    }.bind(this);//size()

    /**
     *  Check how many workers are currently doing work.
     *  
     *  @return the number of active workers.
     */
    this.workers = function() {
        return workers;
    }.bind(this);//workers()

    /**
     *  Start the queue.
     */
    this.start = function() {
        working = true;
        consume();
    }.bind(this);//start()

    /**
     *  Stop the queue.  This does not cancel working workers - it just ceases the creation of new workers.
     */
    this.stop = function() {
        working = false;
    }.bind(this);//stop()

    /**
     *  Execute a function on each member currently in the queue without removing it from the queue.
     *  This function is sequential in nature.
     *  
     *  @param callback The funciton to be called on each member of the queue.
     */
    this.forEach = function(callback) {
        var current = queueHead;
        while (current) {
            try {
                callback(current.payload);
            } catch (e) {//Try
                //There's just nothing to be done here.
            } //Catch Error
            current = current.next;
        }
    }.bind(this);//forEach(callback)
}
