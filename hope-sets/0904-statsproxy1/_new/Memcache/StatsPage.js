
(function($) {	// begin hidden from global scope


//
// Pages for the Memcache service
//
new gear6.MemcachePage.subclass({
	reference : "gear6.StatsPage",
	prototype : {
		className : "StatsWindow",
		Loader : gear6.MemcacheController.MemcacheStatsLoader,

		massageData : function(rawData) {
			this.items[0].data = rawData.stat;
		},

		update : function(rawData) {
			this.massageData(rawData);
			this.items.forEach(function(item) {
				item.draw();
			});
		}
	}
});



})(jQuery);	// end hidden from global scope
