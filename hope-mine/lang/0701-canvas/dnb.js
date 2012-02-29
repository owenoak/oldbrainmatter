
var dnb = {
	// summary:
	//	"dnb" is the root of the our javascript framework.
	//	It is designed to be as small as possible and extremely quick.
	//	It is also possible to quickly "peer" or install a clone of the dnb object
	//	in another frame or window, to allow you to load dnb once in your top-level
	//	document, then use it in many different contexts without reloading.
	//
	//	Currently this only works in FireFox -- will likely break in other environments.
	//
	//	Note: make sure you always reference "dnb.document" or "dnb.window" in your code
	//	that uses dnb to make sure that your code can be peered properly.

	debugging : false,

	//	debug: profiling (see "time" and "timeEnd" below as well
	profiling : true,			// set to true to show profiling information
	
	//  debug function creation:  if true, all created functions are wrapped in a try{...}catch block
	debugFunctionCreation: true,
	
	
	//
	//	hacking browser sniff for now
	//
	browser : "moz",
	
	
	
	//
	//	basic utilites
	//
	
	// apply all properties of ALL objects passed in to this object
	// NOTE: if an argument is an array, recursively calls setProperties with the array as arguments
	//			this allows you to pass an arguments array from another function:
	//				function foo() {
	//					...
	//					dnb.setProperties.apply(this, arguments);
	//					...
	//				}
	setProperties : function() {
		if (arguments.length == 0) return this;		// for chaining

		for (var i = 0; i < arguments.length; i++) {
			var props = arguments[i];
			if (!props) continue;
			if (props instanceof Array) {
				dnb.setProperties.apply(this, props);
			} else {
				for (var name in props) {
					this[name] = props[name];
				}
			}
		}
		return this;		// for chaining
	},
	
	// same as setProperties, but does not override if this already has a value in that slot
	setPropertiesIfNotPresent : function() {
		if (arguments.length == 0) return this;		// for chaining

		for (var i = 0; i < arguments.length; i++) {
			var props = arguments[i];
			if (!props) continue;
			if (props instanceof Array) {
				dnb.setPropertiesIfNotPresent.apply(this, props);
			} else {
				for (var name in props) {
					if (typeof this[name] == "undefined") this[name] = props[name];
				}
			}
		}
		return this;		// for chaining
	},
	
	
	copyPropertySet : function(from, to, set) {
		if (typeof set == "string") set = set.split(",");
		for (var i = 0; i < set.length; i++) {
			to[set[i]] = from[set[i]];
		}
		return to;
	},


	copyPropertySetIfNotNull : function(from, to, set) {
		if (typeof set == "string") set = set.split(",");
		for (var i = 0; i < set.length; i++) {
			var it = from[set[i]];
			if (it != null)	to[set[i]] = it;
		}
		return to;
	},
	
	// Mix in class and prototype properties/methods into this object
	//	NOTE: better to use Constructor.mixIn(...)
	//
	//	instanceProps: 	(optional) Hash of properties to apply to the prototype.
	//					You can also pass an array of hashes which will each be applied
	//	classProps:		(optional) Hash of properties to apply to the class itself.
	//					You can also pass an array of hashes, which will each be applied.
	mixIn : function(protoProps, classProps) {
		if (protoProps) this.addToPrototype(protoProps);
		if (classProps) this.addToClass(classProps);		
	},
	
	
	// Create a new function object
	//	Does this in the most efficient way possible.  If an error is generated, prints lots of debug info
	createFunction : function(params, script, functionName) {
		if (functionName == null) functionName = "";

		// assemble the actual function, so we can eval() it
		
		var fnScript = ["var fn = function ",functionName,"(",params,"){\n"];

		// put a try/catch block in there if debugFunctionCreation is true
		if (dnb.debugFunctionCreation) {
			fnScript.push("try {\n");
		}
		fnScript.push(script);
		if (dnb.debugFunctionCreation) {
			fnScript.push("} catch (e) {\n",
							"console.group('Error executing dynamic function');\n",
							"console.error(e);\n",
							"console.trace();\n",
							"console.info(''+arguments.callee);\n",
							"console.groupEnd();\n",
							"throw (e);\n",
						  "}"
			);
		
		}
		fnScript.push("\n}");

		try {
			eval(fnScript.join(""));
			return fn;
		} catch (e) {
			console.group(dnb, ".createFunction(", (functionName ? functionName : ""), "): error creating function");
			console.error(e);
			console.group("Stack trace:");
			console.trace();
			console.groupEnd();
			console.group("Script:");
			console.debug("function ("+params+"){\n\t",
						script.split,
					"\n}");
			console.groupEnd();
			console.groupEnd();
		}
	},
	
	// return a string of all of the arguments to ANOTHER function concatted together
	//	default separator is " "
	joinArguments : function(args, separator) {
		if (separator == null) separator = " ";
		var list = Array.prototype.join.apply(args, [separator]);
		return list;
	},

	// return an array composed of the arguments of ANOTHER function
	argumentsToArray : function(args, startAt) {
		var list = [];
		// NOTE: if we don't do the apply, we get:   [ [arg1, arg2, ...] ] rather than [ arg1, arg2, ...]
		list.push.apply(list, args);
		if (startAt) return list.slice(startAt);
		return list;
	},
	
	getHashKeys : function() {
		var output = [];
		for (var i = 0, it; it = arguments[i], i < arguments.length; i++) {
			for (var prop in it) output.push(it[prop]);
		}
		return output;	
	},
	
	getHashValues : function() {
		var output = [];
		for (var i = 0, it; it = arguments[i], i < arguments.length; i++) {
			for (var prop in it) output.push(it[prop]);
		}
		return output;
	},
	
	// return all properties that are in a that are not the same as those in b
	getUniqueProperties : function(a, b, skipObject, skipPrefix) {
		var output = {};
		for (var prop in a) {
			if (a[prop] == b[prop]) continue;
			if (skipObject && typeof skipObject[prop] != "undefined") continue;
			if (skipPrefix && prop.indexOf(skipPrefix) == 0) continue;
			output[prop] = a[prop];
		}
		return output;
	},
	
	
	// removes all arguments after the first
	removeFromArray : function(list) {
		var results = [];
		for (var a = 1, alen = arguments.length; a < alen; a++) {
			var it = arguments[a];
			for (var i = 0, len = list.length; i < len; i++) {
				if (list[i] == it) {
					results.push(list.splice(i,1));
					break;
				}
			}
		}
		return results;
	},
	
	// take the element at start index in the array and move it to end index
	//	pass 0 to move before the first element
	moveInArray : function(array, start, end) {
		var it = array.splice(start, 1)[0];
		array.splice(end, 0, it);
		return array;
	},

	// add something to an array
	//	if it's already in the array, remove it from its current spot and put it at the end
	addOnceToArray : function(array, it) {
		var where = array.indexOf(it);
		if (where > -1) {
			array.splice(where, 1);
		}
		array.push(it);
		return array;
	},
	
	//
	//	DOM methods
	//
	
	window : window,				// use this consistently so we can get peering to work eventually
	document : window.document,		// use this consistently so we can get peering to work eventually
	
	getBody : function() {
		return dnb.document.body;
	},
	
	
	byId : function (id) {
		if (typeof id == "string") return dnb.document.getElementById(id);
		return id;
	},
	
	byTag : function(tag, which, parent) {
		// summary: Return element(s) by tag name.  
		//	Normal return is the entire tag collection.
		//	which?	: (string) id or (number) index of single element in collection to return.
		//  parent?	: (element) Pointer to element to look under.  If not specified, will use dnb.document
		if (parent == null) parent = dnb.document;
		var list = parent.getElementsByTagName(tag);
		if (which == null) return list;
		if (typeof which == "string") {
			for (var i = 0, it; it = list[i++];) {
				if (it.id == which) return it;
			}
		} else if (typeof which == "number") {
			return list[which];
		}
		return dnb.error("dnb.byTag("+tag+","+which+")","pass number or string as second arg");
	},
	
	childrenByTag : function(parent, tag, which) {
		return dnb.byTag(tag,which,parent);
	},
	
	getComputedStyle : function(id, prop) {
		var el = dnb.byId(id);
		// on FireFox 1.5 and 2. the computed style is relatively expensive to calculate, 
		//	and you can grab more than one, but there's no reason to because they will all
		//	always have the same values -- the current state of the object
		// haven't tested other browsers, but this is safe in FF
		if (!el._computedStyle) el._computedStyle = dnb.document.defaultView.getComputedStyle(el,"");
		if (prop) return el._computedStyle[prop];
		return el._computedStyle;
	},
	
	getDimension : function(el, prop, units) {
		// summary: Given an element and a property name, return the dimension according to units
		//			if units is passed, returns in relation to those units, no matter original units
		
		// TODO: take scrolling into account?
		el = dnb.byId(el);
		var value;
		switch (prop) {
			case "left" :	value = el.offsetLeft;	break;
			case "top"	: 	value = el.offsetTop;	break;
			default		:	value = dnb.getComputedStyle(el, prop);
		}
		if (value == null || value == '' || value == "auto") return 0;		// ???
		if (prop == "opacity") return value;
		var currentUnits = dnb.getUnits(value);

		value = parseInt(value);
		if (!units || !currentUnits || units == currentUnits) return value;
		
		// ok, we need to translate by the units
		switch (prop) {
			case "left":  case "right":  case "width":	
				var percentValue = dnb.window.innerWidth;	break;
			case "top":  case "bottom":  case "height":	
				var percentValue = dnb.window.innerHeight;	break;
			default:
				return value;
		}
		
		if (units == "%") return Math.floor((value / percentValue) * 100);
		return Math.floor(value * (percentValue / 100));
	},
	
	getUnits : function(value) {
		var pieces = (""+value).match(/(.*)(px|%)/);
		return (pieces ? pieces[2] : null);
	},
	
	getMousePoint : function(event, target) {
		target = target || event.target;
		var absPosition = dojo.html.getAbsolutePosition(target);
		var x = (event.clientX - absPosition.left),
			y = (event.clientY - absPosition.top)
		;
//console.log(this.element.scrollLeft, this.element.top );
		return {x:x, y:y};
	},	
	
	listenByTag : function(tag, event, method, target) {
		// summary: Install event handlers for all elements with a given tag.
		//			Note: when method is called, "this" is the element the handler is assigned to.
		//	tag		: (string) Tag name to look for.
		//	event	: (string) Name of event ("click", "mouseover", etc).
		//	method	: (function) Method to hook up, or (string) script to execute
		//	target?	: (object) If present and method is function, we will attach hitch(target,method).
		var collection = dnb.byTag(tag);
		if (target && typeof method == "function") method = function(){method.apply(target,arguments)};
		for (var i = 0, it; it = collection[i++];) {
			it.addEventListener(event, method, false);
		}
	},
	
	createElement : function(tag, parent, id, className, content, attributes, style) {
		// summary: Create a new element and set its properties.
		//			If parent is specified, will be appended to parent's children
		//			You can also call by passing a single object parameter with same set of properties as arguments.
		//	tag			: (string) Tag name for element.
		//	parent?		: (element) Pointer to parent el, (string) id of parent el, or "body" to insert as top-level body element.
		//	id?			: (string) Id for element.
		//	className?	: (string) Class name(s) to apply to element
		//	content?	: (string) HTML for element.innerHTML, (array) list of elements to append as children, or (element) single element to append as child.
		//  attributes?	: (object) Object of key:value pairs to add as attributes of the element
		//	style?		: (object) Object of key:value pairs to add to element.style (should be in js format, eg: "backgroundColor") 
		//	returns		: (element) Element that was created.
		if (typeof tag != "string" && arguments.length == 1) {
			var props = tag;
			tag = props.tag;
			parent = props.parent;
			id = props.id;
			className = props.className;
			content = props.content;
			attributes = props.attributes;
			style = props.style;
		}
		var el = dnb.document.createElement(tag);
		if (id != null) el.setAttribute("id",id);
		if (className != null) el.className = className;
		if (style != null) {
			for (var prop in style) {
				el.style[prop] = style[prop];
			}
		}
		if (attributes != null) {
			for (var prop in attributes) {
				el.setAttribute(prop, attributes[prop]);
			}		
		}
		if (content != null) {
			if (typeof content == "string") {
				el.innerHTML = content;
			} else if (content.length) {
				for (var i = 0, it; it = content[i]; i++) {
					el.appendChild(it);
				}
			} else {
				el.appendChild(content);
			}
		}
		if (parent) {
			if (typeof parent == "string") {
				if (parent.toLowerCase() == "body") {
					parent = dnb.getBody();
				} else {
					parent = dnb.byId(parent);
				}
			}
			if (parent)	parent.appendChild(el);
		}
		return el;
	},
	
	
	insertStyleSheet : function(href) {
		dnb.createElement({tag:"link",parent:"body",attributes:{rel:"stylesheet",type:"text/css",href:href}})
	},
	
	
	// NOTE: 1) pass in event as "mouseup" or "onMouseUp" -- fixes "dblclick" for you
	//		 2) method should be pre-hitched
	//		 3) capture defaults to false
	addGlobalEvent : function(which, method, capture) {
		which = which.toLowerCase();
		if (which.indexOf("on") == 0) which = which.substr(2);
		if (which == "doubleclick") which = "dblclick";

//		var body = dnb.getBody();		
		dnb.document.addEventListener(which, method, (capture == true));
		return method;
	},
	
	removeGlobalEvent : function(which, method, capture) {
		which = which.toLowerCase();
		if (which.indexOf("on") == 0) which = which.substr(2);
		if (which == "doubleclick") which = "dblclick";

//		var body = dnb.getBody();
		dnb.document.removeEventListener(which, method, (capture == true));
	},
	
	
	//
	//	visibility semantics
	//
	
	
	show : function(id) {
		dnb.fadeIn(id);
	},
	
	hide : function(id) {
		dnb.fadeOut(id);
	},
	
	toggle : function(id) {
		var el = dnb.byId(id);
		if (!el) dnb.error("dnb.toggle("+id+")","element not found");
		if (dnb.getComputedStyle(el, "display") != "none") {
			dnb.hide(el);
		} else {
			dnb.show(el);
		}
	},
	
	fadeIn : function(el, fadeTime, maxOpacity, callback) {
		// sumary: Fade the specified element in over fadeTime.
		//	el			: (element) Element or (string) element.id to fade in.
		//	fadeTime?	: (number:200) Time in milliseconds for effect.
		el = dnb.byId(el);

		if (fadeTime == null) fadeTime = 200;
		var stepTime = Math.floor(fadeTime / 10);
		
		if (maxOpacity == null) maxOpacity = 1;
		
		el.style.opacity = 0;
		el.style.display = "block";
		var effect = function() {
			var opacity = parseFloat(el.style.opacity) + .1;
			if (opacity < maxOpacity) {
				el.style.opacity = opacity;
				setTimeout(effect,stepTime);
			} else {
				el.style.opacity = maxOpacity;
				if (typeof callback == "function") callback();
			}
		}
		// execute the first step on the timer in case someone else wants to move us or something
		setTimeout(effect,stepTime);
	},
	
	fadeOut : function(el, fadeTime, maxOpacity, callback) {
		// sumary: Fade the specified element out over fadeTime.
		//	el			: (element) Element or (string) element.id to fade in.
		//	fadeTime?	: (number:200) Time in milliseconds for effect.
		el = dnb.byId(el);

		if (fadeTime == null) fadeTime = 200;
		var stepTime = Math.floor(fadeTime / 10);
		
		el.style.opacity = maxOpacity || 1;
		var effect = function() {
			var opacity = parseFloat(el.style.opacity) - .1;
//console.log(opacity);
			if (opacity > 0) {
				el.style.opacity = opacity;
				setTimeout(effect,stepTime);
			} else {
				el.style.opacity = 0;
				el.style.display = "none";
				if (typeof callback == "function") callback();
			}
		}
		setTimeout(effect,stepTime);
	},


	fadeInAndOut : function(el, displayTime, fadeTime, maxOpacity, callback) {
		if (displayTime == null) displayTime = 1000;
		dnb.fadeIn(el, fadeTime, maxOpacity, 
				function(){
					setTimeout(
						function(){dnb.fadeOut(el, fadeTime, maxOpacity, callback)},
						displayTime
					)
				}
			);
		
	},


	//
	//	simple IO
	//	
	loadJSFile : function (fileName) {
		try {
			var script = doRequest(fileName);
		} catch (e) {
			if (this.debugging) console.error("loadJSFile(",fileName,"): error loading file ", e);
		}
		try {
			window.eval.apply(window, [script]);
		} catch (e) {
			if (this.debugging) {
				console.group("loadJSFile(",fileName,"): error evaluating script ", e);
				console.error("--> ", script);
				console.groupEnd();
			}
		}
	}
};

