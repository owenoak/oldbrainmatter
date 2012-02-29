//
//	MemcacheServer data objects.
// 

(function($) {	// begin hidden from global scope

window.MS = window.MemcacheServer = new $.Class({
	reference 	: "gear6.MemcacheServer",
	collector	: "gear6.MemcacheServers",

	prototype : {
		// pointer to our service
		service		: undefined,
	
		//
		// actual instance properties
		//
		
		// (ip address)
		ip : undefined,
		
		// (number)
		port : undefined,
		
		// (string) Machine identifier for this server
		identifier : undefined,
		
		// (string) Id of the image used to create the service
		imageId : undefined,
		
		// (enum: i386|x86_64) Processor architecture of this server
		arch : undefined,
		
		// (string) Name of the 'type' of machine for this server.
		vendorType : undefined,
		
		// (enum: running|pending|shutting-down|terminated|error) Instance "machine" status
		status : "running",
		
		// (enum: active|leaving|joining|unreachable) state of the instance
		memcacheState : "active",
		
		// (enum: off|view|modify) reporting overall status for instances
		reporterStatus : "off",
		
		// (boolean) Is the memcache reporter on for this instance?
		reporterEnabled : undefined,
		
		// (bytes) Total memory for this instance
		memory : 0,
		
		// (bytes) Memory in use for this instance
		used : 0,
		
		// (bytes) Free memory for this instance
		free : 0,
		
		// (enum: enabled|disabled) true if actively rehashing
		rehashState : "disabled",
		
		// (number, only if actively rehashing) percent complete of rehash process
		rehashPercent : undefined,

		
		//
		//	special setters
		//
		
		//
		//	special getters
		//
		
		getIdentifier : function() {
			if (!this.id) this.id = $.string.toLegalId(this.ip + ":" + this.port);
			return this.id;
		},
		
		//
		getTitle : function() {
			if (ServiceController.config.mode === "cloud") {
				return this.ip;
			} else {
				return this.ip + ":" + this.port;
			}
		},

//REFACTOR: this doesn't seem to be used		
		getReporterStatus : function() {
			var globalReporterOff = ServiceController.config.reporter != "on";
			if (globalReporterOff) {
				return "disabled";
			} else if (this.reporter == "off") {
				return "false";
			} else if (this.reporter == "view") {
				return "true";
			}
		},
		
		getRehashMessage : function() {
			if (this.rehashState == "disabled") return "";
			return $.message("instance.rehash.title", this);
		},
		
		
		
		//
		//	event handlers
		//
		
		onSelect : function() {
			this.Class.notify("memcacheServerSelected", this);
		},
		
		onDeselect : function() {
			this.Class.notify("memcacheServerDeselected", this);
		}

	}	// end gear6.MemcacheServer.prototype

});


})(jQuery);	// end hidden from global scope
