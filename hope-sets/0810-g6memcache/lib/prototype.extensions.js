var undefined;
Class.include = function(path) {};

// add the name of the browser to the HTML as a class so we can do custom css per browser
// HTML tag will have one of the following classes:   "IE", "Gecko", "Webkit", "MobileSafari", "Opera"
(function() {
	var HTML = $$('HTML')[0];
	for (var browserName in Prototype.Browser) {
		if (Prototype.Browser[browserName]) {
			HTML.className += " " + browserName;
		}
	}
})();


//
//	DEBUGGING -- make sure console and its various methods are defined
//
if (!window.console) {
	window.console = {};
}
//$w("log info warn error debug time timeEnd group groupEnd dir").each(function(name) {
//	if (!console[name]) console[name] = function(){};
//});

$w(" time timeEnd group groupEnd dir").each(function(name) {
	if (!console[name]) console[name] = function(){};
});
$w("log info warn error debug").each(function(name) {
    if (!console[name]) console[name] = function(s){alert(s);};
});




//
// Array methods
//
if (!Array.prototype.forEach) {
    Array.prototype.forEach = Array.prototype.each;
}

// remove all occurances of it from this array
//	returns the original array
Array.prototype.remove = function(it) {
	for (var i = this.length-1; i >= 0; i--) {
		if (this[i] == it) this.splice(i, 1);
	}
	return this;
}



//
//	Object extension methods
//
// parse style attribute string
Object.extend(Object, {
	protoClone : function(what) {
		function cloner(){};
		cloner.prototype = what;
		var clone = new cloner();
		clone.constructor = what.constructor;
		return clone;
	},

	parseStyles : function(string) {
		var styles = {},
			split = string.split(";")
		;
		split.each(function(style) {
			style = style.split(":");
			if (style.length == 2) styles[style[0]] = style[1];
		});
		return styles;
	}
});

Object.dereference = function(object, path) {
	path = path.split(".");
	for (var i = 0, key; key = path[i++];) {
		object = object[key];
		if (!object) return;
	}
	return object;
}


// add an outerHTML setter to Mozilla, which is the only browser we support
//	that doesn't have it.  From: http://code.gibney.org/outerhtml/
if (Prototype.Browser.Gecko) {
	HTMLElement.prototype.__defineSetter__("outerHTML", function(html) {
		var newRange = this.ownerDocument.createRange();
		newRange.setStartBefore(this);
		var smallBit = newRange.createContextualFragment(html);
		this.parentNode.replaceChild(smallBit, this);
		return html;
	});
}



//
//	Utility methods
//

// similar to $w, but will return an Array passed in (rather than returning [] for an array)
//	and you can pass a custom delimiter (String or RegExp) if you want
function $split(it, delimiter) {
	if (typeof it == "string") {
		it = it.strip();
		if (delimiter == null) delimiter = /\s+/;
		return it ? it.split(delimiter) : [];
	}
	if (Object.isArray(it)) {
		return it;
	}
	return [];
}



