// NOTE:  children can only be added to the list once
//			if you try again, it just moves the child to the end of the stack

dnb.createClass("ChildCollection", {
	init : function() {
		this.inherit("init", arguments);
		this.initChildren();
	},

	initChildren : function() {
		this._children = [];
		this._selectedChildren = [];
		return this;
	},
	
	//
	//	implement these things in your subclass (calling inherit) to do something special
	//		when these event points happen
	//
//	onAddChild					: function(it, index) {},
//	onRemoveChild				: function(it, index) {},
//	onReorderChild				: function(it, oldIndex, newIndex) {},
//	onReplaceChild				: function(it, index) {},
//	onDestroyChild				: function(it) {},
	// called once per top-level operation,
	//		eg: if you call remove(a,b,c), calls will be
	//				onRemoveChild(a), onRemoveChild(b), onRemoveChild(c), onChildrenChanged("-",[a,b,c])
	//	what is operation:  	"+"=add, "-"=remove, "o"=reorder, "x"=destroy
	//	who  is list affected:	[item,item,...]
	//	where is position it happened (first one for a list)
	//		where is not defined for remove or destroy
	//	NOTE: if you destroy(), everything will be remove()d first
//	onChildrenChanged 			: function(what, who) {},
	
	
//	onSelectChild				: function(it) {},
//	onDeselectChild				: function(it) {},
	//	what is operation: "+"=select, "-"=deselect
	//	who is list of things that were operated on
	//	NOTE: if you call select() (which implicitly deselects), this will be called twice:
	//				onChildSelectionChanged("-",[old,stuff,...]
	//				onChildSelectionChanged("+",[new,stuff,...]
//	onChildSelectionChanged 	: function(what, who) {},
	
	
//	onShowChild					: function(it) {},
//	onHideChild					: function(it) {},
			
			
//	onEnableChild 				: function(it) {},
//	onDisableChild				: function(it) {},
			
//	onFocusChild				: function(it) {},
//	onDefocusChild				: function(it) {},
	
	
	//
	//
	//	
	
	hasChildren : function() {
		return this._children.length != 0;
	},
	
	childCount : function() {
		return this._children.length;
	},
	
	children : function(index) {
		if (typeof index == "number") return this._children[index];
		return this._children;
	},

	childIndex : function(it) {
		return this._children.indexOf(it);
	},
	
	addChildren : function() {	// works for all arguments
		var list = this.getArgsOrList(arguments);
		var where = this._children.length;
		for (var i = 0, it, results = []; it = list[i], i < list.length; i++) {
			if (!it) continue;
			if (this._addChild(it, where++)) results.push(it);
		}
		if (results.length > -1 && this.onChildrenChanged) this.onChildrenChanged("+", results);
		return this;
	},
	// don't call this: just use addChildren()
	_addChild : function(it, where) {
		if (where == null) where = this._children.length - 1;
		var oldIndex = this._children.indexOf(it);
		if (oldIndex > -1 && oldIndex != where) {
			this.reorderChild(oldIndex, where, true);
			return false;		// child not actually added
		} else {
			this._children.splice(where, 0, it);
			if (this.onAddChild) this.onAddChild(it, this._children.length-1);
			return true;		// child was added
		}
	},

	// add one or more items at a particular location
	addChildrenAt : function(where) {
		var list = this.getArgsOrList(arguments, 1);
		for (var i = 0, it, results = []; it = list[i], i < list.length; i++) {
			if (!it) continue;
			if (this._addChild(it, where++)) results.push(it);
		}
		if (results.length > -1 && this.onChildrenChanged) this.onChildrenChanged("+", results);
		return this;
	},
	
	// given one or more hashes, add them to the list
	addChildrenFromHash : function() {
		this.add.apply(dnb.getHashValues.apply(dnb,arguments));
	},
	
	removeChildren : function() {	// works for all arguments
		var list = this.getArgsOrChildSelection(arguments);
		list.forEach(this._removeChild, this);
		if (this.onChildrenChanged) this.onChildrenChanged("-", list);
		return this;
	},
	// don't call this: just use removeChildren
	_removeChild : function(it) {
		var index = this._children.indexOf(it);
		if (index > -1) this._children.splice(index,1);
		this._deselectChild(it);
		if (this.onRemoveChild) this.onRemoveChild(it, index);
	},
	
	clearChildren : function() {	// clears the entire array
		this.removeChildren.apply(this, this._children);
		return this;
	},
	
	destroyChildren : function() {	// works for all arguments
		var list = this.getArgsOrChildSelection(arguments);
		this.removeChildren.apply(this, list);
		list.forEach(this._destroyChild, this);
		if (this.onChildrenChanged) this.onChildrenChanged("x", list);
		return this;
	},
	// don't call this: use destroyChildren() instead
	_destroyChild : function(it) {
		if (it.destroy) it.destroy();
		if (this.onDestroyChild) this.onDestroyChild(it);
		this._removeChild(it);
	},

	reorderChild : function(start, end, skipChange) {	// reorder one element, specified by number of item
		if (typeof start != "number") start = this._children.indexOf(start);
		var it = this._children.splice(start, 1)[0];
		this._children.splice(end, 0, it);
		if (this.onReorderChild) this.onReorderChild(it, start, end);
		if (skipChange != true && this.onChildrenChanged) this.onChildrenChanged("o",[it]);
		return this;
	},

	replaceChild : function(index, newChild) {	// reorder one element, specified by number of item
		if (typeof index != "number") index = this._children.indexOf(index);
		this._removeChild(this._children[index]);
		this.addChildAt(index, newChild);
		return this;
	},
	

	//
	//	selection semantics
	//
	selectedChildren : function(index) {
		if (typeof index == "number") return this._selectedChildren[index];
		return this._selectedChildren;
	},

	anyChildrenAreSelected : function(it) {
		return (this._selectedChildren.length > 0);
	},

	childIsSelected : function(it) {
		return (this._selectedChildren.indexOf(it) > -1);
	},
	
	
	// select all args passed in
	// calling "selectChildren" implicicitly deselects all other children
	//	if you don't want that, use "addToSelection"
	selectChildren : function() {
		this.clearChildSelection();
		this.addToChildSelection.apply(this, arguments);
		return this;
	},

	// select all items passed in without affecting previous selection
	addToChildSelection : function() {
		var list = this.getArgsOrList(arguments);
		list.forEach(this._selectChild, this);
		for (var i = 0, len = list.length, it; it = list[i], i < len; i++) {
			if (!it || this.childIsSelected(it)) return;
			this._selectedChildren.push(it);
			if (it.select) it.select();
			if (this.onSelectChild) this.onSelectChild(it);
		}
		if (this.onChildSelectionChanged) this.onChildSelectionChanged("+",list);
	},
	
	
	// don't call this -- just use "select()" or "addToChildSelection()"
	_selectChild : function(it) {
		if (!it || this.childIsSelected(it)) return;
		this._selectedChildren.push(it);
		if (it.select) it.select();
		if (this.onSelectChild) this.onSelectChild(it);
	},
	
	deselectChildren : function() {
		var list = this.getArgsOrChildSelection(arguments);
		list.forEach(this._deselectChild, this);
		if (this.onChildSelectionChanged) this.onChildSelectionChanged("-", list);
		return this;
	},
	
	_deselectChild : function(it) {
		if (!it) return;

		var index = this._selectedChildren.indexOf(it);
		if (index > -1) {
			this._selectedChildren.splice(index,1);
			if (it.deselect) it.deselect();
			if (this.onDeselectChild) this.onDeselectChild(it);
		}
		return this;
	},
	
	clearChildSelection : function() {
		return this.deselectChildren();
	},

		
	//
	//	show/hide semantics
	//
	showChildren : function() {
		this.getArgsOrChildSelection(arguments).forEach(this._showChild, this);
		return this;
	},
	
	_showChild : function(it) {
		if (it.show) it.show();
		else it.visible = true;
		if (this.onShowChild) this.onShowChild(it);
	},
	
	hideChildren : function() {
		this.getArgsOrChildSelection(arguments).forEach(this._hideChild, this);	
		return this;
	},

	_hideChild : function(it) {
		if (it.hide) it.hide();
		else it.visible = false;
		if (this.onHideChild) this.onHideChild(it);	
	},
	
	
	
	//
	//	enable/disable semantics
	//
	enableChildren : function() {
		var list = this.getArgsOrChildSelection(arguments);
		list.forEach(this._enableChild, this);
		if (this.onEnableChanged) this.onEnableChanged("+",list);
		return this;
	},
	
	_enableChild : function(it) {
		if (it.enable) it.enable();
		else it.enabled = true;
		if (this.onEnableChild) this.onEnableChild(it);
	},
	

	disableChildren : function() {
		var list = this.getArgsOrChildSelection(arguments);
		list.forEach(this._disableChild, this);
		if (this.onEnableChanged) this.onEnableChanged("-",list);
		return this;
	},
	
	_disableChild : function(it) {
		if (it.disable) it.disable();
		else if (it.enable) it.enable(false);
		else it.enabled = false;
		if (this.onDisableChild) this.onDisableChild(it);
	},
	
	
	//
	//	focus/defocus	-- ONLY ONE THING CAN BE FOCUSED AT A TIME!
	//
	
	focusedChild : function() {
		if (this._focusedChild) return this._focusedChild;
		// HACK?  If nothing has been designated as focused, return the last selected child
		var selected = this.selectedChildren();
		return selected[selected.length-1];
	},
	
	focusChild : function(it) {
		if (this._focusedChild && this._focusedChild != it) {
			this.defocusChild(this._focusedChild);
		}
		if (it == null) return this;

		this._focusedChild = it;
		if (it.focus) it.focus();
		else it.focused = true;
		if (this.onFocusChild) this.onFocusChild(it);
		return this;
	},

	defocusChild : function(it) {
		if (it == null) it = this.focused;
		if (it == null) return this;
		
		if (it.defocus) it.defocus();
		else if (it.focus) it.focus(false);
		else it.focused = false;
		if (this.onDefocusChild) this.onDefocusChild(it);

		delete this._focusedChild;
		return this;
	},
	
	
	//
	//	set random states
	//
	setStateOfChildren : function(state) {
		var list = this.getArgsOrList(arguments, 1);
		list.forEach(function(it) { if (it.setState) it.setState(state)}, this);
		return this;
	},
	
	clearStateOfChildren : function(state) {
		var list = this.getArgsOrList(arguments, 1);
		list.forEach(function(it) { if (it.clearState) it.clearState(state)}, this);	
		return this;
	},
	
	
	//
	//	iterators
	//


	// call a method on each item, passing args, returns values of the items
	//	same as map, just throws away return values
	forEachChild : function(method, args) {
		this._mapForList(this._children, method, args);
	},
	
	// call method for each, return values returned from method as array
	mapChildren : function(method, args) {
		return this._mapForList(this._children, method, args);
	},

	forEachSelectedChild : function(method, args) {
		this._mapForList(this._selectedChildren, method, args);
	},
	
	mapSelectedChildren : function(method, args) {
		return this._mapForList(this._selectedChildren, method, args);
	},

	_mapForList : function(list, method, args) {
		var results = [];
		if (typeof method == "string") {
			for (var i = 0, it; it = list[i], i < list.length; i++) {
				if (it && it[method]) results[i] = it[method].apply(it, args);
			}
		} else {
			for (var i = 0, it; it = list[i], i < list.length; i++) {
				results[i] = method.apply(it, args);
			}
		}
		return results;
	},

	// call method for each, return values returned from method as array
	filterChildren : function(method, args) {
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
	everyChild : function(method, args) {
		var list = this._children;
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
	someChildren : function(method, args) {
		var list = this._children;
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
	setValueOfChildren : function(prop, value) {
		return this._children.forEach(function(it){return it[prop] = value});
	},
	
	// get a property value for each object in the collection
	getValueOfChildren : function(prop) {
		return this._children.forEach(function(it){return it[prop]});	
	},
	
	
	//
	//	utility-ish methods
	//

	getArgsOrList : function(args, startAt) {
		if (typeof startAt == "undefined") startAt = 0;
		
		// if there is only one thing, and it appears to be an array, just use that
		if (args[startAt] && args.length == (startAt + 1) && typeof args[startAt].length == "number") {
			var list = args[startAt];
		} else {
			var list = [];
			// NOTE: if we don't do the apply, we get:   [ [arg1, arg2, ...] ] rather than [ arg1, arg2, ...]
			list.push.apply(list, args);
		}
		if (startAt) return list.slice(startAt);
		return list;
		
	},
	
	// given the arguments to ANOTHER function,
	//	if the arguments are null, return the _selectedChildren instead
	//	otherwise return the arguments as an array
	getArgsOrChildSelection : function(args, startAt) {
		if (args.length == 0) return this._selectedChildren;

		// if there is only one thing, and it appears to be an array, just use that
		if (args.length == 1 && typeof args[0].length != "undefined") {
			var list = args[0];
		} else {
			var list = [];
			// NOTE: if we don't do the apply, we get:   [ [arg1, arg2, ...] ] rather than [ arg1, arg2, ...]
			list.push.apply(list, args);
		}

		if (startAt) return list.slice(startAt);
		return list;
	}
});



// add a bunch of the methods again in the singular (just syntactic sugar)
dnb.ChildCollection.addToPrototype({
	addChild 			: dnb.ChildCollection.prototype.addChildren,
	addChildAt 			: dnb.ChildCollection.prototype.addChildrenAt,
	removeChild 		: dnb.ChildCollection.prototype.removeChildren,
	destroyChild 		: dnb.ChildCollection.prototype.destroyChildren,
	selectChild 		: dnb.ChildCollection.prototype.selectChildren,
	deselectChild 		: dnb.ChildCollection.prototype.deselectChildren,
	showChild 			: dnb.ChildCollection.prototype.showChildren,
	hideChild 			: dnb.ChildCollection.prototype.hideChildren,
	enableChild 		: dnb.ChildCollection.prototype.enableChildren,
	disableChild 		: dnb.ChildCollection.prototype.disableChildren,
	setStateOfChild 	: dnb.ChildCollection.prototype.setStateOfChildren,
	clearStateOfChild 	: dnb.ChildCollection.prototype.clearStateOfChildren
});