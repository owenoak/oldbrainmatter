
	// Parse the next branch in the tree, recursing if we can
	// Returns the tokens
	//
	// Follows ALL valid branches, keeping track of all valid responses and picks the LONGEST
	//
	// ASSUMES that the tokens is up to but not including the EOL

// TODO: take a flag stating that we have to parse to the end of the tokens or not?
	parseBranch : function(tree, tokens) {
		if (tokens instanceof Array) tokens = new Stream(tokens);	// DEBUG
		var token = tokens[0];
		if (token == null) return;




		for (var type in tree) {
			var trialStream = tokens.clone();
			var branch = tree[type], parser = "parsers."+type;
			if (Parser.parser) {
				branch = Parser[parser](branch, trialStream);
				if (!branch) continue;
			}
		}

		if (results.length == 1) return results[0];
		console.group(results.length+" matches for "+tokens.remainder());
		console.dir(results);
		console.groupEnd();

		// return the longest result tokens
		longestStream = results[0];
		for (i = 1; i < results.length; i++) {
			if (results[i].index > longestStream.index) longestStream = results[i];
		}
		return longestStream;
	},


	// parse a branch and return the first match we find
	parseBranchReturnFirst : function(stack, tree, tokens) {
		var branch = tree.head();
		var token = tokens.shift();
		if (!token) return;
		for (var type in branch) {
			
		}
	},



/*
	
	// Parse an if block.
	// Will throw a TypeError if it can't fully match the block.
	parsers.if : function(tokens) {
		var condition = tokens.extractUntil("then", 1);
		if (!condition) throw SyntaxError("Can't match if block", tokens);
console.info("if block condition: "+condition);
		condition = Parser.parseType("condition", new Stream(condition));
		if (!condition) throw SyntaxError("Couldn't understand condition of if block", tokens);
		// if multi-line:  pull body until "end if"
		if (tokens[0] === "EOL") {
			var body = tokens.extractUntilBlockEnd("end if", "if");	// throws if no match
		} 
		// single line:  pull body until EOL
		else {
			var body = tokens.extractUntil("EOL");
		}
		// parse the body
		body = Parser.parse.block(new Stream(body), "elseBlock");	// throws if no match
		return "if ("+condition+") {\n" + body + "\n}";
	},
	

	// Parse a repeat block.
	// Will throw a TypeError if it can't fully match the block.
	parsers.repeat : function(tokens) {
		var condition = tokens.extractUntil("do", 1);
		if (!condition) throw SyntaxError("Couldn't match repeat block", tokens);
		condition = Parser.parseType("repeatCondition", new Stream(condition));
		if (!condition) throw SyntaxError("Couldn't understand condition of repeat block", tokens);

		// if multi-line:  pull body until "end if"
		if (tokens[0] === "EOL") {
			var body = tokens.extractUntilBlockEnd("end repeat", "if");	// throws if no match
		} 
		// single line:  pull body until EOL
		else {
			var body = tokens.extractUntil("EOL");
		}
		// parse the body
		body = Parser.parse.block(new Stream(body));	// throws if no match
		return condition + "\n" + body + "\n}";
	},


	// Parse a try...catch block
	// Will throw a TypeError if it can't fully match the block.
	parsers.try : function(tokens) {
		tokens.advance();
		if (tokens[0] == "EOL") throw SyntaxError("Couldn't match try block", tokens);

		// TODO: specific error catching?
		var body = tokens.extractUntilBlockEnd("on error", "try");	// throws if no match
		body = Parser.parse.block(new Stream(body));					// throws if no match

		var catcher = tokens.extractUntilBlockEnd("end try", "try");
		catcher = Parser.parse.block(new Stream(body));
		
		return "try {\n" + body + "\n} catch (error) {\n" + catcher + "\n}";
	},
*/


