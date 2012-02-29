//
//	Define objects:
//		hope.SmartJS 		- dialect of JS tuned for instantiating hope Classes with convenient syntax
//		hope.ClassLoader 	- automatically parses "<class>" tags out of the document (or file) 
//	Also loads the default control and application classes
//

/*	
	SmartJS syntax we handle:
	
	- top level:
		- default varName = value;
		- private varName = value;
		- class varName = value;
		- "local" ???
		
		- function name() {...}
		- private function name() {...}
		- class function name() {...}
		
		- understands special constructor semantics
	
	- w/in functions
		- super(args)
		- arguments[]
		- arguments[x -> ]
		- arguments[x -> y]
		- arguments[ -> y]
		- array[x -> y]
		- array[x -> ]
		- array[ -> y]
		- throw(message)
		
	- TODO
		- debug(...)				if (this._debugging) {...}
		- error(...)				console.error(this._error(arguments, ...));
		- warn(...)					console.warn(this._error(arguments, ...));
		- debugGroup(...)			? syntax ?
		- time()/timeEnd()			? necessary ?
		- remember "publicProperties" types for export
		- auto-create getters/setters for public props?  necessary?
			- use moz-specific __getters ???  that would be really cool...
		- type conversion from HTML
			- pass types in from ClassParser
			- put in constructor
			- functions convert to function  (key with property:  "onXXX" ?)
			- booleans convert to boolean
			-> class parser can take types, or can we auto-infer?
		- foreach ?
		- hitch ?
		- some sort of smart debugging if there's a script error
		- pick up comments at start/end of block as "prefix" and "suffix"
		- pick up comments before/after a function/etc as part of that item when rearranging
		- make this work for adding things to a random object, not just class setup
		- function disambiguators for multiple instances of same method?
		- multiple inheritance
		- picky about ; after property (eg: when property is a {}, doesn't strictly need a ";" after)
*/
(function() {	
	var	FUNCTION_RE 			= /\r*\s*(public|protected|class|private)?\s*function\s(\w*)\s*\((.*?)\)/g,
		FUNCTION_END_RE 		= /};?/g,

		GETTER_RE 				= /\r*\s*(public|protected|class|private)?\s*get\s+(\w*)\s*\((.*?)\)/g,
		GETTER_END_RE 			= /};?/g,

		
		FUNCTION_REF_RE			= /\r*\s*(public|protected|class|private)?\s*function\s*(\S*)\s*=\s*/g,
		FUNCTION_REF_END_RE		= /;/g,
		
		PROPERTY_RE 			= /\r*\s*(public|protected|var|default|class|private)\s+(\w*)\s*=\s*/g,
		PROPERTY_END_RE 		= /;/g,
	
		SUPER_CALL_RE 			= /super\s*\(/g,
		SUPER_CALL_END_RE 		= /\)/g,
			
		ARRAY_RANGE_RE 			= /([a-zA-Z_$\d]+)\s*\[\s*([^\s->]*)?\s*(->)?\s*([^\s->]+)?\s*\]/g,
	
		THROW_RE 				= /throw/g,
		THROW_END_RE 			= /\)/g,
			
		IDENTIFIER_RE			= /^[a-zA-Z_$\d]+$/,
		QUOTED_IDENTIFIERS	= ["class", "super", "default"]
	;

	hope.SmartJS = {
		_debugging : false,
		_timing : false,
	
// TODO: take in initial properties (from "parsed")
		transformClassString : function(text, className, superClassName, initialProperties) {
			var parsed = {
				className			: className,
				superClassName		: superClassName, 

				prefix				: "",	// stuff to go at front of class def
				suffix				: "",	// stuff to go at end of class def
				
				constructor			: null,	// constructor function
				
				publicMethods		: {},
				publicProperties	: {},

				protectedMethods	: {},
				protectedProperties	: {},

				classMethods 		: {},
				classProperties 	: {},
				
				privateMethods 		: {},
				privateProperties 	: {}
			};
			hope.merge(parsed, initialProperties);
			this._parseClassScript(text, parsed);
			var output = this._outputParsedClass(parsed);
			if (this._debugging) {
				console.group("Complete output");
				console.info(output);
				console.groupEnd();
			}
			return output;
		},
	
		_parseClassScript : function(text, parsed) {
			if (this._timing) console.time("parsing class " + parsed.className);
			var className = parsed.className,
				superClassName = parsed.superClassName
			;
			// parse out all function definitions
			if (this.debugging) console.group("Parsing functions");
			var chopped = hope.chopOnExpressionAndEnd(text, FUNCTION_RE, FUNCTION_END_RE);
			for (var i = 0; i < chopped.length; i++) {
				var match = FUNCTION_RE.exec(chopped[i]);
				if (!match) continue;
				
				var type = (match[1] || "public"),
					methodName = match[2] || "", // TOTHROW: anonymous functions are bad!
					vars = match[3] || ""
				;
				var methodBody = chopped[i].substring(match[0].length);
				if (methodBody.lastIndexOf(";") == methodBody.length-1) methodBody = methodBody.substring(0, methodBody.length-1);

				// parse methodBody for super() etc calls
				methodBody = hope.SmartJS._mangleMethodBody(methodBody, methodName, className, superClassName);
				
				var method = "function "+methodName+"("+vars+") "+methodBody;
				if (methodName == className) {
					if (this._debugging) console.info("found constructor\n" + method);
					parsed.constructor = method;
				} else {
					if (this._debugging) console.info("found function:\n" + method);
					parsed[type + "Methods"][methodName] = method;
				}

				// remove what we matched out of the chopped array
				chopped[i] = "";
			}
			
			// put remaining chopped text back into text
			text = chopped.join("\n");
			if (this._debugging) console.groupEnd();
	
			// parse out all "method" definitions, which are generally aliases to other methods
			if (this._debugging) console.group("Parsing methods");
			var chopped = hope.chopOnExpressionAndEnd(text, FUNCTION_REF_RE, FUNCTION_REF_END_RE);
			for (var i = 0; i < chopped.length; i++) {
				var match = FUNCTION_REF_RE.exec(chopped[i]);
				if (!match) continue;
				
				var type = (match[1] || "public"),
					methodName = match[2] || "", // TOTHROW: anonymous functions are bad!
					vars = match[3] || ""
				;
				var methodBody = chopped[i].substring(match[0].length);
				if (methodBody.lastIndexOf(";") == methodBody.length-1) methodBody = methodBody.substring(0, methodBody.length-1);
				
				var method = methodName;
				if (this._debugging) console.info("found method '" + method + "' =\n" + methodBody);
				parsed[type + "Methods"][methodName] = methodBody;

				// remove what we matched out of the chopped array
				chopped[i] = "";
			}
			
			// put remaining chopped text back into text
			text = chopped.join("\n");
			if (this._debugging) console.groupEnd();

			
			// now parse all variable defs
			if (this._debugging) console.group("Parsing variables");
			var chopped = hope.chopOnExpressionAndEnd(text, PROPERTY_RE, PROPERTY_END_RE);
			for (var i = 0; i < chopped.length; i++) {
				var match = PROPERTY_RE.exec(chopped[i]);
				if (!match) continue;
				var type = (match[1] || "public"),
					propName = match[2] || "", // TOTHROW: anonymous properties are bad!
					nextChop = chopped[i+1] || ""
				;
				if (type == "default" || type == "var") type = "public";
				
				var propBody = chopped[i].substring(match[0].length);
				if (propBody.lastIndexOf(";") == propBody.length-1) propBody = propBody.substring(0, propBody.length-1);

				if (this._debugging) console.info("found "+ type + " '"+propName+"':\n" + propBody);
				parsed[type+"Properties"][propName] = propBody;

				// remove what we matched out of the chopped array
				chopped[i] = "";
			}	
			text = chopped.join("\n");
			if (this._debugging) console.groupEnd();
			
			// what's left?	
			if (this._debugging && text != "") {
				console.group("Here's what's we didn't process:");
				console.info(text);
				console.groupEnd();
			}

			if (this._timing) console.timeEnd("parsing class " + parsed.className);
		
			return parsed;
		},
		
		
		
		_mangleMethodBody : function(text, methodName, className, superClassName) {
			// change "super(...)" to call the superclass method
			var chopped = hope.chopOnExpressionAndEnd(text, SUPER_CALL_RE, SUPER_CALL_END_RE, true);
			for (var i = 0; i < chopped.length; i++) {
				if (typeof chopped[i] == "string") continue;

				var args = chopped[i][1].substring(0, chopped[i][1].length-1);
				if (args == "") args = "arguments";

				if (methodName == className) {
					chopped[i] = superClassName+".apply(this, "+args+")";
				} else {
					chopped[i] = superClassName+".prototype."+methodName+".apply(this, "+args+")";
				}
			}
			text = chopped.join("");
			
			// change "arguments[...]" to do the slice arguments thing
			// change "<array>[... -> ...]" to a slice as well (mainly for parity)
			text = text.split("-&gt;").join("->");
			var chopped = hope.chopOnExpression(text, ARRAY_RANGE_RE, null, true);
			for (var i = 0; i < chopped.length; i++) {
				if (typeof chopped[i] == "string") continue;
				var arrayName 	= chopped[i][1],
					start 		= chopped[i][2],
					arrow		= chopped[i][3],
					end			= chopped[i][4]
				;
				if (typeof arrow == "undefined" && arrayName != "arguments") {
					chopped[i] = chopped[i][0];
				} else {
					if (arrayName == "arguments") {
						chopped[i] = "Array.prototype.slice.call(arguments,"+(start||0)+","+(end ? end : "arguments.length")+")";
					} else {
						chopped[i] = arrayName+".slice(" + (start||0) + (end ? ", "+end : "") + ")";
					}
				}
			}
			text = chopped.join("");
			
			// change "throw(...)" to "throw new Error(this._error(arguments, ...))"
			// TODO: rename?
			var chopped = hope.chopOnExpressionAndEnd(text, THROW_RE, THROW_END_RE, true);
			for (var i = 0; i < chopped.length; i++) {
				if (typeof chopped[i] == "string") continue;
				var message = chopped[i][1];
				message = message.substring(1,message.lastIndexOf(")"));
				chopped[i] = "throw new Error(this._error(arguments, "+message+"))";
			}			
			text = chopped.join("");


			return text;
		},
		
		_outputParsedClass : function(parsed) {
			if (!parsed.className) {return "";}	// TOTHROW
			if (!parsed.superClassName) parsed.superClassName = "Class";

			if (this._timing) console.time("outputting class " + parsed.className);

			var output = [	"/*** create class "+parsed.className + " ***/",
							";(function() {\n"
						];

			// write out the script prefix
			if (parsed.prefix) output.push("\n\t"+parsed.prefix.split("\n").join("\n\t"));
			
			if (!parsed.constructor) {
				parsed.constructor = 
					"function "+parsed.className + "(){\n" +
					"\t	"+parsed.superClassName+".apply(this, arguments);\n" +
					"\t}";
			}

			// mangle constructor function, putting any {} or [] variables into constructor body
			var complexProps = null;
			for (var prop in parsed.publicProperties) {
				var value = parsed.publicProperties[prop];
				if (typeof value == "string" && (value.indexOf("[]") == 0 || value.indexOf("{}") == 0)) {
					complexProps = complexProps || {};
					complexProps[prop] = value;
					delete parsed.publicProperties[prop];
				}
			}
			if (complexProps) {
				// TODO: move into hope.function.addBeforeMethodBody() ?
				var methodStart = parsed.constructor.indexOf("{") + 1,
					header = parsed.constructor.substring(0, methodStart),
					body = parsed.constructor.substring(methodStart)
				;
				for (var prop in complexProps) {
					var propRef = (this._mustQuoteIdentifier(prop) ? "this['"+prop+"']" : "this."+prop);
					header = header + "\n\t\t" + propRef + " = " + complexProps[prop] + ";";
				}
				parsed.constructor = header + body;
			}
			
			output.push("\t/*** constructor ***/");
			output.push("\twindow." + parsed.className + " = " + parsed.constructor);

			if (!hope.objectIsEmpty(parsed.classProperties)) {
				output.push("\n\t/*** class properties ***/");
				for (var prop in parsed.classProperties) {
					var propRef = (this._mustQuoteIdentifier(prop) ? "['"+prop+"']" : "."+prop);
					output.push("\t"+parsed.className + propRef +" = " + parsed.classProperties[prop] + ";");
				}
			}

			if (!hope.objectIsEmpty(parsed.classMethods)) {
				output.push("\n\t/*** class methods ***/");
				for (var prop in parsed.classMethods) {
					output.push("\t"+parsed.className + "." + prop + " = " + parsed.classMethods[prop] + ";");
				}
			}

			if (!hope.objectIsEmpty(parsed.privateProperties)) {
				output.push("\n\t/*** private variables ***/");
				for (var prop in parsed.privateProperties) {
					output.push("\tvar " + prop + " = " + parsed.privateProperties[prop] + ";");
				}
			}

			if (!hope.objectIsEmpty(parsed.privateMethods)) {
				output.push("\n\t/*** private methods ***/");
				for (var prop in parsed.privateMethods) {
					output.push("\tvar " + prop + " = " + parsed.privateMethods[prop] + ";");
				}
			}

			var hasDefaults =  	 !hope.objectIsEmpty(parsed.publicProperties) 
							  || !hope.objectIsEmpty(parsed.publicMethods)
							  || !hope.objectIsEmpty(parsed.protectedProperties)
							  || !hope.objectIsEmpty(parsed.protectedMethods)
			;
			if (hasDefaults) {
				output.push("\n\t/*** instance properties and methods ***/");
				output.push("\tvar instanceDefaults = {");
				var defaultsOutput = [];
				if (!hope.objectIsEmpty(parsed.publicProperties)) {
					defaultsOutput.push("\n\t\t/*** public properties ***/");
					for (var prop in parsed.publicProperties) {
						defaultsOutput.push("\t\t" + this._outputProperty(prop, parsed.publicProperties[prop])+",");
					}
				}
				if (!hope.objectIsEmpty(parsed.protectedProperties)) {
					defaultsOutput.push("\n\t\t/*** protected properties ***/");
					for (var prop in parsed.protectedProperties) {
						defaultsOutput.push("\t\t" + this._outputProperty(prop, parsed.protectedProperties[prop])+",");
					}
				}
				
				if (!hope.objectIsEmpty(parsed.protectedMethods)) {
					defaultsOutput.push("\n\t\t/*** protected methods ***/");
					for (var prop in parsed.protectedMethods) {
						defaultsOutput.push("\t\t" + this._outputProperty(prop, parsed.protectedMethods[prop], false)+",");
					}
				}

				if (!hope.objectIsEmpty(parsed.publicMethods)) {
					defaultsOutput.push("\n\t\t/*** public methods ***/");
					for (var prop in parsed.publicMethods) {
						defaultsOutput.push("\t\t" + this._outputProperty(prop, parsed.publicMethods[prop], false)+",");
					}
				}
				defaultsOutput = defaultsOutput.join("\n");
				// get rid of the trailing comma
				defaultsOutput = defaultsOutput.substring(0, defaultsOutput.length - 1);
				output.push(defaultsOutput);
				output.push("\t};");
			}
			
			
			output.push("\n\t/*** set "+parsed.className+" as a subclass of "+parsed.superClassName+ " ***/");
			output.push("\thope."+parsed.superClassName + ".createSubclass(" 
						+ parsed.className + ", "
						+ (hasDefaults ? "instanceDefaults" : "null") + ", "
						+ "'"+parsed.className + "'"
						+ ");");

			if (!hope.objectIsEmpty(parsed.publicProperties)) {
				output.push("\n\t/*** remember public properties ***/");
				var propsOut = [];
				for (var prop in parsed.publicProperties) {
					propsOut.push('"' + prop + '"');
				}
				output.push("\n\t"+parsed.className+"._publicProperties = [" + propsOut.join(",") + "];");
			}
			
			

			// write out the script suffix
			if (parsed.suffix) output.push("\n\t"+parsed.suffix.split("\n").join("\n\t"));
						
			output.push("\n})();");
			output.push("/*** end class "+parsed.className + " ***/");

			if (this._timing) console.timeEnd("outputting class " + parsed.className);
			
			return output.join("\n");
		},
		
		_outputProperty : function(name, value, quoteValue) {

			if (value == "null" || value == null) {
				value = "null";
			} else if (value == "undefined" || value == undefined) {
				value = "undefined";
			} else if (value == "true" || value === true) {
				value = "true";			
			} else if (value == "false" || value === false) {
				value = "false";
			} else if (typeof value == "string" && (value.charAt(0) == "[" || value.charAt(0) == "{")) {
			
			} else if ( quoteValue !== false
						&& typeof value == "string" 
						&& value.indexOf("function") == -1
						&& value.charAt(0) != '"'
						&& value.charAt(0) != "'"
					) 
			{
				value = '"' + value + '"';
			}
			return (this._mustQuoteIdentifier(name) ? '"' + name + '"' : name) + " : " + value;
		},

		_mustQuoteIdentifier : function(name) {
			return IDENTIFIER_RE.exec(name) != null && QUOTED_IDENTIFIERS.indexOf(name) != -1;
		}
	}
})();



