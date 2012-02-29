

// 
//	TokenStream -- takes a bunch of text and splits it into tokens
//					(current geared toward english parsing, modify "getToken()" to change parsing rules)
//					
//	To use:  
//				var stream = hope.TokenStream();
//				for (var index = 0, token; token = stream.getToken(index++);) {
//					// token is the next token
//					// token will be null when you're at the end of the file, thus will exit the loop
//				}
//	Notes: 	
//			+ multiple runs of white space are collapsed
//			+ return characters (one or many) are returned as a single hope.EOL
//			+ end of file is returned as hope.EOF
//			+ comments are skipped entirely
//			+ getToken(index) returns null ONLY if we're past the end of the file
//			+ we parse as we go, and only build up the token indices once, so it is efficient to call getToken(n) many times
//			+ strings and numbers are returned as a single token with quotes ("foo bar baz" or -1.34)
//			+ we assume you're keeping track of the index in the stream that you're looking at
//					(eg: it's not stored in the stream)
//				because we assume this will be used for lookahead parsing
//
//	TODO:	
//			+ not actually skipping comments yet
//			+ handle malformed token stream?  how to tell?  possible?
//			+ quoted quotes in strings
//			+ if there is CONTINUE_TO_NEXT_LINE char ("\" or "Â" or "=>" or ???) at then of line, skip the EOL
//			+ some sort of "string to end of block" thinger?
//
(function(){
	hope.EOL = "EOL";
	hope.EOF = "EOF";

	var UNDEFINED;

	var SKIP_SPACE_RE = /\s+/g;
	var SKIP_SPACE_AND_EOL_RE = /[\s\n]+/g;
	var COMMENT_RE = /--(.+?)\n/;
	
	// NOTE: doesn't work with escaped quotes yet
	//	negative numbers?
	var MATCH_TOKEN_RE = /([\w$]+|-?\d+(?:\.\d+)|-?\.\d+|".*?"|'.*?'|\*|\+|\/|-|>=|>|<=|<|\(|\))([ \t\n])*/g;
	var GET_LINE_NUM_RE = /\n/g;

	// in the tokenIndex, each token has an array of the following parts
	var STARTCHAR = 0;
	var SUBSTRING = 1;


	hope.TokenStream = function(text) {
		// make sure text ends with a newline
		this.text = text;
	
		// tokenIndex is an array of [start,text] for toekn positions in the stream
		this.tokenIndex = [];
		
		// next start char after the last item in tokenIndex
		this.nextStart = 0;
		// skip any initial spaces or returns
		var match = SKIP_SPACE_AND_EOL_RE.exec(this.text);
		if (match) {
			this.nextStart = match[0].length;
		}
	}
	hope.TokenStream.prototype = {
		// true when we've gotten to the end of the file
		fullyParsed : false,
		
		// get a token by index
		getToken : function(num) {
			// if we've seen this token already, just return the substring
			if (this.tokenIndex[num]) return this.tokenIndex[num][SUBSTRING];
			
			// if we haven't seen it and we've fully parsed the file, return UNDEFINED
			if (this.fullyParsed) return UNDEFINED;
		
			// if they're looking before the front of the file, return "" ???
			if (num < 0) return "";

			// advance the index of the token match regular expression past the end of our index
			MATCH_TOKEN_RE.lastIndex = this.nextStart;

			for (var i = this.tokenIndex.length - 1; i < num; i++) {
				// find the next token match
				var match = MATCH_TOKEN_RE.exec(this.text);
				if (match != null) {
					var startIndex = (MATCH_TOKEN_RE.lastIndex - match[0].length);
					var endIndex = startIndex + match[1].length;
					var substring = this.text.substring(startIndex, endIndex);
					if (substring == "\n") substring = hope.EOL;
					this.tokenIndex.push([startIndex, substring]);
		
					// if there is a return in the match, add an EOL to the tokenIndex
					var returnChar = match[0].indexOf("\n");
					if (returnChar > -1) {
						this.tokenIndex.push([startIndex + returnChar, hope.EOL]);
						i++;
					}

					this.nextStart = startIndex + match[0].length;
				} else {
					// either we're beyond the end of the file or there was an error
					//	just handle the former for now
					this.fullyParsed = true;
					this.tokenIndex.push([this.text.length, hope.EOF]);
					return hope.EOF;
					break;
//					throw Error("Couldn't parse token at index " + index + " ('" + this.text.substring(index, 20).split("\n").join("\\n") + "...')");
				}				
			}
			return this.tokenIndex[num][SUBSTRING];
		},
		
		// use this mostly for debugging -- calling stream.getToken() yourself repeatedly is more efficient
		//	parses the entire stream into tokens, returns the whole thing as an array
		getAllTokens : function() {	
			var tokens = [];
			for (var i = 0, token; token = this.getToken(i++);) {
				tokens.push(token);
			}
			return tokens;
		},

		// use this mostly for debugging
		getTokenContextString : function(tokenNum) {
			try {
				var startChar = this.getStartChar(tokenNum);
				var text = this.text.substring(startChar, startChar + 20).split("\n").join(" EOL");
				return ["on line ", this.getLineNumOfChar(startChar), ": '... ", text, " ...'"].join("");
			} catch (e) {
				return " IN UNKNOWN SPOT";
			}
		},

		getStartChar : function(tokenNum) {
			try {
				return this.tokenIndex[tokenNum][STARTCHAR];
			} catch (e) {
				return -1;
			}
		},

		// figure out the line number of a given token
		getLineNumOfToken : function(tokenNum) {
			try {
				return this.getLineNumOfChar(this.tokenIndex[tokenNum][STARTCHAR]);
			} catch (e) {
				return -1;
			}
		},
	
		// figure out the line number of a given character position
		getLineNumOfChar : function(charNum) {
			var RE = GET_LINE_NUM_RE;
			RE.lastIndex = 0;
			for (var lineNum = 0; match = RE.exec(this.text); lineNum++) {
				if (RE.lastIndex > charNum) return lineNum;
			}
			return -1;
		}
	}
})();



