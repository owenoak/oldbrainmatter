/*! Hope application framework, v 0.1					See: http://hopejs.com
 *	Dual licensed under the MIT and GPL licenses:		See: http://hopejs.com/license
 *	Copyright (c) 2006-2009, Matthew Owen Williams.
 */

(function($, hope) {
// 
//		Begin hidden from global scope:
//


//
//	TODO: 	- some mechanism for pulling existing elements out of HTML and initializing them.
//			- look for a 'itemContainer' attribute on our main HTML
//				BEFORE expanding items to get our itemContainer
//


/** Container class -- a drawable that contains other drawables. */

new $.Thing({
	name : "Container", 
	Super : "Drawable", 
	prototype : {
		mixins : "ListManager",
	
		/** Property name in this object we use to refer to our list of items. */
		_listKey : "items",

		/** Property name in the instance that will refer to us. */
		_containerKey : "container",
	
		/** Constructor for items that are not drawables. */
		itemClass : undefined,

		/** Defaults to apply to all newly created items. */
		itemDefaults : undefined,
	
		/** If showLabel==true, we have a labelTemplate and we have a  title
			we output some HTML for our title and stick it at the head of the container. 
		*/
		showLabel : false,
		labelTemplate : undefined,

		//
		//	initialize/destroy
		//
			
	
		/** Destroy the container. First destroys all items. */
		destroy : function() {
			this.forEach("destroy");
			this.asDrawable.destroy.apply(this);
		},
		
		//
		//	item semantics
		//
		
		/** Array of our drawable items. */
		items : undefined,
		

		/** If item is not a Drawable and we have an itemClass,
			convert the item to an instance of that Thing. 
		*/
		prepareToAdd : function(item) {
			this.itemClass = $.Thing(this.itemClass, this+": itemClass '"+this.itemClass+"' not found");
			if (item instanceof $.Drawable) return item;
			if (!this.itemClass) throw "Item '"+item+"'is not drawable."
			return new this.itemClass(this.itemDefaults, item);
		},
		
		/** Add one or more drawables to our list of items.
			If we have already been drawn, item will be drawn.
		*/
		add : function() {
			// defer to listManager to actually add the items
			var items = this.asListManager.add.apply(this, arguments);
			
			// If we have already been drawn, tell the items to draw.
			if (this.elements) items.forEach(function(item){item.draw()});

			return items;
		},
		
		/** Remove one or more items. */
		remove : function() {
			var items = this.asListManager.remove.apply(this, arguments);

			// have the items remove their elements from the HTML
			items.forEach(function(item){item.removeElements()});

			return items;
		},	
		
		
		/** Set to a particular set of items (wipes out old items). */
		setItems : function(items) {
			this.empty();
			this.add.apply(this, items);
			return items;
		},

		//
		//	drawing semantics
		//
		
		/** Element or sub-selector of this.elements in which to draw our items.
			If undefined, items will be drawn in first of this.elements.
		*/
		itemContainer : undefined,
		
	
		/** Return the jQuery-enhanced element that the item should draw inside. 
			@param {Element} [item]  Item to draw.
		*/
		getItemContainer : function(item) {
			if (!this.elements) return;
			
			if (!this.itemContainer) return this.elements;
			
			// NOTE:  do NOT cache this, in case it changes!
			var elements = this.elements.find(this.itemContainer);
			if (!elements || elements.length == 0) throw this+".getItemContainer(): no elements matched.";
			return elements;
		},
		
		/** Draw the container.  Draws all items. */
		draw : function() {
			this.asDrawable.draw.apply(this);

			// draw our title if necessary
			if (this.showLabel && this.title && this.labelTemplate) {
				this.labelElements = this.expandTemplate(this.labelTemplate);
				if (this.labelElements) this.getItemContainer().prepend(this.labelElements);
			}
			
		// TODO: reparent items inside us if they have drawn already?
			// HMM, I think this will have each item update twice or not at all...
			this.forEach("draw", [$.SKIP]);
			return this;
		},
		
		/** Update the container.  Updates all items. */ 
		update : function(properties) {
			this.asDrawable.update.apply(this, arguments);
			this.forEach("update");
		},
		
		//
		//	enable/disable semantics
		//
		//
		enable : function() {
			$.Drawable.prototype.enable.apply(this, arguments);
			this.forEach("enable", arguments);
		},
	
		disable : function() {
			$.Drawable.prototype.disable.apply(this, arguments);
			this.forEach("disable", arguments);
		}
	}// end prototype

});// end new $.Thing



new $.Thing({
	name : "Group",
	Super : "Container",
	prototype : {
		template : "Group",
		passEvents : true
	}
});


new $.Thing({
	name : "FieldSet",
	Super : "Container",
	prototype : {
		template : "FieldSet",
		
		/** Title of the fieldset (goes in a 'legend' element). */
		title : undefined,
		
		/** Alignment of the title.  One of: "top", "right", "bottom", "left" */
		titleAlignment : "top"		
	}
});



//
//		End hidden from global scope: 
//
})(jQuery, jQuery.hope);
