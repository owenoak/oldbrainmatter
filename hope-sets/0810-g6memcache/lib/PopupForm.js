/*
	PopupForm 		-- form encapsulated in a dialog

*/
var PopupForm = Class.create(DynaForm, {
	klass 			: "PopupForm",
	
	className 		: undefined,
	title			: undefined,
	fadeDuration	: .2,				// set to a number of seconds to fade in/out
										// set to undefined or 0 to omit fade
	
	setTitle : function(title) {
		this.title = title;
		if (this._drawn) this.$main.select(".DialogHeader")[0].innerHTML = this.title;
	},
	
	open : function(value, mode) {
		if (window.page && page.setUpdateCondition) page.setUpdateCondition("dialogIsVisible", true);
		Dialog.showMask(this.animate);

		if (mode) this.mode = mode;
		if (value) this.setValue(value);
		if (!this._drawn) this.draw();

		this.setTitle(this.mode == "new" ? this.newTitle : this.editTitle);
		if (Prototype.Browser.WebKit) 	this.animateIn.bind(this).defer(0);
		else							this.animateIn();
	},
	
	close : function($super) {
		$super();
		Dialog.hideMask(this.fadeDuration);
		this.animateOut();
		if (window.page && page.setUpdateCondition) page.setUpdateCondition("dialogIsVisible", false);
	},
	
	animateIn : function() {
		this.$main.style.display = "block";

		if (this.fadeDuration)  this.$main.setOpacity(0);
		Dialog.centerOnScreen(this.$main, null, 50);
		if (this.fadeDuration) {	
			new Effect.Appear(this.$main, { 
								duration: this.fadeDuration, 
								afterFinish : this.onFormReady.bind(this) 
							});	
		} else {
			this.onFormReady();
		}
	},

	animateOut : function() {
		if (this.fadeDuration) {
			new Effect.Fade(this.$main, 
							{ 
								duration: this.fadeDuration, 
								afterFinish: this.hide.bind(this) 
							});
		} else {
			this.hide();		
		}
	},

	onDraw : function(parent) {
		var html = this.OuterTemplate.evaluate(this);
		this.$main = Element.htmlToElements(html)[0];
		parent.appendChild(this.$main);
		var formParent = $(this.id+"_contents");

		var form = Element.htmlToElements(this.getHTML())[0];
		formParent.appendChild(form);
	},

	
	OuterTemplate : new Template(
		"<div #{id} class='PopupForm Dialog #{className}' style='position:absolute;top:-10000px'>\
			<table round='huge' class='DialogTable' cellspacing='0' cellpadding='0'>\
			\
				<tr>\
					<td class='DialogHeader' round='hugeT'>#{title}</td>\
				</tr>\
			\
				<tr>\
					<td class='DialogBody' round='hugeB largeT' id='#{id}_contents'></td>\
				</tr>\
			</table>\
		</div>"
	)


});