function ParseTree(list) {
	if (list) this.list = list;
}
ParseTree.prototype = {
	constructor : Array,		// to fake out hope.dir()
	getParseValue : function() {
		for (var i = 0; i < this.children.length; i++) {
			var kid = this.children[i];
			if (kid._rule && kid._rule.translate()) {
				kid._rule.translate()
			}
		}
	}
}

function ParseTreeItem(rule, stream, index, value, children) {
	if (rule.name) this.name = rule.name;
	this.type = rule.type;
	this._rule = rule;
	this._stream = stream;
	this._index = index;
	if (value) this.value = value;
	if (children) this.children = children;
}
ParseTreeItem.prototype.toString = function() {
	return this.translation;
}



//
// things that can make up a rule
//
//	PARSE API:
//		- take in parseTree, token stream and index in tokens
//		- if a match is found, 
//				- throw something appropriate on the parse tree
//				- return correct new index
//		- if no match found
//				- if optional, return null (no match)
//				- if not optional, throw error
//


// placeholder for assigning in rules, doesn't do anything
var OPTIONAL = true;



//
//	ABSTRACT CLASS
//
//	- When you want to create a new createSubclass, just set its prototype to a new Parseable 
//		with the properties you want to apply to the createSubclass proto
//
function Parseable(args) {
	for (var prop in args) {
		this[prop] = args[prop];
	}
}
Parseable.prototype = {
	_debugging : false,				// if true on this obj or any createSubclass, we write debug messages while parsing
	_optional : false,
	type : "parseable",
	getValue : function() {
		return this.value;
	},
	
	// take the data returned by a successful match and add add it to the parseTree
	// default implementation is just to put an object with all of the relevant params into the parseTree
	addToParseTree : function(parseTree, stream, index, value, children) {
		parseTree.push(new ParseTreeItem(this, stream, index, value, children));
	},	

	addListToParseTree : function(parseTree, list) {
		for (var i = 0; i < list.length; i++) {
			parseTree.push(list[i]);
		}
	},

	// transform any string data items to literals
	//	if the literal starts with a "?" it will be marked optional
	ruleListFromString : function(string) {
		var list = string.split(" ");
		for (var i = 0; i < list.length; i++) {
			var it = list[i];
			if (typeof it != "string") continue;

	
			var optional = false;
			if (it.charAt(0) == "?") {
				optional = OPTIONAL;
				it = it.substring(1);
			}

			switch (it.charAt(0)) {
				case "<":
					if (it.charAt(1) == "<") {
						it = new RepeatingExpression(it.substring(2, it.length-2), optional);
					} else {
						it = new Expression(it.substring(1, it.length-1), optional);
					}
					break;
				
				case "*":
// TODO: handle identifier backref
					it = new Identifier(it.substring(1), optional);
					break;
				
				case "[":
					var choices = it.substring(1,it.length-1).split("|");
					for (var c = 0; c < choices.length; c++) {
						choices[c] = this.ruleListFromString(choices[c]);
					}
					it = new Choice(choices, optional);
					break;
				
				default:
					it = new Literal(it, optional);
			}
			list[i] = it;
//if (this._debugging) console.warn(it);
		}
		var result;
		if (list.length == 1) {
			result = list[0];
		} else {
			result = new Sequence(list);
		}
//console.log(result.toString())
		return result;
	},


	
	makeTranslatorFunction : function(string) {
		string = string.split("EOL").join("\\n");
		var tokens = hope.chopOnTags(string);
		var output = ["var output = [];"];
//console.log(tokens);
		for (var i = 0; i < tokens.length; i++) {
			var token = tokens[i];
			if (token.charAt(0) == "<") {
				token = token.substring(1, token.length-1);
				if (token == "recurse") {
					output.push("var kids = parseItem.children;",
								"for (var i = 0; i < kids.length; i++) {",
								"	var kid = kids[i];",
								"	if (kid._rule && kid._rule.translate) {",
								"		output.push(kid._rule.translate(kid));",
								"	}",
								"}");
				} else {
					output.push("output.push(this.getParseData(parseItem[0], '"+token+"'));")
				}
			} else {
				token = token.split("&gt;").join("<").split("&lt;").join(">");
				output.push('output.push("'+token+'")');
			}
		}
		output.push("return output.join('')");
//console.info(output.join("\n"));
		// TODO: new Function() is not super efficient...
		return new Function("parseItem", output.join("\n"));
	},



	getParseData : function(parseItem, name) {
		var children = parseItem.children;
		for (var i = 0; i < children.length; i++) {
			var it = children[i];
			if (it && it.name == name){
				return it._rule.translate(it);
			}
		}
	},

	
	parseError : function(stream, index, message1, message2, etc) {
		var message = Array.prototype.slice.call(arguments, 2).join("");
		return new Error('"' + this.toString() + '".parse(): ' + message + '\t' + stream.getTokenContextString(index));
	},
	
	debug : function() {
		if (!this._debugging) return;
		console.debug.apply(console, arguments);
	},
	debugGroup : function() {
		if (!this._debugging) return;
		console.group.apply(console, arguments);
	},
	endDebugGroup : function() {
		if (!this._debugging) return;
		console.groupEnd();
	}
};
Parseable.prototype.toString = function() {	return (this._optional ? "?" : "") + this.value	}


