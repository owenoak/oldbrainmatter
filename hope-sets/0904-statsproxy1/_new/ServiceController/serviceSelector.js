//
//	service tabs (across the top)
//

(function($) {	// begin hidden from global scope


ServiceController.serviceSelector = new $.ButtonBar({
		$parent : "#serviceSelector",
		className : "ButtonBar dark short",
		observations : [
			// resize whenever the app resizes
			{target:app, event:"resize"},
			
			// draw when the messageLoader has loaded
			{target:$.message.Loader, event:"loaded", callback:"draw"}
		],
		
		select : function(button) {
			if (typeof button === "string") button = this.items.byId(button);
			// scroll so that the selected button is visible
			if (button !== this.overviewButton) this.showItem(button);

			this.as($.Selective, "select", [button]);
		},

	
		// a new service was created -- create a serviceSelector button for it
		onServiceCreated : function(service) {
			// create a serviceSelector button for the service
			var button = new $.Button({
				title : service.name,
				service : service,
				className : "ServiceSelector",
				attributes : "service='"+service.getIdentifier()+"'",
				onSelected : function() {
					ServiceController.select(service);
					app.refresh();
				}
			});
			SC.serviceSelector.addItem(button);
	
			// destroy us when the service goes away
			button.observe(service, "destroyed", function() {
				button.destroy();
			});
	
			//REFACTOR:  update button title when the service.name is changed
		}
	})

})(jQuery);	// end hidden from global scope
