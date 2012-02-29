/*
	statsproxy Web UI
	
	jQuery extensions
	
	Note that some of these functions can be found in other jQuery plugins;
		we're not using those because they're generally a lot more functionality than we need.
	
*/

// Copyright (c) 2009-2010, Gear Six, Inc.  Subject to a BSD-style
// license whose text is available at /license.txt on this machine

/* Do some quick browser sniffing and apply the name of the browser 
	as a class on the HTML element so we can do browser-specific styling.   */
(function(){
	// the following is based on object sniffing code from Prototype.js
	var Browser = {
		MSIE:     !!(window.attachEvent &&
		  navigator.userAgent.indexOf('Opera') === -1),
		Opera:  navigator.userAgent.indexOf('Opera') > -1,
		WebKit: navigator.userAgent.indexOf('AppleWebKit/') > -1,
		Gecko:  navigator.userAgent.indexOf('Gecko') > -1 &&
		  navigator.userAgent.indexOf('KHTML') === -1
	}
	for (var key in Browser) {
		if (Browser[key]) $("HTML").addClass(key);
	}
	
	// put "MSIE7" or "MSIE8" class on html element if appropriate
	if (Browser.MSIE) {
		var version = navigator.userAgent.match(/MSIE (\d)/)[1];
		$("HTML").addClass("MSIE"+version);
	}
	
	// is flash available?
	Browser.hasFlash = false;
	if (Browser.MSIE) {
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
				Browser.hasFlash = true;
				break;
			}
		}
	} else if (window.navigator && navigator.plugins) {
		$.each(navigator.plugins, function(index, plugin) {
			if (""+plugin.name.indexOf("Flash") > -1) Browser.hasFlash = true;
		});
	}

	
	jQuery.Browser = Browser;
})();



/* HACK: make sure a console object is defined with firebug API */
if (!window.console || !window.console.warn) {
	window.console = {
		log : function(){},
		info : function(){},
		warn : function(){},
		debug : function(){},
		error : function(){},
		group : function(){},
		groupEnd : function(){},
		time : function(){},
		timeEnd : function(){}
	}
}


jQuery.extend({

	// bind a function to be called on a particular context: why doesn't jquery have this?
	bind : function(method, context) {
		return function() {
			return method.apply(context, arguments);
		}
	}
});

