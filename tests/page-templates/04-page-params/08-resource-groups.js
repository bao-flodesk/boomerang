/*eslint-env mocha*/
/*global BOOMR,BOOMR_test,assert*/

describe("e2e/04-page-params/08-resource-groups", function() {
	var tf = BOOMR.plugins.TestFramework;
	var t = BOOMR_test;

	it("Should pass basic beacon validation", function(done) {
		t.validateBeaconWasSent(done);
	});

	it("Should have the custom timer 1 - RG with XPath", function() {
		if (t.isResourceTimingSupported()) {
			var b = tf.lastBeacon();
			var timers = t.parseTimers(b.t_other);
			assert.isDefined(timers["ctim.CT1"], "ctim.CT1 - Exists on the beacon");
			assert.closeTo(parseInt(timers["ctim.CT1"]), t.findFirstResource("id=abc").duration, 2);
		}
		else {
			// TODO: we should check the value since it may exist even if RT is not supported
			return this.skip();
		}
	});

	it("Should have the custom timer 2 - RG with QuerySelector", function() {
		if (t.isResourceTimingSupported()) {
			var b = tf.lastBeacon();
			var timers = t.parseTimers(b.t_other);
			assert.isDefined(timers["ctim.CT2"], "ctim.CT2 - Exists on the beacon");
			assert.closeTo(parseInt(timers["ctim.CT2"]), t.findFirstResource("id=abc").duration, 2);
		}
		else {
			// TODO: we should check the value since it may exist even if RT is not supported
			return this.skip();
		}
	});

	it("Should have the custom timer 3 - RG with Resource URL", function() {
		if (t.isResourceTimingSupported()) {
			var b = tf.lastBeacon();
			var timers = t.parseTimers(b.t_other);
			assert.isDefined(timers["ctim.CT3"], "ctim.CT3 - Exists on the beacon");
			assert.closeTo(parseInt(timers["ctim.CT3"]), t.findFirstResource("id=abc").duration, 2);
		}
		else {
			// TODO: we should check the value since it may exist even if RT is not supported
			return this.skip();
		}
	});

	it("Should have the custom timer 4 - RG Container with XPathh", function() {
		if (t.isResourceTimingSupported()) {
			var b = tf.lastBeacon();
			var timers = t.parseTimers(b.t_other);
			assert.isDefined(timers["ctim.CT4"], "ctim.CT4 - Exists on the beacon");
			assert.closeTo(parseInt(timers["ctim.CT4"]), t.findFirstResource("id=abc").duration, 2);
		}
		else {
			// TODO: we should check the value since it may exist even if RT is not supported
			return this.skip();
		}
	});

	it("Should have the custom timer 5 - RG Container with QuerySelector", function() {
		if (t.isResourceTimingSupported()) {
			var b = tf.lastBeacon();
			var timers = t.parseTimers(b.t_other);
			assert.isDefined(timers["ctim.CT5"], "ctim.CT5 - Exists on the beacon");
			assert.closeTo(parseInt(timers["ctim.CT5"]), t.findFirstResource("id=abc").duration, 2);
		}
		else {
			// TODO: we should check the value since it may exist even if RT is not supported
			return this.skip();
		}
	});

	it("Should have the custom timer 6 - RG Container ith XPath", function() {
		if (t.isResourceTimingSupported()) {
			var b = tf.lastBeacon();
			var timers = t.parseTimers(b.t_other);
			assert.isUndefined(timers["ctim.CT6"], "ctim.CT6 - Is not on the beacon");
		}
		else {
			return this.skip();
		}
	});

	it("Should have the custom timer 7 - RG is not on the beacon missing queryselector element", function() {
		if (t.isResourceTimingSupported()) {
			var b = tf.lastBeacon();
			var timers = t.parseTimers(b.t_other);
			assert.isUndefined(timers["ctim.CT7"], "ctim.CT7 - Is not on the beacon");
		}
		else {
			return this.skip();
		}
	});

	it("Should have the custom timer 8 - RG is not on the beacon missing resource URL", function() {
		if (t.isResourceTimingSupported()) {
			var b = tf.lastBeacon();
			var timers = t.parseTimers(b.t_other);
			assert.isUndefined(timers["ctim.CT8"], "ctim.CT8 - Is not on the beacon");
		}
		else {
			return this.skip();
		}
	});

	it("Should have the custom timer 9 - RG is not on the beacon missing URLPattern", function() {
		if (t.isResourceTimingSupported()) {
			var b = tf.lastBeacon();
			var timers = t.parseTimers(b.t_other);
			assert.isUndefined(timers["ctim.CT9"], "ctim.CT9 - Is not on the beacon");
		}
		else {
			return this.skip();
		}
	});

	it("Should have the custom timer 10 - RG container with multiple resources based on XPath ", function() {
		if (t.isResourceTimingSupported()) {
			var b = tf.lastBeacon();
			var timers = t.parseTimers(b.t_other);
			assert.isDefined(timers["ctim.CT10"], "ctim.CT10 - Exists on the beacon");
			assert.closeTo(
				parseInt(timers["ctim.CT10"]),
				Math.max(
					t.findFirstResource("id=abc").duration,
					t.findFirstResource("id=def").duration
				),
				2);
		}
		else {
			// TODO: we should check the value since it may exist even if RT is not supported
			return this.skip();
		}
	});

	it("Should have the custom timer 11 - RG container with multiple resources based on QuerySelector ", function() {
		if (t.isResourceTimingSupported()) {
			var b = tf.lastBeacon();
			var timers = t.parseTimers(b.t_other);
			assert.isDefined(timers["ctim.CT11"], "ctim.CT11 - Exists on the beacon");
			assert.closeTo(
				parseInt(timers["ctim.CT11"]),
				Math.max(
					t.findFirstResource("id=abc").duration,
					t.findFirstResource("id=def").duration
				),
				2);
		}
		else {
			// TODO: we should check the value since it may exist even if RT is not supported
			return this.skip();
		}
	});

	it("Should have the custom timer 12 - RG container with multiple resources based on Resource URL", function() {
		if (t.isResourceTimingSupported()) {
			var b = tf.lastBeacon();
			var timers = t.parseTimers(b.t_other);
			assert.isDefined(timers["ctim.CT12"], "ctim.CT12 - Exists on the beacon");

			assert.closeTo(
				parseInt(timers["ctim.CT12"]),
				Math.round(Math.max(
					t.findFirstResource("id=abc").duration,
					t.findFirstResource("id=def").duration,
					t.findFirstResource("id=zzz").duration,
					t.findFirstResource("id=yyy").duration
				)),
				10);
		}
		else {
			// TODO: we should check the value since it may exist even if RT is not supported
			return this.skip();
		}
	});

	it("Should have the custom timer 13 - RG URL matching the first URL", function() {
		if (t.isResourceTimingSupported()) {
			var b = tf.lastBeacon();
			var timers = t.parseTimers(b.t_other);
			assert.isDefined(timers["ctim.CT13"], "ctim.CT13 - Exists on the beacon");
			assert.closeTo(parseInt(timers["ctim.CT13"]), t.findFirstResource("id=abc").duration, 2);
		}
		else {
			// TODO: we should check the value since it may exist even if RT is not supported
			return this.skip();
		}
	});

	it("Should have the custom timer 14 - RG matching 2 containers on page", function() {
		if (t.isResourceTimingSupported()) {
			var b = tf.lastBeacon();
			var timers = t.parseTimers(b.t_other);
			assert.isDefined(timers["ctim.CT14"], "ctim.CT14 - Exists on the beacon");
			assert.closeTo(
				parseInt(timers["ctim.CT14"]),
				Math.max(
					t.findFirstResource("id=zzz").duration,
					t.findFirstResource("id=yyy").duration
				),
				2);
		}
		else {
			// TODO: we should check the value since it may exist even if RT is not supported
			return this.skip();
		}
	});

	it("Should have the custom timer 15 - RG with Resource URL loaded late", function() {
		if (t.isResourceTimingSupported()) {
			var b = tf.lastBeacon();
			var timers = t.parseTimers(b.t_other);
			assert.isDefined(timers["ctim.CT15"], "ctim.CT15 - Exists on the beacon");
			assert.closeTo(
				parseInt(timers["ctim.CT15"]),
				t.findFirstResource("assets/img.jpg").duration,
				2);
		}
		else {
			return this.skip();
		}
	});

	it("Should have the custom timer 16 - RG with slowest resource", function() {
		if (t.isResourceTimingSupported()) {
			var b = tf.lastBeacon();
			var timers = t.parseTimers(b.t_other);
			assert.isDefined(timers["ctim.CT16"], "ctim.CT16 - Exists on the beacon");
			assert.closeTo(
				parseInt(timers["ctim.CT16"]),
				t.findFirstResource("delay=3000").duration,
				2);
		}
		else {
			return this.skip();
		}
	});
});
