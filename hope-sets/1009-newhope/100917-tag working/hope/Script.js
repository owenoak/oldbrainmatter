/***	Script singleton, for loading scripts dynamically.	***/

(function(window) {	// begin hidden from global scope


var NAMED_PATH_MATCHER = /{{(.*?)}}/;
var FULL_PATH_MATCHER = /[^#?]*/;
var	CACHE_PARAMS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

// return the "src" of the last script in the document
// this is generally the script that is executing right now
function $lastScript() {
	var scripts = document.getElementsByTagName("script");
	return scripts[scripts.length-1].src;
}


// load a single script by creating a SCRIPT element for it
function $loadOne(url) {
	var script = document.createElement("script");
	script.setAttribute("src", Script.addCacheParam(url, Script.cache));
	Script.domParent.appendChild(script);
	if (Script.debug) console.error("Adding script for ",url);
}


var Script = window.Script = {
	debug : false,		//TODO: cookieize me

	// If false, we automatically add a cache parameter to each url to make them unique.
	cache : false,

	// parent where we will insert new script elements
	domParent : document.querySelector("head") || document.querySelector("body"),
	
	// map of scripts which have already been successfully loaded
	loadedUrls : {},

	// map of scripts which are currently loading
	loadingUrls : {},	

	// Map of named path => url path.
	//	Add named paths to this object to dereference them via Script.expand()
	paths : {
		// path to head of hope scripts, set in loader
		hope : HOPE_PATH
	},

	// given a @url, interpret any named paths in the url (eg:  "{{hope}}foo")
	expand : function(url) {
		var match = url.match(NAMED_PATH_MATCHER);
		if (match) {
			var path = Script.paths[match[1]];
			if (!path) 	console.error("Named path not found in url "+url);
			else		url = url.replace(match[0], path);
		}
		return url;
	},
	
	collapse : function(url) {
		for (var name in Script.paths) {
			var path = Script.paths[name];
			if (url.indexOf(path) === 0) return "{{"+name+"}}"+url.substr(path.length);
		}
		return url;
	},
	
	// IF Script.dontCache is true,
	//	to defeat browser caching, append a 'unique-y' parameter to the end of a url.
	// 	Note: We use a single letter, which is not quite so random, but makes the cache param short.
	addCacheParam : function(url, cache) {
		if (cache === undefined) cache = Script.cache;
		if (!cache) {
			var random = Math.floor(Math.random()*CACHE_PARAMS.length);
			var param = CACHE_PARAMS[random];
			return url + (url.indexOf("?") > -1 ? "&" : "?") + "_="+param;
		} else {
			return url;
		}
	},
	
	// extract full path of url, eg:
	//	http://server.com:80/path/to/file.html
	fullPath : function(url) {
		return (""+url).match(FULL_PATH_MATCHER)[0];
	},

	// extract path NOT INCLUDING the fileName
	//	http://server.com:80/path/to/
	path : function(url) {
		url = Script.fullPath(url);
		return url.substr(0, url.lastIndexOf("/"));
	},
	
	
	// extract full path of url, eg:
	//	file.html
	fileName : function(url) {
		url = Script.fullPath(url);
		return url.substr(url.lastIndexOf("/"));
	},
	
	
	// Append a javascript @code block as a SCRIPT tag in the DOM immediately.
	//	@callback is a function to call immediately after script executes
	//	@errback  is a function to call if the script fails (eg: syntax error)
	//				@errback will be called with the exception object.
	execute : function(code, callback, errback, note) {
		// create a informational callback if one wasn't defined
		if (!errback) errback = function(e){
			console.error("Error executing script:", e, "\n", code)
		};
		// and stick it in the global scope so we can call it on error
		var errId = "SCRIPT_ERROR_" + SCRIPT_ERROR_ID++;
		window[errId] = errback;
		// wrap the code in a try/catch to call the errback
		code = "try { "+ code +"} catch (e) { window."+errId+"(e) }";

		// create the script element and attach it to the dom
		var script = document.createElement("script");
		if (note) script.setAttribute("note", note);
		script.appendChild(document.createTextNode(code));

		// append the script node to the document head
		//	NOTE: this will execute it immediately and synchronously in FF 3.5+ and Chrome
		var parent = document.querySelector("head") || document.querySelector("body");
		parent.appendChild(script);
		
		// clear the callback
		delete window[errId]
		
		if (callback) callback();
	},
	
	// Asynchronously load one or more script files, and call the callback when completed.
	load : function(urls, callback) {
		// convert to an array, splitting on commas (which are not legal in URLs)
		if (typeof urls === "string") urls = urls.split(/\s*,\s*/);

		var unloaded = [];
		if (urls) {
			// figure out which scripts have not been loaded yet
			var i = -1, url;
			while (url = urls[++i]) {
				// expand any named paths in the url
				url = Script.expand(url);
				if (!Script.loadedUrls[url]) unloaded.push(url);
			}
		}

		if (Script.debug) {
			var script = Script.collapse($lastScript()||"");
			console.info("loading",script,
							"\n     requiring ",urls,
							"\n     unloaded  ",unloaded
							+ (unloaded.length ? "\n     executing callback now" : "")
						);
			
			var loadMsg = function(didItWork){
				console.info("load callback "+didItWork+" for ",urls)
			};
		}

		var callbackFired = false;

		// if nothing to load, we're done
		if (unloaded.length === 0) {
			callbackFired = true;
			if (callback) callback();
			return true;
		}

		function loadCallback() {
			// bail if any of our requires are not loaded
			var i = -1, url;
			while (url = unloaded[++i]) {
				if (!Script.loadedUrls[url]) {
					if (Script.debug) loadMsg("not finished");
					return;
				}
			}
			if (Script.debug) loadMsg("finished");
			// if we get here, we're all loaded, so execute the callback
			if (!callbackFired && callback) callback();
			callbackFired = true;
		}
		
		// load any that are not currently loading
		var i = -1, url;
		while (url = unloaded[++i]) {
			if (!Script.loadingUrls[url]) {
				$loadOne(url);
				Script.loadingUrls[url] = [];
			}
			if (Script.debug) console.info("pushing callback for ",script," onto list for ",url);
			if (callback) Script.loadingUrls[url].push(loadCallback);
		}
		return false;
	},
	
	// Require a bunch of scripts (NOT executed in order) and then do some callback.
	// NOTE: this is syntatactic sugar for Script.load()
	require : function (urls, callback) {
		Script.load(urls, callback);
	},
	
	// Call this when a URL has been loaded.
	//	
	//
	//	If any other scripts have require()d this script, this will execute them.
	//
	// If you load your file via Script.load or via static load before window.onload fires, 
	//	this will be called automatically. (?)
	loaded : function(url) {
		if (Script.debug) console.warn("loaded ",url);
		url = Script.expand(url);
		Script.loadedUrls[url] = true;
		var callbacks = Script.loadingUrls[url];
		if (callbacks) {
			var i = -1, callback;
			while (callback = callbacks[++i]) {
				callback();
			}
		}
		delete Script.loadingUrls[url];
	},
	
	
	toRef : function() {	return "Script" }
};	// end Script


Script.paths.page = Script.path(""+window.location);


// hacky that this is here, but it's a bootstrap thing
Script.loaded("{{hope}}Script.js");

})(window);// end hidden from global scope