// Rules are expressions that do something to their resulting parseTree

// TODO: if no translator, just recurse for children?
function Rule(ruleSyntax, translatorString) {
	this.rule = this.ruleListFromString(ruleSyntax);
	if (translatorString) this.translate = this.makeTranslatorFunction(translatorString);
}
Rule.prototype = new Parseable({
	type : "rule",
	parse : function(parseTree, stream, index) {
		var localParseTree = [];
		
		try {
			var next = this.rule.parse(localParseTree, stream, index);
			if (this.translate == null) {
				this.addListToParseTree(parseTree, localParseTree);			
			} else {
				this.addToParseTree(parseTree, stream, index, null, localParseTree);		
			}
			return next;
		} catch (e) {
			throw (e);
		}
	},
		
	toString : function() {
		return '"' + this.rule.join(" ") + '"';
	}
});






// Literal -- literal string value that must be matched
function Literal(value, optional) {
	this.value = value;
	if (optional == OPTIONAL) this._optional = true;
}
Literal.prototype = new Parseable({
	type : "literal",
	parse : function(parseTree, stream, index) {
		var token = stream.getToken(index);
		if (token && token == this.value) {
			this.debug("matched literal "+this.value);
			if (token != hope.EOL && token != hope.EOF) {
				this.addToParseTree(parseTree, stream, index, this.value);
			}
			return ++index;
		}
		if (this._optional) return null;
		throw this.parseError(stream, index, "Couldn't match '", this.toString(), "'");
	},
	
	translate : function(parseItem) {
		return parseItem.value;
	}
});


// Identifier:  variable/method/property/etc name
function Identifier(value, optional) {
	this.value = value;
	this.name = value;
	if (optional == OPTIONAL) this._optional = true;
}
Identifier.prototype = new Parseable({
	type : "identifier",
	PARSE_RE : /^[A-Za-z$_][\w$]*$/,
	parse : function(parseTree, stream, index) {
		var token = stream.getToken(index);
		if (token && token.match(this.PARSE_RE)) {
			this.debug("matched identifier "+this.value);
			this.addToParseTree(parseTree, stream, index, token);
			return ++index;
		}
		if (this._optional) return null;
		throw this.parseError(stream, index, "Couldn't match identifier");
	},
	
	translate : function(parseItem) {
		return parseItem.value;
	},
	
	toString : function() {	return "*"+this.name}
});