Object.extend(Ajax, 
{
	debugInclude : false,
	
	// Include a script file and perform callback when it is complete
	//
	// TODO: allow them to pass a callback
	// TODO: allow multiple paths (and perform callback once when all are loaded)
	// TODO: how to know if we got a 404?
	//			wait a bit and check the script.innerHTML for string "404"  ???
	includeScript : function(path, immediate) {
		var callback;
		
		// NOTE: this is not safe!
		//	the script may be present but not completed yet...
		if (Ajax.pathAlreadyLoaded("script", path)) {
if (Ajax.debugInclude) console.info("<<<< includeScript:  ",path," is already loaded <<<<");
			return true;
		}

if (Ajax.debugInclude) {
	console.info(">>>> loading ",path, " >>>>");
	callback = function(){console.info("<<<< done loading ",path,"<<<<")};
}

		if (immediate == true) {
			function errback(request, error) {
				console.error("**** Error loading '"+path+"': ", e);
			}
			
			new Ajax.Request(path, {
				method : "GET",
				asynchronous : false,
				onException : errback,
				onFailure : errback,
				onSuccess : function loadSucceeded(request, evalJS) {
					try {
						var script = request.responseText;
						eval(script);
						if (callback) callback();
					} catch (e) {
						errback(null, e);
					}
				}
			});
		
		} else {
			try {
				var script = new Element("script", {src:path, type:"text/javascript"});
				if (callback) {
					if (Prototype.Browser.IE) {
						script.onreadystatechange = function readyStateChange() {
							if (script.readyState == "loaded" || script.readyState == "complete") {
								callback();
							}
						}
					} else {
						script.onload = callback;
					}
				}
				($$("HEAD")[0] || $$("HTML")[0]).appendChild(script);
			} catch (e) {
				errback(null, e);
			}
		}
		return false;
	},

	// return a tag with a particular src
	tagForSrc : function(tag, path, exact) {
		if (exact == true) {
			return $$(tag+"[src="+path+"]")[0];
		} else {
			return $$(tag+"[src*="+path+"]")[0];
		}
	},

	// NOTE: this is not reliable
	//	-- need a way to tell if a script has already finished loading
	pathAlreadyLoaded : function(tag, path) {
		return this.tagForSrc(tag, path) != null;
	},


	// TODO: get a single URL which parses any kind of path ?
	PATH_URL : /(.*\/)[^\/]+?/,
	LEAF_URL : /.*\/([^\/]*)/,
	
	// return the path (everything before the leaf file name)
	//	for a url or an element with a 'src' parameter
	getPath : function(what) {
		if (!what) return "";
		if (what.getAttribute) what = what.getAttribute("src") || "";
		var match = what.match(Ajax.PATH_URL);
		return (match ? match[1] : "");
	},
	
	// return the leaf file name 
	//	for a url or an element with a 'src' parameter
	getFile : function(what) {
		if (!what) return "";
		if (what.getAttribute) what = what.getAttribute("src") || "";

		// strip off any parameters or hash first
		var endIndex = what.search(/[\?#]/);
		if (endIndex != -1) what = what.substr(0, endIndex);
		var match = what.match(Ajax.LEAF_URL);
		return (match ? match[1] : what);
	},
	
	// return the leaf file name WITHOUT its extension
	//	for a url or an element with a 'src' parameter
	getFileNoExtension : function(what) {
		var file = Ajax.getFile(what),
			index = file.indexOf(".")
		;
		if (index == -1) return file;
		return file.substr(0, index);
	}
}
);




//
//	Extend strings so we can use them as templates in a performant way
//
String.prototype.interpolate = function(thisObject, pattern) {
	var template;
	if (pattern == null) {
		// SHORT CUT: if the pattern is not in the string, don't bother
		// NOTE:  ""+this is necessary to convert to a simple string (otherwise returns as a String)
		if (this.indexOf("#{") == -1) return ""+this;
		template = (Template._registry[this] || (Template._registry[this] = new Template(this)));
	} else {
		template = new Template(this);
	}
	return template.evaluate(thisObject, pattern);
}
Template._registry = {};

// alias for "string.include" to be proper english
String.prototype.includes = String.prototype.include;
String.prototype.contains = String.prototype.include;


// change somethingLikeThis to SomethingLikeThis
String.prototype.initialCap = function() {
	return this.charAt(0).toUpperCase() + this.substr(1);
}

String._setters = {};
String.prototype.setter = function() {
	if (!String._setters[this]) String._setters[this] = "set"+this.initialCap();
	return String._setters[this];
}

String._getters = {};
String.prototype.getter = function() {
	if (!String._getters[this]) String._getters[this] = "get"+this.initialCap();
	return String._getters[this];
}

// Apply the set of properties in <source> to <dest>:
//	If <dest> has a set<Key>() method, calls that
//	otherwise just assigns the property directly
Object.setProperties = function(dest, source) {
	for (var key in source) {
		var value = source[key],
			setter = String._setters[key] || key.setter()
		;
		if (dest[setter])	dest[setter](value);
		else				dest[key] = value;
	}
	return dest;
}

Object.getDifferences = function(original, changed) {
	var diffs = {}, found = false;
	for (var key in original) {
		if (original[key] != changed[key]) {
			diffs[key] = changed[key];
			found = true;
		}
	}
	if (found) return diffs;
}


//
//	Template extensions
//

// create a template from the contents of an HTML object on the page
//	(and remove the outer template element from the page)
Template.createFromHTML = function(id) {
	if (Template._registry[id]) return Template._registry[id];
	
	var element = $(id);
	if (!element) return;
	var template = new Template(element.innerHTML);
	element.remove();

	Template._registry[id] = template;
	return template;
}




//
//	Cookie object for getting/setting/examining cookies
//
var Cookie = {
	get : function(name) {
		if (!document.cookie) return undefined;
		var cookies = document.cookie.split("; ");	// TODO: cross browser?
		for (var i = 0, len = cookies.length; i < len; i++) {
			var cookie = cookies[i].split("=");
			if (cookie[0] == name) return unescape(cookie[1]);
		}
		return undefined;
	},
	
	set : function(name, value, path, domain, expires, secure) {
		var newCookie = name + "=" + escape(value) +
				((expires) ? "; expires=" + expires.toGMTString() : "") +
//				((path) ? "; path=" + Cookie.checkPath(path) : "") +
				((domain) ? "; domain=" + domain : "") +
				((secure) ? "; secure" : "")
		;
		document.cookie = newCookie;
		return Cookie.get(name);
	},
	
	// if the last piece of the path is the filename,
	//	the cookie will not record properly in IE
	//	so strip of the final piece if it has an extension ("."something)
	checkPath : function(path) {
		// if the path does not end with a "/", get rid of the last thing in the path
		//	(which is presumably the filename)
		if (path) {
			path = path.split("/");
			if (path.length > 2) path[path.length-1] = "";
			path = path.join("/");
		}
		return path;
	},

	clear : function(name, path, domain) {
		if (!Cookie.get(name)) return;
		return Cookie.set(name, "", Cookie.checkPath(path), domain, new Date(0));
	},

	
	//
	//	return all of the current cookies as a map (object)
	//
	map : function() {
		var map = {};
		if (!document.cookie) return {};
		var cookies = document.cookie.split("; ");
		for (var i = 0, len = cookies.length; i < len; i++) {
			var cookie = cookies[i].split("=");
			map[cookie[0]] = unescape(cookie[1]);
		}
		return map;
	},

	//
	//	one cookie with multiple 'values'
	//
	
	_valuesFor : function(name) {
		var values = Cookie.get(name);
		if (!values) return [];
		return values.split("|").compact();
	},

	_setValuesFor : function(name, valueList, path, domain) {
		var value = valueList.join("|");
		if (!value) return Cookie.clear(name, path, domain);
		return Cookie.set(name, value, path, domain);
	},
	
	addValue : function(name, value, path, domain) {
		var values = Cookie._valuesFor(name);
		if (values.indexOf(value) != -1) return Cookie.get(name);
		values.push(value);
		return Cookie._setValuesFor(name, values, path, domain);
	},
	
	removeValue : function(name, value, path, domain) {
		var values = Cookie._valuesFor(name),
			index = values.indexOf(value)
		;
		if (index == -1) return Cookie.get(name);
		cookie.splice(index, 1);
		return Cookie._setValuesFor(name, values, path, domain);
	},
	
	hasValue : function(name, value) {
		var values = Cookie._valuesFor(name);
		return (values.indexOf(value) > -1);
	},
	
	// pass one or more values:
	//	if value is preceeded by "+", we will always add
	//	if value is preceeded by "-", we will always remove
	//	otherwise, we will add if present, remove if not present
	toggleValues : function(name, newValues, path, domain) {
		var values = Cookie._valuesFor(name);
		for (var i = 0; i < newValues.length; i++) {
			var value = newValues[i],
				adding = undefined,
				removing = undefined
			;
			if (value.charAt(0) == "+") {
				value = value.substr(1);
				adding = true;
			} else if (value.charAt(0) == "-") {
				removing = true;
				value = value.substr(1);
			}
			var index = values.indexOf(value);
			if (!adding && !removing) {
				adding = (index == - 1);
				removing = !adding;
			}
			if (adding && index == -1) values.push(value);
			if (removing && index > -1) values.splice(index, 1);
		}
		return Cookie._setValuesFor(name, values, path, domain);
	}
};
// set up aliases for a couple of functions
Cookie.setValue = Cookie.addValue;
Cookie.clearValue = Cookie.removeValue;




// Class: Date
//	Extensions to the Date object

var DateTranslations = {
	MSEC_IN_ONE_DAY : 24 * 60 * 60 * 1000,
	
	// WARNING: english only!
	//	TODO: figure out abbrevs at least from clever parsing of a date object toString?
	MONTH_NAMES 	: $w("January February March April May June July August September October November December"),
	MONTH_ABBREVS 	: $w("Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec"),

	DAY_NAMES		: $w("Sunday Monday Tuesday Wednesday Thursday Friday Saturday"),
	DAY_ABBREVS		: $w("Sun Mon Tue Wed Thu Fri Sat"),
	DAY_INITIALS	: $w("S M T W T F S"),

	timezoneRegExp : /(\d*:\d*:\d*).*\((.*)\)$/
}
Object.extend(Date, DateTranslations);
Object.extend(Date.prototype, DateTranslations);

Object.extend(Date.prototype, {
	clone : function() {
		return new Date(this);
	},

	getMonthName : function(abbreviate) {
		if (abbreviate) return Date.MONTH_ABBREVS[this.getMonth()];
		return Date.MONTH_NAMES[this.getMonth()];
	},

	getDayName : function(abbreviate) {
		if (abbreviate) return Date.DAY_ABBREVS[this.getDay()];
		return Date.DAY_NAMES[this.getDay()];
	},
	
	// set the hour/min/sec of the date
	// If you do not pass a value in, sets that value to 0
	//	eg:  date.set()	sets to start of day
	set : function(hour, min, sec) {
		this.setHours(  hour || 0);
		this.setMinutes(min  || 0);
		this.setSeconds(sec  || 0);
		this.setMilliseconds(0);
		return this;
	},

	//  Method: toTimezoneString
	//	Return the timezone string from this date.
	//	WARNING: this is likely to *not* work in languages other than US english.
	toTimezoneString : function() {
		var match = this.toTimeString().match(this.timezoneRegExp);
		if (match) return match[2];
	},
	
	//	WARNING: this is likely to *not* work in languages other than US english.
	toPrettyTimeString : function() {
		var time = this.toTimeString(),
			match = time.match(this.timezoneRegExp)
		;
		if (match) return match[1] + " " + match[2];
		return time;
	},
	
	//  Method: toPrettyString
	//	Return a pretty string version of this date.
	toPrettyString : function() {
		return this.toDateString() + " &bull; " + this.toPrettyTimeString();
	},
	
	// Return a short-but-readable form of the date and time
	//	eg:  	3/8/1970 12:33:24
	toShortString : function(hideYear, hideSeconds) {
		return (this.getMonth() + 1) + "/" +
				this.getDate() +
				(hideYear != true ? "/" + (this.getFullYear() - 2000).pad(2) : "") + " " +
				this.getHours().pad(2) + ":" +
				this.getMinutes().pad(2) +
				(hideSeconds != true ? ":" + this.getSeconds().pad(2) : "");
	},
	
	//	returns 3/8
	toShortDate : function() {
		return this.getMonth() + 1 + "/" + this.getDate();
	},

	toShortTime : function() {
		return this.getHours().pad(2) + ":" + this.getMinutes().pad(2);
	},

	// add the specified # of days (positive or negative) to the date, preserving the time
	// NOTE: this DOES work around daylight savings time
	addDays : function(days) {
		// remember hours and minutes so we can reset them
		//	in case we're crossing a daylight savings boundary
		var startHours = this.getHours(),
			startMinutes = this.getMinutes()
		;
		this.setHours(12);	
		this.setTime(this.getTime() + (days * this.MSEC_IN_ONE_DAY));
		// reset to stored hours/mins
		this.setHours(startHours);
		this.setMinutes(startMinutes);
		return this;
	}
});



//
//	Class: Number
//	Extensions to all numbers

Math.KB = 1024;
Math.MB = 1024*1024;
Math.GB = 1024*1024*1024;
Math.TB = 1024*1024*1024*1024;

Math.k = 1000;
Math.m = 1000*1000;
Math.b = 1000*1000*1000;
Math.t = 1000*1000*1000*1000;


Number.bytesLabels = ["B","KB", "MB", "GB", "TB", "PB", "XB", "ZB", "YB"];
Number.prototype.toBytesString = function(precision, skipSuffix) {
	var it = this,
		power = 0
	;
	while (it >= 1024) {
		it = it/1024;
		power++;
	}
	if (precision == null) precision = 2;
	if (power == 0) precision = 0;				// no such thing as a half-byte
	var factor = Math.pow(10, precision);
	it = Math.floor(it * factor) / factor;
	return it + (skipSuffix != true ? " "+Number.bytesLabels[power] : "");
}

String.prototype.fromBytesString = function() {
	var number = parseFloat(this);
	if (isNaN(number)) return NaN;
	
	var power = 0,
		upperCase = this.toUpperCase()
	;
	// skip "B" since that is power 0 anyway
	for (var i = 1; i < Number.bytesLabels.length; i++) {
		if (upperCase.indexOf(Number.bytesLabels[i].charAt(0)) != -1) {
			power = i;
			break;
		}
	}
	if (power > 0) {
		for (var i = 0; i < power; i++) {
			number *= 1024;
		}
	}
	return Math.round(number);
}

Number.prototype.commaize = function(digits) {
	var str = ""+this,
		prefix = "",
		suffix = "",
		negative = "",
		periodIndex = str.indexOf(".")
	;
	
	if (periodIndex != -1) {
		suffix = str.substring(periodIndex);
		if (typeof digits == "number") { 
			suffix = (digits == 0 ? "" : suffix.substring(0, digits+1));
		}

		str = str.substr(0, periodIndex);
	} else if (typeof digits == "number" && digits != 0) {
		suffix = "." + "0".times(digits);
	}


	if (str.charAt(0) == "-") {
		negative = "-";
		str = str.substr(1);
	}
	
	var firstSplit = str.length % 3;
	prefix += str.substring(0, firstSplit);

	var matches = str.substr(firstSplit).match(/\d\d\d/g) || [];
	if (prefix) matches.splice(0,0,prefix);
	return negative + matches.join(",") + suffix;
}

Number.prototype.limitDigits = function(digits) {
	if (digits == null) digits = 0;
	var factor = Math.pow(10, digits);
	return Math.floor(this * factor) / factor;
}

// make sure the number is at least <digits> characters in length
//	by padding with initial zeros
Number.prototype.pad = function(digits) {
	var string = ""+this;
	while (string.length < digits) {
		string = "0" + string;
	}
	return string;
}

$w('max min round floor ceil').each(function(method){
  Number.prototype[method] = Math[method].methodize();
});

// <precision> 	= number of decimal places (default: 0)
// <pin>		= if true, we make sure it's 0-100
Number.prototype.toPercent = function(precision, pin) {
	var number = (this == Infinity ? 0 : this);
	var percent = (number * 100).limitDigits(precision);
	return (pin ? percent.range(0, 100) : percent);
}

Number.prototype.log2 = function() {
	return Math.log(this) / Math.LN2;
}

Number.prototype.log10 = function() {
	return Math.log(this) / Math.LN10;
}

Number.prototype.range = function(min, max) {
	if (this < min) return min;
	if (this > max) return max;
	return this;
}

Number.prototype.random = function() {
	return Math.round(Math.random() * this);
}


// Extension to element to take a bunch of HTML and convert it to elements
//	(in a document fragment) and returns pointers to the elements
// NOTE: like most prototype DOM functions, this only returns elements,
//			ignoring top-level text nodes.  :-(
//
//	TODO: is there a better way to do this in Prototype?
Element.htmlToElements = function(html) {
	var wrapper = Element.extend(document.createElement("div"));
	wrapper.innerHTML = html;
	return wrapper.childElements();
}

//	Get the maximzed document size.
//	 This is the maximum size of (all of the content including scrolling) and (the viewport)
document.getMaxedDimensions = function() {
	var B = document.body,
		DE = document.documentElement,
		output = {}
	;
	output.width = Math.max(B.scrollWidth, DE.scrollWidth,
							B.offsetWidth, DE.offsetWidth,
							B.clientWidth, DE.clientWidth
							);
	output.height = Math.max(B.scrollHeight, DE.scrollHeight,
							B.offsetHeight, DE.offsetHeight,
							B.clientHeight, DE.clientHeight
							);
	return output;
}


// Extensions to document
document.getInnerDimensions = function() {
	return { width: 	window.innerWidth
					 || document.documentElement.clientWidth
					 || document.body.clientWidth,
			height : 	window.innerHeight
					 || document.documentElement.clientHeight
					 || document.body.clientHeight
		}

}


// Extensions to document.viewport
//
//	Get the maximzed dimensions for the viewport 
//	 similar to d.v.getDimensions() but it will extend the dimensions to the
//	 entire browser window if the viewport doesn't fill the entire window.
document.viewport.getMaxedDimensions = function() {
	var dims = document.viewport.getDimensions(),
		innerDims = document.getInnerDimensions()
	;
	dims.width = Math.max(dims.width, innerDims.width);
	dims.height = Math.max(dims.height, innerDims.height);
	return dims;
}


//	Additional methods added to all elements
//
Element.addMethods({
	toggleClassNames : function(element, names) {
		if (typeof names == "string") names = $w(names);
		for (var i = 0; i < names.length; i++) {
			var name = names[i];
			if (typeof name != "string") continue;
			
			if (name.charAt(0) == "+") {
				name = name.substr(1);
				element.addClassName(name);
			} else if (name.charAt(0) == "-") {
				name = name.substr(1);
				element.removeClassName(name);
			} else {
				if (element.hasClassName(name)) {
					element.removeClassName(name);
				} else {
					element.addClassName(name);
				}
			}
		}
	},

	bringToFront : function(element) {
		element.style.zIndex = Element.MAX_Z_INDEX++;
	},
	
	getPositionedCoordinates : function(element) {
		return element._getCoordinates(element.positionedOffset());
	},

	getCumulativeCoordinates : function(element) {
		return element._getCoordinates(element.cumulativeOffset());
	},

	getViewportCoordinates : function(element) {
		return element._getCoordinates(element.viewportOffset());
	},
	_getCoordinates : function(element, offset) {
		var dims = element.getDimensions();
		dims.left = offset.left;
		dims.right = dims.left + dims.width;
		dims.top = offset.top;
		dims.bottom = dims.top + dims.height;
		return dims;
	},

	// NOTE: assues element and sourceElement are in the same coordinate space
	//			(i.e. they have the same parentElement) 
	//		 and that element is already position:absolute
	locateNear : function($element, $source, location) {
		if (location == null) location = "SW";
		else location = location.toUpperCase();

		var left = 0,
			top = 0,
			element = $element.getDimensions(),
			source = ($source ? $source.getCumulativeCoordinates() : {left:0,top:0,width:0,height:0})
		;
		if (location == "MOUSE") {
			

		} else { 	// N,S,E,W
			if (location.includes("S")) {
				top = source.bottom;
			} else if (location.includes("N")) {
				top = source.top - element.height;
			} else {
				top = source.top + (source.height / 2) - (element.height / 2);
			}
	
			 if (location.includes("E")) {
				left = source.right - element.width;
			} else if (location.includes("W")) {
				left = source.left;
			} else {
				left = source.left + (source.width / 2) - (element.width / 2);
			}
		}

		// make sure that it fits within the window
		var viewport = document.viewport.getMaxedDimensions();
		//	 TODO: take scroll into account?
		if (top + element.height > viewport.height) {
			top = viewport.height - element.height;
		}
		if (top < 0) top = 0;
		
		if (left + element.width > viewport.width) {
			left = viewport.width - element.width;
		}
		if (left < 0) left = 0;
		
		// now convert from cumulative to local coords
		var sourceLocal = $source.positionedOffset();		// TODO: viewportOffset?
		left += (sourceLocal.left - source.left);
		top += (sourceLocal.top - source.top);
		
		$element.style.left = left + "px";
		$element.style.top = top + "px";
	}

});
Element.MAX_Z_INDEX = 2000000;


//
//	Event extensions
//

// Convert an event object to a prototype Extended event
function $e(event) {
	return Event.extend(event || window.event);
}

// check a mouseover/mouseout event to see if it's in the specified target
//	this allows you to convert mouseover/mouseout to mouseenter/mouseleave
//	See  Tooltip.onTargetMouseOver 
Event.mouseEnteringOrLeaving = function(event, target) {
	var relatedTarget = $($e(event).relatedTarget || event.toElement);
	if (relatedTarget && relatedTarget != target && !relatedTarget.childOf(target)) {
		event.stop();		// stop bubbling
		return true;
	}
	return false;
}


/** Form Element Extensions **/

Object.extend(Form, 
{
	setUpFieldHints : function(parentElement) {
		var elements = $(parentElement).select(".HintField");
		elements.each(function(element) {
			Form.setUpFieldHint(element);
		});
	},

	setUpFieldHint : function(element) {
		if (!element.hasClassName) element = $(element);

		function focusHint(event) {
			var hint = element.getHint();
			if (!hint) return;
			
			if (element.getValue() == hint) {
				element.value = "";
				element.removeClassName("Hint");
			}
		}
	
	 	function blurHint(event) {
			var hint = element.getHint();
			if (!hint) return;
			
			if (element.getValue() == "") {
				element.value = hint;
				element.addClassName("Hint");
			}
		}

		element.observe("focus", focusHint);
		element.observe("blur",  blurHint);
		
		element.showHint = blurHint;
		element.showHint();
	}	
});

Element.addMethods({
	getHint : function(element) {
		return element.getAttribute("hint");
	}
});


//
//	Ajax utility stuff
//
Ajax.encodeUriParameters = function(params, substitutions) {
	var output = [];
	for (var prop in params) {
		var value = ""+params[prop];
		if (substitutions) value = value.interpolate(substitutions);
		output.push(prop + "=" + encodeURI(value));
	}
	return output.join("&");
}



//
//	set up instance registry stuff
//


Class.legalizeId = function(id) {
//TOCHECK
	id = (""+id).split(/[^\w\d]/mg).join("_");
	if (!isNaN(parseInt(id))) id = "id"+id;
	return id;
}


//
//	add the following to all classes
//

//
//	Register an instance in the class (by id).
//	If the instance does not have an id already, one will be created.
//
//	If the id is not a legal id, it will be regitered as both the original id
//		and a legal variant of the id.
//
//	Also sets instance.globalRef to a string that can be used to get a pointer back
//	to the instance from the global scope.
//
Class.Methods.register = function(instance) {
	// if the instance is marked as anonymous, don't register it
	if (instance.anonymous) return this;
	
	if (!this.Instances) {
		// set up the instances array and point to it from our
		this.Instances = [];
		var plural = this.prototype.klasses || this.prototype.klass + "s";
		window[plural]= this.Instances;
	}
	
	// register the instance by number
	var next = this.Instances.length;
	this.Instances[next] = instance;
	
	
	// make sure the instance has an id
	if (!instance.id) instance.id = (this.prototype.klass.split(".").join("_") + next);

	// add the instance under the id specified
	this.Instances[instance.id] = instance;

	// also register under a 'legal id' so we can reference the object in scripts, etc
	//	without having to escape strings
	var legalId = Class.legalizeId(instance.id);
	if (legalId != instance.id) this.Instances[legalId] = instance;

	// and set up the globalRef of the instance
	instance.globalRef = this.prototype.klass + ".Instances." + legalId;
	return this;
}

// for a Class, find an element by id
Class.Methods.byId = function(id, autoCreate) {
	var instance;
	if (this.Instances) instance = this.Instances[id];
	if (instance) return instance;
	
	if (autoCreate == true) return new this({id:id});
}



// set one object up to delegate methods to a sub-object
Object.createDelegators = function(delegator, delegatee, map) {
	if (typeof delegatee == "string") {
		for (var delegatorMethod in map) {
			var delegateeMethod = map[delegatorMethod],
				method = new Function(
						"return "+delegatee+"."+delegateeMethod+".apply"
							+"("+delegatee+",arguments)"
					)
			;
			delegator[delegatorMethod] = method;
		}
	} else {
		for (var delegatorMethod in map) {
			var delegateeMethod = map[delegatorMethod];
			delegator[delegatorMethod] = delegatee[delegateeMethod];
		}
	}
}

//* generic XML parsing routines borrowed from statsproxy*/

// execute a function for each child of root of type tagName
function forEachTag(root, tagName, method) {
	var tags = root.getElementsByTagName(tagName);
	for (var i = 0, tag, list = []; tag = tags[i++];) {
		list.push(method(tag));
	}
	return list;
}


// convert an element which represents a list of children of a particular type 
//	to a JS array of object
function parseXMLList (root, childTag) {
	return forEachTag(root, childTag, function(child) {
		return parseXMLChildren(child);
	});
}

// convert an xml element WITH ONE LEVEL OF CHILDREN to a JS object
function parseXMLChildren (root) {
	var js = {};
	forEachTag(root, "*", function(node) {
		js[node.tagName] = parseXMLValue(node);
	});
	return js;
}

function parseXMLValue(node) {
	var value = (Prototype.Browser.IE ? node.firstChild.nodeValue : node.textContent),
		type = node.getAttribute("type")
	;
	// if a type attribute was specified, try to parse by that type
	// See file:  /types.js
	if (type) value = TypeParser.parse(value, type) || value;
	// HACK: coerce integers into numbers (for sorting) if they don't specify a number
	else if (value == ""+parseInt(value)) value = parseInt(value);
	return value;
}

// recursively convert an xml element WITH UNKNOWN LEVELS OF CHILDREN into a nested JS object
function parseXMLRoot(root) {
	var js = {}, childFound = false;
    //XXX
    // console.group("parsing ", root);
	for (var i = 0; i < root.childNodes.length; i++) {
		var node = root.childNodes[i],
			tagName = node.tagName,
			value
		;
        //        console.log("node: ", node);  // XXX
		// ignore text nodes
		if (!tagName) continue;

		// get the children of the node
		//	(either a string or a nested root)
		//	TODO: do type coercion here
		//  TODO: 
        
        //XXX
        // console.log(node.childNodes.length + " child nodes");

		if (node.childNodes.length == 1 && node.childNodes[0].tagName == null) {
			value = parseXMLValue(node);
		} else {
			value = parseXMLRoot(node);
		}

        // eeeeuw, but instance MUST be an array even if there's only one instance
 		if (!js[tagName] && tagName != "instance") {
 			js[tagName] = value;
 		} else {
            //XXX
            // console.log("array-izing "+tagName);
 			// if we're got a second element at this level with the same tag name
 			//	stick them both in an array
            if (tagName && js[tagName] && !(js[tagName] instanceof Array)) {
 				js[tagName] = [js[tagName]];
 			} else {
                js[tagName] = new Array;
            }
 			js[tagName].push(value);
 		}

		childFound = true;
	}
    //XXX
    // console.groupEnd();
	if (childFound) return js;
}
