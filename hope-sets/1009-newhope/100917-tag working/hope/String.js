/*** String extensions ***/

Script.require("{{hope}}Object.js", function() {

String.toRef = function(){ return "String" };

var TRIM_PATTERN	= /^\s+|\s+$/g;

hope.extendIf(String.prototype, {
	trim : function() {
		return this.replace(TRIM_PATTERN, '');
	},
	
	contains : function(string) {
		return this.indexOf(string) !== -1;
	},
	
	startsWith : function(string) {
		return (this.substr(0,string.length)) == string;
	},
	
	endsWith : function(string) {
		return (this.substr(this.length - string.length)) == string;
	},

	capitalize : function() {
		return this.charAt(0).toUpperCase() + this.substr(1);
	},

	normalizeUrl : function() {
		return Script.normalizeUrl(this);
	},
	
	makeLegalId : function() {
		return this.replace(/[^\w$_]/g, "_")
	},

	makeQuoteSafe : function() {
		return this.replace("'","\\'").replace("\n","\\n");
	},

	makeDoubleQuoteSafe : function() {
		return this.split('"').join('\\"').split("\n").join("\\n");
	},

	makeHTMLSafe : function() {
		return this.split('<').join('&lt;').split(">").join("&gt;");
	},

	isWhitespace : function() {
		return this && this.match(/^\s+$/) != null;
	},
	
	// return the number of times substring occurs in this string
	count : function(substring) {
		var index = -1, count = 0;
		while ((index = 1 + this.indexOf(substring, index)) > 0) count++;
		return count;
	},
	
	// Convert this string to a legal identifier
	//	by converting all non-legal characters to "_"
	toIdentifier : function() {
		return this.replace(/[^\w$_]/g, "_")
	}
});



//
//	template matching
//
//	template match sequence is "foo{{match_string}}bar"
//
var TEMPLATE_PATTERN = /\{\{([^}]*)\}\}/;
String.prototype.expand = function(scope) {
	if (!scope) scope = {};
	var matches = this.split(TEMPLATE_PATTERN);
	// yields:  ["string", "<match_string>", "string", "<match_string>", "string"]
	for (var i = 1, last = matches.length, match; i < last; i+=2) {
		var match = matches[i];
		match = hope.get(scope, match);
		matches[i] = (match == null ? "" : match);
	}
	return matches.join("");
}




Script.loaded("{{hope}}String.js");
});// end Script.require()

