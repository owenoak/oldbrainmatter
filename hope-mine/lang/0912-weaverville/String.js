/*! Hope application framework, v 0.1					See: http://hopejs.com
 *	Dual licensed under the MIT and GPL licenses:		See: http://hopejs.com/license
 *	Copyright (c) 2006-2009, Matthew Owen Williams.
 */

(function($, hope) {
// 
//		Begin hidden from global scope:
//


/** String utilities. */


//
//	Common regular expressions we use to manipulate strings.
//	Add expressions to $.patterns once rather than creating them over and over.
//
$.extend({
	patterns: {
		splitOnCommas : /\s*,\s*/,
		splitOnLines : /[\n\r]/,

		// for $.string.legalizeId
		illegalIdentifierCharacters : /[^\w$_]/g,
		startsWithDigit : /^\d/,
	
		// for $.string.getAttributes()
		attributeTokenizer :  /([\w-]+)\s*=\s*((['"])([^'"]+)\3|([\w_]+))/g,
	
		// for $.string.interpolate
		interpolateTokenizer : {
			matchAll 	: /{{(.*?)}}/g, 
			matchOne	: /{{(.*?)}}/
		}
	}
});



$.extend({

	string : {

		/** Given a string, morph it into a legal identifier. */
		legalizeId : function(string) {
			var id = (""+string).replace($.patterns.illegalIdentifierCharacters, "_");
			// make sure the id does not start with a number
			if (id.match($.patterns.startsWithDigit)) id = "_"+id;
			return id;
		},

		/** Make a string safe to include inside double quotes
			by escaping double quotes in the string. 
		*/
		makeDoubleQuoteSafe : function(string) {
			return string.split('"').join('\\"').split("\n").join("\\n");
		},


		/** Interpolate a string according to some a context object.
			TODO: This is kind of a simplified Template, maybe we should just use that?
		
			@example	"some {{adjective} sting".interpolate({adjective:"funky"})
							 == "some funky string"
		 */
		interpolate : function(string, context) {
			var matches = string.match($.patterns.interpolateTokenizer.matchAll), str = string;
			if (!matches) return string;

			for (var i = 0, match; match = matches[i++];) {
				// get the match expression
				var expression = match.match($.patterns.interpolateTokenizer.matchOne)[1];
				
				// If expression starts with "message:", it is a message expansion.  
				//	Return the message dictionary entry interpolated with context.
				if (expression.indexOf("message:") == 0) {
					var msgName = expression.substr(7);
					value = $.string.interpolate(SP.messages[msgName] || "", context);
					
				} 
				// otherwise it is a dotted.path to some sub-value of the context object
				else {
					// we will walk down the context object to find the value
					//	at the end, 'value' will be the replacement text
					value = context;
	
					// for each sub-key:
					var keys = expression.split("."), key
					while (keys.length) {
						key = keys.shift();
						
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
				}
				if (value == null) value = "";
				str = str.split("{{"+expression+"}}").join(value);
			}
			return str;
		},
		
		
		/** Chop an attribute string into an object of {key:value} pairs.
			Returns null if attribute string is empty.
		
			@example:  "a='1' b=2".getAttributes() = {a:'1', b:'2'}
		*/
		getAttributes : function(string, object) {
			if (!object) object = {};
			var anyFound = false;
			string.replace($.patterns.attributeTokenizer,
						function(match, key, skip1, skip2, quotedValue, value) {
							anyFound = true;
							object[key] = quotedValue || value
						});
			return (anyFound ? object : null);
		},

	
		// Chop a string into pieces according to a pair of start and end regular expressions.
		// 	<start> and <end> are RegExps with the "g" flag set.
		//
		//	Returns an array of:
		//		- simple strings that are not between start/end token
		//		- for each start...end match, an object:
		//				{	middle : "...",
		//					start  : <result of start match>,
		//					end    : <result of end match>,
		//					nested : <boolean, true == there is a nested match inside middle>
		//				}
		//	If it can't match a start/end pair, logs error to console and returns undefined
		//
		chop : function(string, start, end) {
			var results = [], lastEnd = 0, match, endMatch, middle;
	
			start.lastIndex = end.lastIndex = 0;
			while (match = start.exec(string)) {
				if (lastEnd != match.index) results.push(string.substring(lastEnd, match.index));
	
				// advance the end past the start
				end.lastIndex = start.lastIndex;
				var nested = false,
					endOfFirstStart = start.lastIndex,
					endOfNestedStart = endOfFirstStart
				;
				while (endMatch = end.exec(string)) {
					middle = string.substring(endOfNestedStart, endMatch.index);
					// if we can't find another instance of start, stop here
					start.lastIndex = 0;
					if (!start.test(middle)) break;
					// otherwise notice that we're dealing with a nested tag and keep going
					nested = true;
					endOfNestedStart = endMatch.index
				}
				if (!endMatch) return console.error("chopOnExpressions(): can't match ",start," in string '",string,"'");
				// TODO: we don't really need all of these things, do we?
				results.push( {
								start  		: match,
								middle 		: string.substring(endOfFirstStart, endMatch.index),
								end    		: endMatch,
								nested 		: nested,
								startIndex	: match.index,
								endIndex	: endMatch.index + endMatch[0].length,
								source		: string
							 });
				lastEnd = start.lastIndex = end.lastIndex;
			}
			if (lastEnd != string.length) results.push(string.substr(lastEnd));
	
			// note the entire string the chop came from
			results.source = string;
	
			return results;
		},
	
	
		//
		//	Parse tags from HTML.  Handles nested tags properly.
		//
		chopOnTag : function(string, tagName) {
			// only build the parsers once for each tag
			var parsers = $.patterns["chopOnTag"+tagName];
			if (!parsers) {
				parsers = $.patterns["chopOnTag"+tagName] = {
					start : new RegExp("\\s*<\\s*("+tagName+")\\s*([^>]*?)\\s*>\\s*","ig"),
					end   : new RegExp("\\s*<\\s*\\/\\s*("+tagName+")\\s*>\\s*","ig")
				}
			}
			return $.string.chop(string, parsers.start, parsers.end);
		},
	
		// Execute a callback for each <tagName> tag in the string
		//	Callback arguments for each tag are:
		//		callback(<tagName>, <attributesString>, <tagContents>)
		//
		//	e.g. to find all <h1>-<h6> tags in document order, do this:
		//		document.body.innerHTML.forEachTag("h\\d",
		//			function(tagName, attrs, contents) { console.warn(tagName+":"+contents)}
		//		);
		//
		forEachTag : function(string, tagName, callback, context) {
			var chopped = $.string.chopOnTag(string, tagName), results = [];
			chopped.forEach(function(chop) {
				// skip everything that is not the tag in question
				if (typeof chop == "string") return;
				results.push(callback.call(context, chop.start[1], chop.start[2], chop.middle));
			});
			return results;
		}	
	}


});	// end $.extend()
	
	
	
//
//		End hidden from global scope: 
//
})(jQuery, jQuery.hope);
