new hope.Class({
	name : "ClassInfo",
	prototype : {
		// name of the class
		name : undefined,
		
		// comma-separated list of group(s) this class belongs (aka 'tags')
		groups : undefined,

		// high-level documentation for the class
		docs : undefined,

		// superclass
		Super : undefined,
		
		// mixins
		Mixins : undefined,
		
		// class methods/properties
		classMethods : undefined,
		classProperties : undefined,
		
		// mixin methods/properties/etc are included in the below

		// array of MethodInfo items
		methods : undefined,
		
		// array of PropertyInfo items
		properties : undefined,
		
		// array of EventInfo items
		events : undefined,
		
		// the following include methods/etc from super(s)
		get allMethods() {},
		get allProperties() {},
	
		get allClassMethods() {},
		get allClassProperties() {},
		
		// array of supers, closest first
		get Supers()
	}
});

// NOTE: these values should inherit also!  Inherit statically when creating the class?
new hope.Class({
	name : "PropertyInfo",
	prototype : {
		// name of the property
		name : undefined,

		// name of the class/mixin/etc where this PropertyInfo was created
		from : undefined,

		// comma-separated list of group(s) this property belongs (aka 'tags')
		groups : undefined,

		// high-level documentation for the property
		docs : undefined,

		// pipe-separated list of known types for this property
		types : "string",
		
		// default value
		defaultValue : undefined,
		
		// list of possible values for an "enumerated" string type
		values : undefined,
		
		// map of "internal" value to "external" (display) value 
		valueMap : undefined,
		
		// is this property required?
		required : false,
		
		// should this property be saved?
		save : true,
		
		// is there a special getter for this property?	
		// TODO:  "english" and "JS" ?
		getter : false,
		
		// is there a special setter for this property?
		// TODO:  "english" and "JS" ?
		setter : false
	}
});


new hope.Class({
	name : "MethodInfo",
	prototype : {
		// name of this method
		name : undefined,
		
		// name of the class/mixin/etc where this MethodInfo was created
		from : undefined,

		// comma-separated list of group(s) this property belongs (aka 'tags')
		groups : undefined,

		// high-level documentation for the property
		docs : undefined,
	
		// array of signatures for the method, as:
		//		"arg:type, [optionalArg:type|type|type], ..."
		signatures : undefined,
		
		// pipe-separated list of known return types
		returns : undefined,
		
		// pipe-separated list of execptions that the method throws
		exceptions: undefined

		// TODO:  "english" and "JS" ?
	}
});
