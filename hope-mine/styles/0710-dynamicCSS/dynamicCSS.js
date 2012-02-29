/*
	Dynamic CSS Processor v 0.1
	Copyright (c) 2007 Matthew Owen Williams, All Rights Reserved.
	owen@dynabooks.com
	
	Please don't give this out, yet.

	Usage:
		1) Create one or more stylesheets as:
				<style type='processed/css' src='url,url,...'></style>

			Note: You can put processing instructions or normal styles inside this sheet
				  and they'll be executed AFTER all rules loaded via URL.
				  This way you can override standard stylesheets by setting variables
				  in your document.
					
		2) Include this file in your document AFTER any stylesheets you want to process
				<script src='dynamicCSS.js'></script>

			This automatically parses all stylesheets of   type='processed/css'   and replaces them
			with the processed rules.  It does not touch   type='text/css'   or other sheets.

	There are two types of dynamic things you can add to your styles:
			* "rules" are formatted as "@...;" e.g.

					@define someVariable #cccccc;
					@import url(somefile.css);

				Rules MAY side-effect the state of the CSS parser 
					(e.g. @define which defines variables)
				and return text to replace themselves with in the text stream.
				
				A rule MAY insert other rules, which will then be parsed.
				
				All rules are parsed BEFORE any expressions are parsed.

			
			* "expressios" are formatted as "[...]" e.g.
					[someVariable]
					[darken(someVariable,30)]

				Expressions are either simple variable replacements, 
				or are function calls to do more interesting things.
				
				Expressions MAY NOT side-effect the state of the CSS parser.
				
				Expressions MAY NOT insert other expresions or rules into the output.
				
				When a given expression is parsed, all instances of that expression
				in the source will be replaced with the same value.


	What you can currently do:
		
		@define variable value;			-- define a variable for replacement later
										 - note: subsequent defines of the same variable will override
									
		@import url(foo.css);			-- import another CSS file at this spot
		
		[variable]						-- output a variable defined above

		[darken(color|var,percent)]		-- darken a given color by percent.
										 - color can be a hex color (#fff or #ffffff),
										    rgb(0,0,0) or rgb(50%, 50%, 50%)
										    or a variable defined above.
										 - basic browser colors work, to get all browser colors
										 		@import(colors.css);
										 - percent is an int between 0 (no change) and 100 (black)

		[lighten(color|var,percent)]	-- lighten a given color by percent.
										 - color can be a hex color (#fff or #ffffff),
										    rgb(0,0,0) or rgb(50%, 50%, 50%)
										    or a variable defined above.
										 - percent is an int between 0 (no change) and 100 (white)

		[png(url,width,height)]			-- return the CSS for an alpha PNG image at url.
										 - Handles IE alpha filter crap.  IE detection is moronic.
										 - width and height are optional.


	What is planned:
	
		@import selector;				-- import all selectors in this stylesheet that match selector at this spot
		
		[get(var|selector,property,property...)]	
										-- return a specific property value from variable or selector
											e.g.   [get(someVar,background-color,color)]
										 - open: not sure how smart this will be.

		@processorSet name value;		-- set processor directives
				
		[opacity(value)]				-- x-platform opacity setting
		[fixBoxModel()]					-- fix box model (to border-box)
		[roundCorners()]				-- output browser-specific CSS for round corners (FF & Safari3)
		
		SOME SORT OF IFDEF BROWSER THING ???
		SOME SORT OF RULE THING ???
		ANYTHING ELSE YOU WANNA SEE ???

*/



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
	}

}



// TODO:  unify the mechanisms of _rules, _methods and COLOR_PARSERS ?



