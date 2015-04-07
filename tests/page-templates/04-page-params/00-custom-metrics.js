/*eslint-env mocha*/
/*global BOOMR_test,assert*/

describe("e2e/04-page-params/00-custom-metrics", function() {
    var tf = BOOMR.plugins.TestFramework;
    var t = BOOMR_test;

    it("Should pass basic beacon validation", function(done) {
        t.validateBeaconWasSent(done);
    });

    it("Should have the custom metric 1 - JavaScript var", function() {
        var b = tf.lastBeacon();
        assert.equal(b.cmet1, 111);
    });

    it("Should have the custom metric 2 - JavaScript function", function() {
        var b = tf.lastBeacon();
        assert.equal(b.cmet2, 222);
    });

    it("Should be missing custom metric 3 - undefined JavaScript var", function() {
        var b = tf.lastBeacon();
        assert.equal(b.cmet3, undefined);
    });

    it("Should have the custom metric 4 - XPath", function() {
        var b = tf.lastBeacon();
        assert.equal(b.cmet4, 444.44);
    });

    it("Should have the custom metric 5 - URL", function() {
        var b = tf.lastBeacon();
        assert.equal(b.cmet5, 1);
    });
});