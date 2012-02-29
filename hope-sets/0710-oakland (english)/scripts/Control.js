	/***

	* TODO:
		- control handling it's own child expansion is kinda squirrely -- move to template?
		- default template that just shows contents?
		- some generic way to get innerHTML for template (better than what we're doing for button)
		- make it so the prototype for a class has id Class_prototype (ideally without bumping up count)
		- "action" class (for MenuItems, ToolbarButtons, etc?)
		- forget "afterdraw" and such and move to super() calls
		- forget "init" in place of super?
		- do we even need to do individual item event hookup at all?  
			- Couldn't we as easily have a single top-level event handler that does the right thing?
			- really good for "edit mode" to work this way...
		- "flags" to "class", as in "setClass" ? english:  toggle class hasTitle with this.title
		- "parts" in english?
		- menus
			- how to get rid of margin (?) around button?
			- enableIf/disable for menu items
			- show near event (get code from canvas?)
			- show large # of items w/scroll
			- make sure we show w/in screen bounds (menu.popup() ?)
			- bug: mousedown and drag hilites other items
		- PartViewer
			- how to populate?
			- change item set
			- add items in the middle (?)
			- checks
			- multi-select
				(how to represent multi-select list in a Select?)
				- different mousedown/etc behavior for multiselect
				- different select behavior for multiselect
			- header (subclass?)
			- resizable columns
			- very large list support
			- input/etc support (editor on hover)
			- keyboard focus
		- select
			- show menu w/selected over item
		- register global mouseup handler for up while out
		- put 'exportClass' on outer items?
		- way to put children in a particular place in the template, eg: TabButton closer?
		- Button classes have a lot of css logic that's not trickling down to subclasses
		- make border instantiation semantics part of Control? 
			- have "border" be part of the template, not part of the widget ?
					-- nice to override border in widget def?
			- put border name on outer class, "Border" on actual border div, "BorderSpacing" on inner node
				- eg:  outer: "Panel", border container: "Border", inner node "BorderSpacing"
				- stretchborder can then do away with ${id}'s with different css?  .Panel .Border ._top_left ??
			- auto-write CSS for borders in skin?  do this when setting up classes?
			- if there is a border, put its _spacing class on the contents node automatically?
			- CanvasBorder? (see below)
			- automatically do z-index?
		- convert to leave the original nodes in place rather than replacing with a new node
						+ should be faster
						+ all attribs on outer node left in place
						- x-platform problems?
			- on draw, check if _rendered element with our id is present, just hook up if so 
		- create widgets programmatically?
			- parent?  parentId?
		- get <$template> thingers to instantiate with same semantics as normal expansion
			- create a node for the template with proper id, etc, set the inner html
		- get inserting trs and tds to work in parse template
		- get adding children later to work
		- enableIf/showIf
		- requireIf for data controls
		- nested templates in expansion 
			- property of the template  "checkForSubTemplates" ?
			- check when making template expander, eg: TabButton in TabPanel
			- how do those get attached?  are they "children"? (I think NO)
			- attribute on template to check for nested?
		- pass parameters to handleEvent (as array)
		- access key
		- focus/tabIndex ?  prettier focus border?
		- have an easy way to get contents, eg for Checkbox where we want contents to be the title?
			- I like the "${contents}" or "${innerHTML}" syntax in object property def
		- have a global capture handler rather than installing event handlers on every control?
		- hints & hovers
		- right-click
		- getAttributes() is case IN-sensitive because moz normalizes attribute names :-(
			- build reverse case map based on class.properties
		- redraw ???
		- CanvasBorder 	
			- takes a single image and some params, splits for a 3 or 9 border (including gradient support?)
			- Skin: xml markup for a single graphic which defines a number of CanvasBorders w/in it

***/

function Control(props1, props2, etc) {
	this._flags = {};
	this.mixin.apply(this, arguments);

	// make sure all controls have a reasonably unique id (pass one in as prop to override)
	this.generateId();
	Control.register(this);
	this.init();
}
Control._constructorDefaults = {
	initClass : function() {
		hope.Template.registerTemplateTag(this.Class);
	}
}
Control.SKIP_UPDATE = false;		// some routines automatically update the display when called,
									//	pass Control.SKIP_UPDATE to them to avoid this
									//	(but make sure you update yourself later through some other means)

