(function($) {	// begin hidden from global scope


//
//	MemcacheController Page selector
//
MemcacheController.pageSelector = new $.ListViewer({
	id 				: "memcachePageSelector",
	selectable		: true,
	observations 	: [
		// draw as soon as the message dictionary is loaded
		{target:$.message.Loader, event:"loaded", callback:"draw"},

		// create new ListItems when StatsPages and TrafficPages are created
		{target:gear6.StatsPage,   event:"createdItem", callback:"addStatsPage"},
		{target:gear6.TrafficPage, event:"createdItem", callback:"addTrafficPage"},

		// highlight the proper page when the MC selects it
		{target:StatsProxy, event:"showPage"},
		{target:StatsProxy, event:"hidePage"}
	],
	$parent : "#leftColumn",
	
	onSelect : function(item) {
		StatsProxy.select(item.page);
		app.refresh();
	},
	
	addStatsPage : function(page) {
		this.addItem(
			new $.ListItem({
				$parent : "#MemcacheStatsList",
				id : page.id,
				page : page,
				template : this.statsTemplate
			})
		);
	},
	
	addTrafficPage : function(page) {
		this.addItem(
			new $.ListItem({
				$parent : "#MemcacheTrafficList",
				id : page.id,
				page : page,
				template : this.trafficTemplate
			})
		);
	},
	
	
	onShowPage : function(page) {
		var item = this.items.byId(page.id);
		if (item) this.select(item);
	},
	
	onHidePage : function(page) {
		var item = this.items.byId(page.id);
		if (item) this.deselect(item);
	},
	
	
	template : "<div id='memcachePageSelector' class='ListViewer Section NOSELECT' style='display:none'>"
					+"<div class='Header'>#{message:page.header.statistics}</div>"
					+"<ul id='MemcacheStatsList' class='Container Body Inset'></ul>"
					+"<div class='Header'>#{message:page.header.traffic}</div>"
					+"<ul id='MemcacheTrafficList' class='Body Inset'></ul>"
			 + "</div>",
	
	statsTemplate 	: "<li class='Item StatsTableItem #{page.menuClassName} PageSelector' page='#{page.id}'>"
						+"<span class='Title'>#{page.getMenuTitle()}</span>"
					+ "</li>",
	
	trafficTemplate : "<li class='Item TrafficItem PageSelector' page='#{page.id}'>"
						+"<span class='ColorDisplay' style='background-color:#{page.getColor()}'></span>"
						+"<span class='Title'>#{page.getMenuTitle()}</span>"
					+ "</li>"
});


})(jQuery);	// end hidden from global scope
