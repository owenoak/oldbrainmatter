/* Do some quick browser sniffing and apply the name of the browser 
	as a class on the HTML element so we can do browser-specific styling.   */

(function($) {	// begin hidden from global scope

var html = $("HTML");

if ($.browser.mozilla) {
	html.addClass("Gecko");
} else if ($.browser.webkit) {
	html.addClass("WebKit");
} else if ($.browser.msie) {
	html.addClass("MSIE");
	html.addClass("MSIE"+parseInt($.browser.version));
} else {
	html.addClass("NOT_SUPPORTED");
}

// is flash available?
$.browser.hasFlash = false;
if ($.browser.MSIE) {
	function tryForIEFlash(version) {
		try {
			var it = new ActiveXObject("ShockwaveFlash.ShockwaveFlash."+ version);
			return true
		} catch (e) {
			return false;
		}
	}
	// start at version 7 and work down
	for (var version = 7; version >= 3; version--) {
		if (tryForIEFlash(version)) {
			$.browser.hasFlash = true;
			break;
		}
	}
} else if (window.navigator && navigator.plugins) {
	$.each(navigator.plugins, function(index, plugin) {
		if (""+plugin.name.indexOf("Flash") > -1) $.browser.hasFlash = true;
	});
}
// set "NOFLASH" on the html element if no flash available
if (! $.browser.hasFlash) html.addClass("NOFLASH");



/* HACK: make sure a console object is defined with firebug API */
if (!window.console) window.console = {};
var methods = "debug,log,info,warn,debug,error,group,groupEnd,time,timeEnd,hint".split(",");
for (var i = 0, method; method = methods[i++];) {
	if (!console[method]) {
		if (method === "log") {
			console[method] = function(){};
		} else {
			console[method] = function(){console.log.apply(console, arguments)};
		}
	}
}


})(jQuery);	// end hidden from global scope
