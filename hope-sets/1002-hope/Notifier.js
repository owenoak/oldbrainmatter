/** TODO: recast as   hope.Notifier.show(),  hope.Notifier.flash() */

hope.extend(hope, {	
	/** 
		Modal message/error display (main UI is somehow 'disabled' while this is happening) 
	*/
	/** Show a normal (non-error) modal message. */
	modalMessageSelector : "#ModalMessage",
	modalMessageBodySelector : "#ModalMessageBody",
	showMessage : function(message, asError) {
		asError = (asError == hope.ERROR);
		var element = document.find(hope.modalMessageSelector);
		if (element) {
			element.toggleClass("Error", asError);
			var body = document.find(hope.modalMessageBodySelector, element) || element;
			body.innerHTML = message;
			element.show();
		} else {
			if (asError) {
				console.warn("hope.showErrorMessage() says: ",message);
			} else {
				console.warn("hope.showMessage() says: ",message);
			}
		}
	},
	
	/** Show a modal 'error' message.	*/
	showErrorMessage : function(message) {
		hope.showMessage(message, hope.ERROR);
	},
	
	/** Clear the current modal message. */
	clearMessage : function() {
		var element = document.find(hope.modalMessageSelector);
		if (element) element.hide();
	},
	
	
	/**
		Non-modal growl-style message/error display.  Shows for a few seconds, then goes away.
	*/
	flashMessageSelector : "#FlashMessage",		// NOTE: we assume it starts out with class='Hidden' which is hiding it
	flashMessageBodySelector : "#FlashMessageBody",
	flashMessageDuration : 3,	// duration in SECONDS
	flashMessage : function(message, duration, asError) {
		asError = (asError == hope.ERROR);
		var element = document.find(hope.flashMessageSelector);
		if (element) {
			element.toggleClass("Error", asError);
			var body = document.find(hope.flashMessageBodySelector, element) || element;
			body.innerHTML = message;
			element.show();
			setTimeout(function() {
						element.hide();
						}, (duration || hope.flashMessageDuration) * 1000);
		} else {
			if (asError) {
				console.warn("hope.flashMessage() says: ",message);
			} else {
				console.warn("hope.flashErrorMessage() says: ",message);
			}
		}
	},
	flashErrorMessage : function(message, duration) {
		hope.flashMessage(message, duration, hope.ERROR);
	}
});
