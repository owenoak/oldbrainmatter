/*! Hope application framework, v 0.1					See: http://hopejs.com
 *	MIT license.										See: http://hopejs.com/license
 *	Copyright (c) 2006-2009, Matthew Owen Williams.
 */
var global = this;

hope = (function() {	/* Begin hidden from global scope */

var slice = Array.prototype.slice;

var hope = {

	/** reference to the global scope. */
	global : global,

	//
	//	constants
	//

	/** Debugging flags */
	OFF			: 0,
	ERROR		: 1,
	WARN		: 2,
	INFO		: 3,
	
	/** Special notification to clear completely (eg: clear a cache). */
	
	/** start of with debug at 'error' level */
	debugging	: 1,		// TODO: pull debugging from cookie
	cacheScripts : true,	// TODO: set cacheScripts according to debugging flag
	safeEval : true,		// TODO: set safeEval according to debugging flag
	
	/** Flag indicating a non-specified value. */
	NONE 		: undefined,

	
	/** Flag indicating that a default operation should be skipped. */
	SKIP 		: "__SKIP__",

	/** Flag indicating that we should clear something (eg: a cache). */
	CLEAR 		: "__CLEAR__",

	/** Flag indicating that we should continue or stop processing. */
	CONTINUE	: "__CONTINUE__",
	STOP 		: "__STOP__",

	/** Synchronous/Asynchronous flags. */
	SYNC		: false,
	ASYNC 		: true,


	/** Flag indicating that an iteration has completed. */
	DONE 		: "__DONE__",
	
	/** Flag indicating we should use relative paths. */
	RELATIVE	: "__RELATIVE__",
	
	/** Flag for extend() to indicate merge (where subsequent properties do NOT overwrite). */
	OVERWRITE 	: "OVERWRITE",
	MERGE 		: "MERGE",

	/** Loaded flags. */
	UNLOADED 	: "UNLOADED",
	LOADING 	: "LOADING",
	LOADED 		: "LOADED",
	LOAD_ERROR	: "ERROR",
	
	
	/** List of well-known regexp patterns.  
		Define in hope.pattern once rather than inline in your methods for speed and re-use.
	 */
	Patterns : { 
		// characters that are not legal in an identifier
		illegalIdentifierCharacters : /[^\w$_]/g,
		runOfSpaces : /\s+/g,
		isAllSpaces : /^\s+$/,
		
		splitOnCommas : /\s*,\s*/,
		splitOnLines : /[\n\r]/,
		
		urlParser : /(((?:(\w*:)\/\/)(([^\/:]*):?([^\/]*))?)?([^?]*\/)?)(([^?#.]*)(\.[^?#]*)|[^?#]*)(\?[^#]*)?(#.*)?/,
		mustacheMatcher : /\{\{(.*)\}\}/,
		
	},


	/** Walk down a 'path' of dotted.properties from a context object
		and return what you find.  Handles function calls as well (in an eval).
		NOTE: does not handle function calls with periods in their arguments!
	*/
	get : function(path, context, stopAtParent) {
		if (context == null) context = hope.global;
		path = path.split(".");
		var step, i = 0, last = (stopAtParent ? path.length - 1 : path.length), index;
		while (i < last) {
			step = path[i++];

			// if there are parenthesis, try an eval
			if (step.indexOf("(") > -1) {
				try {
					context = eval("context."+step);
				} catch (e) {
					hope.error("Error evaluating ",path.join("."),e);
					return;
				}
			}
			// try to find as a string
			else if (context[step] != null) {
				context = context[step];
			} 
			// try to find as a number
			else {
				index = parseInt(step);
				if (""+index === step && context[index] != null) {
					context = context[step];		
				} else {
					return;
				}
			}
		}
		return context;
	},
	
	/** Given a string and a context, expand any 'mustaches' in the string, eg: '{{a.b.c}}' */
	expand : function(string, context) {
		if (!string || typeof string != "string") return "";
		if (!context) context = hope.global;
		
		var match, pattern = hope.Patterns.mustacheMatcher, replacement;
		while (match = string.match(pattern)) {
			replacement = hope.get(match[1], context);
			if (replacement == null) replacement = "";
			string = string.replace(match[0], ""+replacement);
		}
		return string;
	},

	/** Do an eval, trapping any errors.  
		If there is a JS error in the code, you will see a console error.
	*/
	execute : function(javascript, context, url) {
		if (!javascript) return;
		if (hope.safeEval) {
			try {
				// add text that lets firebug know where the script came from
				// TODO: webkit is supposed to understand this as well, but it doesn't seem to work
				javascript += "\n//@ sourceURL=" + (url || context || " pass url into hope.execute() for more info");
				return eval(javascript);
			} catch (error) {
				return hope.exception(error, context, url);
			}
		} else {
			var script = document.createElement("script");
			script.type = "text/javascript";
			script.appendChild(document.createTextNode(javascript));
			var head = document.querySelector("head") || document.documentElement;
			head.insertBefore(script, head.firstChild);
			head.removeChild(script);
		}
	},

	/** append a script specified by URL to the document head. */
	appendScript : function (url, onLoad) {
try {
		var script = document.createElement("script");
		script.type = "text/javascript";
		script.setAttribute("src", url);
		if (onLoad) script.onload = onLoad;
		var head = document.querySelector("head") || document.documentElement;
		head.appendChild(script);
} catch (e) {
	hope.exception(e, null, url);
}
	},


	/** Add all properties from one or more objects to the first object.
		Very quick, does not getter/setter checking -- if you want that, use 'hope.mixin()'.
		Returns the modified first object.
	*/
	extend : function(destination, source) {
		if (!destination) return null;
		var i = 0, length = arguments.length, key;
		while (++i < length) {
			if (source = arguments[i]) {
				for (key in source) destination[key] = source[key];
			}
		}
		return destination;
	},


	/** Add all properties from one or more objects to the first object.
		This variant ONLY adds if destination[key] === undefined.
		Very quick, does not getter/setter checking -- if you want that, use 'hope.mixin()'.
		Returns the modified first object.
	*/
	merge : function(destination, source) {
		if (!destination) return null;
		var i = 0, length = arguments.length, key;
		while (++i < length) {
			if (source = arguments[i]) {
				for (key in source) {
					if (destination[key] === undefined) destination[key] = source[key];
				}
			}
		}
		return destination;
	},


	/** Simple shallow merge for one or more property object.
		Modifies the first object and returns it.
		
		Sets up getters ("get_property") and setters ("set_property") automatically.
		
		Pass hope.MERGE as first argument to NOT have later properties overwrite those of earlier properties.
		Pass hope.IGNORE as first argument to ignore getters and setters, 
			treating them like normal properties.
		
		TODO: pass 'DEEP' to do a deep copy?
	*/
	mixin : function() {
		var i = 0, 
			overwrite = true,
			length = arguments.length, 
			key, beginning
		;
		// if first argument is a string, that's the overwrite mode
		if (typeof arguments[0] == "string") {
			overwrite = (arguments[0] == hope.MERGE);
			i = 1;
		}
		var destination = arguments[i], source;
		if (destination == null) return null;
		
		while (++i < length) {
			if ((source = arguments[i]) == null) continue;
			for (key in source) {
				value = source[key];

				// check for getters/setters
				beginning = key.substr(0,4);
				// getter?
				if (beginning == "get_" && typeof value === "function") {
					destination.__defineGetter__(key.substr(4), value);
					continue;
				}
	
				// setter?
				if (beginning == "set_" && typeof value === "function") {
					if (key == "set_unknown") {
						destination[key] = value;
					} else {
						destination.__defineSetter__(key.substr(4), value);
					}
					continue;
				}
				// normal property
				if (destination[key] !== value && (overwrite || destination[key] === undefined)) {
					destination[key] = value;
				}
			}
		}
		return destination;
	},


	//
	//	Things = Classes, Mixins and Types
	//

	/** Map of {type->Thing} for *all* Classes, Mixins, or Types  we have created.
		Classes are added by name during class creation in lower case form.
		Use hope.getThing() to find by name or reference.
	 */
	Things : {
		toString : function(){return "hope.Things"}
	},

	/** Return a pointer to a named Class, Mixin or Type.
		If you pass a Thing, it will simply be returned.
	*/
	getThing : function(thing, throwError) {
		if (typeof thing == "string") {
			// look the class up by lower case
			//	so we don't have to worry about case sensitivity
			var it = hope.Things[thing.toLowerCase()];
			if (it) return it;
		}
		// if it is in fact a thing, we're good to go
		if (thing && thing.isAThing) return thing;
		if (throwError !== hope.SKIP) throw new TypeError("Can't find thing "+thing);
	},
		
	
	/** Register a Thing so you can get it back with hope.get(). */
	registerThing : function(name, thing) {
		// register the thing in the list of Things
		// and simply as hope.<name>
		hope.Things[name.toLowerCase()] = thing;
		hope[name] = thing;
		hope.global[name] = thing;	// for debugging.... or is it?
		thing.isAThing = true;
		return this;
	},
	


	/** 
		HTML helpers
	*/

	/** Co-opt the native (document||element).querySelector and .querySelectorAll */
	/** Select the first item that matches a css selector. */
	select : function(selector, context) {
		if (context == null) context = document;
		return context.querySelector(selector);
	},
	
	/** Return all items that match a css selector. */
	selectAll : function(selector, context) {
		if (context == null) context = document;
		var array = context.querySelectorAll(selector);
		return slice.call(array);
		// TODO: convert to a hope.ElementList ?
//		return (hope.ElementList ? new hope.ElementList(array) : array);
	},
	
	
	/** Add/remove/toggle a class from an element. Using jQuery for now. */
	addClassTo : function(element, className) {
		if (element) {
			var classes = element.className.split(hope.Patterns.runOfSpaces);
			if (classes.indexOf(className) != -1) return;
			classes.push(className);
			element.className = className.join(" ");
		}
	},
	
	removeClassFrom : function(element, className) {
		if (element) {
			var classes = element.className.split(hope.Patterns.runOfSpaces);
			var index = classes.indexOf(className);
			if (index == -1) return;
			classes.splice(index, 1);
			element.className = className.join(" ");
		}
	},

	toggleClassOf : function(element, className, condition) {
		return (condition ? hope.addClassTo : hope.removeClassFrom)(element, className);
	},
	
	/** Add/remove a 'Hidden' class on an element, which will show/hide it. 
		We'll use CSS animations in the Hidden class to animate.
	*/
	show  : function(element) {
		hope.removeClass(element, "Hidden");
	},
	hide : function(element) {
		hope.addClass(element, "Hidden");
	},
	
	/** Convert arguments from the calling function to a proper Array.
		
		@param	[startAt=0]	Index to start copying arguments.
		@param	[prefix]	Array of values to add at START of array (before args)
		@param	[suffix]	Array of values to add at the END of the array.
	 */
	args : function getargs(startAt, prefix, suffix) {
		var args = slice.call(getargs.caller.arguments, startAt||0);
		if (prefix && prefix.length)	args.push.apply(args, prefix);
		if (suffix && suffix.length) 	args.push.apply(args, suffix);
		return args;
	},
	
	/** Is the thing like an array? */
	isListLike : function(it) {
		return (it instanceof Array) || (it.length !== undefined && typeof it != "string");
	},
	
	
	/** Given something that may or may not be list like,
		convert it to a proper array.
	*/
	toArray : function(it) {
		if (it instanceof Array) return it;
		if (hope.isListLike(it)) return slice.call(it, 0);
		return [it];
	},
	
	
	// TODO: move the following 3 into hope.functions ?
	
	/** Bind a function to some object, so when the returned function is called, `this` will be `target`.
		@param	method		Method to bind or name of method on context to bind.
		@param	target		Object to bind the method to.
		@param	[boundArgs]	Optional arguments array to pass to bound function.
		@returns			Bound function.
	 */
	bind : function bind(method, target, boundArgs) {
		if (typeof method == "string") {
			if (typeof target[method] == "function") method = target[method];
		}
		if (typeof method != "function") throw TypeError("Method '"+method+"' is not defined");
		
		return function boundMethod() {
			if (boundArgs) {
				var combinedArgs = hope.args(0, boundArgs);
			} else{
				var combinedArgs = arguments;
			}
			return method.apply(target, combinedArgs);
		}
	},
	
	/** Given a function, return another function which will that function to its first argument,
		passing any additional arguments as normal.
	*/
	makeApplier : function(method) {
		return function(thing) {
			if (!thing) return undefined;
			var args = slice.call(arguments, 1);
			return method.apply(thing, args);
		}
	},

	/** Make appliers for an object of key-value pairs, returning a new object. */
	makeAppliers : function(source) {
		var output = {};
		for (var key in source) {
			output[source] = hope.makeApplier(source[key]);
		}
		return output;
	},
	
	/** Make a prototype-based clone of the target object. 
		@param target		Target object to clone.
		@param [properties]	Object of properties to add to the clone.
	*/
	protoClone : function protoClone(target, properties) {
		function cloner(){};
		cloner.prototype = target;
		var clone = new cloner();

		// if they passed any arguments, extend the clone with the arguments
		if (properties) hope.extend(clone, properties);
		return clone;
	},
	
	
	/** Return a new object with all keys of properties which are different than target.
		If all properties are identical, returns null.
	 /
	deltas : function deltas(target, properties) {
		var deltas = {}, deltaFound = false;
		for (var key in properties) {
			if (properties[key] != target[key]) {
				deltas[key] = properties[key];
				deltaFound = true;
			}
		}
		return (deltaFound ? deltas : null);
	},
	*/
	
	/** Simple debugging -- log an info, warning or error. */

	/** Log an info message if hope.debugging >= hope.info */
	info : function() {
		if (hope.debugging >= hope.INFO) console.info.apply(console, arguments);
	},
	
	warn : function() {
		if (hope.debugging >= hope.WARN) console.warn.apply(console, arguments);
	},
	
	error : function() {
		if (hope.debugging >= hope.ERROR) console.error.apply(console, arguments);
	},
	
	//! Show as much useful info as we can about an exception.
	//  Returns the error so you can throw it if you want to.
	exception : function(error, context, url) {
		msg = "Exception" + (context ? " in "+context : "")
				+ (error.line != null ? " at line " + error.line : "") 
				+ (url ? " in " + url : "");
		console.group(msg);
		console.error(error);
		console.groupEnd();
		return error;
	},
	
	
	//! Quick-and-dirty routine to load a bunch of script files IN PARALLEL
	//	and, when they're all done, execute them in order and execute a callback.
	loadScripts : function(urls, onLoaded) {
		if (!urls || !urls.length) return onLoaded();

		var scripts = [],
			completed = 0,
			scriptCount = urls.length
		;
		
		// function to load a single script.
		//	calls loaded() with the request + index when loaded.
		function loadOne(url, index) {
hope.appendScript(url, loaded);return;

			var request = new XMLHttpRequest();
			request.open("GET", url, hope.ASYNC);
			request.onload = function() {	loaded(request, index)	};
			request.onerror = function(){console.error("Couldn't load "+url)};
			request.send();
		}
		
		// function executed when a script finishes loading.
		function loaded(request, index) {
//			scripts[index] = request.responseText;
			if (++completed == scriptCount) finish();
		}
		
		// function called when all scripts have finished loading
		function finish() {
			// hope.execute() does its own error handling
			for (var i = 0, script; i < scriptCount; i++) {
				script = scripts[i];
				hope.execute(script, "hope.loadScripts()", urls[i]);
			}
			try {
				onLoaded();
			} catch (e) {
				hope.exception(e, "hope.LoadScripts(): executing onLoaded");
			}
		}
		
		// start each script in turn
		for (var i = 0; i < scriptCount; i++) {
			loadOne(urls[i], i);
		}
	}
};


/** Make all strings expandable. */
//String.prototype.expand = function(context) {
//	return hope.expand(this, context);
//}



/*** BEGIN BOOTSTRAP LOADER ***/


/** Hack in a loader for the 'hope' package, 
	which creates the concepts of classes and such.
	The hope package will be initialized as a package later.
*/
console.time("load hope package");

var scripts = document.querySelectorAll("script");
hope.hopeScript = scripts[scripts.length-1];

var hopePath = hope.hopeScript.getAttribute("src");
hopePath = hopePath.substr(0, hopePath.indexOf("hope.js"));

var pkgUrl = hopePath + "hope.package",
	pkgXML,
	request
;

function packageLoaded() {
	pkgXML = (new DOMParser()).parseFromString(request.responseText, "text/xml").firstChild;
	var scripts = pkgXML.querySelectorAll("script[group=preload]"), script, i = -1, urls = [];
	while(script = scripts[++i]) {
		urls[i] = hopePath + script.getAttribute("src");
	}
	hope.loadScripts(urls, packageScriptsLoaded);
}

// Callback when all package scripts have finished loading
function packageScriptsLoaded() {
	// 1) create the hope package as a real Package
	pkgXML.setAttribute("src", pkgUrl);
	hope.hopePackage = hope.xml.toJs(pkgXML, "hope", hope.hopePackage);
	
	// mark the script files as loaded, and load the rest of the preload stuff
	hope.hopePackage.markAsLoaded("preload", "Script");
	hope.hopePackage.loadPreloads();
	
	// 2) grab any code inside the hopeScript and execute it
	var script = hope.hopeScript.textContent;
	if (script) hope.execute(script);
	console.timeEnd("load hope package");
}

request = new XMLHttpRequest();
request.open("GET",  pkgUrl + "?_"+ (new Date()).getTime(), hope.ASYNC);
request.onload = packageLoaded;
request.send();

/*** END BOOTSTRAP LOADER ***/


return hope;

/* End hidden from global scope */ })();

