/*! Hope application framework, v 0.1					See: http://hopejs.com
 *	 *	MIT license.										See: http://hopejs.com/license

 *	Copyright (c) 2006-2009, Matthew Owen Williams.
 */

(function($, hope) {
// 
//		Begin hidden from global scope:
//



/** Mixin: $.Saveable  
	Use to save model instances by making a call to the server.
	(Aliased as "Savable" because both are valid english).
 */
$.Saveable = $.Savable = {

	/** Mix in to some object.  */
	mixinTo : function(it) {
		if (it.extend) 	it.extend($.Loadable.defaults);
		else			$.extend(it, $.Loadable.defaults);
		it.asSaveable = it.asSaveable = this.defaults;
	},

	defaults : {
		/** Merge the saveOptions with the default saveOptions. */
		setSaveOptions : function(options) {
			return this.saveOptions = $.protoClone(this.asModel.saveOptions, options);
		},

		saveOptions : {
			/** URL to call to save this model instance.  URL will be interpolated with the model.
				If undefined, the model cannot be saved.
			*/
			url : undefined,
	
			/** Success callback name */
			success : "onSave",
			
			/** Error callback name */
			error : "onSaveError",
		
			/** HTTP Method for save request.  Generally one of:  "GET" or "POST" */
			method : "POST",
		
			/** Format for data saving response.  Generally one of: 'xml', 'text', or 'json' */
			format : "text",
		
			/** Message to show while saving, if defined. */
			message : undefined,
	
			/** Message to show on save error, if defined. */
			errorMessage : undefined
		},
	
		
		/** Save this model instance. 
			@param [data]	Data object or string to pass to the save query.
		*/
		save : function(data) {
			this.ajax(this.saveOptions, data);
			return this;
		}
	},

	toString : function() {	return "$.Saveable" }
};
	

//
//		End hidden from global scope: 
//
})(jQuery, jQuery.hope);