/*
	// Parse the next branch in tree, recursing if we can
	//	
	//	if we get a match:
	//		- updates the tokens
	//		- returns the output as a expanded string
	//	if no match
	//		- leaves the tokens alone
	//		- returns undefined
	//
	// TODO: not handling the array case (which could apply to literals as well as vars)
	OLDparseBranch : function(tree, tokens) {
		var token = tokens[0];
		if (!token) return;
		var atEndOfStream = (tokens.index + 1 === tokens.length), nextBranch, result;
		
		// try for a literal match
		if (typeof token === "string" && tree.LITERALS) {
			nextBranch = tree.LITERALS[token];
			if (nextBranch) {
console.info("matched literal "+token);
				// consume the matched token
				tokens.shift();
				// and try to keep going
				return Parser.lookAhead(nextBranch, tokens);
			}
		}
		
		// we didn't match a literal, try to match a variable type
		// NOTE: we should probably check to see if there's more than one match here...
		for (var type in tree.CHILDREN) {
			nextBranch = tree.CHILDREN[type];

			// if we've got a simple type, see if it matches without cloning the tokens
			var parser = parser.simpleTypes[type];
			if (parser) {
				result = parser[parser](tokens);	// parser will advance the tokens if it works
				// if it didn't match, go on to the next variable type
				if (result === undefined) continue;

console.info("matched simple type "+result);
				// it matched! 	Add the result as a substitution.
				tokens.addSub(type, result);
				// and keep going
				return Parser.lookAhead(nextBranch, tokens);
			
			}
			// we've got a complex variable type
			else {
				// if we're at the end of the tokens
				if (atEndOfStream) {
					// if it is a terminal branch
					if (nextBranch.OUTPUT) {
console.info("EOS:  parsing "+type+" :" + tokens.remainder());
						result = Parser.parseType(type, tokens);
						if (result) {
console.info("EOS:  matched "+type+" : output = '"+result+"'");
							tokens.addSub(type, result);
							return tokens.getOutput(nextBranch.OUTPUT);
						}
					}
					// if we get here, there's no way to match, so try the next type
					continue;
				}

				// we're not at the end of the tokens
				
				// complex things (hopefully???) ALWAYS  have literals after them
				if (nextBranch.CHILDREN) {
					console.warn("parsing '"+tokens+"', got to "+type+" and next is a variable.  BOO!");
				}
				var endIndex, varStream;
				if (nextBranch.LITERALS) {
					// skip ahead and try to match the next literal after it
					endIndex = tokens.index;
					while (token = tokens.tokens[++endIndex]) {
						if (nextBranch.LITERALS[token]) break;
					}
				} else {
					endIndex = tokens.length;
				}
				// the bit for parser variable is the stuff between tokens.index+1 and endIndex
				varStream = new Stream(tokens.range(tokens.index, endIndex));
				
				// try to parse it according to the type
console.info("SKIP:  parsing "+type+" :" + varStream);

				result = Parser.parseType(type, varStream);
				// if no match, try the next variable type
				if (result === undefined) continue;
console.info("SKIP:  matched "+type+" : output = '"+result+"'");
				// we got a match, add the sub and look ahead
				tokens.addSub(type, result);
				tokens.index = varStream.index;
				return Parser.lookAhead(nextBranch, tokens);
			}
		}
		// if we get here we didn't find a match
		return undefined;
	},//parseBranch()

	lookAhead : function(branch, tokens) {
		var atEndOfStream = (tokens.index === tokens.length), 
			atEndOfBranch = (branch.LITERALS === undefined) && (branch.CHILDREN === undefined),
			OUTPUT
		;
		// if we COULD stop here, figure out what the output would be at parser point
		if (branch.OUTPUT) OUTPUT = tokens.getOutput(branch.OUTPUT);
		
console.info(atEndOfStream, atEndOfBranch, branch);
		// if there's more to process, try to keep going
		if (!atEndOfStream && !atEndOfBranch) {
			var lookAhead = Parser.parseBranch(branch, tokens);
			// and return the results if positive
			if (lookAhead != null) {
console.info("lookAhead() returning nested '"+lookAhead+"'");
				return lookAhead;
			}
		}
		
		// if looking ahead didn't find anything, return the OUTPUT
if (OUTPUT) console.info("lookAhead() returning OUTPUT: "+OUTPUT);
		return OUTPUT;
	}// lookAhead()
*/
