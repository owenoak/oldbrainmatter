
var CompositeWidgetMixin = {
	// YOU MUST OVERRIDE THIS TO RETURN THE JS PART OBJECT FOR A PARTICULAR PART ID
	getPart : function(partId) {},
	
	// YOU MUST OVERRIDE THIS TO RETURN THE HTML FOR YOUR PARTS
	getPartsHTML : function() {
		return this + ": PARTS HTML FUNCTION IS NOT DEFINED";
	},
	
	// YOU REALLY SHOULD CREATE AN OUTER TEMPLATE FOR YOUR PARTS
	// NOTE: WE ASSUME THAT THERE IS A SINGLE ELEMENT WRAPPING ALL OF THE PARTS
	MainTemplate : new Template("<span>#{partsHTML}</span>"),

	// event handlers
	//	implement any of the below and they will be called automatically
//	onMouseOver : function(event, part, element, partId) {},
//	onMouseOut : function(event, part, element, partId) {},
//	onMouseDown : function(event, part, element, partId) {},
//	onMouseUp : function(event, part, element, partId) {},
//	onMouseClick : function(event, part, element, partId) {},

	// These are called when the mouse enters or leaves the outer element,
	// ignoring interactions within the parts.
	//  (i.e. 'part' ALWAYS refers the main object, etc)
//	onMouseEnter : function(part, element, partId) {},
//	onMouseLeave : function(part, element, partId) {},


	//
	//	generic
	//


	// part that's currently underneath the mouse	
	_eventPart : undefined,
	
	// time after which we'll fire an 'onMouseLeave' event when the mouse goes outside of us
	mouseLeaveInterval : .1,
	

	onDraw : function(parent) {
		this.$main = Element.htmlToElements(this.getHTML())[0];
		parent.insert(this.$main);
		this.hookupEvents();
	},

	onRedraw : function() {
		this.$main.innerHTML = this.getPartsHTML();
	},


	getHTML : function() {
		this.partsHTML = this.getPartsHTML();
		return this.MainTemplate.evaluate(this);
	},

	// map of event name to function name, called by eventDispatcher
	eventHandlerMap : {mouseover:"onMouseOver", mouseout:"onMouseOut", mousedown:"onMouseDown", mouseup:"onMouseUp", click:"onMouseClick"},

	// hookup events after draw
	//	THIS IS PRETTY GENERIC...
	hookupEvents : function() {
		// bind the generic callback handlers once to this object,
		//	so we don't waste time doing it over and over during events
		var _partEventDispatcher = this._partEventDispatcher.bind(this);

		// attach event handlers to the main element
		if (this.$main) {
			var map = this.eventHandlerMap;
			for (var event in map) {
				if (this[map[event]]) this.$main.observe(event, _partEventDispatcher);
			}
		}
	},


	// generic event dispatcher
	//	handles made-up mouseEnter and mouseLeave events as well
	_partEventDispatcher : function(event) {
		var prevPart = this._eventPart,
			part = this._eventPart = this.getPartForEvent(event)
		;
		// handle the "onMouseOver" and "onMouseOut" events for the entire widget
		this.clearDelay("mouseLeaveTimer");
		if (part.object == this) {
			// have to do mouseLeave on a timer so we don't fire when moving in and out of parts
			if (event.type == "mouseout") {
				if (typeof this.onMouseLeave == "function") {
					var callback = this._mouseLeaveDispatcher.bind(this, event);
					this.delay(callback, this.mouseLeaveInterval, "mouseLeaveTimer");
				}
			} else if (event.type == "mouseover" && prevPart == null) {
				if (typeof this.onMouseEnter == "function") {
					this.onMouseEnter(event, this, this.$main);
				}
			}
		}

		var handlerName = this.eventHandlerMap[event.type],
			handler = part[handlerName] || this[handlerName] 
		;

		if (typeof handler == "function") {
			handler.call(this, event, part.object, part.element, part.partId);
			event.stop();			// XXX always stop?  delegate to event handlers?
		}
		// don't event.stop() if event was not handled
	},


	// special dispatcher for the 'mouseLeave' event
	_mouseLeaveDispatcher : function(event) {
		this.clearDelay("mouseLeaveTimer");
		if (this._eventPart && this._eventPart.object == this) this.onMouseLeave(event, this, this.$main);
		delete this._eventPart;
	},

	// return the 'part' for an event as
	//	{ 
	//		object: 	<js object for the part>, 
	//		element:	<HTML element for the part>,
	//		partId:		<part id for the html element>
	//	}
	//	
	//	if no part found, returns: {object: this, element: this.$main, partId: undefined}
	//
	getPartForEvent : function(event) {
		if (!this.$main) return;
		var target = event.target;
		while (target && target != this.$main && target.getAttribute) {
			var partId = target.getAttribute("partId");
			if (partId != null) return 	{ object: this.getPart(partId), partId : partId, element: target };
			target = target.parentNode;
		}
		return {object: this, partId: undefined, element: this.$main};
	}
}