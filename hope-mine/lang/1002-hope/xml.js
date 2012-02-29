hope.extend(hope, {
	isAnElement : function(it) {
		return (it != null && it.parentNode != null);
	},
	
	// xml/html manipulation utilities
	xml : {

		/** Native environment objects to parse/serialize XML.
			Work in Gecko/Webkit, probably not elsewhere.
		*/
		_parser  	: new DOMParser(),
		_serializer : new XMLSerializer(),

		/** Given an html/xml element, return an object with all of the attributes of the element. 
			Returns null if element has no attributes.
		*/
		attributes : function(element, object) {
			if (!element || !element.hasAttributes()) return object;
			if (!object) object = {};
			var i = 0, attribute;
			while (attribute = element.attributes[i++]) {
				object[attribute.name] = attribute.value;
			}
			return object;		
		},
		
		/** Given a string of XML, return an XML element (NOT document). */
		fromString : function(string, mimeType) {
			var doc = hope.xml._parser.parseFromString(string, mimeType || "text/xml");
			if (	doc.documentElement.nodeName == "parsererror"		// gecko
				||  doc.documentElement.querySelector("parsererror"))	// webkit
			{
				hope.error("Couldn't parse xml string:\n",doc.documentElement.firstChild.textContent);
			} else {
				return doc.firstChild;
			}
		},
		
		/** Given an XML/HTML element, convert it to a string */
		toString : function(element) {
			return hope.xml._serializer.serializeToString(element);
		},

		/** Given an XML/HTML element, convert it to a string */
		childrenToString : function(element) {
			var results = [], child, i=-1;
			while ( (child = element.childNodes[++i]) != null) {
				results[i] = hope.xml._serializer.serializeToString(child);
			}
			return results.join("\n");
		},


		/** Given an xml/html element, try to parse it according to known tag names.
			Default is to just create an anonymous object.
		*/
		// TODO: introduce namespaces
		Parsers : {
			hope : {}
		},
		register : function(tagName, callback, namespace) {
			if (namespace == null) namespace = "hope";
			if (!this.Parsers[namespace]) this.Parsers[namespace] = {}; 
			this.Parsers[namespace][tagName.toLowerCase()] = callback;
		},

		/** Convert an html/xml node (and all children if any) to JS object(s).
			- Element nodes will be converted to JS objects
				- object will have all element attributes as strings (courtesy of attributesOf())
				- object.__tagname == tag name of the element
				- object.children == hope.childrenToObjects(element.childNodes)
			- Document nodes will call recursively on their first child
			- text/CDATA nodes will be returned as a string
			- comment and other types of nodes will return undefined
		*/
		toJs : function(node, namespace, object) {
			if (!node) return;

			// note: order in the switch below is based on expected frequency
			switch (node.nodeType) {
				// handle text nodes
				case Node.TEXT_NODE:
					return node.textContent;

				// handle element nodes
				case Node.ELEMENT_NODE:

// TODO: handle hooking "onXXX" things up as Events
/*
					// parse according to the namespace
					if (namespace !== "object") {
						var tagName = node.tagName.toLowerCase(),
							parser =   this.Parsers[namespace||"hope"][tagName]
									|| this.Parsers.hope[tagName]		// try in hope namespace
						;
						if (parser) {
							if (parser.fromXML) 	return parser.fromXML(node, namespace);
							else					return parser(node, namespace);
						}
					}
*/
					if (namespace != "object") {
						var tagName = node.tagName.toLowerCase();
						
						// handle event hookup:  <onloaded  or <onset, etc
						if (tagName.substr(0,2) == "on") {
							// create an observation object and give it the attributes of the node
							var observation = new hope.Observation(tagName.substr(2));
							this.attributes(node, observation);
							// if no callback specified, create a function with the node textContent
							if (!observation.callback) {
								observation.callback = Function("data,observee,part", node.textContent);
							}
							return observation;
						}
						
						
						var	constructor =   this.Parsers[namespace||"hope"][tagName]
										 || this.Parsers.hope[tagName]	// default to hope namespace
						;
						if (constructor) {
							if (constructor.parseXML) {
								return constructor.parseXML(element, namespace, object);
							} else {
								// create a new instance of the constructor
								var options = this.attributes(node);
								if (!object) {
									object = new constructor(options);
								} else {
									if (object.set) object.set(options);
									else			hope.extend(object, options);
								}
								
								if (node.childNodes.length) {
									var i = 0, child, childObject, value = "";
									while (child = node.childNodes[i++]) {
										childObject = this.toJs(child);
										if (childObject == null) continue;
										if (typeof childObject === "string") {
											value += childObject;
										} else if (childObject.isAnObservation) {
											object.observe(childObject.event, childObject);
										} else {
											var property = childObject.Class.name || child.tagName;
											if (object.set) object.set(property, childObject);
											else			object[property] = childObject;
										}
									}
									if (value != "") object.set("value", value);
								}
								return object;
							}
						}
					}

					// if we get here, parse as an anonymous object
					return this.toObject(node, namespace);

				case Node.CDATA_SECTION_NODE:
					return node.textContent;

				// for documents, return their first child
				case Node.DOCUMENT_NODE:
					return this.toJs(node.firstChild, namespace);
			}
		},

		/** Convert an element to an anonymous JS object. 
			Children will be converted via childrenToObjects, which uses toJs.
		*/
		toObject : function(element, namespace){
			var object = this.attributes(element) || {};
			object.__tagname = element.tagName;
			if (element.hasChildNodes()) {
				var children = this.childrenToObjects(element, namespace);
				if (children) object.children = children;
			}
			return object;
		},

		/** Given an html/xml element root, return all children as an array of JS objects. 
			- element nodes will be converted via hope.toObject()
			- comment nodes will be ignored
			- text nodes will be returned as strings
			- adjacent text nodes (including those split by comments) will be merged
			- whitespace between elements is ignored
			
		*/
		childrenToObjects : function(root, namespace, selector) {
			var elements = (selector ? document.findAll(selector, root) : root.childNodes);
			if (!elements.length) return null;
			var results = [], 
				element, result, 
				i = 0,
				count = 0,
				previous
			;
			while (element = elements[i++]) {
				var result = hope.xml.toJs(element, namespace);
				if (result == null) continue;
				// process strings
				if (typeof result === "string") {
					// convert all-whitespace runs to a single space
					if (result.isAllSpaces()) {
						// skip leading or trailing whitespace
						if (count == 0 || i == elements.length) continue;
						result = " ";
					}
					// if previous was a string, add the string to that
					if (typeof previous === "string") {
						previous = (results[count-1] = previous + result);
						continue;
					}
				}
	
				// if previous is all-whitespace, overwrite it
				if (typeof previous === "string" && previous.isAllSpaces()) {
					count--;
				}
				// otherwise add the next result
				previous = results[count++] = result;
			}
			
			return (results.length ? results : null);
		},
		
		
		_addError : function(object, method, args, message) {
			if (!object.__errors) object.__errors = [];
			object.__errors.push([method, message, args]);
			console.warn(method,args,": ",message);
		},
		
		toObjectMap : function(node, tagNameMap, parentObject) {
			if (!node) return;
		
			// note: order in the switch below is based on expected frequency
			switch (node.nodeType) {
				// handle element nodes
				case Node.ELEMENT_NODE:
					var object = this.attributes(node),
						hasAttributes = (object != null)
					;
					if (!object) object = {};
					object.tagname = node.tagName.toLowerCase();
					if (node.childNodes.length) {
						var children = node.childNodes, child, 
							result, i=0, text=[]
						;
						while (child = children[i++]) {
							result = this.toObjectMap(child, tagNameMap, object);
							if (result == null) continue;
							
							// append all strings as a single 'value' property
							if (typeof result === "string") {
								// convert all-whitspace runs to a single space
								if (result.isAllSpaces()) {
									// skip leading or trailing space
									if (text.length === 0 || i === children.length) continue;
									// skip if last text bit is also whitespace
									if (text[text.length-1] === " ") continue;
									text.push(" ");
								} else {
									text.push(result.trimBlankLines());
								}
							// not a string
							} else {
								// XXX:  Enable the below to ALSO stick all object results into __children
								// if (!object.__children) object.__children = [];
								// object.__children.push(result);

								var tagName = child.tagName.toLowerCase();
								if (object[tagName]) {
									if (!(object[tagName] instanceof Array)) object[tagName] = [object[tagName]];
									object[tagName].push(result);
								} else {
									object[tagName] = result;
								}

								hasAttributes = true;

								// if the tag is in the tagNameMap, also insert into an indexed 'set'
								if (tagNameMap && tagNameMap[tagName]) {
									var setName = tagNameMap[tagName].set || tagName+"s",
										set = object[setName] || (object[setName] = {}),
										key = tagNameMap[tagName].key,
										index = result[key]
									;
									if (!index) {
										this._addError(object, "toObjectMap", [node,child],
														"child does not have a '"+key+"' property; skipping child");
										continue;
									}
									if (set[index]) {
										this._addError(object, "toObjectMap", [node,child],
														setName+" already has a '"+key+"' property; skipping child");
										continue;
									}
									set[index] = result;
								}
							}
						}
						if (text.length) {
							text = text.join("");
							if (!text.isAllSpaces()) {
								object.value = (object.value ? object.value : "") + text;
								hasAttributes = true;
							}
						}
					}
					return (hasAttributes ? object : null);
		
				// handle text nodes
				case Node.TEXT_NODE:
				case Node.CDATA_SECTION_NODE:
					return node.textContent;
		
				// for documents, return their first child
				case Node.DOCUMENT_NODE:
					return this.toObjectMap(node.firstChild, tagNameMap);
			}
		}
		
	}	// end xml
});

