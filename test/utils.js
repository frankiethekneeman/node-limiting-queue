var chai = require('chai')
    , sinon = require('sinon')
    , expect = chai.expect
    , utils = require('../src/utils')
    ;
chai.use(require('sinon-chai'));

describe('Object Copy', function() {
    beforeEach(function() {
        this.testObject = {
            some: "object"
            , "with": "keys"
            , "and": 0
            , "or more": function() { return "data types" }
            , "deep": {
                "a deep": "object"
                , "deeper": {
                    "we have to go": "deeper"
                    , "inception": "BUM BUM"
                }
            }
        }
    });
    it ('Should not return the same object', function(){
        expect(this.testObject).to.not.equal(utils.objectCopy(this.testObject));
    });
    it ('Should return a deeply equal Object', function(){
        expect(this.testObject).to.eql(utils.objectCopy(this.testObject));
    });
    it ('Should not deeply copy by default', function(){
        expect(this.testObject.deep).to.equal(utils.objectCopy(this.testObject).deep);
    });
    it ('Should deeply copy when asked', function(){
        var to = this.testObject
            , cp = utils.objectCopy(this.testObject, true);
        expect(to.deep).to.not.equal(cp.deep);
        expect(to.deep).to.eql(cp.deep);
    });
    it ('Should deep copy all the way down', function(){
        var to = this.testObject
            , cp = utils.objectCopy(this.testObject, true);
        expect(to.deep.deeper).to.not.equal(cp.deep.deeper);
        expect(to.deep.deeper).to.eql(cp.deep.deeper);
    });
});
