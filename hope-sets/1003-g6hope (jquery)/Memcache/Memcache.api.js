/* 
 *	Statsproxy client-server API.  
 *  All rights reserved.
 *
 */
// Copyright (c) 2009-2010, Gear Six, Inc.  Subject to a BSD-style
// license whose text is available at /license.txt on this machine




//
//	MemcacheServer API
//

// Load and update the list of MemcacheServices and their MemcacheServers.
new $.Request.subclass({
	reference : "gear6.MemcacheController.ConfigLoader",
	prototype : {
		url			: "api/MemcacheServer/latest/config/mc-config",	//REFACTOR
		
		onSuccess	: function(data) {
			// update the list of services and instances
			var prototypes = $.list.toArray(data.memcacheServices.memcacheService);
			
			// normalize the prototypes
			$.forEach(prototypes, function(prototype) {
				MemcacheService.normalizePrototype(prototype);
			});
			
			// sort the prototypes by name
			$.list.sortBy(prototypes, "name");
			
			// and update or create them as full MemcacheServices
			gear6.MemcacheService.updateOrCreate(prototypes);
		},
		
		onError	: function() {
//REFACTOR:  check for an "invalid-service" method, which turns MemcacheService off?
			this.showErrors();
		}
	}
});



new $.Request.subclass({
	reference : "gear6.MemcacheController.MemcacheStatsLoader",
	prototype : {
		url : "api/MemcacheServer/latest/#{MemcacheController:selection.getTitle()}/stats/#{page.dataId}",
		onSuccess : function(data) {
			// SLIGHTLY HACKY...
			data = data.memcachedStats || data.memcachedClients || data.memcachedKeys;
//REFACTOR	SP.updateChrome(data);
			this.page.update(data);
		}
	}	// end prototype
});


new $.Request.subclass({
	reference : "gear6.MemcacheController.MemcacheTrafficLoader",
	prototype : {
		url : "api/MemcacheServer/latest/#{MemcacheController:selection.getTitle()}/data/#{page.dataId}"
					+"?start=#{page.getStart()}"
					+"&end=#{page.getEnd()}"
					+"&samples=#{page.getSamples()}",
		onSuccess : function(data) {
			data = data.memcachedData;
//REFACTOR	SP.updateChrome(data);
			this.page.update(data);
		}
	}	// end prototype
});

	

//  Start or stop reporting for an instance. 
// 	Updates the instanceView inline when done.  (Does NOT reload).
new $.Request.subclass({
	reference : "gear6.MemcacheController.ToggleReporterRequest",
	prototype : {
		url			: "api/MemcacheServer/latest/config/instance/#{ip}:#{port}/#{operation}-reporting",
		ajaxOptions	: {
			type 		: "GET",
            dataType	: "xml"
		},
		
		onSuccess : function(replyData) {
			var operation = this.data.operation;
			
			// show the appropriate message
			var message = (operation == "start" 
								? "api.startReporter.success" 
								: "api.stopReporter.success"
						);
	
			$.notifier.flash($.message(message, this.data));
	
			// update the instance in memory
			MemcacheController.onReporterToggle(operation, this.data.server);
		}
	}
});

