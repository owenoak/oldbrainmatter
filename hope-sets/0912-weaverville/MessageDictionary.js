/*! Hope application framework, v 0.1					See: http://hopejs.com
 *	Dual licensed under the MIT and GPL licenses:		See: http://hopejs.com/license
 *	Copyright (c) 2006-2009, Matthew Owen Williams.
 */

(function($, hope) {
// 
//		Begin hidden from global scope:
//


/** Message dictionary
	Loads and parses a bunch of entries like:
		message name = message value
	and stores those as an object in this.messages.
	
	TODO: load the correct file based on the browser's language setting.
	TODO: some easy way to interpolate messages?
 */

$.patterns.messageTokenizer = /\s*([a-zA-Z0-9_\-]*)\s*=\s*(.*)$/;

new $.Thing({
	name : "MessageDictionary",
	collection : "MessageDictionaries",
	Super : "Model",
	prototype : {
		mixins : "Loadable",

		loadOptions : {
			format : "text"
		},
		
		initialize : function() {
			this.messages = {};
		},
		
		/** Process the message lines on load. */
		onLoad : function(text) {
			var lines = text.split($.patterns.splitOnLines);
			
			lines.forEach(function(line) {
				var match = line.match($.patterns.messageTokenizer);
				if (match) this.messages[match[1]] = match[2];
			}, this);
		},
		
		/** Get the message value for a particular key.
			If `context` is passed in, interpolates the message through the context object.
		 */
		get : function(key, context) {
			var value = this.messages[key];
			if (value == null) return "";
			if (context) value = $.string.interpolate(value, context);
			return value;
		},

		/** Update all elements which have a data attribute which starts with 'message:'
			to the corresponding message in our message dictionary.
		 */
		updateMessageElements : function(root, context) {
			root = $(root || document);
			
			// find everything with a 'message' attribute in the html file
			//	(including in templates)
			// and replace its contents with the message dictionary entry
			root.find("[data^=message:]").each(function(index, element) {
				var key = element.getAttribute("data").substr(8),
					value = this.messages[key]
				;
				if (value != null) $(element).html(message);
			});			
		}
	},
	defaults : {}
});
	
	
	
//
//		End hidden from global scope: 
//
})(jQuery, jQuery.hope);