dnb.toString = function() {
	return "[dnb]";
//	var src = (dnb.window.location || dnb.window.src);
//	return "[dnb " + src +"]";
}


////////////
//
//	Class semantics that really work!
//
////////////

/*
	Todo:
		* change Singleton to its own base class, more efficient createSingleton
		* have semantics for loading classes asynchronously built in at base level for inserting SCRIPT tags
			- have policy that classes are re-entrant?
*/



//
//	class/instance/singleton semantics
//	
//	To create a class:
//		dnb.createClass("MyClass", {protoProperty:value, protoProperty2:value, ...});
//	 or
//		dnb.createClass("MyClass", [{protoProperty:value, ...}, {...}, ...]);
//
//		Notes: 	* classes are implicitly declared in the window context 
//					(eg: window.MyClass will be the constructor above)
//
//				* classes are implicitly created as subclasses of dnb.BaseClass (see below)
//					which defines a number of useful methods and makes sure that inheritance,
//					etc all work properly
//
//	To create a subclass of another class created with CF.createClass() (eg: MyClass above)
//		MyClass.createSubclass("MySubClass", {protoProperty:value, protoProperty2:value, ...});
//	 or
//		MyClass.createSubclass("MySubClass", [{protoProperty:value, ...}, {...}, ...]);
//
//
//	To create a Singleton object (single instance, inherits class properties/methods from dnb.BaseClass)
//	
//		dnb.createSingleton("SingletonClass", {classProperty:value, ...});
//	 or
//		dnb.createSingleton("SingletonClass",  [{classProperty:value, ...}, {...}, ...]);
//
//
//	To mix in methods/properties to a class, do:
//		MyClass.mixIn( {protoProp:value,...}, {classProp:value,...} )
//	 or
//		MyClass.mixIn( [ {protoProp:value,...}, {protoProp:value,...} ], 
//					   [ {classProp:value,...}, {classProp:value,...} ] )
//
//		NOTE: methods mixed in to a class will be automatically mixed in to subclasses as well
//
//	To create an instance of a class, do:
//		var it = new MyClass({instanceProp:value,...}, {...}, ...);
//
//		Notes:	* instance.init() will be called automatically after the assignment above
//				* The default init() implementation does a setProperties() of the
//				* override init() in your subclass if you have another scheme
//				* Note: to get the default init behavior, do this:
//					[myClass.prototype].init = function() {
//						this.inherit("init",arguments);
//						... do your stuff here ...
//					}
//	To call an inherited method, do:
//		[myinstance].someFunction = function(whatever) {
//			...
//			this.inherit("someFunction", arguments);
//			...
//		}
//
//		Notes:	* Does not work for recursive calls
//				* Does go up the chain correctly
//				* Handles methods that are put on instances (as opposed to prototoypes)
//					as well as method mixed in in an ad-hoc manner (eg: not w/declare/etc)
//
//	Interesting methods and properties for Classes (constructors):
//		* <constructor>.prototype == the prototype object
//		* <constructor>.superclass == superclass constructor object
//		* <constructor>.subclasses == [array of subclass constructors] (used by mixIn)
//		* <constructor>.type == name of the class (for reflection)
//
//		* <constructor>.setProperties() -- set properties on this constructor only
//		* <constructor>.addToClass() -- set properties on this constructor AND ALL SUBCLASSES
//		* <constructor>.addToPrototype() -- set properties on prototype
//		* <constructor>.mixIn() -- set properties on prototype (first arg) and constructor/Subclasses (2nd)
//		* <constructor>.createSubclass() -- create a subclass of this class
//		* <constructor>.inheritsFrom(<constructor2>) -- true if <constructor> is a subclass
//
//	Interesting methods and properties about instances (and their prototypes):
//		* <instance>.constructor == construction function
//		* <instance> instanceof <constructor> == returns true, including for superclasses
//		* <instance>.constructor.prototype == immediate ancestor in the prototype chain
//
//		* <instance>.init() -- method called right after instance is created, overrideable (see above)
//		* <instance>.getId() -- returns a unique id for this instance (eg: "<Type>_#")
//							 -- if you set <instance>.id, that will be returned
//		* <instance>.setProperties() -- set properties on the instance, see CF.setProperties
//		* <instance>.inherit() -- call superclass methods, see above
//		* <instance>.clone() -- create a shallow (prototype-based) clone of this object
//		


