(function(global){// begin hidden from global scope

var Object = global.Object;


//!
//!	Constants
//!
var	MERGE		= "-MERGE-",
	OVERWRITE	= "-OVERWRITE-";



//!
//!	EC5 Standard Methods
//!

//! Define a single property according to a property descriptor.
//	@it			Object to add property to
//	@prop		Property name
//	@desc		Property descriptor with:  { value, get, set, writable, enumerable, configurable }
// NOTE: this implementation doesn't handle writable, enumerable, configurable
if (!Object.defineProperty) {
	Object.defineProperty = function(it, prop, desc) {
		if (desc.value) {
			it[prop] = desc.value;
		} else {
			if (desc.set) it.__defineSetter__(prop, desc.setter);
			if (desc.get) it.__defineSetter__(prop, desc.setter);
		}
		return it;
	}
}


//! Define a map of property descriptors on an object.
//	@it			Object to add properties to.
//	@map		Map of property descriptors.
if (!Object.defineProperties) {
	Object.defineProperties = function(it, map) {
		for (var prop in map) {
			Object.defineProperty(it, prop, map[prop]);
		}
		return it;
	}
}


//! return all enumerable properties DIRECTLY DEFINED on @it.
if (!Object.keys) {
	Object.keys = function(it) {
		var keys = [];
		for (var key in it) {
			if (is.hasOwnProperty(key)) keys[keys.length] = key;
		}
		return keys;
	}
}


//!
//! Object extensions
//!

//! static type checkers

var toString = Object.prototype.toString;

//! Return true if @it is a valid date.
Object.isDate = function(it) {
	return (toString.call(it) === "[Object Date]" && isFinite(it));
}


//! Return true if @it is a simple Object
Object.isObject = function(it) {
	return (toString.call(it) === "[Object Object]");
}

//! Return true if @it is an honest-to-god Array.
Object.isArray = function(it) {
	return (toString.call(it) === "[Object Array]");
}


//! Return true if object looks like it might be an array.
Object.isArrayLike = function(it) {
	return (it != null && it.length && typeof it !== "string");
}


//! general utilities



//! Given a map, return an array of the values of the map.
//	@map			Map to pull values from.
//	@[array=[]]		Array to add to.
Object.toArray = function(map, array) {
	if (!array) array = [];
	if (map) {
		for (var key in map) {
			array[array.length] = map[key];
		}
	}
	return array;
}

//! Apply Fields or properties in @fieldMap to @it.
//	@it			Object to add to.
//	@fieldMap	Map of simple values or Fields to apply to it.
//	@mode		pass MERGE to skip overwriting properites of @it that are already defined.
Object.applyFields(it, fieldMap, mode) {
	if (fieldMap instance of FieldSet) return FieldSet.applyTo(it);
	var merge = (mode === MERGE);
	for (var name in fieldMap) {
		if (merge && fieldMap[name] !== undefined) continue;
		var field = fieldMap[name];
		if (field.__applyProperty__) {
			if (!field.name) field.name = name;
			field.__applyProperty__(it);
		} else {
			it[name] = fieldMap[name];
		}
	}
	return it;
}


//! Add all enumerable properties of @source to @it.
Object.overwrite = function apply(it, source) {
	if (!it) return;
	for (key in source) it[key] = source[key];
	return it;
}


//! Add all enumerable properties of @source, etc WHICH ARE NOT ALREADY PRESENT ON @it to @it.
Object.merge = function merge(it, source) {
	if (!it) return;
	for (key in source) {
		if (it[key] === undefined) it[key] = source[key];
	}
	return it;
}


//! Add a (non-enumerable) cache object (@it._) to @it.
//	Inherits (shallowlly) from @it.constructor.prototype._ .
//	NOTE: this should really happen on construct, since our super's _ must be set up before ours
Object.makeCache = function(it) {
	Object.defineProperty(it, "_", {
		value : Object.protoClone(it.constructor.prototype._),
		enumerable : false
	});
	return it;
}



//! Make a prototype-based clone of the target object. 
//	@[it]			Object to clone (can be null).
//	@[fields]		Fields to add to the clone.
Object.clone = function protoClone(it) {
	if (it && typeof it.clone === "function") return it.clone();
	function cloner(){};
	cloner.prototype = it;
	return new cloner();
}


})(window);//end hidden from global scope
