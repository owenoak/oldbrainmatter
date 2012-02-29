/*** Tag adapter base class: binds to an actual element to provide extra functionality ***/


Script.require("{{hope}}Element.js", function(){
new Class("Tag", {
	makeSubclassConstructor : function(id, options) {
		if (!options.tag) options.tag = id.toIdentifier();
		var constructor, tag = options.tag;
		eval(
			 "constructor = function "+id.toIdentifier()+"() {\n"
			+"	var element = document.createElement('"+tag+"');\n"
			+"	hope.setProto(element, constructor.prototype);\n"
			+"	var result = element.init();\n"
			+"	return result || element;\n"
			+"}"
		);
		constructor.tag = options.tag;
		constructor.selector = (options.selector || options.tag);
		
		return constructor;
	},
	
	prototype : document.createElement("tag"),
	
	makeSubclassPrototype : function(id, options) {
		var element = document.createElement(options.tag);
		hope.extendKeys(element, options["super"].prototype);
		return (options.prototype = element);
	},
	
	properties : {
		// Nothing to do in init by default.
		init : function() {}
	},
	
	"static" : {
		// if cookie "debug.Tag" is set, we'll show debug messages when creating/adapting tags
		debug : hope.cookie("debug.Tag"),
	
		// Register this tag adapter so we can auto-adapt to elements with search.
		initClass : function() {
			if (Tag.debug) console.info("Initializing Tag:",this, "tag:",this.tag, "selector:",this.selector);
			Tag.register(this, this.tag, this.selector);
		},
	
		// if true, we recurse to `adapt()` child elements when we're being `adapt()`ed
		adaptChilren : true,
	
		// map of tag => selector => constructors 
		AdapterMap : {},
		
		// map of selector => specificity for the selector 
		SpecificityMap : {},
	
		// Recursively find elements to adapt and adapt them.
		// 	@elements is one of:
		//		- glonal selector string of elements to match
		//		- array of elements to try to adapt
		//		- single element to try to adapt
		search : function(elements) {
			if (typeof elements === "string") elements = selectAll(elements);
			if (!elements || elements.length == 0) return;
			if (!elements instanceof Array) elements = [elements];

			var i = -1, element;
			while (element = elements[++i]) {
				// if the element has already been adapted, skip it and its children
				if (!element.adapted) {
					// try to find an adaptor which applies to the element
					var adapter = this.getAdapter(element);
					if (adapter) {
						if (Tag.debug) console.info("Tag.search(): Adapting ",element," to ",adapter.name);
						// Note: it's up to the adapter to recurse if it wants to.
						adapter.adapt(element);
					}
					// recurse for child elements
					else {
						var children = element.children;
						if (children && children.length) this.search(children);
					}
				}
			}
		},
	
		// Adapt an @element as an instance of our class.
		adapt : function(element) {
			if (element.adapted) return element;
			hope.setProto(element, this.prototype);
			element.constructor = this;
			element.adapted = true;
			element.init();
			if (this.adaptChildren) {
				var kids = this.elements;
				if (kids && kids.length) this.search(kids);
			}
			return element;
		},
	
		// Register a @constructor as an adaptor for a @tag and maybe a @selector.
		//	This allows the constructor to be found via `this.getAdapter()`.
		register : function(constructor, tag, selector) {
			if (!selector) selector = tag;
			
			// assign pointer to constructor in the this.AdapterMap map
			if (!this.AdapterMap[tag]) this.AdapterMap[tag] = {};
			
			this.AdapterMap[tag][selector] = constructor;
			// figure out the specificity ahead of time
			this.SpecificityMap[selector] = this.getSpecificity(selector);	
		},
		
		// Find the adapter function we should use to adapt a pre-existing @element.
		// Returns null if an adapter can't be found, or if already adapted.
		getAdapter : function (element) {
			// if element already has a Class, it has already been adapted
			if (element.adapted) return;
			
			// see if we can find a matching element type to attach to
			var tag = element.tagName.toLowerCase(), map = this.AdapterMap[tag];
			if (!map) return;
			
			var adapter, adapterSpecificity = -1;
			// figure out which selector(s) match the element
			for (var selector in map) {
				if (element.matches(selector)) {
					var specificity = this.SpecificityMap[selector];
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
		getSpecificity : function (selector) {
			return    1 + (selector.count("#")*100) 
						+ (selector.count(".")*10)
						+ (selector.count("[")*10)
			;
		}
	}
});// end new Class("Tag")


// HACK for testing
new Tag.Subclass("Tag.Command",{
		tag:"command", 
		properties:{
			init:function(){
				console.info("initializing command")
			}
		}
});


Script.loaded("{{hope}}Tag.js");

});// end Script.require
