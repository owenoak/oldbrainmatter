//
//	MemcacheService data objects.
// 

(function($) {	// begin hidden from global scope

window.MemcacheService = new gear6.Service.subclass({
	reference	: "gear6.MemcacheService",
	collector 	: "gear6.MemcacheServices",

	Class : {
		// normalize a 'prototype' service object 
		//	(one that has been loaded but not instantiated)
		normalizePrototype : function(proto) {
			// make sure we have an array of servers
			proto.memcacheServer = $.list.toArray(proto.memcacheServer);
			
			// sort servers by ip
			$.list.sortBy(proto.memcacheServer, "ip");
			
			// name unnamed services with the ip of their first server
			proto._unnamed = (proto.name == null);
			if (proto._unnamed) {
				proto.name = proto.memcacheServer[0].ip;
			}
			proto._type = (proto._unnamed ? "Service" : "Pool");
			
			// get the architecture from that of the first instance
			//REFACTOR: make this a function?
			proto.arch = proto.memcacheServer[0].arch;
		}
	},
	
	prototype : {
		// each MemcacheService manages a list of MemcacheServers
		collection : {
			name		: "servers",
			type		: "server",
			selectonName: "selectedServer",
			itemClass 	: gear6.MemcacheServer
		},

		// are we a gear6 service?  Set in setPkg() below
		isGear6 : false,

		//
		// actual service properties
		//
	
		// (identifier, string, alphanumeric, dash or underscore only) name of the service
		name : undefined,
	
		// (enum: enabled|disabled) overall status of the service
		status : undefined,
		
		// (string, "gear6" indicates a gear6 service) memcached package name
		pkg : undefined,
	
		// (number) TCP port
		tcpPort : undefined,
	
		// (number) UDP port
		udpPort : undefined,
		
		// (date) service start time
		startDate : undefined,
	
	
		//
		// special setters
		//
		
		// munge reserved word "package" to "pkg"
		setPackage : function(pkg) {
			this.setPkg(pkg);
		},
		
		setPkg : function(pkg) {
			if (this.pkg != pkg) {
				this.isGear6 = (pkg||"").toLowerCase().indexOf("gear6") > -1;
				return this.pkg = pkg;
			}
		},
		
		// update our instances from an array of instance options
		setServers : function(item) {
			return this.setMemcacheServer(item);
		},
		setMemcacheServer : function(items) {
			// call updateOrCreate to turn the prototypical "items" into MemcacheServers
			this.updateOrCreate(items);

			this.servers.forEach(function(server) {
				server.service = this;
				server.isGear6 = this.isGear6;
			});
			// select the first server
			if (!this.selectedServer && this.servers.length) {
				this.servers.select(this.servers[0]);
			}
		},
		
		setStartDate : function(date) {
			if (typeof date === "string") date = $.date.parseISO8601(date);
			this.startDate = date;
		},
		
		
		//
		// custom getters
		//
		
		getTitle : function() {
			return $.message("service.memcache"+this._type+".title", this);
		}
		
	}	// end prototype
	
	
});	


})(jQuery);	// end hidden from global scope
