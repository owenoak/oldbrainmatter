//
//	Notifier singleton -- displays messages either modally or non-modally
//


(function($) {	// begin hidden from global scope

$.Notifier = {
	notifierParentElement : "body",
	flasherParentElement  : "body",

	// show/hide a message which blocks the main UI (eg: when loading or load error)
	show : function(msg, showAsError) {
		if (showAsError == null) showAsError = false;

		// draw the notifier if necessary
		var outerElement = $("#Notifier");
		if (outerElement.length == 0) {
			var parent = $($.Notifier.notifierParentElement);
			outerElement = $($.Notifier.notifierTemplate);
			parent.append(outerElement);
		}

		if (msg) $("#NotifierMessage").html(msg);
		$.Notifier._currentMessage = msg;

		outerElement.moveToTop().toggleClass("error", showAsError).show();
	},
	
	hide : function() {
		$("#Notifier").hide();
		delete $.Notifier._currentMessage;
	},
	
	hideIf : function(msg) {
		if ($.Notifier._currentMessage === msg) $.Notifier.hide();
	},
	
	// show an error message which blocks the main UI
	showError : function(msg) {
		$.Notifier.show(msg, true);
	},
	
	
	// show/hide a transient message that doesn't block the main UI
	flash : function(msg, seconds, showAsError) {
		if (showAsError == null) showAsError = false;
		if (seconds == null) seconds = 3;	// default show time is 3 seconds

		var outerElement = $("#Flasher");
		if (outerElement.length == 0) {
			var parent = $($.Notifier.flasherParentElement);
			outerElement = $($.Notifier.flasherTemplate);
			parent.append(outerElement);
		}

		if ($.Notifier.timeout) {
			clearTimeout($.Notifier.timeout);
			delete $.Notifier.timeout;
		}
		

		$("#FlasherBody").html(msg);
		$("#Flasher").toggleClass("error", showAsError).show();
		$.Notifier.timeout = setTimeout($.Notifier.hideFlasher, seconds*1000);
	},

	hideFlasher : function(msg) {
		$("#Flasher").slideUp(100);
		clearTimeout($.Notifier.timeout);
		delete $.Notifier.timeout;
	},
	
	flashError : function(msg, seconds) {
		$.Notifier.flash(msg, seconds, true);
	},
	
	
	notifierTemplate : 
		"<div id='Notifier'>"
			+"<div id='NotifierMask'></div>"
			+"<center>"
				+"<div id='NotifierBody'>"
					+"<div id='NotifierMessage'>Loading...</div>"
					+"<button id='reloadPageButton' class='dark' message='UI.reloadPage'"
						+"onclick='javascript:app.reloadPage()'></button>"
				+"</div>"
			+"</center>"
		+"</div>",
		
		
	flasherTemplate : 
		"<div id='Flasher' style='display:none'>"
			+"<div id='FlasherShadow'></div>"
			+"<div id='FlasherBody'></div>"
		+"</div>"

};

})(jQuery);	// end hidden from global scope
