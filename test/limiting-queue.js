var chai = require('chai')
    , sinon = require('sinon')
    , expect = chai.expect
    , LimitingQueue = require('../src-cov/limiting-queue')
    ;
chai.use(require('sinon-chai'));

var WORKERS = 5
    , RETRIES = 5
    , WAIT = 50
    , LARGE_WAIT = 1000
    , SIZE = 10
    , WAIT_FUDGE_FACTOR = 2
    ;

describe('Limiting Queue', function() {
    beforeEach(function() {
        this.queue = new LimitingQueue( {
            maxWorkers: WORKERS
            , maxRetries: RETRIES
            , maxWait: WAIT
            , maxQueueSize: SIZE
            , callback: sinon.spy()
            , failure: sinon.spy()
            , progress: sinon.spy()
        });
    });
    describe('Success', function() {
        it('Should execute the item only once, and never call the failure callback', function(done) {
            var payload = {}
                , _this = this
                , timeout = sinon.spy();
            this.queue.opts.callback = function(item, tries, deferred) {
                expect(item).to.equal(payload);
                expect(tries).to.equal(0);
                deferred.fulfill();
                return timeout;
            };
            this.queue.opts.failure = sinon.spy();
            this.queue.opts.progress = function(queueSize, workers) {
                if (queueSize == 0 && workers == 0) {
                    expect(_this.queue.opts.failure).not.to.have.been.called;
                    expect(timeout).not.to.have.been.called;
                    done();
                }
            };
            this.queue.append(payload);
        });
        it('Default callback should cause unconditional success.', function(done) {
            var payload = {}
                , _this = this
                ;

            delete this.queue.opts.callback;
            this.queue.opts.failure = sinon.spy();
            this.queue.opts.progress = function(queueSize, workers) {
                if (queueSize == 0 && workers == 0) {
                    expect(_this.queue.opts.failure).not.to.have.been.called;
                    done();
                }
            };
            this.queue.append(payload);
        });
    });
    describe('Failure', function() {
        it('Should execute the item a certain number of times, then call the failure', function(done) {
            var payload = {}
                , _this = this
                , tries = 0
                ;
            this.queue.opts.callback = function(item, attempts, deferred) {
                expect(item).to.equal(payload);
                expect(attempts).to.equal(tries++);
                deferred.reject()
            };
            this.queue.opts.failure = sinon.spy();
            this.queue.opts.progress = function(queueSize, workers) {
                if (queueSize == 0 && workers == 0) {
                    expect(_this.queue.opts.failure).to.have.been.called;
                    done();
                }
            };
            this.queue.append(payload);
        });
        it('Should handle uncaught exceptions as Errors.', function(done) {
            var payload = {}
                , _this = this
                , tries = 0
                ;
            this.queue.opts.callback = function(item, attempts, deferred) {
                erroneous = statement * cases + exception
            };
            this.queue.opts.failure = sinon.spy();
            this.queue.opts.progress = function(queueSize, workers) {
                if (queueSize == 0 && workers == 0) {
                    expect(_this.queue.opts.failure).to.have.been.called;
                    done();
                }
            };
            this.queue.append(payload);
        });
        it('Should return the errors generated in order.', function(done) {
            var payload = {}
                , _this = this
                , tries = 0
                , errors = []
                ;
            this.queue.opts.callback = function(item, attempts, deferred) {
                err = new Error("Error " + tries);
                errors.push(err);
                deferred.reject(err);
            };
            this.queue.opts.failure = function(item, attempts, reasons) {
                expect(item).to.equal(payload);
                expect(attempts).to.equal(RETRIES + 1);
                expect(reasons).to.eql(errors);
            };
            this.queue.opts.progress = function(queueSize, workers) {
                if (queueSize == 0 && workers == 0) {
                    done();
                }
            };
            this.queue.append(payload);
        });
        it('Setting the Queue to retry Immediately should push the object to the front of the queue.', function(done) {
            var fail = {
                    succeed: false
                    , cb: sinon.spy()
                }
                , succeed = {
                    succeed: true
                    , cb: sinon.spy()
                }
                , _this = this
                , tries = 0
                , errors = []
                ;
            this.queue.opts.callback = function(item, attempts, deferred) {
                item.cb();
                if (item.succeed) {
                    deferred.fulfill();
                } else {
                    deferred.reject();
                }
            };
            this.queue.opts.retryImmediately = true;
            this.queue.opts.maxWorkers = 1;
            this.queue.opts.progress = function(queueSize, workers) {
                if (queueSize == 0 && workers == 0) {
                    expect(fail.cb).to.have.been.calledBefore(succeed.cb);
                    expect(_this.queue.opts.failure).to.have.been.calledBefore(succeed.cb);
                    expect(fail.cb).to.have.callCount(RETRIES +1);
                    expect(succeed.cb).to.have.been.calledOnce;
                    done();
                }
            };
            this.queue.append(fail);
            this.queue.append(succeed);
        });
        it('Should survive an exception in the failure callback.', function(done) {
            var payload = {}
                , _this = this
                , tries = 0
                , errors = []
                ;
            this.queue.opts.callback = function(item, attempts, deferred) {
                deferred.reject();
            };
            this.queue.opts.failure = function() {
                erroneous = statement * cases + exception
            };
            this.queue.opts.progress = function(queueSize, workers) {
                if (queueSize == 0 && workers == 0) {
                    done();
                }
            };
            this.queue.append(payload);
        });
    });
    describe('Timeout', function() {
        it('Should call the returned function for each failure', function(done) {
            var payload = {}
                , _this = this
                , timeout = sinon.spy()
                ;
            this.queue.opts.callback = function(item, attempts, deferred) {
                return timeout;
            };
            this.queue.opts.progress = function(queueSize, workers) {
                if (queueSize == 0 && workers == 0) {
                    expect(timeout).to.have.callCount(RETRIES +1);
                    done();
                }
            };
            this.queue.append(payload);
        });
        it('Should respect a small timeout value', function(done) {
            var payload = {}
                , _this = this
                ;
            this.queue.opts.callback = function(item, attempts, deferred) {
                expect(item).to.equal(payload);
                var start = new Date().getTime();
                return function() {
                    var end = new Date().getTime();
                    expect(end - start).to.be.at.least(WAIT - WAIT_FUDGE_FACTOR);
                };
            };
            this.queue.opts.failure = sinon.spy();
            this.queue.opts.progress = function(queueSize, workers) {
                if (queueSize == 0 && workers == 0) {
                    expect(_this.queue.opts.failure).to.have.been.called;
                    done();
                }
            };
            this.queue.append(payload);
        });
        this.timeout ((RETRIES + 2) * LARGE_WAIT);
        it('Should respect a large timeout value', function(done) {
            var payload = {}
                , _this = this
                ;
            this.queue.opts.maxWait = LARGE_WAIT;
            this.queue.opts.callback = function(item, attempts, deferred) {
                expect(item).to.equal(payload);
                var start = new Date().getTime();
                return function() {
                    var end = new Date().getTime();
                    expect(end - start).to.be.at.least(LARGE_WAIT - WAIT_FUDGE_FACTOR);
                };
            };
            this.queue.opts.failure = sinon.spy();
            this.queue.opts.progress = function(queueSize, workers) {
                if (queueSize == 0 && workers == 0) {
                    expect(_this.queue.opts.failure).to.have.been.called;
                    done();
                }
            };
            this.queue.append(payload);
        });
    });
    describe('Progress', function() {
        it('Should pass the correct queue size and worker count to the Progress Callback', function(done) {
            var _this = this;
            this.queue.opts.maxWait = 0;
            this.queue.opts.progress = function(queueSize, workers) {
                expect(queueSize).to.equal(_this.queue.size());
                expect(workers).to.equal(_this.queue.workers());
                if (queueSize == 0 && workers == 0) {
                    expect(_this.queue.opts.failure).to.have.been.called;
                    done();
                }
            };
            for (var i = 0; i < WORKERS + SIZE; i++) {
                expect(this.queue.append({})).to.be.true;
            }
        });
    });
    describe('Queue', function() {
        describe('Append', function() {
            it('Should return false when the queue size is exceeded, but not until', function() {
                this.queue.stop();
                for (var i = 0; i < SIZE; i++) {
                    expect(this.queue.append(null)).to.be.true;
                }
                expect(this.queue.append(null)).to.be.false;
            });
            it ('Should push items to the back of the queue', function(done) {
                var first = sinon.spy()
                    , second = sinon.spy()
                    ;
                this.queue.stop();
                this.queue.append(first);
                this.queue.append(second);
                this.queue.opts.callback = function(cb, attempts, deferred) {
                    cb();
                    deferred.fulfill();
                };
                this.queue.opts.progress = function(queueSize, workers) {
                    if (queueSize == 0 && workers == 0) {
                        expect(first).to.have.been.calledBefore(second);
                        done();
                    }
                };
                this.queue.start();
            });
        });
        describe('Push', function() {
            it('Should return false when the queue size is exceeded, but not until', function() {
                this.queue.stop();
                for (var i = 0; i < SIZE; i++) {
                    expect(this.queue.push(null)).to.be.true;
                }
                expect(this.queue.push(null)).to.be.false;
            });
            it ('Should push items to the front of the queue', function(done) {
                var first = sinon.spy()
                    , second = sinon.spy()
                    ;
                this.queue.stop();
                this.queue.push(first);
                this.queue.push(second);
                this.queue.opts.callback = function(cb, attempts, deferred) {
                    cb();
                    deferred.fulfill();
                };
                this.queue.opts.progress = function(queueSize, workers) {
                    if (queueSize == 0 && workers == 0) {
                        expect(second).to.have.been.calledBefore(first);
                        done();
                    }
                };
                this.queue.start();
            });
        });
    });
});
