/* Base-line functionality for the {{hope}} system. */

(function(window){// begin hidden from global scopes

var hope = (window.hope || (window.hope = {}));

var _slice = Array.prototype.slice;
var _concat = Array.prototype.concat;


// Convert arguments from the calling function to a proper Array.
//	@index is array index to start at, defaults to 0.
//
//	Call as:
//		function someFunc(that,has,variable,arguments,etc) {
//			var args = $args();			// array starting at argument # 0
//			var someArgs = $args(2);	// array starting at argument # 2
//		}
window.$args = hope.$args = function $args(index) {
	return _slice.call($args.caller.arguments, index||0);
}



// Manually set the @prototype of an EXISTING @object to some other object.
// @returns @object.
//
// NOTE: won't work in IE!
hope.setProto = function(object, prototype) {
	object.__proto__ = prototype;
	return object;
}


// Apply a single property descriptor or normal @value to some @object.
//
// 	This has a special check for subclases of our Descriptor class, if it finds one:
//		- If the Descriptor has an `.init()` method, we call that to do the hookup.
//		- If not, we uses Object.defineProperty() to hookup.
//	Otherwise we just assign the property value.
//
// TODO: this will NOT pick up getters/setters which have already been applied to an object
//			which means it's NOT good for situations where we're adapting to native objects
//			(such as for List or Tag) by assigning prototype.  ???
//
// TODO: make functions non-enumerable if we can?
hope.extendProperty = function define(object, key, value) {
	if (value instanceof Descriptor) {
		delete object[key];
		if (value.init) value.init(object, key);
		else Object.defineProperty(object, key, value);
	} else {
		// If a function, make sure it has a `.name` or set it's `._name`
		//	This is so we can do `object.as(Class...)` and get the function name right.
		if (typeof value === "function" && !value.name && !value._name) value._name = key;
		object[key] = value;
	}
}

// Add all enumerable properties of @src to @object.
//	Uses `hope.extendProperty()` to do the actual hookup.
hope.extend = function extend(object, src) {
	if (object && src) for (var key in src) {
		hope.extendProperty(object, key, src[key]);
	}
	return object;
}

// Add all enumerable properties of @src to @object,
//	skipping properties which are already defined on @object.
//	Uses `hope.extendProperty()` to do the actual hookup.
hope.extendIf = function extendIf(object, src) {
	if (object && src) for (var key in src) {
		if (object.hasOwnProperty(key) || object[key] !== undefined) continue;
		hope.extendProperty(object, key, src[key]);
	}
	return object;
}

// Add all properties present in @keys of @src to @object,
//	skipping properties which are already defined on @object.
//	Uses `hope.extendProperty()` to do the actual hookup.
//
//	If @keys is not defined, uses all 'own' properties of @src.
hope.extendKeys = function extendKeys(object, src, keys) {
	if (!object || !src) return object;
	// default to all unique properties of src
	if (!keys) keys = Object.keys(src);
	var key, i = -1;
	while (key = keys[++i]) {
		if (object.hasOwnProperty(key) || object[key] !== undefined) continue;
		hope.extendProperty(object, key, src[key]);
	}
	return object;
}


// Variant of `hope.extend()` to be assigned to prototypes, 
//	to add ability to extend an instance via `this.extend()`.
//	Same hookup semantics as `hope.extend()`.
hope.extendThis = function(src) {
	if (this && src) for (var key in src) {
		hope.extendProperty(this, key, src[key]);
	}
	return this;
}

// Variant of `hope.extendIf()` to be assigned to prototypes, 
//	to add ability to extend an instance via `this.extendIf()`.
//	Same hookup semantics as `hope.extendIf()`.
hope.extendThisIf = function(src) {
	for (var key in src) {
		if (this.hasOwnProperty(key) || this[key] !== undefined) continue;
		hope.extendProperty(this, key, src[key]);
	}
	return this;
}


//
//	getter/setter hookup
//






// Define a getter on an object.
// If object already has a getter for the property, it will be replaced safely.
// If object already has a setter for the property, it will be preserved.
// If dontOverride is true and object already has a getter, old getter will be preserved.
//
// If you want to add both getter and setter, use `Object.defineProperty()`.
hope.defineGetter = function(object, property, getter, dontOverride) {
	var descriptor = Object.getOwnPropertyDescriptor(object, property), value;
	if (descriptor) {
		if (descriptor.get && dontOverride) return;
		delete descriptor.value;
		delete object[property];
	} else {
		descriptor = new Descriptor({get:getter});
	}
	Object.defineProperty(object, property, descriptor);
}


// Define a setter on an object.
// If object already has a setter for the property, it will be replaced safely.
// If object already has a getter for the property, it will be preserved.
// If dontOverride is true and object already has a setter, old setter will be preserved
//
// If you want to add both getter and setter, use `Object.defineProperty()`.
hope.defineSetter = function(object, property, setter, dontOverride) {
	var descriptor = Object.getOwnPropertyDescriptor(object, property), value;
	if (descriptor) {
		if (descriptor.set && dontOverride) return;
		delete descriptor.value;
		delete object[property];
	} else {
		descriptor = new Descriptor({set:setter});
	}
	Object.defineProperty(object, property, descriptor);
}


// Return getter defined for object[property], if one is defined.
// NOTE: this does NOT look up the prototype chain!
hope.lookupGetter = function(object, property) {
	var descriptor = Object.getOwnPropertyDescriptor(object, property);
	return (descriptor ? descriptor.get : undefined);
}

// Return setter defined for object[property], if one is defined.
// NOTE: this does NOT look up the prototype chain!
hope.lookupSetter = function(object, property) {
	var descriptor = Object.getOwnPropertyDescriptor(object, property);
	return (descriptor ? descriptor.set : undefined);
}



window.SINGLE_REF_PATTERN = /^[\w\d$]+$/;
window.SIMPLE_DOTTED_PATH_PATTERN = /^[\w\d$.]+$/;
hope.get = function get(scope, path) {
	if (arguments.length === 1) {
		path = scope;
		scope = window;
	}
	if (typeof path !== "string") return path;
	// if string starts with "window." it's a global reference
	if (path.indexOf("window.") === 0) {
		scope = window;
		path = path.substr(7);
	}
	// if it's a simple property name, just dereference
	if (SINGLE_REF_PATTERN.test(path)) {
		return scope[path];
	} 
	// if it's a set of simple property names, just dereference
	else if (SIMPLE_DOTTED_PATH_PATTERN.test(path)) {
		path = path.split(".");
		var key, i = -1;
		while (key = path[++i]) {
			if ((scope = scope[key]) == null) return;
		}
		return scope;
	}
	// otherwise try a scoped eval -- this lets us do complex functions, etc
	else {
		// NOTE: this try() is INCREDIBLY expensive in FF, not bad at all in WebKit
		// NOTE: this uses with(), which is janky.
		try {
			var ____VALUE___;
			eval("with(scope){____VALUE___ = "+path+"}");
			return ____VALUE___;

		} catch (e) {
			return undefined;
		}
	}
};


// Set some arbitrary path inside scope to value
// Adds empty objects along the way as necessary
hope.set = function set(scope, path, value) {
	if (arguments.length === 2) {
		value = path;
		path = scope;
		scope = window;
	}
	if (!scope) return;
	if (!SIMPLE_DOTTED_PATH_PATTERN.test(path)) throw TypeError("Can only set simple paths");
	
	path = path.split(".");
	// short circuit for single property
	if (path.length === 1) return scope[path[0]] = value;
	
	// otherwise iterate down property chain
	var i = -1, last = path.length-1, key;
	while (key = path[++i]) {
		if (i === last) return scope[key] = value;
		if (scope[key] == null) scope[key] = {};
		scope = scope[key];
	}
}



//
//	binding functions by reference
//
// bind by reference (preferably) or by direct binding
//	NOTE: if object is not passed, binds to 'this' when called for extra dynamic-ness
hope.bind = function(scope, method, boundArgs) {
	if (boundArgs && boundArgs.length === 0) boundArgs = null;
	if (typeof method === "function") {
		return function bound() {
			var boundScope = scope || this,
				args = (boundArgs != null ? _concat.apply(boundArgs, arguments) : arguments)
			;
			return method.apply(boundScope, args);
		}
	} else {
		return function bound() {
			var boundScope = scope || this,
				handler = boundScope[method],
				args = (boundArgs != null ? _concat.apply(boundArgs, arguments) : arguments)
			;
			if (typeof handler !== "function") return;
			return method.apply(boundScope, args);
		}
	}
}

// Return a function which binds a method defined on @scope by @name.
//	You can pass an arbitrary number of arguments.
hope.bindByReference = function(scope, name, arg1, arg2, etc) {
	var boundArgs = (arguments.length > 2 ? _slice.apply(arguments, 2) : null);
	return function bound() {
		var boundScope = scope || this,
			handler = boundScope[method],
			args = (boundArgs != null ? _concat.apply(boundArgs, arguments) : arguments)
		;
		if (typeof handler !== "function") return;
		return method.apply(boundScope, args);
	}
}



//
//	simple cookie getter/setter/clearer all in one
//

//  Get cookie under @name.
//	Pass @value to set cookie value.  
//		- Pass `@value == ""` or `@value == null` to clear the cookie.
//		- Javascript objects will be converted to/from JSON (this will break with complex objects).
//		- All other values will be converted to string and `escaped()`/`unescaped()` automatically.
//	Pass @expires as Date to set expires for cookie.
//
//	NOTE: ALWAYS sets on root path of the current domain ("/").
function _getRawCookie(name) {
	if (!document.cookie) return;
	var match = document.cookie.match(new RegExp(name+"=([^;]*)"));
	return (match ? match[1] : undefined);
}
hope.cookie = function(name, value, expires) {
	var currentValue = _getRawCookie(name);

	// getting
	if (arguments.length === 1) {
		if (typeof currentValue === "string") {
			var value = unescape(currentValue);
			if (value.startsWith("{") && value.endsWith("}")) value = JSON.parse(value);
			return value;
		}
	} 
	// setting/clearing
	else {
		if (value == null) 					value = "";
		else if (typeof value == "object") 	value = JSON.stringify(value);
		else if (typeof value !== "string")	value = ""+value

		// don't change if already the same as what's set now
		if (value === currentValue && !expires) return;
		
		// if clearing, set expires to long time ago
		if (value == "") expires = "; expires=Thu, 01 Jan 1970 00:00:00 GMT";
		// otherwise convert date to expires string
		else if (expires instanceof Date) expires = "; expires="+expires.toGMTString();

		document.cookie = name + "=" + escape(value) + (expires||"") + "; path=/";
		return hope.cookie(name);
	}
}

})(window);// end hidden from global scope
