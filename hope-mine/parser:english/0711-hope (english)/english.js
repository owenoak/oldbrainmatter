

// different types of tokens we can understand

function Comment(text) {
	this.value = text;
}
Comment.prototype.toString = function(){ return "[Comment "+this.value+"]"	}



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
function Optional(){}





//
// Expression: pointer to a rule (???)
//
function Expression(name, optional) {
	this.name = name;
}
Expression.prototype.toString = function(){ return "[Expression "+this.name+"]"	}
Expression.prototype.parse = function(parseTree, tokens, index) {
	var	ruleParseTree = [],
		rule = english.rules[this.name];
	;
	if (!rule) throw new Error("Expression: couldn't find rule '"+this.name+"'");
	try {
		// attempt to parse the rule until we cain't parse it no mo'
		var endIndex = rule.parse(ruleParseTree, tokens, index);
	} catch (e) {
		if (!this.optional) throw e;
		return null;
	}
	
	if (endIndex == null && !this.optional) throw new Error("Couldn't match expression '"+this.name+"'\n"+rule+"\n"+tokens[index]);
console.info("expression "+this.name+" matched!" + "  :" + index + "\n" + ruleParseTree);
	parseTree.push(ruleParseTree);
	return endIndex;
}


function OptionalExpression() {
	Expression.apply(this, arguments);
	this.optional = true;
}
OptionalExpression.prototype = new Expression();
OptionalExpression.prototype.toString = function(){ return "[Optional Expression "+this.name+"]"	}



//
// RepeatingExpression: pointer to a rule that can occur 1 or more times (0 or more if optional == true)
//	TODO: have a min and max number...
//
function RepeatingExpression(name) {
	this.name = name;
}
RepeatingExpression.prototype.toString = function(){ return "[RepeatingExpression "+this.name+"]"	}
RepeatingExpression.prototype.parse = function(parseTree, tokens, index) {
	var next = index,
		count = 0, 
		ruleParseTree = [],
		endIndex,
		rule = english.rules[this.name];
	;
	if (!rule) throw new Error("RepeatingExpression: couldn't find rule '"+this.name+"'");
//console.warn(rule);
	try {
		// attempt to parse the rule until we cain't parse it no mo'
		while (endIndex = rule.parse(ruleParseTree, tokens, next)) {
			next = endIndex;
console.warn("repeating rule "+this.name+" matched!" + "  :" + next);
			count++;
			parseTree.push(ruleParseTree);
			ruleParseTree = [];
if (count > 5) break;
		}
	} catch (e) {
		// if we got an error on the first repeat, just pass the error up
		if (!this.optional && count == 0) throw e;
	}

	// if we get here, we ran out of matches
	if (!this.optional && count == 0) throw new Error("Couldn't match repeating expression '"+this.name+"'");
	return next;
}


function OptionalRepeatingExpression() {
	RepeatingExpression.apply(this, arguments);
	this.optional = true;
}
OptionalRepeatingExpression.prototype = new RepeatingExpression();
OptionalRepeatingExpression.prototype.toString = function(){ return "[Optional RepeatingExpression "+this.name+"]"	}







function Sequence(item1, item2, etc) {
	this.list = Array.prototype.slice.call(arguments, 0);
}
Sequence.prototype.toString = function(){ return "[Sequence "+this.list+"]"	}
Sequence.prototype.parse = function(parseTree, tokens, index) {
	var next = index, errored = false;
	try {
		// iterate for each item in our list
		for (var i = 0, item; item = this.list[i++]; ) {
var nextToken = tokens[next];
			// try to parse item
			var endIndex = item.parse(parseTree, tokens, next);
			
			// if endIndex is non-null, we got a match -- update the next counter
			// if endIndex is null, the item was optional, so don't worry about it
			if (endIndex != null) {
//console.debug("sequence matched "+nextToken);
				next = endIndex;
			}
		}
	} catch (e) {
console.warn(e);
		errored = true;
	}

//console.warn("end of sequence ",i,this.list.length, errored);
	// if we got here by matching everything, the whole sequence matched -- return the new index
	if (i >= this.list.length && !errored) {
		return next;
	}
	if (this.optional) return null;
	throw Error("Couldn't match sequence '" + this.list + "' -- found '" + nextToken + "' instead.");
}

function OptionalSequence() {
	Sequence.apply(this, arguments);
	this.optional = true;
}
OptionalSequence.prototype = new Sequence();
OptionalSequence.prototype.toString = function(){ return "[Optional Sequence "+this.list+"]"	}