// mix the class creation stuff into the dnb base object
dnb.setProperties({
	_classCount : 0,

	// Create a new class top-level class
	//	NOTE: implicitly creates as subclass of dnb.BaseClass
	//	See above for more info
	createClass : function(className, properties) {
		return this.createSubclass(className, properties, dnb.BaseClass);
	},


	// Create a subclass of a given superclass.
	//	Don't call this directly, use  SuperClass.createSubclass(...) instead.
	createSubclass : function (className, properties, superclass) {
		// default to the dnb.BaseClass if none passed in, dnb.BaseClass is defined below
		if (superclass == null) superclass = dnb.BaseClass;
		
		
		// create the constructor -- same for all classes to make it so that
		//	subclassing does not run init() methods on the prototypes.
		//	Override init() in your class to do initialization (see above)
//		var constructor = function (){ 
//				if (arguments[0] == dnb.SKIP_INIT) return;
//				this.init.apply(this, arguments);
//			};

		eval("var constructor = function "+className+" (){ "+
									"if (arguments[0] == dnb.SKIP_INIT) return;"+
									"this.init.apply(this, arguments);"+
								"}"
							);
		//console.log(className, constructor);		

		// copy all class methods/properties from the superclass into the constructor
		dnb.setProperties.apply(constructor, [superclass]);

		// then create the prototype, passing in the flag that means we 
		//	should skip calling the init() function
		var prototype = constructor.prototype = new superclass(dnb.SKIP_INIT);
		dnb.setProperties.apply(prototype, [properties]);
		constructor.superclass = superclass;

		// make sure everyone knows about the subclass relationship
		superclass.subclasses.push(constructor);
		constructor.subclasses = [];
		constructor.type = className;
		constructor.__nextId = 0;			// for getId() method
	
		prototype.constructor = constructor;
		prototype._callChainCache = {}		// cache for call chains for inherit() calls

		// assign in the global scope
//		window[className] = constructor;
		dnb[className] = constructor;
		
		dnb._classCount++;			// just for interest, could be removed
		
		return constructor;
	},
	SKIP_INIT : "SKIP_INIT",		// passed into constructors automatically when creating
									//	prototypes so they don't run init automatically

	// return a pointer to the constructor given the class name
	getConstructor : function(className) {
		return dnb[className];
	},
	
	// create an instance
	//	"it" can be one of
	createInstance : function(it) {
		if (!it) return null;
		var constructor,
			usingConstructorProperty,
			firstArg = 0
		;
		if (typeof it == "function") {
			constructor = it;
			firstArg = 1;
		} else if (typeof it == "string") {
			constructor = dnb[it];
			firstArg = 1;
		} else if (it.constructor) {
			constructor = it.constructor;
			if (typeof constructor == "string") constructor = dnb[constructor];
			delete it.constructor;	// ???  this will have side effects...
			usingConstructorProperty = true;
		}
		if (typeof constructor != "function") throw "dnb.createInstance(): constructor must resolve to a class";

		// actually create the thing WITHOUT calling it's init -- we'll do that below to pass all arguments at once
		// NOTE: this depends on all constructors conforming to the new/init() pattern we've established...
		var instance = new constructor(dnb.SKIP_INIT);
		instance.init.apply(instance, dnb.argumentsToArray(arguments, firstArg));
		if (usingConstructorProperty) it.constructor = constructor;
		return instance;
	},
	
	// create an instance for each argument
	createInstances : function() {
		var output = [];
		for (var i = 0, it; it = arguments[i], i < arguments.length; i++) {
			output.push(this.createInstance(it));
		}
		return output;
	},

	// each argument is an instance of hash, an instance will be created for each value 
	//	and an object returned with instances by keys
	createInstancesFromHash : function() {
		var output = {};
		for (var i = 0, it; it = arguments[i], i < arguments.length; i++) {
			for (var name in it) {
				output[name] = this.createInstance(it[name]);
			}
		}
		return output;
	},


	// Create a Singleton class:
	//	single instance, not expected to be instantiated, 
	//	but still gets all class methods from its superclass (or dnb.BaseClass if none provided)
	//
	createSingleton : function(className, classProperties, superclass) {
		return dnb.createSubclass(className, null, superclass).addToClass(classProperties);
		return singleton;
	},

	// method for creating clones, put here so it is only created once 
	//	(rather than each time clone is called)
	_cloner : function() {
		dnb.setProperties.apply(this, arguments);
	}
});



