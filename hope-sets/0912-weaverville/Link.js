/*! Hope application framework, v 0.1					See: http://hopejs.com
 *	Dual licensed under the MIT and GPL licenses:		See: http://hopejs.com/license
 *	Copyright (c) 2006-2009, Matthew Owen Williams.
 */

(function($, hope) {
// 
//		Begin hidden from global scope:
//

/**  Simple link class. */

//	TODO: 	- some sort of action semantics?

new $.Thing({
	name : "Link",
	Super : "Drawable",
	prototype : {
		/** Additional attributes that we export. */
		attributes : "href,target,name",
	
		/** Url to link to. */
		href : undefined,
		
		/** Target frame. */
		target : undefined,
		
		/** name attribute */
		name : undefined,
		
		/** title of the link. */
		title : undefined
	}
});
	
	
	
//
//		End hidden from global scope: 
//
})(jQuery, jQuery.hope);
