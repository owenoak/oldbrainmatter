if (!window.Gear6) window.Gear6 = {};

var Mod = Gear6.Module = Class.create(
	DataWidget.createMasterWidget("BayMaster", "bay", "bays", "module", "Gear6.ModuleBay"),
{
	klass 				: "Gear6.Module",

	// data for the module
	data : {
		id 					: '1',
		state 				: 'master',
		address				: '10.2.3.4',
		name				: 'lb-cfx1-n1',
		totalRam			: 1,		// all:  DRAM total available (bytes)
		allocRam			: 0,		// all:  DRAM allocated (bytes)
		systemRam			: 0			// all:  DRAM in use by system processes? (bytes) 
										//			-- not currently sent on update
	},

	//
	// user messages and strings 
	//
	messages : {
		masterModule : "(master)"
	},
	
	
	//
	//	data normalization
	//
	

	// return all of the loaded MemcacheInstaces associated with this module
	getMemcacheInstances : function() {
		var instances = [];
		if (MemcacheService.Instances) {
			MemcacheService.Instances.forEach(function(service) {
				service.instances.forEach(function(instance) {
					if (instance.data.module == this.id) {
						instance.module = this;			// remember the module for sizing calculations
						instances.push(instance);
					}
				}, this);
			}, this);
		}
		return instances;
	},

	
	// Get aggregated stats for all flash drives curently online.
	//
	//	Sets:
	//		snapshot.totalFlash			// all:	 FLASH total available (bytes)
	//		snapshot.allocFlash			// all:	 FLASH allocated (bytes)
	//	
	aggregateFlashUsage : function(output) {
		if (!output) output = {};
		output.allocFlash = 0;
		output.totalFlash = 0;

		for (var i = 0, bay; bay = this.bays[i]; i++) {
			if (bay.data.status != "online" || bay.data.type != "cache device") continue;
			output.allocFlash += bay.data.allocBytes;
			output.totalFlash += bay.data.totalBytes;
		}
        // bug 4038; don't set totalFlash to 1 if there's no flash; leads to display errors.
        // just check totalFlash before dividing by it.
		// output.totalFlash = output.totalFlash || 1;		// avoid divide by 0 errors
		return output;
	},
	
	// get DRAM usage for graphs
	getDramUsage : function(output) {
		if (!output) output = {};
		output.dram = this.formatGraphData("dram", "DRAM", this.data.totalRam, this.data.allocRam, "bytes", 0);
		// note if we're overprovisioned
		if (output.dram.used > output.dram.total) {
			output.dram.message = "Overprovisioned";
			output.dram.errorClassName = "Critical";
		}
		return output;		
	},
	
	
	getFlashUsage : function(output) {
		if (!output) output = {};
		// calculate flash totals according to actual drive bays
		//	sets:  output.allocFlash  and   output.totalFlash
		this.aggregateFlashUsage(output);
		output.flash = this.formatGraphData("flash", "Flash", output.totalFlash, output.allocFlash, "bytes", 0);
		// note if we're overprovisioned
		if (output.flash.used > output.flash.total) {
			output.flash.message = "Overprovisioned";
			output.flash.errorClassName = "Critical";
		}
		return output;
	},

	// client-server operations
	operations : {
		"Gear6.Module.update" : {
			url : "/admin/launch?script=rh&template=get_mc_media_info",
			testUrl : "/test/data/appliance-media/update.js"
		}
	},

	updateOperation : "Gear6.Module.update"
});



// register the operations that we can perform
Page.registerOperations(Gear6.Module.prototype.operations);
Page.registerUpdateOperation(Gear6.Module.prototype.updateOperation);
