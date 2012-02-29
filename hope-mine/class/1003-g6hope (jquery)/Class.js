//
//	Base class for all "hope" Classes.
//
//	Special instance properties which you MUST NOT use in your classes:
//		- reference		== global pointer to the instance
//		- identifier	== unique key for the instance
//		- collection
//		- collections	== $.Collection objects automatically created for each instance
//		- mixins		== mixins to apply to the instance
//		- observations	== observations set up when instance is created
//
(function($) {	// begin hidden from global scope

$.Class = function Class(options) {
	// just return if in an initializer
	if (options === $.SKIP || options == null) return this;
	
	var reference = options.reference,
		id = options.id || $.string.toLegalId(reference.substr(reference.lastIndexOf(".") + 1)),
		Super = options.Super,
		mixins = options.mixins,
		options = options.Class,
		initializer = options.initialize,
		observations = options.observations,
		collector = options.collector,
		prototypeOptions = options.prototype || {},
	;
	
	if (typeof Super === "string") {
		Super = $.getClass(Super);
		if (!Super) throw TypeError("Superclass '"+options.Super+"' not found");
	}
	if (!Super) Super = $.Class;

	// make the constructor (in an eval so the Class object is named)
	var Class;
	eval("Class = function "+id+"(options) {\r\n"
		+"	if (options === $.SKIP) return;\r\n"
		+"	this.initialize();\r\n"
		+"	this.set(options);\r\n"
		+"	this.notify('create', this);\r\n",
		+"	this.Class.notify('createdItem', this);\r\n"
		+"}");
	
	// set up the constructor
	$.mixin(Class, Super);
	
	Class.reference = reference;
	Class.id = id;
	Class.subclass = function(options) {
		if (!options) options = {};
		options.Super = Class;
		return new $.Class(options);
	};
	Class.toString = Super.toString;	// mixin doesn't catch this

	$.extend(Class, options);
	
	// create and setup the prototype
	Class.prototype = new Super($.SKIP);
	Class.prototype.Class = Class;
	Class.prototype.set(prototypeOptions);

	// apply any mixins
	if (mixins) {
		mixins = $.getClass(mixins.split(","));
		$.forEach(mixins, function(mixin) {
			mixin.mixinTo(Class);
		});
	}

	// set up the collectors
	if (collector) {
		// if they passed in a string, assume it's either:
		//	- the name of an existing collector, or
		//	- the reference for a collector to create
		if (typeof collector === "string") {
			var it = $.getPath(collector);
			collector = (it ? it : {reference:collector};
		}

		// if not already a collector, create it
		if (!collector.isACollection) {
			collector = new $.Collector(collector);
			collector.context = Class;
		}

		// assign the collector as Class.instances
		Class.instances = Class.collectors[0];

		// inherit collectors from our class
		var collectors = [collector];
		// if the class already defines collectors, add them to the end of our list
		if (Class.collectors) collectors.push.apply(collectors, Class.collectors);

		// and assign to the class as Collectors
		Class.collectors = collectors;
	}

	// make a global pointer to the class
	$.setPath(reference, Class);

	if (initializer) initializer.apply(Class, [Class, Class.prototype]);
	if (observations) {
		$.forEach(observations, function(observation) {
			Class.observe(observation);
		});
	}

	return Class;
}

$.Class.prototype = {
	// Called on creation BEFORE setting up initial values, 
	//	sets up any collections defined on the class.
	// You should ALWAYS call this method if overriding initialize()
	initialize : function() {
		// set up any collections defined on our class
		if (this.Class.collections) {
			var index = -1, collection;
			while (Collection = this.Class.collections[++index]) {
				this[Collection.name] = new Collection(this);
			}
		}
	},
	
	// Called on creation AFTER setup
	onCreate : function(){},
	
	// update with new properties -- default is to use set()
	update : function(options) {
		this.set(options);
	},
	
	destroy : function() {
		this.notify("destroyed");
		this.Class.destroyedItem(this);
		this.isDestroyed = true;
//REFACTOR: ignore() ?
	},
	
	// generic "set", calls special setters
	//	call as "thing.set('key', 'value')" or "thing.set({...})"
	set : function(options, value) {
		var deltas = $.setOptions(this, options, value);
		if (deltas && this.observations) this.notify("changed", deltas);
	},
	
	//
	//	special setters
	//
	
	// Special setter to set up instance-level observations automatically.
	setObservations : function(observations) {
		$.forEach(observations, function(observation) {
			this.observe(observation);
		}, this);
	},
	
	// Set the identifier of an object.
	setIdentifier : function(id) {
		var oldId = this.identifier;
		if (oldId && oldId === id) return;
		this.notify("changedIdentifier", this, oldId, id);
		return (this.identifier = id);
	},
	
	// Special setter to apply mixins to the instance.
	//	The instance does NOT remember its mixins.
	setMixins : function(mixins) {
		mixins = $.getClass($.list.toArray(mixins));
		$.forEach(mixins, function(mixin) {
			mixin.mixinTo(this.Class);
		}, this);
	},
	
	// Special setter to set up collections (either singular or plural).
	//  Note: we inherit all of our superclass's collections as well!
	//
	//	Collections are actually set up on the Class, and are assigned to each instance
	//	in instance.initialize();
	//
	//	The instance doesn't remember its collections implicitly.
	setCollection : function(collection) {
		if (collection) return this.setCollections(collection);
	},
	
	setCollections : function(collections) {
		if (!collections) return;
		if (! (collection instanceof Array)) collection = [collection];
		if (collections.length) {
			collections = $.forEach(collections, function(options) {
				if (!options) return;
				// create a Collection subclass (throws if options are not valid)
				var Collection = $.Collection.subclass(options);

				// set up special setXXX method to add the items to the collection
				//	(all other operations should happen on the collection itself)
				var setter = "set"+$.string.capitalize(options.name);
				if (!this.Class.prototype[setter])
					this.Class.prototype[setter] = function(list) {
						this[options.name].setList(list);
					};
				}

				return Collection.
			}, this);
			var Class = this.Class;
			// if the class already defines collections, add them to our list 
			if (Class.collections) collections.unshift.apply(collections, Class.collections);
			// add to the class collections
			Class.collections = collections;
		}
	},
	
	
	// Special setter to set our 'reference', a global pointer to our object.
	//	After being set, eval("window."+this.reference) is a global pointer to our reference.
	setReference : function(reference) {
		if (this.reference) {
			if (this.reference === reference) 	return;
			else								$.deletePath(this.reference, null);
		}
		// set the global pointer to me
		$.setPath(reference, this);

		return (this.reference = reference;)
	},
	
	
	// Get the primary key for this instance
	// Default is to use the 'id' field.  
	// Override this function if your class uses something else.
	// It is common practice (but not required) to store our identifier in a identifier property.
	//
	// NOTE: the identifier MUST be a legal javascript identifier, 
	//	so you should probaly do $.string.toLegalId() on it to make sure.
	//
	getIdentifier : function() {
		return this.identifier || $.string.toLegalId(this.id);
	},
	
	// Return a reference to this object.
	// If makeOneUp is not $.SKIP, creates a reference if one was not defined.
	getReference : function(makeOneUp) {
		if (this.reference) return this.reference;
		var ref = (this.Class.collectors ? this.Class.collectors[0].getReference(this));
		if (ref) return ref;	//TODO: set the value on the object?
		if (makeOneUp != $.SKIP) {
			return this.setReference(this.Class.generateIdentifier(this));
		}
	},

	// call an inherited method on this object as some other object
	as : function as(Class, method, args) {
		if (typeof Class === "string") Class = $.getPath(Class);
		if (!Class) throw this+".as(): can't find class";
		var methodToCall = Class.prototype[method];
		if (!methodToCall) throw this+".as("+Class+"): can't find method '"+method+"'";
		return methodToCall.apply(this, args);
	},
		
	toString : function() {
		if (this.getReference) return this.getReference();
		var classRef = this.Class.reference;
		if (this === this.Class.prototype) return classRef + ".prototype";
		var key = this.getIdentifier; 
		if (key != null) return classRef + " " + this.getIdentifier();
		return "anonymous "+ classRef+" instance";
	}
}


$.extend($.Class, {
	id 			: "Class",
	reference 	: "$.Class",
	
	// call an inherited method on the Class as some other Class
	as : function as(Class, method, args) {
		if (typeof Class === "string") Class = $.getPath(Class);
		if (!Class) throw this+".as(): can't find class";
		var methodToCall = Class[method];
		if (!methodToCall) throw this+".as("+Class+"): can't find method '"+method+"'";
		return methodToCall.apply(this, args);
	},
	
	// generate (but don't assign) a primary key for an item
	generateIdentifier : function(item) {
		if (item.identifier) return item.identifier;
		if (!this.ID_SEQUENCE) this.ID_SEQUENCE = 0;
		return item.setIdentifier($.string.toLegalId(this.reference) + "_" + this.ID_SEQUENCE++);
	},
		
	toString : function(){	return this.reference	}
});


$.getClass = function(Class) {
	if (Class instanceof Array) return $.getPath(Class);
	if (typeof Class === "string") {
		if (Class.indexOf(",") > -1) return $.getClass(Class.split(","));
		return $.getPath(Class);
	}
	return Class;
}

$.createClass = function(reference, options) {
	var Class = $.getClass(reference);
	if (!Class) throw TypeError("$.createClass("+reference+"): class not found");
	return new Class(options);
}

// make all classes Observable
$.Observable.mixinTo($.Class);

})(jQuery);	// end hidden from global scope