// Literal -- literal string value that must be matched
function Literal(value) {
	this.value = value;
}
Literal.prototype.toString = function(){ return "[Literal "+this.value+"]"	}
Literal.prototype.parse = function(parseTree, tokens, index) {
	if (tokens[index] == this.value) {
		parseTree.push(this);
		return ++index;
	}
	if (this.optional) return null;
	throw Error("Couldn't match literal '" + this.value + "' -- found '" + tokens[index] + "' instead.");
}

function OptionalLiteral(value) {
	Literal.apply(this, arguments);
	this.optional = true;
}
OptionalLiteral.prototype = new Literal();
OptionalLiteral.prototype.toString = function(){ return "[Optional Literal "+this.value+"]"	}



// Choice: one of a set of things that must be matched
function Choice(item1, item2, etc) {
	this.list = Array.prototype.slice.call(arguments, 0);
}
Choice.prototype.toString = function(){ return "[Choice "+this.list+"]"	}
Choice.prototype.parse = function(parseTree, tokens, index) {
console.debug("attempting to match choice "+this.list + "\n" + tokens[index]);
	// iterate for each item in our list
	for (var i = 0, item; item = this.list[i++]; ) {
//console.debug("trying to match choice "+item);
		// try to parse each item
		try {
			var endIndex = item.parse(parseTree, tokens, index);
			// if we got a non-null endIndex, we had a match, so return
			// (if the endIndex was null, item was optional, so don't worry about it)
			if (endIndex != null) {
//	console.debug("matched choice "+item);
				return endIndex;
			}
		} catch (e) {
			// if it didn't fail, swallow the error ('cause it might match the next one)
		}
	}
	if (this.optional) return null;
	throw Error("Couldn't match choice '" + this.list + "' -- found '" + tokens[index] + "' instead.");
}

function OptionalChoice() {
	Choice.apply(this, arguments);
	this.optional = true;
}
OptionalChoice.prototype = new Choice();
OptionalChoice.prototype.toString = function(){ return "[Optional Choice "+this.list+"]"	}




// Identifier:  variable/method/property/etc name
function Identifier(alias) {
	this.alias = alias;
}
Identifier.prototype.toString = function(){ return "[Identifier "+this.alias+"]"	}
// TODO: identifiers starting with a number are not legal in JS, make them work in english?
Identifier.PARSE_RE = /^[A-Za-z$_][\w$]*$/;
Identifier.prototype.parse = function(parseTree, tokens, index) {
	if (tokens[index].match(Identifier.PARSE_RE)) {
		parseTree.push(new Identifier(tokens[index]));
		return ++index;
	}
	if (this.optional) return null;
	throw Error("Couldn't match identifier -- found '" + tokens[index] + "' instead.");
}

function OptionalIdentifier() {
	Identifier.apply(this, arguments);
	this.optional = true;
}
OptionalIdentifier.prototype = new Identifier();
OptionalIdentifier.prototype.toString = function(){ return "[Optional Identifier "+this.alias+"]"	}


// Num: a number (either integer or real)
function Num() {}
Num.prototype.toString = function(){ return "[Num]"	}
Num.prototype.parse = function(parseTree, tokens, index) {
	var num = Number(tokens[index]);
	if (num != "NaN") {
		parseTree.push(num);
		return ++index;
	}
	if (this.optional) return null;
	throw Error("Couldn't match integer -- found '" + tokens[index] + "' instead.");
}

function OptionalNum() {
	Num.apply(this, arguments);
	this.optional = true;
}
OptionalNum.prototype = new Num();



// Integer: a whole number
// TODO: simplify according to Num above?
function Integer() {}
Integer.prototype.toString = function(){ return "[Integer]"	}
Integer.PARSE_RE = /^-?\d+$/;
Integer.prototype.parse = function(parseTree, tokens, index) {
	if (tokens[index].match(Identifier.PARSE_RE)) {
		parseTree.push(parseInt(tokens[index]));
		return ++index;
	}
	if (this.optional) return null;
	throw Error("Couldn't match integer -- found '" + tokens[index] + "' instead.");
}

function OptionalInteger() {
	Integer.apply(this, arguments);
	this.optional = true;
}
OptionalInteger.prototype = new Integer();
OptionalInteger.prototype.toString = function(){ return "[Optional Integer]"	}


// Real: a floating point number
// TODO: simplify according to Num above?
function Real() {}
Real.prototype.toString = function(){ return "[Real]"	}
Real.PARSE_RE = /^-?(\d+|\d+\.\d*|\d*\.\d+)$/;
Real.prototype.parse = function(parseTree, tokens, index) {
	if (tokens[index].match(Identifier.PARSE_RE)) {
		parseTree.push(parseFloat(tokens[index]));
		return ++index;
	}
	if (this.optional) return null;
	throw Error("Couldn't match real -- found '" + tokens[index] + "' instead.");
}

