/*
TODO:
	- some rational/quick observer pattern ala sproutcore, hook up to Class instances (and class?)
	- check for/replace super calls in set() ?	would work if we never bind... can we make that safe?

	- how to do bound properties, bound expressions?
	- data thing?  co-opt the jQuery one?

*/

/*! Hope application framework, v 0.1					See: http://hopejs.com
 *	MIT license.										See: http://hopejs.com/license
 *	Copyright (c) 2006-2009, Matthew Owen Williams.
 */


/*
	TODO:	
			- instead of always creating the same constructor, 
				make a clone of our superclass's constructor so we always dupe it?
					- eg: subclassing list won't use same constructor
					

 */

(function(hope) {	// Begin hidden from global scope


/**	Create a hope.Class constructor which you can use to create new classes.

	Classes:
		- are subclassable
		- can be referenced globally as   `SomeClass.toString()`
		- ...
		
	Class instances:
		- can be referenced globally as   `someInstance.toString()` if collected
		- ...
		
	To get a pointer to a Class class by name (or reference) do: 	hope.Class("type")

	@sideEffect		The new class will be made available as `hope[<options.name]`.
	@sideEffect		A collection of registered instances will be available as 
					`hope[<options.plural>]`.
	
	@param options.name						Name for the class.
	@param [options.constructor]			Constructor function -- one will be created if not defind.
											NOTE: your constructor MUST call this.initialize()!
	@param [options.plural]					Plural of the type.  Will be type+"s" if not defined.
	@param [options.isA|isAn]				Name or pointer to super class.  (case insensitive)
	@param [options.mixin[s]]				Mixins to apply.  ("mixin" and "mixins" both work)
	@param [options.statics]				Simple object of properties and methods to mixin to the class itself.
	@param [options.prototype]				Simple object of properties and methods to mixin to the prototype.
	@param [options.setConstructor]			Name of constructor to use to create a set of instances.
											(Note: it is up to instance methods to use this).
	@param [options.primaryKey]				If supplied, name of a property on each instance that is unique
											for all instances that can ever be created (like a database primary key).
											Note -- it is up to you to ensure this uniqueness!
	@param [options.equals]					function(this, that) -- returns true if both items are semantically equal.
	@param [options.initialize]				Method to call to set up the class (after everything else is done).
*/
hope.registerThing("Class", function Class(options){
	// return instantly if constructing a prototype
	if (options == hope.SKIP || options == null) return this;

	// get the various options and defaults for them
	var className	 		= options.name, 
		plural				= options.plural || className+"s",
								// either case or declension works
		Super 				= options.isA || options.isAn || options.isa || options.isan,
		autoRegister		= ( (options.autoRegister == true) || (options.autoregister == true))
	;
	var prototype, Class;
	
	// make sure they provided a class name and it is not already defined
	if (!className) throw new TypeError("Must provide a class.name")
	if (hope.Things[className.toLowerCase()]) throw new TypeError("Class '"+className+"' already exists");

	// convert SuperClass to a class if they passed a string
	if (Super == null) 					Super = hope.Class;
	else if (typeof Super == "string") 	Super = hope.getThing(Super);	// will throw if not found

	// if they gave us a constructor, use that
	if (options.hasOwnProperty("constructor")) {
		Class = options.constructor;
	}
	// make a constructor function
	else {
		Class = function ClassConstructor(properties) {
			// if hope.SKIP is passed, we're creating a prototype for a subclass -- bail immediately.
			if (arguments[0] == hope.SKIP) return;

			// extend the instance with properties passed in
			// after this, properties will be the unique properties actually set on this object
			if (properties) properties = this.set(properties);
			
			// call our initialize method
			this.initialize();

			if (autoRegister) Class.register(this);

			// notify that we've been created
			this.notify("create");
		}
	}

	//
	// set up the constructor
	//
	
	// add all properties/methods from the Super
	hope.extend(Class, Super);

	// set up the superclass relationship
	Class.superclass = Super;
	Class.subclass = function subclass(options) {
		options.isA = Class;
		return new hope.Class(options);
	},

	// for knowing when we're dealing with classes
	Class.name = className;
	Class.plural = plural;

	//
	// set up the collection of instances, and register the collection as hope[<plural>]
	Class.Instances = {};
	hope[plural] = Class.Instances;
	Class.Instances.toString = function(){return "hope."+plural };

	// Primary key for instances (MUST be unique for all instances)
	if (options.primaryKey) Class.primaryKey = options.primaryKey;

	// return true if two instances (or an instance and a set of properties) are equal
	if (options.equals) Class.equals = options.equals;

	// Constructor for sets of items of the class.
	if (options.setConstructor) Class.setConstructor = options.setConstructor;

	//
	// set up the Class's prototype
	//

	// create the new instance of the superclass's prototype, skipping the init routine
	// this will automatically pick up all Super defaults
	prototype = Class.prototype = new Super(hope.SKIP);
	prototype.Class = Class;
	//
	//	apply mixins
	//

	// if the prototype specifies any mixins, do that now BEFORE assigning other properties
	var mixins = options.mixins || options.mixin;
	if (mixins) hope.Mixin.mixinTo(Class, mixins);
	

	//
	//	add any defaults passed in to class and prototype
	//

	// add defaults passed in to the class, WITHOUT notifying
	if (options.statics) Class.set(options.statics, false);

	// add prototype defaults passed in to the prototype
	if (options.prototype) prototype.set(options.prototype, false);

	//
	//	registration
	//	
	
	// register the Class in the list of Things
	hope.registerThing(className, Class);

	// call the class initialize routine if defined
	if (options.initialize) options.initialize.apply(Class);

	return Class;
});	// end hope.registerThing("Class")


//
// Methods and properties common to all Classes (the constructors, NOT the prototypes).
//
hope.extend(hope.Class, {
	type : "Class",
	
	// note that we're both a Class and a Thing
	isAClass : true,

	/** Constructor for list of instances. */
	setConstructor : Array,

	//! Create a subclass of this class.
	subclass : function(options) {
		options.isA = hope.Class;
		return new hope.Class(options);
	},

	/** Identity function for instances of this class.
		Automatically works with primaryKey if defined on the Class.
		Override if you have different equality semantics.
	 */
	equals : function(a,b) {
		if (this.primaryKey) {
			if (a != null && b != null) {
				return (a[options.primaryKey] === b[options.primaryKey]);
			}
			return false;
		}
		return (a === b);
	},
		
	/** Return a unique identifier for an instance.  Side effect: sets instance.__id__ to the identifier.
		If your class defines a 'primaryKey', we'll use that 
			(and it's up to you to make sure that is really unique within all instances!)
		If no primary key, we use a sequence.
	*/
	getIdFor : function(instance) {
		if (instance.__id__) return instance.__id__;
		if (this.primaryKey && instance[this.primaryKey] != null) {
			return (instance.__id__ = ""+instance[this.primaryKey]);
		}
		if (!this.instanceSequence) this.instanceSequence = 1;
		return (instance.__id__ = this.name+this.instanceSequence++);
	},
	
	/** Register an instance in our list of Instances, via instance.__id__.
		Will figure out the id using getIdFor() if not already set.
		Doesn't do any checking to make sure the instance is unique!
	*/
	register : function(instance) {
		if (instance.__id__ == null) this.getIdFor(instance);
		this.Instances[instance.__id__] = instance;
	},
	
	/** UN-register an instance, called automatically when the instance is destroyed. */
	unregister : function(instance) {
		if (instance.__id__) delete this.Instances[instance.__id__];
	},

	/** Find a REGISTERED instance, specified by id or by reference. 
		Use this if, eg, you're updating an object from the server
		and want to see if such an instance already exists.
	*/
	findRegistered : function(instance) {
		if (!instance) return undefined;
		if (instance.Class == this) return instance;
		if (typeof instance == "string") return this.Instances[instance];
		
		var id = this.getIdFor(instance);
		return this.Instances[id];
	},

	/** Find all REGISTERED instances where condtion is true. 
		Returns an instance of this.setConstructor.
	*/
	findAll : function(condition, _returnFirst) {
		var instances = this.Instances, 
			key, results
			results = (_returnFirst ? null : new this.setConstructor())
		;
		for (key in instances) {
			var instance = instances[key];
			if (!condition(instance, key)) continue;
			if (_returnFirst) return instance;
			if (results.addItem) 	results.add(instance);
			else 					results.push(instance);
		}
		return results;
	},
	
	/** Find FIRST REGISTERED instance where condition is true. */
	find : function(condition) {
		return this.selectAll(condition);
	},

	/** Return a string identifying this Class.
		Note that the resulting string represents a globally accessible pointer to the class, so:
			`eval(hope.SomeClass.toString())` ==> a pointer to the class..
	*/
	toString : function() {
		return "hope."+this.name;
	},


	//
	//	Prototype:  methods and properties common to all instances
	//
	prototype : {

		//! call an inherited method on this object (aka 'super')
		//	eg:  this.as("SomeClass", "methodName", arguments)
		//		 this.as("SomeMixin", arguments)		<-- if your function is named!
		as : function(thing, method, args) {
			thing = hope.getThing(thing);	// throws if not found
			if (typeof method !== "string") {
				args = method;
				method = arguments.callee.name || arguments.callee._name;
			}
			method = (thing.isAClass ? thing[method] : thing.prototype[method]);
			if (!method) throw this+".as("+thing+"): can't find method";
			return method.apply(this, args);
		},
	
		//! Initialize this instance -- default at class level is a no-op.
		initialize : function() {},
		
		/** Destroy this instance.  You should generally do your stuff BEFORE calling super with this. */
		destroy : function() {
			// tell our observers that we're going away
			this.notify("destroy", this);
		
			// turn off all observations
			this.ignore();
	
			// tell our class that we're gone
			this.Class.unregister(this);
			
			return this;
		},
	
			
		//! Get a named property (or sub-property) of this object -- uses hope.get().
		get : function(path) {
			return hope.get(path, this);
		},
		
	
		/** Return a string identifying this instance. 
		
			Note that if the resulting string represents a globally accessible pointer to the instance, so:
				`eval(someInstance.toString())` ==> a pointer to the instance
			IFF the instance has been previously registered.
		*/
		toString : function() {
			if (this == hope.Class.prototype) {
				return "hope.Class.prototype";
			} else if (this == this.Class.prototype) {
				return this.Class + ".prototype";
			} else if (this.__id__) {
				return this.Class.Instances+"."+this.__id__;
			} else {
				return "[a "+this.Class+"]";
			}
		}
		
	} // end hope.Class.prototype
});// end extend(hope.Class)




})(hope); // End hidden from global scope
