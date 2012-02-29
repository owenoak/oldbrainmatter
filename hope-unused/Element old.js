/*** Element object extensions ***/


Script.require("{{hope}}Function.js,{{hope}}Object.js,{{hope}}List.js", function(){
	Element.toRef = function(){ return "Element" };

	// return an ElementList which matches the selector windowly
	var selectAll = window.selectAll = function selectAll(selector) {
		// NOTE: ElementList is declared in ElementList.js
		if (typeof selector === "string") 
			return new ElementList(document.querySelectorAll(selector));
		return selector;
	}

	// return a single Element which matches the selector windowly
	var select = window.select = function select(selector, error) {
		var it = (typeof selector === "string" ? document.querySelector(selector) : selector);
		if (!it && error) throw error;
		return it;
	}

//HACK
return;

	//BROWSER SPECIFIC
	var CSS_PREFIX = (navigator.userAgent.indexOf("WebKit") > -1 ? "webkit" : "moz");
	
	Element.prototype.extend = hope.extendThis;
	Element.prototype.extendIf = hope.extendThisIf;
	Element.prototype.extendIf({

		//
		// css checking and subsetting
		//

		// return all descendants which match selector
		// if includeMe is true, includes the element in the potential matches (first)
		selectAll : function(selector, includeMe){
			var elements = new ElementList(this.querySelectorAll(selector));
			if (includeMe && this.matches(selector)) ElementList.prepend(this);
			return elements;
		},
		
		// return first descendant which matches selector
		select : function(selector, error) {
			var it = (typeof selector === "string" ? this.querySelector(selector) : selector);
			if (!it && error) throw error;
			return it;
		},
		
		matches : (Element.prototype.webkitMatchesSelector || Element.prototype.mozMatchesSelector),
		
		
		//
		//	add outerHTML emulation
		//
		outerHTML : new Descriptor({
			get : function(html) {
				var range = this.ownerDocument.createRange();
				range.setStartBefore(this);
				var df = range.createContextualFragment(html);
				this.parentNode.replaceChild(df, this);
			},
		
			set : function() {
				var clone = this.cloneNode(false);
				clone.innerHTML = this.innerHTML;
				
				// NOTE: this may have problems with TRs or TDs, etc 
				//		 which generate parent context elements (eg: TBODY) automatically.
				var div = document.createElement("div");
				div.appendChild(clone);
				return div.innerHTML;
			}
		}),
		
		
		//
		// children
		//
		elements : new Descriptor({
			get : function() {
				return new ElementList(this.children);
			},
		
			set : function() {
	console.warn("setting element.elements not yet defined");		
			}
		}),
		
		
		//
		//	class manipulation
		//

		// make element.class work just like .className
		"class" : new Descriptor({
			get : function() {
				return this.className;
			},
		
			set : function(cls) {
				this.className = cls;
			}
		}),

		// convenience function to get classes as a list
//TODO: HTML5 specifies classList -- see:  https://developer.mozilla.org/en/DOM/element.classList
		classes : new Descriptor({
			get : function() {
				var classes = this.className;
				if (!classes) return [];
				return (classes ? classes.split(/\s+/) : []);
			},
			
			set : function(classes) {
				if (classes == null) classes == "";
				if (classes.join) classes = classes.join(" ");
				if (this.className !== classes) this.className = classes;
			}
		}),
		
		hasClass : function(cls) {
			return this.classes.contains(cls);
		},
		
		addClass : function(cls) {
			this.classes = this.classes.addUnique(cls);
			return this;
		},

		removeClass : function(cls) {
			this.classes = this.classes.remove(cls);
			return this;
		},
		
		toggleClass : function(cls, turnOn) {
			if (turnOn == true || !this.hasClass(cls)) 	return this.addClass(cls);
			else										return this.removeClass(cls);
		},

		// turn a set of classes on with "+" and off with "-"
		switchClasses : function(classes) {
			classes = classes.trim().split(/[ ,]+/);
			var i = -1, cls;
			while (cls = classes[++i]) {
//TODO: redo as a single set
				var op = cls.charAt(0);
				this.toggleClass(cls.substr(1), (op != "-"));
			}
			return this;
		},
		
		
		//
		// css property checking/manipulation
		//
		
		// return a computed style property for this element
		_getStyle : function(prop) {
			// computedStyle objects SEEM TO BE cacheable per object
			var cs = (this._cs || (this._cs = window.getComputedStyle(this, null)));
			if (prop == null) return cs;
			return cs[prop];
		},
		
		
		// border radius
		radius : new Descriptor({
			get : function() {
				return this._getStyle(CSS_PREFIX+"BorderRadius");
			},
		
			set : function(radius) {
				this.style[CSS_PREFIX+"BorderRadius"] = radius;
			}
		}),
		
		
		// background color
		bg : new Descriptor({
			get : function() {
				return this._getStyle("backgroundColor");
			},
		
			set : function(bg) {
				this.style.backgroundColor = bg;
			}
		}),
		
		
		//
		//	show/hide
		//
		show : function() {
			if (this.style.display == "none") {
console.warn("1");
				this.style.display = "block";
			} else {
//HACK: set _startDisplay if your normal display is anything other than "block" (??)
				this.style.display = this._startDisplay || "block";
			}
		},
		
		hide : function() {
			this.style.display = "none";
		}
	});// end extendIf


	//
	//	Data access -- efficiently adding external stuff to an element
	//
	//	- Stick complex stuff (args, arrays, fns) on element.data rather than on element directly
	//	- ALWAYS cache element.data in your function for efficiency
	//

//TODO: observe DOM node deleted to clear data?
	
	var EVENT_DATA = window.EVENT_DATA = {};
	var EVENT_ID = window.EVENT_ID = 1;
	
	//
	//	data access -- for adding external stuff to an element
	//
	hope.defineGetter(Element.prototype, "data", 
		function() {
			if (!this.dataId) {
				this.dataId = EVENT_ID++;
				this.setAttribute("_data", this.dataId);
				EVENT_DATA[this.dataId] = {};
			}
			return EVENT_DATA[this.dataId];
		}
	);// end extendIf
		



	//
	//	observation and event handling
	//


	// give IE addEventListener methods
	if (!Element.prototype.addEventListener) {
		hope.extend(Element.prototype, {
			addEventListener : function(event, callback) {
				this.attachEvent(event, callback);
			},
			removeEventListener : function(event, callback) {
				this.detachEvent(event, callback);
			}
		});
	}


	// this single, static method is what's actually stuck on the element as an event handlers
	function $eventHandler(event) {
		// "this" is the element in question
		return $fireEvent(this, event, arguments);
	}
	
	function $fireEvent(element, event, args) {
		var eventType = (typeof event === "string" ? event : event.type);
		var methods = element.data[eventType];
		if (!methods) return true;

		var i = -1, method, returnVal = true, removedAny;
		while (method = methods[++i]) {
			returnVal = method.apply(element, args) & returnVal;
			// if method is signalled to fire only once, remove it from the list
			if (method.__once__) {
				removedAny = true;
				methods.splice(i--, 1);
			}
		}
		if (removedAny) $cleanupAfterRemove(element, eventType);
		return returnVal;
	}
	
	// cleanup the element after removing an event
	function $cleanupAfterRemove(element, eventType) {
		var data = element.data,
			methods = data[eventType]
		;
		if (methods.length === 0) {
			// remove the event listener
			element.removeEventListener(eventType, $eventHandler, false);

			// remove the list of events from our data object
			delete data[eventType];

			// remove the event from the list of events
			data.events = (data.events || "").split(" ").remove(eventType).join(" ");
			// and update the _events attribute
			if (!data.events) {
				delete data.events;
				element.removeAttribute("_events");
			} else {
				element.setAttribute("_events", data.events);
			}
		}
	
	}
	
	function $observe(element, eventType, handler, scope, args, when) {
		// if a single object argument, treat as a map of handlers
		if (typeof eventType == "object") {
			var events = eventType;
			if (events.args) args = events.args;
			if (events.scope) scope = events.scope;
			if (events.when) when = events.when;
			var handlers = [];
			for (var type in events) {
				if (type === "scope" || type == "args" || type == "when") continue;
				$observe(when, element, type, events[type], scope, args);
			}
			return handlers;
		} else {
			if (!scope) scope = element;
			// create a single, bound function to observe
			//	preferring a bindByReference
			handler = Observable.bind(scope, handler, args);
			if (when == "once") handler.__once__ = true;

			var data = element.data;
			if (!data[eventType]) {
				// actually attach the standard event listener
				element.addEventListener(eventType, $eventHandler, false);

				// update the list of events
				data[eventType] = [];
				data.events = (data.events ? data.events + " " + eventType : eventType);
				
				// and stick the list of events on the element for debugging
				element.setAttribute("_events", data.events);
			}
			
			// add to the list of events
			data[eventType].push(handler);
			return handler;
		}
	}

	hope.extend(Element.prototype, {
		// Attach a single event handler, or a map of event handlers.
		on : function(eventType, handler, scope, arg1, arg2, etc) {
			return $observe(this, eventType, handler, scope, $args(3))
		},
		
		// observe an event exactly once, then unregister
		once : function(eventType, handler, scope, arg1, arg2, etc) {
			return $observe(this, eventType, handler, scope, $args(3).prepend("once"))
		},

		// Remove an event handler or a list of event handlers, returned from element.on()
		un : function(eventType, boundHandler) {
			var handlers = this.data[eventType];
			Observable._removeObservations(handlers, boundHandler);
			if (!handlers.length) $cleanupAfterRemove(this, eventType);
			return this;
		},
		
		// Fire an event immediately.
		//	@event is an event object or the string name of an event to fire
		//	all arguments are passed to the observing methods
		fire : function(event) {
			return $fireEvent(this, event, $args());
		},
		
		// Fire an event 'soon'.
		//	@event is an event object or the string name of an event to fire
		//	@args are arguments to pass to the observers
		soon : function(delay, event) {
			if (typeof delay === "number") {
				return Observable.soon(delay, this, "fire", $args(1));
			} else {
				return Observable.soon(0, this, "fire", $args(0));
			}
		}

	});


	//
	//	static methods on Element
	//
	hope.extendIf(Element, {

		// create an element with specific attributes and styles
		create : function(tag, attrs, styles) {
			var it = document.createElement(tag);
			if (attrs) {
				for (var key in attrs) {
					it[key] = it.setAttribute(attrs[key]);
				}
			}
			if (styles) {
				for (var key in styles) {
					it.style[key] = styles[key];
				}
			}
			return it;
		},
		
		
		// given some @html, return the .elements it represents
		fromHTML : function(html) {
			var div = document.createElement("div");
			div.innerHTML = html;
			return div.elements;
		}
	
	});

Script.loaded("{{hope}}Element.js");
});// end Script.require()
