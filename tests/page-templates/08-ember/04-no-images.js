/*eslint-env mocha*/
/*global BOOMR_test,assert*/

describe("e2e/08-ember/04-no-images", function() {
	var tf = BOOMR.plugins.TestFramework;
	var t = BOOMR_test;

	it("Should pass basic beacon validation", function(done) {
		t.validateBeaconWasSent(done);
	});

	it("Should have only sent one beacon", function() {
		// only one beacon should've been sent
		assert.equal(tf.beacons.length, 1);
	});

	it("Should take as long as the widget.json take to load (if NavigationTiming is supported)", function() {
		if (typeof BOOMR.plugins.RT.navigationStart() !== "undefined") {
			t.validateBeaconWasSentAfter(0, "widget.json", 1500, 0, 30000, true);
		}
	});

	it("Shouldn't have a load time (if NavigationTiming is not supported)", function() {
		if (typeof BOOMR.plugins.RT.navigationStart() === "undefined") {
			var b = tf.lastBeacon();
			assert.equal(b.t_done, undefined);
			assert.equal(b["rt.start"], "manual");
		}
	});
});
