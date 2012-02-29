// global constants

var SKIP		= "-SKIP-"
	DEFER		= "-DEFER-",
	OVERWRITE	= "-OVERWRITE-",
	
	// types
	FUNCTION	= "-FUNCTION-",
	STRING		= "-STRING-",
	BOOLEAN		= "-BOOLEAN-",
	NUMBER 		= "-NUMBER-",
	INTEGER		= "-INT-",
	DATE		= "-DATE-",
	TIMESTAMP	= "-TIMESTAMP-",
	ALIAS		= "-ALIAS-",
;



Field/FieldSet Thoughts
 - Field creation where it takes:  value, get, set, enumerable  OR  object
 - when creating fieldset
 	- create simple Field or Method for each non-Field property
 	- Class keeps pointer to its fieldsets (one for instance, one for Class)
 	- fieldsets inherit?  manually?
 	- Class.saveMap ?
 - how to inherit arrays?  LinkedList ?  Efficiency?
 - how to inherit events from proto?  Necessary for other than create?
 	- give classes an inherited, non-enumerable map of 'creating' methods?  On Class?
 	- Class.init(instance)

Class thoughts
	- when creating class methods, have '$super' defined as local variable


//TODO: mapping ?
//			make a 'loader' from a set of properties using mapping -> field ?
//TODO: debug to show when values not matching what's expected?
//TODO: string format?
//TODO: number precision?
//TODO: nullable ?  necessary?
//TODO: export()
//TODO: keeping inherited Field map on an object? (eg: for save)


