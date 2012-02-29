
var clientColumns = 
	[
		{	key:"rank",
			type : "number"
		},
		{	key:"hostname"	},
		{	key:"address",
			getValue : function(row) {
				return row.ip + ":" + row.port;
			}
		},
		{	key:"accesses",
			type : "number"
		},
		{
			key : "actions",
			type : "actions",
			getValue : function(row) {
				return this.getMessage("showTopKeys.title");
			}
		}
	],

	keysColumns = 
	[
		{	key:"rank",
			type : "number"
		},
		{	key:"value",
			maxLength : 32,
			type : "actions"
		},
		{	key:"gets",
			type : "number"
		},
		{	key:"sets",
			type : "number"
		},
		{	key:"all",
			type : "number"
		},
		{	key:"reads",
			type : "MB"
		},
		{	key:"writes",
			type : "MB"
		},
		{	key:"total",
			type : "MB"
		}
	]
;


//
//	Top Clients page
//
new gear6.StatsPage({
	id 				: "mc_stats_clients",
	dataId			: "clients",
	hash			: "#memcache/stats/clients/",
	applianceOnly	: true,
	menuClassName 	: "ifAppliance",

	onRefresh : function(requestQueue) {
		var request = new this.Loader({
			page : this
		});
		requestQueue.addRequest(request);
		
		if (this.selectedClient) {
			this.loadKeys(requestQueue);
		}
	},
	
	massageData : function(rawData) {
		this.items[0].data = $.list.toArray(rawData.client);
	},
	
	items : [
		new $.DataTable({
			id : "mc_stats_clients",
			columns : clientColumns,
			rowClassName	: "client",
			messagePrefix	: "client",
			isClickable : true,
			onRowClick : function(row) {
				var client = this.data[row].ip + ":" + this.data[row].port;
				this.container.showKeysForClient(client);
			}
		}),
		
		new $.DataTable({
			id : "mc_stats_keysForClient",
			columns : keysColumns,
			rowClassName	: "key",
			messagePrefix	: "key",
			$parent : "#rightColumn",
			showAsWindow : true,
			windowStyle : "display:none"
		})
	],

	onShown : function() {
		this.highlightSelection();
		$("#mc_stats_keysForClient").toggle(this.selectedClient != null);
	},

	onHidden : function() {
		delete this.selectedClient;
		this.itemMap.mc_stats_clients.selectRow(-1);
	},
	
	// highlight the appropriate row if a client is seleted
	highlightSelection : function() {
		if (this.selectedClient) {
			var rowNum = this.getClientRow(this.selectedClient);
			this.itemMap.mc_stats_clients.selectRow(rowNum);
		}
	},

	getClientRow : function(client) {
		return $.list.indexByProperty(
						this.itemMap.mc_stats_clients.data,
						function() {
							return this.ip + ":" + this.port
						}, client);
	},

	showKeysForClient : function(client) {
		this.selectedClient = client;
		this.highlightSelection();
		this.loadKeys();
	},
	
	loadKeys : function(requestQueue) {
		if (!this.selectedClient) return;
		var params = {
						client : this.selectedClient,
						server : MemcacheController.selection.getTitle()
					},//REFACTOR:
			url = $.expand("/api/MemcacheServer/latest/#{server}/stats/keys/client/#{client}", params)
		;

		var keysTable = this.itemMap.mc_stats_keysForClient,
			loader = new gear6.MemcacheController.MemcacheStatsLoader({
						url : url,
						onSuccess : function(rawData) {
							keysTable.data = $.list.toArray(rawData.memcachedKeys.key);
							keysTable.draw();
							keysTable.$element.show();
						},
					})
		;
		keysTable.client = this.selectedClient;
		
		// if we were passed a requestQueue, stick our loader in there
		if (requestQueue) {
			requestQueue.addRequest(loader);
		}
		// otherwise just execute the request immediately
		else {
			loader.execute();
		}
	}

			
});


