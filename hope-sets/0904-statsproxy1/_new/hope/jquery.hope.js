/*
	statsproxy Web UI
	
	jQuery extensions
	
	Note that some of these functions can be found in other jQuery plugins;
		we're not using those because they're generally a lot more functionality than we need.
	
*/

// Copyright (c) 2009-2010, Gear Six, Inc.  Subject to a BSD-style
// license whose text is available at /license.txt on this machine

var splice = Array.prototype.splice;
var SETTERS = {};
function getSetter(key) {
	return SETTERS[key] = "set"+key.charAt(0).toUpperCase()+key.substr(1);
}
jQuery.extend({

	// flag to skip doing something
	SKIP : "__SKIP__",

	// Generic options setter for an object.
	//	For each key in options:
	//		If object has a "set_<key>" method, calls that.
	//		otherwise just assigns value if it is actually different than the default.
	//	Returns an object with only the values which actually changed, or undefined if nothing changed.
	setOptions : function(object, options, value) {
		if (!options) return;
		var deltas = {}, deltaFound = false;
		
		// if they passed a single key:value pair, convert to an object for the below
		if (typeof options === "string") {
			deltas[options] = value;
			options = deltas;
			deltas = {};
		}
		
		for (var key in options) {
			var value = options[key];
			// skip undefined values
			if (value === undefined) continue;

			var setter = SETTERS[key] || getSetter(key);
			if (object[setter]) {
				value = object[setter](value, key);
			} else {
				if (value !== object[key]) {
					object[key] = value;
				} else {
					value = undefined;
				}
			}
			if (value != undefined) {
				deltas[key] = value;
				deltaFound = true;
			}
		}
		return (deltaFound ? deltas : undefined);
	},
	
	// extend one object with another, but only for properties which are undefined on original object
	mixin : function(target, source) {
		if (target && source) {
			for (var key in source) {
				if (target[key] === undefined) target[key] = source[key];
			}
		}
		return target;
	},

	//! Bind a function to be called on a particular context.
	//	Similar to jQuery.proxy(), but:
	//		- allows you to pass a named method
	//		- passes through arguments passed to the bound call
	//
	bind : function(method, context) {
		if (typeof method === "string") {
			return function() {
				if (context[method]) return context[method].apply(context, arguments);
			}
		} else {
			return function() {
				return method.apply(context, arguments);
			}
		}
	},

	//! Convert function arguments to a proper array, starting at index.
	args : function(args, index, array) {
		if (!array) array = [];
		if (index == null) index = 0;
		for (; index < args.length; index++) {
			array[array.length] = args[index];
		}
		return array;
	},

	/** Walk down a 'path' of dotted.properties from a context object
		and return what you find.  Handles function calls as well (in an eval).
		NOTE: does not handle function calls with periods in their arguments!
		
		You can pass an array of paths and it will return the non-undefined values for each.
	*/
//REFACTOR: rename $.path.get(), $.path.set(), $.path.clear() ?
//REFACTOR - merge with parseExpression
	getPath : function get(path, context, stopAtParent) {
		if (context == null) context = window;
		if (path instanceof Array) {
			var results = [];
			for (var i = 0; i < path.length; i++) {
				var it = $.getPath(path[i], context);
				if (it !== undefined) results.push(it);
			}
			return results;
		}

		if (typeof path !== "string") return path;

		path = $.trim(path).split(".");
		var step, i = 0, last = (stopAtParent ? path.length - 1 : path.length), index;
		while (i < last) {
			step = path[i++];

			// if there are parenthesis, try an eval
			if (step.indexOf("(") > -1) {
				try {
					context = eval("context."+step);
				} catch (e) {
					return;
				}
			}
			// try to find as a string
			else if (context[step] != null) {
				context = context[step];
			} 
			// try to find as a number
			else {
				index = parseInt(step);
				if (""+index === step && context[index] != null) {
					context = context[step];		
				} else {
					return;
				}
			}
		}
		return context;
	},
	
	/** Walk down a 'path' of dotted properties from a context object
		and set the ultimate thing to <value>.
	*/
//REFACTOR
	setPath : function(path, value, context) {
		var it = $.getPath(path, context, true);
		if (!it) return;
		var key = path.substr(path.lastIndexOf(".")+1);
		if (it.set) 	it.set(key, value);
		else			it[key] = value;
		return value;
	},

	deletePath : function(path, context) {
		var it = $.getPath(path, context, true);
		if (!it) return;
		var key = path.substr(path.lastIndexOf(".")+1);
		delete it[key];
	},
	
	
//REFACTOR - review all Array stuff, use this api exclusively
	list : {
		indexOf : function(array, value) {
			if (!array) return -1;
			for (var i = 0, length = array.length; i < length; i++) {
				if (array[i] == value) return i;
			}
			return -1;
		},
		
		contains : function(array, value) {
			return $.list.indexOf(array, value) !== -1;
		},

		//! Alternative to $.each specifically for working with arrays.
		//		- takes a context, which will be 'this' in the function calls
		//		- method can be a string, in which case we'll attempt to call 
		//			the method with that name on each item in the list
		//		- returns an array of the results
		forEach : function(items, method, context) {
			if (!items || items.length === 0) return [];
			var results = [], i = 0, length = items.length, item;
			if (typeof method === "string") {
				for (; i < length; i++) {
					item = items[i]; if (item == null) continue;
					var itemMethod = item[method];
					if (itemMethod) results[i] = itemMethod.apply(context||item, [item, i, this]);
				}
			} else {
				for (; i < length; i++) {
					item = items[i]; if (item === undefined) continue;
					results[i] = method.apply(context||item, [item, i, this]);
				}			
			}
			return results;
		},
		
		// return a new list of all items where method is truthy
		where : function(items, method, context, _returnFirst) {
			if (!items || items.length === 0) return [];
			var results = (_returnFirst ? null : []), 
				i = 0, length = items.length, 
				item, result, isString = typeof method === "string"
			;
			for (; i < length; i++) {
				item = items[i]; if (!item) continue;
				var itemMethod = (isString ? item[method] : method);
				if (itemMethod) result = itemMethod.apply(context||item, [item, i, this]);
				if (result) {
					if (_returnFirst) {
						if (result) return item;
					} else {
						results.push(item);
					}
				}
			}
			return results;
		},
		
		firstWhere : function(items, method, context) {
			return $.list.where(items, method, context, true);
		},



		// For an existing list of items and some "protoItems" (anonymous objects which we
		//	want to turn into items), update existing items and create new ones as necessary.
		//
		// Modifies the original list -- adding new objects, removing ones not in protoItems.
		//
		// Returns an object with:   missing, updated, created  as arrays of what happened.
		//
		updateOrCreate : function(protoItems, itemList, itemMap, itemClass) {
			itemClass = $.getClass(itemClass);
			var results = {
					missing : [].concat(itemList),
					updated : [],
					created : []
				}
			;
			
			$.forEach(protoItems, function(itemOptions) {
				// figure out the identifer for the itemOptions and see if we already have one
				var itemKey = itemClass.prototype.getIdentifier.apply(itemOptions),
					item = itemMap[itemKey]
				;
//console.warn(itemClass, itemKey, item);
				// if we already have an item - update it
				if (item) {
//console.debug("updating ",item);
					item.update(itemOptions);
					$.list.remove(results.missing, item);
					results.updated.push(item);
				}
				// didn't find one -- create it
				else {
					item = new itemClass(itemOptions);
					var index = $.list.indexOf(itemList, item);
					if (index === -1) itemList.push(item);
					
//console.debug("created ",item, itemKey, itemList);
					itemMap[itemKey] = item;
					results.created.push(item);
				}
			});
			
			// remove the missing items from our list
			$.forEach(results.missing, function(missing) {
				$.list.remove(itemList, missing);
				var key = missing.getIdentifier();
				delete itemMap[key];
			});
			
			return results;
		},
				
		//! Remove all occurances of an item from an array (or array-like thing).
		// Returns the array.
		remove : function(array, item) {
			var index;
			while ( (index = $.list.indexOf(array, item)) != -1) {
				array.splice(index, 1);
			}
			return array;
		},
	
		//! Remove all occurances of each item in items from an array (or array-like thing).
		// Returns the array.
		removeList : function(array, items) {
			$.each(items, function(index, item) {
				array.removeItem(item);
			});
			return array;
		},
	
		// Sort a list by a particular property of each item in the list.
		//
		// Pass true to convertToNumber to convert strings to numbers.
		sortBy : function(list, property, ascending, convertToNumber) {
			var aIsBigger = (ascending === false ? -1 : 1), bIsBigger = -1*aIsBigger;
			if (convertToNumber != true) {
				return list.sort(function(a,b) {
					var aVal = a[property], bVal = b[property];
					if (aVal == bVal) return 0;
					if (aVal > bVal) return aIsBigger;
					return bIsBigger;
				});
			} else {
				// sort as numbers
				return list.sort(function(a,b) {
					// try to convert to numbers, skipping if they don't convert cleanly
					var aVal = parseFloat(a[property]), bVal = parseFloat(b[property]);
					if (aVal == bVal) return 0;
					if (aVal > bVal) return aIsBigger;
					return bIsBigger;
				});			
			}
		},
	
		// return first object in an array where property == value
		//	if object[property] is a function, calls the function to determine object's "value"
		byProperty : function(list, property, value) {
			var index = this.indexByProperty(list, property, value);
			if (index === -1) return;
			return list[index];
		},

		// return index of first object where property == value
		//	if object[property] is a function, calls the function to determine object's "value"
		indexByProperty : function(list, property, value) {
			if (!list) return -1;
			for (var i = 0, length = list.length; i < length; i++) {
				var it = list[i], itemValue;
				if (it == null) continue;
				if (typeof property === "function") {
					itemValue = property.apply(it);
				} else {
					itemValue = it[property];
					if (typeof itemValue === "function") {
						itemValue = it[property]();
					}
				}
				if (itemValue == value) return i;
			}
			return -1;
		},
		
	
		// Given an array of objects, build an index to the array via a particular key.
		// If key is the name of a function, calls the function.
		// NOTE: does not do any uniqueness checking.
		makeIndex : function(array, key) {
			var map = {};
			for (var i = 0, length = array.length; i < length; i++) {
				var it = array[i], value;
				if (it == null) continue;
				value = (typeof it[key] === "function" ? it[key]() : it[key]);
				if (value != null) map[value] = it;
			}
			return map;
		},
		
		// Make sure a value is an array:
		//	- if null, return empty array
		//	- if a single item, enclose it in an array
		//	- if an array, return that
		toArray : function(it) {
			if (it == null) return [];
			if (it instanceof Array) return it;
			if (typeof it === "string") return it.split(",");
			return [it];
		}
	}
});

