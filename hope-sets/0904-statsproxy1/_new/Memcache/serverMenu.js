(function($) {	// begin hidden from global scope


//
// Menu of Memcache servers
//
MemcacheController.serverMenu = new $.Menu({
	id 				: "memcacheServerMenu",
	displaySelector : ".selectedMemcacheServer",
	
	onSelect : function(server) {
		MemcacheController.selectAndGo(server);
	},

	getDisplayHtml : function(server) {
		return server.getTitle();
	},

	getItemValue : function(server) {
		return server;
	},
	
	// custom drawItems to draw services enclosing the instances
	drawItems : function(container) {
		var menu = this;
		gear6.MemcacheService.forEach(function(service) {
			var serviceElement = $( $.expand(this.serviceTemplate, service) ),
				serviceBody = serviceElement.find(".Container")
			;
			service.forEach(function(server, index) {
				var serverElement = $( $.expand(this.serverTemplate, server) );
				if (server === this.selectedServer) serverElement.addClass("HIGHLIGHT");
				serverElement.click(function(event){menu.onItemClick(server)});
				serviceBody.append(serverElement);
			}, this);
			
			container.append(serviceElement);
		}, this);
	},

	serviceTemplate : "<div class='MenuGroup Memcache#{_type}'>"
						+"<span class='Header'><span class='hint'>#{getTitle()}</span></span>"
						+"<ul class='Inset Container'></ul>"
					+ "</div>",
						
	serverTemplate : "<li class='MenuItem' "
				   + "		onclick='MemcacheController.selectAndGo(#{getReference()})'>"
				   + "			#{getTitle()}"
				   + "</li>"
});



})(jQuery);	// end hidden from global scope
