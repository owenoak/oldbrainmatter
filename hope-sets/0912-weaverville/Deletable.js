/*! Hope application framework, v 0.1					See: http://hopejs.com
 *	 *	MIT license.										See: http://hopejs.com/license

 *	Copyright (c) 2006-2009, Matthew Owen Williams.
 */

(function($, hope) {
// 
//		Begin hidden from global scope:
//


/** Mixin: $.Deletable
	Use to delete model instances by making a call to the server.
 */


$.Deletable = {

	/** Mix in to some object.  */
	mixinTo : function(it) {
		if (it.extend) 	it.extend(this.defaults);
		else			$.extend(it, this.defaults);
		it.asDeletable = this.defaults;
	},

	defaults : {
		/** Merge the deleteOptions with the default deleteOptions. */
		setDeleteOptions : function(options) {	
			return this.deleteOptions = $.protoClone(this.asModel.deleteOptions, options);
		},
	
		deleteOptions : {
			/** URL to call to delete this model instance.  URL will be interpolated with the model.
				If undefined, the model cannot be deleteed.
			*/
			url : undefined,
		
			/** Success callback name */
			success : "onDelete",
			
			/** Error callback name */
			error : "onDeleteError",
	
			/** HTTP Method for delete request.  Generally one of:  "GET" or "POST" or "DELETE" 
				Note: "DELETE" is not supported by all browsers.
			 */
			method : "POST",
		
			/** Format for data delete response.  Generally one of: 'xml', 'text', or 'json' */
			format : "text",
		
			/** Message to show while deleting, if defined. */
			message : undefined,
	
			/** Message to show on save error, if defined. */
			errorMessage : undefined
		},	
			
		/** Delete this model instance. 
			@param [data]	Data object or string to pass to the delete query.
		*/
		deleteOnServer : function(data) {
			this.ajax(this.deleteOptions, data);
			return this;
		}
	},

	toString : function() {	return "$.Deletable" }
};


//
//		End hidden from global scope: 
//
})(jQuery, jQuery.hope);
