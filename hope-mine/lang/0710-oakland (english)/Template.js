/*
	Templates and template ids:
		- a template is an object that encapsulates a template expansion function

		- templates are specified by id as  file#id
			-   controls#TabPanel				maps to file:    Template._fileRoot+"controls.templates" and <template id="TabPanel"/>
			-   templates/controls#TabPanel		maps to file:    Template._fileRoot+"templates/controls.templates" and <template id="TabPanel"/>
			-   #TabPanel						maps to: 		<template id="TabPanel"/> in the html file of the current scope

		- usage:
			var template = Template.byId(templateId);
			var expandedText = template.expand(dataObject);

	* TODO:
		- convert this to a <class> ?
		- when pulling templates from the body, FF doesn't do nested tags properly, so with this:
				<someTag/> <someTag/>
			you'll only end up with a single entry rather than two
			? parse ourselves ???
		- template names case insensitive ?
		- handle nested templates in templates
		- nesting variable refs, esp inside functions:  ${handleEvent("load", "${someMessage}")}
		- handle property name translation semantics:     <properties someMessage:en='Message in english' /> 
			- is this correct attribute syntax?   en:someMessage ?
		- template.properties are the only things we save ???
		- template root?  load template from arbitrary URL? 
		- what does pre-processing the templates look like?
		- more efficient way to execute than new Function() ? -- check append to script
		- how to reload a class?
		- clear comments out of the source before expanding?  property?
		- how can we put classes/styles on the outer node and have them apply to the inner (eg: table)
		- when rendering:
				- ${contents} = put contents here
		- when grabbing template properties, defaults from markup, etc, 
				- translate "false", numbers, etc


	 * template semantics:
		templates are called with the data object as "this"
	
	 * things we understand in templates
		- direct replacements
			- ${foo}					-- replace with "this.foo"
			- ${foo(arg1,etc)}			-- replace with results of function "this.foo(arg1,etc)"
			- ${something.foo}			-- replace with "something.foo" (global reference)
			- ${something.foo(args)}	-- replace with results of function "something.foo(args)" (global reference)
	
		- control structures
			- <$if ${replacement} >...<$/if>	
					- if statement, "..." is output if condition is true
					- replacement has same semantics as replacement above
	
			- <$foreach ${arrayReplacement} >...<$/foreach>	
					- repeat for each item in arrayReplacement (assumed to be an array)
					- variable "it" is set to the item in array replacement, eg "foo${it}bar"
	
			- <$template ${templateName} />
					- recursively call templateName with same data object as "this"
	
			- <$template ${templateName} ${replacement} />
					- recursively call templateName with <replacement> as new data object
	
			- <$>...</$>
					- nest arbitrary JS
	

*/

