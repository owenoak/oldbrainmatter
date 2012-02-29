


dnb.createClass("Messenger", {
	id			: "paintNotifier",
	
	opacity		: null,		// will pick up from CSS i not specified
	fade		: true,		// if true, we fade notice in and out
	fadeTime	: 200,		// msec to perform the actual fade
	delay		: 2000,		// milliseconds to show the notice, 0=leave up
	
	getElement : function() {
		var element = this.element || (this.element = dnb.byId(this.id));
		// make sure opacity is set as well
		this.opacity = this.opacity || (this.opacity = dnb.getComputedStyle(element, "opacity"));
		return element;
	},

	show : function() {
		var message = dnb.joinArguments(arguments),
			element = this.getElement()
		;
		element.innerHTML = message;
		if (this.fade) {
			if (this.delay) {
				dnb.fadeInAndOut(element, this.delay, this.fadeTime, this.opacity);
			} else {
				dnb.fadeIn(element, this.fadeTime, this.opacity);
			}
		}
	},
	
	showImmediately	: function() {
		var message = dnb.joinArguments(arguments),
			element = this.getElement()
		;
		element.innerHTML = message;
		element.style.display = "block";
		element.style.opacity = this.opacity;
	},
	
	clear : function() {
		var	element = this.getElement();
		if (this.fade) {
			dnb.fadeOut(element, this.fadeTime, this.opacity);
		}
		element.innerHTML = "&nbsp;";
	}

});