//
//	Top Keys page
//
new gear6.StatsPage({
	id 				: "mc_stats_keys",
	dataId			: "keys",
	hash			: "#memcache/stats/keys/",
	applianceOnly	: true,
	menuClassName 	: "ifAppliance",

	massageData : function(rawData) {
		this.items[0].data = $.list.toArray(rawData.key);
	},

	items : [
		new $.DataTable({
			id : "mc_stats_keys",
			columns : keysColumns,
			rowClassName	: "key",
			messagePrefix	: "key",
			isClickable : true,
			onRowClick : function(row) {
				var key = this.data[row].value;
				this.container.showClientsForKey(key);
			}
		}),
		
		new $.DataTable({
			id : "mc_stats_clientsForKey",
			columns : clientColumns,
			rowClassName	: "client",
			messagePrefix	: "client",
			$parent : "#rightColumn",
			showAsWindow : true,
			windowStyle : "display:none"
		})
	],

	show : function() {
		this.as(gear6.StatsPage, "show", arguments);
		this.highlightSelection();
		$("#mc_stats_clientsForKey").toggle(this.selectedKey != null);
	},

	hide : function() {
		this.as(gear6.MemcachePage, "hide", arguments);
		delete this.selectedKey;
		this.itemMap.mc_stats_keys.selectRow(-1);
	},

	onRefresh : function(requestQueue) {
		var request = new this.Loader({
			page : this
		});
		requestQueue.addRequest(request);
		
		if (this.selectedKey) {
			this.loadClients(requestQueue);
		}
	},

	getKeyRow : function(key) {
		return $.list.indexByProperty(this.itemMap.mc_stats_keys.data, "value", key);
	},

	highlightSelection : function() {
		// highlight the appropriate row in the list of a key is selected
		if (this.selectedKey) {
			var rowNum = this.getKeyRow(this.selectedKey);
			this.itemMap.mc_stats_keys.selectRow(rowNum);
		}
	},
	
	showClientsForKey : function(key) {
		this.selectedKey = key;
		this.highlightSelection();
		this.loadClients();
	},
	
	loadClients : function(requestQueue) {
		if (!this.selectedKey) return;
		var params = {
						key : $.string.toSmartBase64(this.selectedKey),
						server : MemcacheController.selection.getTitle()
					},
			url = $.expand("/api/MemcacheServer/latest/#{server}/stats/clients/key/#{key}", params)
		;

		var clientsTable = this.itemMap.mc_stats_clientsForKey,
			loader = new gear6.MemcacheController.MemcacheStatsLoader({
						url : url,
						onSuccess : function(rawData) {
							clientsTable.data = $.list.toArray(rawData.memcachedClients.client);
							clientsTable.draw();
							clientsTable.$element.show();
						},
					})
		;
		clientsTable.key = $.string.truncate(this.selectedKey, 32);
		
		// if we were passed a requestQueue, stick our loader in there
		if (requestQueue) {
			requestQueue.addRequest(loader);
		}
		// otherwise just execute the request immediately
		else {
			loader.execute();
		}
	}
	
});

new gear6.StatsPage({
	id 				: "mc_stats_basic",
	dataId			: "basic",
	hash			: "#memcache/stats/basic/",

	items : [
		new $.KeyValueTable ({
			id : "mc_stats_basic",
			doubleUp : true
		})
	]
});

new gear6.StatsPage({
	id 				: "mc_stats_items",
	dataId			: "items",
	hash			: "#memcache/stats/items/",
	
	// break the individual 'stats' into sets of 'items'
	massageData : function(rawData) {
		this.data = [];
		var map = {};
		// parse key of:  "items":<id>:<property> into objects
		$.forEach(rawData.stat, function(stat) {
			var key = stat.key.split(":"),
				id = parseInt(key[1]),
				property = key[2]
			;
			if (!map[id]) {
				map[id] = { id : id };
				this.data.push(map[id]);
			}
			map[id][property] = stat.value;
		}, this);

		// assign to the viewer
		this.items[0].data = this.data;
	},
	
	items : [
		new $.DataTable ({
			id : "mc_stats_items",
			columns : [
				{	key:"id",
					isSortable : true,
					type : "number"
				},
				{	key:"number",
					isSortable : true,
					type : "number"
				},
				{	key:"age",
					isSortable : true,
					type : "number"
				},
				{	key:"evicted",
					isSortable : true,
					type : "number"
				},
				{	key:"evicted_time",
					isSortable : true,
					showIf : MemcacheController.isGear6,
					type : "number"
				},
				{	key:"outofmemory",
					isSortable : true,
					type : "number"
				},
				{	key:"tailrepairs",
					isSortable : true,
					showIf : MemcacheController.isGear6,
					type : "number"
				}
			]
		})
	]
});

new gear6.StatsPage({
	id 				: "mc_stats_slabs",
	dataId			: "slabs",
	hash			: "#memcache/stats/slabs/",
	isGear6Only		: true,
	menuClassName 	: "ifGear6",
	
	// break the individual 'stats' into sets of 'slabs'
	massageData : function(rawData) {
		this.data = [];
		var map = {};
		// parse key of:  <id>:<property> into objects
		$.forEach(rawData.stat, function(stat) {
			var key = stat.key.split(":"),
				id = parseInt(key[0]),
				property = key[1]
			;
			if (!map[id]) {
				map[id] = { id : id };
				this.data.push(map[id]);
			}
			map[id][property] = stat.value;
		}, this);

		// assign to the viewer
		this.items[0].data = this.data;
	},
	
	items : [
		new $.DataTable ({
			id : "mc_stats_slabs",
			columns : [
				{	key:"id",
					isSortable : true,
					type : "number"
				},
				{	key:"name",
					showIf : MemcacheController.isGear6,
					isSortable : true
				},
				{	key:"chunk_size",
					isSortable : true,
					type : "number"
				},
				{	key:"chunks_per_slab",
					isSortable : true,
					type : "number"
				},
				{	key:"total_slabs",
					isSortable : true,
					type : "number"
				},
				{	key:"total_chunks",
					isSortable : true,
					type : "number"
				},
				{	key:"used_chunks",
					isSortable : true,
					type : "percent",
					totalKey : "total_chunks"
				},
				{	key:"free_chunks",
					isSortable : true,
					type : "percent",
					totalKey : "total_chunks"
				}
			]
		})
	]
});

