/*	Simple "MenuButton" class -- unites a menu w/ a button that reflects the menu's selected state.
	Copyright (c) 2010, MapR Technology.  All rights reserved.
 */

(function(){	// begin hidden from global scope

Ext.ns("mapr.widgets");

// Simple "MenuButton" class -- button which displays the selection of a set of menu items.
//	Based off a button, with an object or an array of strings as menu.items (set on the button).
//  Calls button.handler(menuText) when an item is checked.
//  Use  select.selection and select.select() to affect what is displayed.
//
//	TODO: "-" at head of menuText on config for a label
//
mapr.widgets.MenuButton = Ext.extend(Ext.Button, {
	constructor : function(cfg) {
		mapr.widgets.MenuButton.superclass.constructor.call(this, cfg);
		
//TODO: this should actually be instantiated later... ?
		this.initMenu();
	},

	initMenu : function() {
		// clone the items as menu items for a new menu
		if (this.menu) return;
		if (!this.items) throw "Selects must be initialized with .menu or .items";
		
		// if they gave us a non-array, just use the keys
		var items = (this.items.length ? this.items : util.keys(this.items));
		var menuItems = [], i = -1, item;
		while (item = items[++i]) {
			menuItems.push({ text:item });
		}
		var menu = this.menu = new Ext.menu.Menu({
			defaults : {
				checked : false,
				group : "items",
				checkHandler : this.onItemChecked.bind(this)
			},
			items : menuItems
		});

		// if something is already selected, show it
		if (this.selection) this.select(this.selection);	
	},
	
	setValue : function(value) {
		this.select(value);
	},
	
	// a menu item was checked or unchecked
	onItemChecked : function(menuItem, checked) {
		// ignore un-checking items
		if (!checked) return;
		
		var menuText = menuItem.text;
		var scope = this.scope || this;
		this.checkHandler.apply(scope, [menuText]);
		
		this.select(menuText);
	},
	
	// title of the selected item
	selection : undefined,
	
	// return the title of the selected item
	getSelection : function() {
		return this.selection;
	},

	// update the selected title (does NOT call any handlers)
	select : function(title) {
		this.selection = title;
		this.setText(title);
	}

});
Ext.reg("menubutton", mapr.widgets.MenuButton);


})();			// end hidden from global scope
