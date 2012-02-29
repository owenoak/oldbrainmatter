

//
//	XMLData class
//	-- wraps an XML structure or file as a JS object, using getters & setters for access 
//		data is manipulated directly in the XML
//
//	TODO:
//		- auto-caching?
//
(function() {
	function XMLData(props1, props2, etc) {
		hope.mixinToThisWithGetters.apply(this, arguments);
		this.init();
	}
	
	hope.Class.createSubclass(XMLData, {
		// original file to load from (does automatically if set on init && autoLoad)
		src 			: null,
		autoLoad 		: true,
		delayLoad		: true,		// if delayLoad is true, we wait a little before autoLoading so things can initialize

		// DOM element that holds our outer element
		element			: null,

		// url to save to (if not null)
		saveURL 		: null,
		autoSave 		: false,
		
		tagName			: "xmlData",

		// if we're dirty, we need to save
		_dirty 			: false,
		SKIP_DIRTY		: true,

		
		init : function init() {
			// load on a timer so we don't get init problems (???)
			// TODO: maybe just do onLoad processing on a timer?
			if (this.src && this.autoLoad) {
				if (this.delayLoad) {
					var xmlFile = this;
					setTimeout(function loadDataOnTimer() {
						xmlFile.load();
					},0);
				} else {
					this.load();
				}
			}
		},
		
		
		// set up our top-level element after it has been created or initialized
		setupElement : function(element) {
			var me = this;
			if (element) element.onclick = function(event) {	return me.onclick(event);	};
		},
		
		load : function(src, data) {
			if (src) this.src = src;
			if (!this.src) return this.onLoadError("the .src property is not set");
			try {
				this.element = hope.appendXML(this.src, data, this.tagName);
				this.setupElement(this.element);
			} catch (e) {
				return this.onLoadError(e);
			}
			this.onLoad(this.element);
		},
		
		onclick : function(event) {
			console.warn(""+this);
			event.stopPropagation();
		},
		
		onLoad : function(element) {
			// TODO: override in your subclasses or singletons
		},

		
		onLoadError : function(error) {
			console.error(error);
		},
		

		
		save : function() {
			this._dirty = false;
			this.setAttribute("_dirty", this._dirty, this.element, this.SKIP_DIRTY);
			if (!this.saveURL) return;
			console.error("XMLFacade.save not implemented");
		},


		get dirty() {	
			return this._dirty;	
		},
		
		set dirty(newValue) {
			return this.markDirty(newValue);
		},

		markDirty : function(newValue) {
			this._dirty = (newValue != false);
			this.setAttribute("_dirty", this._dirty, this.element, this.SKIP_DIRTY);
			if (this._dirty && this._cache) this._cache = {};
			if (this._dirty && this.autoSave && this.saveURL) this.save();		
		},


		// getting & setting parts of the dom of the element
		
		getXpath : function(xpath, resultType) {
			if (!this.element) return "";
			try {
				return hope.xpath.get(this.element, path, resultType);
			} catch (e) {
				console.error("getXpath returned error: "+e);
			}
		},
		
		updateXpath : function(xpath, value) {},
		
		// create a new element
		createElement : function(tag, html, parent, attributes, children, skipDirty) {
			if (parent == null) parent = this.element;
			var element = hope.createElement.apply(hope, [tag, html, parent, attributes, children]);
			if (skipDirty != true) this.dirty = true;
			return element;
		},
	
	
		byTag : function(tag, attribute, filter) {
			if (this.element == null) return [];
			var list = hope.sliceArgs(this.element.getElementsByTagName(tag), 0);
			if (list.length == 0) return list;

			if (typeof filter == "function") {
				var culled = [];
				for (var i = 0, element; element = list[i++];) {
					if (element && filter(element)) culled.push(element);
				}
				list = culled;
			}

			if (attribute) {
				for (var i = 0, element; element = list[i]; i++) {
					list[i] = element.getAttribute(attribute);
				}
			}
			
			return list;
		},
		
		//	firstOnly defaults to true
		//	NOTE: this flattens out nested tags!!!
		getTagValue : function(tag, filter) {
			var element = this.byTag(tag, null, filter)[0];
			if (element) return element.textContent;
		},
		
		// set the value of FIRST INSTANCE of a nested tag
		// pass a filter to cull down to a specific node (but will still take first)
		setTagValue : function(tag, newValue, filter, skipDirty) {
			var oldValue = this.getTagValue(tag, filter);
			var element = this.byTag(tag, null, filter)[0];
			if (!element) {
				hope.createElement(tag, newValue, this.element);
			} else {
				// bail if setting to the same thing
				if (oldValue == newValue) return newValue;
				this.setElementValue(element, newValue, skipDirty);
			}
			if (skipDirty != true) this.dirty = true;
			return newValue;
		},

		setElementValue : function(element, newValue, skipDirty) {
			if (element == null) element = this.element;
			if (!element) return;		// TOTHROW?
			var oldValue = element.textContent;
			if (oldValue != newValue) {
				element.textContent = newValue;
				if (skipDirty != true) this.dirty = true;
			}
			return newValue;
		},
		
		getAttribute : function(attribute, parent) {
			if (parent == null) parent = this.element;
			if (!parent) return undefined;
			return parent.getAttribute(attribute);		
		},
		
		
		setAttribute : function(attribute, newValue, parent, skipDirty) {
			if (parent == null) parent = this.element;
			if (!parent) return undefined;
			
			var oldValue = parent.getAttribute(attribute);
			if (newValue == oldValue) return;
			
			parent.setAttribute(attribute, newValue);
			// don't mark as dirty if setting a private attribute, or if skipDirty is set
			if (attribute.charAt(0) != "_" && skipDirty != this.SKIP_DIRTY) this.dirty = true;
			return newValue;
		},

		removeAttribute : function(attribute, parent, skipDirty) {
			if (parent == null) parent = this.element;
			if (!parent) return undefined;
			
			parent.removeAttribute(attribute);
			// don't mark as dirty if setting a private attribute, or if skipDirty is set
			if (attribute.charAt(0) != "_" && skipDirty != this.SKIP_DIRTY) this.dirty = true;
		},
		
		toString : function() {
			return this.id;
		}
	});



	// subclass of XMLData that represents an indexed list of other items
	//	for example, our "Persons.xml" file which is an index of "people".
	//
	//	We kinda assume these will be singletons (???)
	//
	//	Default behavior on load is to construct an instance of type:
	//			this.itemConstructor
	//	for each element of tag type
	//			this.itemConstructor.tagName
	//
	//	For instance classes, we assume:
	//		- instance has a "handle" concept
	//		- instance adds itself to
	//		- and that it adds itself to our ._handleMap and  structures when created.
	//
	function XMLDataIndex(props1, props2, etc) {
		hope.mixinToThisWithGetters.apply(this, arguments);
		this.init();
	}
	
	XMLData.createSubclass(XMLDataIndex, {
		itemConstructor : null,
		itemTag : null,

		_newInstanceNum	: 1,					// increasing number for new, unnamed instances
		
		// set up our index on load
		onLoad : function(element) {
			this.createIndex();
		},
		
		
		save : function() {
			// save the outer file
			XMLData.prototype.save.apply(this, arguments);
			
			// and just tell our items that they are no longer dirty
			this.forEachItem(function(){this.dirty = false});
		},

		// create the index of the items we manage
		//	Called automatically on load.
		// 	Can be called later (eg: when index should be updated).
		//
		//	ASSUMES:
		//		* items we manage have a "handle" property, which what we put in the index
		//
		//	SIDE EFFECTS
		//		* sets up this.all
		//		* sets up this.index
		//		* if itemTag is set, gets all elements that match the item tag
		//		* if itemConstructor is set, calls constructor for each
		//
		//	TODO:
		//		* signal conflict on insert if handle already used?
		createIndex : function() {
			var constructor = hope.getConstructor(this.itemConstructor),
				itemTag = (constructor ? constructor.prototype.tagName : this.itemTag),
				itemElements = this.byTag(itemTag)
			;
			
			this.all = [];
			this.index = {};
			
			// if there is no constructor, just remember the elements
			if (!constructor) {
				// TOWARN ?
				this.all = this.all.concat(itemElements);
				return;
			}
			
			// otherwise, construct an element for each new item and add them to our index
			for (var i = 0, element; element = itemElements[i++];) {
				// if there is not an item already on the element, construct it now
				var item = (element._item ? element._item : new constructor({element:element, index:this}));
				// and add it to our index
				this.updateIndexFor(item, item.handle);
			}
		},
		
		// get an item by its handle (or pointer to the element)
		get : function(handle) {
			if (handle == null) return this.all;
			if (typeof handle != "string") return handle;
			return this.index[handle.toLowerCase()];
		},

		// change the item handle
		updateIndexFor : function(item, newHandle, skipDirty) {
			if (this.all.indexOf(item) == -1) this.all.push(item);

			var map = this.index;

			var oldHandle = item.handle;
			if (oldHandle && oldHandle != newHandle) {
				delete map[oldHandle];
				delete map[oldHandle.toLowerCase()];
				if (skipDirty != this.SKIP_DIRTY) item.dirty = true;
			}
			if (!newHandle) newHandle = oldHandle;
			if (newHandle) {
				map[newHandle] = item;
				map[newHandle.toLowerCase()] = item;
			} else {
				console.error("no handle found for updateIndexFor(",item, ",",newHandle,")");
			}
		},
		
		
		// if a function is passed in, each item will be "this" when the method is called
		forEachItem : function(method, args) {
			var results = [];
			if (typeof method == "string") {
				for (var i = 0, item; item = this.all[i]; i++) {
					results[i] = (typeof item[method] == "function" ? item[method].apply(item, args) : null);
				}				
			} else if (typeof method == "function") {
				for (var i = 0, item; item = this.all[i]; i++) {
					results[i] = method.apply(item, args);
				}			
			} else {
				//TOTHROW
			}
			return results;
		},
		
		// return all the items where filter returns true
		where : function(filter) {
			var matches = [];
			for (var i = 0, item; item = this.all[i]; i++) {
				if (filter(item)) matches.push(item);
			}
			return matches;
		},
		
		// most indexes are singletons of one type or another -- toString can reasonably yield id
		toString : function() {
			return this.id;
		}
		
		
	});
	

	//
	//	items which are managed (and generally created by) and XMLDataIndex
	//
	//	hack: if there is no "elements" in our first props object, we will create an element before the mixin
	//
	//	TODO - make this a mixin?
	//
	function XMLIndexable(props) {
		hope.mixinToThisWithGetters.apply(this, arguments);
		// if there is no element, we're doing a normal new() after init
		//	so we should create our element
		if (!this.element && this.index && this.index.element) {
			if (this.index) {
				var handle = props ? props.handle : null;
				if (!handle) handle = this.defaultHandle.replace(/#/,this.index._newInstanceNum++);
// TODO: have a template for the HTML?
				this.element = this.index.createElement(this.tagName, null, this.index.element, {handle:handle});

				// update the index to point to us
				this.index.updateIndexFor(this);
				// and note that we need to be saved
				this.dirty = true;
			}
		} else {
			// we must be initializing from a file, don't create the element
		}

		if (this.element) {
			// set up the element -- this is where you can attach any extra attributes, etc
			this.setupElement(this.element);

			// have the element point back to the item and index, in case we need to rebuild the index later
			this.element._item = this;
			this.element._index = this.index;
		}

		this.init();
	}
	
	XMLData.createSubclass(XMLIndexable, {
		tagName : "item",					//
		_handleProperty : "handle",			// most subclasses will probably use this
		index 			: null,				// all instances of indexable have the same index
											// 	or you have to pass in an index on creation

		defaultHandle	: "Item #",			// default handle for new items created without a handle
											// the "#" in the name will be set to an increasing numeber
		defaultElementProps : {},			// default properties for new elements created
		
		autoLoad : false,

		// we are generally saved by our index -- make sure they know we're dirty
		markDirty : function(newValue) {
			XMLData.prototype.markDirty.apply(this, arguments);
			if (this._dirty && this.index) this.index.dirty = true;
		},

		save : function() {
			if (this.index) this.index.save();
		},

		// handle for the item
		get handle() {
			return this.getAttribute(this._handleProperty);		
		},
		
		// todo: there may be other indices based on this handle -- how to update them as well?
		set handle(newHandle) {
			if (this.index) this.index.updateIndexFor(this, newHandle);
			return this.setAttribute(this._handleProperty, newHandle);		
		},
		
		
		toString : function() {
			return this.handle;
		}
	});



})();



//
//	Create one of these for a property that is an index into another data type.
//
//	For example, a <group> is one or more lists of People, eg:
//		<group>
//			<members>bob,martha,george</members>
//		</group>
//
//	In your object for the group, create a new XMLHandleIndex like so:
//		...
//		this.members = new XMLHandleIndex({tagName:"members", itemIndex:People, xmlData:this});
//		...
//	where itemIndex is the index of People.
//
//	For each index, you can do the following:
//		group.members.all						-- returns an array of People in the group
//		group.members.list						-- array of handles of group members
//		group.members.element					-- pointer to the element in the DOM for the members (may be null)
//		group.members.value						-- returns literal string of the <members> element
//		group.members.value = "string"			-- set literal string of the <members> element (creates if necessary)
//		group.members.contains(handle|Person)	-- returns the Person with that handle, if any
//		group.members.add(handle|Person)		-- add a person to the group
//		group.members.remove(handle|Person)		-- remove the person from the group
//		group.members.where(condition)			-- return subset of members for whom method == true
//													method can be a function or a conditional with arguments "it" 
//													(see hope.makeConditionalFunction)
//
function XMLHandleIndex(props) {
	hope.mixinToThis.apply(this, arguments);

	// if they passed an initial value in, add it to the element now, if possible
	if (this.initialValue !== undefined) {
		var xmlData = indexMethod.xmlData;
		if (xmlData && xmlData.element) {
			var element = xmlData.byTag(this.tagName)[0];
			if (element) {
				element.textContent = this.initialValue;
			} else {
				xmlData.createElement(this.tagName, this.initialValue, null, null, null, this.SKIP_DIRTY);
			}
			delete this.initialValue;
		}
		this.isDirty = true;
	}
};

XMLHandleIndex.prototype = {
	// default parameters
	caseSensitive : hope.IGNORE_CASE,
	separator : ",",
	sort : true,
	
	get all() {
		var list = this.list;
		for (var i = 0, handle; handle = list[i];i++) {
			list[i] = (this.itemIndex.get(handle) || handle);
		}
		return list;				
	},

	get value() {
		return this.xmlData.getTagValue(this.tagName) || "";
	},

	set value(newValue) {
		var oldValue = this.value;
		// if the value has actually changed, update the value and mark xmlData as dirty
		if (oldValue != newValue) {
			this.xmlData.dirty = true;
			this.xmlData.setTagValue(this.tagName, newValue);
		}
		return newValue;
	},
	
	get list() {
		var list = this.value;
		if (list) return list.split(this.separator);
		return [];
	},
	
	get element() {
		return this.xmlData.byTag(this.tagName)[0];
	},

	contains : function(item) {
		var index = hope.indexInStringList(this.value, ""+item, this.caseSensitive, this.separator);
		return (index != -1);
	},
	
	add : function(item) {
		if (this.xmlData.checkAdditionPolicy(item, this.status) == false) return undefined;

		var element = this.element
		// if we couldn't find the element, create it and mark the xmlData as dirty
		if (!element) {
			this.xmlData.createElement(this.tagName, item);
			this.xmlData.dirty = true;
		} else {
			var tagValue = element.textContent;
			
			var newTagValue = hope.addToStringList(tagValue, item, this.caseSensitive, this.separator, this.sort);
			// if the value actually changed, update the dom and mark the xmlData as dirty
			if (newTagValue != tagValue) {
				element.textContent = newTagValue;
				this.xmlData.dirty = true;
			}
		}
		return this.list;
	},
	
	remove : function(item) {
		if (this.xmlData.checkRemovalPolicy(item, this.status) == false) return undefined;

		var element = this.element;
		if (!element) return;

		var tagValue = element.textContent;			
		var newTagValue = hope.removeFromStringList(tagValue, item, this.caseSensitive, this.separator);

		// if the value actaully changed, mark the xmlData as dirty
		if (newTagValue != tagValue) {
			element.textContent = newTagValue;
			this.xmlData.dirty = true;
		}

		return this.list;
	},

	where : function(filter) {
		if (typeof filter == "string") {
			filter = hope.makeConditionalFunction(filter,"it");
		}
		var list = this.all,
			culled = []
		;
		for (var i = 0, it; it = list[i++];) {
			if (filter(it)) culled.push(it);
		}
		return culled;
	}

}
