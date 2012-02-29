/*
	Selectable mixin, works with ListManagers.

*/

(function($) {	// begin hidden from global scope

$.Selective = {
	mixinTo : function(Class) {
		if (!Class.prototype) throw  "$.Selective must be mixed into a Class";
//		$.mixin(Class, this.Class);
		$.mixin(Class.prototype, this.prototype);
	},
	
	prototype : {
		selection : undefined,
		
		// select a new item
		select : function(item) {
			if (item != this.selection) {
				if (this.selection && this.selection != item) this.deselect(this.selection);
				this.selection = item;
				this.notify("selected", item);
			}
			this.highlightSelection();
			return item;
		},
		
		deselect : function(item) {
			if (item == null) item = this.selection;
			if (item == null) return;
			
			this.highlightSelection();
			this.notify("deselected", item);
		},
		
		isSelected : function(item) {
			return this.selection === item;
		},
		
		// HMMM, this is really specific to Drawables...
		highlightSelection : function() {
			if (!this.forEach) return;
			this.forEach(function(item) {
				if (!item.$element) return;
				item.$element.toggleClass("HIGHLIGHT", this.isSelected(item));
			});
		}
	},
	
	toString : function(){ return "$.Selective"}
}


})(jQuery);
