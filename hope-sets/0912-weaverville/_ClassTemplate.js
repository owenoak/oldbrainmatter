/*! Hope application framework, v 0.1					See: http://hopejs.com
 *	Dual licensed under the MIT and GPL licenses:		See: http://hopejs.com/license
 *	Copyright (c) 2006-2009, Matthew Owen Williams.
 */

(function($, hope) {
// 
//		Begin hidden from global scope:
//


new $.Thing({
	name : "",
	Super : "",
	collection : "",
	prototype : {
		initialize : function(properties) {
			this.constructor.register(this);
		},
		mixins : ""
	},
	defaults : {
		mixins : ""
	}
});
	
	
	
//
//		End hidden from global scope: 
//
})(jQuery, jQuery.hope);