//
//	Create the dnb.BaseClass, root of all objects created with the dnb.
//	Any class or subclass that is created without a superclass will be an implicit subclass of dnb.BaseClass.
//
//	This provides methods that we assume are in all classes and instances.
//
dnb.BaseClass = function(flag) {
	if (flag == dnb.SKIP_INIT) return;
	this.init.apply(this, arguments);
};
dnb.BaseClass.prototype = {
	constructor : dnb.BaseClass,
	
	// default baseclass implementation of init copies props of all arguments passed in into this instance
	//	To take advantage of this, you should:   this.inherit("init",arguments)  in your subclass.init()
	//	BEFORE you do anything interesting
	init : function() {
		this.setProperties.apply(this, arguments);
	},

	// alias for setting maps of properties on the instance
	setProperties : dnb.setProperties,
	
	// Call the superclass method "methodName" with args (like apply)
	//	Note: this chains properly for non-recursive calls
	//	Note: I don't think this supports recursion at this time (not sure it's possible w/this scheme?)
	inherit :  function(methodName, args) {
		// in createSubclass, each prototype is assigned a _callChainCache
		//	we use this to only have to look up the call chain once per class/method
		var proto = this.constructor.prototype,
			cache = proto._callChainCache,
			callChain = cache[methodName]
		;
		
		if (callChain == null) {
			// if the callChain has not been initialized, figure it out now
			callChain = cache[methodName] = [];
			callChain.currentCall = 0;
			var last = this[methodName],
				protoChain = this.getPrototypeChain()
			;
			for (var i = 0; i < protoChain.length; i++) {
				if (protoChain[i][methodName] && protoChain[i][methodName] != last) {
					callChain.push(last = protoChain[i][methodName]);
				}
			}
		}
	
		// now that we have a call chain, try to call the next item in the chain
		//	if a superclass inherit()s again, the callChain.currentCall++ assignment will make sure
		//	the next function in the chain gets called
		if (callChain[callChain.currentCall]) {
			try {
				var returnValue = callChain[callChain.currentCall++].apply(this, args);
				callChain.currentCall--;
				return returnValue;
			} catch (e) {
				// NOTE: probably should just throw the error up rather than trapping/logging it
				if (window.console && window.console.error) console.error(this, e);
				console.trace(e);
			}
		}
		return null;
	},

	// return the list of prototypes of this object, with the closest one first
	getPrototypeChain : function() {
		var proto = this.constructor.prototype,
			list = []
		;
		while (proto) {
			list.push(proto);
			proto = proto.constructor.superclass ? proto.constructor.superclass.prototype : null;
		}
		return list;
	},
	
	// same as getPrototypeChain, but has this object FIRST
	getCallChain : function() {
		return [this].concat(this.getPrototypeChain());
	},

	// return property for all items in call chain, only if property is not null or undefined
	//	NOTE: this item is FIRST, use reverse() if you want this item to override any previous
	getCallChainProperty : function(property) {
		var chain = this.getCallChain(),
			output = [],
			lastValue
		;
		for (var i = 0; i < chain.length; i++) {
			var value = chain[i][property];
			if (typeof value != undefined && value != null && value != lastValue) {
				output.push(value);
				lastValue = value;
			}
		}
		return output;
	},
	
	// given a property hash defined in one or more layer of the call chain
	//	return an object which is the union of the objects, with this object's stuff overriding
	getMergedCallChainProperty : function(property) {
		var chainValues = this.getCallChainProperty(property).reverse(),
			values = {}
		;
		this.setProperties.apply(values, chainValues);
		return values;
	},

	// return all properties that are different in this instance from its prototype
	getInstanceProperties : function(skipProperties, skipPrefix) {
		return dnb.getUniqueProperties(this, this.constructor.prototype, skipProperties, skipPrefix);
	},
	
	
	getArgs : dnb.argumentsToArray,

	// return a unique id for this instance
	getId : function() {
		return this.id || (this.id = this.generateId());
	},

	// generate a unique ID for an instance of this class
	//	this implementation yields a string that indicates the class it comes from
	generateId : function() {
		return this.constructor.type + "_" + this.constructor.__nextId++;
	},

	// Make a shallow clone of this object.  Note: clone.init() is NOT called.
	// Any props passed in will be assigned to the clone
	clone : function(props) {
		dnb._cloner.prototype = this;
		return new dnb._cloner({id:null,$cache:null},props);
	},

	toString : function() {
		if (this.constructor && this == this.constructor.prototype) {
			return "["+this.constructor.type+" prototype]";
		} else {
			return "["+this.constructor.type+": "+this.getId()+"]";
		}
	}
}



