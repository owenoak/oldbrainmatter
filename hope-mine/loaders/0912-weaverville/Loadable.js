/*! Hope application framework, v 0.1					See: http://hopejs.com
 *	 *	MIT license.										See: http://hopejs.com/license

 *	Copyright (c) 2006-2009, Matthew Owen Williams.
 */

(function($, hope) {
// 
//		Begin hidden from global scope:
//


/** Mixin: $.Loadable
	Use to load model instances by making a call to the server.
 */
$.Loadable = {

	/** Mix in to some object.  */
	mixinTo : function(it) {
		if (it.extend) 	it.extend(this.defaults);
		else			$.extend(it, this.defaults);
		it.asLoadable = this.defaults;
	},
	
	defaults : {

		/** Merge the loadOptions with the default loadOptions. */
		setLoadOptions : function(options) {	
			return this.loadOptions = $.protoClone(this.loadOptions, options);
		},
	
		//
		//	loading
		//
	
		loadOptions : {
			/** URL to call to load this model instance.  
				The URL will be interpolated with the model, meaning you can 
				provide substitutions in the URL with `{{...}}`.
				If undefined, the model cannot be loaded.
			  */
			url : undefined,
			
			/** Success callback name */
			success : "onLoad",
			
			/** Error callback name */
			error : "onLoadError",
		
			/** HTTP Method for load request.  Generally one of:  "GET" or "POST" */
			method : "GET",
			
			/** Format for data loading response.  Generally one of: 'xml', 'text', or 'json' */
			format : "xml",
		
			/** Message to show while loading, if defined. */
			message : undefined,
	
			/** Message to show while loading, if defined. */
			errorMessage : undefined,
		},
	
	
		/** Load the model instance. 
			@param [data=Object]  Data to pass in to the load ajax call.
		*/
		load : function(data) {
			this.ajax(this.loadOptions, data);
			return this;
		}
	},// end defaults
	
	toString : function() {	return "$.Loadable" }

}// end $.Loadable


//
//		End hidden from global scope: 
//
})(jQuery, jQuery.hope);
