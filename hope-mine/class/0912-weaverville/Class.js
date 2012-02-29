/*! Hope application framework, v 0.1					See: http://hopejs.com
 *	 *	MIT license.										See: http://hopejs.com/license

 *	Copyright (c) 2006-2009, Matthew Owen Williams.
 */

(function($, hope) {
// 
//		Begin hidden from global scope:
//


$.extend({
	/**	Create a $.Thing object which you can use to create new classes.

		Classes:
			- are subclassable
			- can be referenced globally as   `SomeClass.toString()`
			- ...
			
		Thing instances:
			- can be referenced globally as   `someInstance.toString()`
			- ...

		@sideEffect		The new class will be made available as `$[<options.name]`.
		@sideEffect		If `options.collection` was specified, it will be made available
						as `$[<options.collection>]`.
		
		@param options.name						Name for the class.
		@param [options.collection]				Global for the collection of instances.
		@param [options.Super]					Name or pointer to super class.  (note case)
		@param [options.prototype]				Simple object of properties and methods to install on the class prototype.
		@param [options.defaults]				Simple object of properties and methods to install on the class itself.
	*/
	Thing : function(Thing) {
		if (Thing == $.SKIP || Thing == null) {
			return;
		}
		// else if the first argument is a Thing, return it.
		else if (Thing && Thing.SubClasses) {
			return Thing;
		}
		// else if the first argument is a string, return the class with that name
		else if (typeof Thing == "string") {
			// look the class up by lower case
			//	so we don't have to worry about case sensitivity
			Thing = $.Classes[Thing.toLowerCase()] || $[Thing];
			var notFoundMessage = arguments[1];
			if (!Thing && notFoundMessage) throw new TypeError(notFoundMessage);
			return Thing;
		}
	

		//
		//	create a new class
		//
		var options = arguments[0];
	
		// get the various options and defaults for them
		var ClassName 			= options.name, 
			SuperClass 			= options.Super || options["super"],	// either case works
			collectionName		= options.collection || ClassName+"s",
			prototypeDefaults 	= options.prototype, 
			classDefaults 		= options.defaults,
			classInitializer	= options.initialize,
			prototype
		;
		// make sure they provided a class name and it is not already defined
		if (!ClassName) throw new TypeError("Must provide a class.name")
		if ($[ClassName]) throw new TypeError("Thing '$."+ClassName+"' already exists");
		
		// convert SuperClass to a class if they passed a string
		if (SuperClass == null) SuperClass = $.Thing;
		else if (typeof SuperClass == "string") {
			if (typeof $[SuperClass] != "function") {
				throw TypeError("SuperClass '"+SuperClass+"' not found");	
			}
			SuperClass = $[SuperClass];
		}
	
		//
		// make the constructor function
		//
		function constructor(properties) {
			// if no properties are passed, we're creating a prototype for a subclass,
			//	so just bail immediately
			if (arguments[0] == $.SKIP) return;
			
			// extend the instance with all arguments passed in
			if (arguments.length) {
				properties = this.extend.apply(this, arguments);
			}

			// call the initialize routine
			this.initialize.apply(this, arguments);
			
			// and broadcast that we have been created
			this.notify("onCreate", properties);	
		}
	
		//
		// set up the constructor
		//
		
		// add all properties/methods from SuperClass
		$.extend(constructor, SuperClass);

		// set up the subclass -> superclass relationship
		SuperClass.SubClasses.push(constructor);
		constructor.SuperClass = SuperClass;


		// give the constructor a list to hold its subclasses
		constructor.SubClasses = [];

		// for knowing when we're dealing with classes
		constructor.ClassName = ClassName;
		constructor.isAClass = true;
	

		//
		// set up the collection of instances
		//
		
		// the actual collection is the same for both paths
		constructor.Instances = {};
		constructor.Instances.length = 0;
		constructor.idSequence = 0;

		// register the collection as $[<collectionName>]
		$[collectionName] = constructor.Instances;
		constructor.Instances.toString = function(){return "$."+collectionName };
	
	
	
		//
		// set up the constructor's prototype
		//
		// create the new instance of the superclass, skipping the init routine
		// this will automatically pick up all superclass defaults
		prototype = constructor.prototype = new SuperClass($.SKIP);
		prototype.constructor = constructor;
		prototype.__type__ = ClassName;

		// prototype.asSuper is a pointer to the super's prototype, for superclass calling
		// TODO: not sure if this is really necessary
		prototype.asSuper = SuperClass.prototype;
		
		// prototype["as"+ClassName] is a pointer back to the prototype, so instances can say:
		//		this.asSomeClass.someMethod.apply(this, arguments);
		//	to do a superclass call on the prototype
		prototype["as"+ClassName] = prototype;


		//
		//	apply mixins
		//

		// if the class specifies any mixins, do that now BEFORE assigning other properties
		if (classDefaults && classDefaults.mixins) {
			$.Thing.applyMixins(classDefaults.mixins, constructor);
			delete classDefaults.mixins;
		}
		
		// if the prototype specifies any mixins, do that now BEFORE assigning other properties
		if (prototypeDefaults && prototypeDefaults.mixins) {
			$.Thing.applyMixins(prototypeDefaults.mixins, prototype);
			delete prototypeDefaults.mixins;
		}

		//
		//	add defaults passed in to class and prototype
		//

		// add defaults passed in to the class
		if (classDefaults) $.extend(constructor, classDefaults);

		// add prototype defaults passed in to the prototype
		if (prototypeDefaults) {
			prototype.extend(prototypeDefaults);
		}


		//
		//	registration
		//	
		
		// register the constructor in the list of Classes
		$.Classes[ClassName] = $.Classes[ClassName.toLowerCase()] = constructor;
		
		// register the class with jQuery as $[<ClassName>]
		$[ClassName] = constructor;

		if (classInitializer) classInitializer.apply(constructor);
	
		return constructor;
	},
	
	/** Map of {ClassName->Thing} for *all* classes we have created.
		Classes are added by name during class creation, in both lower case and original case.
	 */
	Classes : {
		toString : function(){return "$.Classes"}
	}
	
});	// end $.extend	


//
// Methods and properties common to all Classes (the constructors, NOT the prototypes).
//
$.extend($.Thing, {

	/** List of Classes without a SuperClass. */
	SubClasses : [],

	/** Add methods or defaults to this Thing.
		Note: also adds them to any of our subclasses (and their subclasses, etc).
	 */
	extend : function(properties) {
		if (!properties) return;

		// add properties to this object
		$.extend(this, properties);
		
		// and do the same for all subclasses
		this.SubClasses.forEach(function (Thing) {
			Thing.extend(properties);
		});
	},

	/** Apply a list of mixins to the target. */
	applyMixins : function(mixins, target) {
		var mixin, mixinName;
		if (typeof mixins == "string") mixins = mixins.split($.patterns.splitOnCommas);
		while (mixinName = mixins.shift()) {
			mixin = $.Thing(mixinName);
			if (!mixin) throw TypeError("Mixin '"+mixinName+"' not found");
			mixin.mixinTo(target);
		}
	},
	
	
	/** Given a string id, an instance or an anonymous set of properties,
		return the appropriate instance.
		
		Returns null if no instance was found.
	 */
	getInstance : function(properties, skipRegister) {
		if (properties instanceof this) return properties;
		var id = this.getIdentifier(properties, skipRegister);
		return this.Instances[id];
	},
		
	/** Register an instance in our list of Instances. */
	register : function(instance) {
		var id = instance.__identifier__ || this.getIdentifier(instance);
		// if there is already something in that spot
		if (this.Instances[id]) {
			// if it is not the instance, throw an error
			if (this.Instances[id] != instance) {
				throw Error("Instance with identifier '"+id+"' already exists.");
			}
		} else {
			this.Instances[id] = instance;
			// add to instances by index as well
			this.Instances[this.Instances.length++] = instance;
		}
		return id;
	},
	
	/** UN-register an instance, called automatically when the instance is destroyed. */
	unregister : function(instance) {
		var id = this.getIdentifier(instance);
		delete this.Instances[id];
		var index = this.Instances.indexOf(instance);
		if (index != -1) this.Instances.splice(index,1);
		return id;
	},
	
	/** Property name(s) that this class uses to uniquely identify each instance.
		Can be a comma-delimited list to multi-part keys.
	*/
	identifierKeys : "id",

	/** Get a unique-y identifier for some instance 
		or random set of properties that might eventually be an instance. 
		
		Note: the identifier is guaranteed to be a legal id.
		
		Default is to use `Thing.identifierKeys` to try to get the value from the instance.
		Override to do something more complex.
		
		@sideEffect  Sets `instance.__identifier__` to the id.
	*/
	getIdentifier : function(instance, skipRegister) {
		if (typeof instance == "string") return instance;
		
		if (!instance) throw new TypeError("Instance is not defined");

		// if we've already identified the instance, just return that.		
		if (instance.__identifier__) return instance.__identifier__;

		// get the list of instance keys we use to generate an id
		var keys = this.identifierKeys;
		if (typeof keys == "string") keys = this.identifierKeys = keys.split($.patterns.splitOnCommas);
		
		// for each key, append the instances' value for that key
		var id = "";
		// copy the keys so we don't munge the original set!
		keys = [].concat(keys);
		while (keys.length) {
			var key = keys.shift(),
				instanceValue = instance[key]
			;

			// if the instanceValue was not found, bail and make up a name
			if (instanceValue == null || instanceValue == "") {
				id = "";
				break;
			}
			id += instanceValue;
			if (keys.length) id += "_";
		}
		
		// convert it to a legal id
		if (id) id = $.string.legalizeId(id);
		// if id was not specified, or an item with that id already exists,
		//	make one up.
		if (id == "" || this.Instances[id] != null) {
			id = this.generateIdentifier();
		}
		
		// set the instance.__identifier__ so we don't have to go through this again
		instance.__identifier__ = id;
//console.info(id);
		// and register the instance so it is globally accessible
		if (skipRegister != $.SKIP) this.register(instance);

		return id;
	},
	
	/** Generate a unique id for some instance. */
	generateIdentifier : function() {
		return this.ClassName + "_" + this.idSequence++;
	},
	
	
	/** Return a string identifying this Thing.
		Note that the resulting string represents a globally accessible pointer to the class, so:
			`eval($.SomeClass.toString())` ==> a pointer to the class..
	*/
	toString : function() {
		return "$."+this.ClassName;
	}
});

// Methods and properties common to all class instances.
$.Thing.prototype = {

	/** Extend this object with a set of properties.
		Calls our setXXX() routines, if defined.
		
		@returns	Only the properties which are diferent from our current values.
	 */
	extend : function() {
		// for each property of each argument:
		//		- if it is a function, install it immediately
		//		- otherwise put it in 'deltas'
		var deltas = {}, arg, key, value, map = this.typeMap;
		for (var i = 0; i < arguments.length; i++) {
			if (!(arg = arguments[i])) continue;
			for (key in arg) {
				value = arg[key];
				if (typeof value == "function") {
					this[key] = value;
				} else if (value !== undefined) {
					deltas[key] = value;
				}
			}
		}
		
		// run all deltas through our setters if we have them
		for (var key in deltas) {
			var value = deltas[key], setter = $.SETTERS[key] || $.getSetter(key);
			if (this[setter]) {
				deltas[key] = this[setter](value);
				if (deltas[key] === undefined) delete deltas[key];
			} else {
				if (value != this[key]) this[key] = value;
			}
		}
		return deltas;
	},


	/** Parse a value according to a typeMap. */
	parseType : function(key, value, typeMap) {
		if (value === undefined || !typeMap) return value;
		var type = typeMap[key];
		if (!type) return value;

		if (typeof type == "function") {
			return type.call(this, value);
		} else {
			return $.parseType(value, type);
		}
	},


	//
	//	create/destroy/update semantics
	//


	/** Do any initialization particular to your subclass. 
		Default implementation:
			- adds any properties passed in to the instance,
			- registers us with our constructor
			- and notifys 'onCreate'
	*/
	initialize : function(properties) {},

	/** Register me so I'm globally accessible and have an __identifier__. */
	register : function() {
		this.constructor.register(this);
	},

	/** Destroy this instance. 
		Default is to call "onDestroy" on observers.
	*/
	destroy : function() {
		// tell our observers that we're going away
		this.notify("onDestroy", this);
	
		// turn off all observations
		this.ignore();

		// tell our constructor that we're gone
		this.constructor.unregister(this);
		
		return this;
	},

	/** Update the instance with a given set of properties.
		Default is to extend the object and call "onUpdate" on observers.
	 */
	update : function(properties) {
		var deltas = this.extend(properties);
		if (deltas) this.notify("onUpdate", deltas);
		return this;
	},



	//
	//	Adding to and removing from some container.
	//	Note that your subclasses may want to, eg, observe/ignore events on the container.
	//

	/** Add an item to some container (known as 'containerKey'). */
	onAddTo : function(container, containerKey) {
		this[containerKey] = container;
	},
	
	/** Remove an item from some container (known as 'containerKey'). */
	onRemoveFrom : function(container, containerKey) {
		delete this[containerKey];
	},
	



	//
	//	identifying the instance
	//

	/** Return a unique id for this class as a string.

		Depending on your subclass, this id by unique to all instances, 
		or it may be unique within the page.

		Uses contstructor.getIdentifier() to create the actual identifier.
	 */
	getIdentifier : function() {
		return this.constructor.getIdentifier(this);
	},
	

	/** Return a string identifying this instance. 
	
		Note that if the resulting string represents a globally accessible pointer to the instance, sso:
			`eval(someInstance.toString())` ==> a pointer to the instance
		if the instance has been previously registered.
		
		@sideEffect  Calls `constructor.getIdentifier(this)` to generate a unique identifier 
						for the instance.  This may set `instance.__identifier__`.
	*/
	toString : function() {
		if (this == $.Thing.prototype) {
			return "$.Thing.prototype";
		} else if (this == this.constructor.prototype) {
			return this.constructor.toString() + ".prototype";
		} else {
			return this.constructor.Instances.toString() + "." + this.constructor.getIdentifier(this);
		}
	},
	
	
	//
	//	generic ajax code
	//	
	
	/** Make an ajax call.  Note that all calls MUST be asynchronous.
		@param	url				Url to call. Will be interpolated with `this` to get dynamic values. 	
		@param	success		Method or name of method to call if request succeeds.
		@param	[error]		Method or name of method to call if request fails.
		@param	[async=true]	`true` means the call will be asynchronous.
		@param	[cache=false]	`false` means we will ignore browser cache for this request.
		@param	[method=GET]	HTTP method to use for request.	
		@param	[format=text]	Format for return data.
								One of: "text", "xml", "html", "script", "json", "jsonp".
		@param	[data]			Data object or string to pass to the request.			
		@param	[message]		Message to show while the request is running.
								Note: we only show message if `this.controller.showMessage()` is defined.
		@param	[errorMessaage]	Message to show if there was an error loading the data.
								Note: we only show message if `this.controller.showError()` is defined.
	*/
	ajax : function(options, data) {
		var url 		= options.url,
			async		= (options.async != null ? options.async : true),
			success	= (typeof options.success == "string" ? this[options.success] : options.success),
			error		= (typeof options.error == "string" ? this[options.error] : options.error),
			cache		= (options.cache != null ? options.cache : false),
			method		= options.method || "GET",
			format		= options.format || "text", 
			data		= data || options.data, 
			message		= options.message,
			errorMessage= options.errorMessage
		;

		// check for mandatory options and throw if necessary
		if (url == null) throw TypeError(this+".ajax(): Must provide options.url");
		if (typeof success != "function") throw TypeError(this+".ajax(): Must provide options.success method");

		// interpolate the URL with this object, to fill in any variables
		url = $.string.interpolate(url, this);

		// figure out if we should show a message
		var showMessage = (message && this.controller && this.controller.showMessage);
		// and show it if necessary
		if (showMessage) this.controller.showMessage(message);

		// morph the success and error callbacks to call us and deal with the message/errorMessage
		function successCallback() {
			if (showMessage) this.controller.hideMessage();
			success.apply(this, arguments);
		}

		var showError = (errorMessage && this.controller && this.controller.showError);
		function errorCallback() {
			if (showMessage) this.controller.hideMessage();
			if (showError) this.controller.showError(errorMessage);
			if (error) error.apply(this, arguments);
		}

		// actual ajax call using jQuery's ajax interpreter
		// see: 	http://docs.jquery.com/Ajax/jQuery.ajax#options
		this._lastRequest = new $.ajax(
			{
				url : url,
				type : method,
				async : async,
				cache : cache,
				dataType : format,
				data : data,
				success : $.bind(successCallback, this),
				error : $.bind(errorCallback, this)
			}		
		);

		return this._lastRequest;
	}	
} // end $.Thing.prototype

// set it up so all prototypes can say:
//		this.asClass.someMethod.apply(this, arguments);
// to do superclass calls	
$.Thing.prototype.asClass = $.Thing.prototype;


// make all class instances observable
$.Observable.mixinTo($.Thing.prototype);


//
//		End hidden from global scope: 
//
})(jQuery, jQuery.hope);
