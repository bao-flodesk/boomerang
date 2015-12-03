/**
\file restiming.js
Plugin to collect metrics from the W3C Resource Timing API.
For more information about Resource Timing,
see: http://www.w3.org/TR/resource-timing/
*/

(function() {

	var impl;

	BOOMR = BOOMR || {};
	BOOMR.plugins = BOOMR.plugins || {};
	if (BOOMR.plugins.ResourceTiming) {
		return;
	}

	//
	// Constants
	//
	var INITIATOR_TYPES = {
		"other": 0,
		"img": 1,
		"link": 2,
		"script": 3,
		"css": 4,
		"xmlhttprequest": 5,
		"html": 6
	};

	// Words that will be broken (by ensuring the optimized trie doesn't contain
	// the whole string) in URLs, to ensure NoScript doesn't think this is an XSS attack
	var DEFAULT_XSS_BREAK_WORDS = [
		/(h)(ref)/gi,
		/(s)(rc)/gi,
		/(a)(ction)/gi
	];

	// Delimiter to use to break a XSS word
	var XSS_BREAK_DELIM = "\n";

	// Maximum number of characters in a URL
	var DEFAULT_URL_LIMIT = 1000;

	/**
	 * Converts entries to a Trie:
	 * http://en.wikipedia.org/wiki/Trie
	 *
	 * Assumptions:
	 * 1) All entries have unique keys
	 * 2) Keys cannot have "|" in their name.
	 * 3) All key's values are strings
	 *
	 * Leaf nodes in the tree are the key's values.
	 *
	 * If key A is a prefix to key B, key A will be suffixed with "|"
	 *
	 * @param [object] entries Performance entries
	 * @return A trie
	 */
	function convertToTrie(entries) {
		var trie = {}, url, urlFixed, i, value, letters, letter, cur, node;

		for (url in entries) {
			urlFixed = url;

			// find any strings to break
			for (i = 0; i < impl.xssBreakWords.length; i++) {
				// Add a XSS_BREAK_DELIM character after the first letter.  optimizeTrie will
				// ensure this sequence doesn't get combined.
				urlFixed = urlFixed.replace(impl.xssBreakWords[i], "$1" + XSS_BREAK_DELIM + "$2");
			}

			if (!entries.hasOwnProperty(url)) {
				continue;
			}

			value = entries[url];
			letters = urlFixed.split("");
			cur = trie;

			for (i = 0; i < letters.length; i++) {
				letter = letters[i];
				node = cur[letter];

				if (typeof node === "undefined") {
					// nothing exists yet, create either a leaf if this is the end of the word,
					// or a branch if there are letters to go
					cur = cur[letter] = (i === (letters.length - 1) ? value : {});
				}
				else if (typeof node === "string") {
					// this is a leaf, but we need to go further, so convert it into a branch
					cur = cur[letter] = { "|": node };
				}
				else {
					if (i === (letters.length - 1)) {
						// this is the end of our key, and we've hit an existing node.  Add our timings.
						cur[letter]["|"] = value;
					}
					else {
						// continue onwards
						cur = cur[letter];
					}
				}
			}
		}

		return trie;
	}

	/**
	 * Optimize the Trie by combining branches with no leaf
	 *
	 * @param [object] cur Current Trie branch
	 * @param [boolean] top Whether or not this is the root node
	 */
	function optimizeTrie(cur, top) {
		var num = 0, node, ret, topNode;

		// capture trie keys first as we'll be modifying it
		var keys = [];

		for (node in cur) {
			if (cur.hasOwnProperty(node)) {
				keys.push(node);
			}
		}

		for (var i = 0; i < keys.length; i++) {
			node = keys[i];
			if (typeof cur[node] === "object") {
				// optimize children
				ret = optimizeTrie(cur[node], false);
				if (ret) {
					// swap the current leaf with compressed one
					delete cur[node];

					if (node === XSS_BREAK_DELIM) {
						// If this node is a newline, which can't be in a regular URL,
						// it's due to the XSS patch.  Remove the placeholder character,
						// and make sure this node isn't compressed by incrementing
						// num to be greater than one.
						node = ret.name;
						num++;
					}
					else {
						node = node + ret.name;
					}
					cur[node] = ret.value;
				}
			}
			num++;
		}

		if (num === 1) {
			// compress single leafs
			if (top) {
				// top node gets special treatment so we're not left with a {node:,value:} at top
				topNode = {};
				topNode[node] = cur[node];
				return topNode;
			}
			else {
				// other nodes we return name and value separately
				return { name: node, value: cur[node] };
			}
		}
		else if (top) {
			// top node with more than 1 child, return it as-is
			return cur;
		}
		else {
			// more than two nodes and not the top, we can't compress any more
			return false;
		}
	}

	/**
	 * Trims the timing, returning an offset from the startTime in ms
	 *
	 * @param [number] time Time
	 * @param [number] startTime Start time
	 * @return [number] Number of ms from start time
	 */
	function trimTiming(time, startTime) {
		if (typeof time !== "number") {
			time = 0;
		}

		if (typeof startTime !== "number") {
			startTime = 0;
		}

		// strip from microseconds to milliseconds only
		var timeMs = Math.round(time ? time : 0),
		    startTimeMs = Math.round(startTime ? startTime : 0);

		return timeMs === 0 ? 0 : (timeMs - startTimeMs);
	}

	/**
	 * Attempts to get the navigationStart time for a frame.
	 * @returns navigationStart time, or 0 if not accessible
	 */
	function getNavStartTime(frame) {
		var navStart = 0;

		try {
			if (("performance" in frame) &&
			frame.performance &&
			frame.performance.timing &&
			frame.performance.timing.navigationStart) {
				navStart = frame.performance.timing.navigationStart;
			}
		}
		catch (e) {
			// empty
		}

		return navStart;
	}

	/**
	 * Gets all of the performance entries for a frame and its subframes
	 *
	 * @param [Frame] frame Frame
	 * @param [boolean] top This is the top window
	 * @param [string] offset Offset in timing from root IFRAME
	 * @param [number] depth Recursion depth
	 * @return [PerformanceEntry[]] Performance entries
	 */
	function findPerformanceEntriesForFrame(frame, isTopWindow, offset, depth) {
		var entries = [], i, navEntries, navStart, frameNavStart, frameOffset, navEntry, t;

		if (typeof isTopWindow === "undefined") {
			isTopWindow = true;
		}

		if (typeof offset === "undefined") {
			offset = 0;
		}

		if (typeof depth === "undefined") {
			depth = 0;
		}

		if (depth > 10) {
			return entries;
		}

		navStart = getNavStartTime(frame);

		// get sub-frames' entries first
		if (frame.frames) {
			for (i = 0; i < frame.frames.length; i++) {
				frameNavStart = getNavStartTime(frame.frames[i]);
				frameOffset = 0;
				if (frameNavStart > navStart) {
					frameOffset = offset + (frameNavStart - navStart);
				}

				entries = entries.concat(findPerformanceEntriesForFrame(frame.frames[i], false, frameOffset, depth + 1));
			}
		}

		try {
			if (!("performance" in frame) ||
			   !frame.performance ||
			   typeof frame.performance.getEntriesByType !== "function") {
				return entries;
			}

			// add an entry for the top page
			if (isTopWindow) {
				navEntries = frame.performance.getEntriesByType("navigation");
				if (navEntries && navEntries.length === 1) {
					navEntry = navEntries[0];

					// replace document with the actual URL
					entries.push({
						name: frame.location.href,
						startTime: 0,
						initiatorType: "html",
						redirectStart: navEntry.redirectStart,
						redirectEnd: navEntry.redirectEnd,
						fetchStart: navEntry.fetchStart,
						domainLookupStart: navEntry.domainLookupStart,
						domainLookupEnd: navEntry.domainLookupEnd,
						connectStart: navEntry.connectStart,
						secureConnectionStart: navEntry.secureConnectionStart,
						connectEnd: navEntry.connectEnd,
						requestStart: navEntry.requestStart,
						responseStart: navEntry.responseStart,
						responseEnd: navEntry.responseEnd
					});
				}
				else if (frame.performance.timing){
					// add a fake entry from the timing object
					t = frame.performance.timing;
					entries.push({
						name: frame.location.href,
						startTime: 0,
						initiatorType: "html",
						redirectStart: t.redirectStart ? (t.redirectStart - t.navigationStart) : 0,
						redirectEnd: t.redirectEnd ? (t.redirectEnd - t.navigationStart) : 0,
						fetchStart: t.fetchStart ? (t.fetchStart - t.navigationStart) : 0,
						domainLookupStart: t.domainLookupStart ? (t.domainLookupStart - t.navigationStart) : 0,
						domainLookupEnd: t.domainLookupEnd ? (t.domainLookupEnd - t.navigationStart) : 0,
						connectStart: t.connectStart ? (t.connectStart - t.navigationStart) : 0,
						secureConnectionStart: t.secureConnectionStart ? (t.secureConnectionStart - t.navigationStart) : 0,
						connectEnd: t.connectEnd ? (t.connectEnd - t.navigationStart) : 0,
						requestStart: t.requestStart ? (t.requestStart - t.navigationStart) : 0,
						responseStart: t.responseStart ? (t.responseStart - t.navigationStart) : 0,
						responseEnd: t.responseEnd ? (t.responseEnd - t.navigationStart) : 0
					});
				}
			}

			// offset all of the entries by the specified offset for this frame
			var frameEntries = frame.performance.getEntriesByType("resource"),
			    frameFixedEntries = [];

			for (i = 0; frameEntries && i < frameEntries.length; i++) {
				t = frameEntries[i];
				frameFixedEntries.push({
					name: t.name,
					initiatorType: t.initiatorType,
					startTime: t.startTime + offset,
					redirectStart: t.redirectStart ? (t.redirectStart + offset) : 0,
					redirectEnd: t.redirectEnd ? (t.redirectEnd + offset) : 0,
					fetchStart: t.fetchStart ? (t.fetchStart + offset) : 0,
					domainLookupStart: t.domainLookupStart ? (t.domainLookupStart + offset) : 0,
					domainLookupEnd: t.domainLookupEnd ? (t.domainLookupEnd + offset) : 0,
					connectStart: t.connectStart ? (t.connectStart + offset) : 0,
					secureConnectionStart: t.secureConnectionStart ? (t.secureConnectionStart + offset) : 0,
					connectEnd: t.connectEnd ? (t.connectEnd + offset) : 0,
					requestStart: t.requestStart ? (t.requestStart + offset) : 0,
					responseStart: t.responseStart ? (t.responseStart + offset) : 0,
					responseEnd: t.responseEnd ? (t.responseEnd + offset) : 0
				});
			}

			entries = entries.concat(frameFixedEntries);
		}
		catch (e) {
			return entries;
		}

		return entries;
	}

	/**
	 * Converts a number to base-36.
	 *
	 * If not a number, or === 0, return "". This is to facilitate
	 * compression in the timing array, where "blanks" or 0s show as a series
	 * of trailing ",,,," that can be trimmed.
	 *
	 * @param [number] n Number
	 * @return Base-36 number, or empty string.
	 */
	function toBase36(n) {
		return (typeof n === "number" && n !== 0) ? n.toString(36) : "";
	}

	/**
	 * Gathers a filtered list of performance entries.
	 * @param [number] from Only get timings from
	 * @param [number] to Only get timings up to
	 * @param [string[]] initiatorTypes Array of initiator types
	 * @return [ResourceTiming[]] Matching ResourceTiming entries
	 */
	function getFilteredResourceTiming(from, to, initiatorTypes) {
		var entries = findPerformanceEntriesForFrame(BOOMR.window, true, 0, 0),
		    navStart = getNavStartTime(BOOMR.window),
		    e, i;

		if (!entries || !entries.length) {
			return [];
		}

		var filteredEntries = [];

		for (i = 0; i < entries.length; i++) {
			e = entries[i];

			// skip non-resource URLs
			if (e.name.indexOf("about:") === 0 ||
			    e.name.indexOf("javascript:") === 0) {
				continue;
			}

			// skip mPulse boomerang.js and config.js URLs
			if (e.name.indexOf(BOOMR.url) > -1 ||
			    e.name.indexOf(BOOMR.config_url) > -1) {
				continue;
			}

			// if the user specified a "from" time, skip resources that started before then
			if (from && (navStart + e.startTime) < from) {
				continue;
			}

			// if we were given a final timestamp, don't add any resources that started after it
			if (to && (navStart + e.startTime) > to) {
				// We can also break at this point since the array is time sorted
				break;
			}

			// if given an array of initiatorTypes to include, skip anything else
			if (typeof initiatorTypes !== "undefined" && initiatorTypes !== "*" && initiatorTypes.length) {
				if (!e.initiatorType || !BOOMR.utils.inArray(e.initiatorType, initiatorTypes)) {
					continue;
				}
			}

			filteredEntries.push(e);
		}

		return filteredEntries;
	}
	/**
	 * Gathers performance entries and compresses the result.
	 * @param [number] from Only get timings from
	 * @param [number] to Only get timings up to
	 * @return Optimized performance entries trie
	 */
	function getCompressedResourceTiming(from, to) {
		/*eslint no-script-url:0*/
		var entries = getFilteredResourceTiming(from, to),
		    i, e, results = {}, initiatorType, url, data;

		if (!entries || !entries.length) {
			return {};
		}

		for (i = 0; i < entries.length; i++) {
			e = entries[i];

			//
			// Compress the RT data into a string:
			//
			// 1. Start with the initiator type, which is mapped to a number.
			// 2. Put the timestamps into an array in a set order (reverse chronological order),
			//    which pushes timestamps that are more likely to be zero (duration since
			//    startTime) towards the end of the array (eg redirect* and domainLookup*).
			// 3. Convert these timestamps to Base36, with empty or zero times being an empty string
			// 4. Join the array on commas
			// 5. Trim all trailing empty commas (eg ",,,")
			//

			// prefix initiatorType to the string
			initiatorType = INITIATOR_TYPES[e.initiatorType];
			if (typeof initiatorType === "undefined") {
				initiatorType = 0;
			}

			data = initiatorType + [
				trimTiming(e.startTime, 0),
				trimTiming(e.responseEnd, e.startTime),
				trimTiming(e.responseStart, e.startTime),
				trimTiming(e.requestStart, e.startTime),
				trimTiming(e.connectEnd, e.startTime),
				trimTiming(e.secureConnectionStart, e.startTime),
				trimTiming(e.connectStart, e.startTime),
				trimTiming(e.domainLookupEnd, e.startTime),
				trimTiming(e.domainLookupStart, e.startTime),
				trimTiming(e.redirectEnd, e.startTime),
				trimTiming(e.redirectStart, e.startTime)
			].map(toBase36).join(",").replace(/,+$/, "");

			url = BOOMR.utils.cleanupURL(e.name, impl.urlLimit);

			// if this entry already exists, add a pipe as a separator
			if (results[url] !== undefined) {
				results[url] += "|" + data;
			}
			else {
				results[url] = data;
			}
		}

		return optimizeTrie(convertToTrie(results), true);
	}

	/**
	 * Calculates the union of durations of the specified resources.  If
	 * any resources overlap, those timeslices are not double-counted.
	 *
	 * @param [ResourceTiming[]] resources Resources
	 *
	 * @returns Duration, in milliseconds
	 */
	function calculateResourceTimingUnion(resources) {
		// To do this, we're going to first iterate over all resources, adding each resources'
		// total time to the total time calcation.  Next, we iterate over all subsequent resources
		// and subtract any time where they overlap with this one.
		if (!resources || !resources.length) {
			return 0;
		}

		var totalTime = 0;
		for (var i = 0; i < resources.length; i++) {
			var r1 = resources[i];

			// add this resource's total time
			var r1End = r1.responseStart || r1.responseEnd;
			totalTime += r1End - r1.fetchStart;

			// iterate over all following resources, and subtract any overlapping time
			for (var j = i + 1; j < resources.length; j++) {
				var r2 = resources[j];

				var r2End = r2.responseStart || r2.responseEnd;

				if (r2.fetchStart >= r1End) {
					// this resource started after the end of r1, and all subsequent
					// will as well, so we can stop iterating
					break;
				}

				// subtract the overlapping time
				totalTime -= Math.min(r1End, r2End) - r2.fetchStart;
			}
		}

		return totalTime;
	}

	impl = {
		complete: false,
		sentNavBeacon: false,
		initialized: false,
		supported: false,
		xhr_load: function() {
			if (this.complete) {
				return;
			}

			// page load might not have happened, or will happen later, so
			// set us as complete so we don't hold the page load
			this.complete = true;
			BOOMR.sendBeacon();
		},
		xssBreakWords: DEFAULT_XSS_BREAK_WORDS,
		urlLimit: DEFAULT_URL_LIMIT,
		clearOnBeacon: false,
		done: function() {
			var r;

			// Stop if we've already sent a nav beacon (both xhr and spa* beacons
			// add restiming manually).
			if (this.sentNavBeacon) {
				return;
			}

			BOOMR.removeVar("restiming");
			r = getCompressedResourceTiming();
			if (r) {
				BOOMR.info("Client supports Resource Timing API", "restiming");
				BOOMR.addVar({
					restiming: JSON.stringify(r)
				});
			}

			this.complete = true;
			this.sentNavBeacon = true;

			BOOMR.sendBeacon();
		},

		onBeacon: function(vars) {
			var p = BOOMR.getPerformance();

			// clear metrics
			if (vars.hasOwnProperty("restiming")) {
				BOOMR.removeVar("restiming");
			}

			if (impl.clearOnBeacon && p) {
				var clearResourceTimings = p.clearResourceTimings || p.webkitClearResourceTimings;
				if (clearResourceTimings && typeof clearResourceTimings === "function") {
					clearResourceTimings.call(p);
				}
			}
		}
	};

	BOOMR.plugins.ResourceTiming = {
		init: function(config) {
			var p = BOOMR.getPerformance();

			BOOMR.utils.pluginConfig(impl, config, "ResourceTiming",
				["xssBreakWords", "clearOnBeacon", "urlLimit"]);

			if (impl.initialized) {
				return this;
			}

			if (p && typeof p.getEntriesByType === "function") {
				BOOMR.subscribe("page_ready", impl.done, null, impl);
				BOOMR.subscribe("xhr_load", impl.xhr_load, null, impl);
				BOOMR.subscribe("onbeacon", impl.onBeacon, null, impl);
				BOOMR.subscribe("before_unload", impl.done, null, impl);
				impl.supported = true;
			}
			else {
				impl.complete = true;
			}

			impl.initialized = true;

			return this;
		},
		is_complete: function() {
			return true;
		},
		is_supported: function() {
			return impl.initialized && impl.supported;
		},
		//
		// Public Exports
		//
		getCompressedResourceTiming: getCompressedResourceTiming,
		getFilteredResourceTiming: getFilteredResourceTiming,
		calculateResourceTimingUnion: calculateResourceTimingUnion

		//
		// Test Exports (only for debug)
		//
		/* BEGIN UNIT_TEST_CODE */,
		trimTiming: trimTiming,
		convertToTrie: convertToTrie,
		optimizeTrie: optimizeTrie,
		findPerformanceEntriesForFrame: findPerformanceEntriesForFrame,
		toBase36: toBase36
		/* END UNIT_TEST_CODE */
	};

}());
