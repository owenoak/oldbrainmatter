var Bay = Gear6.ModuleBay = Class.create(DataWidget, 
{
	klass 				: "Gear6.ModuleBay",
	operations : {
		"Gear6.ModuleBay.getDetails" : {
			url : "/admin/launch?script=rh&template=get_mc_media_info"
					+"&var_op=details&var_module=#{moduleId}&var_bay=#{bayId}",
			testUrl : "/test/data/appliance-media/baydetails.js?module=#{moduleId}&bay=#{bayId}"
		},
		"Gear6.ModuleBay.setEnable" : {
			url : "/admin/launch?script=rh"
                +"&template=get_mc_media_info"
                +"&var_op=setEnable&var_id=#{g6SerialNo}"
                +"&var_module=#{moduleId}"
                +"&var_enabled=#{enabled}"
                +"&var_bay=#{bayId}",
			testUrl : "/test/data/appliance-media/set_enable.js?module=#{moduleId}&bay=#{bayId}&var_enabled=#{enabled}"
		}	
	},
	
	data : {
		id				: "",
		name			: "Bay 1",
		enabled		 	: false,
		status			: 'online', // online, offline, error
		health			: 'ok',		 // ok, warning, critical
		type			: 'cache device',	// 'OS boot drive', 'cache device', 'OS var drive',
		g6Model		 	: 'Gear6 32GB Flash Drive',
	
		lifeRemain		: 100,
		allocBytes		: 0,
		totalBytes		: 1,
		readBytes		: 0,
		writeBytes		: 0,
	
		// currently unused
		blockSize	 	: 16384,
		deviceId		: 'scsi-SATA_SAMSUNG_MCBQE32SY836A3189',
		devicePath		: '/dev/disk/by-id/scsi-SATA_SAMSUNG_MCBQE32SY836A3189-part2',
		numBlocks	 	: 1945370,
		offset			: 7680,
		firmware		: 'VAC1303Q',
		g6PartNo		: '1120-00006',
		g6Revision		: 'A',
		g6SerialNo		: 'G6F1000025',
		mfrModel		: 'SAMSUNG MCBQE32G5MPQ-0VA03',
		mfrSerialNo		: 'SY836A3189'
	},
	
	//
	//	messages
	//
	messages : {
		emptyTitle 		: "(empty)",
		systemTitle		: "System Drive",
        unknownTitle    : "Unknown Drive",
		detailsTitle	: "#{snapshot.name} of module #{module.data.id} (#{module.data.name})",
		usage : {
            unknown     : "<b>Drive is unknown</b>",
			error		: "<b>Drive error</b>",
            offline		: "<b>Drive is offline</b>",
            disabled    : "<b>Drive is disabled</b>"
		}
	}
});


// register the operations that we can perform
Page.registerOperations(Gear6.ModuleBay.prototype.operations);