//
//	dnb.BaseClass -- root object in our hierarchy
//
//	Sets up useful instance and class methods that all classes can use
//
dnb.BaseClass.addToClass = dnb.setProperties;
dnb.BaseClass.addToClass({
	// for reflection and ID generation
	type:"BaseClass",
	__nextId : 0,

	// list of subclasses, maintained in CF.createSubclass
	subclasses : [],

	// alias for mixiing in properties into this instance or class.
	//	see: dnb.mixIn
	mixIn : dnb.mixIn,

	// mix prototype and class methods of the constructor passed in into this object
	mixInClass : function(constructor) {
		var protoSkipProps = {init:1, id:1, _callChainCache:1, debugLevel:1},
			protoProps = dnb.getUniqueProperties(constructor.prototype, this.prototype, protoSkipProps),
			classSkipProps = {"prototype":1, subclasses:1, type:1},
			classProps = dnb.getUniqueProperties(constructor, this, classSkipProps)
		;
		this.mixIn(protoProps, classProps);
	},
	

	// add properties and methods of all objects passed in to this class AND ALL SUBCLASSES
	//	same semantics as dnb.setProperties
	addToClass : function() {
		dnb.setProperties.apply(this, arguments);
		for (var i = 0; i < this.subclasses.length; i++) {
			this.subclasses[i].addToClass.apply(this.subclasses[i], arguments);
		}
	},

	// Set properties on the class's prototype.
	//	Same semantics as dnb.setProperties.
	addToPrototype : function() {
		dnb.setProperties.apply(this.prototype, arguments);
	},

	// Create a subclass of this class.
	//	same semantics as dnb.createSubclass(this, ...)
	createSubclass : function(name, properties) {
		return dnb.createSubclass(name, properties, this);
	},

	//	return true if this class is a subclass of another class
	inheritsFrom : function(superclass) {
		var subclass = this;
		while(subclass.superclass) {
			if (subclass.superclass == superclass) return true;
			subclass = subclass.superclass;
		}
		return false;
	},
	
	toString : function() {
		return "[Class "+this.type+"]";
	}

});




