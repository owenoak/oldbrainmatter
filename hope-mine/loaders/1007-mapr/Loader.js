/*
	Generic JS/CSS loader functionality.
	Copyright (c) 2010, MapR Technology.  All rights reserved.
 */

(function() {	// begin hidden from global scope

// firefox executes scripts added as BDOY tag elements in document order,
//	which means we can append a bunch of SCRIPT elements to the DOM
//	and be sure of their load order.  Used in loadScripts() below.
var isFirefox  = (""+navigator.userAgent).indexOf("Firefox") > -1;
var executesScriptsInOrder = isFirefox;


var Loader = mapr.Loader = {
	
	// set to true to allow caching of script files
	//	or false to guarantee that they're always reloaded
	cache : false,
	
	// map of scripts and styles which have already been loaded (or at least attempted to load)
	loaded : {
		scripts : {},
		styles : {}
	},

	// Append a javascript block as a SCRIPT tag in the DOM
//TODO: errback? callback?
	appendScript : function(code) {
		var script = document.createElement("script");
		script.type = "text/javascript";
		if (Ext.isIE) {		// IE appends script code in a non-standard way
			script.text = code;
		} else {
			script.appendChild(document.createTextNode(code));
		}
		Ext.select("head").elements[0].appendChild(script);
	},
	
	// Persistently load a single script file, and call the callback when completed.
	// 
//TODO: errback
	_cacheParams : "abcdefghijklmnopqrstuvwxyz",
	loadScript : function(url, callback, errback) {
		// if already loaded, callback() and return true
		if (this.loaded.scripts[url]) {
			if (callback) callback();
			return true;
		}
		
		if (Loader.cache == false) {
			// do modulo 1000, which is not quite so random
			//	but makes the number short
			var cacheBuster = this._cacheParams[Math.floor(Math.random()*this._cacheParams.length)];
			url += (url.indexOf("?") > -1 ? "&" : "?") +cacheBuster;
		}
		
		// note that we've at least attempted to load
		this.loaded.scripts[url] = true;

		// create the script element and append it to the body
		//	this will load and execute it
		var script = document.createElement("script");
		script.type = "text/javascript";
		script.setAttribute("src", url);
		if (callback) script.onload = callback;
		Ext.select("head").elements[0].appendChild(script);

		// return false to signal that we're actually loading
		return false;
	},
	
		
	// Persistently load a bunch of script files IN ORDER, 
	//	executing a single callback when all have completed.
	loadScripts : function(urls, callback, errback) {
//console.warn("loadScripts ",urls);	
		if (!errback) errback = function(){throw "Couldn't load scripts "+urls};

		// if we were passed a string, load that singularly via loadScript()
		if (typeof urls === "string") return Loader.loadScript(urls, callback, errback);

		// if there is exactly one script, call the singular loadScript(), 
		//	which is more efficient
		if (urls.length == 1) return Loader.loadScript(urls[0], callback, errback);
		
		// if there are no scripts in the list, just execute the callback
		if (urls.length == 0) {
			if (callback) callback();
			return true;
		}
		
		var total = urls.length,
			completed = 0,
			i = -1, url
		;
		
		// handle browsers which execute inserted SCRIPT tags in-order (Firefox)
		if (executesScriptsInOrder) {
			function loadedOne() {
				if (++completed == total) {
					if (callback) callback();
				}
			}
			while(url = urls[++i]) {
				Loader.loadScript(url, loadedOne, errback);
			}

		} 
		// handle other browsers by loading the SCRIPT tags, then inserting them in order
		else {
			var codeBlocks = [];
			function loadOne(url, index) {
				function oneLoaded(options, success, response) {
//console.warn("oneLoaded(",options,success,response);
					if (!success) errback(options.url);
					codeBlocks[index] = response.responseText;
					if (++completed == total) allLoaded();
				};

				if (Loader.loaded.scripts[url] === true) {
					oneLoaded(null, true, "// "+url+" already loaded");
				
				} else {
					// note that we've at least attempted to load the url
					Loader.loaded.scripts[url] = true;
//console.warn("loading ",url);
					var request = Ext.Ajax.request({url:url, callback:oneLoaded});
				}
			}
			
			function allLoaded() {
				var code = codeBlocks.join("\n\n");
				//TODO: is this synchronous?
				Loader.appendScript(code);
				if (callback) callback();
			}

			while(url = urls[++i]) {
//console.warn(url, i);
				loadOne(url, i);
			}
		}
		// return false to inidicate that not all scripts were loaded
		return false;
	},
	
	// Persistently load a single CSS file (no callback behavior)
	loadStyle : function(url) {
//TOOD: check this in IE
//TODO: don't re-load a stylesheet (?)
		var style = document.createElement("link");
		style.type = "text/css";
		style.setAttribute("rel","stylesheet");
		style.setAttribute("href", url);
		Ext.select("head").elements[0].appendChild(style);
	},
	
	
	// Persistently load one or more CSS files (no callback behavior)
	loadStyles : function(urls) {
		if (!urls) return;
		if (typeof urls === "string") {
			mapr.Loader.loadStyle(urls);
		} else {
			for (var i = 0; i < urls.length; i++) {
				if (urls[i]) mapr.Loader.loadStyles(urls[i]);
			}
		}
	},
	
	
	// update our list of which script/css files have already been loaded by inspecting the dom
	updateLoaded : function() {
		// note which SCRIPT tags have already been loaded
		Ext.select("script").each(function(script) {
			// get the script src attribute --
			//	note: don't use script.src as that will be an absolute path (http://...)
			var src = script.dom.getAttribute("src");
			if (src) Loader.loaded.scripts[src] = true;
		});

		// note which LINK rel=stylesheet elements have already been loaded
		Ext.select("link").each(function(link) {
			// skip non-stylesheet links
			if (link.dom.getAttribute("rel") != "stylesheet") return;

			// get the link href attribute --
			//	note: don't use link.href as that will be an absolute path (http://...)
			var src = link.dom.getAttribute("href");
			if (src) Loader.loaded.styles[src] = true;
		});
	}

}	// end mapr.Loader


// have an onReady method which notes which JS files have been loaded
//	so we don't load them twice
Ext.onReady( Loader.updateLoaded, Loader); 


})();			// end hidden from global scope
