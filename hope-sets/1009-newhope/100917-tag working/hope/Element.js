/*** Element object extensions ***/


Script.require("{{hope}}Function.js,{{hope}}Object.js,{{hope}}List.js", function(){
	Element.toRef = function(){ return "Element" };


	//
	//	global select/selectAll functions (equivalent of jQuery's $)
	//

	// return an ElementList which matches the selector windowly
	window.selectAll = function selectAll(selector, includeMe) {
		if (typeof selector !== "string") return selector;
		var root = (this === window ? document : this);
		// NOTE: ElementList is declared in ElementList.js
		var elements = new ElementList(root.querySelectorAll(selector));
		if (includeMe && root.matches && root.matches(selector)) elements.prepend(root);
		return elements;
	}

	// return a single Element which matches the selector windowly
	window.select = function select(selector, error) {
		if (typeof selector !== "string") return selector;
		var root = (this === window ? document : this);
		var it = root.querySelector(selector);
		if (!it && error) throw error;
		return it;
	}


	//
	//	ClassList abstraction from HTML5 (already implemented in FF)
	//	
	//	NOTE: the FF native classList will return
	//				`element.classList[<numberOutOfRange>] === ""`
	//		  which we can't do.  This implementation returns `undefined` instead.
	//
	if (!Element.prototype.hasOwnProperty("classList")) {
		var _push = Array.prototype.push,
			_indexOf = Array.prototype.indexOf,
			_join = Array.prototype.join,
			_splice = Array.prototype.splice,
			SPLIT_PATTERN = /\s+/,
			SAFE_PATTERN = /^[A-Za-z0-9_\-$]+$/
		;

		// reintialize the list in case something has changed
		function _reinit(list, cls) {
			list.length = 0;
			var classes = list.element.className;
			if (classes) _push.apply(list, classes.trim().split(SPLIT_PATTERN))
			if (cls && !SAFE_PATTERN.test(cls)) 
				throw TypeError("String contains an invalid character");
		}

		function _ClassList(element) {
			this.element = element;
			_reinit(this);
		}
		_ClassList.prototype = {
			length : 0,
			item : function(index) {
				_reinit(this);
				return this[index] || null;
			},
			contains : function(cls) {
				_reinit(this, cls);
				var index = _indexOf.call(this, cls);
				return index > -1;
			},
			add : function(cls, index) {
				if (index === undefined) {
					_reinit(this, cls);
					index = _indexOf.call(this, cls);
				}
				if (index == -1) {
					_push.call(this, cls);
					this.element.className = _join.call(this," ");
				}
			},
			remove : function(cls, index) {
				if (index === undefined) {
					_reinit(this, cls);
					index = _indexOf.call(this, cls);
				}
				if (index > -1) {
					_splice.call(this, index, 1);
					this.element.setAttribute("class", _join.call(this," "));
				}
			},
			toggle : function(cls, index) {
				if (index === undefined) {
					_reinit(this, cls);
					index = _indexOf.call(this, cls);
				}
				if (index === -1) 	this.add(cls, index);
				else				this.remove(cls, index);
			}
		}

		//hook it up as a getter on all elements
		hope.defineGetter(Element.prototype, "classList", 
			function() {
				if (!this._classList) this._classList = new _ClassList(this);
				return this._classList;
			}
		);
		
	}



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
		selectAll : window.selectAll,
		
		// return first descendant which matches selector
		select : window.select,
		
		
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
		// list of children which are elements, as an ElementList
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
		// css property checking/manipulation
		//
		
		// Return a computed style properties object for this element.
		//	As far as I can tell, you can re-use this CS object as long as the element exists.
//TODO: recast as a getter?  alias?
		getComputedStyle : function(prop) {
			// computedStyle objects SEEM TO BE cacheable per object
			var cs = (this._cs || (this._cs = window.getComputedStyle(this, null)));
			if (prop == null) return cs;
			return cs[prop];
		},
		
		
		// border radius
//TODO: normalize mozilla multiple radius values to same as W3C & WebKit
		radius : new Descriptor({
			get : function() {
				return this.getComputedStyle(CSS_PREFIX+"BorderRadius");
			},
		
			set : function(radius) {
				this.style[CSS_PREFIX+"BorderRadius"] = radius;
			}
		}),
		
		
		// background color
		bg : new Descriptor({
			get : function() {
				return this.getComputedStyle("backgroundColor");
			},

			set : function(bg) {
				this.style.backgroundColor = bg;
			}
		}),


		// css opacity
		opacity : new Descriptor({
			get : function() {
				return this.getComputedStyle("opacity");
			},

			set : function(opacity) {
				this.style.opacity = opacity;
			}
		}),
		


		// css transition
		transition : new Descriptor({
			get : function() {
				var cs = this.getComputedStyle();
				if (!cs["-webkit-transition-property"]) return "";
				return [
						cs["-webkit-transition-property"],
						cs["-webkit-transition-duration"],
						cs["-webkit-transition-timing-function"]
					].join(" ");
			},

			set : function(transition) {
				this.style.webkitTransition = transition;
			}
		}),
		

		//
		//	show/hide
		//
		
		visible : new Descriptor(
			function getVisible() {
				return (this.getAttribute("visible") != "no");
			},
			function setVisible(visible) {
				visible = (visible !== false && visible !== "no");
				var animation = this.animation;
				var animationFn = Element.getAnimation(this.animation, visible);
				if (animationFn) {
					animationFn.call(this, animation);
				} else {
					if (visible) {
						this.removeAttribute("visible");
					} else {
						this.setAttribute("visible", "no");
					}
				}
			}
		),
		
		//
		//	animation (requires CSS animations)
		//
		
		// @animation is the style of animation we run when showing/hiding
		animation : new Descriptor(
			function getAnimation() {
				return (this._animation || this.getAttribute("animation") || "none");
			},
			
			function setAnimation(style) {
				if (!style) style = null;
				
				if (style) 	this.setAttribute("animation", style);
				else		this.removeAttribute("animation");
				this._animation = style;
			}
		),
		

		// Actually run an animation.
		//	This version uses CSS animations,
		//	could easily be replaced with a timer-based solution easily.
		doAnimation : function(style, start, end) {
			// observe the 'transitionEnd' callback
			if (this._animationEndToken == null) {
				this._animationEndToken = 
					this.on("webkitTransitionEnd", function(event) {
						this.transition = "";
						if (this._onAnimationEnd) this._onAnimationEnd(event);
						delete this._onAnimationEnd;
					}, this);
			}

			var transition = Element.animationTransitions[style.toLowerCase()];
			this._onAnimationEnd = end;
			start.call(this, transition);
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
	//	Setting up animations
	//


	// animation styles we recognize
	Element.animationMap = {};
	Element.animationTransitions = {};
	
	Element.registerAnimation = function(options) {
		var map = Element.animationMap[options.name] = {};

		map.show = options.onShow;
		Element.prototype[options.showName] = options.onShow;

		map.hide = options.onHide;
		Element.prototype[options.hideName] = options.onHide;
	
		var transitions = options.transitions;
		for (var key in transitions) {
			Element.animationTransitions[key] = transitions[key];
		}
	}

	Element.getAnimation = function(name, show) {
		if (name.indexOf(" ") > -1) name = name.split(" ")[0];
		var map = Element.animationMap[name];
		if (!map) return;
		return map[show ? "show" : "hide"];
	}
	

	Element.registerAnimation({
		name 		: "fade",
		showName 	: "fadeIn",
		onShow 		: function fadeIn(style, callback) {
			this.doAnimation(style||"fade", 
				function(transition) {
					this.removeAttribute("visible");
					this.transition = "";
					this.opacity = 0;
					// NOTE: we have to get offsetHeight here cause the callback to fire
					var height = this.offsetHeight;
					this.transition = transition;
					this.opacity = 1;
				}, 
				function(event) {
					if (callback) callback.apply(this);
				}
			);
		},
		
		hideName : "fadeOut",
		onHide : function fadeOut(style, callback) {
			this.doAnimation(style||"fade", 
				function(transition) {
					this.transition = "";
					this.opacity = 1;
					this.removeAttribute("visible");
					// NOTE: we have to get offsetHeight here cause the callback to fire
					var height = this.offsetHeight;
					this.transition = transition;
					this.opacity = 0;			
				},
				function(event) {
					this.setAttribute("visible", "no");
					if (callback) callback.apply(this);
				}
			);
		},
		transitions : {
			"fade"			: "opacity .2s linear",
			"fade fast" 	: "opacity .1s linear",
			"fade medium"	: "opacity .3s linear",
			"fade slow" 	: "opacity .4s linear"
		}
	});

	Element.registerAnimation({
		name 		: "slide",
		showName 	: "slideDown",
		onShow 		: function slideDown(style, callback) {			
			var originalHeight = this.style.height;
			this.doAnimation(style||"slide", 
				function(transition) {
					this.removeAttribute("visible");
					// reset height to auto, to figure out how big we should be
					if (!originalHeight) this.style.height = "auto";
					// NOTE: we have to get offsetHeight here cause the callback to fire
					var height = this.offsetHeight;
					this.style.height = 0;
					this.transition = transition;
					this.style.height = height+"px";
				}, 
				function(event) {
					this.style.height = originalHeight;
					if (callback) callback.apply(this);
				}
			);
		},
		hideName : "slideUp",
		onHide : function slideUp(style, callback) {
			var originalHeight = this.style.height;
			this.doAnimation(style||"slide", 
				function(transition) {
					// set to current height, so we will actually animate
					// offsetHeight includes border!
					this.style.height = this.offsetHeight+"px";
					// NOTE: we have to get offsetHeight here cause the callback to fire
					var height = this.offsetHeight;
					this.transition = transition;
					this.style.height = 0;
				}, 
				function(event) {
					this.setAttribute("visible", "no");
					this.style.height = originalHeight;
					if (callback) callback.apply(this);
				}
			);
		},
		transitions : {
			"slide" 		: "height .2s linear",
			"slide fast" 	: "height .1s linear",
			"slide medium"	: "height .3s linear",
			"slide slow" 	: "height .4s linear"
		}
	});
	

	Element.registerAnimation({
		name 		: "reveal",
		showName 	: "revealRight",
		onShow 		: function revealRight(style, callback) {			
			var originalWidth = this.style.width;
			this.doAnimation(style||"reveal", 
				function(transition) {
					this.removeAttribute("visible");
					// reset width to auto, to figure out how big we should be
					if (!originalWidth) this.style.width = "auto";
					// NOTE: we have to get offsetWidth here cause the callback to fire
					var width = this.offsetWidth;
					this.style.width = 0;
					this.transition = transition;
					this.style.width = width+"px";
				}, 
				function(event) {
					this.style.width = originalWidth;
					if (callback) callback.apply(this);
				}
			);
		},
		hideName : "revealLeft",
		onHide : function revealLeft(style, callback) {
			var originalWidth = this.style.width;
			this.doAnimation(style||"reveal", 
				function(transition) {
					// set to current width, so we will actually animate
					// offsetWidth includes border!
					this.style.width = this.offsetWidth+"px";
					// NOTE: we have to get offsetWidth here cause the callback to fire
					var width = this.offsetWidth;
					this.transition = transition;
					this.style.width = 0;
				}, 
				function(event) {
					this.setAttribute("visible", "no");
					this.style.width = originalWidth;
					if (callback) callback.apply(this);
				}
			);
		},
		transitions : {
			"reveal" 		: "width .2s linear",
			"reveal fast" 	: "width .1s linear",
			"reveal medium"	: "width .3s linear",
			"reveal slow" 	: "width .4s linear"
		}
	});
	


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
	function _eventHandler(event) {
		// "this" is the element in question
		return _fireEvent(this, event, arguments);
	}
	
	function _fireEvent(element, event, args) {
//console.warn("_fireEvent",element, event, args);
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
		if (removedAny) _cleanupAfterRemove(element, eventType);
		return returnVal;
	}
	
	// cleanup the element after removing an event
	function _cleanupAfterRemove(element, eventType) {
		var data = element.data,
			methods = data[eventType]
		;
		if (methods.length === 0) {
			// remove the event listener
			element.removeEventListener(eventType, _eventHandler, false);

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
	
	function _observe(element, eventType, handler, scope, args, when) {
//console.warn(element, eventType, handler, scope, args, when);
		// if a single object argument, treat as a map of handlers
		if (arguments.length === 1) {
			var events = element;
			if (events.args) args = events.args;
			if (events.scope) scope = events.scope;
			if (events.when) when = events.when;
			var handlers = [];
			for (var type in events) {
				if (type === "scope" || type == "args" || type == "when") continue;
				_observe(when, element, type, events[type], scope, args);
			}
			return handlers;
		} else {
			if (!scope) scope = element;
			// create a single, bound function to observe
			//	preferring a bindByReference
			handler = hope.bind(scope, handler, args);
			if (when == "once") handler.__once__ = true;
			var data = element.data;
			if (!data[eventType]) {
				// actually attach the standard event listener
				element.addEventListener(eventType, _eventHandler, false);

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
			return _observe(this, eventType, handler, scope, $args(3))
		},
		
		// observe an event exactly once, then unregister
		once : function(eventType, handler, scope, arg1, arg2, etc) {
			return _observe(this, eventType, handler, scope, $args(3).append("once"))
		},

		// Remove an event handler or a list of event handlers, returned from element.on()
		un : function(eventType, boundHandler) {
			var handlers = this.data[eventType];
			if (handlers) {
				Observable._removeObservations(handlers, boundHandler);
				if (!handlers.length) _cleanupAfterRemove(this, eventType);
			}
			return this;
		},
		
		// Fire an event immediately.
		//	@event is an event object or the string name of an event to fire
		//	all arguments are passed to the observing methods
		fire : function(event) {
			return _fireEvent(this, event, $args());
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
