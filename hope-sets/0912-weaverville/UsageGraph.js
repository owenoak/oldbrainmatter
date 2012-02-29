/*! Hope application framework, v 0.1					See: http://hopejs.com
 *	Dual licensed under the MIT and GPL licenses:		See: http://hopejs.com/license
 *	Copyright (c) 2006-2009, Matthew Owen Williams.
 */

(function($, hope) {
// 
//		Begin hidden from global scope:
//


/** Usage graph.  Hook up to a model. */

// TODO:	rename?

new $.Thing({
	name : "UsageGraph",
	Super : "Drawable",
	prototype : {
		template : "UsageGraph",
		
		/** Model object that we look to for values/title/etc. */
		model : undefined,
		
		/** Key in the model that represents the total amount. */
		totalKey : "memory",

		/** Key in the model that represents the amount used. */
		usedKey : "used",

		/** Method we call on the model to get the label. */
		labelMethod : "getGraphLabel",

		/** CSS class for the 'used' portion of the graph. */
		usedClassName : "Used",
		
		/** CSS class for the label portion of the graph. */
		labelClassName : "Title",
		
	
		/** Get the label for the graph. */
		getLabel : function() {
			return this.model[this.labelMethod]();
		},

		/** Get the amount used. */
		getUsedAmount : function() {
			if (!this.model) return "0%";
			var used = this.model[this.usedKey] || 0,
				total = this.model[this.totalKey] || 100
			;
			return (used * 100 / total) + "%";
		},
		
		/** Update map to update the graph. */
		updateMap : {
			"[part=used]|style|width" : function(){return this.getUsedAmount()},
			"[part=label]" 			  : function(){return this.getLabel()}
		}
	}
});
	
	
	
//
//		End hidden from global scope: 
//
})(jQuery, jQuery.hope);
