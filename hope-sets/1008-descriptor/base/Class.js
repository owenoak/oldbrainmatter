
//TODO: convert to module format?
//TODO: can we make this work to load w/o regard to order, and/or reload?
Loader.loaded("Class", function(global){

global.SKIP = "-SKIP-";

//TEST: can name be dotted?
global.Class = function Class(name, classProps) {
	// if global call, return the specified class
	if (this == global) return Class.byId(name, classProps);
	
	// return immediately if in an initializer
	if (name == null || name == SKIP) return this;
	
	// slightly hacky: 
	NewClass = function () {
		// if called statically, return instance by id
		if (this == global) {	
			return (NewClass.byId ? NewClass.byId.get.apply(NewClass,arguments) : undefined);
		}
		// make a cache object, whether creating prototype or instance
		this._makeCache();
		// if making prototype, don't call onCreated
		if (arguments[0] === SKIP) return this;
		
		// fire "create" event, which sets things up internally
		this.fireEvent("create", arguments);
		// fire "created" event
		this.fireEvent("created");
	}
	
	NewClass.name = name;						// remember class name
	NewClass.gid = "global.Classes."+name;		// global eval() string for the class
	global.Classes[name] = NewClass;			// register in list of classes
	
	var Super = Class(classProps.Super, Class);
}


// registry of Classes (and Plugins?)
global.Classes = {Class : Class};



Object.apply(Class, {
	name : "Class",
	Super : null,
	collection : global.Classes,

	// find a class by id or pointer
	byId : function(it, defaultVal) {
		return (typeof it === "string" && this.collection ? this.collection[it] : it) || defaultVal;
	}
});


Class.prototype = {};
Object.defineProperties(Class.prototype, {

	//! Make our cache object, called when instance or prototype is first created.
	//	Override to make a nested cache or something like that.
	_makeCache : {
		enumerable : false,
		value : function() {
			return O.defineProperty(this, "_",
				{ 	enumerable : false,
					value:Object.protoClone(this.constructor.prototype._)
				});
		}
	},

	//! "Smart" define of map of properties on an object.  Differences from O.defineProperties():
	//		- if descriptor doesn't quack like an object constructor, just assigns the value
	//		- if descriptor.export is set, sets constructor.exports to 
	//		- if descriptor has both .value and .setter, 
	//			- creates it._ (as protoclone of it.constructor.prototype._ )
	//			- assigns value to it._[prop]
	//			- deletes desc.value
	define : { 
		enumerable : false,
		value : function define(map) {
			for (var prop in map) {
				var desc = map[prop], 
					hasValue = desc.hasOwnProperty("value") 
					hasGetter = desc.hasOwnProperty("set"),
					value = desc.value
				;
//TODO: methods are never enumerable
				if (desc.constructor !== Object || !(hasValue || hasSetter)) {
					this[prop] = desc;
				} else {
					// if has value and setter, remove the value and squirrel it away
					if (hasValue && hasSetter) {
						delete desc.value;
						if (this._
						if (!this._) this._ = O.protoClone(this.constructor.prototype._);
						this._[prop] = value;
					}
					O.defineProperty(this, prop, desc);
		
					// put value back so descriptor remains unchanged
					if (hasValue && hasSetter) desc.value = value;
				}
			}
			return this;
		
	}




});// end defineProperties




