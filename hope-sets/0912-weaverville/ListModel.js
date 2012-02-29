/*! Hope application framework, v 0.1					See: http://hopejs.com
 *	 *	MIT license.										See: http://hopejs.com/license

 *	Copyright (c) 2006-2009, Matthew Owen Williams.
 */

(function($, hope) {
// 
//		Begin hidden from global scope:
//

/** Abstract ListModel -- manages a single list of Model items.
	Can load/save/destroy itself with the server.
	Models are generally initialized with a controller object, which may observe the model.
	@class 
 */

new $.Thing({
	name : "ListModel",
	Super : "Model",
	prototype : {
		mixins : "ListManager",

		/** Pointer to or name of the constructor for individual model items. */
		itemClass : undefined,
		
		/** If true, when we're (re)loading, we will destroy and instances
			that existed before but were not part of the new load results. 
			TODOC: better explanation, better name.
		*/
		destroyInstancesOnLoad : true,
		

		/** Callback when raw model data has finished loading. */
		onLoad : function(rawData) {
			var rawItems = this.dataToItems(rawData);
			this.updateItems(rawItems);
		},

		/** Transform the raw data into an array of anonyous objects which we will subsequently instantiate.
			For example, if your rawData is an XML document, this might extract
			all of the relevant data instances and convert them to instances.
		*/
		dataToItems : function(rawData) {
			if (!rawData.forEach) {
				 throw new TypeError(this+".processLoadedData(): rawData is not enumerable");
			}
			return rawData;
		},

		/** Given the data from our loading process converted to a set of anonymous JS objects
				- create new instances for any new objects
				- update any pre-existing instances
				- destroy any instances that were not found in the new list.
		 */
		updateItems : function(rawItems) {
			var itemClass = this.itemClass 
						  = $.Thing(this.itemClass, this+": itemClass '"+this.itemClass+"' not found");

			// get the current list of items
			//	so we can know if any objects were NOT referenced in this load
			var oldItems = [].concat(this.getItems());
			
			rawItems.forEach(function(properties) {
				var instance = itemClass.getInstance(properties, $.SKIP);

				if (instance) {
					instance.update(properties);
					oldItems.remove(instance);
				} else {
					instance = new itemClass(properties);
					this.add(instance);
				}
			}, this);
			
			// if there were any original items that did NOT get reloaded
			//	remove them from our list and destroy them
			// TODO: some sort of flag to skip this behavior? 
			if (oldItems.length && this.destroyInstancesOnLoad) {
				oldItems.forEach(function(instance) {
					this.remove(instance);
					instance.destroy();
				}, this);
			}
		}
	}
});

//
//		End hidden from global scope: 
//
})(jQuery, jQuery.hope);

