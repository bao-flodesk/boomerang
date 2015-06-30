/*eslint-env mocha*/
/*global BOOMR_test,assert*/
BOOMR_test.templates.SPA = BOOMR_test.templates.SPA || {};
BOOMR_test.templates.SPA["02-custom-timers"] = function() {
	var tf = BOOMR.plugins.TestFramework;
	var t = BOOMR_test;

	it("Should pass basic beacon validation", function(done) {
		t.validateBeaconWasSent(done);
	});

	it("Should have only sent one beacon", function() {
		// only one beacon should've been sent
		assert.equal(tf.beacons.length, 1);
	});

	it("Should be missing the custom timer 0 - NavigationTiming - because it's handled on the server", function() {
		var b = tf.lastBeacon();
		assert.isUndefined(t.parseTimers(b.t_other).custom0);
	});

	it("Should have the custom timer 1 - JavaScript variable - having been updated by the Angular App", function() {
		var b = tf.lastBeacon();
		assert.equal(t.parseTimers(b.t_other).custom1, 11);
	});

	it("Should have the custom timer 2 - JavaScript function - having been updated by the Angular App", function() {
		var b = tf.lastBeacon();
		assert.equal(t.parseTimers(b.t_other).custom2, 22);
	});

	it("Should have the custom timer 3 - UserTiming (if UserTiming is supported)", function() {
		if (t.isUserTimingSupported()) {
			var b = tf.lastBeacon();
			assert.isTrue(t.parseTimers(b.t_other).custom3 > 0);
		}
	});

	it("Should be missing the custom timer 3 - UserTiming (if UserTiming is not supported)", function() {
		if (!t.isUserTimingSupported()) {
			var b = tf.lastBeacon();
			assert.isUndefined(t.parseTimers(b.t_other).custom3);
		}
	});

	it("Should be missing custom timer 4 - JavaScript var", function() {
		var b = tf.lastBeacon();
		assert.isUndefined(t.parseTimers(b.t_other).custom4);
	});

	it("Should be missing custom timer 5 - UserTiming", function() {
		var b = tf.lastBeacon();
		assert.isUndefined(t.parseTimers(b.t_other).custom5);
	});
};