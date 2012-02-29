

// make sure we don't get lame errors from not having console methods
if (!window.console || !console.warn) {
	function show(error) {	
		var message = (arguments.length == 1 && error.message 
							? error.message
							: Array.prototype.join.apply(arguments,[""])
						);
		alert(message)	
	}
	window.console = {	log:show, warn:show, debug:show, info:show,	error:show	};
}


// dead simple x-platform XHR object
XHR = {
	getXHRObject : function() {
		methods = [
			function(){return new XMLHttpRequest()}, 					// all except IE
			function(){return new ActiveXObject('Msxml2.XMLHTTP')},		// different versions of IE
			function(){return new ActiveXObject('Microsoft.XMLHTTP')},
			function(){return new ActiveXObject('Msxml2.XMLHTTP.4.0')}
		];
		for (var i = 0, xhrMethod; xhrMethod = methods[i++];) {
			try {
				var xhr = xhrMethod();
				// It worked! Replace the "get" function with the correct one and return the XHR.
				XHR.getXHRObject = xhrMethod;
				return xhr;
			} catch (e) {}
		}
		throw new Error("getXHRObject: Could not get XHR object for this browser");
	},

	// TODO: re-use XHR objects?

	// synchronous load
	getFile : function(url, asXML, data) {
		var xhr = this.getXHRObject();
		xhr.open("GET", url, false);
		xhr.send(data);
		return asXML ? xhr.responseXML : xhr.responseText;
	},
	
	// simple, synchronous load of many files
	getFiles : function(url1,url2,etc) {
		var text = "";
		for (var i = 0; i < arguments.length; i++) {
			try {
				if (arguments[i]) text += XHR.getFile(arguments[i]) + "\n";
			} catch (e) {
				console.error("XHR.getFiles(): could not load ", arguments[i], " :: ", (e.name||e.message));
				//throw(e);
			}
		}
		return text;
	},
	
	// do an apply with your object as :this"
	autoParse : function(callback) {
		var elements = document.getElementsByTagName(this.AUTO_PARSE_TAG);
		// copy the elements into a new array in case the doc gets modified
		for (var temp = [], i = 0, it; temp[i] = elements[i]; i++) {}
		elements = temp;

		for (var i = 0, element; element = elements[i++]; ) {
			// bail if it's not the right type, or if it has already been processed
			if (element.type != this.AUTO_PARSE_TYPE || element.getAttribute(this.AUTO_PARSE_MARKER) == "true") continue;
			
			// load any src='' files
			var text = "";
			var src = element.getAttribute("src");
			if (src) {
				text += XHR.getFiles.apply(XHR, src.split(","));
			}
			// get any text from the element itself
			text += element.innerHTML;
			
			// strip comments if the stripper is defined
			if (this.AUTO_PARSE_STRIP_COMMENTS && this.AUTO_PARSE_STRIP_COMMENT_RE) {
				text = text.replace(this.AUTO_PARSE_STRIP_COMMENT_RE,"");
			}
			
			// build an object of the attributes of the element
			// TODO: cross-platform???
			var attributes = {};
			for (var i = 0, attr; attr = element.attributes[i++]; ) {
				attributes[attr.nodeName] = attr.nodeValue;
			}

			// remove the element from the DOM if desired
			if (this.AUTO_PARSE_AUTO_REMOVE) {
				element.parentNode.removeChild(element);
			}
						
			// now parse the element itself (your class needs to implement this)
			callback.call(this, text, element, attributes);
		}	
	}

}


var BROWSER = {
	//
	//	generic browser convenience routines
	//

	// most primitive and stupid browser sniffing you can imagine
	isIE : (document.all != null),

	// simple error stuff, so we don't have to worry about console being present
	surfaceError : function() {
		var message = Array.prototype.join.apply(arguments,[""]);
		console.warn("CSS:",message);
	},

	byId : function(id) {
		return (typeof id == "string" ? document.getElementById(id) : id);
	},

	byTag : function(tag) {
		return document.getElementsByTagName(tag);
	},
	
	createElement : function(tag, html, parent, attributes) {
		var it;
		try {
			it = document.createElement(tag);
			if (html) {
				try {
					it.appendChild(document.createTextNode(html));
				} catch (e) {
					// console.error(e);
				}

			}
			if (attributes) {
				for (var prop in attributes) {
					it.setAttribute(prop, attributes[prop]);
				}
			}
			if (parent) {
				BROWSER.byId(parent).appendChild(it);
			}
		} catch (e) {
			console.error(e);
			// throw(e);
		}
		return it;
	}
}



// generic parser routines
var PARSER = {
	// parse a bunch of tags based on a big named set of parameters
	// do an apply with your object as :this"
	//
	// TODO: return a list rather than doing the callback on each so we don't have to be "this"
	parseDOMtags : function(params, callback) {
		var elements = document.getElementsByTagName(params.tagName);
		// copy the elements into a new array in case the doc gets modified
		for (var temp = [], i = 0, it; temp[i] = elements[i]; i++) {}
		elements = temp;

		for (var i = 0, element; element = elements[i++]; ) {
			// bail if it's not the right type, or if it has already been processed
			if (element.type != params.tagType || element.getAttribute(params.alreadyParsedMarker) == "true") continue;
			
			// load any src='' files
			var text = "";
			var src = element.getAttribute("src");
			if (src) {
				text += XHR.getFiles.apply(XHR, src.split(","));
			}
			// get any text from the element itself
			text += element.innerHTML;
			
			// strip comments if the stripper is defined
			if (params.stripComments && params.commentStripRE) {
				text = text.replace(params.commentStripRE,"");
			}
			
			// build an object of the attributes of the element
			// TODO: cross-platform???
			var attributes = {};
			for (var i = 0, attr; attr = element.attributes[i++]; ) {
				attributes[attr.nodeName] = attr.nodeValue;
			}

			// remove the element from the DOM if desired
			if (params.autoRemoveTag) {
				element.parentNode.removeChild(element);
			}
						
			// now parse the element itself (your class needs to implement this)
			callback.call(this, text, element, attributes);
		}	
	},
	
	
	// NOTE: does not currently handle nested tags!
	parseTextTags : function(text, tagName) {
		var tagRE = new RegExp("<"+tagName+"([\\s\\S]*?)>([\\s\\S]*?)</"+tagName+">","gi");
		var match, matches = [];
		var start = 0;
		while (match = tagRE(text)) {
			matches.push( {
//				start : tagRE.lastIndex - match[0].length,
//				end	: tagRE.lastIndex,
				tagName : tagName,
				outerHTML : match[0],
				innerHTML : match[2],
				attributes : PARSER.parseAttributeString(match[1])
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
		var attrs = attrString.match(PARSER.ATTRIBUTES_RE);
		if (attrs) {
			for (var i = 0, attr; attr = attrs[i++]; ) {
				var match = attr.match(PARSER.ATTRIBUTE_RE)
				object[match[1]] = match[2];
			}
		}
		return object;
	},
	
	TRIM_RE					: /^\s+|\s+$/g,
	trim : function(str) {
		return str.replace(this.TRIM_RE, '');
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
	}

}

