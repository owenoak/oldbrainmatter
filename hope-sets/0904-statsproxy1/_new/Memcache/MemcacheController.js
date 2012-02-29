//
//	ServiceController
// 

(function($) {	// begin hidden from global scope

window.MC = window.MemcacheController = gear6.MemcacheController = new $.Controller({
	id : "MemcacheController",

	// we are the MemcacheServer controller
	mixins : "$.Selective",
	
	// default page to show, set in Mecmache/pages.js
	defaultPage 		: undefined,

	// page we're currently showing (or were last showing)
	lastPage 		: undefined,

	observations : [
		{	target : StatsProxy, event:"refresh", callback : "onRefresh" },
		{	target : StatsProxy, event:"selected", callback : "onSelectPage"},
		{	target : MemcacheService, event:"createdItem", callback:"onMemcacheServiceCreated"}
	],

	// is the selected server a gear6 server?  You can use this statically...
	isGear6 : function() {
		return MemcacheController.selection && MemcacheController.selection.isGear6
	},
	
	// is the selected server NOT a gear6 server?  You can use this statically...
	isNotGear6 : function() {
		return !MemcacheController.selection || !MemcacheController.selection.isGear6
	},

	onRefresh : function(requestQueue) {
		requestQueue.addRequest(new this.ConfigLoader());
	},


	loadFromHash : function(hash, page) {
//console.group("MC.loadFromHash",page);
		var info = page.getHashInfo(hash);
//console.warn("MC.loadFromHash", info.server, info.page);
		this.select(info.server);	// might change the current page
		app.select(info.page);
		app.refresh();
//console.groupEnd();
	},

	
	// select a server
	select : function(server) {
		var oldSelection = this.selection;
		
		//console.group("MC.select",server);
		this.as($.Selective, "select", arguments); // returns null if already selected
	
		// select the service if it wasn't selected before
		server.service.lastServer = server;
		if (oldSelection != this.selection && ServiceController.selection != server.service) {
			ServiceController.select(server.service);
		} else {
			ServiceController.highlightSelection();
		}
		
		var currentPage = app.selection;
		if (currentPage) {
			if (currentPage.controller != this) currentPage = null;
			else if (!currentPage.isValidForServer(server)) currentPage = null;
		}
		if (!currentPage) {
			if (this.lastPage && this.lastPage.isValidForServer(server)) {
//console.warn("MC.selecting lastPage:", this.lastPage);
				app.select(this.lastPage);
			} else {
//console.warn("MC.selecting defaultPage:", this.defaultPage);
				app.select(this.defaultPage);
			}
		}
		
		//console.groupEnd()
	},

	// highlight the server 'cause it's about to be shown
	highlightSelection : function() {
		var server = this.selection;
		if (!server) return;
//console.warn("MC.highlightSelection",server);
		// add classes to the body to hide non-gear6 items
		var isGear6 = server.isGear6;
		$("body").toggleClass("isGear6", isGear6)
				 .toggleClass("isNotGear6", !isGear6)
		;
		
		// show the proper server name for anyone who cares
		$(".selectedMemcacheServer").html(server.getTitle());

		// highlight the proper ServiceView row
		$(".MemcacheServer.HIGHLIGHT").removeClass("HIGHLIGHT");
		$(".MemcacheServer[server="+server.getIdentifier()+"]")
			.addClass("HIGHLIGHT");
	},

	
	// if a Memcache page is selected, 
	//	make sure that we have a valid selected service
	onSelectPage : function(page) {
		if (page.controller != this) return;
//console.warn("MC.onSelectPage",page);		
		if (this.selection == null || this.selection.isDestroyed) {
			// try to find the server that matches this hostname
			var hostname = window.location.hostname;
			var server = MemcacheServer.instances.get("ip", window.location.hostname);
			
			// fallback is just the first server in the list
			if (!server) server = MemcacheServer.instances[0];
			this.select(server);
		}
		this.lastPage = page;
	},
	
	// create a button in the serviceSelector for each service created
	onMemcacheServiceCreated : function(service) {
		ServiceController.serviceSelector.onServiceCreated(service);
	},
	
	
	//
	//	event handlers from ServiceView, etc
	//
	
	// selects the server and refreshes the page
	//	if you just want to select without redrawing, use MC.select();
	selectAndGo : function(server) {
		this.select(server);
		app.refresh();
	},

	toggleReporter : function(server) {
	
	},
	
	stopInstance : function(server) {
	
	},
	
	detachInstance : function(server) {
	
	}
	
});

gear6.MemcacheService.prototype.controller = MemcacheController;
gear6.MemcacheServer.prototype.controller = MemcacheController;



})(jQuery);	// end hidden from global scope
