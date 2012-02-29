/**
	Mixin constructor.
	
	@param options.name						Name for the class.
	@param [options.statics]				Properties to mixin to the constructor.
	@param [options.prototype]				Properties to mixin to the prototype.
	@param [options.all]					Properties to mixin to the both prototype and constructor.
	@param [options.properties]				Array of names of instance properties to save (in addition to those of superclass).
	@param [options.bindings]				Array of instance bindings (in addition to those of superclass).
	@param [options.mixinTo]				Custom function to mix this mixin into an object.
	@param [options.onMixin]				Function to run AFTER being mixinTo()d an object.
*/

(function(hope) {	// Begin hidden from global scope

function Mixin(options) {
	var name = options.name;
	// make sure they provided a name and it is not already defined
	if (!name) throw new nameError("Must provide a mixin.name")
	if (hope.Things[name.toLowerCase()]) throw new TypeError("Thing named '"+name+"' already exists");

	// add all of the options to us
	hope.extend(this, options);
	
	// if we have an 'all' property, merge it with 'prototype' and 'statics'
	if (this.all) {
		this.prototype = (this.prototype ? hope.extend({}, this.all, this.prototype) : this.all);
		this.statics =   (this.statics   ? hope.extend({}, this.all, this.statics)   : this.all);
		delete this.all;
	}

	// register it as something we can find globally
	hope.registerThing(name, this);
}
hope.registerThing("Mixin", Mixin);


// static methods on hope.Mixin
hope.extend(hope.Mixin, {

	/** Mix one-or more mixins into something.
		Mixins is:
			- a Mixin or an array of Mixins
			- string name of a mixin, or a list of names separated by commas
	*/
	mixinTo : function(it, mixins) {
		if (mixins.isAMixin) mixins = [mixins];
		else if (typeof mixins == "string") mixins = mixins.splitOnCommas();
		var mixin, i = 0;
		while (mixin = mixins[i++]) {
			mixin = hope.getThing(mixin);
			mixin.mixinTo(it);
		}
	},
	
	
	prototype : {
		isAMixin : true,
		
		/** Default behavior is to overwrite properties on the destination.
			Set to hope.MERGE to NOT overwrite.
		*/
		overwrite : hope.OVERWRITE,
		
		/** Mix this mixin into something (either a constructor or a Mixin). */
		mixinTo : function(target) {
			if (!target) return;
			
			// mixing in to another mixin is different than mixing in to a class
			if (target.isAMixin) {
				if (this.statics) 		target.statics = hope.extend(target.statics||{}, this.statics);
				if (this.prototype) 	target.prototype = hope.extend(target.prototype||{}, this.prototype);
			}
			// constructor or simple object
			else {
				if (target.isSettable) {
					if (this.statics) target.set(this.statics);
					if (this.prototype && target.prototype) target.prototype.set(this.prototype);
				} else {
					var extend = (this.overwrite ? hope.extend : hope.merge);
					if (this.statics) extend(target, this.statics);
					if (this.prototype && target.prototype) extend(target.prototype, this.prototype);
				}
			}
			
			// call onMixin handler if defined
			if (this.onMixin) this.onMixin(target);
		}
	}
});

})(hope); // End hidden from global scope
