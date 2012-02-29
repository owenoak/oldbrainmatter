/*! Hope application framework, v 0.1					See: http://hopejs.com
 *	Dual licensed under the MIT and GPL licenses:		See: http://hopejs.com/license
 *	Copyright (c) 2006-2009, Matthew Owen Williams.
 */

(function($, hope) {
// 
//		Begin hidden from global scope:
//


//
//	TODO: 		- checkmark in menus?
//



new $.Thing({
	name : "Menu",
	Super : "ListViewer",
	prototype : {
		template : "Menu",
		labelTemplate : "MenuLabel",
		itemClass : "MenuItem",
		_containerKey : "menu",
		
		/** Should we hide the menu when selected? */
		autoHide : true,
		
		/** An item has been selected. */
		selectItem : function(item, event) {
			// call the superclass method to perform the action, notify, etc.
			this.asListViewer.selectItem.apply(this, arguments);
			
			// and hide the menu
			if (this.autoHide) this.hide();
			return this;
		},
		
		/** Override show to possibly move the menu near the event. */
		show : function(event) {
		// TODO: locate the menu near the event
			this.asDrawable.show.apply(this);
			return this;
		},
		
		
		/** Override prepareToAdd to:
				- work with simple strings (sets both title and value)
				- take "-" as a separator
		*/
		prepareToAdd : function(item) {
			if (typeof item == "string") {
				if (item == "-") return new $.MenuSeparator();
				return new $.MenuItem({title:item, value:item});
			}
			return this.asListViewer.prepareToAdd.apply(this, arguments);
		}
	}
});


new $.Thing({
	name : "MenuGroup",
	Super : "Group",
	prototype : {
		template : "MenuGroup",
		labelTemplate : "MenuLabel",
		itemClass : "MenuItem",
		_containerKey : "menu",
		selectable : false,
		prepareToAdd : $.Menu.prototype.prepareToAdd
	}
});
	


new $.Thing({
	name : "MenuItem",
	Super : "Button",
	prototype : {
		template : "MenuItem",
		
		/** Fired when the button is activated. */
		onClick : function(event) {
			this.asButton.onClick.apply(this, arguments);
			this.tellContainer("selectItem",this, event);
		}
	}
});




new $.Thing({
	name : "MenuSeparator",
	Super : "Drawable",
	prototype : {
		template : "MenuSeparator",
		onClick : function(event) {
			if (this.menu.autoHide) this.menu.hide();
		}
	}
});



new $.Thing({
	name : "MenuButton",
	Super : "Button",
	prototype : {
		template : "MenuButton",
		
		/** If true, we should reflect the current value in the menu. */
		reflectSelectedItem : true,
		
		/** Pointer to the menu we will show. */
		menu : undefined,
		
		// observe `menu.selectItem()` so we can update our title when the menu changes its value
		setMenu : function (menu) {
			if (this.menu && this.menu != menu) this.ignore(menu, "onSelectItem", "onItemSelected");
			this.observe(menu, "onSelectItem", "onItemSelected");
			return menu;
		},
		
		/** The button was pressed -- just show the menu. */
		onClick : function(event) {
			this.menu.show(event);
		},
	
		/** Update our title when the an item is selected. */
		onItemSelected : function(listViewer, item) {
			if (this.reflectSelectedItem) {
				this.title = item.title;
				if (this.elements) this.elements.html(this.title);
			}
		}
	}
});


	
//
//		End hidden from global scope: 
//
})(jQuery, jQuery.hope);
