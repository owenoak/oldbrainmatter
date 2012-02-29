var Dialog = Class.create(ProtoWidget, {
	klass 			: "Dialog",
	autoDraw 		: false,

	dialogClassName : "",		// outer class name for the dialog (eg: Confirm, etc)
	title			: null,		// title of the dialog
	button1Title 	: null,		// name for left-most button (hidden if name not set)
	button2Title 	: "OK",		// name for right-most button
	
	contents		: null,		// contents to show in the center of the dialog
								// some dialog subclasses may redefine this

	// override this to do something when 1st button is pressed
	button1Pressed : function() {},		

	// override this to do something (else) when 2nd button is pressed
	button2Pressed : function() {		
		this.hide();
	},

	getHTML : function() {
		return this.OuterTemplate.evaluate(this);
	},
	
	onDraw : function() {
		this.$main = Element.htmlToElements(this.getHTML())[0];
		document.body.appendChild(this.$main);
	},

	onRedraw : function() {
		var newMain = Element.htmlToElements(this.getHTML())[0];
		this.$main.parentNode.replaceChild(newMain, this.$main);
		this.$main = newMain;
	},

	prepareToDraw : function() {
		var buttonClass = [];
		if (this.button1Title) buttonClass.push("ShowButton1");
		if (this.button2Title) buttonClass.push("ShowButton2");

		this._footerClassName = buttonClass.join(" ");
	},

	// show and hide the dialog
	show : function(properties) {
		// tell the page that we're showing a dialog
		//	to temporarily turn off auto-update
		if (window.page && page.setUpdateCondition)
			page.setUpdateCondition("dialogIsVisible", true);
			
		Object.extend(this, properties);

		Dialog.showMask();
		if (!this._drawn) 	this.draw();
		else				this.redraw();
		
		this.$main.style.top = "-10000px";
		this.$main.style.display = "block";

		this.centerOnScreen();
	},
	
	hide : function() {
		Dialog.hideMask();
		this.$main.style.display = "none";

		// tell the page that we're no longer showing a dialog
		//	to re-enable auto-update
		if (window.page && page.setUpdateCondition)
			page.setUpdateCondition("dialogIsVisible", false);			
	},

	// center the dialog on the screen (after it is drawn, and assuming it is visible)
	centerOnScreen : function() {
		Dialog.centerOnScreen(this.$main);
	},

	OuterTemplate : new Template(
		"<div class='Dialog #{dialogClassName}' round='huge'>\
			<table class='DialogTable' round='huge' cellspacing='0' cellpadding='0'>\
			\
				<tr>\
					<td class='DialogHeader roundTOPlarge'>#{title}</td>\
				</tr>\
			\
				<tr>\
					<td class='DialogBody'>\
						#{contents}\
					</td>\
				</tr>\
			\
				<tr>\
					<td class='DialogFooter roundBOTTOMlarge #{_footerClassName}'>\
						<div class='Button Button1' onclick='#{globalRef}.button1Pressed()'>\
							#{button1Title}\
						</div\
						><div class='Button Button2' onclick='#{globalRef}.button2Pressed()'>\
							#{button2Title}\
						</div>\
					</td>\
				</tr>\
			</table>\
		</div>"
	),
	
	// template for Confirm or Error dialogs
	MessageTemplate : new Template(
		"<div class='DialogIcon'></div>\
		 <div class='DialogMessage'>\
			#{message}\
		 </div>"
	)
});


Dialog.showMask = function() {
	if (!Dialog.$mask) {
		Dialog.$mask = new Element("DIV", {id:"DialogMask", className:"DialogMask"});
		document.body.appendChild(Dialog.$mask);

		// try to get opacity from the element style
		var opacity = Dialog.$mask.getOpacity();
		if (opacity == 1 || opacity == 0) opacity = .6;
		Dialog.$mask.opacity = opacity;
		
		Dialog.$mask._resizeHandler = Dialog.onResize.bind(this);
	}

	Dialog.onResize();
	Element.observe(window, "resize", Dialog.$mask._resizeHandler);
	Dialog.$mask.style.display = "block";
}

Dialog.onResize = function() {
	Dialog.$mask.style.width = Dialog.$mask.style.height = "1px";
	var maxSize = document.getMaxedDimensions();
	Dialog.$mask.style.width = maxSize.width+"px";
	Dialog.$mask.style.height = maxSize.height+"px";	
}

Dialog.hideMask = function(duration) {
	if (!Dialog.$mask) return;
	Element.stopObserving(window, "resize", Dialog.$mask._resizeHandler);
	Dialog.$mask.style.display = "none";
}

Dialog.centerOnScreen = function(element, left, top) {
	var size = element.getDimensions(),
		viewSize = document.viewport.getDimensions(),
		viewScroll = document.viewport.getScrollOffsets()

	;
	
	if (left == null) left = Math.max(0, ((viewSize.width - size.width)/2) + viewScroll.left);
	if (top == null) top = Math.max(0, ((viewSize.height - size.height)/2) + viewScroll.top);
	
	element.style.left = left + "px";
	element.style.top = top + "px";
}


