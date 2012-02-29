//REFACTOR:  listChanged event? (send only once with addList, etc)

//
//	Collection object
//
//	Maintains a list of non-empty items both by index and by primary key.
//	Also maintains a single selection.
//
//	If you specify a 'context' object, the context will send notifications of
//	list events:  
//		- onAdd<Type>			sent BEFORE an item is to be added.  Context can override or skip what is to be added.
//		- onAdded<Type>			sent AFTER an item is added.
//		- onRemoved<Type>		sent AFTER an item is removed from the collection.
//		- onSelected<Type>		sent AFTER an item has been selected.
//		- onDeselected<Type>	sent AFTER an item has been deselected.
// 

(function($) {	// begin hidden from global scope

var splice = Array.prototype.splice,
	slice  = Array.prototype.slice
;

$.Collection = function Collection(options) {
	this.initialize(options);
}

// make an ad-hoc subclass of this collection with a particular set of arguments
//	Note: collection subclasses are not themselves subclassable via this mechanism.
$.Collection.subclass = function(options) {
	if (!options.name) throw TypeError("$.Collection.subclass: must specify options.name", options);
	function Collection(context){this.context = context};
	Collection.prototype = new $.Collection(options);
	return Collection;
}

$.extend($.Collection.prototype, {
	isACollection	: true,			// flag
	name 			: undefined,	// REQUIRED: name of our list on context
	type	 		: "Item",		// singular type, for notifications (eg: "onAddedItem")
	reference		: undefined,	// name for global pointer to the collection, if defined
	context			: undefined,	// our controller object, we send messages through them

	length			: 0,			// number of items in the collection
	unique			: true,			// if true, we don't add items to the list more than once
	selectionName	: undefined,	// if defined, name on context of the currently selected item

	generateIds		: false,		// If true, we will generate an identifier for any object
									// which does not define one in collection.getIdentifier().
									// The generated key will be stored as "object.__id__"
	itemSequence	: 0,			// Sequence for generating keys.

	itemClass	 	: undefined,	// itemClass for updateOrCreate
	
	// initialize the collection
	initialize : function(options) {
		if (options) {
			for (var key in options) {
				this[key] = options[key];	
			}
		}
		if (!this.selectionName) this.selectionName = "selected"+this.type;
		if (this.reference) $.setPath(this.reference, this);
		return this;
	},
	
	// Return the primary key for an item.
	//	Default is to call item.getIdentifier if defined.
	//	Otherwise if item has an identifier property, uses that.
	//  Otherwise if collection.generateKeys is true, we will generate an identifier.
	//  Otherwise returns undefined.
	getIdentifier : function(item) {
		if (item.getIdentifier) return item.getIdentifier();
		if (item.identifier) return item.identifier;
		if (this.generateIds) {
			var generator = item.Class || item.constructor;
			if (!generator.generateIdentifier) generator = this;
			return generator.generateIdentifier(item);
		}
	},
	
	// generate (but don't assign) a primary key to an item
	generateIdentifier : function(item) {
		return (item.identifier = "anonymous" + this.type + (this.itemSequence++));
	},

	// Get a global reference string to either the collection or an item in the collection.
	// Only works for references whih define a "reference" property.
	// If item has a identifier value, uses that.
	// If item does NOT have a primary key value, returns numeric index
	//	(which is subject to change as the list is manipulated).
	getReference : function(item) {
		if (!this.reference) return;
		if (item === null) return this.reference;
		
		// if item defines a identifier, return that as index into our list
		var key = this.getIdentifier(item);
		if (key != null) return this.reference + ".$" + key;
		
		key = this.indexOf(item);
		if (key != -1) return this.reference + "[" + key + "]";
	},
	
	// do something for each item in the list
	//		- takes a context, which defaults to this.controller || this
	//		- method can be a string, in which case we'll attempt to call 
	//			the method with that name on each item in the list
	//		- returns a vanilla array of the results
	forEach : function(method, context) {
		if (!context) context = this.context;
		var results = [];
		if (!this.length) return results;
		
		var index = -1, item;
		if (typeof method === "string") {
			while (item = this[++index]) {
				var itemMethod = item[method];
				if (itemMethod) results[index] = itemMethod.call(context||item, item, index);
			}
		} else {
			while (item = this[++index]) {
				results[index] = method.call(context||item, item, index);
			}			
		}
		return results;
	},
	
	// set to a completely different list
	//	 removes existing items via removeItem
	//	 adds new items via add
	setList : function(list) {
		for (var i = 0, length = this.length; i < length; i++) {
			this.removeItem(0);
		}
		if (list && !list.length) {
			this.add.apply(this, list);
		}
		return this;
	},
	
	// Add an item at a particular index, pushing everything else over if necessary.
	// Default is to add at the end.
	// If collection.unique is true, we won't add items that are already in the list,
	//	but we will move it to the new index.
	//
	//	NOTE: you cannot add null items to the list, 
	//			and attempting to add past the end of the list adds at the end
	//			(so there are no gaps)
	addItem : function(item, index) {
		// call "onAdd<type>" to allow the context a chance to transform the object
		//	before we add it.  If onAdd<type> returns $.SKIP, we skip the add.
		var result = this.notify("add", item, index);
		if (result === $.SKIP) return this;
		if (result) item = result;

		// don't add null items
		if (item == null) return this;
		// default to the end of the list
		if (index == null) index = this.length;

		// if this list is unique and it already contains the item, 
		//	just move the item to the new index and notify "movedItem"
		if (this.unique) {
			var currentIndex = this.indexOf(item);
			if (currentIndex != -1) {
//REFACTOR
				if (index != currentIndex) {
					splice.call(this, currentIndex, 1);
					splice.call(this, index, 0, item);
//					this.notify("listChanged");
				}
				return this;
			}
		}
		
		// add via numeric index via splice, which updates the length
		splice.call(this, index, 0, item);
		
		// add via primary key
		var key = this.getIdentifier(item);
		if (key != null) this["$"+key] = item;
		
		// if the item is observable, observe its 'destroyed' event
		//	to remove it from the collection automatically
		if (item.isObservable) {
			item.addObservation(this, "destroyed", "removeItem");
			// if there is a identifier, observe "identifierChanged" as well
			if (key != null) item.addObservation(this, "identifierChanged", "changeIdentifier");
		}
		
		this.notify("added", item, index);
		return this;
	},
	
	// remove an item, sliding things back to cover the gap
	removeItem : function(index) {
		var length = this.length, item = this[index];
		
		// use splice to remove by index, which updates the length
		splice.call(this, index, 1);
		// and delete the last item explicitly (which slice doesn't do)
		delete this[this.length];
		
		// remove via primary key
		var key = this.getIdentifier(item);
		if (key != null) delete this["$"+key];

		// tell the item to stop notifying us
		if (item.isObservable) {
			item.removeObservation(this, "destroyed");
			item.removeObservation(this, "identifierChanged");
		}

		this.notify("removed", item, index);
		return this;
	},
	
	
	// Move an item from startIndex to endIndex.  Notifies "movedItem"
	moveItem : function(startIndex, endIndex) {
	
	},
	
	// add one or more items
	add : function(item1, item2, etc) {
		for (var i = 0, length = arguments.length; i < length; i++) {
			this.addItem(arguments[i]);
		}
		return this;
	},
	
	// add a list of items
	addList : function(list) {
		return this.add.apply(this, list);
	},
	
	
	// remove an item from the list.  Same semantics as indexOf.
	remove : function(item, valueToMatch) {
		var index = this.indexOf(item, valueToMatch);
		if (index !== -1) this.removeItem(index);
		return this;
	},
	

	// return an array of the identifiers for items in the list
	//	if identifier is not defined for an item, results will have gaps
	identifiers : function() {
		return this.forEach(this.getIdentifier, this);
	},
	
	// get the index of a particular item, starting at index (default is start at 0)
	indexOf : function(item, index) {
		index = (index ? index - 1 : -1);
		var it, itemValue;

		while (it = this[++index]) {
			if (it == item) return index;
		}
		return -1;
	},

	// does the list contain an item?  same argument semantics as indexOf
	contains : function(item, index) {
		return this.indexOf(item, index) != -1;
	},
	
	
	// does the list start with an item?  same argument semantics as indexOf
	startsWith : function(item, index) {
		return this.indexOf(item, index) == 0;
	},
	
	
	// Return first item after index which matches selector and valueToMatch
	// 	If selector is a function, calls that on each item to get the itemValue
	//	Otherwise we call item[selector] to get the itemValue.
	//  If valueToMatch is not null, we return first item whose itemValue == valueToMatch
	//	If valueToMatch is null, we return first item whose itemValue is "truthy"
	indexWhere : function(selector, valueToMatch, index) {
		index = (index ? index - 1 : -1);
		var it, itemValue;

		if (valueToMatch != null) {
			// if first argument is a function, call that on each item to get the itemValue
			if (typeof selector === "function") {
				while (it = this[++index]) {
					itemValue = selector.call(it, it);
					if (itemValue == valueToMatch) return index;
				}
			}
			// else use selector as a property name on each item	
			else {
				while (it = this[++index]) {
					itemValue = it[selector];
					if (typeof itemValue === "function") itemValue = it[selector]();
					if (itemValue == valueToMatch) return index;
				}
			}
		} else {
			// if first argument is a function, call that on each item to get the itemValue
			if (typeof selector === "function") {
				while (it = this[++index]) {
					itemValue = selector.call(it, it);
					if (!!itemValue) return index;
				}
			}
			// else use selector as a selector name on each item	
			else {
				while (it = this[++index]) {
					itemValue = it[selector];
					if (typeof itemValue === "function") itemValue = it[selector]();
					if (!!itemValue) return index;
				}
			}
		}
		return -1;
	},
	
	// Return an item specified by identifier.
	byId : function(id) {
		return this["$"+id];
	},
	
	// return the first item which matches.  same argument semantics as indexWhere
	get : function(selector, valueToMatch) {
		var index = this.indexWhere(selector, valueToMatch);
		return (index !== -1 ? this[index] : undefined);
	},
	
	// Return a new collection of all items which match.  Same argument semantics as indexWhere
	// Returns undefined if no match.
	//TODO: pull (some) properties from this collection into the new collection?
	where : function(selector, valueToMatch) {
		var collection, index = 0;
		while ((index = this.indexWhere(selector, valueToMatch, index)) != -1) {
			if (!collection) collection = new $.Collection();
			var it = this[index];
			collection.add(it);
			index++;
		}
		return collection;
	},
	
	// Return an array of the property value for each item (array may have gaps).
	// If item[property] is a function, calls that to get the value.
	property : function(property) {
		return this.forEach(function(it) {
			return (typeof it[property] === "function" ? it[property]() : it[property]);
		});
	},
		
	// Sum a proprty for each item which defines it.
	sum : function(property) {
		var sum = 0, index = -1, it, value;
		while (it = this[++index]) {
			value = parseFloat(typeof it[property] === "function" ? it[property]() : it[property]);
			if (!isNaN(value)) sum += value;
		}
		return sum;
	},
	
	// Return the average of some property of each item.
	average : function(property) {
		return this.sum(property) / this.length;
	},
	
	// Return the largest value of some property of each item
	max : function(property) {
		var values = this.forEach(property), max;
		$.forEach(values, function(value) {
			value = parseFloat(value);
			if (!isNaN(value) && (max == null || value < max)) max = value;
		});
		return max || 0;
	},
	
	
	// Return the smallest value of some property of each item
	min : function(property) {
		var values = this.forEach(property), min;
		$.forEach(values, function(value) {
			value = parseFloat(value);
			if (!isNaN(value) && (min == null || value < min)) min = value;
		});
		return min || 0;
	},
	
	//
	//	sorting
	//
	
	
	// Sort the collection by a particular property.
	sort : function(property, ascending, convertToNumber) {
		// convert to a list and sort that
		var list = slice.call(this, 0, this.length);
		$.list.sortBy(list, property, ascending, convertToNumber);
		
		// reorder our items according to the list
		var index = -1, it;
		while (it = this[++index]) {
			this[index] = list[index];
		}
		return this;
	},
	
	
	//
	//	selection
	//
	
	// Select an item, and notifies 'selected'.
	// If anotheritem was selected before, deselects it first.
	// Sets context[this.selectionName] to the new selection.
	// If item is null, keeps old selection and just does the notify.
	select : function(item) {
		if (item != null && item != this.selection) {
			if (this.selection) this.deselect();
			this.selection = item;
			if (this.context && this.selectionName) this.context[this.selectionName] = item;
		}
		if (this.selection) this.notify("selected", this.selection);
		return item;
	},
	
	// Deselect the currently selected item.
	// Notifies 'deselected' if something was selected before.
	// Clears context[this.selectionName].
	deselect : function() {
		if (this.selection) {
			this.notify("deselected", this.selection);
			delete this.selection;
			if (this.context && this.selectionName) delete this.context[this.selectionName];
		}
	},
	
	// Return true if a particular item is selected.
	isSelected : function(item) {
		return (this.selection == item);
	},
	
	
	//
	//	utility
	//
	
	
	// return a plain-vanilla array of our contents
	toArray : function() {
		return slice.call(this, 0, this.length);
	},

	// call notify on our context object
	notify : function(eventPrefix, arg1, arg2, arg3) {
		if (this.context && this.context.notify) {
			return this.context.notify.apply(this.context, arguments);
		}
	},



	//
	//	debug
	//

	
	// print for debugging purposes
	print : function() {
		console.group(this+" length:"+this.length);
		this.forEach(function(item, index) {
			console.log(index+":", item);
		});
		console.groupEnd();
	},
	
	// signal that we're a strings
	toString : function() {
		if (this.name) return "Collection "+this.name;
		return "a Collection";
	}

});

window.it = new $.Collection({name:"servers", type:"Server"}); 
it.add({a:"c"});
it.add({a:"b"});
it.add({a:"d"});
it.add({a:"a"});
it.add({a:"d"});
it.print();

})(jQuery);	// end hidden from global scope