function OptionalReal() {
	Real.apply(this, arguments);
	this.optional = true;
}
OptionalReal.prototype = new Real();
OptionalReal.prototype.toString = function(){ return "[Optional Real]"	}





//
// text stream concept
//

function Stream(text, index) {
	// make sure text ends with a newline
	this.text = text + "\n";
	// set the index to the first non-space char, including returns, after index passed in
	this.index = index || 0;
	this.skipSpaces(this.index, true);
}
Stream.EOL = new Literal("EOL");
Stream.EOF = new Literal("EOF");
Stream.SKIP_SPACE_RE = /\s+/g;
Stream.SKIP_SPACE_AND_EOL_RE = /[\s\n]+/g;
Stream.COMMENT_RE = /--(.+?)\n/;
Stream.GET_LINE_NUM_RE = /\n/g;

// NOTE: doesn't work with escaped quotes yet
//	negative numbers?
Stream.MATCH_TOKEN_RE = /([\w$]+|".*?"|'.*?'|\n|\*|\+|\/|-|>=|>|<=|<|\(|\))[ \t]*/g;

Stream.prototype = {
	// return the index of first non-space char after index
	// SIDE EFFECT: sets this.index
	skipSpaces : function(index, includeEOL) {
		index = index || this.index;
		var RE = (includeEOL ? Stream.SKIP_SPACE_AND_EOL_RE : Stream.SKIP_SPACE_RE);
		RE.lastIndex = index;
		
		var match = RE.exec(this.text);
		if (match != null && (RE.lastIndex - match[0].length) == index) {
			this.index = RE.lastIndex;	
		}
		//console.debug(this.index, this.text.substring(this.index));
		return this.index;
	},
	

	// return the next token in the stream
	//  - whitespace is collapsed
	//	- end-of-line is returned as a separate token, called Stream.EOL
	//  - end-of-input is returned as Stream.EOF
	//  - comments are skipped
	//
	// ASSUMES: index (or this.index) is next char after trailing whitespace has been skipped
	//
	// SIDE EFFECT:  index.current is set to the end of the token (after any whitespace)
	//	-- because of this, if you're doing an experimental parse,
	//		keep track of stream.index and reset it later if need be
	nextToken : function(index, updateIndex) {
		index = index || this.index;
		if (index >= this.text.length) return Stream.EOF;
		
		var RE = Stream.MATCH_TOKEN_RE;
		RE.lastIndex = index;
		var match = RE.exec(this.text);
		if (match != null && (RE.lastIndex - match[0].length == index)) {
			var token = match[1];
			if (updateIndex) this.index = RE.lastIndex;
			if (token == "\n") return Stream.EOL;
		} else {
			throw Error("Couldn't parse token at index " + index + " ('" + this.text.substring(index, 20).split("\n").join("\\n") + "...')");
		}
	},
	
	setIndex : function(index) {
		this.index = index || 0;
	},
	
	// figure out the line number of a given position
	getLineNum : function(index) {
		var RE = Stream.GET_LINE_NUM_RE;
		RE.lastIndex = 0;
		for (var lineNum = 0; match = RE.exec(this.text); lineNum++) {
			if (RE.lastIndex > index) return lineNum;
		}
		return -1;
	}
}




var english = {
	parseFile : function(text) {
		
		var parseTree = [],
			tokens = PARSER.tokenize(text)
		;

		console.warn("parsing: " +tokens);
		english.parseRule(parseTree, PARSER.tokenize(text), 0, "file");

		return parseTree[0];
	},
	
	// SIDE EFFECT:  writes matches into the parse tree
	parseRule : function(parseTree, tokens, index, ruleName) {
		var rule = this.rules[ruleName];
		if (!rule) throw new Error("couldn't find rule '"+ruleName+"'");
	
console.warn("attempting to parse rule '" + ruleName + "' \n" + rule + "\n" + tokens.slice(index,index+10));
		// create a new parse tree for this rule
		//	so we don't side effect the main one if it doesn't work
		var ruleParseTree = [];
		
		// attempt to parse the rule
		// if an error is thrown, just pass it up
		var endIndex = rule.parse(ruleParseTree, tokens, index);
		if (endIndex != null) {
			// NOTE: we may only want to push if the ruleParseTree is complicated ?
console.info("matched rule "+ruleName+": "+ruleParseTree);
			if (ruleParseTree.length == 1) ruleParseTree = ruleParseTree[0];
			parseTree.push(ruleParseTree);
			return endIndex;
		} else {
			return null;
		}
	}

}