CSS = {
	// if true, we automatically parse as soon as the script is loaded
	//	you can also parse manually with   CSS.processSheets();
	AUTO_PARSE : true,
	
	// "type" attribute of stylesheets we will auto-parse
	AUTO_PARSE_TYPE : "processed/css",


	// regular expressions for processing below
	TRIM_RE					: /^\s+|\s+$/g,
	STRIP_COMMENT_RE		: /\/\*([\s\S]*?)\*\//gm,
	GET_RULES_RE			: /@(.*);/g,
	GET_NEXT_RULE_RE		: /@(.*);/,
	RULE_NAME_RE			: /^@(.*?)[\s;]/,
	STRIP_BRACKETS_RE		: /\[\s*(.*)\s*\]/,
	GET_EXPRESSIONS_RE		: /\[(.*?)\]/g,
	PARSE_METHOD_RE			: /\s*(.*?)\s*\(\s*(.*)\s*\)/,
	SPLIT_WITHOUT_SPACES_RE : /\s*,\s*/,


	// global (page-level) repository of CSS replacements
	//	fill this up with @define foo bar; lines in your CSS
	_replacements : {
		// add basic browser colors to get us started
		// load all the basic browser colors with @import url(colors.css); in your CSS
		aqua:"00ffff;",
		black:"000000;",
		blue:"0000ff;",
		fuchsia:"ff00ff;",
		gray:"808080;",
		green:"008000;",
		lime:"00ff00;",
		maroon:"800000;",
		navy:"000080;",
		olive:"808000;",
		purple:"800080;",
		red:"ff0000;",
		silver:"c0c0c0;",
		teal:"008080;",
		white:"ffffff;",
		yellow:"ffff00;"
	},

	// named rules to process (will be called with CSS object as "this")
	// CONTRACT:  a) rules are allowed to side-effect the state of the machine,
	//			  b) rules are allowed to inject more rules into the text
	//			  c) the entire text needs to be re-parsed after a rule is processed (?)
	//			  d) rules return the text to replace themselves with in the document
	_rules : {

		define : {
			// TODO: make this strip curlies automatically?
			RE : /@define\s+(\w+?)\s+(.*)\s*;/i,
			processor : function(text, rule, name, value) {
					// if has a prop:value pair, make sure it ends with a ";"
					if (value.indexOf(":") && value[value.length-1] != ";") value += ";";
					this._replacements[name] = value;

					// strip the rule out of the text
					return "";
				}
		},

		"import" : {

			// TODO: handle import rule
			// generic import anything (useful when we want to handle selectors)
			//			RE : /@import\s+(.*?)\s*;/i,

			// @import url(file);
			RE : /@import\s+url\s*\(\s*(.*?)\s*\)\s*;/i,
			processor : function(text, rule, url) {
				var value = "";
				try {
					value = XHR.getFile(url);
				} catch (e) {
					console.error("import("+url+"): couldn't load file.");
					//throw(e);
				}
				return value;
			}
		}
	},

	// methods to perform on CSS values (will be called with CSS object as "this")
	// CONTRACT:  a) methods are not allowed to side-effect the state of the machine (???)
	//			  b) methods return a simple value to be inserted into the text
	//			  c) the text does NOT need to be re-processed after a rule is processed (???)
	_methods : {
		darken : function(what, howMuch) {return this.darken(what, howMuch)},
		lighten : function(what, howMuch) {return this.lighten(what, howMuch)},
		png : function(url,width,height) {
			return (CSS.isIE ? "filter:progid:DXImageTransform.Microsoft.AlphaImageLoader(src='"+url+"',sizingMethod='scale');"
							 : "background-image:url("+url+");"
					) + (width ? "width="+width+"px;" : "")
					  + (height ? "height="+height+"px;" : "");
		}

	},


	// create a stylesheet element and set its ruleset to text
	//	attributes are any attributes you want to place on it
	addSheet : function(text, attributes) {
		var sheet = this.createElement("STYLE", (this.isiE ? null : text), (this.byTag("HEAD")||this.byTag("HTML"))[0], attributes);

		// LAME-O:  you need to set css text in a special way in IE
		if (this.isIE) {
			// get the last sheet in the document (which is hopefully the one we just added...)
			// TODO: loop through the stylesheets to make sure we have the right one
			sheet = document.styleSheets[document.styleSheets.length-1];
			sheet.cssText = text;
		}
		return sheet;

		/*
			THE FOLOWING INSERTS RULES ONE AT A TIME INTO A STYLESHEET
				// NOTE: the following **should** work...
				//	sheet.cssText = text;
				// FEH.  have to do it one at a time
				text = text.split("\n").join(" ");
				var rules = text.match(/(\S.*?)\s*\{(.*?)\}/g);
				for (var i = 0, rule; rule = rules[i++]; ) {
					var match = rule.match(/(\S.*?)\s*\{(.*?)\}/);
					// IE chokes if we put an empty rule in there -- do at least a ";"
					sheet.addRule(match[1], match[2]||";");
				}	
		*/
	},
	
	
	// process all stylesheets in the document
	processSheets : function() {
		var sheets = document.getElementsByTagName("STYLE");

		// copy sheets into a new array because the processing might side-effect the collection above
		for (var temp = [], i = 0; i < sheets.length; i++) {
			temp[i] = sheets[i];
		}
		sheets = temp;
		
		// now process (and replace) each sheet
		for (var i = 0, sheet; sheet=sheets[i++];) {
			this.processSheet(sheet);
		}
	},
	
	// process a single stylesheet, if it's type is (this.AUTO_PARSE_TYPE)
	processSheet : function(sheet) {
		if (    sheet.getAttribute("type") != this.AUTO_PARSE_TYPE  
			 || sheet.getAttribute("processed") == "true"
		   ) return; 

		try {
			var text = "";
			
			// if the stylesheet has a "src" attribute, load the file(s) now
			var src = sheet.getAttribute("src");
			if (src) {
				text += XHR.getFiles.apply(XHR, src.split(","));
			}

			// add any text in the sheet after the loaded source
			text += sheet.innerHTML;

			// strip comments
			// TODO: have a processor directive for this
			text = text.replace(this.STRIP_COMMENT_RE,"");
	
			// process "rules" -- see "_rules" variable above
			text = this._processRules(text);
			
			// process expressions -- see "_expressions" variable above
			text = this._processExpressions(text);

			// remove the old sheet from the document
			// TODO: will we hit a limit in IE if we remove the old sheets before adding a new one?
			// TODO: re-use the sheets?
			// TODO: grab attributes from the previous sheet
			sheet.parentNode.removeChild(sheet);
			
			// add the new sheet
			var attributes = {type:"text/css", processed:"true", originalSrc:src};
			this.addSheet(text, attributes);
		} catch (e) {
			console.error(e);
			//throw(e);
		}
	},

	_processRules : function(text) {
		var rule, args;
		try {
			// TODO: instead of replacing all occurances of the rule and
			//		  starting processing from the beginning, 
			//		  replace just this instance of the rule and start from there

			// rules are allowed to stick other rules into the text stream
			// so we process the entire document again after each rule
			while (rule = (text.match(this.GET_NEXT_RULE_RE)||[])[0]) {
				var operator = rule.match(this.RULE_NAME_RE)[1];
				var handler = this._rules[operator];
				if (handler.RE) {
					var match = rule.match(handler.RE);
					args = [text].concat(match);
				} else {
					args = [text, rule];
				}
				var value = handler.processor.apply(this, args);
				if (value == null) value = "";

				// replace all occurances of this rule within the document (???)
				text = text.split(rule).join("");
			}
		} catch (e) {
			// if we get here, we don't understand the rule
			console.error("didn't understand "+rule);
			// strip the rule out of the text
			text = text.split(rule).join("");
			//throw(e);
		}		
		return text;
	},

	_processExpressions : function(text) {
		var vars = text.match(this.GET_EXPRESSIONS_RE);
		if (vars) {
			for (var i = 0; i < vars.length; i++) {
				var expression = vars[i].match(this.STRIP_BRACKETS_RE)[1];
				var value = this.parseExpression(expression);

				// replace text with the expression
				text = text.split(vars[i]).join(value);
			}
		}
		return text;
	},

	// manually define a replacement
	defineReplacement : function(token, value) {
		this._replacements[token] = value;
	},


	// TODO: handle cycles properly!!!!
	parseExpression : function(expression) {
		var value = "";
		var methodMatch = expression.match(this.PARSE_METHOD_RE);
		if (methodMatch) {
			var method = this._methods[methodMatch[1]];
			if (method) {
				var args = methodMatch[2].split(this.SPLIT_WITHOUT_SPACES_RE);
				value = method.apply(this, args);
			} else {
				// couldn't match method
				console.error("parseExpression(): couldn't match method "+expression);
			}
		} else {
			// simple variable replacement -- get from _replacements object
			try {
				var replacement = this._replacements[expression];

				// use this to debug -- cancel will get you out of the loop
				//if (!confirm(replacement)) return value;
				if (replacement.indexOf("[") > -1) {
					value = this._processExpressions(replacement);
				} else {
					value = replacement;
				}
			} catch (e) {
				//	throw(e)
			}
		}
		if (value == null) value = "";
		return value;
	},


	//
	// color stuff
	//
	COLOR_PARSERS : [
		// match "rgb(#,#,#)"
		//	FIXME: matches rgb(6666,...)
		{	RE: /rgb\(\s*(\d*)\s*,\s*(\d*)\s*,\s*(\d*)\s*\)/i,
			converter : function(match,r,g,b) {
							return [parseInt(r), parseInt(g), parseInt(b)]
						}
		},
		// match "rgb(#%,#%,#%)"
		//	FIXME: doesn't match  rgb(0.5%,...)
		{	RE: /rgb\(\s*(\d*)%\s*,\s*(\d*)%\s*,\s*(\d*)%\s*\)/i,
			converter : function(match,r,g,b) {
							return [Math.round(parseInt(r)*2.55),
									Math.round(parseInt(g)*2.55),
									Math.round(parseInt(b)*2.55)
								   ];
						}
		},
		// match "#ffffff"
		// FIXME: matches "#ffffffffff"
		{	RE: /#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i,
			converter:	function(match,r,g,b) {
							return [parseInt(r,16), parseInt(g,16), parseInt(b,16)];
					  	}
		},
		// match "#fff"
		// FIXME: matches "#ffff"
		{	RE: /#?([0-9a-f])([0-9a-f])([0-9a-f])/i,
			converter:	function(match,r,g,b) {
							return [parseInt(r+r,16), parseInt(g+g,16), parseInt(b+b,16)];
						}
		},
		// match a replacement expression
		{	RE: /\S*/,
			converter : function(expression) {
							var value = this.parseExpression(expression)
							return (value ? this.parseColor(value) : null);
						}
		}
	],

	// take a color thinger in one of various forms (see COLOR_PARSERS above) and return [r,g,b]
	parseColor : function(colorStr) {
		// if it's not a string, assume it's a colorRGB
		if (typeof colorStr != "string") return colorStr;
		if (!colorStr) throw ("null color");
		for (var i = 0, rule; rule = this.COLOR_PARSERS[i++]; ) {
			var match = colorStr.match(rule.RE);
			if (match) return rule.converter.apply(this,match);
		}
		throw ("Color not understood:'"+colorStr+"'");
	},
	
	lighten : function(color, percent) {
		var rgb = this.parseColor(color);
		percent = parseInt(percent)/100;
		for (var i = 0; i < 3; i++) {
			rgb[i] = rgb[i] + (255 - rgb[i]) * percent;
		}
		return this.rgb2hex(rgb);
	},
	
	darken : function(color, percent) {
		var rgb = this.parseColor(color);
		percent = 1 - (parseInt(percent)/100);
		for (var i = 0; i < 3; i++) {
			rgb[i] = rgb[i] * percent;
		}
		return this.rgb2hex(rgb);
	},

	// percent is a number between 200 (full light) and 0 (full dark)
	//	use darken() and lighten() to make more sense of this
	adjustColor : function(color, percent) {
		var rgb = this.parseColor(color);
		percent = parseInt(percent)/100;
		for (var i = 0; i < 3; i++) {
			rgb[i] = rgb[i] * percent;
		}
		return this.rgb2hex(rgb);
	},

	// rgb is format [r,g,b], returns #ffffff
	rgb2hex : function(rgb) {
		var color = "#";
		for (var i = 0; i < 3; i++) {
			var it = Math.min(255,Math.max(0,Math.round(rgb[i]))).toString(16);
			color += (it.length == 1 ? "0"+it : it);
		}
		return color;
	},

	//
	// color test routines
	//
	testParseColor : function() {
		console.info(CSS.parseColor("#fff"));
		console.info(CSS.parseColor("#ffffff"));
		console.info(CSS.parseColor("rgb(255,255,255)"));
		console.info(CSS.parseColor("rgb(100%,100%,100%)"));
		this.defineReplacement("BLACK","#fff");
		console.info(CSS.parseColor("BLACK"));
	},


	makeGradient : function(startColor) {
		var output = [];
		for (i = 0; i < 10; i++) {
			output.push("<span style='background:",this.lighten(startColor,100-(i*10)),"'>&nbsp;</span>");
		}
		for (i = 1; i < 10; i++) {
			output.push("<span style='background:",this.darken(startColor,i*10),"'>&nbsp;</span>");		
		}
		var div = document.createElement("DIV");
		div.innerHTML = output.join("");
		document.getElementsByTagName("BODY")[0].appendChild(div);
	},


	//
	// generic parsing routines
	//

	trim : function(str) {
		return str.replace(/^\s+|\s+$/g, '');
	},
	
	
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
				this.byId(parent).appendChild(it);
			}
		} catch (e) {
			console.error(e);
			// throw(e);
		}
		return it;
	}
}


if (CSS.AUTO_PARSE) CSS.processSheets();