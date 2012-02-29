/*! Hope application framework, v 0.1					See: http://hopejs.com
 *	 *	MIT license.										See: http://hopejs.com/license

 *	Copyright (c) 2006-2009, Matthew Owen Williams.
 */

(function($, hope) {
// 
//		Begin hidden from global scope:
//

/** Create the base hope object and add some common utilty functions. */

$.extend({

	/** Base object of hope framework.
		This object is decorated by many other files to provide common routines, etc.
	 */
	hope : {},


	//
	//	constants
	//
	
	/** Flag indicating that a default operation should be skipped. */
	SKIP : "skip",



	// list of "setXxx" strings for getting property accessors quickly
	SETTERS : {},
	getSetter : function(key) {	
		var setter = "set"+key.charAt(0).toUpperCase()+key.substr(1);
		return ($.SETTERS[key] = setter);
	},

	
	//
	// Utility methods added directly to jQuery
	//
	
	
	/** Convert an array of function arguments (or anything else with a length property)
		to a proper Array.
		
		@param	args		Set of array arguments.
		@param	[index=0]	Index to start copying arguments.
		@param	[prefix]	Array of values to add at START of array (before args)
		@param	[suffix]	Array of values to add at the END of the array.
	 */
	args : function args(args, index, prefix, suffix) {
		var results = [];
		if (prefix && prefix.length)	results.push.apply(results, prefix);

		if (args && args.length) {
			if (index) args = Array.slice(args, index);
			results.push.apply(results, args);
		}
		
		if (suffix && suffix.length) 	results.push.apply(results, suffix);
		return results;
	},
	
	
	/** Bind a function to some object, so when the returned function is called, `this` will be `target`.
		@param	method		Method to bind or name of method on context to bind.
		@param	target		Object to bind the method to.
		@param	[boundArgs]	Optional arguments array to pass to bound function.
		@returns			Bound function.
	 */
	bind : function bind(method, target, boundArgs) {
		if (typeof method == "string") {
			if (typeof target[method] == "function") method = target[method];
		}
		if (typeof method != "function") throw TypeError("Method '"+method+"' is not defined");
		
		return function boundMethod() {
			if (boundArgs) {
				var combinedArgs = $.args(arguments, 0, boundArgs);
			} else{
				var combinedArgs = arguments;
			}
			return method.apply(target, combinedArgs);
		}
	},
	
	/** Make a prototype-based clone of the target object. 
		@param target		Target object to clone.
		@param [properties]	Object of properties to add to the clone.
	*/
	protoClone : function protoClone(target, properties) {
		function cloner(){};
		cloner.prototype = target;
		var cloned = new cloner();

		// if they passed any arguments, extend the clone with the arguments
		if (arguments.length > 1) {
			target = cloned;
			$.extend.apply($, arguments);
		}
		return cloned;
	},
	
	
	/** Return a new object with all keys of properties which are different than target.
		If all properties are identical, returns null.
	 */
	deltas : function deltas(target, properties) {
		var deltas = {}, deltaFound = false;
		for (var key in properties) {
			if (properties[key] != target[key]) {
				deltas[key] = properties[key];
				deltaFound = true;
			}
		}
		return (deltaFound ? deltas : null);
	}
	

});	// end $.extend



/** Return an object of {name:value} pairs for each attribute of the first element.
	Returns `undefined` if no elements in this list.
 */
$.fn.attrs = function() {
	var first = this[0];
	if (!first || !first.attributes.length) return undefined;
	var attrs = {};
	$.each(first.attributes, function(index, attr) {
		attrs[attr.name] = attr.value;
	});
	return attrs;
}



/** Define the ES5 Array methods directly on the Array.prototype if they are not already defined. 

	TODO: Do this by loading a script file, so we don't pay the download penalty if defined?
*/
if (!Array.prototype.forEach || !Array.forEach) {

	function iterate(array, method, context) {
		var results = [];
		if (array && array.length) {
			for (var i = 0, length = array.length; i < length; i++) {
				results[i] = (context ? method.apply(context, [array[i], i, this]) 
									  : method(array[i], i, this)
							);
			}
		}
		return results;
	}
	function filter(array, method, context, _action) {
		var results = [];
		if (array && array.length) {
			for (var i = 0, length = array.length, result; i < length; i++) {
				result = (context ? method.apply(context, [array[i], i, this]) 
								  : method(array[i], i, this)
							);
				if (result) results[results.length] = array[i];
			}
		}
		return results;
	}
	function every(array, method, context) {
		if (array && array.length) {
			for (var i = 0, length = array.length, result; i < length; i++) {
				result = (context ? method.apply(context, [array[i], i, this]) 
								  : method(array[i], i, this)
							);
				if (!result) return false;
			}
		}
		return true;
	}
	function some(array, method, context) {
		if (array && array.length) {
			for (var i = 0, length = array.length, result; i < length; i++) {
				result = (context ? method.apply(context, [array[i], i, this]) 
								  : method(array[i], i, this)
							);
				if (result) return true;
			}
		}
		return false;
	}
	
	if (!Array.forEach) Array.forEach = iterate;
	if (!Array.map) 	Array.map = iterate;
	if (!Array.filer) 	Array.map = filter;
	if (!Array.some) 	Array.some = some;
	if (!Array.every) 	Array.some = every;
	
	var proto = Array.prototype;
	
	if (!proto.forEach) proto.forEach = function(m,c){return iterate(this, m, c) };
	if (!proto.map) 	proto.map = proto.forEach;
	if (!proto.filer) 	proto.map = function(m,c){return filter(this, m, c) };
	if (!proto.some) 	proto.some = function(m,c){return some(this, m, c) };
	if (!proto.every) 	proto.some = function(m,c){return every(this, m, c) };
}


/**** End hidden from global scope: *****/
})(jQuery);
