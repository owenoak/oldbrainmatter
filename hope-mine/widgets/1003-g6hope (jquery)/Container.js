//
//	Simple (abstract) Drawable class, WITH child items.
//	If you DON'T want to manage items, use a $.Drawable
//
(function($) {	// begin hidden from global scope


new $.Drawable.subclass({
	reference : "$.Container",
	
	prototype : {
		// Containers manage a collection of "items"
		collection : {
			name : "items",
			type : "item"
		},
	
		$container			: ".Container",			// pointer to or selector for our item container element
													//	(desecendant of our $element)
		
		itemOptions			: undefined,			// if defined, we mixin() these properties to items
													//	after adding the item
													
		itemClass			: undefined,			// if defined and item is not a Drawable,
													//	we will instantiate item as one of these

		template 			: "<div id='#{id}' class='#{className} Container #{_cssClass}' #{getAttributes()}></div>",

		// about to add a item -- convert to a drawable if necessary
		onAddItem : function(item) {
			if (this.itemClass && !(item instanceof $.Drawable)) {
				var Class = $.getClass(this.itemClass);
				if (Class) throw TypeError(this+".onAddItem(): Class '"+this.itemClass+"' not found");
			}
			return item;
		},
		
		// just added a item:
		//	- set it's "container" to us
		//	- draw if if we've already been drawn
		onAddedItem : function(item) {
			if (this.itemOptions) $.mixin(item, this.itemOptions);
			item.container = this;
			if (this.isDrawn) {
				// draw the item inside our container element
				item.draw(this.get$container());
			} else {
				this._redrawItems = true;
			}
		},

		// item has been removed -- remove it from the dom if it is contained within our $element
		onRemovedItem : function(item) {
			if (!this.$element || !item.$element) return;
			
			var ourElement = this.$element[0];
			$.forEach(item.$element.parents(), function(parent) {
				if (parent === ourElement) item.$element.detach();
			});
		},
		
		// Draw us (and our items)
		//	- notifies "onDraw"  BEFORE we actually draw
		//	- notified "onDrawn" AFTER we draw (and have drawn items)
		draw : function($parent) {
			this.notify("draw");
			if (this.$element == null || this._redrawAll) {
				this.drawMainElement($parent);
			}
			var items = this.items;
			if ((!this.isDrawn || this._redrawItems) && items.length) {
				var container = this.get$container();
				container.empty();
				this.drawItems(container);
				this._redrawItems = false;
			}
			this.isDrawn = true;
			this.notify("drawn");
			return this;
		},
		
		drawItems : function() {
			var container = this.get$container();
			this.items.forEach(function(item) {
				item.draw(container);
			});
		},

		show : function() {
			this.as($.Drawable, "show", arguments);
			// show any of our elements with $parent set (?)
			// REFACTOR - this is not right.  showIf ?
			if (this.items) this.items.forEach(function(item) {
				if (item.$parent) item.show();
			});
		},
		
		hide : function() {
			this.as($.Drawable, "hide", arguments);
			// hide any of our elements with $parent set (?)
			// REFACTOR - this is not right.  showIf ?
			if (this.items) this.items.forEach(function(item) {
				if (item.$parent) item.hide();
			});
		},

		onSelectedItem : function(item) {
			item.notify("selected");
		},

		onDeselectedItem : function(item) {
			item.notify("deselected");
		},

		// return a pointer to our item container
		// NOTE: we don't cache our container in case we redraw our $element!
		get$container : function() {
			if (this.$container && typeof this.$container !== "string") return this.$container;

			// try to find as a selector
			var container;

			// first try to get it as a item of our $element
			if (this.$element) container = this.$element.find(this.$container).first();

			// if that didn't work, try to get as a global selector
			if (!container || container.length == 0) container = $(this.$container).first();

			// if not found, throw a type error
			if (container.length == 0) {
				throw TypeError(this+".get$container(): Can't find container "+this.$container);
			}
			
			return container;
		}
		
		// REFACTOR: destroy items?
//		destroy : function() {},
		
	}
});

})(jQuery);	// end hidden from global scope
