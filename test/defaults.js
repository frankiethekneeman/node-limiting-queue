var chai = require('chai')
    , sinon = require('sinon')
    , expect = chai.expect
    , defaults = require('../src-cov/defaults')
    , LimitingQueue = require('../src-cov/limiting-queue')
    ;
chai.use(require('sinon-chai'));

var toSet = {
        maxWorkers: 5
        , maxRetries: 5
        , maxWait: 50
        , maxQueueSize: 10
        , callback: sinon.spy()
        , failure: sinon.spy()
        , progress: sinon.spy()
        , autoStart: false
        , retryImmediately: true
    }
    ;

describe('Defaults', function() {
    beforeEach(function() {
        this.queue = new LimitingQueue(toSet);
    });
    Object.keys(toSet).forEach(function(key, index, keys) {
        it(key + ' Should revert to the default value when deleted (' + defaults[key] + ')', function() {
            delete this.queue.opts[key];
            expect(this.queue.opts[key]).to.eql(defaults[key]);
        });
        it(key + ' Should take the constructor Value (' + toSet[key] + ')', function() {
            expect(this.queue.opts[key]).to.not.eql(defaults[key]);
            expect(this.queue.opts[key]).to.eql(toSet[key]);
        });
        it(key + ' Should revert to the default value when deleted (' + defaults[key] + ')', function() {
            delete this.queue.opts[key];
            expect(this.queue.opts[key]).to.eql(defaults[key]);
        });
    });
});
