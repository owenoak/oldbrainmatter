/*
	Misc. small, generic utilites.
	NOTE ON UPGRADE:  it's possible that some of this stuff may break when upgrading Ext!

	Copyright (c) 2010, MapR Technology.  All rights reserved.
 */


(function() {	// begin hidden from global scope


// utility function namespace root
Ext.namespace("util");



/*** 
 *
 * Native object extensions
 *
 ***/

// Define array.forEach() and array.map() if they're not already defined
var ap = Array.prototype;
if (!ap.forEach) {
	ap.forEach = ap.map = function(callback, context) {
		var results = [], i = -1, length = this.length;
		while (++i < length) {
			if (i in this) results[i] = callback.call(context, this[i], i, this);
		}
		return results;
	}
}

// function.bind binds function scope and currys any arguments passed in
var slice = Array.prototype.slice;

Function.prototype.bind = function(target, arg1, arg2, etc) {
	var method = this;
	if (arguments.length > 1) {
		var boundArgs = slice.call(arguments, 1);
		return function(){ 
			var args = boundArgs.concat(slice.call(arguments, 0));
			return method.apply(target, args)
		};
	} else {
		return function(){ return method.apply(target, arguments) };
	}
}





/*** 
 *
 * Random useful javascript stuff
 *
 ***/


// return true if object passed in is a simple Javascript object ( new Object() or {} )
util.isSimpleObject = function(it) {
	return it.constructor === Object;
}

// Given a config object and optional defaults, create a new clone object which merges them.
// NOTE: you generally won't pass in clone, but you can if you want...
util.mergeDefaults = function(config, defaults, clone) {
	if (!clone) clone = {};
	if (config) {
		for (var prop in config) {
			clone[prop] = config[prop];
		}
	}
	if (defaults && defaults !== config) {
		for (var prop in defaults) {
			if (clone[prop] === undefined) clone[prop] = defaults[prop];
		}
	}
	return clone;
}


// "inherit" an object of properties from a superclass object
// 	pass an <property> and <map> of new properties
//	finds superclass[<property>] and merges its <map> with yours
//	when merging maps, if local item has "inherit=true" and a simple object, 
//		merges super properties and local properties
util.inherit = function(object, property, map) {
	object[property] = map;

	var superMap = object.constructor.prototype[property];
	if (!superMap) return;

	// add all things in superMap to localMap
	//	if they already exist, merge if possible
	for (var key in superMap) {
		var localItem = map[key],
			superItem = superMap[key]
		;
		// if no local version
		if (!localItem) {
			if (util.isSimpleObject(superItem)) {
				map[key] = Ext.apply({}, superItem);
			} else {
				map[key] = superItem;
			}
		}
		// if both local and super versions
		else {
			// if a simple object and .inherit == true, merge properties
			if (util.isSimpleObject(localItem) && localItem.inherit == true) {
				map[key] = Ext.applyIf(localItem, superItem);
			} else {
				map[key] = localItem;
			}
		}
	}
}



//  Given a FLAT object, make a clone of it.
//	Pass true to protoClone to make a prototype-based clone.
//	If object is null, returns undefined.
util.clone = function(object, protoClone) {
	if (object == null) return;
	if (protoClone) return util.protoClone(object);

	var clone = {}, key;
	for (key in object) {
		clone[key] = object[key];
	}
	return clone;
}

// make a prototype-based clone of an object
util.protoClone = function(object) {
	function cloner() {};
	cloner.prototype = object;
	return new cloner();
}


// Given an object, return an array of all of the keys.
util.keys = function(object) {
	var keys = [];
	if (object) {
		for (var key in object) {
			keys[keys.length] = key;
		}
	}
	return keys;
}


// For two FLAT objects, return a third object which is represents the differences between the two.
//	- if a property in newObject is different, result[prop] === newObject[prop]
//	- if there is a property in original that is not in newObject, result[prop] === undefined
//	- if the two are exactly the same, returns null
util.deltas = function(original, newObject) {
	if (!original) return util.clone(newObject);
	if (!newObject) return null;
	
	var clone = util.clone(newObject);
	for (var key in original) {
		if (newObject[key] === original[key]) 	delete clone[key];
		else if (! (key in newObject)) 			clone[key] = undefined;
	}
	return (util.keys(clone).length ? clone : null);
}


// Given an array of objects, return a map of <property> -> <object>
//	if property is a string, that's the name of the property to use for the key
//	if a function, that will be called w/each object to get the key
util.getMap = function(array, property) {
	var map = {}, i = -1, it;
	if (typeof property === "string") {
		while (it = array[++i]) {
			map[it[property]] = it;
		}
	} else {
		while (it = array[++i]) {
			map[property(it)] = it;
		}
	}
	return map;
}


// Given a map of <key> -> <object>, make a reverse map of  <object.mapping>] -> <object>
//	<mapping> is the name of the mapping property on each object
//	if <keyProperty> is defined, <object[keyProperty]> will be set to <key>
util.reverseMap = function(map, mapping, keyProperty) {
	var reverseMap = {}, key, object;
	for (var key in map) {
		object = map[key];
		reverseMap[object[mapping]] = object;
		if (keyProperty) object[keyProperty] = key;
	}
	return reverseMap;
}



// Given a map of objects, return the items in the map as an array of object.
//	If property is a string, the key will be inserted on the object as that property.
//	If massage() is a function, that will be run on each object in turn.
//	If <list> is passed, we'll add to that list rather than creating a new one
util.mapToList = function(map, property, massage, list) {
	if (!list) list = [];
	var it, key;
	for (key in map) {
		it = map[key];
		if (it == null) continue;
		if (property) it[property] = key;
		if (massage) massage(it);
		list[list.length] = it;
	}
	return list;
}


//	if asArray is true, converts to [  [fieldname,value], [fieldname,value], ... ]
//	if asStrings is true, all values converted to strings (via x+"")
//	if asJSON is true, entire output converted to JSON string
util.crossMap = function(inputMap, translationMap, mapping, asArray, asStrings, asJSON) {
	var output = {};
	for (var key in inputMap) {
		var value = inputMap[key],
			field = translationMap[key]
		;
		if (asStrings) value = value + "";
		
		if (field) {
			output[field[mapping]] = value;
		} else {
			console.warn("util.crossMap(): field "+key+" not found");
		}
	}
	if (asArray) {
		var outputList = [];
		for (var key in output) {
			outputList.push([key, output[key]]);
		}
		output = outputList;
	}
	if (asJSON) output = Ext.util.JSON.encode(output);
	return output;
}


/*** 
 *
 * Ext.Record convenience functions
 *
 ***/
 
util.Record = {

	// "pluck" a single property from each in a list of Records
	pluck : function(recordList, property) {
		var results = [], i = -1, record;
		if (recordList && recordList.length) {
			while (record = recordList[++i]) {
				results[i] = record.get(property);
			}
		}
		return results;
	}
}


/*** 
 *
 * Walking a "dotted.path.string" to get, set or clear a value.
 *
 ***/

util.path = {
	// get value at a key
	get : function get(object, path) {
		if (object == null) return;
		path = path.split(".");
		var last = path.length, key, i = 0;
		while (i < last) {
			var key = path[i++];
			if (object[key] == null) return;
			object = object[key];
		}
		return object;
	},
	
	// set value at a key
	set : function set(object, path, value) {
		if (object == null) throw "util.path.set(): object must not be null";
		path = path.split(".");

		// walk to the parent of the key
		var last = path.length - 1, key, i = 0;
		while (i < last) {
			var key = path[i++];
			if (object[key] == null) object[key] = {};
			object = object[key];
		}
		
		// set the value
		key = path[i];
		return (object[key] = value);
	},
	
	// clear the value at a key
	clear : function(object, path) {
		if (object == null) throw "util.path.set(): object must not be null";
		path = path.split(".");

		// walk to the parent of the key
		var last = path.length - 1, key, i = 0;
		while (i < last) {
			var key = path[i++];
			if (object[key] == null) object[key] = {};
			object = object[key];
		}
		
		// clear the value
		key = path[i];
		delete object[key];
	}
};	// end util.path



// install stub window.console methods if they're not defined
if (!window.console) {
	function noop(){}
	window.console = {
		log : noop,
		debug : noop,
		info : noop,
		warn : noop,
		error : noop,
		group : noop,
		groupEnd : noop
	}
}




/*** 
 *
 * Math utilities
 *
 ***/
Math.range = function(min, value, max) {
	return Math.min(max, Math.max(min, value));
}




/*** 
 *
 * Formatting utilities
 *
 *	TODO:  merge these with Ext.util.Format somehow?
 *
 ***/

// format something according to a format string.
//	if format has a ":" in it, we treat the stuff before the colon 
//		as a transformer function util.formatters[transformer]
//	if there's a second colon, that indicates a suffix (eg: "%" or "gb" etc)
//
//	otherwise we just delegate to Ext.util.Format.number()
util.format = function(value, format) {
	var method = "number", suffix;
	// if format ends with "B", 
	if (format.indexOf(":") != -1) {
		format = format.split(":");
		method = format[0];
		suffix = format[2];
		format = format[1];
	}
	value = util.formatters[method](value, format);
	if (typeof suffix === "string") value += suffix;
	return value;
};




util.formatters = {
	number : function(value, format) {
		return Ext.util.Format.number(value, format);
	},
	
	percent : function(value, format) {
		return util.formatters.number(value, format);	
	},
	
	bytes : function(value, format) {
		value = Ext.num(value, NaN);
		if (isNaN(value)) return "";

		var pow = 0;
		while (value > 1024) {
			pow++;
			value /= 1024;
		}
		
		// no such thing as a half-byte
		if (pow == 0) format = "0";
		value = util.formatters.number(value, format);
		
		// if exactly 0, don't append the bytes label ("0" looks better than "0B")
		if (value == "0") return "0";
		
		return value + $msg.BYTES[pow];
	},
	
	// format input bytes amount to output bytes amount
	// format is :  <inputformat>2<outputformat>
	//	where format is one of "b,k,m,g,t,p,x,z,y,*"
	//	if outputformat is empty or "*" then we take use the smart "bytes" formatter
	BYTE_UNITS : {b:0, k:1, m:2, g:3, t:4, p:5, x:6, z:7, y:8, "*":"*"},
	b2b : function(value, format) {
		value = Ext.num(value, NaN);
		if (isNaN(value)) return "";

		format = (format||"").split("2");
		var inputPower =  (format[0] || "").charAt(0).toLowerCase(),
			outputPower = (format[1] || "").charAt(0).toLowerCase()
		;
		inputPower  = this.BYTE_UNITS[inputPower]  || "b";
		outputPower = this.BYTE_UNITS[outputPower] || "*";

		// go from input format to straight bytes
		while (inputPower-- > 0) {
			value *= 1024;
		}
		
		// if outputPower is null, use the smart byte formatter
		if (outputPower == "*") {
			return util.formatters.bytes(value, "0");	//XXX some way to pass this formatter?
		} 
		//	otherwise convert to a specific units
		var pow = outputPower;
		while (pow-- > 0) {
			value /= 1024;
		}
		return Math.round(value) + $msg.BYTES[outputPower];
	},
	
	// e
	mb2gb : function(value, format) {
		value = Ext.num(value, NaN);
		if (isNaN(value)) return "";

		value = value / 1024;
		return util.formatters.number(value, format);
	},
	

	HEARTBEAT_SECONDS : $tx("{{value}}s ago"),
	HEARTBEAT_MINUTES : $tx("{{value}}m ago"),
	
	// format a heartbeat value
	//	TODO: more than XXX minutes ago go to hours?
	heartbeat : function(value, format) {
		if (value < 120) {
			msg = this.HEARTBEAT_SECONDS;
		} else {
			value = this.HEARTBEAT_MINUTES;
			value /= 60;
		}
		value = util.formatters.number(value, format);
		return $msg.expand(msg, {value:value});
	}
}


/*** 
 *
 * html generation utilities
 *
 ***/

// generate a <span> that shows a 16x16 icon -- no frills
//	assumes that there's a css class "icon-<name>" already defined.
util.icon = function(name, cls, style) {
	return "<span class='mapr-icon icon-"+name+" "+(cls||"")+"' style='"+(style||"")+"'>"
				+ "&nbsp;"
			+ "</span>"
}




// DEBUG:  add a smarter .toString() to top-level Ext.Components and Classes
function toStringize(root) {
	if (!root) return;
	for (var key in root) {
		var it = root[key];
		if (typeof it === "function" && key.charAt(0) === key.charAt(0).toUpperCase()) {
			it.prototype.toString = new Function("return '"+key+" #'+(this.name||this.id)");
		}
	}
}

Ext.onReady(function() {
	// add toString routines to Ext components
	toStringize(Ext);
	toStringize(Ext.data);
	toStringize(Ext.form);
	toStringize(Ext.grid);
	toStringize(Ext.menu);
	toStringize(Ext.list);
	toStringize(Ext.tree);
	
	// add toString routines to Mapr components
	if (window.mapr) {
		toStringize(mapr.widgets);
		toStringize(mapr.widgets.filter);
	};
});

})();			// end hidden from global scope


