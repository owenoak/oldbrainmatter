/*** Class sytem ***/

Script.require("{{hope}}Observable.js", function(){


// TODO:
//		- new Class(id,{"super":List}) needs to use List's make constructor function

// new Class(id, {
//		"super" : "Super.Class",
//		constructor : function(){...custom constructor function, see below },
//		mixins : "mixin,mixin,mixin",
//		prototoype : <custom prototype object>,
//		properties : {...prototype props/methods...}
//		static  : {...static props/methods...}
//	});
//
//	NOTE: Default initialization is to .extend() new object with a single map of properties.
//		  To do something else, pass a different prototype.init method.
var Class = window.Class = function Class(id, options) {
	// skip immediately if constructing a new prototype
	if (id == "__CREATING_SUPERCLASS__") return this;
	if (!options) options = {};
	
	var Super = options["super"] || Class,
		mixins = options.mixins,
		constructor = (options.hasOwnProperty("constructor") ? options.constructor : null),
		prototype = options.prototype,
		protoProps = options.properties,
		staticProps = options["static"],
		makerFn
	;
	if (!id) throw TypeError("Must specify Class id");
	if (typeof Super === "string") Super = hope.get(Super);
	if (!Super) throw TypeError("Can't find superclass "+options["super"]);
	options["super"] = Super;
	
	// create the constructor if not already defined
	var makeConstructor = options.makeSubclassConstructor || Super.makeSubclassConstructor;
	if (!constructor) {
		constructor = options.constructor = makeConstructor(id, options);
	}
	constructor.makeSubclassConstructor = makeConstructor;
	
	// install a global pointer to the constructor by id
	hope.set(id, constructor);

	// add all superclass methods/props to the constructor
	hope.extendIf(constructor, Super);
	constructor.id = id;
	constructor.toRef = function(){return id};
	constructor["super"] = Super;
	if (staticProps) hope.extend(constructor, staticProps);
	
	// create a "Subclass" method, so we can say new `new Class.Subclass(id,options)`
	constructor.Subclass = function Subclass(id, options) {
		if (!options) options = {};
		options["super"] = constructor;
		return new Class(id, options);
	}

	// some classes have special methods to create their prototypes
	//	to do fancy hookup.
	var makeProto = options.makeSubclassPrototype || Super.makeSubclassPrototype;
	constructor.makeSubclassPrototype = makeProto;
	// create the prototype if not already defined
	if (!prototype) {
		prototype = options.prototype = makeProto(id, options);
	}

	// hook constructor and prototype together
	constructor.prototype = prototype;
	prototype.constructor = constructor;

	// apply any mixins to the prototype
	// NOTE: we do this BEFORE setting prototype properties so props will override
	if (mixins) {
		mixins = hope.get.each(mixins.split(","));
		var i = 0, mixin;
		while (mixin = mixins[++i]) {
			if (mixin.mixinTo)						mixin.mixinTo(constructor);
			else if (typeof mixin === "function") 	mixin(constructor);
			else throw TypeError("Don't understand how to apply mixin "+mixin);
		}
	}

	// add properties passed in to the proto
	// NOTE: we do this AFTER the mixins have been applied, so props will override mixin defaults.
	if (protoProps) hope.extend(prototype, protoProps);
	
	// initialize the Class
	if (constructor.initClass) constructor.initClass();
	
	return constructor;
}

//
//	instance methods/properties shared by all classes
//
Class.prototype = {};
hope.extend(Class.prototype, {
	extend : hope.extendThis,
	extendIf : hope.extendThisIf,
	
	init : function(props) {
		this.extend(props);
	},
	
	
	// Call a method as some other class.
	//	If calling a function with the same name as the calling function,
	//	you can generally omit the function name.  However, you ca specify
	//	it if you want to be explicit or you want to call a different method.
	as : function as(someClass, args) {
		var constructor = hope.get(someClass);
		if (!constructor) throw TypeError(this+".as("+someClass+"): class not found");
		var method;
		if (typeof arguments[1] === "string") {
			method = arguments[1];
			args = arguments[2];
		} else {
			var method = as.caller.name || as.caller._name;
		}
		method = constructor.prototype[method];
		if (typeof method === "function") {
			return method.apply(this, args);
		}
	},

	toString : function() {
		var c = this.constructor, ref = c.toRef();
		if (this === c.prototype) return "["+ref+".prototype]";
		return "[a "+ref+"]";
	}	
});

// manually set up the prototype->constructor relationship
Class.prototype.constructor = Class;


//
// static class methods/properties
//
hope.extend(Class, {
	id : "Class",
	isAClass : true,
	toRef : function(){return this.id},
	
	// initialize new Classes
	initClass : function() {},
	
	// Create the constructor function for a new subclass.
	//	Assigns it to `options.constructor` and returns it.
	//	Assumes that at @options is defined.
	makeSubclassConstructor : function(id, options) {
		// We create the constructor in an `eval()` to make debugging in Firebug easier.
		//NOTE: there is no significant time difference in IE or WebKit when doing this via eval
		eval(
			"options.constructor = function "+id.toIdentifier()+"() {\n"
				// bail immediately if creating a new prototype
				+ "if (arguments[0] === '__CREATING_SUPERCLASS__') return this;\n"
				// call the init function
				+ "var result = this.init.apply(this, arguments);\n"
				+ "return result || this;\n"
			+ "}"
		);
		return options.constructor;
	},

	// Create a prototype for a new subclass.	
	makeSubclassPrototype : function(id, options) {
		return (options.prototype = new this("__CREATING_SUPERCLASS__"));
	},
	
	// extend the prototype
	extend : function(props) {
		return this.prototype.extend(props);
	},
	
	extendIf : function(props) {
		return this.prototype.extendIf(props);
	}
});

// make all Classes and instances observable
Observable.mixinTo(Class);


Script.loaded("{{hope}}Class.js");
});// end Script.require()

