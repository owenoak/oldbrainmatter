// TODO: 
//			- title color needs to change with dialog somehow
//			- some sort of resize logic?
//			- abstract this and dialog together somehow?  'Popup'?

var Tooltip = window.ToolTip = Class.create(ProtoWidget, {
	klass : "Tooltip",
	
	autoDraw : false,	
	
	className : undefined,			// extra class name for the outer element of the tooltip
	title : undefined,				// title to show, if defined
	contents : undefined,			// contents to show in the tooltip (can be HTML)
	target : undefined,				// target element to show the tooltip near
	
	popupDelay : .5,				// delay before the tooltip is shown
	arrowEdgeInset : 30,			// amount to inset the top/bottom arrow so we don't
									//  don't run into the roundness of the outer element
	
	orientation : "vertical",		//	"h[orizontal]" or "v[ertical]"

	viewportInset : {				// amount we inset from the sides of the screen
						top	  :5, 		
						right :21,		// (extra to account for scrollbar)
						bottom:5,
						left  :5						
					},
	bodyMargins : { 				// amount we inset the body to account for the cursor
						top	  :32, 		
						right :25,
						bottom:32,
						left  :25
				   },
	
	initializeProperties : function() {
		this._onTargetHoverBegin = this.onTargetHoverBegin.bind(this);
	},
	
	//
	// special property setters
	//
	setTitle : function(title) {
		if (title != undefined) this.title = title;
		var hasTitle = (this.title != null && this.title != "");
		this.setPartHTML(".TooltipTitle", this.title, hasTitle);
		this.toggleAttribute(this.$main, "hasTitle", true, hasTitle);
	},
	
	setContents : function(contents) {
		if (contents != undefined) this.contents = contents;
		var hasContents = (this.contents != null && this.contents != "");
		this.setPartHTML(".TooltipBody", this.contents, hasContents);
		this.toggleAttribute(this.$main, "hasContents", true, hasContents);
	},
	
	
	//
	//	drawing
	//
	onDraw : function() {
		// tooltips are always drawn as direct descendants of the body element
		//	(necessary for positioning them properly)
		var parent = document.body;
		
		var newMain = Element.htmlToElements(this.getHTML())[0];
		if (this.$main) {
			parent.replaceChild(newMain, this.$main);
		} else {
			parent.appendChild(newMain);
		}
		this.$main = newMain;
	},

	getHTML : function() {
		return this.OuterTemplate.evaluate(this);
	},
	
	onRedraw : function() {
		this.draw();
	},

	onAfterDraw : function($super) {
		$super();
	},


	// show and hide the tooltip

	// properties is an object of properties to set -- generally you'll set one or more of:
	//		- target    -- element to draw the tooltip near
	//		- title		-- title for the tooltip
	//		- contents	-- contents for inside the tooltip
	//		- 
	show : function(properties) {
		this.setProperties(properties);

		if (!this.$main) this.draw();

		this.setTitle();
		this.setContents();
		this.$main.bringToFront();
		this.orientNearTarget();
		this.$main.style.display = "block";
	},
	
	hide : function() {
		if (this._hover && this._hoverTimer) clearTimeout(this._hoverTimer);
		delete this._hover;
		if (this.$main) this.$main.style.display = "none";
	},


	orientNearTarget : function() {
		var horizontal = (this.orientation.charAt(0) == "h"),
			position = (horizontal
							? this._orientHorizontally()
							: this._orientVertically()
					   );
		
		// move into position
		this.$main.style.left = position.x + "px";
		this.$main.style.top = position.y + "px";
		
		// arrow position should be near the mouse
		//	but we don't want to be within a certain amount of the edge
		//	or it'll look funny
		var arrow = this.$main.select(".Tooltip"+position.arrow+"Arrow")[0];

		arrow.style[horizontal ? "top" : "left"] = position.arrowPos + "px";
		this.toggleAttribute(this.$main, "orientation", position.orientation, true);
	},
	
	_orientHorizontally : function() {
		// figure out if we should show it above or below
		var dims = this.$main.getDimensions();
		dims.height += this.bodyMargins.top + this.bodyMargins.bottom;
		dims.width += this.bodyMargins.left + this.bodyMargins.right;

		var viewport = document.viewport.getMaxedDimensions(),
			y = (this._hover.y - (dims.height / 2)).max(this.viewportInset.top),
			x = this._hover.x + this.bodyMargins.left,
			orientation = "right"
		;
		
		// make sure we're not off the screen horizontally
		if (x + dims.width > viewport.width) {
			// try to flip horizontally
			if (x - dims.width > 0) {
				orientation = "left";
				x -= dims.width;
			}
		}
		
		// make sure we're not off the screen vertically
		viewport.height -= this.viewportInset.bottom;
		if (y + dims.height > viewport.height) {
			y = (viewport.height - dims.height).max(this.viewportInset.top);
		}
		
		return {x:x, y:y, orientation:orientation, 
				arrow: (orientation == "right" ? "Left" : "Right"),
				arrowPos: (this._hover.y - y).range(this.arrowEdgeInset,dims.height-this.arrowEdgeInset)
			   };
	},
	
	_orientVertically : function() {
		// figure out if we should show it above or below
		var dims = this.$main.getDimensions();
		dims.height += this.bodyMargins.top + this.bodyMargins.bottom;
		dims.width += this.bodyMargins.left + this.bodyMargins.right;

		var viewport = document.viewport.getMaxedDimensions(),
			x = (this._hover.x - (dims.width / 2)).max(this.viewportInset.left),
			y = this._hover.y + this.bodyMargins.top,
			orientation = "below"
		;
		
		// make sure we're not off the screen vertically
		if (y + dims.height > viewport.height) {
			// try to flip vertically
			if (y - dims.height > 0) {
				orientation = "above";
				y -= dims.height;
			}
		}
		
		// make sure we're not off the screen horizontally
		// (inset the viewport width  bit extra to account for the scrollbar)
		viewport.width -= this.viewportInset.right;
		if (x + dims.width > viewport.width) {
			x = (viewport.width - (dims.width - this.bodyMargins.left)).max(this.viewportInset.left);
		}
		
		return {x:x, y:y, orientation:orientation, 
				arrow: (orientation == "above" ? "Bottom" : "Top"),
				arrowPos: (this._hover.x - x).range(this.arrowEdgeInset,dims.width-this.arrowEdgeInset)
			   };	
	},
	
	
	//
	//	mouse event handling
	//	
	//	TODO: move this into HoverTarget mixin?
	//
	//	- your element which wants to show the hover should implement events:
	//			onmouseover : <tooltip>.onTargetEnter(event, targetElement, callbackElement, memo)
	//			onmouseout  : <tooltup>.onTargetLeave(event, targetElement)
	//	- when the mouse has hovered over the target for this.popupDelay seconds, we call:
	//			callbackTo.getTooltipProperties()
	//		and display the tooltip near the targetElement with those properties
	//	To set this up programmatically, call:
	//		tooltip.attachTo(e
	//
	//
	
	// mouse is entering the target:
	//	call onTargetHoverBegin if the mouse is still in the target after this.popupDelay
	onTargetEnter : function(event, targetElement, callbackTo, memo) {
		if (!Event.mouseEnteringOrLeaving(event, targetElement)) return;

		if (this._hover) clearTimeout(this._hover.timer);
		this._hover = {
			target : targetElement,
			callbackTo : callbackTo,
			memo : memo,
			x : event.pointerX(),
			y : event.pointerY(),
			timer : setTimeout(this._onTargetHoverBegin, this.popupDelay * 1000)
		};
	},
	
	// mouse is leaving the target
	//	call this.onTargetHoverEnd() to hide the popup and clean things up
	onTargetLeave : function(event, targetElement) {
		if (!Event.mouseEnteringOrLeaving(event, targetElement)) return;
		this.onTargetHoverEnd();
	},

	// mouse is moving over the target
	//	if we're preparing to hover, note the mouse position
	onTargetMove : function(event, targetElement, callbackElement) {
		if (this._hover && this._hover.timer) {
			this._hover.x = $e(event).pointerX();
			this._hover.y = event.pointerY();
		}
	},


	// target is (potentially) hovering over the target
	//	if it is in fact still over the target, 
	//	get the tooltipData from the callbackObject
	//	and show the tooltip
	onTargetHoverBegin : function() {
		if (!this._hover) return;
		delete (this._hover.timer);
		
		var properties = this._hover.callbackTo.getTooltipData(this._hover.memo);
		if (properties) {
			this.target = this._hover.target;
			this.show(properties);
			this.showing = true;
		}
	},
	
	// no longer hovering -- clean things up
	onTargetHoverEnd : function() {
		if (this.showing) this.hide();
		if (!this._hover) return;
		clearTimeout(this._hover.timer);
		delete this._hover;
	},


	//
	//	hook up this tooltip to a particular element/callback object
	//		<element> 			html element to watch
	//		<callbackObject>	object to get tooltip data from on hover
	//		<memo>				property passed to callbackObject.getTooltipData() for its reference
	attachTo : function(element, callbackTo, memo) {
		element = $(element);
		// remember the bound functions so we can unregister
		element._tooltipOver = this.onTargetEnter.bindAsEventListener(this, element, callbackTo, memo);
		element._tooltipOut  = this.onTargetLeave.bindAsEventListener(this, element, callbackTo, memo);

		element.observe("mouseover", element._tooltipOver);
		element.observe("mouseout", element._tooltipOut);
	},

	// call this for a particular element to STOP observing this tooltip
	detachFrom : function(element) {
		if (!element._tooltipOver) return;
		$(element).stopObserving("mouseover", element._tooltipOver);
		   element.stopObserving("mouseout", element._tooltipOut);
	},
	


	OuterTemplate : new Template(
		"<div class='Tooltip #{className}' round='huge'>\
			<div class='TooltipTopArrow'></div>\
			<div class='TooltipBottomArrow'></div>\
			<div class='TooltipLeftArrow'></div>\
			<div class='TooltipRightArrow'></div>\
			<div class='TooltipTitle'>#{title}</div>\
			<div class='TooltipBody' round='huge'>#{contents}</div>\
		</div>"
	)

})