// -*- Mode: javascript; javascript-indent-level: 4; indent-tabs-mode: t -*-
if (!window.Gear6) window.Gear6 = {};

//
//	Generic model/view that shows a MemcacheService
//
// DEBUG:  alias "MS" for convenience while debugging
var MS = Gear6.MemcacheService = window.MemcacheService = Class.create(
	DataWidget.createMasterWidget("ServiceMaster", "instance", "instances", "service", 
								  "Gear6.MemcacheInstance", false),
{
	klass : "MemcacheService",

	data : {
		id 					: undefined,
		enabled 			: false,
		tcpPort 			: 11211,
		udpPort 			: 11211,
		threads 			: 16,
		ethernetInterface 	: "",
		accessList              : "",
		defaultMaskLen 		: 24,
		packageName 		: "memcached-gear6",
		replicationMode 	: "none",
		replicationState 	: "none",
		itemCountAuto 		: 'true',	// Gear6: is instanceItemCount figured automatically?
		flashBufferSizeAuto : 'true',		// Gear6: is instanceDram calculated automatically?
		itemSize 			: 200, 	// Gear6: alloc size of each item (bytes)

		// items
		instanceItemCount 	: 335544,	// Gear6: estimated # items/instance

		serviceItemCount 	: 209715200, 	// gear6: estimated # items for all instances
		serviceItemsUsed 	: 123456,	// gear6: actual number of items in use for all instances

		// memory
		instanceDramMB		: 1,		// all  : DRAM allocated per instance (MB)
		
		instanceMemSizeMB 	: 64,		// Gear6: FLASH allocated per instance (MB)
							// other: DRAM allocated per instance (MB)
		
		serviceTotalDramMB 	: 6.4,		// all  : DRAM allocated for all instances (MB)
		serviceDramMB 		: 6.4,		// all  : DRAM allocated for all instances (MB) (== serviceTotalDramMB)
		serviceDram 		: 10859053056,	// all	: DRAM allocated for all instances (bytes)
		
		serviceMemSize 		: 4444		// Gear6: FLASH allocated for all instances (MB)
	},

	// these are calculated in service.getDramOnlyInstances()
	dramOnlyCount			: 0,		// Gear6: number of dram-only instances of this service
	dramOnlyInstances 		: "",   	// Gear6: ip addresses of dram-only instances



	initialize : function($super, props) {
		$super(props);
		if (this.data && this.data.id == null && props.id != null) {
            this.data.id = props.id;
        }
	},


	onAfterDraw : function($super) {
		$super();
		// YUCK: breaks encapsulation to have this here
		//			but we can't do a $super() from one of the MemcacheService mixins yet
		this.showInstanceCountMessage();
	},

	onAfterRedraw : function($super) {
		$super();
		// YUCK: breaks encapsulation to have this here
		//			but we can't do a $super() from one of the MemcacheService mixins yet
		this.showInstanceCountMessage();
	},

	// stub -- override this in your view
	showInstanceMessage : function(message) {},

	// is this a gear6 package?
	isGear6Package : function() {
		return (this.data.packageName && this.data.packageName.indexOf("gear6") > -1);
	},
	// is there enough flash to turn on Gear6 features?
	isFlashEnabled : function() {
		return this.isGear6Package() && ((window.FlashMax || 0) > 0);
	},
		
	//
	//	special data setters -- called automatially by setData()
	//
	
	setId : function(id) {
		this.data.id = id;
		return (this.id = id);
	},

	setPackageName : function(packageName) {
		if (packageName != this.data.packageName) this.majorChange = true;
		return (this.data.packageName = packageName);
	},
	
	setReplicationState : function(replicationState) {
		if (replicationState != this.data.replicationState) this.majorChange = true;
		return (this.data.replicationState = replicationState);
	},
	
	getReplicationTitle : function() {
		if (this.data.replicationMode == "none" || this.data.replicationLicensed == false) {
			title = "No replication";	// TODO: from message
		} else {
			title = this.data.replicationState.capitalize();
		}
		return title;
	},
	
	
	setEnabled : function(enabled) {
		return (this.data.enabled = enabled);
	},
	
	
	
	//
	//	calculated data
	//


	// return a list of the IPs of instances that are DRAM only
	//	(eg: where instance.devAllocated == 0)
	getDramOnlyInstances : function() {
		var dramOnlyIps = [];
		this.instances.forEach(function(instance) {
			if (instance.data.devAllocated == 0) {
				dramOnlyIps.push(instance.data.ip);
			}
		});
		this.dramOnlyCount = dramOnlyIps.length;
		return (this.dramOnlyInstances = dramOnlyIps.join(", "));
	},

	// return true if we have:
	//		- at least one even IP address   AND
	//		- at least one odd IP address
	hasEvenAndOddInstances : function() {
		var evens = 0, odds = 0;
		
		this.instances.forEach(function(instance) {
			var address = instance.data.ip.split("."),
				isEven = (parseInt(address[3]) % 2) == 0
			;
			if (isEven) evens++;
			else		odds++;
		});
		return (evens > 0 && odds > 0);
	},
	
	
	//
	//	usage information for drawing graphs
	//
	
        ////////////////////////////////  DRAM USAGE //////////////////////////////
	
	getItemCount : function () {
		if (this.data.itemCountAuto == 'true') {
			count = this.data.instanceMemSizeMB * Math.MB / this.data.itemSize;
			this.data.instanceItemCount = Math.floor(Math.max(1, count).min(100 * Math.b));
		} else {
			this.data.instanceItemCount = Math.floor(this.data.instanceItemCount.max(1024).min(100 * Math.b));
		}
		return this.data.instanceItemCount;
	},
	
	getFlashBufferSize : function () {
		if (this.data.flashBufferSizeAuto == 'true') {
			this.data.serviceDramMB = 0.10 * this.data.instanceMemSizeMB;
		}
		// flash buffer must be less than instanceMemSizeMB
		if (this.data.serviceDramMB > this.data.instanceMemSizeMB) {
			this.data.serviceDramMB = this.data.instanceMemSizeMB;
		}
		return this.data.serviceDramMB;
	},
	
        // calculate estimated DRAM; this function must track the
        // gear6 memcached file memcache_sizes.cpp

	getEstimatedDRAM : function () {
            // [root@eng-builds memcached-gear6]# ./sizes
            // sizeof(item) = 56
            // sizeof(CacheMem::BlockMeta) = 56
            // sizeof(void *)= 8
            // sizeof(LargeObject)= 16
            // sizeof(LargeObjectSegment)= 16
            // sizeof(struct MemoryPoolMeta)= 56
            // sizeof(struct fileMeta)= 72
            // sizeof(conn) = 640
            // sizeof(item *)= 8
            // sizeof(char *)= 8
            // sizeof(struct iovec)= 16
            // sizeof(struct msghdr)= 56


		var buffer_cache_size = this.getFlashBufferSize() * Math.MB,
			item_count = this.getItemCount(),
			flash_size = this.data.instanceMemSizeMB * Math.MB,
            block_size = 4096
		;
		
        if (item_count == 0) { item_count = 1; }
		
        var avg_object_size = flash_size / item_count;
        var item_memory = 56 * item_count;

        var total = item_memory + buffer_cache_size;

        var total_memory_pool = flash_size + item_memory;

        var large_item_count = 0;
        if ((avg_object_size > 512) && (avg_object_size < 2048)) {
            large_item_count = item_count * (avg_object_size - 512) / (2048 - 512);
        } else if (avg_object_size >= 2048) {
            large_item_count = item_count;
        }   

        var cookie_overhead = 8 * (item_count + large_item_count);
        total += cookie_overhead;
        total_memory_pool += cookie_overhead;

        var large_object_overhead = large_item_count * (16 + 2 * 16);

        total += large_object_overhead; 
        total_memory_pool += large_object_overhead;

        total += ((total_memory_pool / block_size) * 56);

        total += (total / block_size) * 56;


        // Add in file metaData
        // nblocks (flash_size/block_size(4096)) * sizeof(struct fileMeta)(72)
        total += ( flash_size / block_size) * 72;

        // Add in connection structures etc.

        //    conn_buf = sizeof(conn)(640) +
        //            DATA_BUFFER_SIZE(2048) +
        //            DATA_BUFFER_SIZE +
        //            sizeof(item *)(8) * ITEM_LIST_INITIAL(200) +
        //            sizeof(char *)(8) * SUFFIX_LIST_INITIAL(20) +
        //            sizeof(struct iovec)(16) * IOV_LIST_INITIAL(400) +
        //            sizeof(struct msghdr)(56) * MSG_LIST_INITIAL(10);
        //    total += conn_buf * 2000;  // 2000 connections
        total += 2000 * (640 + 
                         2048 +
                         2048 +
                         (8 * 200) +
                         (8 * 20) + 
                         (16 * 400) +
                         (56 * 10));

        total += item_count * 2 / 5 * 8;
		return total;
	},

	

	// get usage info for the entire service
	getServiceDramUsage : function(precision) {
		// the dram graph here is 'flash buffer size' (used) vs 'item mgmt size' (free)
		return this.formatGraphData("dram", "DRAM", 
					    this.aggregateInstanceProperty("ramAllocated"), // total
					    this.data.serviceDram * this.instances.length,  // used
					    "bytes", precision);

	},
	getInstanceDramUsage : function(precision) {
		// the dram graph here is 'flash buffer size' (used) vs 'item mgmt size' (free)
		return this.formatGraphData("dram","DRAM",
            // this.instance.data.ramAllocated,
			(this.isGear6Package() && this.data.flashAllocSize != 0)?
		    	( this.getEstimatedDRAM()):(this.data.instanceMemSizeMB*Math.MB),
			this.data.serviceDram,
            "bytes", precision);
	},
	
        ////////////////////////////////  FLASH USAGE //////////////////////////////
	
	getServiceFlashUsage : function(precision) {
		return this.formatGraphData("flash", "Flash", 
									this.data.serviceMemSize * Math.MB,
									this.aggregateInstanceProperty("ramUsed"),
									"bytes", precision);
	},
	
	getInstanceFlashUsage : function(precision) {
        // If no flash is allocated because there are zero instances
        // defined, show the memsize param to indicate how much WOULD
        // be allocated if we had any instances.
        var flashsize = 0;
        var flashused = 0;
        if (this.instances.length == 0 || 
            this.instance == undefined || 
            this.instance.devAllocated == undefined) {
            flashsize = this.data.instanceMemSizeMB * Math.MB;
        } else {
            flashsize = this.instance.devAllocated;
        }
        if (this.instance != undefined) {
            flashused = (this.instance.flashUsed || 0);
        }
        var formattedGraphData =  this.formatGraphData("flash", "Flash",
                                    flashsize,
                                    flashused,
									"bytes", precision);
        return formattedGraphData;
	},
	
        ////////////////////////////////  ITEMS USAGE //////////////////////////////
	
	getServiceItemsUsage : function(precision) {
		return this.formatGraphData("items", "Item Count",
					    this.data.serviceItemCount,
					    this.data.serviceItemsUsed,
					    "integer", precision);
	},
	
	getInstanceItemsUsage : function(precision) {
		return this.formatGraphData("items", "Item Count",
					    this.data.instanceItemCount,
					    this.data.itemsUsed,  // ???
					    "integer", precision);
	},
	
	// get usage for the flash vs flash buffer vs item overhead 'thermometer'
	// NOTE: assumes getDramUsage() and getFlashUsage() have been called
	getMemoryUsage : function() {
            var snapshot = this.snapshot,
	      totalMemory = snapshot.service.flash.total + snapshot.service.dram.total
	      ;
	    return {
	        Total 	  	: totalMemory.toBytesString(2),
		FlashPercent  	: (snapshot.service.flash.total / totalMemory).toPercent(0,true).min(99.5) + "%",
		BufferPercent 	: (snapshot.service.dram.used / totalMemory).toPercent(0,true).max(0.25) + "%",
		OverheadPercent : (snapshot.service.dram.free / totalMemory).toPercent(0,true).max(0.25) + "%"
		};
	},
	
	aggregateInstanceProperty : function(property) 
        {
		var total = 0;
            this.instances.forEach
                (function(instance) {
                    if (instance.data[property]) {
                        total += instance.data[property];
                    }
		});
		return total;
	},
	
	
	//
	//	operations
	//

	operationPrefix : "MemcacheService.",
	operations : {
	
		//
		//	enable a service
		//
		'MemcacheService.enable' : {
			url			: '/admin/launch?script=rh&template=memcache&var_change=enable&var_service=#{target.id}',
			testUrl 	: '/test/data/memcache-new/enable?#{target.id}&',
			onSuccess  	: function(transaction, request) {
				var service = transaction.params.target;
				service.flashMessage(service.serviceEnableSucceeded);
				service.setData({enabled:true});
//				service.scheduleRedraw();
                page.update();
			}
		},

		//
		//	disable a service
		//
		'MemcacheService.disable' : {
			url			: '/admin/launch?script=rh&template=memcache&var_change=disable&var_service=#{target.id}',
			testUrl 	: '/test/data/memcache-new/disable?#{target.id}&',
			onSuccess  	: function(transaction, request) {
				var service = transaction.params.target;
				service.flashMessage(service.serviceDisableSucceeded);
				service.setData({enabled:false});
//				service.scheduleRedraw();
                page.update();
			}
		},

		//
		// delete a services
		//
		'MemcacheService.deleteService' : {
			url			: '/admin/launch?script=rh&template=memcache&var_change=delete-service&var_service=#{target.id}',
			testUrl 	: '/test/data/memcache-new/delete?#{target.id}&',

			parameters	: {
				'var_change'  : 'delete',
				'var_service' : '#{target.id}',
				'action10' : 'config-form-list',
				'd_row_sdfsd' : 'row_#{service.id}',
				'v_row_sdfsd' : '/memcache/config/service/#{target.id}',
				'c_row_sdfsd' : '-',
				'e_row_sdfsd' : 'false',
				'f_row_sdfsd' : 'on',
				'remove' : 'DELETE+SERVICES'
			},

			onSuccess : function(transaction, request) {
				var service = transaction.params.target;
				// the remove() call will be done after the message is hidden
				service.flashMessage(service.deleteServiceSucceeded, service.remove.bind(service));
			}
		},

		//
		//	save a new instance
		//
		'MemcacheService.saveInstance' : {
			url	   		: '/admin/launch?script=rh&template=memcache&var_change=saveinst&var_service=#{target.id}',
			testUrl 	: '/test/data/memcache-new/saveinst?#{target.id}&',
			parameters 	: {
				'action10' : 'config-form-list',
				'f_list_root' : '/memcache/config/service/#{target.id}/address',
				'f_list_index' : 'address',
				'f_list_children' : 'mask_len',
				'd_address' : 'Address',
				't_address' : 'ipv4addr',
				'c_address' : 'ipv4addr',
				'e_address' : 'true',
				'f_address' : '#{ip}',
				'd_mask_len' : 'Mask Len',
				't_mask_len' : 'uint8',
				'c_mask_len' : 'uint8',
				'e_mask_len' : 'true',
				'f_mask_len' : '#{mask}',
				'add' : 'Add Memcache Server'
			},
			onSuccess : function(transaction, request) {
				var service = transaction.params.target;
				BadVips.add(transaction.params.ip);

				service.hideNewInstanceForm();
				service.clearInstanceMessage();
				service.flashMessage(service.saveInstanceSucceded);
				service.dirtyInstances();

				page.update();
			}
		},

		//
		//	delete an instance
		//
		'MemcacheService.deleteInstance' : {
			url			: '/admin/launch?script=rh&template=memcache&var_change=deleteinst&var_service=#{target.id}',
			testUrl 	: '/test/data/memcache-new/deleteinst?#{server.id}/#{ip}&',
			parameters	: {
					// Note, to remove successfully, the v_ element MUST
					// start with v_row.
					// You are not expected to understand this.
					'var_change'	: 'deleteinst',
					'var_service'	: '#{target.id}',
					'var_inst'		: '#{instance.data.ip}',
					'action10'		: 'config-form-list',
					'd_row_addr'  	: 'Instance Address',
					'v_row_addr'  	: '/memcache/config/service/#{target.id}/address/#{instance.data.ip}',
					'c_row_addr'  	: '-',
					'e_row_addr'  	: 'false',
					'f_row_addr'  	: 'on',
					'remove'	  	: 'DELETE+INSTANCE'
			},

			onSuccess : function(transaction, request) {
				var service = transaction.params.target,
					instance = transaction.params.instance
				;
				BadVips.remove(instance.ip);

				service.flashMessage(service.deleteInstanceSucceeded);
				service.clearInstanceMessage();
				service.removeInstance(instance);
				service.dirtyInstances();
			}
		},

		//
		//	turn replication on
		//
		'MemcacheService.enableReplication' : {
			url			: '/admin/launch?script=rh&template=memcache&var_change=enablerepl&var_service=#{target.id}',
			testUrl 	: '/test/data/memcache-new/enablerepl',
			parameters	: {
				'action10' : 'config-form',
				'd_mode' : 'Mode',
				'n_mode' : '/memcache/config/service/#{target.id}/replication/mode',
				't_mode' : 'string',
				'c_mode' : 'string',
				'f_mode' : 'mirror',
				'apply' : 'Enable Replications'
			},

			// callback when the enable replication call SUCCEEDS
			onSuccess : function(transaction, request) {
				var service = transaction.params.target;
				service.flashMessage(service.enableReplicationSucceeded);
				service.dirtyInstances();
				page.update();
			},

			// callback when the enable replication call FAILS
			onFailure : function(transaction, request) {
				var service = transaction.params.target;
				service.flashMessage(message);
				service.dirtyInstances();
				page.update();
			}
		},


		//
		//	turn replication off
		//
		'MemcacheService.disableReplication' : {
			url			: '/admin/launch?script=rh&template=memcache&var_change=disablerepl&var_service=#{target.id}',
			testUrl 	: '/test/data/memcache-new/disablerepl',
			parameters	: {
				'action10' : 'config-form',
				'd_mode' : 'Mode',
				'n_mode' : '/memcache/config/service/#{target.id}/replication/mode',
				't_mode' : 'string',
				'c_mode' : 'string',
				'f_mode' : 'none',
				'apply' : 'Enable Replications'
			},

			// callback when the disable replication call SUCCEEDS
			onSuccess : function(transaction, request) {
				var service = transaction.params.target;
				service.flashMessage(service.disableReplicationSucceeded);
				service.dirtyInstances();
				page.update();
			},

			// callback when the disable replication call FAILS
			onFailure : function(transaction, request) {
				var service = transaction.params.target;
// TOCHECK
				service.flashMessage(message);
				service.dirtyInstances();
				page.update();
			}
		}
	}
}); 
//
// class methods/properties
//
Object.extend(Gear6.MemcacheService, 
{
	beginOperation : function(operationId, params) {
		if (this.operationPrefix) operationId = this.operationPrefix + operationId;
		if (!params) params = {};
		if (!params.target) params.target = this;
		return page.beginOperation(operationId, params);
	},

	operationPrefix : "MemcacheService.",
	updateOperation : 'MemcacheService.update',
	operations : {
		//
		//	update all services on the page
		//
		'MemcacheService.update' : {
			url			: '/admin/launch?script=rh&template=get_mc_service_info',
			testUrl 	: '/test/data/memcache-new/update',
			onSuccess	: function(transaction, request) {
//				var service = transaction.params.target;
// TOCHECK
//				service.showInstanceCountMessage();
			}
		},
		
		//
		//	save a new service
		//
		'MemcacheService.saveService' : {
            //			url			: '/admin/launch?script=rh&template=memcache-add',
			url			: '/admin/launch?script=rh&template=get_mc_service_info',
			testUrl		: '/test/data/memcache-new/saveservice'
		},

		//
		// get an IP address for a DNS name
		//
		'MemcacheService.resolveDNSForHost' : {
			url  			: '/admin/launch?script=rh&template=get-dns&var_name=#{hostname}',
			testUrl 		: '/test/data/memcache-new/resolveDNS.hostname?hostname=#{ip}',
			method			: 'GET',
			asynchronous	: false,
			evalJS 			: false
		},

		//
		// Get a hostname for an IP address
		//
		'MemcacheService.resolveDNSForAddress' : {
			url				: '/admin/launch?script=rh&template=get-dns&var_addr=#{address}',
			testUrl 		: '/test/data/memcache-new/resolveDNS.address?address=#{address}',
			method			: 'GET',
			asynchronous	: false,
			evalJS 			: false
		}
	}

});