// Num: a number (either integer or real)
function Num(optional) {
	if (optional == OPTIONAL) this._optional = true;
}
Num.prototype = new Parseable({
	value : "#",
	type : "num",
	parse : function(parseTree, stream, index) {
		var token = stream.getToken(index);
		if (token) {
			var num = Number(token);
			if (num != "NaN") {
				this.debug("matched number "+this.value);
				this.addToParseTree(parseTree, stream, index, num);
				return ++index;
			}
		}
		if (this._optional) return null;
		throw this.parseError(stream, index, "Couldn't match number");
	}
});



// Integer: a whole number
// TODO: simplify according to Num above?
function Integer(optional) {
	if (optional == OPTIONAL) this._optional = true;
}
Integer.prototype = new Parseable({
	value : "#",
	type : "integer",
	PARSE_RE : /^-?\d+$/,
	parse : function(parseTree, stream, index) {
		var token = stream.getToken(index);
		if (token && token.match(this.PARSE_RE)) {
			this.debug("matched integer "+this.value);
			this.addToParseTree(parseTree, stream, index, parseInt(token));
			return ++index;
		}
		if (this._optional) return null;
		throw this.parseError(stream, index, "Couldn't match integer");
	}
});



// Real: a floating point number
// TODO: simplify according to Num above?
function Real(optional) {
	if (optional == OPTIONAL) this._optional = true;
}
Real.prototype = new Parseable({
	value : "#.#",
	PARSE_RE : /^-?(\d+|\d+\.\d*|\d*\.\d+)$/,
	parse : function(parseTree, stream, index) {
		var token = stream.getToken(index);
		if (token && token.match(this.PARSE_RE)) {
			this.debug("matched real "+this.value);
			this.addToParseTree(parseTree, stream, index, parseFloat(token));
			return ++index;
		}
		if (this._optional) return null;
		throw this.parseError(stream, index, "Couldn't match real");
	}
});





//
// Expression: pointer to a rule (???)
//
function Expression(name, optional) {
	this.name = name;
	if (optional == OPTIONAL) this._optional = true;
}
Expression.prototype = new Parseable({
	type:"expression",
	parse : function(parseTree, stream, index) {
		var	localParseTree = [],
			rule = english.rules[this.name];
		;

		if (!rule) throw this.parseError(stream, index, "Couldn't find rule '", this.toString(), "'");
		try {
			this.debugGroup("parsing: ", this.toString());
			// attempt to parse the rule until we cain't parse it no mo'
			var endIndex = rule.parse(localParseTree, stream, index);
			this.endDebugGroup()
		} catch (e) {
			this.endDebugGroup()
			if (!this._optional) throw e;
			return null;
		}
		
		if (endIndex == null && !this._optional) throw this.parseError(stream, index, "Couldn't match expression '", this.toString(), "'");

		this.addListToParseTree(parseTree, localParseTree);
		return endIndex;
	},
	toString : function() 	{ 	return (this._optional ? "?" : "") + "<" + this.name + ">"	}
});



//
// RepeatingExpression: pointer to a rule that can occur 1 or more times (0 or more if optional == true)
//	TODO: have a min and max number...
//
function RepeatingExpression(name, optional) {
	this.name = name;
	if (optional == OPTIONAL) this._optional = true;
}
RepeatingExpression.prototype = new Parseable({
	type : "repeatingExpression",
	parse : function(parseTree, stream, index) {
		var next = index,
			count = 0, 
			ruleParseTree = [],
			localParseTree = [],
			endIndex,
			rule = english.rules[this.name];
		;
		if (!rule) throw this.parseError(stream, index, "Couldn't find rule '", this.toString(), "'");
		try {
			this.debugGroup("parsing: ", this.toString());
			// attempt to parse the rule until we cain't parse it no mo'
			while (endIndex = rule.parse(localParseTree, stream, next)) {
				next = endIndex;
				this.debug("matching expression ", this.name);
				count++;
// NOTE: this depends on the children of the local parse tree being self-contained, which I think is ok
				ruleParseTree = ruleParseTree.concat(localParseTree);
//				this.addToParseTree(parseTree, stream, index, null, localParseTree);
				localParseTree = [];
// DEBUG: don't recurse infinately
	if (count > 100) break;
			}
			this.endDebugGroup()
		} catch (e) {
			this.endDebugGroup()
			// if we got an error on the first repeat, just pass the error up
			if (!this._optional && count == 0) throw e;
		}
	
		// if we get here, we ran out of matches
		if (!this._optional && count == 0) throw this.parseError(stream, index, "Couldn't match expression '", this.toString(), "'");
if (this._debugging) console.warn("matched RE "+this);
		if (ruleParseTree.length > 0) {
			this.addListToParseTree(parseTree, ruleParseTree);

//			parseTree.push(new ParseTreeItem(this, stream, index, null, ruleParseTree));
		}
		return next;
	},

	translate : function(parseItem) {
//console.group("RE.translate");
//console.dir(parseItem);
		var output = [];
		var kids = parseItem.children;
		for (var i = 0; i < kids.length; i++) {
			var kid = kids[i];
//console.dir(kid);
			if (kid._rule && kid._rule.translate) {
				output.push(kid._rule.translate(kid));
			}
		}
//console.groupEnd();
	},
	
	toString : function() 	{ 	return (this._optional ? "?" : "") + "<<" + this.name + ">>"	}
});



