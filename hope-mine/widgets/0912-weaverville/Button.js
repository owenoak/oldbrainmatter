/*! Hope application framework, v 0.1					See: http://hopejs.com
 *	Dual licensed under the MIT and GPL licenses:		See: http://hopejs.com/license
 *	Copyright (c) 2006-2009, Matthew Owen Williams.
 */

(function($, hope) {
// 
//		Begin hidden from global scope:
//


new $.Thing({
	name : "Button",
	Super : "Drawable",
	prototype : {
		template : "Button",

		/** Title of the button. */
		title : undefined,
		
		/** Fired when the button is activated. */
		onClick : function(event, element) {
			if (typeof this.action == "function") this.action();
			this.notify("onActivated");
		}
	},
	defaults : {}
});
	
	
	
//
//		End hidden from global scope: 
//
})(jQuery, jQuery.hope);