// parse ISO 8061 date:  YYYY-MM-DDThh:mm:ssTZD
// NOTE: we ignore timezone for now
jQuery.extend({
	date : {
		
		timezoneOffset : 0,			// offset in MILLISECONDS from GMT
		timezoneLabel  : "GMT",
		
		MSEC_PER_HOUR : 1000 * 60 * 60,
		MSEC_PER_DAY : 1000 * 60 * 60 * 24,
	
		/** Set the timezone offset from GMT and the timezoneLabel to use. 
			TODO: some signal if the timezone has actually changed?
		*/
		setTimezone : function(offset, timezoneLabel) {
			// set up the timezone stuff:
            // offset comes in as +0800 as printed by strftime; divide by 100 to get hours    
			var serverUTCOffset = (offset/100) * $.date.MSEC_PER_HOUR,
				localStartDay = $.date.today(),
				UTCStartDay = Date.UTC(localStartDay.getFullYear(), 
									   localStartDay.getMonth(), 
									   localStartDay.getDate()
									  ),
				browserUTCOffset = UTCStartDay - localStartDay.getTime()
			;
			
			// $.date.timezoneOffset is the difference between browser time and server time
			$.date.timezoneOffset = (serverUTCOffset - browserUTCOffset);
			$.date.timezoneLabel = SP.config.timezoneName;
		},
	
		// return a new date set to a particular time of today
		//	hours, min, sec all default to 0. Msec is always 0.
		today : function(hour, min, sec) {
			return $.date.setTime(new Date(), hour, min, sec, 0);
		},
		
		// return a new date set to a particular time of today
		//	hours, min, sec all default to 0. Msec is always 0.
		yesterday : function(hour, min ,sec) {
			return $.date.setTime($.date.addDays(new Date(), -1), hour, min, sec, 0);
		},


		// return the current time offset by the number of hours passed in
		now : function(hoursDelta) {
			var now = new Date();
			if (hoursDelta) now = new Date(now.getTime() + (hoursDelta * $.date.MSEC_PER_HOUR));
			return now;
		},
		
		offsetDate : function(date, offset) {
			if (!date) return new Date();
			
			if (!offset && typeof date != "number") return date;
			if (typeof date != "number") date = date.getTime();
			return new Date(date + (offset || 0));
		},
	
		/** Parse a string date. 
			Tries default new Date(string) first.
			If that doesn't work, tries parseISO8601().
			If that doesn't work, returns NaN
		*/
		parse : function(rawValue) {
			if (rawValue instanceof Date) return rawValue;
			
			var date = new Date(rawValue);
			if (!isNaN(date)) return date;
			var isoDate = $.date.parseISO8601(rawValue);
			if (!isoDate) return date;		// return value is NaN
			return isoDate;
		},
	
		parseISO8601 : function(string) {
			if (!string) return null;
			
			var match = string.match(/(\d\d\d\d)-(\d\d)-(\d\d)(.(\d\d):(\d\d):(\d\d)(.*)?)?/);
			if (!match) return undefined;
			// parse in base 10 in case there are leading zeroes on any of the date pieces
			var year = parseInt(match[1], 10),
				month = parseInt(match[2], 10) - 1,
				day = parseInt(match[3], 10),
				hasTime = match[4] != null,
				hour = (hasTime ? parseInt(match[5], 10) : 0),
				min = (hasTime ? parseInt(match[6], 10) : 0),
				sec = (hasTime ? parseInt(match[7], 10) : 0)
			;
			return new Date(year, month, day, hour, min, sec);
		},
		
		// convert a date to a nicer-looking locale string
		// Date is a Date object or a number of MILLISECONDS.
		print : function(date, offset, showTimezone) {
			// offset the date if necessary
				//	if (offset) date = $.date.offsetDate(date, offset);
			return $.date.printShortDate(date) + " " 
					+ $.date.printShortTime(date)
					+ (showTimezone ? " " + $.date.timezoneLabel : "");
		},


		// convert a date to a ISO 8601 format:
		//		YYYY-MM-DDTHH:MM:SS
		printIso8601 : function(date, offset) {
			// offset the date if necessary
			date = $.date.offsetDate(date, offset);

			return date.getFullYear() + "-"
				 + $.number.pad(date.getMonth()+1, 2) + "-"
				 + $.number.pad(date.getDate(), 2)
				 + "T"
				 + $.number.pad(date.getHours(), 2) + ":"
				 + $.number.pad(date.getMinutes(), 2) + ":"
				 + $.number.pad(date.getSeconds(), 2);
		},
		
		// Print this date in a format appropriate for output in the RangeSlider.
		// Date is a Date object or a number of MILLISECONDS.
		printSliderString : function(date, offset, boldTime, skipToday) {
			// offset the date if necessary
			date = $.date.offsetDate(date, offset);

			var day,
				time = $.date.printShortTime(date, true),
				tzone = $.date.timezoneLabel || "",
				output = ""
			;

			if (date >= $.date.TODAY) {
				if (skipToday != true) output = $.message("UI.today")+"<br>";
			} else if (date >= $.date.YESTERDAY) {
				output = $.message("UI.yesterday")+"<br>";
			} else {
				output = $.date.printShortDate(date, true) + "<br>";
			}
			
			if (boldTime) {
				output += "<b>" + time + " " + tzone + "</b>";
			} else {
				output += time + " " + tzone;
			}
			return output;
		},
		
		printShortDate : function(date, skipYears) {
			if (typeof date == "number") date = new Date(date);
			return  (date.getMonth() + 1) + "/" +
					date.getDate() +
					(skipYears == true ? "" : "/" + $.number.pad(date.getFullYear() % 100, 2));
		},
		
		printShortTime : function(date, skipSecs) {
			if (typeof date == "number") date = new Date(date);
			return $.number.pad(date.getHours(),2) + ":" +
				   $.number.pad(date.getMinutes(),2) +
				   (skipSecs == true ? "" : ":" + $.number.pad(date.getSeconds(),2));
		},
		
		// Convert a duration in SECONDS to a pretty string
		printDuration : function(duration, wrap) {
			if(duration > 86400) {
				var days = Math.floor(duration / 86400);
				duration = duration % 86400;
			}
			if(duration > 3600) {
				var hours = Math.floor(duration/3600);
				duration = duration % 3600;
			}
			if(duration > 60) {
				var minutes = Math.floor(duration/60);
				duration = duration % 60;
			}
			var output = [];
			if ( days   > 0) output.push( days	+ " day"+((days>1)?"s":""));
			if (hours   > 0) output.push( hours   + " hr"+((hours>1)?"s":""));
			if (minutes > 0) output.push( minutes + " min"+((minutes>1)?"s":""));
			output.push( duration + " sec"+((duration>1)?"s":""));

			// make the value wrap if indicated			
			var len = output.length;
			if (wrap && len > 2) {
				var item = Math.floor(len/2);
				output[item] = "<br>" + output[item];
			}
			
			return output.join(", ");
		},

		// Set the hours/min/sec/msec portions of a date.
		//	If you don't pass one of the above, sets it to 0.
		setTime : function(date, hour, min, sec, msec) {
			date.setHours(hour || 0);
			date.setMinutes(min || 0);
			date.setSeconds(sec || 0);
			date.setMilliseconds(msec || 0);
			return date;
		},

		// Add the specified # of days (positive or negative) to the date, preserving the time.
		// NOTE: this DOES work across daylight savings time boundaries.
		addDays : function(date, days) {
			// remember hours and minutes so we can reset them
			//	in case we're crossing a daylight savings boundary
			var startHours = date.getHours(),
				startMinutes = date.getMinutes()
			;
			date.setHours(12);	
			date.setTime(date.getTime() + (days * $.date.MSEC_PER_DAY));
			// reset to stored hours/mins
			date.setHours(startHours);
			date.setMinutes(startMinutes);
			return date;
		}

	}
});
jQuery.date.TODAY = $.date.today();
jQuery.date.YESTERDAY = $.date.yesterday();


