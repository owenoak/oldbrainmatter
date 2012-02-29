//!	Settable mixin
//
//	Use this along with Observer for setter semantics:
//		- always get properties directly
//		- use: set('prop','value',notify)	to set properties
//		- when property values actually change in set(), will notify 'changed'
//		- define setters on your object as simply "setFoo" and they will work with set()
//		- define a "setUKNOWN" method to do something special for setting a method that doesn't have a setters
//		- also handles hooking up:
//				- getters  named "get:property"
//				- setters  named "set:property"
//				- bindings named "bind:property"
//				- events   named "on:eventName"


(function(hope) {	// Begin hidden from global scope

new hope.Mixin({
	name : "Settable",
	// mix the following into Classes AND class instances
	all : {
		// flag to know if mixins/etc should use set()
		isSettable : true,
		
		/** Extend this object with a single key/value pair or a set of properties.
			Deals with getters and setters as necessary.
			
			@returns	If called as 	set("x",y)		returns y iff y is different than our current value
						If called as 	set({...})		returns undefined
		 */
		set : function(key, value, notify) {
			if (typeof key === "object") {
				// set all functions first so we pick up any getters or setters
				var all = key, props = {}, results = {}; notify = value;
				for (key in all) {
					value = all[key];
					if (typeof value === "function") {
						value = this.set(key, value, notify);
						if (value !== undefined) results[key] = value;
					} else {
						props[key] = value;
					}
				}
				// now assign all properties
				for (key in props) {
					value = this.set(key, props[key], notify);
					if (value !== undefined) results[key] = value;
				}
				return results;
			} 

			// single property:
			
			// handles special -- getters, setters, event, bindings
			var index = key.indexOf(":");
			if (index !== -1) {
				var type = key.substr(0, index), key = key.substr(index+1);
				switch (type) {
					case "get":					this.__defineGetter__(key, value); break;
					case "on":					this.observe(key, value); break;
					case "bind":				this.bindTo(key, value); break;
					case "set":					this.__defineSetter__(key, value); break;
				}
				return;
			}
			
			// get the name of the setter to call
			var setter = SETTERS[key] || getSetter(key);
			if (typeof this[setter] !== "function") setter = "setUNKNOWN";
			return this[setter](value, key, notify);
		},
	
	
		/** Set a property for which we don't have a setter. 
			Default is to just set on our main object.
			Override if you need to do something else.
		*/
		'setUNKNOWN' : function(value, key, notify) {
			if (this[key] === value) return;

			this[key] = value;
			if (notify != false) this.notify("changed", key, value);
			return value;
		}
	}
});


// list of "setXxx" strings for getting property accessors quickly
var SETTERS = {};
function getSetter(key) {	
	var setter = "set"+key.charAt(0).toUpperCase()+key.substr(1);
	return (SETTERS[key] = setter);
}


// make all classes and class instances settable
hope.Settable.mixinTo(hope.Class);


})(hope); // End hidden from global scope