//
// register the operations that we can perform
//
Page.registerUpdateOperation(MemcacheService.updateOperation);
Page.registerOperations(MemcacheService.operations);
Page.registerOperations(MemcacheService.prototype.operations);




// Bring up the editor with a 'new' item
// NOTE: We re-use the same anonymous service each time they ask to do a new edit.
//		 This avoids creating lots of spurious services, and also makes it so the
//		 second new instance they edit will come pre-seeded with the same values they
//		 gave to the first new instance.
MemcacheService.editNewItem = function() {
	if (MemcacheService._newItem == null) {
		MemcacheService._newItemSequence = 1;
		MemcacheService._newItem = new MemcacheService({
			anonymous   : true,			// don't add to MS.Instances list
			autoDraw	: false			// and don't draw automatically
		});
	}

	// give the instance a unique id
	var id = "service_"+MemcacheService._newItemSequence++;;
	MemcacheService._newItem.id = id;
	MemcacheService._newItem.data.id = id;
	MemcacheService.editor.open(MemcacheService._newItem, 'new');
}

//
//	list of virtual IPs that cannot be used for a new instance
//
    ;
var BadVips = (window.badvips || "").trim().split(" ");		// split returns an array

Object.extend(BadVips, {
	isBad : function(ip) {
		return this.indexOf(ip) != -1;
	},

	add : function(ip) {
		if (this.indexOf(ip) == -1) this.push(ip);
	},

	remove : function(ip) {
		var i = this.indexOf(ip);
		if (i != -1) this.splice(i, 1);
	}
});