new gear6.StatsPage({
	id 				: "mc_stats_memory",
	dataId			: "memory",
	hash			: "#memcache/stats/memory/",
	isGear6Only		: true,
	menuClassName 	: "ifGear6",
	
	// split the rawData into two sets: normal key/value data and "memory" objects
	massageData : function(rawData) {
		this.stats = [];
		this.memory = [];
		var map = {};
		
		$.forEach(rawData.stat, function(stat) {
			var key = stat.key.split(":");
			if (key.length === 1 || key[0] == "malloc") {
				this.stats.push(stat);
				return;
			}
			
			var	id = parseInt(key[0]),
				property = key[1]
			;
			if (!map[id]) {
				map[id] = { id : id };
				this.memory.push(map[id]);
			}
			map[id][property] = stat.value;
		}, this);

		// assign to the viewer
		this.items[0].data = this.stats;
		this.items[1].data = this.memory;
	},
	
	items : [
		new $.KeyValueTable ({
			id : "mc_stats_memory"
		}),

		new $.DataTable ({
			id : "mc_stats_memory2",
			$parent : "#rightColumn",
			showAsWindow : true,
			columns : [
				{	key:"name",
					isSortable : true
				},
				{	key:"bytes",
					isSortable : true,
					type : "number"
				},
				{	key:"evictions",
					isSortable : true,
					type : "number"
				}
			]
		})
	]
});

new gear6.StatsPage({
	id 				: "mc_stats_replication",
	dataId			: "replication",
	hash			: "#memcache/stats/replication/",
	isGear6Only		: true,
	menuClassName 	: "ifGear6",
	items : [
		new $.KeyValueTable ({
			id : "replicationStatsViewer"
		}),
	]
});

new gear6.StatsPage({
	id 				: "mc_stats_storage",
	dataId			: "storage",
	hash			: "#memcache/stats/storage/",
	isGear6Only		: true,
	hasStorageOnly	: true,
	menuClassName 	: "ifGear6 ifHasStorage",
	
	// break the individual 'stats' into sets of 'storage' objects
	massageData : function(rawData) {
		this.data = [];
		var map = {};
		// parse key of:  <id>:<property> into objects
		$.forEach(rawData.stat, function(stat) {
			var key = stat.key.split(":"),
				id = parseInt(key[0]),
				property = key[1]
			;
			// if not a split key, forget it
			//REFACTOR: show a second table?
			if (key.length === 1) return;
			
			if (!map[id]) {
				map[id] = { id : id };
			}
			map[id][property] = stat.value;
		}, this);

		// skip everything that's not a linux device
		//	(unix device names start with "/dev/")
		for (var key in map) {
			var item = map[key];
			if (/^\/dev\//.exec(item.name)) this.data.push(item);
		}

		// assign to the viewer
		this.items[0].data = this.data;
	},
	
	items : [
		new $.DataTable ({
			id : "slabsStatsViewer",
			columns : [
				{	key:"id",
					isSortable : true,
					type : "number"
				},
				{	key:"name",
					isSortable : true,
					maxLength : 16
				},
				{	key:"total_bytes",
					isSortable : true,
					type : "bytes"
				},
				{	key:"total_in_use",
					isSortable : true,
					type : "bytesPercent",
					totalKey : "total_bytes"
				},
				{	key:"dirty_data",
					isSortable : true,
					type : "bytesPercent",
					totalKey : "total_bytes"
				},
				{	key:"bytes_read",
					isSortable : true,
					type : "bytes"
				},
				{	key:"read_MBPS",
					isSortable : true,
					type : "bytes"
				},
				{	key:"bytes_written",
					isSortable : true,
					type : "bytes"
				},
				{	key:"write_MBPS",
					isSortable : true,
					type : "bytes"
				},
				{	key:"eff_write_MBPS",
					isSortable : true,
					type : "percent",
					totalKey : "write_MBPS"
				},
				{	key:"average_write_size",
					isSortable : true,
					type : "bytes"
				},
				{	key:"write_idle_percentage",
					isSortable : true,
					type : "number"
				},
				{	key:"evictions",
					isSortable : true,
					type : "number"
				},
				{	key:"total_lock",
					isSortable : true,
					type : "number"
				}
			]
		})
	]
});

new gear6.StatsPage({
	id 				: "mc_stats_health",
	dataId			: "health",
	hash			: "#memcache/stats/health/",
	isGear6Only		: true,
	menuClassName 	: "ifGear6",

	items : [
		new $.KeyValueTable ({
			id : "healthStatsViewer"
		})
	]
});



