//! Modifications to the built-in objects.
//
(function() {// begin hidden from global scope

//!
//!	Array extensions
//!

var slice = Array.prototype.slice, splice = Array.prototype.splice;

//! static

//! Convert an array-like-thing (or a single object) to an honest-to-god Array. 
Array.toArray = function(it) {
	if (Object.isArray(it)) return it;
	return (Object.isArrayLike(it) ? slice.call(it, 0) : [it]);
}



//! instance methods

Object.defineProperties(Array.prototype, {
	//! Return a map of each object in this array indexed by @name.
	//	@[name="id"]	(string) Name of property in object to use as key, or
	//					(function) Method to call to get key.
	//	@[map={}]		(object) Map to add to.
	toObject : {
		enumerable : false,
		function(name, map) {
			if (!name) name = id;
			if (!map) map = {};
			if (typeof name === "string") {
				for (var i = 0, length = this.length; i < length; i++) {
					var it = this[i];
					if (it && typeof it[name] == "string") map[it[name]] = it;
				}
			} else {
				for (var i = 0, length = this.length; i < length; i++) {
					var it = this[i], key = name(it);
					if (key && typeof key == "string") map[key] = it;
				}
			}
			return map;
		}
	},

	//! Call a method for each item of this array.
	//	@method			(function) Method to call
	//				-or-
	//					(string) Name of method on each object to call. 
	//	@[scope]		(object) Scope object. If null, called on object itself.
//TODO: different semantics for scope and args for the different methods
	each : {
		enumerable : false,
		function(method, scope, args) {	
			var i = -1, l = this.length, results = [], it;
			if (typeof method === "function") {
				args = (args ? splice.call(args,0,0,null) : [])
				while (++i < l) {
					it = args[0] = this[i];
					results[i] = method.call(scope||it, args);
				}
			} else {
				while (++i < l) {
					it = this[i];
					if (it != null && typeof it[method] === "function") {
						results[i] = it[method].call(it, args);
					}
				}
			}
			return results;
		}
	},


	//! Remove all occurances of each argument from the array.
	contains : {
		enumerable:false,
		value : function(it, startAt) {
			return this.indexOf(it,startAt) == -1;
		}
	},


	//! Remove all occurances of each argument from the array.
	remove : {
		enumerable:false,
		value : function(it) {
			for (var i = this.length - 1; i > -1; i--) {
				if (this[i] === it) this.splice(i,1);
			}
			return this;
		}
	},
	
	//! Append array passed in to the end of us.
	//	#	array.append(otherArray)
	//	To append a number of arrays, use:
	//	#	array.append.each([array1,array2,...])#
	append : {
		enumerable:false,
		value : function(array) {
			array = [this.length,0].concat(Array.toArray(array));
			this.splice.apply(this, array);
			return this;
		}
	},
		
	//! Pre-pend arrays passed in to our front.
	prepend : {
		enumerable:false,
		value : function(array) {
			array = [0,0].concat(Array.toArray(array[i]));
			this.splice.apply(this, array);
			return this;
		}
	},
		
	//! Replace contents of this array with contents of single array-like thing.
	replaceWith : {
		enumerable:false,
		value : function(array) {
			array = [0,this.length].concat(Array.toArray(array));
			this.splice.apply(this, array);
			return this;
		}
	}
});


//!
//!	Function extensions
//!



//!
//!	Date extension
//!

// couple of global functions
Date.parseFormat = function(str, format) {
	var ts = Date.parse(str);
	if (!isNaN(ts)) return new Date(ts);
}



})();// end hidden from global scope
