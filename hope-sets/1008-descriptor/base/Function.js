//! Function extensions.
//
(function(global) {// begin hidden from global scope


//!
//!	Globals
//!

//! Convert arguments from calling function to a proper Array.
//	@[startAt=0]	(number) Index at which to start copying arguments.
//	@[prefix]		(array or any) Array of values or single value to put BEFORE returned args. 
//	@[suffix]		(array or any) Array of values or single value to put AFTER returned args.
//
//	#				function foo() {	return $args(1, "before",["after","args"]) }
//	#				it = foo(1,2,3);	
//	#			=>	["before",2,3,"after","args"]
function $args(startAt, prefix, suffix) {
	var args = slice.call($args.caller.arguments, startAt||0);
	if (prefix)	args.prepend(prefix);
	if (suffix) args.append(suffix);
	return args;
}
global.$args = $args;


//!
//!	Static extensions
//!



//!
//! Instance methods
//!


//! Bind a function to always be called in a certain scope
if (Function.prototype.bind) {
	Object.defineProperties(Function.prototype, "bind", {
		enumerable : false,
		function bind(scope) {
			var method = this, boundArgs = (arguments.length === 1 ? null : $args(1));
			return function bound() {
				args = (boundArgs ? boundArgs.concat($args() : arguments);
				return method.apply(scope, args);
			}
		}
	})
}


//! Execute this method for each item in array or object, passing bound arguments.
//	Returns array of results (if passed array) or map of results (if passed object).
Function.prototype.each = function(set) {
	if (!set) return;
	var args = $args(1), results;
	if (Object.isArrayLike(set)) {
		results = [];
		for (var i = 0, l = set.length; i < l; i++) {
			results[i] = this.apply(set[i], args);
		}
	} else {
		results = {};
		for (var key in set) {
			results[key] = this.apply(set[key], args);
		}	
	}
}




})(window);// end hidden from global scope
