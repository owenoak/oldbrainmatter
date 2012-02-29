/*! Hope application framework, v 0.1					See: http://hopejs.com
 *	 *	MIT license.										See: http://hopejs.com/license

 *	Copyright (c) 2006-2009, Matthew Owen Williams.
 */

(function($, hope) {
// 
//		Begin hidden from global scope:
//


// load the templates file(s)
//	Note: we load this synchronously because lots of things in the UI depend on it being loaded.
// TODO: move this to a relative path somehow...
$.Template.load("js/hope/hope.templates", false);


//	TODO:		- if no element or no container, draw in body?
//

/** Simple drawable abstract class.

	Note that you must specify *either*:
			.elementSelector	= selector or element to REPLACE with our HTML UI,
	 	OR 
	 		.container			= containing drawable we will draw inside

	Also, the default implementation expands a template for our HTML UI.
	Specify drawable.template as one of:
			- a template object
			- "#<id>" for id of a page element to use as the template, or
			- "<templateId>" for a stored template

	If you want to draw in some other way, implement `drawable.drawElements()`.

	@class
 */
new $.Thing({
	name : "Drawable",
	prototype: {
		/** If true, we draw automatially when we are created. */
		autoDraw : false,

		/** Template string to use to draw me. 
			Will be set to contents of $("#<this.templateId>") if not defined.
		  */
		template : "Drawable",
			
		/** Parent drawable that we will draw in. */
		container : undefined,
	
		/** Element or (global selector for) to replace with our HTML elements.
			If initially defined, we'll look for an element with that id
			and replace it with our template when we draw.
		*/
		elementSelector : undefined,

		/** jQuery-enabled DOM elements that comprise our UI. 
			Initialized automaically in `draw()`.
		*/
		elements : undefined,
	
		/** HTML code to draw inside this element.  May be ignored by some subclasses. */
		innerHTML : undefined,


		//
		//	attributes we may write into our HTML representation
		//

		/** List of attributes that we will output to our main element, if present.
			NOTE:  type, class(name) and disabled are always handled separately
			@see getAttributesHTML()
		 */
		attributes : "id,style,hint,tabIndex,accessKey,selected,round",

		/** List of attributes that we will output to our main element, if present.
			@see hookUpEvents()
		 */
		eventHandlers : "onMouseMove,onMouseOver,onMouseOut,onMouseDown,onMouseUp,onClick,onDoubleClick,onMouseEnter,onMouseLeave",

		/** id attribute for our element. */
		id : undefined,
		
		/** style attributes for main element. */
		style : undefined,
		
		/** custom class name for main element. */
		className : "",

		/** Base class name for main element (generally doesn't change per widget instance). */
		baseClass : "",

		/** Round corners:  [S|M|L|H] + [-TL|-TR|-BL|-BR].
			@example  "M" 	 == "all medium"
			@example  "S-TL" == "small top-left"
		*/
		round : "",

		/** Tab index for tabbing around the screen. */
		tabIndex : undefined,

		/** Access key for keyboard shortcuts. */
		accessKey : undefined,
		
		
		//
		// initialize/destroy
		//
		
		/** Draw the object if autoDraw is true. */
		initialize : function(properties) {
			if (this.autoDraw) this.draw();
		},
		
		/** Get rid of our elements on destroy. */
		destroy : function() {
			this.removeElements();
			delete this.elements;
			
			// superclass call
			return $.Thing.prototype.destroy.apply(this);
		},

	
		//
		//	drawing semantics
		//

		/** Draw me -- calls "update" to do update dynamic bits of my representation. */
		draw : function(skipUpdate) {
			if (!this.elements) {
				// where should we draw?
				var element;

				// if that didn't work, try our 'elementSelector'
				if (this.elementSelector) {
					if (typeof this.elementSelector != "string") {
						element = this.elementSelector;
					} 
					// if we have a container that's been drawn, look in it's elements
					else {
						if (this.container && this.container.elements) {
							element = this.container.elements.find(this.elementSelector);
							if (!element.length) element = null;
						}
						// look globally?
						if (!element) element = $(this.elementSelector);
						if (!element.length) element = null;
					}
				}

				// if that didn't work, try by our id
				if (!element && this.id) {
					element = $("#"+this.id);
					if (!element.length) element = null;
				}

				// if we get an element, extract attributes from it and extend us with them
				if (element) {
					var attrs = element.attrs();
					if (attrs) this.extend(attrs);
				}

				// draw our elements
				this.elements = this.drawElements();
				if (!this.elements || !this.elements.length) return;
				
				this.hookUpEvents();
				
				// if we found an element, replace with the our elements
				if (element) {
					element.replaceWith(this.elements);
				}
				// otherwise put it inside our container's main element
				else {
					var parent = (this.container ? this.container.getItemContainer(this) : null);
					if (!parent) parent = $("body");
					parent.append(this.elements);
				}
				
				// if we not enabled, call this.disable() to make sure our elements/items know it
				if (this.enabled == false) this.disable();
			}
	
			// call update to poke the proper values into our element
			if (skipUpdate != $.SKIP) this.update();
			
			return this;
		},
	
	
		/** Remove the item's elements from the DOM */
		removeElements : function() {
			// remove our elements from the DOM
			if (this.elements) this.elements.remove();
		},
	
		/** Resize this element (because the window has resized, etc). 
			The default implementation doesn't do anything.
		*/
		onResize : function() {},
	
	
		/** Make sure eventHandlers is an array, and append to any previous eventHandlers. */
		setEventHandlers : function(list) {
			list = (typeof list == "string" ? list.split($.patterns.splitOnCommas) : list);
			return this.eventHandlers = (this.eventHandlers ? this.eventHandlers.concat(list) : list);
		},

		/** Hook up any dynamic events on our elements using jQuery's event mechanism.
			I'm a bit concerned about the speed of their code, but in for a penny...
		 */
		hookUpEvents : function() {
			if (!this.elements) return;
			
			var handler = $.bind(this._handleEvent, this),
				map = $.eventMethodMap,
				elements = this.elements,
				jQueryEventName,
				i = 0, 
				event
			;
			while (event = this.eventHandlers[i++]) {
				// skip events we haven't implemented
				if (!this[event]) continue;
				jQueryEventName = map[event];
				elements[jQueryEventName](handler);
			}
		},
		
		
		/** Handle one of our standard events by calling the appropriate dispatcher method.
			In the function, "this" is this drawable.
			
			Events are normalized before being passed in to target's event handler,
			so you may want to use any of:
				- event.target			-- original element (not text node)
				- event.currentTarget	-- the element that's responding to the event handler
				- event.relatedTarget	-- the element that we came from (on a mouseover/out)
				- event.which			-- nomalized button (1=left,2=middle,3=right) or key
				- event.pageX/pageY		-- page-level x & y
				- event.clientX/clientY	-- client
				
			Since we generally want to stop events once captured, 
			we will stop propagation on the event unless your routine returns $.CONTINUE

			@note	We skip all events if we're disabled.
		 */
		_handleEvent : function(event) {
			if (!this.enabled) return;			
			var method = $.eventTypeMap[event.type];
			if (typeof this[method] == "function") {
				var result = this[method](event);
				if (result !== $.CONTINUE) {
					event.stopPropagation();
					event.preventDefault();
				}
			}
		},
		
		//
		//	HTML representation
		//
		//		The default implementation renders a single template for our HTML.
		//		Override in your application to do somethign more interesting.
		//
		//		Note:  Because we want to avoid fully redrawing as much as possible,
		//			   our default conventions for templates are:
		//					1) Template expansions should be limited to things that are not
		//						likely to change for the element (eg: elementID, event handlers, etc)
		//
		//					2) Your initial template HTML should be able to render the element in
		//						all states, with stuff that is not relevant hidden via CSS
		//
	
		/** Expand a template, specified by name or reference. */
		expandTemplate : function(template) {
			var name = template;
			if (typeof template == "string") template = $.Template.getInstance(template);
			if (!template) throw TypeError(this+".expandTemplate("+name+"): template not found.");
			var args = $.args(arguments); args[0] = this;
			var html = template.expand.apply(template, args);
			return $(html);
		},

	
		/** Return the *outer* HTML for this element.
			Default implementation interpolates this.template.
		 */
		drawElements : function() {
			return this.expandTemplate(this.template);
		},

		/** Return HTML for our 'standard' attributes that we'll output into our main element. 
			We apply all properties that are in our "attributes" object.
		*/
		getAttributesHTML : function getAttributesHTML() {
			var output = [], list = this.attributes, key, value, i=0;
			
			// handle __type__, className and disabled separately
//			output.push("ui='"+this.__type__+"'");

			// class is:  "<widget.className> _<__type__> <widget.baseClass>"
			output.push("class='" + this.getClassName() + this._getBaseClass() + "'");
			if (!this.enabled) output.push("disabled='true'");
			if (this.selected) output.push("selected='true'");
			if (!this.visible) output.push("visible='"+this.visible+"'");

			while (key = list[i++]) {
				value = this[key];
				if (value != null && value != "") {
					output.push(key + "=\"" + value + "\"");
				}
			}
			return output.join(" ");
		},

		//
		//	Add/remove item from some container.
		//
		//	Note that if the container is a "drawable", we set our 'container' property.
		//
		onAddTo : function(container, containerKey) {
			this.asClass.onAddTo.apply(this, arguments);
			if (container instanceof $.Drawable) this.container = container;
		},
		
		onRemoveFrom : function(container, containerKey) {
			this.asClass.onRemoveFrom.apply(this, arguments);
			if (container instanceof $.Drawable) delete this.container;
		},

		
		//
		//	Updating, refreshing, etc
		//
		
		
		/** Make sure attributes is an array, and append to any previous attributes. */
		setAttributes : function(list) {
			list = (typeof list == "string" ? list.split($.patterns.splitOnCommas) : list);
			return this.attributes = (this.attributes ? this.attributes.concat(list) : list);
		},


		/** Set an attribute on all of our elements. 
			If value is null or "", removes the attribute.
		*/
		setAttribute : function(key, value) {
			if (!this.elements) return value;
			
			if (value == null || value == "") {
				this.elements.removeAttr(key);
			} else {
				this.elements.attr(key, value);
			}
			return value;
		},

		/** If we have already been drawn, update our elements. */
		setClassName : function(value) {
			this.className = value;
			return this.setAttribute("class", this.getClassName() + this._getBaseClass());
		},

		/** Set class is an alias for setClassName. */
		setClass : function(value) {
			return this.setClassName(value);
		},
		
		/** Return the class name for this drawable.
			Use this to do some fancy algorithm for determining the class name.
		 */
		getClassName : function() {
			return (this.className || "");
		},
		
		_getBaseClass : function(value) {
			return " _"+this.__type__+ (this.baseClass ? " "+ this.baseClass : "");
		},

		/** If we have already been drawn, update our elements. */
		setId : function(value) {
			this.id = value;
			return this.setAttribute("id", value);
		},

		setTabIndex : function(value) {
			this.tabIndex = value;
			return this.setAttribute("tabIndex", value);
		},
		
		setAccessKey : function(value) {
			this.accessKey = value;
			return this.setAttribute("accessKey", value);
		},
				
		/** Update the innerHTML of all of our elements. */
		setStyle : function(value) {
			this.style = value;
			throw "Implement setStyles already";
		},

		/** Update the innerHTML of all of our elements. */
		setInnerHTML : function(value) {
			if (this.elements) 	this.elements.html(value);
			else				this.innerHTML = value;
			return value;
		},
		
		/** Map of { itemSelector : updateExpression } to apply on .update(), where:
	
				- itemSelector 	= sub-selector for this.elements to update
				- updateExpression 	= a string to interpolate with this object for the update value
			
			@example	updateMap : {
										// update all item div's value with drawable.name
										"div" 			: "name",
										
										// update css class of our outer divs with drawable.getClassName()
										"div|class" 	: "getClassName()",
	
										// update all spans with the drawable's model's name
										"span"  		: "model.name",
				
									}
			@note  Because your drawable.elements may themselves have sub-elements 
					from nested drawables, it is recommended that you make your selectors 
					very specific so you do not inadvertenly match item elements you don't want!
				
		 */
		updateMap : undefined,
		
		
		/** Update the view, eg: because its model has changed. 
			Also called at the end of draw().
			
			Default implementation goes through our updateMap, applying the values to the object.
			Your subclass may want to do something else entirely!
			
			@param {Object} [properties]  If defined, properties of our model that have changed.
										  Could be used to make update more efficient.
		*/
		update : function(properties) {
			if (this.updateMap) this.processUpdateMap(this.updateMap);
			return this;
		},
		
		
		/** Process an update map to update the elements. */
		processUpdateMap : function(map) {
			if (!this.elements) return;
			
			for (var key in map) {
				var expression = map[key];
				key = key.split("|");
				var selector = key[0],
					attribute = (key[1] || "html").toLowerCase(),
					elements,
					value
				;
				
				if (selector == "") {
					elements = this.elements;
				} else {
					elements = this.elements.find(selector);
				}
				
				if (!elements && !elements.length) continue;
				
				// get the value
				if (typeof expression == "string") {
					value = $.string.interpolate(expression, this);
				} else if (typeof expression == "function") {
					value = expression.apply(this);
				} else {
					value = expression;
				}
				
				// now, depending on the 'attribute', update the elements
				switch (attribute) {
					case "html"		: 	elements.html(value); break;
					case "text"		: 	elements.text(value); break;
	
					// class assignment (wipes out existing classes)
					case "class"	: 	elements.attr("class", value); break;
	
					// add or remove elements.class depending on 'truthy'ness of value
					//	-- class name is third part of match expression,
					//			 eg: "div|+class|selected"
					case "+class"	: 	var className = key[2];
										elements.toggleClass(className, !!value);
										break;
	
					// style property
					//	-- style property name is third part of match expression,
					//			eg:  "div|style|width"
					case "style"	: 	var styleProperty = key[2];
										elements.css(styleProperty, value);
										break;
	
					// for anything else, assume it is an element attribute (like "disabled")
					default			:	elements.attr(attribute, value);
				}
			}
			return this;
		},
		
		
		//
		//	showing/hiding the drawable
		//

		/** Are we currently visible? 
			One of true, false, "offscreen".
		*/
		visible : true,		
		
		/** Speed for show/hide animations.  
			One of:   null (no animation), "slow", "normal", "fast", "#" (# of milliseconds)
		 */
		animationSpeed : null,
		
		
		
		/** Show me. */
		show : function(newState) {
			if (newState == false) return this.hide();
			this.visible = true;
			if (this.elements) this.elements.show(this.animationSpeed);
			return this;
		},
		 
		 
		/** Hide me. */
		hide : function() {
			this.visible = false;
			if (this.elements) this.elements.hide(this.animationSpeed);
			return this;
		}, 
		
		
		//
		//	enable/disable semantics
		//
		//	Note: `this.disable()` will be called automatically if `drawable.enabled == false`
		//	 when initially drawn.
		//
		//	TODO: notify?
		//
		
		/** Are we currently enabled? */
		enabled : true,
		
	
		setEnabled : function(newState) {
			newState = newState != false;
			this.enable(newState);
			return newState;
		},

		/** Enable me.	*/
		enable : function(newState) {
			if (newState == false) return this.disable();
			this.enabled = true;
			if (this.elements) this.elements.removeAttr("disabled");
			this.notify("onEnabled");
			return this;
		},
		
		/** Disable me. */
		disable : function() {
			this.enabled = false;
			if (this.elements) this.elements.attr("disabled", "true");
			this.notify("onDisabled");
			return this;
		},


		//
		//	select/deselect semantics	 - todo: mixin?
		//
		
		/** Are we currently selected? */
		selected : undefined,
		
		setSelected : function(newState) {
			// TODO: tell our container we were selected?
			newState = newState != false;
			this.select(newState);
			return newState;
		},
	
		/** Select me.	*/
		select : function(newState) {
			if (newState == false) return this.deselect();
			this.selected = true;
			if (this.elements) this.elements.attr("selected", true);
			this.notify("onSelected");
			return this;
		},
		
		/** Deselect me. */
		deselect : function() {
			this.selected = false;
			if (this.elements) this.elements.removeAttr("selected");
			this.notify("onDeselected");
			return this;
		},
		
		
		//
		// message passing between items and containers
		//

		/** Call a method on the first of our containers who can execute it. */
		tellContainer : function(method) {
			var container = this.container;
			while (container) {
				if (container.passEvents != true) {
					if (typeof container[method] == "function") {
						args = $.args(arguments, 1);
						container[method].apply(container, args);
						return;
					}
				}
				container = container.container;
			}
			return this;
		}
		
		
	}// end prototype
});



//
//		End hidden from global scope: 
//
})(jQuery, jQuery.hope);
