/*

	TODO:	* processExpresion is in the middle of a refactor and isn't doing anything!
			* import() needs to be local to the css file we're looking at now (???)
			* seems like loading the templates and parsing them need to be different steps -- autoParse and autoApply ?
	
	NEXT:	* convert expressions to syntax
				$[...]
			* use findEnd() to parse rules and expressions
				-- get ruleName (@foo)
				-- use findEnd to match to proper ";"
				-- each rule has:
						- one argument RE
						- an array of argumentRE: adaptor pairs
					- adaptors can call "doit" function?


	$[darken(foo,bar,blarg)]
		-- find next $[
		-- use findEnd to find to ...]
		-- if has word then paren:  /^...(/
			-- get "darken", look up in rules
				- use darken's argumentsRE to get arguments
					-- if doesn't match throw error and replace with ""  (replace with comment ?)
				- call darken method with arguments
				- replace with results
		-- else
			- call evalExpression()
				- if no match, replace with "" & note error  (or replace with comment?)
			- replace with results




*/




/*

	TODO:  rename to "SKIN"?

	Dynamic CSS Processor version 1
	Copyright (c) 2007 Matthew Owen Williams, All Rights Reserved.
	owen@dynabooks.com
	
	Please don't give this out, yet.

	Usage:
		1) Create one or more stylesheets as:
				<style type='skin/css' src='url,url,...'></style>

			Note: You can put processing instructions or normal styles inside this sheet
				  and they'll be executed AFTER all rules loaded via URL.
				  This way you can override standard stylesheets by setting variables
				  in your document.
					
		2) Include this file in your document AFTER any stylesheets you want to process
				<script src='dynamicCSS.js'></script>

			This automatically parses all stylesheets of   type='skin/css'   and replaces them
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
		SOME SORT OF MACRO THING ???
		TOOLTIPS?
		ANYTHING ELSE YOU WANNA SEE ???
		IE-specific library that can be pulled in to handle :content and :hover and such?


*/



// TODO:  unify the mechanisms of _rules, _methods and COLOR_PARSERS ?



CSS = {
	// if true, we automatically parse as soon as the script is loaded
	//	you can also parse manually with   CSS.processSheets();
	AUTO_PARSE : true,
	
	AUTO_PARSE_PARAMS : {
		tagName : "STYLE",
		tagType : "skin/css",
		alreadyParsedMarker : "processed",
		stripComments : true,
		commentStripRE : /\/\*([\s\S]*?)\*\//gm,
		autoRemoveTag : true,
	},


	autoParse : function() {
		PARSER.parseDOMtags.call(this, this.AUTO_PARSE_PARAMS, this.parseSheet);
	},
	
	// process a single stylesheet
	parseSheet : function(text, element, attributes) {
		try {	
			// process "rules" -- see "_rules" variable below
			text = this._processRules(text);
			
			// process expressions -- see "_expressions" variable below
			text = this._processExpressions(text);

			// munge the attributes a bit
			attributes.type = "text/css";
			attributes.processed = "true";

			this.addSheet(text, attributes);
		} catch (e) {
			console.error(e);
			//throw(e);
		}
	},


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
	
	// manually define a replacement
	defineReplacement : function(token, value) {
		this._replacements[token] = value;
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
		var sheet = this.createElement("STYLE", (BROWSER.isIE ? null : text), (BROWSER.byTag("HEAD")||BROWSER.byTag("HTML"))[0], attributes);

		// LAME-O:  you need to set css text in a special way in IE
		if (BROWSER.isIE) {
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


	EXPRESSION_END_RE : /]/g,
	EXPRESSION_METHOD_RE : /^\s*(.*?)\s*\(\s*(.*)\s*\)\s*/,
	_processExpressions : function(text) {
		var end = 0, match;
		while (true) {
			var start = text.indexOf("$[", end);
			if (start == -1) return text;
			
			// TODO: have findEnd throw if not found?
//console.info("looking for ", this.EXPRESSION_END_RE.source, " from ", start, ": '", text.substr(start,40).split('\n').join(" "), "...'");
			var end = this.findEnd(text, this.EXPRESSION_END_RE, start);
			if (end == -1) throw "mismatched expression at "+start;
			
			var expression = text.substring(start+2,end-1);
//console.info("found expression [", start+2, end-1, "]: '", expression, "'");

			if (match = this.EXPRESSION_METHOD_RE(expression)) {
				// NOTE: because expressions can be nested (???) have to do a findEnd(",") to split the arguments
				var args = this.splitArgs(match[2]);
				console.log("matched method:",match[1], args);
			} else {
				console.log("matched expression:", expression);
			}
			start = end;
//if (!confirm("continue?")) return;
		}
	},
	
	splitArgs : function(argString) {
		var args = [];
		var start = 0;
		while (true) {
			var comma = this.findEnd(argString, /,/g, start);
			if (comma == -1) {
				args.push(this.trim(argString.substring(start)));
				break;
			} else {
				args.push(this.trim(argString.substring(start, comma-1)));
				start = comma;
			}
		}
		return args;
	},
	

	START_PARENS : ["[","{","("],
	START_PAREN_RE : /[[{(]/g,
	END_PARENS : ["]", "{", "("],
	END_PAREN_RE : /[\]})]/g,
	
	// return the first occurance of endRE in string starting at start (default start == 0)
	//	skipping any endRE's inside nested START_ and END_PARENS above
	//	NOTE: only works if your nesting is valid, eg: fails on "({))"
	//  NOTE: doesn't handle quotes yet
	findEnd : function (string, endRE, start) {
		if (start == null) start = 0;
		endRE.lastIndex = start;		

		// I THINK (true) IS OK BECAUSE end IS ALWAYS ADVANCING...
		while (true) {	//(confirm(start + ":" + end + ":" + string.substring(start,end)+":?")) {
			var results = endRE(string);
			if (!results) return -1;
	
			// ok, we maybe have a match
			//	 NOTE:  the +1 there is ONLY if the end token is one of our paren symbols!  (???)
			var end = results.index + 1;
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

/*
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
*/

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
	}
}


if (CSS.AUTO_PARSE) CSS.autoParse();
