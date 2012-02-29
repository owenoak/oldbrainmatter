/*! Hope application framework, v 0.1					See: http://hopejs.com
 *	 *	MIT license.										See: http://hopejs.com/license

 *	Copyright (c) 2006-2009, Matthew Owen Williams.
 */

(function($, hope) {
// 
//		Begin hidden from global scope:
//


/** Mixin: $.Configurable
	Use to manage a set of configuration data which is loaded by someone else. (??)
 */

//	TODO:  have this be able to load itself?

$.Configurable = {
	/** Mix in to some object. */
	mixinTo : function(it) {
		if (it.extend) 	it.extend(this.defaults);
		else			$.extend(it, this.defaults);
		it.asConfigurable = this.defaults;
	},
		
	defaults : {
		/** typeMap for configuration data. */
		configTypeMap : {},
	
		/** Turn a list of configuration objects expressed as:
				{	name:"configName", value:"configValue" 	}
			into a single object stored in the model as `this.config`.
			
			@fires 'onConfigUpdate' if the config passed in is different than our current config.
		 */		
		setConfig : function setConfig(configItems) {
			if (!this.config) this.config = {};
			// map the array of configItems to a single config object
			var config = {};
			configItems.forEach(function(item) {
				var key = item.name,
					value = item.value
				;
				value = this.parseType(key, value, this.configTypeMap);
				config[key] = value;
			}, this);
			
			// if there are any differences between config passed in and our current config...
			var deltas = $.deltas(this.config, config);
			if (deltas) {
				// notify any observers about the change
				this.notify("onUpdateConfig", deltas);
				// and remember the new config
				this.config = config;
			}
			return deltas;
		}
	},

	toString : function() {	return "$.Configurable" }
};	// end $Configurable


//
//		End hidden from global scope: 
//
})(jQuery, jQuery.hope);
