//
//	ServiceController
// 

(function($) {	// begin hidden from global scope

window.SC = window.ServiceController = gear6.ServiceController = new $.Controller({
	id : "ServiceController",

	// we maintain the Service selection
	mixins : "$.Selective",

	observations : [
		{	target : StatsProxy, event:"refresh", callback : "onRefresh" }
	],
	
	/** Default configuration data for the application. */
	config : {
		role : "none",					// "role" is the current user's authentication level
		mode : "cloud",
		appname : "Gear6 Memcached",
		version : "v 1.0",
		maxDataSamples : 500,
		timezoneOffset : 0,
		timezoneName : "GMT",
		storageEnabled : false,
		reporter : "off"
	},

	// list of roles, in order of escalating privilege
	//REFACTOR: these are really app things
 	roles : ['none', 'view', 'modify', 'super'],


	loadFromHash : function(hash, page) {
		app.select(page);
		app.refresh();
	},

	// select a service
	select : function(service) {
//console.group("SC.select",service)
		this.as($.Selective, "select", arguments); // returns null if already selected

		// select the memcacheServer
		var server = service.lastServer || service.servers[0];
//console.warn("SC.select: selecting server ",server);
		MemcacheController.select(server);
		
		this.isGear6 = service.isGear6;
		
//console.groupEnd()
	},

	highlightSelection : function() {
		var service = this.selection;
//console.info("SC.highlightService",service);
		// highlight the proper PageSelector
		$("#serviceSelector .HIGHLIGHT").removeClass("HIGHLIGHT");
		$(".ServiceSelector[service="+service.getIdentifier()+"]").addClass("HIGHLIGHT");
	},

	// Refresh our data (by adding a new ConfigLoader request).
	onRefresh : function(requestQueue) {
		requestQueue.addRequest(new this.ConfigLoader());
	},
	
	// Load the list of machine types for this cloud.
	loadMachineTypes : function() {
		SP.addRequest(new this.MachineTypesLoader());
	},
	
	toString : function() {	return "gear6.ServiceController" }

});

StatsProxy.controllers.service = ServiceController;



})(jQuery);	// end hidden from global scope
