/*
	Notifier -- shows a message to the user.
*/

var Notifier = Class.create(ProtoWidget, {
	klass 					: "Notifier",
	autoDraw 				: true,
	
	fadeInInterval			: .2,			// # of seconds for fade-in animations
	fadeOutInterval			: .5,			// # of seconds for fade-out animations
	flashMessageInterval 	: 5,			// # of seconds to show a 'flash' message

	onDraw : function(parent) {
		var elements = Element.htmlToElements(this.OuterTemplate.evaluate(this));
		this.$mask = elements[0];
		this.$main = elements[1];
		this.$message = this.$main.select(".NotifierMessage")[0];
		
		parent.appendChild(this.$mask);
		parent.appendChild(this.$main);
	},

	show : function(message, autoHide, callback) {
		this.$main.removeClassName("Warning");
		this.$main.removeClassName("Error");
		this._showMessage(message, autoHide, callback);
	},
	
	warn : function(message, autoHide, callback) {
		this.$main.addClassName("Warning");
		this._showMessage(message, autoHide, callback);	
	},
	
	error : function(message, autoHide, callback) {
		this.$main.addClassName("Error");
		this._showMessage(message, autoHide, callback);
	},

	_showMessage : function(message, autoHide, callback) {
		if (!this._drawn) return;

		this.$message.innerHTML = message;

		if (!this._messageIsVisible) {
			new Effect.Appear(this.$main, {duration:this.fadeInInterval});			
		}
		if (this._fader) {
			this._fader.cancel();
			delete this._fader;
		}
		this.$mask.style.display = "block";

		if (autoHide) {
			var me = this;
			function clear() {
				me.clear(callback);
			}
			setTimeout(clear, this.flashMessageInterval*1000);
		}
		this._messageIsVisible = true;
	},

	flash : function(message, callback) {
		if (!this._drawn) return;

		this.show(message, true, callback);
	},
	
	clear : function(callback) {
		if (!this._drawn) return;

		this._messageIsVisible = false;

		this._fader = new Effect.Fade(this.$main, 
			{
				duration:this.fadeOutInterval,
				afterFinish : function() {
					this.$mask.style.display = "none";
					delete this._fader;
					if (callback) callback();
				}.bind(this)
			}
		);
	},

	OuterTemplate : new Template(
		"<div class='NotifierMask' style='display:none'></div>\
		 <div class='NotifierFrame' style='display:none'>\
			 <div class='NotifierMessage'>#{message}</div>\
		 </div>"
	)

});