// provide the Field module
provide("Field", function(global) {

	function FieldSet(map) {
		if (!this.descriptors) this.descriptors = [];
		if (!this.map) this.map = {};
		if (map instanceof FieldSet) {
			this.descriptors.append(map.descriptors);
			for (var key in map) {
				this.map[key] = map[key];
			}
		} else {
			for (var name in map) {
				var field = map[name];
				if (field.__applyProperty__) {
					this.descriptors.push(field);
					if (!field.name) field.name = name;
				} else {
					if (field !== undefined) this.map[name] = field;
				}
			}
		}
	}
	
	FieldSet.prototype = {
		append : function(map) {
			FieldSet.call(this, map);
		},
		
		applyTo : function(it) {
			var i = -1, field;
			while (field = this.descriptors[++i]) {
				field.__applyProperty__(it);
			}
			for (var key in this.map) {
				it[key] = this.map[key];	
			}
			return it;
		}
	}


	// un-typed Field descriptor
	function Field(props, map) {
		if (props) for (key in props) this[key] = props[key];
		if (map) map[this.name] = this;
	}
	global.Field = Field;
	
	Field.prototype = {
		// Field name, REQIURED
		name : undefined,
		
		// is Field enumerable?
		enumerable : true,
		
		// default value for Field
		value : undefined,
		
		// getter
		//	set to "true" to make getter automatically
		get : undefined,
		
		// setter 
		//	set to "true" to make setter automatically
		set : undefined,
		
		// logical type of this Field
		type : undefined,
		
		// save this Field?
		save : true,
		
		// name of the cache property we put set()ed values on
		cacheProperty : "_",
		
		
		// apply this Field to something (generally a prototype)
		__applyProperty__ : function(it) {
			if (this.set || this.get) {
				Object.defineProperty(it, this.name, {
					enumerable : this.enumerable,
					get : (this.get === true ? this.makeGetter() : this.get),
					set : (this.set === true ? this.makeSetter() : this.set)
				});
				// .value is default, assign it to store default
				if (this.value !== undefined) it[this.name] = this.value;
			} else {
				if (this.enumerable) {
					Object.defineProperty(it, this.name, {
						enumerable : true,
						value : value
					});
				} else {
					it[this.name] = value;
				}
			}
		},

		// make a custom parser for this properties according to to Field settings
		makeParser : function(type) {
			var script = "";
			return (type === STRING ? script : Function("v", script));
		},
		
		// make a generic getter function which uses this._[name] to store value
		makeGetter : function() {
			return Function("return this."+this.cacheProperty+"['"+props.name+"']");
		},
		
		// make a generic setter function which uses this._[name] to store value
		//	if the Field defines a "parse" function, parses and stores the parsed value
		//	parse is called as parse.call(this, value, Field)
		makeSetter : function() {
			return Function("v", 
					this.makeParser(STRING)
				 + "return (this."+this.cacheProperty+"['"+this.name+"'] = v)"
			);
		}
	}
	
	
	// generic $String descriptor
	// NOTE: we do NOT explicitly create a parser for strings (?)
	function $String() {
		return Field.apply(this, arguments);
	}
	$String.protoype = new Field({
		type		: STRING,
		value 		: undefined,
		
	}, SKIP);
	Field.String = $String;
	Field.Str = $String;
	
	
	
	//! Generic Function descriptor.
	//	NOTE: methods are NOT enumerable by default
	function $Function(props, map) {
		return Field.apply(this, arguments);
	}
	$Function.prototype = new Field({
		type		: FUNCTION,
		enumerable	: false,
		save 		: false
	}, SKIP);
	Field.Function = $Function;
	Field.Fn = $Function;


	//! Generic boolean descriptor.
	//	Generates getter/setter for float value.
	function $Boolean() {
		return Field.apply(this, arguments);
	}
	$Boolean.prototype = Field({
		type		: BOOLEAN,
		get			: true,
		set			: true,

		makeParser : function(type) {
			var script = "v = !!v;\n";
			return (type === STRING ? script : Function("v", script));
		}
	}, SKIP);
	Field.Boolean = $Boolean;
	Field.Bool = $Boolean;

	
	
	//! Generic number descriptor.
	//	Generates getter/setter for float value.
	//	if min and/or max is set, constrains to that
	//	if precision (number of decimal places) is set, rounds to that
	function $Number() {
		return Field.apply(this, arguments);
	}
	$Number.prototype = Field({
		type		: NUMBER,
		precision	: undefined,
		min			: undefined,
		max			: undefined,
		get			: true,	// auto-generate getter/setter
		set			: true,

		makeParser : function(type) {
			var power = (this.precision ? Math.pow(10, this.precision) : null);
			var script = 
					"v = parseFloat(v);\n"
				   + "if (isNaN(v)) v = "+this.value+";\n"
				   + (this.min === undefined ? "" : "if (v < "+this.min+") v = "+this.min+";\n")
				   + (this.max === undefined ? "" : "if (v > "+this.max+") v = "+this.max+";\n")
				   + (power == null ? "" : "v = Math.round(v * "+power+")/power;"
				   						 + "if (isNaN(v)) v = "+this.value+";\n");
			return (type === STRING ? script : Function("v", script));
		}
	}, SKIP);
	Field.Number = $Number;
	Field.Num = $Number;



	//! Generic integer descriptor.
	//	Generates getter/setter for integer value.
	//	if min and/or max is set, constrains to that
	function $Integer() {
		return Field.apply(this, arguments);
	}
	$Integer.prototype = new $Number({
		type		: INTEGER,
		precision	: 0
	}, SKIP);
	Field.Integer = $Integer;
	Field.Int = $Integer;


	//! Generic date descriptor.  
	//	Calls Date.parseFormat() to parse the date.  
	//	We stub a very simple one of these in, later code will likely override with smarter.
	//	Date formatting code may later take over 
	//	Generates getter/setter for date value.
	function $Date() {
		return Field.apply(this, arguments);
	}
	$Date.prototype = new Field({
		type		: DATE,
		format		: undefined,
		
		// return parser for this date
		makeParser : function(type) {
			var format = (this.format === undefined ? "undefined" : "'"+this.format+"'"),
				date;
			;
			// handle Date case
			if (typeof this.value === "string") date = "'"+this.value+"'";
			else if (Date.isDate(this.value)) 	date = "new Date("+this.value.getTime()+")";
			else 								date = this.value;
			

			var script =	"if (typeof v === 'number') v = new Date(v);\n"
						  +	"else if (typeof v === 'string') {\n"
						  +	"	v = Date.parseFormat(v,"+format+");\n"
						  + "}\n"
						  + "if (!Date.isDate(v)) v = "+date+";";
			return (type === STRING ? script : Function("v", script));
		}
	});
	Field.Date = $Date;



	//! Enumerated value.
	//	- if .options is array, parse for value as an integer
	//	- if .options is a map, parse for value as a string
	function $Enum() {
		return Field.apply(this, arguments);
		var options = this.options;
		if (options) {
			if (typeof options === "string") {
				this.options = options = options.trim().split(/\s*,\s*/);
			}
			var Super = Object.isArrayLike(options) ? $Number : $String;
			if (!this.get) this.get = Super.get;
			if (!this.set) this.set = Super.get;
			if (!this.makeParser) this.makeParser = Super.makeParser
		}
		return Field.apply(this, arguments);
	}
	$Enum.prototype = new Field({
		type		: ENUM,
		options		: undefined
	});
	Field.Enum = $Enum;


	//! Object.  
	//	- If .autoCreate, we will automatically create an instance of a new object via onCreating.
	//	- If .inherit, we will inherit from our proto clone
	//	- If .overwrite, we overwrite existing properties on set() (only if set is defined)
	//	NOTE: we do NOT create getter/setter by default
	function $Object() {
		return Field.apply(this, arguments);
	}
	$Object.prototype = new Field({
		type		: OBJECT,
		autoCreate	: false,
		inherit		: false,
		overwrite	: true,
		
		// create an instance for it
		create : function(it) {
			var value;
			if (this.inherit)	value = Object.protoClone(this.constructor.prototype[this.name]);
			else 				value = {};

			if (this.set) {
				it[this.cacheProperty][this.name] = value;
			} else {
				it.[this.name] = value;
			}
		},
		
		// default setter adds properties to our object
		makeSetter : function() {
			var script = "if (v == null || typeof v !== 'object') return;\n"
					   + "var object = this['"+this.prop+"'];\n"
					   + "for (var key in v) {\n";
			if (this.overwrite !== true) {
				script+= "	if (object[key] !== undefined) continue;\n";
			}
			script	  += "	object[key] = v[key];\n"
					   + "}\n"
					   + "return v;";
			return new Function("v", script);
		},
		
		// override __applyProperty__ to set up auto-creation
		__applyProperty__ : function(it) {
			Field.prototype.__applyProperty__.apply(this, arguments);
			if (it.autoCreate && it.on) {
				// "creating" fires BEFORE we set values for the instance
				it.on("creating", this.create, this);
//TODO: may want to create on the prototype ?
			}
		}
	});
	Field.Object = $Object;


	//! Array -- simple array.  
	//	- If .autoCreate, we will automatically create an instance of a new array via onCreating.
	//	- If .append, we add to the current array when setting (otherwise we replace)
	//	NOTE: we do NOT create getter/setter by default
	function $Array() {
		return Field.apply(this, arguments);
	}
	$Array.prototype = new Field({
		type		: ARRAY,
		autoCreate	: false,
		append		: false,
		
		// default setter replaces objects in our array 
		makeSetter : function() {
			var script = "if (!Object.isArrayLike(v)) return;\n"
					   + "var array = this['"+this.prop+"']\n";
			if (this.append) {
				script+= "	this.append(v);";
			} else {
				script+= "	this.replace(v);\n";
			}
			script	  += "return v;";
			return new Function("v", script);
		},
		
		// override __applyProperty__ to set up auto-creation
		__applyProperty__ : function(it) {
			Field.prototype.__applyProperty__.apply(this, arguments);
			if (it.autoCreate) {
				// make the 'create' function
				this.create = new Function("it", 
					(this.set ? "it."+this.cacheProperty+"['"+this.name+"'] = [];"
							  : "it['"+this.name+"'] = [];") );
							  
				if (it.on) {
					// "creating" fires BEFORE we set values for the instance
					it.on("creating", this.create, this);
				}
			}
		}
	});
	Field.Array = $Array;


	//! Alias - second field pointing to some value.
	//	Generates getter/setter.
	//	- set .to to the property you want to alias
	function $Alias() {
		return Field.apply(this, arguments);
	}
	$Alias.prototype = Field({
		type		: ALIAS,
		to			: undefined,
		get			: true,	// auto-generate getter/setter
		set			: true,

		// make a generic getter function which uses this._[name] to store value
		makeGetter : function() {
			return Function("return this['"+props.to+"']");
		},
		
		// make a generic setter function which uses this._[name] to store value
		//	if the Field defines a "parse" function, parses and stores the parsed value
		//	parse is called as parse.call(this, value, Field)
		makeSetter : function() {
			return Function("v", 
					this.makeParser(STRING)
				 + "return (this['"+props.to+"'] = v)"
			);
		}
	}, SKIP);
	Field.Alias = $Alias;

	
	return global;
});
