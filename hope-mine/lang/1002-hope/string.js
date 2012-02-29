/* String utilities, applied directly to String.prototoype. */

(function(hope) {// begin hidden from global scope

var PATTERNS = String.PATTERNS = {
	spaceSplitter : /\s+/,
	commaSplitter : /\s*,\s*/,
	lineSplitter : /[\n\r]/,

	leadingWhiteSpace : /^\s\s*/,
	isWhiteSpaceChar : /\s/,
	isNonWhiteSpaceChar : /\S/,
	isAllSpaces : /^\s*$/,

	spaceOrUnderscore : /[\s_]/,

	// match only a legal identifier
	isLegalIdentifier : /^[_$a-zA-Z][_$a-zA-Z0-9]*$/,
	
	// characters that are not legal in an identifier
	illegalIdentifierChars : /[^\w$_]/g,

	startsWithDigit : /^[0-9]/
};


hope.extend(String.prototype, {

	contains : function(substring, startIndex) {
		return this.indexOf(substring, startIndex) != -1;
	},
	
	startsWith : function(substring) {
		return this.substr(0, substring.length) === substring;
	},
	
	endsWith : function(substring) {
		return this.substr(this.length - substring.length) === substring;
	},

	// generic super quick trim
	//	based on: http://blog.stevenlevithan.com/archives/faster-trim-javascript
	trim : function() {
		var string = this.replace(PATTERNS.leadingWhiteSpace, ''),
			i = string.length - 1
		;
		if (PATTERNS.isWhiteSpaceChar.test(string.charAt(i))) {
			while (--i) {
				if (PATTERNS.isNonWhiteSpaceChar.test(string.charAt(i))) return string.substring(0, i + 1);
			}
		}
		return string;
	},

	// trim blank lines before and after this string
	trimBlankLines : function() {
		var lines = this.splitOnLines();
		while (lines[0].isAllSpaces()) lines.splice(0,1);
		while (lines[lines.length-1].isAllSpaces()) lines.splice(lines.length-1,1);
		return lines.join("\n");
	},

	// is this string all whitespace?
	isAllSpaces : function() {
		return PATTERNS.isAllSpaces.test(this);
	},
	
	// compact all whitespace out of a string
	compact : function() {
		return this.splitOnSpaces().join("");
	},
	
	// return true if this string is exactly a number
	isANumber : function() {
		return this === (""+parseInt(this));
	},
	
	
	// split a trimmed string by commas (ignoring whitespace before or after the commas)
	splitOnCommas : function() {
		return this.trim().split(PATTERNS.commaSplitter);
	},
	
	// split a trimmed string by runs of whitespace
	splitOnSpaces : function() {
		return this.trim().split(PATTERNS.spaceSplitter);
	},
	
	// split a string into lines
	splitOnLines : function() {
		return this.split(PATTERNS.lineSplitter);
	},

	// Split a string into key:value pairs by some delimiters.
	//	valueDelimiter is between key and value, default is ":"
	//	itemDelimiter is between items, default is ";"
	toObject : function(valueDelimiter, itemDelimiter) {
		valueDelimiter = valueDelimiter || ":";
		var object = {};
		this.split(itemDelimiter || ";").forEach(function(item){
			item = item.split(valueDelimiter);
			if (item.length === 2) object[item[0]] = item[1];
		});
		return object;
	},
	
	// Split a string into a truthMap -- an object with a true property for each item in the string.
	toTruthMap : function(delimiter) {
		var map = {};
		this.split(delimiter||",").forEach(function(key) {
			map[key] = true;
		});
		return map;
	},
	
	
	/** Convert "thisString" to "ThisString". */
	capitalize : function() {
		return this.charAt(0).toUpperCase() + this.substr(1);
	},
	
	/** Convert "ThisString" to "thisString". */
	lowerize : function() {
		return this.charAt(0).toLowerCase() + this.substr(1);
	},

	/** Convert "any old string" or "any_old_string" to "AnyOldString" */
	toInitialCaps : function() {
		return _processSplit(this, PATTERNS.spaceOrUnderscore, "capitalize", 0);
	},
	
	/** converts "ANY old string" or "any_old_string" to "anyOldString" */
	toCamelCase : function() {
		return _processSplit(this, PATTERNS.spaceOrUnderscore, "capitalize", 1, "lowerize ");
	},

	
	// is the string a legal identifier (alphanumeric, "_" or "$" only)
	isIdentifier : function() {
		return PATTERNS.isLegalIdentifier.test(this);
	},
	
	// convert the string to a legal identifier by converting illegal chars to "_"
	toIdentifier : function(camelCase) {
		if (this.isIdentifier()) return ""+this;
		var pattern = PATTERNS.illegalIdentifierChars,
			id = ( camelCase
					? _processSplit(this, pattern, "capitalize", 1, "toLowerCase")
					: this.replace(pattern, "_")
				 );
		if (id.match(PATTERNS.startsWithDigit)) id = "_" + id;
		return id;
	},
	
	
	/** Given a string and a context, expand any 'mustaches' in the string, eg: '{{a.b.c}}' */
	expand : function expand(context) {
		return hope.expand(this, context);
	},
	
	
	// Manipulating list-like strings.  Default delimiter is " ".
	containsItem : function(value, delimiter) {
		return this.split(delimiter||" ").indexOf(value) === -1;
	},
	
	addItem : function(value, delimiter) {
		var list = this.split(delimiter||" "), index = list.indexOf(value);
		if (index !== -1) return this;
		list.push(value);
		return list.join(delimiter||" ");
	},
	
	removeItem : function(value, delimiter) {
		var list = this.split(delimiter||" "), index = list.indexOf(value);
		if (index === -1) return this;
		list.splice(index, 1);
		return list.join(delimiter||" ");
	}	


});


function _processSplit(string, _pattern, _processor, _index, _initialProcessor) {
	var split = string.split(_pattern), 
		length = split.length
	;
	string = (_index == 1 && length > 0 ? split[0][_initialProcessor]() : "");
	while (_index < length) {
		string += split[_index++][_processor]();
	}
	return string;
}


})(hope);	// end hidden from global scope

