/*	Simple "select" form item class.
	Copyright (c) 2010, MapR Technology.  All rights reserved.
 */

(function(){	// begin hidden from global scope

Ext.ns("mapr.widgets");


// Derivative of ComboBox which is set up to:
//	- not be editable
//	- always assume local data
//	- take its "options" from:
//			- an array
//			- an object
//			- a Store instance with "value" and "title" fields
//
mapr.widgets.Select = Ext.extend(Ext.form.ComboBox, {
	// standard cofig overrides for selects
	mode			: "local",
	triggerAction 	: "all",
	forceSelection 	: true,
	editable		: false,
	displayField	: "title",
	valueField		: "value",

	// "options" for the select, one of:
	//	- array		# => title  	for each option
	//	- object	key -> title	for each option
	//	- Store		Store implementation (used w/o modification)
	options : undefined,

	// set up the store based on the 'options' on construction
	//	NOTE: this really could happen later, but not sure when to do it
	constructor : function(cfg) {
		mapr.widgets.Select.superclass.constructor.call(this, cfg);
		if (this.options) this.setOptions(this.options);
	},
	
	
	setOptions : function(options) {
		// otherwise create a store
		this.options = []
		var title;
		// array of value->title pairs
		//	skips array indices where there is no string title
		if (options instanceof Array) {
			for (var i = 0, len = options.length; i < len; i++) {
				title = options[i];
				if (typeof title === "string") this.options.push([i, title]);
			}
		}
		// object as value->title pairs
		else {
			for (var key in options) {
				title = options[key];
				if (typeof title === "string") this.options.push([key, title]);
			}
		}
		
		if (!this.store) {
			// create the actual store
			this.store = new Ext.data.ArrayStore({
				fields : ["value","title"],
				data : this.options
			});
		
		} else {
			this.store.loadData(this.options);		
		}
	}
});
Ext.reg("select", mapr.widgets.Select);


})();			// end hidden from global scope
