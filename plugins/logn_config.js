(function(w) {
var d=w.document,
    s="script",
    dom=d.URL.replace(/^https?:\/\//, '').replace(/[:?;\/].*$/, ''),
    complete=false, running=false,
    t_start;

// Don't even bother creating the plugin if this is mhtml
if(dom.match(/^mhtml/) || dom.match(/^file:\//)) {
	return;
}

var loaded=function() {
	if(complete) {
		return;
	}
	complete = true;
	running = false;
	BOOMR.sendBeacon();
};

var load=function() {
	var s0=d.getElementsByTagName(s)[0],
	    s1=d.createElement(s);

	t_start=new Date().getTime();
	s1.src="//lognormal.net/boomerang/config.js?key=%client_apikey%&d=" + encodeURIComponent(dom)
		+ '&t=' + Math.round(t_start/(5*60*1000))	// add time field at 5 minute resolution so that we force a cache bust if the browser's being nasty
		+ '&v=' + BOOMR.version				// boomerang version so we can force a reload for old versions
		+ (complete?"&r=":"");				// if this is running after complete, then we're just refreshing the crumb

	s0.parentNode.insertBefore(s1, s0);
	s0=s1=null;

	if(complete) {
		setTimeout(load, 5.5*60*1000);
	}
};

BOOMR.plugins.LOGN = {
	init: function() {
		if(complete) {
			return this;
		}

		// if we are called a second time while running, it means config.js has finished loading
		if(running) {
			// We need this monstrosity because Internet Explorer is quite moody
			// regarding whether it will or willn't fire onreadystatechange for
			// every change of readyState
			setTimeout(loaded, 10);
			setTimeout(load, 5.5*60*1000);

			BOOMR.addVar('t_configjs', new Date().getTime()-t_start);
			if(typeof BOOMR_configt != "undefined") {
				BOOMR.addVar('t_configfb', BOOMR_configt-t_start);
				delete BOOMR_configt;
			}
			return;
		}

		running=true;
		BOOMR.subscribe("page_ready", load, null, null);

		return this;
	},

	is_complete: function() {
		return complete;
	}
};

}(window));

BOOMR.init({log:null,wait:true});