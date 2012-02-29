var MI = Gear6.MemcacheInstance = Class.create(DataWidget,
{
	klass : "Gear6.MemcacheInstance",
	data : {
		// default properties
		ip 					: '10.3.6.236',
		hostname			: 'lb-berry-4.gear6.com' ,
		mask				: '22',
		module				:  1,
		mirrorState			: 'mirrored',
		showProgress		: false,
			
		ramAllocated		: 0,		// all  : DRAM allocated for this instance (bytes)
		devAllocated		: 0,		// Gear6: Flash allocated for this instance (bytes)
												
												// NOTE: for non-gear6, we don't know DRAM in use
	
		ramUsed				: 0,				// Gear6: FLASH used for this instance (bytes)
												// other: DRAM used for this instance (bytes)
		flashUsed			: 0,				// Gear6: Flash used for this instance (bytest)
	
			
		itemsUsed			: 1,				// Gear6: items in use for this instance
			
		remoteSet 			: 0,				// Gear6: number of sets performed for this instance
		remoteUpdate    	: 0,				// Gear6: number of updates performed for this instance
		remoteDelete    	: 0,				// Gear6: number of deletes performed for this instance

		syncItemsInitial	: 0,				// Gear6: mirrored only
		syncItemsAdded		: 0,				// Gear6: mirrored only
		syncItemsProcessed	: 0					// Gear6: mirrored only

	},

	service : undefined,						// link to service object for this instance

	messages : {},

	isGear6Package : function() {
		return this.service.isGear6Package();
	},
    isFlashEnabled : function() {
		return this.service.isFlashEnabled();
    },
	// get usage info for the entire service
	getDramUsage : function(precision) {
		if (this.isFlashEnabled()) {
			// the dram graph here is 'flash buffer size' (used) vs 'item mgmt size' (free)
			return this.formatGraphData("dram", "DRAM", 
										this.data.ramAllocated,
                                        this.service.data.serviceDram,									
										"bytes", precision);
		} else {
			// the dram graph here is actual used vs free for DRAM
			return this.formatGraphData("dram", "DRAM", 
										this.data.ramAllocated,
										this.data.ramUsed,
										"bytes", precision);
		}
	},
	
	getFlashUsage : function(precision) {
		if (!this.isFlashEnabled()) return undefined;
		
		return this.formatGraphData("flash", "Flash", 
                                    this.data.devAllocated,
									this.data.ramUsed,
									"bytes", precision);
	},
	
	getItemsUsage : function(precision) {
		if (!this.isFlashEnabled()) return undefined;

		return this.formatGraphData("items", "Item Count",
									this.service.data.instanceItemCount,
									this.data.itemsUsed,
									"integer", precision);
	}
});

