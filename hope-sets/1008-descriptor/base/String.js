//! String extensions.
//
(function(global) {// begin hidden from global scope


//!
//!	Globals
//!



//!
//!	Static extensions
//!


//!	Walk down a 'path' of dotted.properties from a scope object
//	and return what you find.  Handles function calls as well (in an eval).
//TODO: smarter splitter which handles "." in function expressions
String.get = function(path, scope, stopAtParent) {
	if (scope == null) scope = global;
	path = path.split(".");
	var step, i = 0, last = (stopAtParent ? path.length - 1 : path.length), index;
	while (i < last) {
		step = path[i++];

		// if there are parenthesis, try an eval
		if (step.indexOf("(") > -1) {
			try {
				scope = eval("scope."+step);
			} catch (e) {
				console.error("Error evaluating ",path.join("."),e);
				return;
			}
		}
		// try to find as a string
		else if (scope[step] != null) {
			scope = scope[step];
		} 
		// try to find as a number
		else {
			index = parseInt(step);
			if (""+index === step && scope[index] != null) {
				scope = scope[step];		
			} else {
				return;
			}
		}
	}
	return scope;
};


//!	Walk down a 'path' of dotted.properties from a scope object
//	and set the last thing in the path to the value passed in.
//	The last thing cannot be a function, but intermediate things can.
//	If can't find thing at path, simply returns.
//TODO: smarter splitter which handles "." in function expressions
String.set = function(path, scope) {
	var it = String.get(path, scope, true);
	if (!it) return;
	var key = path.substr(path.lastIndexOf(".")+1);
	it[key] = value;
};



//! Given a string and a scope, expand any 'mustaches' in the string, eg: '{{a.b.c}}'
var expandPattern = /\{\{([^}]*)\}\}/;
String.expand = function(string, scope) {
	var match, pattern = expandPattern, replacement;
	while (match = string.match(pattern)) {
		replacement = String.get(match[1], scope);
		if (replacement == null) replacement = "";
		string = string.replace(match[0], ""+replacement);
	}
	return string;
};


//! Do an eval, trapping any errors.  
//	If there is a JS error in the code, you will see a console error.
String.execute = function(javascript, scope, fromUrl) {
	if (!javascript) return;
	try {
		return eval(javascript);
	} catch (error) {
		console.error(error, scope);
	}
};





//!
//! Instance methods
//!

Object.defineProperties(String.prototype, {
	expand : {
		enumerable : false,
		value : function(scope, fromUrl){String.expand(this, scope) }
	},

	execute : {
		enumerable : false,
		value : function(scope, fromUrl){String.execute(this, scope, fromUrl) }
	},
	
	contains : {
		enumerable : false,
		value : function(it, startAt) {
			return this.indexOf(it, startAt) == -1;
		}
	},
	
	//! Pad the left side of a string (eg: number formatting)
	pad : {
		enumerable : false,
		value : function(count, char) {
			if (!char) char = " ";
			count = count - this.length;
			var str = this;
			while (count-- > 0) {
				str = char + str;
			}
			return str;
		}
	}

});



})(window);// end hidden from global scope
