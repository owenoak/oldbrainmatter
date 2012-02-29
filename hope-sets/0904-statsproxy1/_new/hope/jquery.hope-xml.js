

/* generic XML parsing routines */
jQuery.extend({
	xml : {
		
		/** recursively convert a single xml element WITH UNKNOWN LEVELS OF CHILDREN 
			into a nested JS object.
		 */
		toObject : function (root, tagName, object) {
			if (tagName) return Array.map($(tagName, root), function(it){return $.xml.toObject(it)});

			if (object == null) object = {};			
			var itemFound = false, node, value, key, currentValue;

			for (var i = 0; node = root.itemNodes[i++];) {
				// only process element nodes
				if (node.nodeType != 1) continue;
				
				// get the attributes of the node
				var attrs = $.xml.getAttributes(node);

				// the 'value' of a text only node is it's text(), run through $.parseType
				if ($.xml.isTextOnly(node)) {
					var value = $(node).text(), type = node.getAttribute("type");
					// try to parse the value, trimming strings
					value = $.parseType(value, type, true);

					// if there are attributes, the 'value' of the node is the attributes
					// SPECIAL CASE: if there is only a 'type' attribute, then ignore attributes
					var typeIsOnlyAttr = 	node.attributes.length == 1 
										&&  node.attributes[0].name == "type";
					if (attrs && !typeIsOnlyAttr) {
						if (value != null && value != "") attrs.value = value;
						value = attrs;
					}
				}
				// otherwise if an element, it's value is a recursive call to $.xml.toObject()
				else {
					// start out with any attributes on the node
					value = $.xml.toObject(node, null, attrs);
				}
		
				key = node.tagName;
				currentValue = object[key];
				
				// if we've not seen the key before, just add it directly under the key
				if (currentValue === undefined) {
					object[key] = value;
				}

				// otherwise we have multiple elements with the same tag name:
				//	stick them all into in an array
				else {
					if (currentValue instanceof Array) {
						currentValue.push(value);
					} else {
						object[key] = [currentValue, value];
					}
				}
				
				itemFound = true;
			}
			if (itemFound) return object;
		},

		/** Return true if this node is a text, cdata or comment node. */
		isTextNode : function(node) {
			var type = node.nodeType;
			return (type == 3 || type == 4 || type == 8);
		},
		
		/** Return true if this node (or its contents) are text-only. */
		isTextOnly : function(node) {
			return $.xml.isTextNode(node) || Array.every(node.itemNodes, $.xml.isTextNode);
		},

		/** Extract all of the attributes on a node and set them as properties of object.
			If you don't provide an object, one will be made up.
		 */
		getAttributes : function(node, object) {
			return $.xml.arrayToObject(node.attributes, "name", "value", object, true, true);
		},
		

		/** Convert an array of objects to properties on a single object. 
			@param [object={}]			Object to add properties to.  If null, an object will be created.
			@param [keyField=name]		Name of the field of each object to use as the key.
			@param [valueField=value]	Name of the field of each object to use as the value.
			@param [parse=true]			If true, we will parse values before adding to the object.
			@param [trim=true]			If true, we will trim parsed values. (Note: only if parse==true).
		*/
		arrayToObject : function(array, keyField, valueField, object, parse, trim) {
			if (!object) object = {};
			var found = false, key, value;
			if (array && array.length) {
				if (keyField == null) keyField = "name";
				if (valueField == null) valueField = "value";
				if (parse == null) parse = true;
				if (trim == null) trim = true;
				$.each(array, function(index, it) {
					key = it[keyField];
					if (key) {
						value = it[valueField];
						if (parse) value = $.parseType(value, null, trim);
						object[key] = value;
						found = true;
					}
				});
			}
			return (found ? object : undefined);
		},

		// Update a config object with the js equivalent of <config><name/><value/></config> nodes.
		//	Returns an object with ONLY the deltas, or undefined if config didn't actually change.
		updateConfig : function(config, configArray) {
			var deltas = {}, deltaFound = false, key, value;
			$.forEach(configArray, function(it) {
				key = it.name;
				if (key) {
					value = $.parseType(it.value, true);
					if (value != config[key]) {
						config[key] = value;
						deltaFound = true;
						deltas[key] = value;
					}
				}
			});
			return (deltaFound ? deltas : undefined);
		},

		// TODO: deprecate the below in favor of $.xml.toObject()
		

		// convert the value of a node to a JS type (number, boolean, etc)
		//	based on the element's 'type' parameter
		//	using the TypeParser.typeMap found in /js/types.js
		//
//REFACTOR - still used?
		getNodeValue : function(node) {
			var value = $(node).text(),
				type = node.getAttribute("type")
			;
			return $.parseType(value, type, true);
		},
		
		// return a map of {tagName:value} for all items of root
		// NOTE: assumes that item nodes are not nested (eg: text only)
		//	uses  $.xml.getNodeValue()  to convert values from strings into appropriate data type
//REFACTOR - still used?
		getItemValueMap : function (root) {
			var map = {};
			$("*", root).map(
				function(index, element) {
					map[element.tagName] = $.xml.getNodeValue(element);
				}
			);
			return map;
		},
		
		// convert each item of root of type tagName to a value map
//REFACTOR - still used?
		itemsToValueMaps : function(root, tagName) {
			return $(tagName, root).map(
				function(index, item) {
					return $.xml.getItemValueMap(item);
				}
			);
		},
		
		// convert each item of root of type tagName to a map of attribute:value
		//	for each attribute
//REFACTOR - still used?
		itemsToAttributeMaps : function(root, tagName) {
			return $(tagName, root).map(
				function(index, item) {
					return $.xml.getAttributeMap(item);
				}
			);
		}
	}
});

