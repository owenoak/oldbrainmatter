/*** ElementAdapter adapter ***/
Script.require("{{hope}}Element.js", function(){


//	TODO:  	- note that this doesn't work for "<element>"
//			- have way that constructor/adapter can indicate to recurse or not?
//			- or is it the responsibility of the adapter to recurse?
//



// call as:
//	- to bind to an existing element:
//		ElementAdapter(sourceElement, properties)
//
//	- to create a new element of this type
//		new ElementAdapter(properties)
//		

function _makeElementAdapterConstructor(id, tag) {
	var constructor;
	var fname = id.replace(".","_");
	if (!tag) {
		tag = (fname.charAt(0) === "$" ? fname.substr(1) : fname).toLowerCase();
	}

	constructor = function Adapter() {
		var element = document.createElement(tag);
		constructor.adapt.call(this, element);
		return element;	
	}

	// have the constructor remember the tag name (in all lower case)
	constructor.tag = tag;

	return constructor;
}

new Class("ElementAdapter", {
	properties : {

		constructor : _makeElementAdapterConstructor("ElementAdapter", "element"),

		// initialize the element -- called when first attach()ed to an element
		//	@this is the element
		init : function() {
			this.initParts();
			this.initBindings();
			this.initChildren();
		},
		
		// Set up our map of "parts" -- children who we link to via the 'part' attribute.
		//	By default this is all children at our init() time with a 'part' attribute.
		//	To restrict the list of children, set a 'partId' on this element
		//		and have the parts of children you want to attach start with '<partId>:'.
		initParts : function() {
			var parts = this.parts = _getChildMap(this, "part", this.getAttribute("partId"));
			if (parts) {
				for (var key in parts) {
					parts[key].controller = this;
				}
			}
		},


		// return the array of children who have a 'bindto' attribute
		//	we will fill those with data at the appropriate time
		initBindings : function() {
			this.bindings = this.selectAll("[bindTo]");
		},
		
		
		// initialize our children by attaching them
		initChildren : function() {
			var children = this.children, child, i = -1;
			if (!children || !children.length) return;
			while (child = children[++i]) {
				ElementAdapter.attach(child);
			}
		},
		
		//
		// @group: attribute manipulation
		//			TODO: make this 
		//
		get : function(attr){
			this.getAttribute(attr);
			return this;
		},
		set : function(attr,value){
			this.setAttribute(attr,value);
			return this;
		},
		clear : function(attr){
			this.clearAttribute(attr);
			return this;
		},
		toggle : function(attr,value) {
			var current = this.getAttribute(attr);
			if (current === value) 	this.removeAttribute(attr);
			else					this.setAttribute(attr,value);
			return this;
		},
		
		//
		// @group: style getting/setting
		//
		//TODO: map of numeric style props
		//TODO: map of moz- or webkit-etc specific style props
		getStyle : function(style){},
		setStyle : function(style,value){},
		setStyles : function(styles){
			if (styles)	for (key in styles) this.setStyle(key,style[key]);
			return this
		}
	},//end properties
	"static" : {

		// Adapt an existing element as an instance of this class.
		// NOTE: this will NOT work in IE (because of setProto).
		adapt : function(element) {
			if (!element || element.Class) return;
			var constructor = this;
debugger;			
			// manually set the prototype up to point to ElementAdapter.prototype
			hope.setProto(element, constructor.prototype);
			element.Class = element.constructor = constructor;

			// call init and return result if defined
			element.init();	
			
			// return true that we SHOULD recurse for children
			return true;
		},
		
		bind : function(element, recurse) {
			if (typeof element === "string") element = select(element);
			recurse = (recurse != false);
			if (!element) return;

			// skip elements which have already been bound
			if (!element.Class) {
				var adapter = ElementAdapter.getAdapter(element);
				if (adapter) {
console.warn("adapting ",element, adapter);
					adapter.adapt(element);
				}
			}
			if (!recurse) return;
			
			var children = element.elements;
			if (children) {
				var child, i=-1;
				while (child = children[++i]) {
					if (!child.Class) ElementAdapter.bind(child, recurse);	
				}
			}
		},
	
	
		// NOTE: you can optionally pass a selector as the second argument
		//			to instantiate this only when matching that selector
		//		 If you don't pass one, 
		createSubclass : function(id, options) {
			if (!options) options = {};
			var tag = options.tag;
			
			options["super"] = this;
			options.constructor = _makeElementAdapterConstructor(id, tag);
			// _makeElementAdapterConstructor may actually create the tag name
			tag = options.constructor.tag;
			options.prototype = document.createElement(tag);

			var constructor = new Class(id, options);
			constructor.prototype.constructor = constructor;

			// register as an adapter for this tag/selector
			ElementAdapter.registerAdapter(constructor, tag, options.selector);
			return constructor;
		},
		
		// attach the correct ElementAdapter subclass to some @element
		attach : function(element) {
			if (typeof element === "string") element = select(element);
			if (! (element instanceof Element)) 
				throw TypeError("Must pass @element as element or valid global selector");

			// find the adapter which matches this element
			var adapter = ElementAdapter.getAdapter(element);
			if (adapter) new adapter(element);
			return element;
		},

		registerAdapter : function(constructor, tag, selector) {
			if (!selector) selector = tag;
			
			// assign pointer to constructor in the $AdapterMap map
			if (!$AdapterMap[tag]) $AdapterMap[tag] = {};
			if (!$SpecificityMap[tag]) $SpecificityMap[tag] = {};
			
			$AdapterMap[tag][selector] = constructor;
			// figure out the specificity ahead of time
			$SpecificityMap[tag][selector] = ElementAdapter.selectorSpecificity(selector);	
		},
		
		// Find the function we should use to adapt a pre-existing @element.
		// Returns null if an adapter can't be found, or if already adapted.
		getAdapter : function (element) {
			// if element already has a Class, it has already been adapted
			if (element.Class) return;
			
			// see if we can find a matching element type to attach to
			var tag = element.tagName.toLowerCase(), map = $AdapterMap[tag];
			if (!map) return;
			
			var adapter, adapterSpecificity = -1;
			// figure out which selector(s) match the element
			for (var selector in map) {
				if (element.matches(selector)) {
					var specificity = $SpecificityMap[tag][selector];
					if (specificity > adapterSpecificity) {
						adapterSpecificity = specificity;
						adapter = map[selector];
					}
				}
			}
			return adapter;
		},
		
		// ghetto check to estabilish specificity of a given selector
		//	NOTE: this is really crappy, replace with something better
		selectorSpecificity : function (selector) {
			var specificity = 1, index = 0;
			while ((index = 1 + selector.indexOf("#", index)) > 0) {
				specificity += 100;
			}
			index = 0;
			while ((index = 1 + selector.indexOf(".", index)) > 0) {
				specificity += 10;
			}
			index = 0;
			while ((index = 1 + selector.indexOf("[", index)) > 0) {
				specificity += 10;
			}
			return specificity;
		},
		
		toString : function() {
			return this.id;
		}
	}// end static
});// end new Class()


// map of tag => selector => constructors 
window.$AdapterMap = {};

// map of tag => selector => specificty for the selector 
window.$SpecificityMap = {}

ElementAdapter.registerAdapter(ElementAdapter, "element");



function _getChildMap(element, attribute, id) {
	var selector = "["+attribute+ (id ? '="'+id+':"]' : "]");
	// see if there are any 'parts' we should grab
	var children = element.selectAll(selector);
	if (!children.length) return;
	var map = {}, i = -1, child;
	while (child = children[++i]) {
		var name = child.getAttribute(attribute);
		if (name !== null) map[name] = child;
	}
	return map;
}



Script.loaded("{{hope}}ElementAdapter.js");

});// end Script.require
