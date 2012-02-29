/*! Hope application framework, v 0.1					See: http://hopejs.com
 *	 *	MIT license.										See: http://hopejs.com/license

 *	Copyright (c) 2006-2009, Matthew Owen Williams.
 */

(function($, hope) {
// 
//		Begin hidden from global scope:
//

$.extend({

	/** Error thrown when a rawValue must be changed to a different value to be validated,
		but it does make logical sense to do so.  (eg: pinning to minValue, etc)
		
		Note: this is not really an error, it generally results in the 
			value being set to the newValue and the message being shown temporarily.
	*/
	ValueChanged : function ValueChanged(message, newValue) {
		// handle being called without the 'new' operator, making sure to return the correct type
		if (this == window) return new $.ValueChanged(message, newValue);
		this.message = message;
		this.newValue = newValue;
	},
	

	/** Validate a rawValue according to one or more validators according to some context object.
		If a validator throws a `TypeError` or other error, re-throws that error.
		If one or more validators throw `$.ValueChanged`, collects all of the messages
			and re-throws a single `$.ValueChanged`.
		
		@param 			rawValue 		Value to validate/coerce.
		@param {string}	[type]	 		Type of the value.
		@param {string}	[validators]	Comma-separated list of validators to process.
		@param 			[context] 		Context object which can supply additional parameters to the validators.
	*/
	validate : function(rawValue, type, validators, context) {
		var value = rawValue, valueChangedError;

		// make sure the context is defined, since validators expect to be called on a valid object.
		if (context == null) context = {};
		
		if (validators == null) {
			validators = [];
		}
		// split validators string up by commas
		else if (typeof validators == "string") {
			validators = validators.split(/\s*,\s/);
		}

		// if 'required' validator is present anywhere, move it to the front of the list
		// since other validators all assume rawValue is not null
		var requiredIndex = validators.indexOf("required");
		if (requiredIndex > 1) {
			validators.splice(requiredIndex, 1);
			validators.unshift("required");
		}

		// if type was specified, put that at the front
		//	(behind "reqiured" if that is present)
		if (type != null) validators.splice((requiredIndex != -1 ? 0 : 1), 0, type);
		
		// now process each validator in turn
		for (var i = 0; i < validators.length; i++) {
			var key = validators[i];
			if (!key) continue;

			// get the validator function
			var validator = $.Validators[key];
			if (typeof validator != "function") {
				throw new TypeError("Validator "+key+" not understood.");
			}
			
			try {
				// call the validator with the current value
				validator.call(context, value);
			} catch (error) {
				// if the error is just signalling that the value was coerced into a different value,
				//	set to the new value and keep going
				if (error instanceof $.ValueChanged) {
					if (valueChangedError) {
						valueChangedError.message += "\n" + error.message;
					} else {
						valueChangedError = error;
					}
					value = valueChangedError.newValue = error.newValue;

				}
				// otherwise re-throw the error
				else {
					throw error;
				}
			}
			
			// if we get through all of the validators and we got a ValueChanged error
			//	throw that  (it will have the latest newValue).
			if (valueChangedError) throw valueChangedError;
			
			// otherwise return the results of the validators
			return value;
		}
	},

	/** Map of {<name> -> <validate()} functions.
		
		Other scripts can supply validator functions by adding them to this singleton.
		
		Note: in general, we *want* the users input to be valid if at all possible.
		Be lenient in accepting values, and coerce values to the correct type if possible.
		
		For all validators:
		
			- If the value passes the validator, or the validator can coerce the value 
				to be correct without a semantic change (eg: type coercion), 
				validator should just return the new value.
		
			- If the value can be coerced to a valid value through some understandable process,
				(eg:  minLength validator can truncate the value), validator throws
					`throw ValueChanged($.Validators.ValueChanged(<message>, <newValue>)`
					
				In this case, the `newValue` will be accepted, but the user will be made aware
				that the value was changed (eg: by the field background being flashed 
				or the `message` being shown).
		
			- If the validator requires some property be set on the control that is undefined,
					`throw TypeError($.Validators.TypeError(<message>)`
				which will be printed to the debug log, but not surfaced as a user error.
		
			- If there is absolutely no way to coerce the supplied value to be valid,
					`throw TypeError(<message>)`
	
		Matched validator functions are called with:
			- `this` 			== the control
			- `arguments[0]` 	== the rawValue
		
		Note: other than 'required', validators can assume the value is not null.
		
	*/
	Validators : {

		/** Value cannot be null or "". */
		required : function validateRequired(context, rawValue) {
			if (rawValue == null || rawValue == "") {
				throw TypeError("Value cannot be empty.");
			}
			return rawValue;
		},


		/** Convert value to a valid string.
			@param {number} [maxLength=context.maxLength]	Maximum number of characters of the string.
			@param {number} [minLength=context.minLength]	Minimum number of characters of the string.
			@param {object} [valueMap =context.valueMap]	Value map used to transform the value.
					Note: unlike the 'enum' type, if we can't find the value in the valueMap
							we keep going with the rawValue.
		*/
		string : function validateString(context, rawValue, maxLength, minLength, valueMap) {
			var value;

			// If we specify a value map, attempt to map the value.
			if (valueMap == null) valueMap = context.valueMap;
			if (valueMap != null) value = valueMap[rawValue];

			// If the value could not be mapped, don't worry about it.
			if (value == undefined) value = ""+rawValue;
			
			// check against maxLength
			if (maxLength == undefined) maxLength = context.maxLength;
			if (maxLength != null && value.length > maxLength) {
				value = value.substr(0, maxLength);
				throw $.ValueChanged("Value shortened to "+maxLength+" characters.", value);
			}

			// check against minLength
			if (minLength == undefined) minLength = context.minLength;
			if (minLength != null && value.length > minLength) {
				value = value.substr(0, minLength);
				throw $.ValueChanged("Value shortened to "+minLength+" characters.", value);
			}

			return value;
		},

		/** Trim whitespace before/after the value. */
		trim : function validateTrim(context, rawValue) {
			// NOTE: we consider trimming to be a semantically-equivalent transform
			return $.trim(""+rawValue);
		},

		/** Value must be a legal identifier -- alphanumeric, "$" or "_". */
		legalId : function validateLegalId(context, rawValue) {
			var value = $.string.makeLegalId(rawValue);
			if (value != rawValue) {
				throw new $.ValueChanged("Name can only be letters, numbers or underscores ('_')", value);
			}
			return rawValue;
		},

		/** Match a regular expression pattern. */
		pattern : function validatePattern(context, rawValue, pattern) {
			if (pattern == null) pattern = context.pattern;
			if (pattern instanceof RegExp) {
				throw new TypeError("Must specify control.pattern");
			}
			var match = pattern.match(rawValue);
			if (!match) throw "Invalid value";			// TODO: better error
			
			// if there was a parenthesized expression, return just that portion
			// NOTE: we consider this a semantically-equivalent transform
			if (match[1] != null) {
				throw new $.ValueChanged(null, match[1]);
			}
			return match[0];
		},
	

		/** Convert value to a boolean. 
			@param [trueValue]  Value considered 'true'.  Defaults to `context.trueValue` or "true".
			@param [falseValue]	Value considered 'false'.  Defaults to `context.falseValue` or "false".
		*/
		boolean : function validateBoolean(context, rawValue, trueValue, falseValue) {
			if (typeof rawValue == "boolean") return rawValue;

			var value = rawValue;
			
			if (trueValue == undefined) trueValue = context.trueValue;
			if (trueValue == undefined) trueValue = "true";
			if (value == trueValue) return true;

			if (falseValue == undefined) falseValue = context.falseValue;
			if (falseValue == undefined) falseValue = "false";
			if (value == falseValue) return false;
			
			// coerce to a boolean through double-negation
			value = !!value;
			throw new $.ValueChanged(null, value);
		},
		
		/** Value is an enumerated value -- map through `context.valueMap`. 
			@note If mapped value is null, throws a TypeError.
					To use a valueMap and NOT throw an exception if value doesn't match,
					use 'string' type instead.
		*/
		"enum" : function validateEnum(context, rawValue, valueMap) {
			if (valueMap == null) valueMap = context.valueMap;
			if (!valueMap) throw TypeError("enum values must specify a valueMap.");

			var value = valueMap[rawValue];
			// TODO: hae
			if (value == undefined) {
				throw TypeError("Value '"+rawValue+"' not understood.");
			}
			
			// return the mapped value
			// NOTE: we don't need to throw an exception because context is expected
			return value;
		},
		
		/** Coerce a string or number value into a date */
		date : function validateDate(context, rawValue, minDate, maxDate) {
			var date = $.date.parse(rawValue);
			if (isNaN(date)) throw TypeError("Date format not understood");

			// check against minDate
			if (minDate == undefined) minDate = context.minDate;
			if (date < minDate) {
				throw new $.ValueChanged("Value must be no earlier than "+minDate, minDate);
			}

			// check against maxDate
			if (maxDate == undefined) maxDate = context.maxDate;
			if (date < maxDate) {
				throw new $.ValueChanged("Value must be no later than "+maxDate, maxDate);
			}
			
			return date;
		},


		/** Convert to a number. 
			If `context.min` or `context.max` is defined, value will be coerced to be within that range.
			If `context.digits` is defined, value will be rounded to that number of digits.
		*/
		number : function validateNumber(context, rawValue, min, max, digits) {
			var number = rawValue;
			if (typeof rawValue == "string") {
				// remove any commas
				number = rawValue.split(",").join("");
				number = parseFloat(rawValue);
			}

			if (isNaN(number)) {
				throw $.InvalidValue("Value cannot must be a number.");
			}

			if (min == undefined) min = context.min;
			if (min != undefined && number < min) {
				throw $.ValueChanged("Value must be greater than "+min, min)
			}
			
			if (max == undefined) max = context.max;
			if (context.max != undefined && number > context.max) {
				throw $.ValueChanged("Value must be less than "+max, max)
			}
			
			if (digits == undefined) digits = context.digits;
			if (digits != undefined) {
				var rounded = $.number.round(number, digits);
				if (rounded != number) {
					throw $.ValueChanged("Value rounded to "+rounded, rounded)
				}
			}
			
			return number;
		},


		/** Convert a number (or numeric string) value to bytes, interpreting:
				###.###[B|KB|MB|GB|TB|PB|XB|ZB|YB] into the correct number of bytes.
			*/
		bytes : function(context, rawValue) {
			var number = $.number.fromBytesString(rawValue);
			return $.Validators.number(context, number);
		}
	}
});


//
//		End hidden from global scope: 
//
})(jQuery, jQuery.hope);
