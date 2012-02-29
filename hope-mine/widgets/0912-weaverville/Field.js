/*! Hope application framework, v 0.1					See: http://hopejs.com
 *	Dual licensed under the MIT and GPL licenses:		See: http://hopejs.com/license
 *	Copyright (c) 2006-2009, Matthew Owen Williams.
 */

(function($, hope) {
// 
//		Begin hidden from global scope:
//


/** 	Form controls and such. */

//	TODO:		- do select as a ListViewer?


new $.Thing({
	name : "Field",
	Super : "Control",
	prototype : {
		template : "Field",
		attributes : "type,maxLength,readonly",
		events:"onFocus,onBlur,onChange,onSelect",
		
		/** Type attribute. */
		type : "text",

		/** max length for the field */
		maxLength : undefined,

		/** read-only designator. */
		readOnly : undefined,
		
		onChange : function(event, element) {
// TODO: update our value?		
			this.notify("onChange", event, element);
		},
		
		/** Event handlers, automatically hooked up by our template. */
		onFocus : function(event, element) {
			this.notify("onFocus", event, element);
		},
		
		onBlur : function(event, element) {
			this.notify("onBlur", event, element);
		},
		
		onSelect : function(event, element) {
			this.notify("onSelect", event, element);
		}
	}
});

new $.Thing({
	name : "TextArea",
	Super : "Field",
	prototype : {
		template : "TextArea",
		attributes : "rows,cols",

		/** TextArea's don't support type. */
		type : "",
		
		/** Number of rows. */
		rows : undefined,
		
		/** Number of columns. */
		cols : undefined
	}
});


new $.Thing({
	name : "Password",
	Super : "Field",
	prototype : {
		type : "password"
	}
});

new $.Thing({
	name : "File",
	Super : "Field",
	prototype : {
		type : "file"
	}
});

new $.Thing({
	name : "Submit",
	Super : "Field",
	prototype : {
		type : "submit"
	}
});

new $.Thing({
	name : "Reset",
	Super : "Field",
	prototype : {
		type : "resets"
	}
});

new $.Thing({
	name : "Hidden",
	Super : "Field",
	prototype : {
		type : "hidden"
	}
});


new $.Thing({
	name : "Checkbox",
	Super : "Field",
	prototype : {
		template : "Checkbox",
		type : "checkbox",
		attributes : "checked",
		
		/** Are we currently checked. */
		checked : false
	}
});


new $.Thing({
	name : "RadioButton",
	Super : "Checkbox",
	prototype : {
		template : "RadioButton",
		type : "radio",
		attributes : "family",
		
		/** What family do we belong to? */
		family : undefined
	}
});
	

new $.Thing({
	name : "Label",
	Super : "Drawable",
	prototype : {
		template : "Label",
		attributes : "for",
		
		/** For what control? */
		"for" : undefined,
	}
});

	
//
//		End hidden from global scope: 
//
})(jQuery, jQuery.hope);