hope.Class.createSubclass(Control, {
	id 				: null,			// id of this control, will auto-generate if not specified
									// things are not well defined if this is not unique
									// note: this is currently both the id of the control and the element it will draw in

	autodraw		: true,			// if true, we automatically draw when our parents draw
									//	set to false for things whose drawing is managed in a non-standard way
	disabled		: false,		// if false, all event support in us is off
	"class"			: "",			// class name applied to the element (along with anything on the template)
	style			: "",			// style applied to the element (along with anything on the template)
	
	showIf			: null,			// bit of script to eval to decide whether to show this control or not
	enableIf		: null,			// bit of script to eval to decide whether to enable this control or not
	
	template		: null,			// id of the html template used to generate our HTML

	parent			: null,			// parent in our message heirarchy, not in the dom
	
	canSelectText	: true,			// if true, text is selectable inside the element (note: parent chain has an effect on this as well...)
	domNode 		: null,				// pointer to our dom element.  it has element._controller back to us.
	
	_flags 			: null,			// an object which indicates transitory visual or interactivity state, and are generally specific to subclasses
									//	eg: _flags.hover means the mouse is over us, _flags.down means the mouse is down in us, etc
									//  ALWAYS use control.setFlag() to set flags, as it will add CSS classes for each flag that is defined
									//  NOTE: setting a flag to "", 0, false or null will be considered false, anything else (including undefined) is effectively true

	handleEvents	: false,		// if true, DOM events on nodes created by this items' template are sent to us
	
	init : function() {},
	
	initBorder : function() {
		if (this._border || !this.border) return;
		if (typeof this.border == "string") {
			var border = Border.getBorder(this.border);
			if (!border) {
				this._warn(arguments, "Border '"+this.border+"' is not defined.  Maybe you forgot to load the <skin>/<skin>.js file?");
				this.border = null;
			} else {
				this._border = border;
			}
		} else if (this.border._isABorder) {
			this._border = this.border;
		} else {
			this._warn(arguments, "Border '"+this.border+"' not understood.");
		}
	},
	
	toString : function() {
		return [this.constructor.Class + "#" + this.id].join("");
	},

	//
	//	parenting semantics
	//

	addChild : function(child, addToChildrenArray) {
		// TODO:	- move our domElement into the new parent
		//			- fix up the message hierarchy
		if (addToChildrenArray != false) {
			if (!this.children) this.children = [];
			if (this.children.indexOf(child) != -1) return;
			this.children.push(child);
		}
		
		child.parent = this;
		
		if (this._drawn) {
			if (!child._drawn) {
				child.draw();
			} else {
				this.domNode.appendChild(child.domNode);
			}
		}
		return child;
	},
	
	
	// TODO: remove domElement?
	removeChild : function(child) {
		if (this.domNode && child.domNode) {
			this.domNode.removeChild(child.domNode);
		}
		hope.removeItem(this.children, child);
		delete child.parent;
	},
	
	
	//
	//	drawing
	//

	// NOTE: assumes domNode is a template node from the page, which will be replaced with our template contents
	draw : function() {
		if (this._drawn) return;

		var domNode = this.domNode;
		// if the item specifies a "src" and "autoLoad", replace the contents of the node with whatever's at that URL
		if (domNode && ((this.src && this.autoLoad) || domNode._templateChildren)) {
			if (this.src) {
				this._srcLocation = new hope.Location(this.src);		// TODO: hold on to it?
				domNode.innerHTML = this._srcLocation.load();
				domNode._templateChildren = hope.Template.getTemplateNodes(domNode);
			}
			this.createChildren(domNode._templateChildren);
		}

		var template = this.getTemplate();
		if (template) {
			// initialize our border
			this.initBorder();
	
			if (this.beforeDraw) this.beforeDraw(domNode, template);
	
			var newNodeProps = {	
					id		  : this.id,
					className : this.getOuterClassName(template),
					style	  : this.style
			};

			var parent = hope.byId(this.parentNode) || domNode;
			if (parent == null && this.parent) {
				parent = this.parent.contentsNode || this.parent.domNode;
			}
			if (parent == null) parent = hope.byTag("BODY")[0];
			if (domNode) {
				var outerNode = template.expandFromSourceNode(this, parent, newNodeProps);
			} else {
				var outerNode = template.expand(this, parent, newNodeProps);
			}
			this.domNode = outerNode;
		} else {
//TODO: reparent?  to what?		
		}

		if (this.children) {
			this.drawChildren(this.children);
		}

		// todo: hook up events if any set on original element?
		if (this.handleEvents) this._hookUpEvents();
		
		// set up our visual state
		this.setFlag();
		this._drawn = true;
	},

	getTemplateHtml : function(arg1, arg2, etc) {
		var template = this.getTemplate();
		if (!template) return this._warn(arguments, "No template found for "+this.Class);
		var args = hope.sliceArgs(arguments);
		args.unshift(this);
		return template.expandToHtml.apply(template, args);	
	},

	setContents : function(html) {
		if (this.contentsNode) this.contentsNode.innerHTML = html;
		else if (this.domNode) this.domNode.innerHTML = html;
	},

	getOuterClassName : function(template) {
		if (template == null) template = this.getTemplate();
		if (template == null) return "";
		return [
					(this.canSelectText != true ? "disableSelection " : ""),
					(this._border ? "BorderContainer " : ""),
					(template["class"] ? template["class"] + " " : ""),
					(template["className"] ? template["className"] + " " : ""),
					this.Class,
					(this["class"] ? " " + this["class"] : ""),
					" normal"
				].join("");
	},

	createChildren : function(kidElements, addToChildrenArray) {
		for (var i = 0, kidElement; kidElement = kidElements[i++]; ) {
// TODO: check if kid is already set up and skip if so
			var kid = this.createChild(kidElement.tagName, hope.getNormalizedAttributes(kidElement), addToChildrenArray);
			if (!kid) debugger;
			kid.domNode = kidElement;
		}
	},

	// create a child of a given type (class) and set its parent to us
	// NOTE: this looks in the parent._childAttributes hash, if present, and sets child attributes as directed there
	// TODO: make the _childAttributes thing case insensitive
	createChild : function(type, attributes, addToChildrenArray) {
		var constructor = hope.getConstructor(type);	// ???
		if (!constructor) {
			console.error(this._error(arguments, "Couldn't find constructor for tag ", type," -- skipping"));
			return;
		}
		// get any childAttributes we want to pass on to the child
		var childAttributes = null;
		if (this._childAttributes) {
			childAttributes = this._childAttributes[type] || this._childAttributes["*"];
		}
		var kid = new constructor({_srcLocation:this._srcLocation}, childAttributes, attributes);
		this.addChild(kid, addToChildrenArray);	
		return kid;
	},

	drawChildren : function() {
		var children = this.children;
		for (var i = 0, kid; kid = children[i]; i++) {
			if (kid.autodraw && !kid._drawn) kid.draw();
		}
	},

	getTemplate : function() {
		return hope.Template.byId(this.template);	
	},
	
	// return a sub-part of the HTML elements for this item
	// convention is that the part will have 	id='${id}_<partName>'
	getPart : function(partName) {
		if (!partName) return this.domNode;
		return hope.byId(this.id + "_" + partName);
	},
	
	setPart : function(partName, newHTML) {
		var part = this.getPart(partName);
		if (part) part.innerHTML = newHTML;
	},
	
	setPartClass : function(partName, className) {
		var part = this.getPart(partName);
		if (part) part.className = className;
	},
	
	mixinToPart : function(partName, props) {
		var part = this.getPart(partName);
		if (part) hope.mixinToNode(part, props);
	},
	
	showPart : function(partName, state) {
		hope.show(this.getPart(partName), state);
	},
	
	hidePart : function(partName) {
		hope.show(this.getPart(partName), false);
	},
	

	//
	//	visual state semantics, including show/hide, enable/disable, etc
	//
	
	setFlag : function(flag, newState) {
		if (flag) {
			if (typeof newState == "undefined" || Boolean(newState)) {
				this._flags[flag] = newState;
				hope.addClass(this.domNode, flag);
			} else {
				delete this._flags[flag];
				hope.removeClass(this.domNode, flag);
			}
		} else if (this.domNode) {
			for (var prop in this._flags) {
				hope.addClass(this.domNode, prop);
			}
		}
		return this;
	},
	
	removeFlag : function(flag, newState) {
		return this.setFlag(flag, false);
	},
	
	flagIsSet : function(flag) {
		return this._flags[flag] !== undefined;
	},
	
	
	isShown : function() {
		return this.flagIsNotSetForAllAncestors("hidden");	
	},
	show : function(newState) {
		newState = (newState != false);
		
		if (newState) {
			if (!this._drawn) this.draw();
			if (this.domNode) this.domNode.style.display = '';
		} else {
			if (this.domNode) this.domNode.style.display = 'none';
		}
	},
	hide : function(newState) {
		this.setFlag("hover", false);
		this.show(false);
	},
	
	isEnabled : function() {
		return this.flagIsNotSetForAllAncestors("disabled");
	},
	enable : function(newState) {
		newState = (newState != false);
		var oldState = !this.disabled;
		// only update if there actually was a change, since this causes a redraw
		if (oldState != newState) {
			if (this.domNode) this.domNode.disabled = !newState;
			this.setFlag("disabled", !newState);
			this.forEachChild("enable", newState);
		}
	},
	disable : function() {
		this.setFlag("hover", false);
		this.enable(false);
	},
	
	
	// made up event handling
	//	handle events that we make up
	//	NOTE: many methods can be called on this event using this pattern
	addEventListener : hope.addEventListener,
	removeEventListener : hope.removeEventListener,
	fireEvent : hope.fireEvent,	
	
	//
	//	DOM event handling
	//

	// this is only called if we're enabled (I think)
	onmouseover : function(target, domEvent) {
		return this.setFlag("hover");
	},

	onmouseout : function(target, domEvent) {
		return this.setFlag("hover", false);
	},
	
	onmousedown : function(target, domEvent) {
		return this.setFlag("down", true);
	},

	onmouseup : function(target, domEvent) {
		return this.setFlag("down", false);
	},

	
	handleBrowserEvent : function(domEvent) {
		// only process events if we're enabled (includes enable state of our ancestors)
		if (!this.isEnabled()) return true;
		var eventName = "on" + domEvent.type; 
		return this.handleEvent(eventName, this, domEvent);
	},

	// TODO: pass parameters!!
	// handle an event, either by processing it ourselves or passing it on to our parent (if we have one)
	// NOTE: domEvent and domTarget may not be defined...
	handleEvent : function(eventName, target, domEvent) {
		// TODO: convert functions
		if (this[eventName] && typeof this[eventName] == "string") {
			try {
				this[eventName] = hope.makeFunction(this[eventName]);
			} catch (e) {
				this._warn("error creating function for property '", eventName,"': "+e.getMessage());
				delete this[eventName];
			}
		}
		if (this[eventName]) {
			if (this[eventName](target, domEvent) != true) return hope.stopEvent(domEvent);
		} else {
			if (this.passEvent(eventName, target, domEvent) != true) return hope.stopEvent(domEvent);
		}
	},
	
	passEvent : function(eventName, target, domEvent) {
		if (this.parent && this.parent._isAControl) 
			return this.parent.handleEvent(eventName, target, domEvent);
		return true;
	},


	// if a sub-part has a handler for the event, call it
	// converts string handlers to functions
	// the method is called on the part as
	//		part.method(this, arg1, arg2, etc)
	handlePartEvent : function(eventName, part, arg1, arg2, etc) {
		var name = "on"+eventName;
		if (part[name]) {
			if (typeof part[name] == "string") {
				part[name] = hope.makeFunction(part[name]);
			}
			var args = hope.sliceArgs(arguments, 1);
			args[0] = this;
			part[name].apply(part, args);
		}
	},

	
	// list of events to hook up for instances of this class
	_eventsToHookUp : ["onmouseover","onmousemove","onmouseout","onmousedown","onmouseup","onclick","ondblclick"],

	// method that is placed on dom elements to point them back to our "handleBrowserEvent" method
	// NOTE:  when this is called, "this" is the DOM element that got the event, 
	///			and this._controller is a pointer to this object
	_domEventDispatcher : function(event) {
		return this._controller.handleBrowserEvent(event||window.event, this);
	},

	// TODO: way to un-hook this?  memory leaks?
	// TODO: don't clobber existing events on the element?
	// TODO: why pass an event in here?  or take a controller and make this completely generic
	_hookUpEvents : function(element, controller) {
		element = element || this.domNode;
		controller = controller || this;
		// if no element or the element has been hooked up already to us, forget it
		if (!element || element._controller == controller) return;

		// tell the element about us
		element._controller = controller;

		// now hook our (static) dispatcher event up for each event in the list
		for (var i = 0, event; event = this._eventsToHookUp[i++]; ) {
			element[event] = this._domEventDispatcher;
		}
	},
	
	_removeEvents : function(element) {
		element = element || this.domNode;
		// only unhook for a valid element for whom we are the controller
		if (!element || element._controller != this) return;
		for (var i = 0, event; event = this._eventsToHookUp[i++]; ) {
			delete element[event];
		}		
	},
	
	//
	//	ancestors and children
	// 	NOTE: "ancestor chain" or "first ancestor" in the below includes this object (???)
	//
	
	// TODO:  forEachAncestor()  forEachChild()


	// method can be a function, or the name of a method to call on each child
	forEachChild : function(method, arg1, arg2, etc) {
		if (!this.children || this.children.length == 0) return;
		var args = hope.sliceArgs(arguments, 1),
			isString = typeof method == "string",
			output = []
		;
		for (var i = 0, child; child = this.children[i++]; ) {
			if (isString) {
				output.push((typeof child[method] == "function") ? child[method].apply(child, args) : null);
			} else {
				output.push(method.apply(child, args));
			}
		}
		return output;
	},

	// method can be a function, or the name of a method to call on each ancestor
	// NOTE: ancestor here is strictly parents, not us!
	forEachAncestor : function(method, arg1, arg2, etc) {
		var parent = this.parent;
		var args = hope.sliceArgs(arguments, 1),
			isString = typeof method == "string",
			output = []
		;
		while (parent) {
			if (isString) {
				output.push((typeof parent[method] == "function") ? parent[method].apply(parent, args) : null);
			} else {
				output.push(method.apply(parent, args));
			}
			parent = parent.parent;
		}
		return output;
	},


	// return the first ancestor where ancestor[prop] == value
	// TODO: this is pretty verbose...  tighten up?
	firstAncestorWhere : function(what, value) {
		var parent = this,
			isString = typeof what == "string",
			isUndefined = typeof value == "undefined",
			parentValue
		;

		while (parent) {
			if (isString) {
				parentValue = parent[what];
			} else {
				parentValue = what.apply(parent);			
			}
			if (isUndefined && typeof parentValue == "undefined") return parent;
			if (value == parentValue) return parent;
			parent = parent.parent;
		}
	},
	
	// REMOVEME?
	isTrueForAllAncestors : function(property, value) {
		value = typeof value == "undefined" ? true : value;
		var parent = this;
		while (parent) {
			if (parent[property] != value) return false;
			parent = parent.parent;
		}
		return true;	
	},
	
	flagIsSetForAllAncestors : function(flag) {
		var parent = this;
		while (parent) {
			if (typeof parent._flags[flag] == "undefined") return false;
			parent = parent.parent;
		}
		return true;	
	},
	
	flagIsNotSetForAllAncestors : function(flag) {
		var parent = this;
		while (parent) {
			if (typeof parent._flags[flag] != "undefined") return false;
			parent = parent.parent;
		}
		return true;	
	}



});


// static methods for all controls
hope.mixin(Control, {
	_byId : {},					// registry of all controls that have been created
								// do Control.byId(<id>) to get a particular control
	_byTag : {},				// registry of all controls of a given type
								// do Control.byTag(<className>) to get all controls of that type

	// register a control
	register: function(control) {
		this._byId[control.id] = control;
		var type = control.Class.toLowerCase();
		if (!this._byTag[type]) this._byTag[type] = [];
		this._byTag[type].push(control);
	},

	byId : function(id) {
		return this._byId[id];
	},
	
	byTag : function(type) {
		return this._byTag[type.toLowerCase()];
	},
	
	byType : function(type) {
		return this._byTag[type.toLowerCase()];
	}

});

hope.ClassParser.loadClassFile("${hope}/controls.classes");
