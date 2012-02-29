/*! Hope application framework, v 0.1					See: http://hopejs.com
 *	 *	MIT license.										See: http://hopejs.com/license

 *	Copyright (c) 2006-2009, Matthew Owen Williams.
 */

(function($, hope) {
// 
//		Begin hidden from global scope:
//


$.ListManager = {
	/** Mix the listManager interface into the target. */
	mixinTo : function(it) {
		if (it.extend) 	it.extend(this.defaults);
		else			$.extend(it, this.defaults);
		it.asListManager = this.defaults;
	},

	defaults : {
		/** Property name in this object we use to refer to our list of items. */
		_listKey : "items",

		/** Property name in the instance that will refer to us. */
		_containerKey : "list",

		/** Method to call when something is selected. */
		selectAction : undefined,
		
		/** Return the list of items, creating one if necessary. */
		getItems : function(index) {
			var items = (this[this._listKey] || (this[this._listKey] = []));
			if (index != null) return items[index];
			return items;
		},

		/** Return the list of items, creating one if necessary. */
		getItem : function(index) {
			if (!this[this._listKey]) return;
			return this[this._listKey][index];
		},

		/** Return a particular item from our list by id.
			Default is to return item where item.getIdentifier() == id.
			If you pass in anything other than a string,
			assumes that is a pointer to your item, and returns it.
		 */
//		get : function(id) {
//			if (typeof id != "string") return id;
//			var list = this.getItems();
//			for (var i = 0, length = list.length, item; i < length; i++ ) {
//				item = list[i];
//				if (item != null && item.getIdentifier && item.getIdentifier() == id) return item;
//			}
//		},
		
		/** Add one or more items to our list. 
			Returns an array of items that were added.
		*/
		add : function() {
			var list = this.getItems(), items = [];
			for (var i = 0, item, length = arguments.length; i < length; i++ ) {
				item = arguments[i];
				
				// skip empty items
				if (item == null) continue;
				
				// call normalizeItem to change the item to be the proper
				//	type to add to this list.
				item = this.prepareToAdd(item);
				if (item === undefined) continue;
				
				// actually add the item to the list
				var index = list.length;
				list[index] = item;
			
				// if item understands being added to something else, call that now
				if (item.onAddTo) item.onAddTo(this, this._containerKey);
	
				// and notify observers that an item was added
				this.notify("onAdd", item, index);
				
				// add to the list of items for returning
				items.push(item);
			}
			return items;
		},
		
		/** Verify that the item is OK to add to our list.
			If it is safe, returns the (possibly transformed) item.
			If it is not safe, either return undefined or throw an error.

			Default is that everything is safe to add.
			
			TODO: name?
		 */
		prepareToAdd : function(item) {
			return item;
		},

		/** Remove one or more items from our list. 
			Returns an array of the items that were removed.
		 */
		remove : function() {
			var list = this.getItems(), items = [];
			for (var i = 0, item; item = arguments[i++]; ) {
				items.push(item);
				var index = list.indexOf(item);
				if (index == -1) continue;

				// remove it from the list
				list.splice(index, 1);

				// if the item understands removal, call it
				if (item.onRemoveFrom) item.onRemoveFrom(this, this._containerKey);
				
				this.notify("onRemove", item, index);
			}
			return items;
		},
		
		/** Empty the list by calling remove() for each item in the list. */
		empty : function() {
			var list = this.getItems();
			return this.remove.apply(this, list);
		},
		
		/** Call a method or execute a function for each item. 
			Returns array of values returned by method calls.
		*/
		forEach : function(method, context) {
			var list = this.getItems();

			// if the method is a string, 
			// make a function that will call the correct item method
			if (typeof method == "string") {
				var args = arguments[1] || [];
				function callMethodOnItem(item, index) {
					if (!item || typeof item[method] != "function") return;
					return item[method].apply(item, args);
				}
				return list.map(callMethodOnItem);
			} else {	
				return list.map(method, context);
			}
		},



		//
		// selection semantics
		//		TODO: multi-select...
		//
		//

		/** If true, we are selectable. */
		selectable : false,
		
		/** Item that is actually selected. */
		selection : undefined,

		/** Item was selected. */
		selectItem : function(item, event) {
			if (this.selectable) {
				if (this.selection) this.deselectItem(this.selection, event);
				if (item && item.select) item.select();
				this.selection = item;
			}
			
			// if we have an action to take, do that now
			if (typeof this.selectAction == "function") this.selectAction(item);
			
			// notify any observers (including the item itself) about the selection
			this.notify("onSelectItem", item);
			
			return this;
		},
		
		/** Item was deselected. */
		deselectItem : function(item, event) {
			if (item == null) item = this.selection;
			
			if (this.selectable && this.selection && this.selection == item) {
				if (this.selection.deselect) this.selection.deselect();
				delete this.selection;
			}

			// notify any observers about the deselection
			this.notify("onDeselectItem", item);
			
			return this;
		}

	},// end defaults

	toString : function() {	return "$.ListManager" }
};


//
//		End hidden from global scope: 
//
})(jQuery, jQuery.hope);


