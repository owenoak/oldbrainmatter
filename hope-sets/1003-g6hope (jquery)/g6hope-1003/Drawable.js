//
//	Simple (abstract) Drawable class, WITHOUT items.
//	If you want to manage items, make a $.Container.
//
(function($) {	// begin hidden from global scope


new $.Class({
	reference : "$.Drawable",
	
	prototype : {
		id					: undefined,	// outer element name
		className			: undefined,	// outer CSS class (subclasses often have other classes in their template as well)
		attributes			: undefined,	// map of random attributes for our css class
		
		container			: undefined,	// pointer to our containing drawable
		eventHandlers		: undefined,	// if defined, names of event handlers for outer element
			
		$element			: undefined,	// our outer element, after drawing
		$parent				: undefined,	// pointer or global selector for our parent element
	
		template 			: "<div id='#{id}' class='#{className} #{_cssClass}' #{getAttributes()}></div>",
	
		animationStyle		: "none",		// "none", "grow", "slide", "fade"
		showDuration 		: "fast",
		hideDuration		: "fast",
			
		isDrawn				: false,		// if true, we have been drawn
		
		preferencePrefix 	: "",			// prefix for preference names

		_alwaysRedraw		: false,		// if true, we redraw the entire thing every time draw() is called
		_cssClass			: undefined,	// css class specified by the Drawable's Class, always applied
		
		
		//
		//	special setters
		//
		
		// return the current attributes as a string
		getAttributes : function() {
			if (!this.attributes) return "";
			var output = [];
			for (var key in this.attributes) {
				output.push(key + "=\"" + this.attributes[key] + "\"");
			}
			return output.join(" ");
		},
		
		// set an attribute name/value pair for our outer element
		//	both remembers the values and sets them on this.$element
		setAttribute : function(name, value) {
			if (!this.attributes) this.attributes = {};
			var old = this.attributes[name];
			this.attributes[name] = value;
			if (this.$element) this.$element.attr(name, value);
			return value;
		},
		
		// attributes are always additive
		//	NOTE: can't set attributes after drawing (?)
		setAttributes : function(attributes) {
			if (!attributes) return;
			for (var key in attributes) {
				this.setAttribute(key, attributes[key]);
			}
		},

		// set tooltip for out outer element
		setTooltip : function(tooltip) {
			if (!tooltip || tooltip == this.tooltip) return;
			
			//REFACTOR: make the tooltip safe somehow (use GTip routines?)
			this.setAttribute("tooltip", tooltip);
			return (this.tooltip = tooltip);
		},
		
		// set css styles of our outer element
		// NOTE: we don't hold on to our style (?)
		setStyle : function(style) {
			if (this.attributes && this.attributes.style == style) return;
			this.setAttribute("style",style);
			return style;
		},

		// set css class name of our outer element
		setClassName : function(className) {
			if (!className || className == this.className) return;
			
			// if we've been drawn
			if (this.$element) {
				var names;
				// if we had old names, remove them
				if (this.className) {
					names = this.className.split(" ");
					$.forEach(names, function(name) {
						this.$element.removeClassName(name);
					},this);
				}
				// add new names
				names = className.split(" ");
				$.forEach(names, function(name) {
					this.$element.addClassName(name);
				}, this);
			}
			return (this.className = className);
		},
		
		
		// Draw us:
		//	- notifies "onDraw"  BEFORE we actually draw
		//	- notified "onDrawn" AFTER we draw
		draw : function($parent) {
			this.notify("draw");
			if (this.$element == null || this._alwaysRedraw) {
				this.drawMainElement($parent);
				if (this.eventHandlers) this.setUpEvents(this, this.$element, this.eventHandlers);
			}
			this.isDrawn = true;
			this.notify("drawn");
			return this;
		},
		
		// draw our main element inside $parent
		//	default is to call this.getOuterHTML() and insert that into our $parent
		drawMainElement : function($parent) {
			// get our outerHTML and convert to an element
			var element = $(this.getOuterHtml());
			
			// if we already have an $element, replace it
			if (this.$element) {
				this.$element.replaceWith(element);
			} 
			// otherwise try to insert in our $parent
			else {
				var parent = this.get$parent() || $parent;
				if (parent) parent.append(element);
			}
			this.$element = element;
		},
		
		getOuterHtml : function() {
			var template = this.template;
			if ($.string.startsWith(template, "template:")) {
				template = $.templates[template.substr(9)];
			}
			if (template == null) throw TypeError(this+".draw(): .template '"+this.template+"' not found.");
			return $.expand(template, this);
		},
		
		show : function() {
			if (!this.isDrawn || this._alwaysRedraw) this.draw();
			var callback = this._showCallback 
						|| this._showCallback = $.bind(function(){this.notify("shown",this)},this);
			switch (this.animationStyle) {
				case "none"		: this.$element.show(callback); break;
				case "grow"		: this.$element.show(this.showDuration, callback); break;
				case "slide"	: this.$element.slideDown(this.showDuration, callback); break;
				case "fade"		: this.$element.fadeIn(this.showDuration, callback); break;
			}
		},
		
		hide : function() {
			if (!this.$element) return;
			var callback = this._hideCallback 
						|| this._hideCallback = $.bind(function(){this.notify("hidden",this)},this);
			switch (this.animationStyle) {
				case "none"		: this.$element.hide(callback); break;
				case "grow"		: this.$element.hide(this.hideDuration, callback); break;
				case "slide"	: this.$element.slideUp(this.hideDuration, callback); break;
				case "fade"		: this.$element.fadeOut(this.hideDuration, callback); break;
			}
		},
		
//REFACTOR:  work with an event
		showNear : function(element) {
			if (!this.isDrawn || this._redraw) this.draw();
			if (element) this.$element.positionNear(element);
			this.show($.SKIP);
		},

		setUpEvents : function(drawable, element, events) {
			if (typeof events === "string") events = events.split(",");
			var drawable = this;
			if (events instanceof Array) {
				$.forEach(events, function(eventName) {
					var handler = "on" + $.string.capitalize(eventName),
						method = function(event) {	drawable[handler](event) }
					;
					element[eventName.toLowerCase()]($.bind(method, drawable));
				});
			} else {
				$.each(events, function(eventName, handler) {
					if (typeof handler === "string") {
						var method = function(event) {drawable[handler](event)};
					} else {
						method = handler;
					}
					element[eventName.toLowerCase()]($.bind(method, drawable);
				});
			}
		},
		

		// this item was selected
		onSelected : function() {
			this.highlight();
		},
		
		// this item was deselected
		onDeselected : function() {
			this.dehighlight();
		},

		highlight : function() {
			if (this.$element) this.$element.addClass("HIGHLIGHT");
		},
		
		dehighlight : function() {
			if (this.$element) this.$element.removeClass("HIGHLIGHT");
		},

		//
		isEnabled : true,
		toggleEnabled : function(state) {
			if (state == null) state = !this.isEnabled;
			if (state) 	this.enable();
			else		this.disable();
		},
		
		enable : function() {
			if (this.isEnabled == false) {
				this.isEnabled = true;
				this.notify("enabled");
			}
		},

		disable : function() {
			if (this.isEnabled == true) {
				this.isEnabled = false;
				this.notify("disabled");
			}
		},
		
		onEnabled : function() {
			if (this.$element) this.$element.removeClass("DISABLED");
		},
		
		onDisabled : function() {
			if (this.$element) this.$element.addClass("DISABLED");
		},
		
		
		// get outerWidth of our main element
		getWidth : function() {
			if (!this.$element) return;
			return this.$element.outerWidth();
		},
		
		// get outerHeight of our main element
		getHeight : function() {
			if (!this.$element) return;
			return this.$element.outerHeight();
		},
		
				
		get$parent : function() {
			if (typeof this.$parent === "string") {
				this.$parent = $(this.$parent).first();
			}
			return this.$parent;
		},
		
		destroy : function() {
			// pull us out of the DOM
			if (this.$element) this.$element.detach();
			this.as($.Class, "destroy", arguments);
		},
		
		
		// preference getter/setters
		getPreferenceName : function(name) {
			var key = this.getIdentifier();
			return this.preferencePrefix + (key || "") + "-" + name;
		},
		
		// HMM: breaks naming conventions with get/set
		setPreference : function(name, value) {
			if (typeof value === "string") value = (value ? "true" : "false");
			//REFACTOR: to $.preference ?
			$.cookies.set(this.getPreferenceName(name), value);
		},
		
		getPreference : function(name) {
			//REFACTOR: to $.preference ?
			var value = $.cookies.get(this.getPreferenceName(name));
			if (value === "true") return true;
			if (value === "false") return false;
			return value;
		}
	}
});

})(jQuery);	// end hidden from global scope