////////////
//
//	set things up so we don't fail if firebug is not installed
//		XXX this doesn't seem to work in Safari... ???
//
////////////
if (!("console" in window) || !("firebug" in console)) window.console = {};
if (!console.debug) {
	console.debug = function (){
		var console = dnb.byId("console");
		if (!console) {
			console = dnb.createElement("div", "body", "console", null, null, null, 
				{	// styles
					position : "absolute",
					left : "0px",
					height : "200px",
					right : "0px",
					bottom : "0px",
					borderTop:"1px solid red",
					backgroundColor:"#FFEEEE",
					padding:"5px",
					overflow : "auto"
				});
			console.innerHTML = "<h2 style='background-color:#CCAAAA;padding:3px;font-weight:bold;'>Debug</h2>";
		}
		
		var message = [];
		for (var i = 0; i < arguments.length; i++) {
			message.push(arguments[i]);
		}
		console.innerHTML += "<br>" + message.join(" ");
	};
}
if (!console.info) console.info = console.debug;
if (!console.warn) console.warn = console.debug;
if (!console.error) console.error = console.debug;
if (!console.group) console.group = function(){};
if (!console.groupEnd) console.groupEnd = function(){};





/////////////
//
//	Add array methods if they have not been defined
//
/////////////



// eg:    list.forEach(method, this)
//				method is called as:   this.method(arrayItem, index, array)
Array.prototype.forEach = Array.prototype.forEach || function(method, thisObject){
	for (var i = 0; i < this.length; i++){
		if (i in this) method.call(thisObject, this[i], i, this);
	}
};


