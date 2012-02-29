


jQuery.extend({
	
	expand : function(string, context) {
		return $.string.interpolate(string, context);
	},

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
		toLegalId : function(string) {
			var id = (""+string).replace($.string.ILLEGAL_ID_PATTERN, "_");
			// make sure the id does not start with a number
			if (id.match($.string.STARTS_WITH_DIGIT_PATTERN)) id = "_"+id;
			return id;
		},
		
		capitalize : function(string) {
			return string.charAt(0).toUpperCase() + string.substr(1);
		},
		
		startsWith : function(string, prefix) {
			return (""+string).substr(0, prefix.length) === prefix;
		},
		
		contains : function(string, substring) {
			return (""+string).indexOf(""+prefix) !== -1;
		},
		
		
		// truncate a string if necessary, 
		//	omitting the middle bit and putting a "..." in the middle
		truncate : function(string, length) {
			if (!string) return "";
			if (string.length < length) return string;
			var firstBit = Math.floor(length * 2 / 3),
				lastBit  = length - firstBit
			;
			return string.substr(0, firstBit) 
					+ "&hellip;"
					+ string.substr(string.length - lastBit);
		},

		// interpolate a string with a context object
		//	e.g.	"some #{adjective} string".interpolate({adjective:"funky"})
		//		 == "some funky string"
//REFACTOR
		interpolate : function(string, context) {
			if (!string) return "";
			var matches = string.match(/#{(.*?)}/g), str = string;
			if (!matches) return string;

			for (var i = 0, match; match = matches[i++];) {
				// get the match expression
				var expression = match.match(/#{(.*?)}/)[1]
					value = $.string.parseExpression(expression, context)
				;
				if (value == null) value = "";
				str = str.split("#{"+expression+"}").join(value);
			}
			return str;
		},
		
		_globalMatcher : /^(\$|\w+):/,
		// walk a dotted path along some context object and return the indicated value
		parseExpression : function(expression, context) {
			if (!context) context = window;
			
			// if there's a "|" in the string, that indicates we should set an attribute 
			var split = expression.split("|");
			expression = split[split.length-1];
			
			var global = expression.match($.string._globalMatcher);
			if (global) {
				global = global[1];
				expression = expression.substr(global.length+1);
				if (global === "message") {
					expression = $.message.dictionary[expression];
					return (expression ? $.string.interpolate(expression, context) : "");
				} else if (global == "template") {
					var template = $.templates[expression];
					if (template) return $.expand(template, context);
				} else {
					context = window[global];
				}
			}
			
			try {
				// match a dotted.path to some sub-value of the context object
				// for each sub-key:
				expression = expression.split(".");

				// we will walk down the context object to find the value
				//	at the end, 'value' will be the replacement text
				var value = context;
				
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
			} catch (e) {
				return "";
			}
			return value;
		},

		// update a set of 'parts' of an element with the interpolated values from the part='x' attribute
//REFACTOR -- pull the "|" stuff out and don't pass to parseExpression
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
//REFACTOR - move into $.templates
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
//REFACTOR - use?  jQuery probably has one...
		fromObject : function(object) {
			var output = [];
			for (var key in object) {
				var value = object[key];
				if (typeof value == "string") value = "'"+value+"'";
				else if (typeof value == "object") value = $.string.fromObject(value);
				output.push("'"+key+"':"+value);
			}
			return "{"+output.join(",")+"}";
		},
		
		// if a string has "<", ">" or "&" characters in it, wrap it in a CDATA
		makeXmlSafe : function(string) {
			if (   string.indexOf("<") > -1
				|| string.indexOf(">") > -1
				|| string.indexOf("&") > -1
			) {
				return "<![CDATA["+string+"]]>";
			}
			return string;
		}
	}
});

// change base64 keyset to "modified Base64 for URL"
jQuery.base64Keys = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_=";



