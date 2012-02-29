/*! Hope application framework, v 0.1					See: http://hopejs.com
 *	Dual licensed under the MIT and GPL licenses:		See: http://hopejs.com/license
 *	Copyright (c) 2006-2009, Matthew Owen Williams.
 */

(function($, hope) {
// 
//		Begin hidden from global scope:
//

/** Generic type parsing routines. */


$.extend({

	/** Given a value and a type name, attempt to convert the string to the appropriate type. 
	
		@note 	If type is null, does some ghetto default type matching
				to try to convert to a boolean or number.
		
		@param	value			Value to parse.
		@param	[type]			Type of the string, looked up in $.TypeMap to get a parser.
		@param	[trim=false]	If true, string results will be trimmed.
	*/
	parseType : function(value, type, trim) {
		// get the appropriate parser from $.TypeMap and use it to parse the value
		if (type) {
			// if the parser is a value, that is a reference to another type, so keep looking
			var parser;
			while (parser = $.TypeMap[type]) {
				if (typeof parser == "function") break;
				type = parser;
				// TODO: fix up the list to short-circuit lookup later?
			}

			// if we found a parser, run value through that.
			if (parser) value = parser(value);
		}
		// if they didn't specify a type, do some ghetto default matching
		else {
			// try for boolean
			if (value == "false") return false;
			if (value == "true") return true;
			
			// try for number
			var number = parseFloat(value);
			if (""+number == value) return number;
			
			// any other ghetto type converters? date?
		}
		if (trim && typeof value == "string") value = $.trim(value);
		return value;
	},
	
	/** Map of {type->parser}.  Add other types here as you like.
		Note that if a parser is a string, that is a reference to another type.
	 */
	TypeMap : {

		/** any:  No type conversion. */
		"any"		: function(string)	{return string},
		
		/** integer:  convert to a base-10 integer.  Returns NaN if parsing fails. */
		"integer" 	: function(string)	{return parseInt(value, 10)},

		/** float:  convert to a base-10 float.  Returns NaN if parsing fails. */
		"float"		: function(string)	{return parseFloat(value, 10)},

		/** number:  Alias for "float". */
		"number" : "float",
		
		/** boolean:  `true` if the string is exactly "true", otherwise `false`. */
		"boolean"	: function(string)	{return (string == "true")},
		
		/** percent:  Expressed as "50%", returns a fraction (.5)
					  Returns NaN if parsing fails.
		 */
		"percent"	: function(string) {
							var number = parseFloat(value); 
							return (isNaN(number) ? number : (number / 100));
					  },
		
		/** date: convert string to a date.  TODO: date formats? */
		"date" : function(string) { return new Date(string) },
		
		/** seconds:  Expressed as number of seconds, returns an integer. */
		"seconds" : "integer",

		/** milliseconds:  Expressed as number of milliseconds, returns an integer. */
		"milliseconds" : "integer",


		/** timestamp:  Expressed as number of milliseconds, returns a Date. */
		"timestamp" : "date"

	}
	
});	// end $.extend

//
//		End hidden from global scope: 
//
})(jQuery, jQuery.hope);