// eg:    results = list.filter(method, this)
//				method is called as:   this.method(arrayItem, index, array)
//	returns: all objects for which filter is true
Array.prototype.filter = Array.prototype.filter || function(method, thisObject){
	var results = [];
	for (var i = 0; i < this.length; i++){
		if ((i in this) && method.call(thisObject, this[i], i, this)) results.push(this[i]);
	}
	return results;
};

// eg:    results = list.map(method, this)
//				method is called as:   this.method(arrayItem, index, array)
//	returns: return value for each call (whether true or not)
Array.prototype.map = Array.prototype.map || function(method, thisObject){
	var results = [];
	for (var i = 0; i < this.length; i++){
		if (i in this) results[i] = method.call(thisObject, this[i], i, this);
	}
	return results;
};


// eg:    isTrue = list.every(method, this)
//				method is called as:   this.method(arrayItem, index, array)
//	returns: true if method call is true for all items in the array
Array.prototype.every = Array.prototype.every || function(method, thisObject){
	for (var i = 0; i < this.length; i++){
		if ((i in this) && !method.call(thisObject, this[i], i, this)) return false;
	}
	return true;
};



// eg:    isTrue = list.some(method, this)
//				method is called as:   this.method(arrayItem, index, array)
//	returns: true if method call is true for at least one item in the list
Array.prototype.some = Array.prototype.some || function(method, thisObject){
	for (var i = 0; i < this.length; i++){
		if ((i in this) && method.call(thisObject, this[i], i, this)) return true;
	}
	return false;
};


// eg:    var index = list.indexOf(method, this)
//	returns: index of item in the array
Array.prototype.indexOf = Array.prototype.indexOf || function(item, from){
	from = from || 0;
	if (from < 0) from = Math.max(0, this.length + from);
	while (from < this.length){
		if(this[from] === item) return from;
		from++;
	}
	return -1;
};








dnb.postObjectTo = function(url, object) {
	var request = new XMLHttpRequest();
	request.open("POST", url, false);
	request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");

	var output = [];
	for (var prop in object) {
		output.push(prop+"="+object[prop]);
	}
	
	request.send(output.join("&"));

	console.debug(request.responseText);
}