//
// Message dictionary
//

(function($) {	// begin hidden from global scope


$.message = function expandMessage(key, subs) {
	if (typeof key != "string") key = key.join(".");
	var msg = $.message.dictionary[key];
	if (!subs || !msg) return msg;
	return $.string.interpolate(msg, subs);
}


$.extend($.message, {
	//! Dictionary of messages.
	dictionary : {},
	
	/** Process a message file loaded by someone else. */
	processMessageFile : function(fileContents) {
		var list = fileContents.split(/[\n\r]/);
		$.map(list, function(str, index) {
			var match = str.match(/\s*([^=\s]*)\s*=\s*(.*)$/);
			if (!match) return;
			var key = match[1], value = match[2];
			$.message.dictionary[key] = value;
		});
		
		this.updateMessageElements();
	},
	
	/** Find everything with a 'message' attribute under the rootElement (default is body)
		(including in page templates)
		and replace its contents with the message dictionary entry.
	*/
	updateMessageElements : function(rootElement) {
		var elements = (rootElement ? rootElement.find("[message]") : $("[message]"));
		elements.each(function(index, element) {
			var messageName = element.getAttribute("message"),
				message = $.message.dictionary[messageName]
			;
			if (message !== undefined) {
				element.innerHTML = message;
			}
		});
	}
});


// Loader for message files, adds messages found to dictionary on load.
new $.Request.subclass({
	reference : "$.message.Loader",
	prototype : {
		url			: "#{SP:filePrefix}lang/messages2.en.txt",	//REFACTOR
		dataType 	: "text",
		cache		: true,
		onSuccess : function(data) {
			$.message.processMessageFile(data);
			$.message.Loader.notify("loaded");
		}
	}
});


})(jQuery);	// end hidden from global scope