jQuery.forEach = $.list.forEach;



/** Array extensions. */
//REFACTOR - merge with $.list
jQuery.extend({
	array : {
		/** Return the first index of `it` in `array`. */
		indexOf : function indexOf(array, it) {
			for (var i = 0, len = array.length; i < len; i++) {
				if (array[i] == it) return i;
			}
			return -1;
		},

		/** Return true if `array` contains `it`. */
		contains : function contains(array, it) {
			return ($.array.indexOf(array, it) != -1);
		},
		
		
		/** Remove all occurances of `it` in `array`. */
		remove : function remove(array, it) {
			var index;	
			while ( (index = $.array.indexOf(array, it)) != -1) {
				array.splice(index, 1);
			}
			return array;
		}
	}
});


//REFACTOR - to $.list
if (!Array.prototype.indexOf) {
	Array.prototype.indexOf = function(it) {
		return $.array.indexOf(this, it);
	}
}





/** Hack:  define the ES5 Array.every method */
//REFACTOR - to $.list
if (!Array.every) {
	Array.every = function(array, method, context) {
		if (!array || !array.length) return true;
		for (var i = 0; i < array.length; i++) {
			if (!method.call(context, array[i])) return false;
		}
		return true;
	};
}





// debugging (especially in IE)
//REFACTOR - IE only?
function dir(it) {
	if (it == null) console.warn("it is null");
	for (var prop in it) {
		console.warn(prop+ ":" + it[prop]);
	}
}
