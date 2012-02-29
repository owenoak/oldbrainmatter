/*! Hope application framework, v 0.1					See: http://hopejs.com
 *	Dual licensed under the MIT and GPL licenses:		See: http://hopejs.com/license
 *	Copyright (c) 2006-2009, Matthew Owen Williams.
 */

(function($, hope) {
// 
//		Begin hidden from global scope:
//


/** TabBar, TabButton and TabGroup. */

// TODO:	- make TabBar/TabGroup scrollable
//			- make tabs contractable if they don't fit

new $.Thing({
	name : "TabButton",
	Super : "Button",
	prototype : {
		template : "TabButton",

		/** Fired when the button is activated. */
		onClick : function(event) {
			this.asButton.onClick.apply(this, arguments);
			this.tellContainer("selectItem", this, event);
		}
	}
});


// TODO: 	- make tabs scroll if there are too many to fit...

new $.Thing({
	name : "TabBar",
	Super : "ListViewer",
	prototype : {
		template : "TabBar",
		itemClass : "TabButton",
		_listKey : "tabs",
		
		// we maintain a selection
		selectable : true
	}
});



/** Nested set of tabs inside a TabBar. 
	Nested tabs can scroll (eventually).
*/
new $.Thing({
	name : "TabGroup",
	Super : "Group", 
	prototype : {
		itemClass : "TabButton",
		_listKey : "tabs",
		selectable : false
	}
});

	
	
//
//		End hidden from global scope: 
//
})(jQuery, jQuery.hope);
