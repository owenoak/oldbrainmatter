/*! Hope application framework, v 0.1					See: http://hopejs.com
 *	 *	MIT license.										See: http://hopejs.com/license

 *	Copyright (c) 2006-2009, Matthew Owen Williams.
 */

(function($, hope) {
// 
//		Begin hidden from global scope:
//


/** Abstract Model class.
	When you create model instances, you can mixin "Loadable", "Saveable" and/or "Deletable"
	to load/save/delete the item on the server.

	Models are generally initialized with a controller object, which may observe the model.

	@class 
 */
new $.Thing({
	name : "Model",
	collection : "Models",
	prototype : {


	}, // end prototype
	
	defaults : {
		identifierKeys : "name"
	}	// end class defaults

}); // end new Thing()




//
//		End hidden from global scope: 
//
})(jQuery, jQuery.hope);