(function() {
	hope.ClassParser = {
		//
		//	code specific to parsing "<class>" definitions
		//
		/*
			Strategy:
				-- general: start with text, pull out things we recognize, flag stuff we don't understand
	
				- pull out all "<class...</class>" entities (assume NOT nested)
					- go through each top-level tag, putting things into a hash
						- <properties .../> 
							- go into a hash
						- <javascript>...</javascript> 
							- parse JS and go into the hash
						- <templates>...</templates> 
							- get converted to Template objects, incl. rewrite function
							- hook up file#class as the main template for the class
						- console.warn() about things we don't understand
					- run though hash outputting scoped function
				- concat the scoped functions into a normal JS script block 
				- (page parser will install that via a dynamic script tag)
	
			
			TODO:
					- do something about case sensitivity of props here?
					- default file extension as   XXX.smartJS ?  case sensitive?
					- multiple scripts in the same class?
					- default language for class (for inline event handlers) ?
					- if debugging, put source text in comment before that section of the output?
					- auto-load class tags from hope/classes/ClassName.hope ?
					- actually look for class tags!  :-)
					- smartJS to create a constructor function if none provided
					- grab 'properties' and pass those in to SmartJS.transform
					- SmartJS.transform to handle properties (or is that here?)
					- handle all TOTHROWs
	
		*/
	
		_debugging : false,
		_timing : false,
		
		loadClassFile : function(src, baseLocation) {
			if (this._timing) console.time("loadClassFile "+src);
			var srcLocation = new hope.Location(src, baseLocation);
			var contents = srcLocation.load();
			var classScript = (hope.ClassParser._parseClassTagsFromText(contents, srcLocation));
			hope.insertScript(classScript, {from:src, language:"javascript", generatedFrom:"ClassParser"});
			if (this._timing) console.timeEnd("loadClassFile "+src);
		},
		
		parseClassTags : function(text, baseLocation) {
			if (this._timing) console.time("parseClassTags");
			if (text == null) text = hope.byTag("HTML")[0].innerHTML;
			var classScript = hope.ClassParser._parseClassTagsFromText(text, baseLocation);
			if (classScript) {
				if (this._debugging) {
					console.group("Creating class tags yielded:");
					console.log(classScript);
					console.groupEnd();
				}
				hope.insertScript(classScript, {from:window.location.href, language:"javascript", generatedFrom:"ClassParser"});
			}
			if (this._timing) console.timeEnd("parseClassTags");
		},
		
		
		_parseClassTagsFromText : function(text, baseLocation) {
			var classTags = hope.getTagsInText(text, "class");
			if (classTags.length == 0) return "";
			var classScript = [];
			for (var i = 0, classTag; classTag = classTags[i]; i++) {
				if (classTag.attributes.src != null) {
					var srcLocation = new hope.Location(classTag.attributes.src, baseLocation);
					var contents = srcLocation.load();
					classScript.push(hope.ClassParser._parseClassTagsFromText(contents, srcLocation));
				} else {
					classScript.push(hope.ClassParser._parseClassTag(classTag, baseLocation));
				}
					
			}		
			
			classScript = classScript.join("\n\n\n");
			return classScript;
		},
		
		_parseClassTag : function(classTag, baseLocation) {
			var className = classTag.attributes.id,						// TOTHROW
				superClass = classTag.attributes["super"] || "Class",
				classScript = [],
				classProperties = {
					prefix : "",
					suffix : "",
					publicProperties : {}
				}
			;
		
			// parse any 'property' nodes
			var propertyTags = hope.getTagsInText(classTag.innerHTML, "property");
			for (var i = 0, propertyTag; propertyTag = propertyTags[i]; i++) {
				var name = propertyTag.attributes.name,
					type = propertyTag.attributes.type,
					value = propertyTag.innerHTML
				;
				// TODO: handle other types ?  how to do, eg, dates?
				// TODO: aspects for classes?
				if (type == "boolean") {
					if (value == "false") value = false;
					else value = true;			// TODO ???
				} else if (type == "number") {
					value = parseFloat(value);
					if (isNaN(value)) value = 0;
				}
				// TODO: remember the type somehow?
				classProperties.publicProperties[name] = value;
			}
	
			// parse any templates from the class and expand them to a script
			var templateScript = [];
			var templateTags = hope.getTagsInText(classTag.innerHTML, "template");
			for (var i = 0, templateTag; templateTag = templateTags[i]; i++) {
				templateScript.push(hope.Template.makeTemplateScriptFromTag(templateTag));
				var id = templateTag.attributes.id;
				var shortId = id.substring(id.indexOf("#")+1);
				if (shortId == className) {
					classProperties.publicProperties.template = id;
				}
			}
			classProperties.suffix += templateScript.join("\n");
	
			// parse any scripts in the class
			// NOTE: we currently only handle a single top-level script tag of type SmartJS well...
			var scriptTags = hope.getTagsInText(classTag.innerHTML, "script");
	
			// if there is no script tag, just transform an empty string and SmartJS will do the right thing
			if (scriptTags.length == 0) {
				classScript.push(hope.SmartJS.transformClassString("", className, superClass, classProperties));
			} else {
				for (var i = 0, scriptTag; scriptTag = scriptTags[i]; i++) {
	//				if (scriptTag.attributes.language.toLowerCase() != "smartjs") throw Error(this._error("Only SmartJS scripts supported"));
					if (scriptTag.attributes.src) {
						var srcLocation = new hope.Location(scriptTag.attributes.src, baseLocation);
						var contents = srcLocation.load();
						var transformedScript = hope.SmartJS.transformClassString(contents, className, superClass, classProperties);
					} else {
						var transformedScript = hope.SmartJS.transformClassString(scriptTag.innerHTML, className, superClass, classProperties);
					}
					classScript.push(transformedScript);
				}
			}
			
			return classScript.join("\n") + "\n\n\n";
		},
	
		_error : hope._error
	}
	
	// set up an "hope.onload" event to parse all class tags in the page
	hope.listenFor(hope,"onload", function(){hope.ClassParser.parseClassTags();});
})();



// load the default classes
//hope.ClassParser.loadClassFile("${hope}/control.class");
	hope.include("${hope}/Control.js");
