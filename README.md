[![BuildStatus](https://travis-ci.org/frankiethekneeman/node-limiting-queue.svg?branch=master)][https://travis-ci.org/frankiethekneeman/node-limiting-queue]

[![Code Climate](https://codeclimate.com/github/frankiethekneeman/node-limiting-queue/badges/gpa.svg)](https://codeclimate.com/github/frankiethekneeman/node-limiting-queue)

[![Test Coverage](https://codeclimate.com/github/frankiethekneeman/node-limiting-queue/badges/coverage.svg)](https://codeclimate.com/github/frankiethekneeman/node-limiting-queue)

# A Limitedly parallel queue for NodeJS

## Usage

    var LimitingQueue = require('limiting-queue');

    var queue = new LimitingQueue(options);

### Options

All of these options can be modified after intitalization by setting them ine the `queue.opts` object.

So, for instance:

    queue.opts.maxWorkers = 3;

or, to reset an option back to its default:

    delete opts.maxWorkers;

#### maxWorkers
        
The maximum numbers of simultaneous workers.  An integer greater than 
zero.  Any negative number will be interpreted as "no limit."
Defaults to -1.
        
#### maxRetries

The maximum number of retries for a queue entry.  An integer greater than 
zero.  Any negative number will be interpreted as "no limit."
Defaults to -1.

#### maxWait

The number of milliseconds to wait before declaring a job failed by 
timeout.  An integer greater than zero.  Any negative number will be 
interpreted as "no limit."
Defaults to -1.

#### maxQueueSize

The maximum allowed number of items waiting in the queue.  Integer greater than zero.  Any negative number will
be interpreted as no limit.
Defaults to -1.

#### callback

The function to call to do work on a queue entry.
May optionally return a function to be called in case of a timeout (to do any necessary cleanup).
Defaults to a function which trivially declares the object complete.

Takes three parameters:

##### payload

The information previously passed into the "push" function.

##### previousAttempts 

The number of times this payload has previously been pushed to this function.

##### deferred 
The deferred object to declare success or failure on the queue item.  Call `deferred.fulfill()` to
declare success, and `deferred.reject(error)` to declare a failure.

### failure

The function to call when a queue entry flunks out of the queue entirely.  
Defaults to an empty function.

Takes three parameters:

##### payload 

The information previously passed into the "push" function.

##### totalAttempts 

The total number of attempts made to process this information.

##### errors 

The array of errors that caused this to error out - in order.
        
#### progress

A progress callback to be called every time a new worker starts.

Takes two paramters:

##### queueSize

The number of jobs in the queue. (Not being worked on.)

##### workers 

The number of workers currently working.

#### autoStart

Pass true to start the queue immediately, false to let it wait.
    
#### retryImmediately
    
Pass true to push failed jobs to the head of the queue, false to push them to the back.

## Methods

### queue.push(payload)

Push a new job to the front of the queue.
Returns true if the job is added, false otherwise.

### queue.append(payload)

Append to the back of the queue.
Returns true if the job is added, false otherwise.

### queue.size()

Returns the number of objects waiting in the queue.

### queue.workers()

Returns the number of active workers.

### queue.start()

Start the queue.

### queue.stop()

Stop the queue.  This does not cancel working workers - it just ceases the creation of new workers.

## Contributing

Please maintain the existing style - but do open a pull request if you have a bugfix or a cool feature.
Be sure to document your change.  Pull requests are preferred to bug reports (though if you submit a bug
report, you're welcome to fix your own bug).

Please be sure to update all documentation to reflect your changes - add to the Readme files and the in
code commenting.