//
// The stable networks for all interfaces
//
var StableNetworks = stable_networks;

var IPv4Masks = [
	'0.0.0.0',
	'128.0.0.0',	   '192.0.0.0',	      '224.0.0.0',	 '240.0.0.0',
	'248.0.0.0',	   '252.0.0.0',	      '254.0.0.0',	 '255.0.0.0',
	'255.128.0.0',	   '255.192.0.0',     '255.224.0.0',	 '255.240.0.0',
	'255.248.0.0',	   '255.252.0.0',     '255.254.0.0',	 '255.255.0.0',
	'255.255.128.0',   '255.255.192.0',   '255.255.224.0',   '255.255.240.0',
	'255.255.248.0',   '255.255.252.0',   '255.255.254.0',   '255.255.255.0',
	'255.255.255.128', '255.255.255.192', '255.255.255.224', '255.255.255.240',
	'255.255.255.248', '255.255.255.252', '255.255.255.254', '255.255.255.255'
];

Object.extend(StableNetworks, {
	isOk : function(ip, plen, ifname) {
		// Turn the dotted-decimal address string into a number.
		//
		var octets = ip.split(/\./g);
		var address = (parseInt(octets[0]) << 24) |
			(parseInt(octets[1]) << 16) |
			(parseInt(octets[2]) << 8) |
			parseInt(octets[3]);

		// Turn the masklen into a dotted-decimal address string,
		// then turn that into a number.
		//
		var maskstr = IPv4Masks[plen];
		octets = maskstr.split(/\./g);
		var mask = (parseInt(octets[0]) << 24) |
			(parseInt(octets[1]) << 16) |
			(parseInt(octets[2]) << 8) |
			parseInt(octets[3]);

		// Calculate the network and return if it the network
		// is in the stable network list for the interface.
		//
		var network = address & mask;
		return this[ifname].indexOf(network) != -1;
	}
});