(function() {
	function Template(props) {
		// mix the properties passed in into us
		hope.mixin(this, props);
		Template.registerTemplate(this);
	}
	hope.Class.createSubclass(Template, {
		_debugging 			: false,
		_timing 			: false,
		
		trimWhiteSpace 		: true,			// true == remove whitespace between tags
		outerTag			: "span",		// outer node to create for the template contents
		innerTag			: null,			// tag(s) inside the template to use as the template contents
		"class"				: "",			// class name applied to the element (along with stuff from the constructor)
	
		expandToHtml : function(thisObject, arg1, arg2, etc) {
			var innerHTML = this._expander.call(thisObject, hope.sliceArgs(arguments,1));
			return innerHTML;
		},
	
	//TODO:  innerTag
		// expand into a new node.  Call this when there is NOT a source node in the document to start with.
		expand : function(thisObject, parentNode, newNodeProps, arg1, arg2, etc) {
			var html = this._expander.call(thisObject, hope.sliceArgs(arguments,3));
			var outerNode = hope.createElement(this.outerTag, html, parentNode, newNodeProps);
			this._setupContentsNode(thisObject);
			return outerNode;
		},
	
		// expand a template into a new node, including reparenting any contents of the node if it has any
	// TODO: assumes that template expansion returns a single top-level node -- bad assumption?
	// TODO: if no outerTag, assume the template will return a single node which we will be the top node
		expandFromSourceNode : function(thisObject, sourceNode, newNodeProps, arg1, arg2, etc) {
			var html = this._expander.call(thisObject, hope.sliceArgs(arguments,3));
			var newNode;
			if (this.innerTag) {
				var outerNode = hope.createElement(this.outerTag, html);
				var newNode = outerNode.getElementsByTagName(this.innerTag)[0];
				if (!newNode) throw Error(this._error("expected to find some "+this.innerTag+"s in the template output!"));
				hope.mixinToNode(newNode, newNodeProps);
				hope.reparentList(thisObject.parent.contentsNode, [newNode]);
			} else {
				var newNode = hope.createElement(this.outerTag, html, null, newNodeProps);
		
				hope.reparentListBefore(sourceNode, [newNode]);
			}
	
			sourceNode.parentNode.removeChild(sourceNode);	
			this._setupContentsNode(thisObject);
			if (thisObject.contentsNode) {
				hope.reparentList(thisObject.contentsNode, sourceNode.childNodes);		
			}
			return newNode;
	
		},
	
		_setupContentsNode : function(thisObject) {
			// if the node has a spot for its contents, set it up now
			var contentsNode = hope.byId(thisObject.id + "_CONTENTS");
			if (contentsNode) {
				thisObject.contentsNode = contentsNode;
			}	
		}
	});
	
	
	
	// add static properties to the template object
	hope.mixin(Template, {
		_timing : false,
		_debugging : false,
	
	
		// root of the templates, relative to the file that's loaded (TODO...  rationalize this)
		_templateRoot : "scripts/",
		_templateFileExtension : ".templates",
	
		// map of Templates by template id, after they have been parsed
		_templates : {},
	
		// map of template strings by template id, after they have been loaded but not parsed
		//	value of each is the tag as returned by hope.getTagsInText()_
		_unparsedTemplateTags : {},
		
		// map of template files we have already parsed, so we don't load them again
		//	value of each is "true" if file has been loaded
		_loadedTemplateFiles : {},
	
		// return a template (by id or as template instance).  Loads and parses the template if necessary.
		// Efficient to call multiple times.
		byId : function(id) {
			if (!id) return null;
			// if template is an instance of the template class return template
			if (id._isATemplate) return id;
	
			// if we've already parsed that template, just return it
			if (Template._templates[id]) return Template._templates[id];
	console.warn("loading templates for "+id);		
			return this.loadAndCreateTemplate(id);
		},
		
		// 
		registerTemplate : function(template) {
			Template._templates[template.id] = template;
			return template;
		},
		
		loadAndCreateTemplate : function(id) {
			// load the file for the template (noop if already loaded)
			Template._loadFileForTemplate(id);
	
			// look in the list of templates that we've loaded but not parsed 
			var tag = Template._unparsedTemplateTags[id];
			if (!tag) throw Error(this._error(arguments, "Template tag not found"));
	
			// we found one -- create it as a template and parse it
			var template = Template.makeTemplateFromTag(tag);
			delete Template._unparsedTemplateTags[template.id];
	
			return template;	
		},
		
		//
		//	Creating template expansion function
		//
		
		// parse the template and put all properties of it into this object
		_controlStatementTokenStart : "<$",
		_controlStatementTokenEnd   : ">",
		_controlStatementChopper : /<\$>[\s\S]*<\/\$>|<\$[\w\s]*[^>]*?\/>|<\$([\w\s]*)[\s\n]+[^>]*?>[\s\S]*?<\/\$\1\s*>/g,
		_replacementTokenStart : "${",
		_replacementTokenEnd   : "}",
		_replacementTokenExpression : /^\s*\$\{\s*(.*?)\s*\}\s*$/,
		
		// NOTE: this only handles syntax:  <$method ${arg1} ${arg2} >
		_unaryStatementParser : /^<\$([\w]*)[\s\n]*(?:\${(.*?)})?[\s\n]*(?:\${(.*?)})?[^>]*\/>/,
		_binaryStatementParser : /^<\$([\w\s]*)[\s\n]+(?:\${(.*?)})?[\s\n]*(?:\${(.*?)})?[\s\n]*(?:\${(.*?)})?[^>]*?>([\s\S]*?)<\/\$\1\s*>/,
		_arbitraryStatementParser : /^<\$()()()>([\s\S]*)<\/\$>/,
	
	
		// given a template tag from a document somewhere (as returned by hope.getTagsInText(text,"template") )
		//	create a Template instance, register it and return it
		makeTemplateFromTag : function(templateTag) {
			var template = new Template(templateTag.attributes);
			if (!template._expander) {
				var html = templateTag.innerHTML;
	
				// trim whitespace if necessary
				var trimWhiteSpace = (templateTag.attributes.trimWhiteSpace == "true" || Template.prototype.trimWhiteSpace);
				if (trimWhiteSpace) html = hope.trimSpaceAfterTags(html);
	
				template._expander = Template._makeTemplateExpander(templateTag.attributes.id, html);
			}
			return template;
		},
	
	
		// given a template tag from a document somewhere (as returned by hope.getTagsInText(text,"template") )
		//	return script to instantiate that template, including its _expander function
		makeTemplateScriptFromTag : function(templateTag) {
			var shortId = templateTag.attributes.id.substring(templateTag.attributes.id.indexOf("#")+1);
			var output = ["/*** create template '"+templateTag.attributes.id+"' ***/",
						  "new hope.Template({"];
			for (var prop in templateTag.attributes) {
				output.push("\t'"+prop+"' : '"+templateTag.attributes[prop]+"',");
			}
			output.push("\t_expander : function "+shortId+"_expander(){");
			output.push("\t\t"+Template._makeTemplateExpanderScript(templateTag.attributes.id, templateTag.innerHTML).split("\n").join("\n\t\t"));
			output.push("\t}");
			output.push("});");
			return output.join("\n");
		},
	
	
		// NOTE: assumes that the template is known to not have been loaded already
		_makeTemplateExpander : function(id, templateHTML) {
			if (Template._timing) console.time("Template._makeTemplateExpander("+id+")");
			if (Template._debugging) {
				window.text = templateHTML;
				console.group("creating template function for "+id);
				console.group("input:");
				console.debug(templateHTML);
				console.groupEnd();
			}
	
			var output = Template._makeTemplateExpanderScript(id, templateHTML);
	
			if (Template._debugging) {
				console.group("output:");
				console.debug(output);
				console.groupEnd();
			}
	
			var expander = hope.makeFunction(output);
			
			if (Template._debugging) {
				console.group("method:");
				console.debug("" + expander);
				console.groupEnd();
				console.groupEnd();
			}
			
			if (Template._timing) console.timeEnd("Template._makeTemplateExpander("+id+")");
			return expander;
		},
	
		_makeTemplateExpanderScript : function(id, templateHTML) {
			
			var output = [
							"try {",
							"	var output = [];", 
							"	if (this._border) output.push(this._border.getTemplateHtml(this));"
						];
			output.push(Template._makeSubExpressionExpander(templateHTML, "\t"));
	
			output.push(
							"	return output.join('');",
							"} catch (e) {",
							"	console.error('Error expanding template \""+id+"\": '+e.message);",
							"	throw e;",
							"}"
						);
			return output.join("\n");
		},
	
	
		_makeSubExpressionExpander : function(text, indent) {
			var tokens = hope.chop(text, Template._controlStatementChopper);
			if (Template._debugging) {
				console.dir(tokens);
			}
			var output = [];
			for (var i = 0, len = tokens.length; i < len; i++) {
				output.push(Template._makeTokenExpander(tokens[i], indent));
			}
			return output.join("\n"+indent);
		},
		
		_makeTokenExpander : function(token, indent) {
			// handle control statements
			if (token.indexOf(Template._controlStatementTokenStart) == 0) {
				return Template._makeControlStatementExpander(token, indent);
			}
			
			// strings, possibly with replacements
			return "\toutput.push(\n" + indent + "\t" + Template._makeReplacementsExpander(token, indent+"\t") + "\n" + indent + ");";
		},
	
		_makeControlStatementExpander : function(text, indent) {
			var match = hope.firstMatch(text, Template._binaryStatementParser, Template._unaryStatementParser, Template._arbitraryStatementParser);
			if (!match) throw Error(Template._error(arguments, "Couldn't match control statement"));
			var operator = match[1].toLowerCase(),
				arg1	 = match[2],
				arg2	 = match[3],
				arg3	 = match[4],
				subExpression = match[5]
			;
	
			switch (operator) {
				case ""			:	return Template._makeArbitraryStatementExpander(subExpression, indent);
	
				case "template"	:	return Template._makeTemplateStatementExpander(arg1, arg2, indent);
	
				case "if"		:	
				case "else"		:	
				case "elseif"	:	
				case "else if"	:	return Template._makeIfStatementExpander(operator, arg1, subExpression, indent);
	
				case "foreach"	:	return Template._makeForEachStatementExpander(arg1, arg2, arg3, subExpression, indent);
	
				case "contents"	:	return Template._makeContentsStatementExpander(subExpression, indent);
				case "event"	:	return Template._makeEventExpander(arg1, indent);
			}
		},
	
	
		_makeArbitraryStatementExpander : function(subExpression, indent) {
			return indent + subExpression.split("\n").join("\n"+indent);
		},
	
		_makeEventExpander : function(eventName, indent) {
			return indent + "output.push(\"on"+eventName+"='Control.byId(\\\"\"+this.id+\"\\\").handleBrowserEvent(event)'\")";
		},
	
		_makeTemplateStatementExpander : function(id, thisObject, indent) {
			var output = [
				"output.push(Template.byId('"+id+"').expandToHtml("+(thisObject || "this")+"));"
			];
			return indent + output.join("\n"+indent)+"\n";
		},
	
		_makeIfStatementExpander : function(operator, conditionRef, subExpression, indent) {
			if 		(operator == "if") 		operator = "if (" + Template.getReplacementExpansion(conditionRef) + ") {";
			else if (operator == "else if")	operator = "} else if (" + Template.getReplacementExpansion(conditionRef) + ") {";
			else if (operator == "else")	operator = "} else {";
	
			var output = [ 	
							operator, 
								"\t"+Template._makeSubExpressionExpander(subExpression, indent+"\t"),
							"}"
			];
			
			return output.join("\n"+indent)+"\n";
	
		},
		
		_makeForEachStatementExpander : function(arrayRef, itRef, indexRef, subExpression, indent) {
			itRef = itRef || "it";
			indexRef = indexRef || "___i";
			var output = [
				"var ___array = "+Template.getReplacementExpansion(arrayRef)+";",
				"if (___array && ___array.length) {",
				"	for (var "+indexRef+" = 0; "+indexRef+" < ___array.length; "+indexRef+"++) {",
				"		var "+itRef+" = ___array["+indexRef+"];",
			];
			
			output.push(Template._makeSubExpressionExpander(subExpression, indent));
			
			output.push(
				"	}",
				"}"
			);
			
			return output.join("\n"+indent)+"\n";
		},
		
		// output the script to show for a series of replacements (eg: anything other than a control statement)
		_makeReplacementsExpander : function(text, indent) {
			// if there are no replacements in the text, just return it
			if (text.indexOf(Template._replacementTokenStart) == -1) {
				return "'"+hope.makeQuoteSafe(text)+"'";
			}
			
			// split into tokens, which will alternate string/replacement/string/replacement
			var tokens = hope.chopOnToken(text, Template._replacementTokenStart, Template._replacementTokenEnd);
			var replacements = [];
	
			for (var i = 0, len = tokens.length; i < len; i++) {
				var token = tokens[i];
				// if the token is a replacement, add some script to update with the actual value
				if (token.indexOf(Template._replacementTokenStart) > -1) {
					token = token.match(Template._replacementTokenExpression)[1];
					replacements.push(Template.getReplacementExpansion(token));
				} else {
					// just write the token to the output
					replacements.push("'"+ hope.makeQuoteSafe(token) + "'");
				}
			}
			return replacements.join(",\n			");
		},
		
	
		_makeContentsStatementExpander : function(subExpression, indent) {
			return ["output.push(\"<span id='\" + this.id + \"_CONTENTS' ",
										"class='contents \" + (this._border ? this._border.spacingClass : '') + \"'>",
								  "</span>\");"
					].join("");
		},
	
	
		// given a replacement token, return the script to invoke that
		//	NOTE: current if there is no "." expression in the token, we put "this." before it
		//			if you want to access a global, use "window.foo"
		// TODO: how can we make this handle expressions, like with if()?
		getReplacementExpansion : function(token) {
			// TODO: make this more robust?  or can we assume we have just a token?  trim?
			if (token == "innerHTML") return "this.domNode.innerHTML";
			if (token.indexOf(".") == -1) token = "this."+token;
			return token;
		},
		
		
		
		//
		//	Node expansion
		//
		
		// TODO: make this work with any page
		expandPageNodes : function() {
			var parent = hope.byTag("HTML")[0];
			this.expandNodes(parent, "page");
		},
		
		
		// given a DOM parent (default is BODY), expand all top-level nodes we find in there
		//	child nodes will be expanded by their parent as appropriate
		expandNodes : function(parent, location) {
			if (location == null) location = "page";
			if (!parent) return;
			var nodes = Template.getTemplateNodes(parent);
			if (this._timing) console.time("Expanding nodes in "+parent);
			for (var i = 0; i < nodes.length; i++) {
				var node = nodes[i];
				var constructor = hope.getConstructor(node.tagName);
				if (constructor) {
					var nodeAttributes = hope.getNormalizedAttributes(node);
					var it = new constructor(nodeAttributes, {_srcLocation:location});
					it.domNode = node;
					if (it.autodraw) it.draw();
				}
			}
			if (this._timing) console.timeEnd("Expanding nodes in "+parent);		
		},
		
		// load a template file and put all of the templates into this._unparsedTemplateTags
		// loads the file via XHR if necessary, pulls from our caches if we can
		_loadFileForTemplate : function(id) {
			var split = id.split("#"),
				file = split[0],
				id = split[1]
			;
	
			if (this._loadedTemplateFiles[file]) return;
			if (this._timing) console.time("Template._loadFileForTemplate()");
			if (file == "") {
				// find in an element already loaded in the page
				var fileContents = hope.byTag("HTML").innerHTML;
			} else {
				var url = this._templateRoot + file + this._templateFileExtension;
				try {
					var fileContents = hope.getFile(url);
				} catch (e) {
					throw Error(this._error(arguments, "couldn't load file ", url));
				}
			}
			
			// use regexes to parse the templates out
			var tags = hope.getTagsInText(fileContents, "template");
			for (var i = 0; i < tags.length; i++) {
				var tag = tags[i],
					id = tag.attributes.id
				;
				if (id == null) this._warn(arguments, "template number ", i, " in file ", file," did not specify an id");
				else			this._unparsedTemplateTags[id] = tag;
			}
			
			// note that we've already loaded this file
			this._loadedTemplateFiles[file] = true;	
	
			if (this._timing) console.timeEnd("Template._loadFileForTemplate()");
		},
		
		
		//
		//	parsing template nodes (eg: nodes to be replaced) out of the document
		//
		
		// ??? name ???
		// register a particular node name as a "hope node" that we will process (see getHopeNodes)
		registerTemplateTag : function(name) {
			Template._templateTagList.push(name);
			Template._templateTagNameMap[name.toUpperCase()] = true;
		},
		_templateTagList : ["hope"],
		_templateTagNameMap : {hope:true},
	
		// return the tags under parent (default is the document) that are of a known hope node type
		// Marks each hope node:
		//			node._isTemplateNode  	= true
		//			node._templateParent  	= parent node in the hope hierarchy
		//			node._templateChildren	= array of children in the hierarchy
		//
		// What's actually returned is just an array of top-level nodes (eg: have no hope parent)
		//		use node._templateChildren to get the kids...
		//	
		getTemplateNodes : function(outerParent) {
			if (this._timing) console.time("Template.getTemplateNodes("+outerParent.tagName + "#"+outerParent.id+")");
	
			// find all of the elements in the body that have a tag name in hopeTagNames
			// NOTE: ran into a problem in FF2 where nodes inserted via innerHTML 
			//			were not being recognized by getElementsByTagName() 
			//			-- now we're looking at all elements in the page.  :-(
			//			-- nice thing about this is that we get elements in source order
			var templateElements = [];
			var allElements = outerParent.getElementsByTagName("*")
			for (var i = 0, element; element = allElements[i++];) {
				if (Template._templateTagNameMap[element.tagName]) {
					templateElements.push(element);
					element._isTemplateNode = true;
				}
			}
	
			// now for each element, iterate until we find the parent node that's also a hope node
			//	setting 	element.hopeParent 	 to its parent
			//	and 		parent.hopeChildren  to all children we find
			for (var i = 0, element; element = templateElements[i++];) {
				var parent = element.parentNode;
				while (parent && parent != document) {
					if (parent._isTemplateNode) {
						if (!parent._templateChildren) parent._templateChildren = [];
						if (parent._templateChildren.indexOf(element) == -1) parent._templateChildren.push(element);
						element._templateParent = parent;
						break;
					}
					parent = parent.parentNode;
				}
			}
			
			// now iterate, putting all the top-level nodes (without parents or whose parent is this) into an array
			var topLevel = [];
			for (var i = 0, element; element = templateElements[i++];) {
				if (element._templateParent == null || element._templateParent == outerParent) topLevel.push(element);
			}
			if (this._timing) console.timeEnd("Template.getTemplateNodes("+outerParent.tagName + "#"+outerParent.id+")");
			return topLevel;
		},
		_warn : hope._warn
		
	});

	// set up getters/setters for templat to make "class" and "className" synonymous
	Template.prototype.__defineSetter__("class", function(className) { return (this.className = className) });
	Template.prototype.__defineGetter__("class", function() { return this.className });
	
	// expand all templates in the top-level page when the page loads
	hope.listenFor(hope,"onload", function(){hope.Template.expandPageNodes();});
})();