// really simple cookie stuff
// NOTE: subset of api of 
jQuery.extend({
	cookies : {
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
					((domain) ? "; domain=" + domain : "") +
					((secure) ? "; secure" : "")
			;
			document.cookie = newCookie;
			return $.cookies.get(name);
		}
	}
});



jQuery.extend({
	string : {
		//
		//	useful regular expression patterns
		//
		
		/** Split a string by commas, ignoring whitespace between items. */
		SPLIT_ON_COMMAS : /\s*,\s*/,
		
		/** Find all characters in string which are not legal identifier characters. */
		ILLEGAL_ID_PATTERN : /[^\w$_]/g,
		
		/** String starts with a digit. */
		STARTS_WITH_DIGIT_PATTERN : /^\d/,
		
		/** Given a string, morph it into a legal identifier. */
		makeLegalId : function(string) {
			var id = (""+string).replace($.string.ILLEGAL_ID_PATTERN, "_");
			// make sure the id does not start with a number
			if (id.match($.string.STARTS_WITH_DIGIT_PATTERN)) id = "_"+id;
			return id;
		},

		// interpolate a string with a context object
		//	e.g.	"some #{adjective} sting".interpolate({adjective:"funky"})
		//		 == "some funky string"
		interpolate : function(string, context) {
			var matches = string.match(/#{(.*?)}/g), str = string;
			if (!matches) return string;

			for (var i = 0, match; match = matches[i++];) {
				// get the match expression
				var expression = match.match(/#{(.*?)}/)[1],
					value = $.string.parseExpression(expression, context)
				;
				if (value == null) value = "";
				str = str.split("#{"+expression+"}").join(value);
			}
			return str;
		},
		
		
		// walk a dotted path along some context object and return the indicated value
		parseExpression : function(expression, context) {
			// if there's a "|" in the string, that indicates we should set an attribute 
			var split = expression.split("|");
			expression = split[split.length-1];
			
			try {
				// If expression starts with "message:", it is a message expansion.  
				//	Return the message dictionary entry interpolated with context.
				if (expression.indexOf("message:") == 0) {
					var msgName = expression.substr(8);
					value = $.string.interpolate($.message.dictionary[msgName] || "", context);
					
				} 
				// otherwise it is a dotted.path to some sub-value of the context object
				else {
					// we will walk down the context object to find the value
					//	at the end, 'value' will be the replacement text
					var value = context;
		
					// for each sub-key:
					expression = expression.split("."), key
					while (expression.length) {
						var key = expression.shift();
						
						// if it contains "()", it is a method call
						var parenIndex = key.indexOf("()");
						if (parenIndex != -1) {
							var methodName = key.substr(0, parenIndex);
							if (typeof value[methodName] == "function") {
								try {
									value = value[methodName]();
								} catch (e) {
									value = null;
								}
							}
						} else {
							value = value[key];
						}
						// bail if value is not defined
						if (value == null) break;
					}
				}
			} catch (e) {
				return "";
			}
			return value;
		},

		// update a set of 'parts' of an element with the interpolated values from the part='x' attribute
		updateParts : function(parts, context) {
			if (!parts) return;
			$.each(parts, function(index, part) {
				part = $(part);
				var expression = part.attr("part"),
					split = expression.split("|"),
					type = "html"
				;
				if (split.length == 2) {
					type = split[0];
					expression = split[1];
				}
				
				var value = $.string.parseExpression(expression, context);
				if (value == null) value = "";
				
				// css will be:    "css:width|blah"
				if (type.indexOf("css:") == 0) {
					type = type.split(":")[1];
					part.css(type, value);
				} else if (type == "html") {
					part.html(value);
				} else if (type == "value") {
					part[0].value = value;
				} else {
					if (value && value != 0) {
						part.attr(type, value);
					} else {
						part.removeAttr(type);
					}
				}
			});
		},
		
		
		// load all of the <script type='template'> elements from the page
		//	and put them in $.templates
		getPageTemplates : function() {
			if (!$.templates) $.templates = {};
			
			$("script[type=template]").each(function(item, element) {
				element = $(element);
				$.templates[element.attr("id")] = $.trim(element.html());
				element.remove();
			});
		},
				
		// add methods to base64 encode and decode values into base64 if they are not alphanumeric
	 	// see:   http://en.wikipedia.org/wiki/Base64#URL_applications
	 	//		  (search for 'modified Base64 for URL' on that page)
		toSmartBase64 : function(string) {
			if (string.match(/^[a-zA-Z0-9]*$/)) return string;
			return "@" + $.base64Encode(string);
		},
		
		fromSmartBase64 : function(string) {
			if (string.charAt(0) != "@") return string;
			return $.base64Decode(string.substr(1));
		},
		
		
		// convert an object to a JSON string
		//	handles strings, numbers, nested objects, but NOT arrays, dates, etc
		fromObject : function(object) {
			var output = [];
			for (var key in object) {
				var value = object[key];
				if (typeof value == "string") value = "'"+value+"'";
				else if (typeof value == "object") value = $.string.fromObject(value);
				output.push("'"+key+"':"+value);
			}
			return "{"+output.join(",")+"}";
		}
	}
});

// change base64 keyset to "modified Base64 for URL"
jQuery.base64Keys = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_=";


jQuery.extend({
	number : {

		/** Pad the number out to the specified number of digits by prepending '0's. */
		pad : function(number, digits) {
			var string = ""+number;
			while (string.length < digits) {
				string = "0" + string;
			}
			return string;
		},
	
		/** Add commas to a number.  Also limits digits. */
		commaize : function (number, digits) {
			var str = ""+number,
				prefix = "",
				suffix = "",
				negative = "",
				periodIndex = str.indexOf(".")
			;
			
			if (periodIndex != -1) {
				suffix = str.substring(periodIndex);
				if (typeof digits == "number") { 
					suffix += "00000000";
					suffix = (digits == 0 ? "" : suffix.substring(0, digits+1));
				}
		
				str = str.substr(0, periodIndex);
			} else if (typeof digits == "number" && digits != 0) {
				suffix = "";
//				suffix = "." + "00000000000".substr(0,digits);
			}
		
		
			if (str.charAt(0) == "-") {
				negative = "-";
				str = str.substr(1);
			}
			
			var firstSplit = str.length % 3;
			prefix += str.substring(0, firstSplit);
		
			var matches = str.substr(firstSplit).match(/\d\d\d/g) || [];
			if (prefix) matches.splice(0,0,prefix);
			str = negative + matches.join(",") + suffix;
			return str;
		},
		
		/** Print a number in a pretty-but-compact way */
		prettyPrint : function(number) {
			if (number >= 1000000000) {
				return $.number.round(number / 1000000000, 2) + "b";
			} else if (number >= 1000000) {
				return $.number.round(number / 1000000, 2) + "m";
			} else {
				return $.number.commaize(number, 2);
			}
		},
		
		/** Round a number with the specified number of digits. */
		round : function(number, digits) {
			if (digits == undefined) digits = 0;
			var factor = Math.pow(10, digits);
			return Math.floor(number * factor) / factor;
		},
		
		/* Print a percentage value for stats tables. */
		printValueWithPercentage : function(value, master, hint) {
			return value + " <span class='percent'>"+(hint ? hint : "")+ "(" 
							+ (master ? Math.floor(parseInt(value) * 100 / master) : 0)
						 +"%)</span>";	
		},

		
		BytesLabels : ["B","KB", "MB", "GB", "TB", "PB", "XB", "ZB", "YB"],

		/** Convert a number to a bytes string. */
		toBytesString : function(number, precision, skipSuffix) {
			if (typeof arguments[0] == "string") number = parseFloat(arguments[0]);
			
			// figure out which power of 1024 we're dealing with
			var power = 0;
			while (number >= 1024) {
				number = number/1024;
				power++;
			}
			
			// take us down to the specified precision
			if (power == 0) {
				// no such thing as a half-byte
				precision = 0;
			} else if (precision == null) {
				precision = 2;
			}
			
			var string = "" + $.number.round(number, precision);
			if (skipSuffix != true) string += $.number.BytesLabels[power];
			return string;
		},

		/** Convert a bytes string to a number of bytes. */
		fromBytesString : function(string) {
			if (typeof arguments[0] == "number") return arguments[0];
			
			var number = parseFloat(string);
			if (isNaN(number)) return number;
			
			string = string.toUpperCase();

			var power = 0;
			// skip "B" since that is power 0 anyway
			for (var i = 1; i < $.number.bytesLabels.length; i++) {
				if (string.indexOf($.number.BytesLabels[i].charAt(0)) != -1) {
					power = i;
					break;
				}
			}
			if (power > 0) number != Math.pow(1024, power);
			return Math.round(number);
		}
		
		
	}
});



/** Generic type parsing routines. */
jQuery.extend({
	/** Given a value and a type name, attempt to convert the string to the appropriate type. 
	
		@note 	If type is null, does some ghetto default type matching
				to try to convert to a boolean or number.
		
		@param	value			Value to parse.
		@param	[type]			Type of the string, looked up in $.TypeMap to get a parser.
		@param	[trim=false]	If true, string results will be trimmed.
	*/
	parseType : function(value, type, trim) {
		// get the appropriate parser from $.TypeMap and use it to parse the value
		if (type) {
			// if the parser is a value, that is a reference to another type, so keep looking
			var parser;
			while (parser = $.TypeMap[type]) {
				if (typeof parser == "function") break;
				type = parser;
				// TODO: fix up the list to short-circuit lookup later?
			}

			// if we found a parser, run value through that.
			if (parser) value = parser(value);
		}
		// if they didn't specify a type, do some ghetto default matching
		else {
			// try for boolean
			if (value == "false") return false;
			if (value == "true") return true;
			
			// try for number
			var number = parseFloat(value);
			if (""+number == value) return number;
			
			// any other ghetto type converters? date?
		}
		if (trim && typeof value == "string") value = $.trim(value);
		return value;
	},
	
	
	/** Map of {type->parser}.  Add other types here as you like.
		Note that if a parser is a string, that is a reference to another type.
	 */
	TypeMap : {

		/** any:  No type conversion. */
		"any"		: function(string)	{return string},
		
		/** integer:  convert to a base-10 integer.  Returns NaN if parsing fails. */
		"integer" 	: function(string)	{return parseInt(value, 10)},

		/** float:  convert to a base-10 float.  Returns NaN if parsing fails. */
		"float"		: function(string)	{return parseFloat(value, 10)},

		/** number:  Alias for "float". */
		"number" : "float",
		
		/** boolean:  `true` if the string is exactly "true", otherwise `false`. */
		"boolean"	: function(string)	{return (string == "true")},
		
		/** percent:  Expressed as "50%", returns a fraction (.5)
					  Returns NaN if parsing fails.
		 */
		"percent"	: function(string) {
							var number = parseFloat(value); 
							return (isNaN(number) ? number : (number / 100));
					  },
		
		/** date: convert string to a date.  TODO: date formats? */
		"date" : function(string) { return new Date(string) },
		
		/** seconds:  Expressed as number of seconds, returns an integer. */
		"seconds" : "integer",

		/** milliseconds:  Expressed as number of milliseconds, returns an integer. */
		"milliseconds" : "integer",


		/** timestamp:  Expressed as number of milliseconds, returns a Date. */
		"timestamp" : "date"

	}
});


/* generic XML parsing routines */
jQuery.extend({
	xml : {
		
		/** recursively convert a single xml element WITH UNKNOWN LEVELS OF CHILDREN 
			into a nested JS object.
		 */
		toObject : function (root, tagName, object) {
			if (tagName) return Array.map($(tagName, root), function(it){return $.xml.toObject(it)});

			if (object == null) object = {};			
			var childFound = false, node, value, key, currentValue;

			for (var i = 0; node = root.childNodes[i++];) {
				// only process element nodes
				if (node.nodeType != 1) continue;
				
				// get the attributes of the node
				var attrs = $.xml.getAttributes(node);

				// the 'value' of a text only node is it's text(), run through $.parseType
				if ($.xml.isTextOnly(node)) {
					var value = $(node).text(), type = node.getAttribute("type");
					// try to parse the value, trimming strings
					value = $.parseType(value, type, true);

					// if there are attributes, the 'value' of the node is the attributes
					// SPECIAL CASE: if there is only a 'type' attribute, then ignore attributes
					var typeIsOnlyAttr = 	node.attributes.length == 1 
										&&  node.attributes[0].name == "type";
					if (attrs && !typeIsOnlyAttr) {
						if (value != null && value != "") attrs.value = value;
						value = attrs;
					}
				}
				// otherwise if an element, it's value is a recursive call to $.xml.toObject()
				else {
					// start out with any attributes on the node
					value = $.xml.toObject(node, null, attrs);
				}
		
				key = node.tagName;
				currentValue = object[key];
				
				// if we've not seen the key before, just add it directly under the key
				if (currentValue === undefined) {
					object[key] = value;
				}

				// otherwise we have multiple elements with the same tag name:
				//	stick them all into in an array
				else {
					if (currentValue instanceof Array) {
						currentValue.push(value);
					} else {
						object[key] = [currentValue, value];
					}
				}
				
				childFound = true;
			}
			if (childFound) return object;
		},

		/** Return true if this node is a text, cdata or comment node. */
		isTextNode : function(node) {
			var type = node.nodeType;
			return (type == 3 || type == 4 || type == 8);
		},
		
		/** Return true if this node (or its contents) are text-only. */
		isTextOnly : function(node) {
			return $.xml.isTextNode(node) || Array.every(node.childNodes, $.xml.isTextNode);
		},

		/** Extract all of the attributes on a node and set them as properties of object.
			If you don't provide an object, one will be made up.
		 */
		getAttributes : function(node, object) {
			return $.xml.arrayToObject(node.attributes, "name", "value", object, true, true);
		},
		

		/** Convert an array of objects to properties on a single object. 
			@param [object={}]			Object to add properties to.  If null, an object will be created.
			@param [keyField=name]		Name of the field of each object to use as the key.
			@param [valueField=value]	Name of the field of each object to use as the value.
			@param [parse=true]			If true, we will parse values before adding to the object.
			@param [trim=true]			If true, we will trim parsed values. (Note: only if parse==true).
		*/
		arrayToObject : function(array, keyField, valueField, object, parse, trim) {
			if (!object) object = {};
			var found = false, key, value;
			if (array && array.length) {
				if (keyField == null) keyField = "name";
				if (valueField == null) valueField = "value";
				if (parse == null) parse = true;
				if (trim == null) trim = true;
				$.each(array, function(index, it) {
					key = it[keyField];
					if (key) {
						value = it[valueField];
						if (parse) value = $.parseType(value, null, trim);
						object[key] = value;
						found = true;
					}
				});
			}
			return (found ? object : undefined);
		},

		// TODO: deprecate the below in favor of $.xml.toObject()
		

		// convert the value of a node to a JS type (number, boolean, etc)
		//	based on the element's 'type' parameter
		//	using the TypeParser.typeMap found in /js/types.js
		//
		getNodeValue : function(node) {
			var value = $(node).text(),
				type = node.getAttribute("type")
			;
			return $.parseType(value, type, true);
		},
		
		// return a map of {tagName:value} for all children of root
		// NOTE: assumes that child nodes are not nested (eg: text only)
		//	uses  $.xml.getNodeValue()  to convert values from strings into appropriate data type
		getChildValueMap : function (root) {
			var map = {};
			$("*", root).map(
				function(index, element) {
					map[element.tagName] = $.xml.getNodeValue(element);
				}
			);
			return map;
		},
		
		// convert each child of root of type tagName to a value map
		childrenToValueMaps : function(root, tagName) {
			return $(tagName, root).map(
				function(index, child) {
					return $.xml.getChildValueMap(child);
				}
			);
		},
		
		// convert each child of root of type tagName to a map of attribute:value
		//	for each attribute
		childrenToAttributeMaps : function(root, tagName) {
			return $(tagName, root).map(
				function(index, child) {
					return $.xml.getAttributeMap(child);
				}
			);
		}
	}
});


/** Array extensions. */
jQuery.extend({
	array : {
		/** Return the first index of `it` in `array`. */
		indexOf : function indexOf(array, it) {
			for (var i = 0, len = array.length; i < len; i++) {
				if (array[i] == it) return i;
			}
			return -1;
		},

		/** Return true if `array` contains `it`. */
		contains : function contains(array, it) {
			return ($.array.indexOf(array, it) != -1);
		},
		
		
		/** Remove all occurances of `it` in `array`. */
		remove : function remove(array, it) {
			var index;	
			while ( (index = $.array.indexOf(array, it)) != -1) {
				array.splice(index, 1);
			}
			return array;
		}
	}
});


if (!Array.prototype.indexOf) {
	Array.prototype.indexOf = function(it) {
		return $.array.indexOf(this, it);
	}
}



/** Convert function arguments to a proper array, starting at index. */
jQuery.extend({
	args : function(args, index) {
		var array = [];
		if (index == null) index = 0;
		for (; index < args.length; index++) {
			array[array.length] = args[index];
		}
		return array;
	}
});



/** Form utilities. */
jQuery.extend({
	form : {
		
		validate : {
			positiveInteger : function(string) {
				var num = parseInt(string);
				if (isNaN(num) || num < 0) throw new TypeError();
				return num;
			},
			
			// TODO: transform the string...
			ipAddresses : function(string) {
				string = $.trim(string);
				if (/^(\d+\.\d+\.\d+\.\d+)([ ,;]+\d+\.\d+\.\d+\.\d+)*[ ,;]*$/.test(string) == false) {
					throw new TypeError();
				};

				// normalize to comma-separated with no spaces
				list = string.split(/[ ,;]+/);
				for (var i = list.length; i >= 0; i--) {
					if (list[i] == "") list.splice(i,1);

// TODO: make sure IPs are 0...255
				}
				return list.join(",");
			},
			
			identifier : function(string) {
				string = $.trim(string);
				string = string.replace(/[^_a-zA-Z0-9]/g, "_");
				return string;
			}
		},
	
		filter : {

			/** Only allow numbers */
			positiveInteger : function(event) {
				event = $.event.fix(event);
				if (event.charCode == 0) return true;
				var theChar = String.fromCharCode(event.charCode);
				return (/[0-9]/.test(theChar));
			},

			/** Only allow alpha-numeric + "_" + "-" keys to pass an onKeyPress event */
			identifier : function(event) {
				event = $.event.fix(event);
				if (event.charCode == 0) return true;
				var theChar = String.fromCharCode(event.charCode);
				return (/[-_a-zA-Z0-9]/.test(theChar));
			},
			
			/** Only allow numbers, periods, commas and spaces */
			ipAddresses: function(event) {
				if (event.charCode == 0) return true;
				var theChar = String.fromCharCode(event.charCode);
				return (/[., ;0-9]/.test(theChar));
			}
		}	
	}
});


/** Hack:  define the ES5 Array.every method */
if (!Array.every) {
	Array.every = function(array, method, context) {
		if (!array || !array.length) return true;
		for (var i = 0; i < array.length; i++) {
			if (!method.call(context, array[i])) return false;
		}
		return true;
	};
}



/** Message dictionary. */
jQuery.extend({
	message : function(key, subs) {
		if (typeof key != "string") key = key.join(".");
		var msg = $.message.dictionary[key];
		if (!subs || !msg) return msg;
		return $.string.interpolate(msg, subs);
	}
});


/** Dictionary of messages. */
jQuery.message.dictionary = {};


/** Process a message file loaded by someone else. */
jQuery.message.processMessageFile = function(fileContents) {
	var list = fileContents.split(/[\n\r]/);
	$.map(list, function(str, index) {
		var match = str.match(/\s*([^=\s]*)\s*=\s*(.*)$/);
		if (!match) return;
		var key = match[1], value = match[2];
		$.message.dictionary[key] = value;
	});
	
	jQuery.message.updateMessageElements();
}

/** Find everything with a 'message' attribute under the rootElement (default is body)
	(including in page templates)
	and replace its contents with the message dictionary entry.
*/
jQuery.message.updateMessageElements = function(rootElement) {
	var elements = (rootElement ? rootElement.find("[message]") : $("[message]"));
	elements.each(function(index, element) {
		var messageName = element.getAttribute("message"),
			message = $.message.dictionary[messageName]
		;
		if (message !== undefined) {
			element.innerHTML = message;
		}
	});
}


/** Toggle a bunch of classes on/off in a single set, for efficiency. */
jQuery.fn.toggleClasses = function(parameters) {
	for (var i = 0, element; element = this[i++];) {
		var classes = element.className.split(/\s+/);
		for (var name in parameters) {
			var index = classes.indexOf(name),
				present = index != -1,
				shouldBePresent = parameters[name]
			;
			if (present) {
				if (shouldBePresent == false) classes.splice(index, 1);
			} else {
				if (shouldBePresent == true)  classes.push(name);
			}
		}
		element.className = classes.join(" ");
	}
	return this;
}



// debugging (especially in IE)
function dir(it) {
	if (it == null) console.warn("it is null");
	for (var prop in it) {
		console.warn(prop+ ":" + it[prop]);
	}
}
