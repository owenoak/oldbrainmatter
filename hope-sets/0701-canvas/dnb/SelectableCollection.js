dnb.createClass("SelectableCollection", {

	init : function() {
		this.inherit("init", arguments);
		this.initItems();
	},

	initItems : function() {
//console.debug(this,"initItems");
		this._items = [];
		this._selection = [];
		return this;
	},
	
	//
	//	override these things in your subclass (calling inherit) to do something special
	//		when these event points happen
	//
	onAdd				: function(it, index) {},
	onRemove			: function(it, index) {},
	onReorder			: function(it, oldIndex, newIndex) {},
	onDestroy			: function(it) {},
	// called once per top-level operation,
	//		eg: if you call remove(a,b,c), calls will be
	//				onRemove(a), onRemove(b), onRemove(c), onItemsChanged("-",[a,b,c])
	//	what is operation:  	"+"=add, "-"=remove, "o"=reorder, "x"=destroy
	//	who  is list affected:	[item,item,...]
	//	where is position it happened (first one for a list)
	//		where is not defined for remove or destroy
	//	NOTE: if you destroy(), everything will be remove()d first
	onItemsChanged 		: function(what, who, where) {},
	
	
	onSelect			: function(it) {},
	onDeselect			: function(it) {},
	//	what is operation: "+"=select, "-"=deselect
	//	who is list of things that were operated on
	//	NOTE: if you call select() (which implicitly deselects), this will be called twice:
	//				onSelectionChanged("-",[old,stuff,...]
	//				onSelectionChanged("+",[new,stuff,...]
	onSelectionChanged 	: function(what, who) {},
	
	
	onShow				: function(it) {},
	onHide				: function(it) {},
			
			
	onEnable 			: function(it) {},
	onDisable			: function(it) {},
			
	onFocus				: function(it) {},
	onDefocus			: function(it) {},
//	onFocusChanged		: function(it) {},
	
	
	//
	//
	//	
	
	isEmpty : function() {
		return this._items.length == 0;
	},
	
	count : function() {
		return this._items.length;
	},
	
	items : function(index) {
		if (typeof index == "number") return this._items[index];
		return this._items;
	},

	indexOf : function(it) {
		return this._items.indexOf(it);
	},
	
	add : function() {	// works for all arguments
		var list = this.getArgs(arguments),
			startIndex = this._items.length
		;
		list.forEach(this._addItem, this);
		this.onItemsChanged("+",list, startIndex);
		return this;
	},
	// don't call this: just use add()
	_addItem : function(it) {
		this._items.push(it);
		this.onAdd(it, this._items.length-1);
	},

	// add one or more items at a particular location
	addAt : function(index) {
		var list = this.getArgs(arguments, 1);
		var args = [index, 0].concat(list);
		this._items.splice.apply(this._items, args);
		for (var i = 0, len = list.length, it; it = list[i], i < len; i++) {
			this.onAdd(it, index+i);
		}
		this.onItemsChanged("+", list, index);
		return this;
	},
	
	// given one or more hashes, add them to the list
	addFromHash : function() {
		this.add.apply(dnb.getHashValues.apply(dnb,arguments));
	},
	
	remove : function() {	// works for all arguments
		var list = this.getArgsOrSelection(arguments);
		list.forEach(this._removeItem, this);
		this.onItemsChanged("-", list);
		return this;
	},
	// don't call this: just use remove
	_removeItem : function(it) {
		var index = this._items.indexOf(it);
		if (index > -1) this._items.splice(index,1);
		this._deselectItem(it);
		this.onRemove(it, index);
	},
	
	clear : function() {	// clears the entire array
		this.remove.apply(this, this._items);
		return this;
	},
	
	destroy : function() {	// works for all arguments
		var list = this.getArgsOrSelection(arguments);
		this.remove.apply(this, list);
		list.forEach(this._destroyItem, this);
		this.onItemsChanged("x", list);
		return this;
	},
	// don't call this: use destroy() instead
	_destroyItem : function(it) {
		if (it.destroy) it.destroy();
		this.onDestroy(it);
		this.removeItem(it);
	},

	reorder : function(start, end) {	// reorder one element, specified by number of item
		if (typeof start != "number") start = this._items.indexOf(start);
		var it = this._items.splice(start, 1)[0];
		this._items.splice(end, 0, it);
		this.onReorder(it, start, end);
		this.listChanged("o",[it],end);
		return this;
	},
	

	//
	//	selection semantics
	//
	selection : function(index) {
		if (typeof index == "number") return this._selection[index];
		return this._selection;
	},

	anyAreSelected : function(it) {
		return (this._selection.length > 0);
	},

	isSelected : function(it) {
		return (this._selection.indexOf(it) > -1);
	},
	
	
	// select all args passed in
	// calling "select" implicicitly deselects everything else
	//	if you don't want that, use "addToSelection"
	select : function() {
		this.clearSelection();
		this.addToSelection.apply(this, arguments);
		return this;
	},

	// select all items passed in without affecting previous selection
	addToSelection : function() {
		var list = this.getArgs(arguments);
		list.forEach(this._selectItem, this);
		for (var i = 0, len = list.length, it; it = list[i], i < len; i++) {
			if (!it || this.isSelected(it)) return;
			this._selection.push(it);
			if (it.select) it.select();
			this.onSelect(it);
		}
		this.onSelectionChanged("+",list);
	},
	
	
	// don't call this -- just use "select()" or "addToSelection()"
	_selectItem : function(it) {
		if (!it || this.isSelected(it)) return;
		this._selection.push(it);
		if (it.select) it.select();
		this.onSelect(it);
	},
	
	deselect : function() {
		var list = this.getArgsOrSelection(arguments);
		list.forEach(this._deselectItem, this);
		this.onSelectionChanged("-", list);
		return this;
	},
	
	_deselectItem : function(it) {
		if (!it) return;

		var index = this._selection.indexOf(it);
		if (index > -1) {
			this._selection.splice(index,1);
			if (it.deselect) it.deselect();
			this.onDeselect(it);
		}
		return this;
	},
	
	clearSelection : function() {
		return this.deselect();
	},
	
	
	//
	//	show/hide semantics
	//
	show : function() {
		this.getArgsOrSelection(arguments).forEach(this._showItem, this);
		return this;
	},
	
	_showItem : function(it) {
		if (it.show) it.show();
		else it.visible = true;
		this.onShow(it);
	},
	
	hide : function() {
		this.getArgsOrSelection(arguments).forEach(this._hideItem, this);	
		return this;
	},

	_hideItem : function(it) {
		if (it.hide) it.hide();
		else it.visible = false;
		this.onHide(it);	
	},
	
	
	
	//
	//	enable/disable semantics
	//
	enable : function() {
		var list = this.getArgsOrSelection(arguments);
		list.forEach(this._enableItem, this);
		this.onEnableChanged("+",list);
		return this;
	},
	
	_enableItem : function(it) {
		if (it.enable) it.enable();
		else it.enabled = true;
		this.onEnable(it);
	},
	

	disable : function() {
		var list = this.getArgsOrSelection(arguments);
		list.forEach(this._disableItem, this);
		this.onEnableChanged("-",list);
		return this;
	},
	
	_disableItem : function(it) {
		if (it.disable) it.disable();
		else if (it.enable) it.enable(false);
		else it.enabled = false;
		this.onDisable(it);
	},
	
	
	//
	//	focus/defocus	-- ONLY ONE THING CAN BE FOCUSED AT A TIME!
	//
	focus : function(it) {
		if (this._focused && this._focused != it) {
			this.defocus(this._focused);
		}
		if (it == null) return this;

		this._focused = it;
		if (it.focus) it.focus();
		else it.focused = true;
		this.onFocus(it);
		return this;
	},

	defocus : function(it) {
		if (it == null) it = this.focused;
		if (it == null) return this;
		
		if (it.defocus) it.defocus();
		else if (it.focus) it.focus(false);
		else it.focused = false;
		this.onDefocus(it);
		return this;
	},
	
	
	//
	//	set random states
	//
	setState : function(state) {
		var list = this.getArgs(arguments, 1);
		list.forEach(function(it) { if (it.setState) it.setState(state)}, this);
		return this;
	},
	
	clearState : function(state) {
		var list = this.getArgs(arguments, 1);
		list.forEach(function(it) { if (it.setState) it.clearState(state)}, this);	
		return this;
	},
	
	
	//
	//	iterators
	//


	// call a method on each item, passing args, returns values of the items
	//	same as map, just throws away return values
	forEach : function(method, args) {
		this.map.apply(this, arguments);
	},
	
	// call method for each, return values returned from method as array
	map : function(method, args) {
		if (typeof method == "string") {
			var eachFn = function(it) {
				if (it[method]) return it[method].apply(it, args);
			}
		} else {
			var eachFn = function(it) {
				return method.apply(it, args);
			}
		}
		return this._items.map(eachFn);
	},

	// call method for each, return values returned from method as array
	filter : function(method, args) {
		var results = [];
		if (typeof method == "string") {
			for (var i = 0, len = list.length, it; it = list[i], i < len; i++) {
				if (it[method] && (it[method].apply(it, args))) results.push(it);
			}
		} else {
			for (var i = 0, len = list.length, it; it = list[i], i < len; i++) {
				if ((method.apply(it, args))) results.push(it);
			}
		}
		return results;
	},
	
	// all return true
	every : function(method, args) {
		var list = this._items;
		if (typeof method == "string") {
			for (var i = 0, len = list.length, it; it = list[i], i < len; i++) {
				if (it[method] && !(it[method].apply(it, args))) return false;
			}
		} else {
			for (var i = 0, len = list.length, it; it = list[i], i < len; i++) {
				if (!(method.apply(it, args))) return false;
			}
		}
		return true;
	},

	// at least one is true
	some : function(method, args) {
		var list = this._items;
		if (typeof method == "string") {
			for (var i = 0, len = list.length, it; it = list[i], i < len; i++) {
				if (it[method] && (it[method].apply(it, args))) return true;
			}
		} else {
			for (var i = 0, len = list.length, it; it = list[i], i < len; i++) {
				if ((method.apply(it, args))) return true;
			}
		}
		return false;
	},
	
	// set a property on each object in the collection
	setValue : function(prop, value) {
		return this._items.forEach(function(it){return it[prop] = value});
	},
	
	// get a property value for each object in the collection
	getValue : function(prop) {
		return this._items.forEach(function(it){return it[prop]});	
	},
	
	
	//
	//	utility-ish methods
	//
	
	// given the arguments to ANOTHER function,
	//	if the arguments are null, return the _selection instead
	//	otherwise return the arguments as an array
	getArgsOrSelection : function(args) {
		if (args.length == 0) return this._selection;
		var list = [];
		list.push.apply(list, args);
		return list;
	}
});