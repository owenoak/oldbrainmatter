/*! Hope application framework, v 0.1					See: http://hopejs.com
 *	Dual licensed under the MIT and GPL licenses:		See: http://hopejs.com/license
 *	Copyright (c) 2006-2009, Matthew Owen Williams.
 */

(function($, hope) {
// 
//		Begin hidden from global scope:
//



/** Control class -- a drawable which manages a 'value'. 
	TODO:  	- check feasibility/completeness of value/displayValue/etc stuff
			- validation?
			- value mapping?
			- how to map labels to fields?
	
*/
new $.Thing({
	name : "Control", 
	Super : "Drawable", 
	prototype : {

		/** Attributes we export to the HTML. */
		attributes : "reqiured",

		/** Value represented by this widget. */
		value : undefined,
		
		/** Value to use if this.value is null.  
			Should be of the correct value type.
		*/
		defaultValue : undefined,

		/** Is this widget currently required? */
		required : undefined,

		
		/** Type of the value represented by this widget.
			Value will be coerced to this type of value automatically in setValue().
			We natively understand:  
				- undefined		(no parsing)
				- "string"		(string coercion, optionally will go through value map)
				- "number"		(parseFloat(value))
				- "boolean"		(value == "true")
				- "date"		($.date.parse(value))
				- "enum"		(specify a 'valueMap' to translate internal -> display value)
		 */
		type : undefined,
		
		
		/** Change the value of this widget. */
		setValue : function(newValue, skipUpdate, skipParse) {
			// if we're not skipping the parse step, parse the value
			//	NOTE: we might skip, eg, if we're setting the value after a validate() call,
			//			in which case we know that the value has already been parsed.
			if (skipParse != $.SKIP) {
				try {
					newValue = this.parseValue(newValue);
				} catch (e) {
					console.error(e);
					return;
				}
			}
					
			// set to defaultValue if null
			if (newValue == null && this.defaultValue !== undefined) {
				newValue = this.defaultValue;
			}
			
			if (this.value != newValue) {
				// set our internal value
				this.value = newValue;
				
				// and update the display unless we were told otherwise
				if (skipUpdate != $.SKIP) this.updateDisplay();
			}
	
			// return the type-coerced value
			return newValue;
		},
		
		
		/** Parse a 'raw' value and coerce it to match our type.
			Should throw an exception if value cannot be coerced into correct type.
	
			If `this.type` is null, return `rawValue`.
			If `rawValue` is `null`, just returns `null`.
			
			If you have any other type coercion to do, override `parseValue()`
			or add a `value->parseValue()` entry to `$.Control.prototype.parsers`.
			
			@throws		"Data type '"+this.type+"' not understood" if type not understood.
		*/
		parseValue : function(rawValue) {
			// if we did not specify a type or the value passed in is null
			//	simply return the rawValue
			if (this.type == null || rawValue == null) return rawValue;
			
			// Call the Validators validate routine to do the type coercion.
			try {
				return $.validate(rawValue, this.type, null, this);
			} catch (error) {
				// if we got a ValueChanged error, just return the newValue
				if (error instanceof $.ValueChanged) return error.newValue;
				
				// otherwise re-throw the error
				throw error;
			}
		},
		
		
		/** Update the HTML element display to reflect the current value. 
			Default implementation simply sets this.elements.value to our displayValue.
		*/
		updateDisplay : function() {
			if (!this.elements) return;
			var value = this.getDisplayValue();
			this.elements.attr("value", value);
			return this;
		},
		
		
		/** Translate "internal" `value` to value to be displayed in the HTML UI for this control.
			Default is to just return the internal `value`.
			@param [value]  Value to translate into display value.  
							If not specified, uses `this.value`.
		*/
		getDisplayValue : function(value) {
			if (value == undefined) value = this.value;
			return value;
		},
		
		
		
		//
		//	validation
		//
		validators : undefined,
		
		/** Validate some value. */
		validate : function(value) {
			if (this.type == null && this.validators == null) return;
			
			if (value === undefined) value = this.value;
			try {
				var validValue = $.validate(value, this.type, this.validators, this);
			} catch (error) {
				// if the error is just signalling that the value has changed
				//	suppress the error and just use the newValue
				if (error instanceof $.ValueChanged) {
					validValue = error.newValue;
				} else {
					// TODO: show an error somehow?
					this.notify("onValidationError", error);
					// re-throw the error
					throw error;
				}
			}
			
			if (value != validValue) {
				// TODO:  Flash the error.message as a hint?
				// TODO:  Flash the field to show them the value has changed?
				
				// set to the new value, firing update by skipping parsing
				this.setValue(validValue, null, $.SKIP);
			}
	
			// return true that we passed validation
			return true;
		},
		
		
		
		//
		//	event handling
		//
		
		/** Method called by the UI element(s) when the user manipulates the value.
			Default action is to call `setValue()` and notify `onValueChanged`.
			
			@param newValue		New value, run through this.setValue() to do type coercion, etc.
			@param [event]		Browser event that caused the change.
			@param [element]	Element that kicked off the change.
		*/
		onChange : function(newValue, event, element) {
			// set the internal value of the control,
			//	skipping update (since this came from the HTML itself anyway)
			newValue = this.setValue(newValue, $.SKIP);
			this.notify("onChange", this, newValue, event);
		}
	//
	// end control.instanceDefaults
	//
	}
});



//
//		End hidden from global scope: 
//
})(jQuery, jQuery.hope);