function Sequence(list, optional) {
	this.list = list;
	if (optional == OPTIONAL) this._optional = true;
}
Sequence.prototype = new Parseable({
	type:"sequence",
	parse : function(parseTree, stream, index) {
		var localParseTree = [];
		var next = index, errored = false;
		try {
			this.debugGroup("parsing: ", this.toString());
			// iterate for each item in our list
			for (var i = 0, item; item = this.list[i++]; ) {
				var token = stream.getToken(next);
				// try to parse item
				var endIndex = item.parse(localParseTree, stream, next);
				
				// if endIndex is non-null, we got a match -- update the next counter
				// if endIndex is null, the item was optional, so don't worry about it
				if (endIndex != null) {
					next = endIndex;
				}
			}
		} catch (e) {
			if (this._debugging) console.debug(e);
			errored = true;
		}
		this.endDebugGroup()
	
		// if we got here by matching everything, the whole sequence matched -- return the new index
		if (i >= this.list.length && !errored) {
			if (localParseTree.length > 0) {
				this.addListToParseTree(parseTree, localParseTree);
			}
			return next;
		}
		if (this._optional) return null;
		throw this.parseError(stream, index, "Couldn't match sequence '", this.toString(), "'");
	},
	
	toString : function() 	{ 	return "-"+(this._optional ? "?" : "") + this.list.join(" ")+"-"	}
});




// Choice: one of a set of things that must be matched
function Choice(rules, optional) {
	this.rules = rules;
	if (optional == OPTIONAL) this._optional = true;
}
Choice.prototype = new Parseable({
	type : "choice",
	parse : function(parseTree, stream, index) {
		// iterate for each item in our rules list
		this.debugGroup("parsing: ", this.toString());
		for (var i = 0, rule; rule = this.rules[i++]; ) {
			// try to parse each rule
			try {
				var localParseTree = [];
				var endIndex = rule.parse(localParseTree, stream, index);
				// if we got a non-null endIndex, we had a match, so return
				// (if the endIndex was null, rule was optional, so don't worry about it)
				if (endIndex != null) {
					this.endDebugGroup()
					// just add the results of the choice to the parse tree
					this.addListToParseTree(parseTree, localParseTree);
					if (this._debugging) console.warn("matched choice "+rule);
					return endIndex;
				}
			} catch (e) {
				// if it didn't fail, swallow the error ('cause it might match the next one)
			}
		}
		this.endDebugGroup()
		if (this._optional) return null;
		throw this.parseError(stream, index, "Couldn't match choice '", this.toString(), "'");
	},
	toString : function() 	{ 	return (this._optional ? "?" : "") + "(" + this.rules.join("|") + ")"	}
});







var english = {
	parseFile : function(text) {
		var parseTree = this.parseTree = [],
			stream = new hope.TokenStream(text)
		;
		if (this._debugging) console.warn("parsing: " +stream.getAllTokens());

		this._parseTree = this.getRule("file").parse(parseTree, stream, 0);
	},
	
	translateParseTree : function (parseTree) {
		var output = [];
		for (var i = 0; i < parseTree.length; i++) {
			var item = parseTree[i];
			if (item._rule && item._rule.translate) {
				output.push(item._rule.translate(parseTree, item.stream, item._index, item.value, item.children));
			}
		}
		return output.join("");
	},
	
	
	getRule : function(name) {
		return this.rules[name];
	}
}

