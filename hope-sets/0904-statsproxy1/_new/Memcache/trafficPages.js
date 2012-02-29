

// create a TrafficPage for each dataSet we can show
new gear6.TrafficPage({
		id:"mc_traffic_composite",
		dataId:"composite",
		hash:"#memcache/traffic/overall/"
});

new gear6.TrafficPage({
		id:"mc_traffic_hits",
		dataId:"get_hits",
		hash:"#memcache/traffic/hits/"
});

new gear6.TrafficPage({
		id:"mc_traffic_misses",
		dataId:"get_misses",
		hash:"#memcache/traffic/misses/"
});

new gear6.TrafficPage({
		id:"mc_traffic_gets",
		dataId:"cmd_get",
		hash:"#memcache/traffic/gets/"
});

new gear6.TrafficPage({
		id:"mc_traffic_sets",
		dataId:"cmd_set",
		hash:"#memcache/traffic/sets/"
});

new gear6.TrafficPage({
		id:"mc_traffic_writes",
		dataId:"bytes_written",
		hash:"#memcache/traffic/writes/"
});

new gear6.TrafficPage({
		id:"mc_traffic_reads",
		dataId:"bytes_read",
		hash:"#memcache/traffic/reads/"
});

new gear6.TrafficPage({
		id:"mc_traffic_evictions",
		dataId:"evictions",
		hash:"#memcache/traffic/evictions/"
});

new gear6.TrafficPage({
		id:"mc_traffic_items",
		dataId:"curr_items",
		hash:"#memcache/traffic/items/"
});

new gear6.TrafficPage({
		id:"mc_traffic_connections",
		dataId:"curr_connections",
		hash:"#memcache/traffic/connections/"
});

new gear6.TrafficPage({
		id:"mc_traffic_structures",
		dataId:"connection_structures",
		hash:"#memcache/traffic/structures/"
});



// set the default page of the MemcacheController
StatsProxy.defaultPage = MemcacheController.defaultPage = gear6.TrafficPages.mc_traffic_composite;
