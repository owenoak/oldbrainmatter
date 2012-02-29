//REFACTOR:   this should maybe belong to StatsProxy, because we could have non-services in here???

(function($) {	// begin hidden from global scope

var overview = new $.Page({
	id : "overview",
	hash : "#service/overview",
	controller : ServiceController,
	displayElements : "#overview",
	
	observations : [
		{target:ServiceController, event:"activateService"},
		{target:ServiceController, event:"deactivateService"}
	],
	
	getWindowTitle : function() {
		return $.message("window.title.overview", this);
	},
	
	// show all services when we show
	onShown : function() {
		// show all of the serviceViews
		$(".ServiceView").show();
		
		// unhighlight all of the memcacheServers
		$(".MemcacheServer.HIGHLIGHT").removeClass("HIGHLIGHT");

		SC.serviceSelector.select(overviewButton);
	},
	
	// show all services
	showAll : function() {
		$(".ServiceView").show();
	}

});



// install a Button in the SC.serviceSelector to select the overview
var overviewButton = new $.Button({
	id : "overview",
	title : "Overview",
	page : $.Pages.overview,
	observations : [
		// update the button (and page) title when the message dictionary loads
		{target:$.message.Loader, event:"loaded", 
		 callback: function() { 
		 	overviewButton.title = overview.title = $.message("page.title.overview")
		 }
		}
	],
	onSelect : function() {
		app.select(this.page);
		app.refresh();
	}
});

ServiceController.serviceSelector.addItem(overviewButton);
ServiceController.serviceSelector.overviewButton = overviewButton;

})(jQuery);	// end hidden from global scope
