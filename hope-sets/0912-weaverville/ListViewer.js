/*! Hope application framework, v 0.1					See: http://hopejs.com
 *	Dual licensed under the MIT and GPL licenses:		See: http://hopejs.com/license
 *	Copyright (c) 2006-2009, Matthew Owen Williams.
 */

(function($, hope) {
// 
//		Begin hidden from global scope:
//



/** ListViewer -- manages a set of sub-items of a particular type.
	This is often hooked up to a ListModel to show each of the sub-items.
*/


new $.Thing({
	name : "ListViewer",
	Super : "Container",
	prototype : {
		template : "ListViewer",
		
		/** Pointer to or name of the constructor for individual list items. */
		itemClass : "ListItem"

	
	}, // end prototype
	defaults : {}

});// end ListViewer
	

/** Completely abstract ListItem class -- you must override. */
new $.Thing({
	name : "ListItem",
	Super : "Drawable",
	prototype : {
		template : "ListItem",
	}
});// end $.ListItem



new $.Thing({
	name : "ListSeparator",
	Super : "Drawable",
	prototype : {
		template : "ListSeparator"
	}
});


new $.Thing({
	name : "ListGroup",
	Super : "ListViewer",
	prototype : {
		template : "ListGroup"
	}
});



//
//		End hidden from global scope: 
//
})(jQuery, jQuery.hope);
