//	TODO:
//			-- do some browser sniffing to load in an IE- (Safari-?) specific library
//				to do things like add Array.prototype methods, XHR, etc?
//			-- rename hope methods to top level (eg: hope.getFile)
//


//==========
//	console
//==========

// make sure we don't get lame errors from not having console methods

(function (){
	if (!window.console || !console.warn) {
		function show(error) {	
			var message = (arguments.length == 1 && error.message 
								? error.message
								: Array.prototype.join.call(arguments,"")
							);
			alert(message)	
		}
		function noop(){}
		window.console = {	log:show, warn:show, debug:show, info:show,	error:show, time:noop, timeEnd:noop, group:noop, groupEnd:noop,};
	}
})();


//==========
//	hope
//==========
(function(){
	//
	//	"hope" is our top-level object for all generic functionality
	//
	window.hope = {
		// "hope.global" is alias for window scope -- could be redefined in a peering situation
		global : window,
	
		// most primitive and stupid browser sniffing you can imagine
		isGecko : /Gecko\//.test(navigator.userAgent),
		isWebkit : /WebKit/.test(navigator.userAgent),
		isIE : (document.all != null),	// OPERA?
	
	
		//
		//	loading scripts (eg: standard JS)
		//
		_alreadyIncluded : {},
		include : function(src1, src2, etc) {
			for (var i = 0; i < arguments.length; i++) {
				var src = arguments[i];
				if (hope._alreadyIncluded[src]) continue;
	
				// NOTE: assumes Location (below) is included
				var expanded = hope.Location.expand(src);
				// remember that we've loaded this so we don't do it again
				hope._alreadyIncluded[src] = expanded;
				hope._alreadyIncluded[expanded] = expanded;	// ??? just in case?
	
				// if the page has already loaded, insert a script element
				if (hope._pageHasLoaded) {
					hope.createElement("script", null, "HEAD", {src:expanded});
	
				// otherwise just write a new script tag in place
				} else {
					document.write("<scr"+"ipt language='javascript' src='"+expanded+"'></scr"+"ipt>");
				}
			}
		},
		
		included : function(src) {
			this._alreadyIncluded[src] = src; 
		},
	
	
		includeRightNow : function(src1, src2, etc) {
			for (var i = 0; i < arguments.length; i++) {
				var src = arguments[i];
				if (hope._alreadyIncluded[src]) continue;
	
				// NOTE: assumes Location (below) is included
				var expanded = hope.Location.expand(src);
				// remember that we've loaded this so we don't do it again
				hope._alreadyIncluded[src] = expanded;
				hope._alreadyIncluded[expanded] = expanded;	// ??? just in case?
	
				var script = hope.getFile(expanded);
				try {
					eval(script);
				} catch (e) {
					throw(hope._error(arguments,"error loading script '",expanded,"'"));
				}
//				return hope.createElement("script", script, "HEAD", {language:"javascript"});
			}
		},
	
		// called on hope init, to pre-seed all SCRIPT tags as pre-included scripts
		// SHOOT: can't call this when hope is loaded, because other script tags have NOT been processed yet
		_initScriptTagIncludes : function() {
			var scripts = hope.byTag("HTML")[0].getElementsByTagName("script");
			for (var i = 0, script; script = scripts[i++];) {
				var language = script.getAttribute("language");
				if (language != null && language.toLowerCase() != "javascript") continue;
				var src = script.getAttribute("src");
				if (!src) continue;
				// if a relative URL, expand according to the page
				if (src.indexOf("://") == -1) {
					src = hope.Location.expand("${page}"+src);
				}
				this._alreadyIncluded[src] = src;
			}
//			console.dir(this._alreadyIncluded);
		},
	
		//
		//	DOM manipulation
		//
	
	
		byId : function(id) {
			return (typeof id == "string" ? document.getElementById(id) : id);
		},
	
		byTag : function(tagName) {
			return document.getElementsByTagName(tagName);
		},
	
		// dereference:
		//	  	- an element pointer
		//	 	- "HTML", "BODY" or "HEAD" tag
		//		- an elmeent by ID
		byIdOrTag : function(what) {
			if (typeof what != "string") return what;
			var upper = what.toUpperCase();
			if (upper == "HOPE") return hope;
			if (upper == "DOCUMENT") return document;		// PEERING
			if (upper == "WINDOW") return window;			// PEERING
			if (upper == "HTML" || upper == "HEAD" || upper == "BODY") return document.getElementsByTagName(what)[0];
			return document.getElementById(what);
		},
	

		//
		//	HTML element semantics
		//

		
		// set element attributes
		setAttribute : function(element, attribute, value) {
			if (typeof element == "string") element = hope.byId(element);
			if (!element) return;
			if (!value) {
				element.removeAttribute(attribute, value);
			} else {
				element.setAttribute(attribute, value);
			}
		},
		
		removeAttribute : function(element, atribute, value) {
			hope.setAttribute(element, attribute, undefined);
		},
		
		getAttributes : function(element) {
			var attributes = {};
			for (var i = 0, attr; attr = element.attributes[i++]; ) {
				attributes[attr.nodeName] = attr.nodeValue;
			}
			return attributes;
		},
		
		
		// return a normalized list of element attributes:
		//	- anything in _skipAttributes is skipped
		//	- "true" and "false" are converted to their boolean equivalents
		//	- integers are converted to a number
		//	- percentages are left as "#%"  (TODO ???)
		//	- TODO: convert dates?
		_skipNormalizedAttributes : {	"-moz-userdefined":true},
		_percentRE : /^\d+%$/,
		getNormalizedAttributes : function(element) {
			var attributes = {};
			for (var i = 0, attr; attr = element.attributes[i++]; ) {
				var name = attr.nodeName;
				if (hope._skipNormalizedAttributes[name] !== undefined) continue;
				var value = attr.nodeValue;
				if (value == "true") {
					value = true;
				} else if (value == "false") {
					value = false;
				} else {
					var num = parseFloat(value);
					if (!isNaN(num) && (hope._percentRE.exec(value) == null)) {
						value = num;
					}
				}
				attributes[name] = value;
			}
			return attributes;
		},	
	
	
		//
		//	CSS class semantics
		//
	
		hasClass : function(className, element){
			if (typeof element == "string") element = hope.byId(element);
			if (!element) return;
			return ((" "+element.className+" ").indexOf(" "+className+" ") > -1);
		},
	
		addClass : function(className, element){
			if (typeof element == "string") element = hope.byId(element);
			if (!element) return;
			if (!hope.hasClass(className, element)) element.className = hope.trim(element.className+" "+className);
			return true;
		},
	
		removeClass : function(className, element){
			if (typeof element == "string") element = hope.byId(element);
			if (!element) return;
			if (hope.hasClass(className, element)) {
				element.className = hope.trim((" " + element.className + " ").replace(" " + className + " ", " "));
			}
			return false;
		},
	
		toggleClass : function(className, element, turnOn) {
			if (typeof element == "string") element = hope.byId(element);
			if (!element) return;
			if (turnOn === undefined){
				turnOn = !hope.hasClass(className, element);
			}
			method = turnOn ? hope.addClass : hope.removeClass;
			return method(className, element);
		},
		
		
		createElement : function(tag, html, parent, attributes, children) {
			if (arguments.length == 1 && typeof tag == "object") {
				html = tag.html;
				parent = tag.parent;
				attributes = tag.attributes;
				children = tag.children;
				tag = tag.tag;
			}
			var it;
			try {
				it = document.createElement(tag);
				if (html) {
					try {
						it.innerHTML = html;
					} catch (e) {
						// console.error(e);
					}
	
				}
				if (attributes) {
					hope.mixinToNode(it, attributes);
				}
				if (parent) {
					parent = hope.byIdOrTag(parent);
					if (parent) {
						parent.appendChild(it);
					}
				}
			} catch (e) {
				console.error(e);
				// throw(e);
			}
			return it;
		},
		
		reparentList : function(parent, list) {
			if (!list || list.length == 0) return;
			// make list a static array so it doesn't change on us
			list = hope.sliceArgs(list, 0);
	
			// special case if we're dealing with tables and rows
			//	make the parent the TBODY (creating one if necessary)
			// TODO: TDs?
			if (parent.tagName == "TABLE" && list[0].tagName == "TR") {
				var body = parent.getElementsByTagName("TBODY")[0];
				if (!body) {
					body = hope.createElement("TBODY", null, parent);
				}
				parent = body;
			}
	
			for (var i = 0; i < list.length; i++) {
				parent.appendChild(list[i]);
			}
		},
		
		// TODO tables and rows
		reparentListBefore : function(beforeWhat, list) {
			var parent = beforeWhat.parentNode;
			// make list a static array so it doesn't change on us
			list = hope.sliceArgs(list, 0);
			for (var i = 0; i < list.length; i++) {
				parent.insertBefore(list[i], beforeWhat);
			}
		},
		
		mixinToNode : function(element, props) {
			if (!props) return;
			for (var name in props) {
				if 		(name == "style") 							hope.setStyle(props[name], element);
				else if (name == "class" || name == "className") 	element.className = props[name];
				else												element.setAttribute(name, props[name]);
			}
		},
		
		// TODO: add more here?
		_visibleDisplaysForTags : {
			TD		: "table-cell",
			TR		: "table-row",
			SPAN	: "inline"
		},
		show : function(node, state) {
			if (!node || !node.style) return;
			if (state != false) {
				node.style.display = (hope._visibleDisplaysForTags[node.tagName] || "block");
			} else {
				node.style.display = "none";
			}
		},
		
		hide : function(node) {
			if (!node || !node.style) return;
			node.style.display = "none";
		},
		
		// set properties of the style passed in individually
		_styleRE : /^\s*([\w-]+)\s*:\s*(.*)/,
		setStyle : function(styles, element) {
			if (typeof element == "string") element = hope.byId(element);
			if (!element) return;

			styles = styles.split(";");
			for (var i = 0; i < styles.length; i++) {
				var styleMatch = styles[i].match(hope._styleRE);
				if (styleMatch) {
					element.style[hope.toCamelCase(styleMatch[1])] = styleMatch[2];
				}
			}
		},

		// convert a "hyphenated-string" to camel case, eg "hyphenatedString"
		//	(note: caches previous results, so fairly efficient)
		toCamelCase : function(name) {
			if (hope._camelCased[name]) return hope._camelCased[name];
			return (hope._camelCased[name] = name.replace(hope._camelCaseRE, hope._camelCaser));
		},
		_camelCaseRE : /-(\w)/g,
		_camelCaser : function(match){return match[1].toUpperCase()},
		_camelCased : {},
	
		 setOuterHTML : function (tag, htmlString) {
			if (tag.outerHTML) {
				// IE. opera? safari?
				tag.outerHTML = htmlString;
			} else {
				// moz. others?
				var range = tag.ownerDocument.createRange();
				range.setStartBefore(tag);
				var df = range.createContextualFragment(htmlString);
				tag.parentNode.replaceChild(df, tag);
			}
		},
		
		// attributes to skip when calling getTagAttributes
		_skipAttributes : {
			id:true
		},
		// TOCHECK: is this Moz-specific?
		getTagAttributes : function(element, object, _skipAttributes) {
			object = object || {};
			_skipAttributes = _skipAttributes || this._skipAttributes;
			var attributes = element.attributes;
			for (var i = 0, len = attributes.length; i < len; i++) {
				var prop = attributes[i].nodeName;
				if (!_skipAttributes[prop]) object[prop] = attributes[i].nodeValue;
			}
			return object;
		},
	
		// insert a bunch of javascript into the document as a script tag, which makes it live
		insertScript : function(scriptText, properties) {
			var node = document.createElement("script");
			node.innerHTML = scriptText;
			if (properties) {
				for (var name in properties) {
					node.setAttribute(name, properties[name]);
				}
			}

			var parent = hope.byTag("BODY")[0] || hope.byTag("HEAD")[0];
			parent.appendChild(node);
		},
	
	
		// create a stylesheet element and set its ruleset to text
		//	attributes are any attributes you want to place on it
		insertStylesheet : function(text, attributes) {
			if (!attributes) attributes = {};
			if (!attributes.type) attributes.type = "text/css";
			var sheet = this.createElement("STYLE", (hope.isIE ? null : text), (hope.byTag("HEAD")||hope.byTag("HTML"))[0], attributes);
	
			// LAME-O:  you need to set css text in a special way in IE
			if (hope.isIE) {
				// get the last sheet in the document (which is hopefully the one we just added...)
				// TODO: loop through the stylesheets to make sure we have the right one
				sheet = document.styleSheets[document.styleSheets.length-1];
				sheet.cssText = text;
			}
			return sheet;
		},
	
	
		//
		//	event handling
		//
	
		// stop propagation of a browser event
		stopEvent : function(domEvent) {
			if (domEvent && domEvent.stopPropagation) domEvent.stopPropagation();
			return false;
		},
	
		
		//
		//	listen/stop listening for events on any object that supports "addEventListener" interface
		//
		
		// NOTE: event = "click" OR "onclick", doesn't matter
		listenFor : function(what, event, method, capture) {
			// NOTE: capture phase does not work in IE...?
			var it = hope.byIdOrTag(what);
			if (!it || !it.addEventListener) throw(hope._error(arguments,"'",what,"' not found"));
			if (event.indexOf("on") == 0) event = event.substring(2);
			it.addEventListener(event, method, capture == true);
		},
	
		// NOTE: event = "click" OR "onclick", doesn't matter
		stopListeningFor : function(what, event, method, capture) {
			// NOTE: capture phase does not work in IE...?
			var it = hope.byIdOrTag(what);
			if (!it || !it.addEventListener) throw(hope._error(arguments,"'",what,"' not found"));
			if (event.indexOf("on") == 0) event = event.substring(2);
			it.removeEventListener(event, method, capture == true);
		},
	
		
		//
		// listen for/fire events that we make up on this object
		//
		
		// add an event listener to this (for events we make up for this object)
		// NOTE: event = "click" OR "onclick", doesn't matter
		addEventListener : function(event, method) {
			event = (event.indexOf("on") == 0 ? event : "on"+event).toLowerCase();
			if (!this._eventListeners) this._eventListeners = {};
			if (!this._eventListeners[event]) this._eventListeners[event] = [];
			var list = this._eventListeners[event];
			if (list.indexOf(method) == -1) list.push(method);
		},
		
		// NOTE: event = "click" OR "onclick", doesn't matter
		removeEventListener : function(event, method) {
			if (!this._eventListeners) return;
			event = (event.indexOf("on") == 0 ? event : "on"+event).toLowerCase();
			this.removeItem(this._eventListeners[event], method);
		},
		
		// NOTE: event = "click" OR "onclick", doesn't matter
		fireEvent : function(event, args) {
			if (!this._eventListeners) return;
			event = (event.indexOf("on") == 0 ? event : "on"+event).toLowerCase();
			var list = this._eventListeners[event.toLowerCase()];
			if (list) {
				if (arguments.length == 1) {
					args = [];
				} else if (arguments.length > 2) {
					args = this.sliceArgs(arguments,1);
				} else if (args.length === undefined) {
					args = [args];
				}
				for (var i = 0; i < list.length; i++) {
					list[i].apply(this, args);
				}
			}
			return true;
		},
	
	
		//
		//	helper functions
		//
		
		
		objectIsEmpty : function(object) {
			if (!object) return true;
			for (var prop in object) {
				return false;
			}
			return true;
		},
	
	
		mixin : function(object, props1, props2, etc) {
			for (var i = 1, props, name; i < arguments.length; i++) {
				if (props = arguments[i]) {
					if (typeof props == "object" && props.constructor != "Array") {
						for (name in props) {
							object[name] = props[name];
						}
					}
				}	
			}
		},
	
		mixinToThis : function(props1, props2, etc) {
			for (var i = 0, props, name; i < arguments.length; i++) {
				if (props = arguments[i]) {
					if (typeof props == "object" && props.constructor != "Array") {
						for (name in props) {
							this[name] = props[name];
						}
					}
				}	
			}
		},
		
		// mix arguments 2..N into object, hooking up getters and setters if defined
		//	NOTE: this is slower, really most useful for class creation but YMMV
		mixinWithGetters : function(object, props1, props2, etc) {
			return hope.mixinToThisWithGetters.apply(object, hope.sliceArgs(arguments, 1));
		},

		// mix arguments 1..N into this object, hooking up getters and setters if defined
		//	NOTE: you will generally apply this...
		mixinToThisWithGetters : function(props1, props2, etc) {
			for (var i = 0, props, name; i < arguments.length; i++) {
				if (props = arguments[i]) {
					if (typeof props == "object" && props.constructor != "Array") {
						for (name in props) {
							var getter = props.__lookupGetter__(name),
								setter = props.__lookupSetter__(name)
							;
							if (!getter && !setter) {
								this[name] = props[name];
								continue;
							}
							if (getter) this.__defineGetter__(name, getter);
							if (setter) this.__defineSetter__(name, setter);
						}
					}
				}	
			}
		},

		
		// merge second "props" into "object"
		//  -- difference from mixin() is that if object[prop] && props[prop] are both objects,
		//			object[prop] will have props[prop] mixed in to it rather than replacing
		merge : function(object, props) {
			if (!object || !props) return;
			for (var prop in props) {
				if (typeof object[prop] == "object" && typeof props[prop] == "object") {
					hope.mixin(object[prop], props[prop]);
				} else {
					object[prop] = props[prop];
				}
			}
		},
	
		// combine a series of arrays into a single array
		combineArrays : function(toArray, fromArray1, fromArray2, etc) {
			for (var i = 1; i < arguments.length; i++) {
				toArray = Array.prototype.concat.apply(toArray, arguments[i]);
			}
			return toArray;
		},

		// add items in array WHICH DO NOT ALREADY EXIST IN TOARRAY to toArray
		addUniquely : function(toArray, fromArray) {
			if (fromArray && fromArray.length > 0) {
				for (var i = 0, len = fromArray.length; i < len; i++) {
					var what = fromArray[i];
					if (toArray.indexOf(what) == -1) toArray.push(what);
				}
			}
			return toArray;		
		},
	
		// remove all null items from the array (in-place, using splice)
		unemptyArray : function(array) {
			if (!array) return;
			for (var i = 0, len = array.length; i < len; i++) {
				if (array[i] == null) array.splice(i, 0);
			}
			return array;
		},
	
		// return the first item in an array where item[prop] == value
		fromArrayWhere : function(array, prop, value) {
			if (!array || !prop) return;
			for (var i = 0, len = array.length, it; i < len; i++) {
				it = array[i];
				if (it && it[prop] == value) return it;
			}
		},
		
		// given an object and a particular value, return the first prop of object that has that value
		getPropertyName : function(object, value) {
			for (var prop in object) {
				if (object[prop] == value) return prop;
			}
			return;
		},
	
		// get a named set of properties from source and add to dest
		//	overwrite defaults to true
		getNamedProps : function(source, propList, dest, overwrite) {
			dest = dest || {};
			overwrite = (overwrite != false);
			for (var i = 0, len = propList.length, prop; i < len; i++) {
				prop = propList[i];
				if (typeof source[prop] != "undefined" && (!overwrite || typeof dest[prop] == "undefined")) {
					dest[prop] = source[prop]; 
				}
			}
			return dest;
		},
		
		// slice a function arguments array from index to the end
		sliceArgs : function(args, start, end) {
			return Array.prototype.slice.call(args, start || 0, end || args.length);
		},
	
		// splice arguments array (same semantics as array.splice) and return as an array
		spliceArgs : function(args, start, howMany, item1, item2, etc) {
			// convert args to an array
			args = Array.prototype.slice.call(args, start);
			// convert arguments to this function to an array, minus the args parameter
			var spliceArgs = Array.prototype.slice.call(arguments, 1);
			// now splice the arguments to this function in!
			args.splice.apply(args, spliceArgs);
			return args;
		},
		
		// TOCHECK: not sure this is right...
		// call a method on each item of an array, with arguments
		//	NOTE: "method" can be a function or name of a method on "this"
		forEach : function(array, method, arg1, arg2, etc) {
			if (!array) return null;
			if (typeof method == "string") method = this[method];
			if (!method) throw new Error(this._error(arguments,"no method provided"));
			
			var results = [],
				args = hope.sliceArgs(arguments,1)
			;
			for (var i = 0, len = array.length; i < len; i++) {
				results[i] = method.apply(array[i], args);
			}		
			return results;
		},
		
		
		// TODO: install in array?
		removeItem : function(array, item) {
			if (!array) return;
			var index;
			while ((index = array.indexOf(item)) != -1) {
				array.splice(index, 1);
			}
			return array;
		},
		
		// given an array, randomize the order of its contents IN PLACE
		shuffle : function(array) {
			var shuffled = [];
			while (array.length > 0) {
				var index = Math.floor(Math.random() * array.length);
				shuffled.push(array[index]);
				array.splice(index, 1);
			}
			for (var i = 0; i < shuffled.length; i++) {
				array[i] = shuffled[i];
			}
			return array;
		},
		
		
		// make a new function in a minimal scope to minimize scope overhead
		makeFunction : function(script, args) {
			if (typeof script == "function") return script;
			return new Function(args||"", script);
		},
		
		// make a function for a conditional (such as enableIf or showIf)
		//	similar to makeFunction, except it add a "return (conditional)" to any simple conditional
		//	a simple conditional is defined as conditional without "var ", ";" or "return" in it
		makeConditionalFunction : function(conditional, args) {
			if (typeof conditional == "function") return conditional;

			if (   conditional.indexOf(";") == -1
				&& conditional.indexOf("var ") == -1 
				&& conditional.indexOf("return ") == -1
			   ) {
				conditional = "return ("+conditional+")";	
			}
			var method = hope.makeFunction(conditional, args);
			alert(method);
			return method;
		},
	
	
		// do a shallow clone of an object, adding properties to it
		//	NOTE: the resulting object will have the source as its prototype!
		clone : function(source, newProps) {
			hope._cloner.prototype = source;
			return new hope._cloner(newProps);
		},
		_cloner : function(props){
			if (props) {
				for (var prop in props) this[prop] = props[prop];
			}
		},
	
	
		trim : function(str) {
			return str.replace(/^\s+|\s+$/g, '');
		},
		
		
		// return the properties of an object (default is this) that are different than their prototype
		// if skipPrivate is true (default), we skip properties that begin with an underscore
		getLocalProperties : function(what, skipPrivate, skipItems) {
			what = what || this;
			skipPrivate = (skipPrivate != false);
			var locals = {},
				proto = what.constructor.prototype
			;
			for (var prop in what) {
				if (what[prop] == proto[prop]) continue;
				if (skipPrivate && prop.charAt(0) == "_") continue;
				if (skipItems && skipItems[prop]) continue;
				locals[prop] = what[prop];
			}
			return locals;
		},
		
		
		//
		//	debugging
		//
	
		// generate an error given function arguments and one or more message strings
		//	start of message is the call signature of the function in arguments
		//	end of the message is the 
		_error : function(args, message1, message2, etc) {
			var message = hope.sliceArgs(arguments, 1);
			var method = args.callee;
			if (method) {
				var name = (this.getId ? this.getId() : this.Class) || "hope";
				var methodName = hope.method.getName(method) || hope.getPropertyName(this, method) || "anonymous";
				var methodArgs = hope.method.getArguments(method).split(",");
				for (var i = 0; i < methodArgs.length; i++) {
					var param = ""+args[i];
					if (param.length > 30) param = param.substring(0,30)+"...";
					if (typeof args[i] == "string") param = '"'+param+'"';
					methodArgs[i] = methodArgs[i] + ":" + param;
				}
				
				method = " :: error in:: " + name + "." + methodName + "(" + methodArgs.join(",") + ")";
			} else {
				method = "";
			}
			return message.join("") + method;
		},
		
		// given a function, return different parts of it
		method : {
			getName : function(method) {
				var match = method.toString().match(/^\s*function\s*(\w+)\(/);
				return (match ? match[1] : null);
			},
		
			getSignature : function(method) {
				var match = method.toString().match(/^\s*function\s*(.*?\))/);
				return (match ? match[1] : null);		
			},
	
			getArguments : function(method) {
				var match = method.toString().match(/^.*?\((.*?)\)/);
				return (match ? match[1] : null);		
			}
		},
	
	
		dir : function(object, indent) {
		// TODO: rewrite in one method like objectToHtml, call objectToJSON
		// TODO: take "includeUnderscoreItems" param?
			if (indent == null) indent = "";
			if (object.constructor == Array) return hope.valueToHtml(object, indent);
			var output = [];
			output.push("{\n");
			for (var prop in object) {
				if (prop.charAt(0) == "_") continue;
				var it = object[prop];
				if (typeof it == "function") continue;
		
				output.push(indent, "    ", prop, " : ", hope.dirValue(it, indent), "\n");
	
			}
			output.push(indent, "}");
			return output.join("");
		},
		
		dirValue : function(it, indent) {
			if (it == null) return "null";
	
			switch (typeof it) {
				case "function":	return null;
				
				case "number":
				case "string":
				case "boolean":
					return it;
				
				case "object":
					if (it.constructor == Array) {
						var output = [];
						for (var i = 0; i < it.length; i++) {
							output.push(hope.dirValue(it[i], indent+"    "));
						}
						return "[\n"+indent+"        "+output.join(",\n"+indent+"        ") + "\n"+indent+"    ]";
					} else {
						return hope.dir(it, indent+"    ");
					}
			}
		},
		
		objectToHtml : function(it, indent) {
		// TODO: adds indent to first level
		// TODO: take "includeUnderscoreItems" param?
			if (indent == null) indent = "";
	
			switch (typeof it) {
				case "function":	return null;
				
				case "number":
				case "string":
				case "boolean":		return it;
				
				case "object":
					var output = [];
					if (it.constructor == Array) {
						var output = [];
						for (var i = 0; i < it.length; i++) {
							output.push(hope.objectToHtml(it[i], indent+"    "));
						}
						return "\n"+indent+"        "+output.join("\n"+indent+"        ");
	
					} else {
						var type = (it.type || "object");
						output.push("<",type);
						var childOutput = [];
						for (var prop in it) {
							var value = it[prop];
	
							// skip properties that start with underscore...
							if (prop.charAt(0) == "_") continue;
							if (typeof value == "function") continue;
							if (prop == "type") continue;
							
							if (prop == "value") {
								childOutput.push(value);
							} else {
								if (typeof value == "object") {
									if (value.constructor == Array) {
										childOutput.push("\n",indent,"        <", prop,">");							
									}
									childOutput.push(hope.objectToHtml(value, indent + "    "));
									if (value.constructor == Array) {
										childOutput.push("\n",indent,"        </", prop,">\n",indent,"    ");
									}
								} else {
									output.push(" ",prop,"=\"",value,"\"");
								}
							}
						}
						if (childOutput.length == 0) {
							output.push("/>");
						} else {
							output.push(">", childOutput.join(""),"</",type,">");
						}
					}
					return output.join("");
			}
			return "UNKNOWN TYPE "+typeof it;
		},
		
		// TODO: - make this distinguish between start and end tags
		//		 - color attribute names
		//			
		htmlStringToPre : function(html) {
			return "<htmlpre>" + html.replace(/<([\/\w]*?)(\s+.*?)?>/g, "<tag>&lt;$1</tag><attr>$2</attr><tag>&gt;</tag>") + "</htmlpre>";
	//		return html.split("<").join("___TAGSTART___&lt;").split(">").join("&gt;___TAGEND___")
	//				   .split("___TAGSTART___").join("<tag>").split("___TAGEND___").join("</tag>")
		}
	};
})();
	
	
//==========
//	hope.xhr
//==========
(function(){
	// dead simple x-platform XHR object
	//		hope.getUrl(url, asXML) or
	//		hope.getUrls(url1, url2, etc)	-- alwasy returns text
	hope.mixinToThis({
		SYNCHRONOUS : false,
		ASYNCHRONOUS : true,
		
		getXHRObject : function() {
			var methods = [
				function(){return new XMLHttpRequest()}, 					// all except IE
				function(){return new ActiveXObject('Msxml2.XMLHTTP')},		// different versions of IE
				function(){return new ActiveXObject('Microsoft.XMLHTTP')},
				function(){return new ActiveXObject('Msxml2.XMLHTTP.4.0')}
			];
			for (var i = 0, xhrMethod; xhrMethod = methods[i++];) {
				try {
					var xhr = xhrMethod();
					// It worked! Replace the "get" function with the correct one and return the XHR.
					hope.getXHRObject = xhrMethod;
					return xhr;
				} catch (e) {}
			}
			throw new Error("getXHRObject: Could not get XHR object for this browser");
		},
	
		// TODO: re-use XHR objects?
	
		// quick hacky synchronous load, throws an error if file not found, etc
		getFile : function(url, data) {
			var xhr = hope.getXHRObject();
			xhr.open("GET", hope.Location.expand(url), hope.SYNCHRONOUS);
			xhr.send(data);
			return xhr.responseText;
		},


		// quick hacky synchronous load, throws an error if file not found, etc
		getXML : function(url, data) {
			var xhr = hope.getXHRObject();
			xhr.open("GET", hope.Location.expand(url), hope.SYNCHRONOUS);
			xhr.send(data);
			return xhr.responseXML;
		},


		appendXML : function(url, data, tagName) {
			try {
				var parent = hope.byTag("hope")[0] || hope.createElement({tag:"hope", parent:"BODY"}),
					xmlDoc = hope.getXML(hope.Location.expand(url), data)
				;
				if (xmlDoc) {
					var kid = xmlDoc.firstChild;
				} else {
					var kid = hope.createElement(tagName);
				}
				parent.appendChild(kid);
				return kid;
			} catch (e) {	
				console.error(e)
			}
		},

		serializeXML : function(parent) {
			return (new XMLSerializer()).serializeToString(hope.byId(parent)).replace(/ _moz-userdefined=""/gm,"");
		},
		
		
		// if you provide a loadCallback, call is asynchronous
		//	no load callback == synchronous
		//	always returns the data as text
		//
		//	TODO:  make this actually work with response states, etc
		loadUrl : function(url, data, loadCallback, errorCallback) {
			var async = (loadCallback ? hope.ASYNCHRONOUS : hope.SYNCHRONOUS);
			var xhr = hope.getXHRObject();
			xhr.open("GET", hope.Location.expand(url), async);
			if (loadCallback) {
				xhr.onload = function() {
					if (xhr.readyState == 4) {
						loadCallback(xhr.responseText);
					}
					// TODO: handle error states in here
				}
			}
			try {
				xhr.send(data);
				if (async == hope.SYNCHRONOUS) {
					return xhr.responseText;
				} else {
					return xhr;
				}
			} catch (e) {
				if (errorCallback) errorCallback();
			}
			
		},
		
		// asynchronous load of a URL into the innerHTML of an element
		//	TODO: parse this after the load ???
		//	TODO: loading messages from templates or message dicts?
		// EN: load url into element [in background] [with [loading message "foo"] [and] [error message "bar"]]
		loadIntoElement : function(element, url) {
			element.innerHTML = "Loading...";
	
			var xhr = hope.getXHRObject();
			xhr.open("GET", hope.Location.expand(url), hope.ASYNCHRONOUS);
			xhr.onload = function() {
				if (xhr.readyState == 4) {
					element.innerHTML = xhr.responseText
				}
			}
			try {
				xhr.send(null);
			} catch (e) {
				element.innerHTML = "Error loading page "+url;
			}
		},
		
		// simple, synchronous load of many files
		getFiles : function(url1,url2,etc) {
			var text = [];
			for (var i = 0; i < arguments.length; i++) {
				try {
					if (arguments[i]) text.push(hope.getFile(arguments[i]));
				} catch (e) {
					console.error("XHR.getUrls(): could not load ", arguments[i], " :: ", (e.name||e.message));
					//throw(e);
				}
			}
			return text.join("\n");
		},
		
		
		// USE???
		resolveRelativeUrl : function(url, baseUrl) {
			// relative url?
			var urlHash = hope.parseUrl(url);
			if (urlHash.protocol == "" || urlHash.pathname.charAt(0) != "/") {
				if (baseUrl == null) baseUrl = hope.global.location.href;	// PEERING
				var baseHash = hope.parseUrl(baseUrl);
				url = [
						baseHash.protcol,
						(baseHash.protcol ? "://" : ""),
						baseHash.host,
						baseHash.path,
						urlHash.pathname
					].join("");
			}
			return url;
		},
		
		
		//
		//	parsing routines
		//
		
		// tupelize -- split a string:   foo=bar&bar=blah   into an object { foo:"bar", bar:"blah" }
		tupelize : function(string, argDelimiter, propertyDelimiter) {
			var results = {};
			if (string) {
				argDelimiter = argDelimiter || "&";
				propertyDelimiter = propertyDelimiter || "=";
				var list = string.split(argDelimiter);
				for (var i = 0; i < list.length; i++) {
					list[i] = list[i].split(propertyDelimiter);
					results[list[i][0]] = list[i][1];
				}
			}
			return results;
		},

	
		// NOTE: does not currently handle nested tags!
		getTagsInText : function(text, tagName) {
			var tagRE = new RegExp("<"+tagName+"([\\s\\S]*?)>([\\s\\S]*?)</"+tagName+">","gi");
			var match, matches = [];
			var start = 0;
			while (match = tagRE(text)) {
				matches.push( {
					start : tagRE.lastIndex - match[0].length,
					end	: tagRE.lastIndex,
					tagName : tagName,
					outerHTML : match[0],
					innerHTML : match[2],
					attributes : hope.parseAttributeString(match[1])
				})
			}
			return matches;
		},
		
		getInnerHTMLForTextTags : function(text, tagName) {
			var tagRE = new RegExp("<"+tagName+"[\\s\\S]*?>([\\s\\S]*?)</"+tagName+">","gi");
			var match, matches = [];
			while (match = tagRE(text)) {
				matches.push(match[1]);
			}
			return matches;
		},
		
		
		ATTRIBUTES_RE		: /(\w+)=(((['"])[^'"]+\2)|(\w+))/gm,
		ATTRIBUTE_RE		: /(\w+)=['"]?(.+$)/,
	
		parseAttributeString : function(attrString, object) {
			object = object || {};
			var attrs = attrString.match(hope.ATTRIBUTES_RE);
			if (attrs) {
				for (var i = 0, attr; attr = attrs[i++]; ) {
					var match = attr.match(hope.ATTRIBUTE_RE)
					object[match[1]] = match[2];
				}
			}
			return object;
		},
		
		trim : hope.trim,
		
		SPACE_AFTER_TAG_RE : />[\s\n]+</g,
		SPACE_BEFORE_TAG_END_RE : /[\s\n]+>/g,
		trimSpaceAfterTags : function(str) {
			return  this.trim(str)
						.replace(this.SPACE_AFTER_TAG_RE, "><")
						.replace(this.SPACE_BEFORE_TAG_END_RE, ">")
		},
		
		RETURN_MARKER : "EOL",
		
		RETURNS_RE	: /(\s*\n\s*)+/g,
		TOKENIZE_RE : /\s+/g,
		tokenize : function(text) {
			text = this.trim(text);
			// replace return chars with "EOL"
			text = this.trim(text.replace(this.RETURNS_RE, "\n").replace(/\n/g," EOL "));
	
			var tokens = text.split(this.TOKENIZE_RE);
			if (tokens[tokens.length -1] != this.RETURN_MARKER) {
				tokens.push(this.RETURN_MARKER);
			}
			tokens.push("EOF");
			return tokens;
		},
		
		
		// return the first of the regex arguments which is a mach for the string passed in
		firstMatch : function(text, regex1, regex2, etc) {
			for (var i = 1; i < arguments.length; i++) {
				var match = text.match(arguments[i]);
				if (match) return match;
			}
		},
		
		// make a string safe to be included in single quotes
		makeQuoteSafe : function(text) {
			return text.split("'").join("\\'").split("\n").join("\\n");
		},
		
		
		// given a chopped array of strings including unary and binary tags
		//	return a nested array with matching tags as a sub-array.
		//  Unary tags are put in their own subarray.
		//	NOTES: 	DOES NOT HANDLE NESTED TAGS YET
		//			NOT SUPER ROBUST
		matchTags : function(array) {
			throw Error("hope.matchTags() is not implemented");
	//TODO
		},
		
		
		//
		//	"chopping" a string turns it into an array of its sub-strings based on different criteria.  
		//	For the resulting array,  array.join("") == the original string
		//
		//	NOTE: you can pass a single string as "what" or an array of strings which will each be chopped
		//			if the results of the array[i].chop is a single string, output[i] will be that string
		//			otherwise  output[i] will be the resulting chopped array
		//
		//	TODO: 	- convert all callers to pattern of chop()s return an array for the matched things
		//			- chopOnExpressionAndEnd():  should we always include start string in search for end?
		//												(remember   /throw\(/  case)
		//
		chop : function(what, arg1, arg2, includeAsMatches) {
			if (!what) return [];	// TOTHROW?
			if (typeof arg1 == "string" && typeof arg2 == "string") {
				var method = "chopOnToken";
			} else if (typeof arg1 == "function" && typeof arg2 == "function") {
				var method = "chopOnExpressionAndEnd";
			} else if (typeof arg1 == "function" && arg2 == null) {
				var method = "chopOnExpression";			
			} else {
				throw this._error(arguments, "must pass:  2 strings, a single RegExp or two RegExps");
			}
			var method = (typeof arg1 == "string" && typeof arg2 == "string" ? "chopOnToken" : "chopOnExpression");
			if (what.constructor == Array) {
				var output = [];
				for (var i = 0, len = what.length; i < len; i++) {
					var it = this[method].call(this, what[i], arg1, arg2, includeAsMatches);
					output.push(it && it.length == 1 ? it[0] : it);
				}
				return output;
			} else {
				return this[method].call(this, what, arg1, arg2, includeAsMatches);
			}	
		},
		
		// split a string according to a regular expression
		chopOnExpression : function(what, expression, ignore, includeAsMatches) {
			var output = [];
			expression.lastIndex = 0;
			var match = expression.exec(what);
			if (match == null) return [what];
	
			var start = 0,
				end = 0
			;
			while (match) {
				start = expression.lastIndex - match[0].length;
				if (start != end) output.push(what.substring(start, end));
				if (includeAsMatches) {
					output.push(match);
				} else {
					output.push(match[0]);			
				}
				end = expression.lastIndex;
				match = expression.exec(what);
			}
			if (end != what.length) output.push(what.substring(end));
			return output;
		},
	
		chopOnExpressionAndEnd : function(what, chopExpression, endExpression, includeAsMatches) {
			var chopped = hope.chopOnExpression(what, chopExpression);
			for (var i = 0; i < chopped.length; i++) {
				var match = chopExpression.exec(chopped[i]);
				if (!match) continue;
				var nextChop = chopped[i+1] || "";
				var end = hope.findEnd(nextChop, endExpression);
				if (end != -1) {
					if (includeAsMatches) {
						// TODO: separate out the end ?
						chopped[i] = [chopped[i], nextChop.substring(0, end)];
					} else {
						chopped[i] = chopped[i] + nextChop.substring(0, end);
					}
					chopped[i+1] = nextChop.substring(end);
				}
			}
			return chopped;
		},
		
	
	
	
		// chop a string into an array
		//	where each entry is either a literal string
		//	or a single token (including the tokenStart and tokenEnd)
		// NOTE: TOKENS ARE NOT NESTABLE
		chopOnToken : function(what, tokenStart, tokenEnd) {
			var output = [];
			if (what.indexOf(tokenStart) == -1) return [what];
			
			var output = [],
				len = what.length
			;
			for (var i = 0, n; i < len; i++) {
				n = what.indexOf(tokenStart, i);
				if (n == -1) break;
				if (n > i) output.push(what.substring(i,n));
				i = what.indexOf(tokenEnd,n);
				if (i == -1) break;
				output.push(what.substring(n,i+1));
			}
			var last = what.substring(what.lastIndexOf(tokenEnd)+1);
			if (last) output.push(last);
			return output;	
		},
		
		// tag defined as "<...>"
		// NOTE: returns start tags and end tags as separate
		chopOnTags : function(what) {
			return this.chopOnToken(what, "<", ">");
		},
		
		
		START_PARENS : ["[","{","("],
		START_PAREN_RE : /[[{(]/g,
		END_PARENS : ["]", "}", ")"],
		END_PAREN_RE : /[\]})]/g,
		
		// return the first occurance of endRE in string starting at start (default start == 0)
		//	skipping any endRE's inside nested START_ and END_PARENS above
		//	NOTE: only works if your nesting is valid, eg: fails on "({))"
		//  NOTE: doesn't handle quotes yet
		findEnd : function (string, endRE, start) {
			if (string == null) return -1;
			if (start == null) start = 0;
			endRE.lastIndex = start;		
	
			// I THINK (true) IS OK BECAUSE end IS ALWAYS ADVANCING...
			while (true) {	//(confirm(start + ":" + end + ":" + string.substring(start,end)+":?")) {
				var results = endRE.exec(string);
				if (!results) return -1;
		
				// ok, we maybe have a match
				//	 NOTE:  the +1 there is ONLY if the end token is one of our paren symbols!  (???)
				var end = results.index + results[0].length;
				var potentialMatch = string.substring(start, end);
	
				// see if there are any start parens inside the matched bit
				var startParenMatches = potentialMatch.match(this.START_PAREN_RE);
	
				if (!startParenMatches) return end;
		
				// there are some start parens
				// see how many ends there are
				var endParenMatches = potentialMatch.match(this.END_PAREN_RE);
	
				if (!endParenMatches) continue;
	
				// if the count matches, assume we're balanced
	// NOTE:  TOO SIMPLE -- will fail on "({))" (which not legal for balanced, but whatever...
				if (endParenMatches.length == startParenMatches.length)  return end;
			}
			return -1;
		},
		


		//
		//	StringList concept:
		//	
		//	Array of string values separated by separator string
		//	e.g. class names in element.className
		//
		//	list = string list
		//	what = what to check for/add/remove
		//	caseSensitive = hope.IGNORE_CASE (default) or hope.CASE_SENSITIVE
		//	separator = separator for list, default is ","
		
		IGNORE_CASE		: "IGNORE_CASE",
		CASE_SENSITIVE	: "CASE_SENSITIVE",
		
		_ignoreCaseSort : function(a,b) {
			a = (a ? (""+a).toLowerCase() : null);
			b = (b ? (""+b).toLowerCase() : null);
			
			return (a < b ? -1 : a > b ? 1 : 0);
		},
		
		// default is IGNORE_CASE
		indexInStringList : function(list, what, caseSensitive, separator) {
			if (list == null || what == null) return -1;
			what = ""+what;
			if (caseSensitive != hope.CASE_SENSITIVE) {
				list = list.toLowerCase();
				what = what.toLowerCase();
			}
			list = list.split(separator || ",");
			return list.indexOf(what);
		},
		
		// returns new value of list after addition (if what not already there)
		addToStringList : function(list, what, caseSensitive, separator, sort) {
			if (list == null || list == "") return what;
			if (what == null || what == "") return list;
			
			var index = hope.indexInStringList(list, what, caseSensitive, separator);
			if (index != -1) return list;

			if (sort == true) {
				list = list.split(separator || ",");
				list.push(what);
				if (caseSensitive != hope.CASE_SENSITIVE) {
					list.sort(hope._ignoreCaseSort);
				} else {
					list.sort();
				}
				return list.join(separator || ",");
			}
			return list + (separator || ",") + what;
		},
		
		// returns new value of list
		removeFromStringList : function(list, what, caseSensitive, separator) {
			if (list == null || list == "") return list;
			if (what == null || what == "") return what;

			var index = hope.indexInStringList(list, what, caseSensitive, separator);
			if (index == -1) return list;
			
			list = list.split(separator || ",");
			list.splice(index, 1);
			return list.join(separator || ",");
		}

	});
})();

	


//==========
//	hope.Class
//==========

//
//	Class semantics
//

(function() {
	// base object of our class hierarchy
	var Class = hope.Class = function Class(props1, props2, etc) {
		hope.mixinToThisWithGetters.apply(this, arguments);
		this.init();
	}
	
	// create a subclass of a given class
	//	call as:   superclass.createSubclass(constructor,...)
	Class.createSubclass = function (constructor, props, className) {
		var superclass = this;

		// get the className from the function definition if not passed in
		className = className || hope.method.getName(constructor);
		if (!className) throw Error(superclass._error(arguments,"you must pass a named constructor function or a className"));
	
		//
		// set up the constructor
		//
		// add all class methods, etc. from the superclass constructorDefaults
		hope.mixinToThisWithGetters.apply(constructor, [superclass._constructorDefaults]);
		constructor.Class = className;
	
		// set up the _constructorDefaults in the constructor, for creating subclasses
		// NOTE: if the constructor already has a _constructorDefaults, that will be merged with the defaults from the superclass
		constructor._constructorDefaults = hope.clone(superclass._constructorDefaults, constructor._constructorDefaults);
	
		// note the name of the constructor so we can get it back later with hope.getConstructor(name)
		hope.addConstructor(constructor, className);
	
		// create a new prototype, based on the superclass
		if (constructor == Class) {
			// special case for initializing the Class object itself
			var proto = constructor.prototype = (props || {});
		} else {
			var proto = constructor.prototype = new superclass(props);
		}
	
		// set up the prototype
		proto.id = className+"Prototype";
		proto.Class = className;
		
		var isAMethod = (className.search(/^[AEIOUXaeioux]/) == 0 ? "_isAn" : "_isA") + className;
		proto[isAMethod] = true;
		constructor[isAMethod] = true;		// ???
		
		// assign a pointer to the prototype, constructor and super so we can get at them later
		proto._proto = proto;
		proto._super = constructor.prototype;
		proto.constructor = constructor;
	
		// if the contstructor has an "initClass" routine, call that
		if (constructor.initClass) constructor.initClass();
	
		return constructor;
	}
	
	
	// create a singleton object based on this class
	//	This is different than a class in that there is only ever one of these,
	//	but it will implicitly have all of the prototypes methods/props of the superclass.
	//
	//	constructor can be an object or a function.
	//
	//	call as:     superclass.createSingleton(constructor,...)
	Class.createSingleton = function (constructor, props, className) {
		var superclass = this;

		// get the className from the function definition if not passed in
		className = className || hope.method.getName(constructor);
		if (!className) throw Error(superclass._error(arguments,"you must pass a named constructor function or a className"));
	
		//
		// set up the constructor
		//
		// add all class methods, etc. from the superclass constructorDefaults
		hope.mixinToThisWithGetters.apply(constructor, [superclass.prototype, props]);
		constructor.Class = className;
		
		constructor._super = superclass.prototype;
		
		hope.addSingleton(constructor, className);
		
		if (typeof constructor.init == "function") constructor.init();

		return constructor;
	}
	
	
	//	use hope.addConstructor(constructor, className) to add other names for the same class
	//	(eg: for different tag names referencing the same class)
	hope.mixinToThis({
		_constructors : {},
		_classAliases : {},
		_singletons : {},
		getConstructor : function(className) {
			if (className == null) return undefined;
			if (typeof className == "string") return this._classAliases[className.toUpperCase()];
			if (className._isAConstructor) return className;
			//TOTHROW
		},
		// add class names as lower case for fetching back later
		addConstructor : function(constructor, className) {
			this._constructors[className] = constructor;
			this._classAliases[className.toUpperCase()] = constructor;
			hope[className] = constructor;
			// add to global scope (happens in ES4 anyway)
			hope.global[className] = constructor;
		},

		// add class names as lower case for fetching back later
		addSingleton : function(singleton, className) {
			this._singletons[className] = singleton;
			this._classAliases[className.toUpperCase()] = singleton;
			hope[className] = singleton;
			// add to global scope (happens in ES4 anyway)
			hope.global[className] = singleton;
		}

	});
	
	
	// defaults applied to all subclass constructors
	//	To add other class defaults to all of your subclasses, do:
	//			function MyClass(){}
	//			MyClass._constructorDefaults = { other:defaults };
	//			SuperClass.createSubclass(MyClass, ...);
	//	(your constructorDefaults will automatically be merged with the defaults of your superclass).
	//			
	Class._constructorDefaults = {
		createSubclass 		: Class.createSubclass,
		createSingleton		: Class.createSingleton,
		error 				: hope._error,
		mixin 				: hope.mixinToThis,
		_isAConstructor 	: true,
		_instanceCount 		: 1
	}
	
	Class.createSubclass(Class, {
		// defaults for all classes
	
		// generic initializer -- called by convention by subclasses 
		//	immediately after construction and property assignment
		init : function() {},
	
		//
		//	generic class methods
		//
		mixin : hope.mixinToThis,
		mixinWithGetters : hope.mixinToThisWithGetters,
		
		// generate an ID for this item, based on the className name
		generateId : function() {
			if (!this.id || this.id == this._proto.id) {
				 (this.id = (this.constructor.Class + "_" + this.constructor._instanceCount++));
			}
			return this.id;
		},
		
		// used to know that we shouldn't write out an id when saving
		idIsGenerated : function() {
			var idRegex = new RegExp("^"+this.constructor.Class+"_\\d*$");
			return this.id && this.id.search(idRegex) == 0;
		},
		
		// return the properties set only on this object
		// NOTE: set constructor._skipProperties to a map of properties to skip
		// NOTE: automatically skips "id" if it was generated
		getLocalProperties : function() {
			var props = hope.getLocalProperties(this, true, this.constructor._skipProperties);
			if (props.id && this.idIsGenerated()) delete props.id;
			return props;
		},
		
		//
		//	helper methods
		//
	
		// for each item in an array, call this.method(item, arg1, arg2, arg3, etc)
		forEach : hope.forEach,
		
		//
		//	debugging
		//
	
		// return a string to pass to an error object with signature and parameters of the method the error was found in
		_error : hope._error,
		_warn : function() {
			var message = this._error.apply(this, arguments);
			console.warn(message);
		},

		toString : function () {
			return this.constructor.Class + "#" + this.id;
		}
		
	});
})();




//
// 	class Location:  parse and deal with URLs
//	
//	construction:		
//		var it = new hope.Location(<url>[, <baseURL|baseLocation>]);
//
//	 If you pass a baseURL or base Location, relative <urls> will be relative to the base location
//	 If you don't pass a baseURL, relative <urls> will be relative to the top-level page (I think)
//
//	Each location has the following properties:
//		examples are for a location of:		http://server:port/path/to/file.html?p1=v1&p2=v2#hash
//			href    	== http://server:port/path/to/file.html?p1=v1&p2=v2#hash	[dynamic]
//			fullpath	: "",	// == http://server:port/path/to/							[dynamic]
//			protocol	: "",	// == http
//			host		: "",	// == server:port											[dynamic]
//			hostname 	: "",	// == server
//			port		: "",	// == port
//			pathname	: "",	// == /path/to/file.html									[dynamic]
//			path		: "",	// == /path/to/
//			filename	: "",	// == file.html
//			search  	: "",	// == ?p1=v1&p2=v2
//			params		: {},	// == {p1:"v1", p2:"v2"}									[dynamic]
//			hash    	: "",	// == #hash	
//
//	We also have the concept of 'named locations', some of which are initialized automatically.
//		To use, set the url to  "...${<name>}..."
//		Named locations set up automatically:		${hope}		= location of the hope.js file (generally, where hope scripts live)
//													${themes}	= location of our default themes directory
//													${page}		= location of the top-level page the hope.js file was called in
//
//	Once you have a location, you can call:
//	 	var contents = new hope.Location("...").load([<callback>][, <errorCallback>]);
//	To load the contents of that file.  (Currently doesn't cache if called more than once -- should it?)
//	If you pass a callback, the loading will be asynchronous, otherwise it will return the responseText immediately.
//
//	TODO: remove "baseLocation" here since we've got named locations anyway?
//
;(function() {
	function Location(url, baseLocation) {
//		if (url == null) debugger;
		url = Location.expand(url);
		var match = Location.parseUrlRE.exec(url);

		if (!match) {throw(url)}		// TOTHROW?
		if (match) {
			this.protocol	= match[2] || "";				// == http
			this.hostname 	= match[4] || "";				// == server
			this.port		= match[5] || "";				// == port
			this.path		= match[6] || "";				// == /path/to/
			this.filename	= match[7] || "";				// == file.html
			this.search  	= match[8] || "";				// == ?p1=v1&p2=v2
			this.hash    	= match[9] || "";				// == #hash
			
			// remove any double slashes in the path
			this.path = this.path.split("//").join("/");
		}
		// if a base location was passed
		if (baseLocation) {
			if (typeof baseLocation == "string") {
				// INEFFICIENT: store these in case same baseLocation is passed over and over?
				console.warn("creating base location "+baseLocation);
				baseLocation = new hope.Location(baseLocation);
			}
			this.baseLocation = baseLocation;
			// mangle this URL if it is relative to match the baseLocation
			if (this.protocol == "" && this.path.charAt(0) != "/") {
				// relative url
				this.protocol = baseLocation.protocol;
				this.hostname = baseLocation.hostname;
				this.port = baseLocation.port;
				this.path = baseLocation.path + this.path;
			}
		}
		this.path = Location.normalize(this.path, true);
	}
	hope.Class.createSubclass(Location, 	
	// define getters for complex properties
	// TODO:  do this on object init if getters not enabled
	// TODO:  check Safari getter syntax -- does it work with this?
		{
			href    	: "",	// == http://server:port/path/to/file.html?p1=v1&p2=v2#hash	[dynamic]
			fullpath	: "",	// == http://server:port/path/to/							[dynamic]
			protocol	: "",	// == http
			host		: "",	// == server:port											[dynamic]
			hostname 	: "",	// == server
			port		: "",	// == port
			pathname	: "",	// == /path/to/file.html									[dynamic]
			path		: "",	// == /path/to/
			filename	: "",	// == file.html
			search  	: "",	// == ?p1=v1&p2=v2
			params		: {},	// == {p1:"v1", p2:"v2"}									[dynamic]
			hash    	: "",	// == #hash	

			// pass a callback (function) for an asynchronous call
			load		: function(callback, errorCallback) {
				return hope.loadUrl(this.href, null, callback, errorCallback);
			},

			toString 	: function() { return this.href;}
	});

	// TODO: in IE, define these statically in the constructor?
	var proto = Location.prototype;
	proto.__defineGetter__("params", function() {
										return (this._params !== undefined ?
												this._params
											:
												(this._params = hope.tupelize(this.search.substring(this.search.indexOf("?")+1)))
										);
									});
									
	// TODO: cache for efficiency?  especially fullpath?
	proto.__defineGetter__("href", function() 		{	return [this.protocol, (this.protocol ? "://" : ""), this.host, this.path, this.filename, this.search, this.hash].join("");});
	proto.__defineGetter__("fullpath", function() 	{	return [this.protocol, (this.protocol ? "://" : ""), this.host, this.path].join("");	});
	proto.__defineGetter__("host", function() 		{	return this.hostname + this.port;	});
	proto.__defineGetter__("pathname", function()	{	return this.path + this.filename;	});
	
	//
	//	place where we store named locations
	//
	hope.Location._locations = {};
	
	hope.mixin(Location, {
		parseUrlRE : /((?:(\w*):\/\/)(([^\/:]*):?([^\/]*))?)?([^?]*\/)?([^?]*)(\?[^#]*)?(#.*)?/,
		namedDirectoryRE : /\$(?:\{|\%7B)(.*?)(?:\}|%7D)/i,
		
		// register a named directory
		//	you can use this in URLs as:   "some/path/${named}/something/else.html"
		// NOTE: in order for this to work with a directory, pass "/" as the last character
		register : function(name, url) {
			hope.Location._locations[name] = (url._isALocation ? url : new hope.Location(url));
		},

		get : function(name) {
			return hope.Location._locations[name];
		},
	
		expand : function(path, normalize) {
			if (!path) return path;
			// first remove any named directories
			var match;
			while (match = path.match(Location.namedDirectoryRE)) {
				var name = match[1];
				var value = hope.Location._locations[name].fullpath;
				if (value === undefined) {
					console.warn("named location "+name+" not found!");
					value = "";
				}
				path = path.split(match[0]).join(value);
			}
			return Location.normalize(path);
		},
	
		normalize : function normalize(path, endWithSlash) {
			if (!path) return path;
			
			// remove any double-slashes
			// HACKey way to do this -- what's the regex?
			path = path.split("://").join("¥").split("//").join("/").split("¥").join("://");
			
			// now handle any ".." or "." entries
			var path = path.split("/");
			for (var i = 0; i < path.length; i++) {
				var it = path[i];
				if (it == ".") {
					path.splice(i, 1);
					i--;
				} else if (it == "..") {
					path.splice(i-1, 2);
					i-=2;
				}
			}
			path = path.join("/");
			if (endWithSlash && path && path.charAt(path.length-1) != "/") path += "/";
			return path;
		}
	});	
	
	//
	//	set default locations for hope object, the page, standard theme directory, etc
	//

	// get the Location for the script that loaded the hope object
	// NOTE: NAME DEPENDENCY
	var scripts = hope.byTag("SCRIPT");
	for (var i = 0; i < scripts.length; i++) {
		var src = scripts[i].src;
		if (!src) continue;
		if (src.indexOf("/hope") > -1 || src.indexOf("/hope.js") > -1 || src == "hope" || src == "hope.js") {
			Location.register("hope", new hope.Location(src));
			break;
		}
	}
	if (hope.Location._locations.hope === undefined) {
		console.warn("Error: couldn't figure out location of hope script!  This could be bad...");
	}
	
	// get a location for the standard themes directory
	Location.register("themes", new hope.Location("${hope}../themes/"));
	
	
	// get a Location for the outer page we were instantiated in
	Location.register("page", new hope.Location(hope.global.location.href));
	
})();




//==========
//	hope.xpath -- xpath utilities
//==========
(function() {
	//	TODO: 	- most calltypes do not work
	hope.xpath = {
		get : function(parent, path, resultType, separator) {
			parent = hope.byIdOrTag(parent);
			try {
				if (resultType == null) resultType = XPATH.VALUE;
				var results = document.evaluate(path, parent, null, resultType.callType, null);
				return resultType.formatter(results, separator);
			} catch (e) {
				console.error(e);
				console.dir(results);
//HACK
				hope.global.results = results;
			}
		},

		//
		//	different xpath evaluation techniques
		//

		ITERATOR : {
			name : "ITERATOR",
			callType : XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
			formatter : function(results, separator) {}
		},

		FIRST : {
			name : "FIRST",
			callType : XPathResult.FIRST_ORDERED_NODE_TYPE,
			formatter : function(results, separator) {}
		},

		ELEMENTS : {
			name : "ELEMENTS",
			callType : XPathResult.ORDERED_NODE_ITERATOR_TYPE,
			formatter : function(results, separator) {
				var list = [];
				for (var i = 0; i < results.snapshotLength; i++) {
					list[i] = results.snapshotItem(i);
				}			
			}
		},

		VALUE : {
			name : "VALUE",
			callType : XPathResult.FIRST_ORDERED_NODE_TYPE,
			formatter : function(results, separator) {
				return results.singleNodeValue.innerHTML;
			}
		},

		VALUES : {
			name : "VALUES",
			callType : XPathResult.ORDERED_NODE_ITERATOR_TYPE,
			formatter : function(results, separator) {
				var list = [], next;
				while (next = results.iterateNext()) list.push(next.innerHTML);
				return list;
			}
		},

		// returns "" if path not found
		STRING : {
			name : "STRING",
			callType : XPathResult.STRING_TYPE,
			formatter : function(results, separator) {	return results.stringValue;	}
		},

		// note: returns NaN if path not found or can't coerce to a number
		NUMBER : {
			name : "NUMBER",
			callType : XPathResult.NUMBER_TYPE,
			formatter : function(results, separator) {	return results.numberValue;	}
		},
		
		// note: returns false if path not found
		BOOLEAN : {
			name : "BOOLEAN",
			callType : XPathResult.BOOLEAN_TYPE,
			formatter : function(results, separator) {	return results.booleanValue; }
		}
	}		
})();




//
// FriendlyError -- error with message that can be surfaced to the user
//
function FriendlyError() {
	this.message = hope.sliceArgs(arguments).join(" ");
}
FriendlyError.prototype = new Error();





//==========
//	hope.js -- bootstrapping (must be done after hope.Location is defined so "${hope}..." makes sense)
//==========
(function() {

	//
	//	bootstrapping:
	//

	//
	//	include the other hope files
	//
//	hope.include("${hope}/Template.js");
//	hope.include("${hope}/SmartJS.js");

	// TODO: currently ClassParser loads the default classes -- move this to an app-specific declaration?


	//
	// set up top-level browser events which call into the hope object
	// TODO: other events?  unload?
	//
	hope.setUpGlobalEvents = function() {		// PEERING
		// "onload" event 
		//	NOTE: uses special DOMContentLoaded event, supported in FF2/Webkit3
		// 		  MSIE needs special method for this see: http://dean.edwards.name/weblog/2006/06/again/ 
		hope.listenFor("document", "DOMContentLoaded", function(event){	hope.fireEvent("onload", event)});


		//
		//	bootstrap stuff to do when the page has loaded
		//
		hope.listenFor("hope", "onload", function(){	
			// initialize the includes list with all of the SCRIPT tags in the page (so we don't load 'em again)
			hope._initScriptTagIncludes();
			hope._pageHasLoaded = true;	
		});

		// set up resize event
		hope.listenFor("window", "resize", function(event) { hope.fireEvent("onresize", event) });
	}
	hope.setUpGlobalEvents();
})();


