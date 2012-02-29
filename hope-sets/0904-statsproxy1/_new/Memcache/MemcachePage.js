
(function($) {	// begin hidden from global scope

new $.Page.subclass({
	reference : "gear6.MemcachePage",
	prototype : {
		displayElements : ["#overview","#memcachePageSelector","#rightColumn"],
		controller : MemcacheController,
		isGear6Only : false,
		$parent : "#rightColumn",

		getHashInfo : function(hash) {
			var server;
			
			// figure out which server we're dealing with
			hash = hash.substr(this.hash.length).split("/");
			server = MemcacheServer.instances.get("getTitle", hash[0]);

			var page = this;
			if (server && !this.isValidForServer(server)) page = MemcacheController.defaultPage;

			return {server:server, page:page};	
		},

		getWindowTitle : function() {
			var service = SC.selection;
			var msgName = (service._unnamed ? "window.title.memcache.unnamedService"
											: "window.title.memcache.namedService");
			return $.message(msgName, this);
		},

		isValidForServer : function(server) {
			if (this.isGear6Only && server.isGear6 != true ) return false;
			return true;
		},
		
		onShown : function() {
			this.as($.Page, "shown", arguments);
			
			// show only the serviceView for the selected service
			$(".ServiceView").hide();
			$(".ServiceView[service="+SC.selection.getIdentifier()+"]").show();
			
			// highlight the proper PageSelector
			$(".PageSelector.HIGHLIGHT").removeClass("HIGHLIGHT");
			$(".PageSelector[page="+this.id+"]").addClass("HIGHLIGHT");
		},

		getHash			: function() {	return this.hash + MemcacheController.selection.getTitle()	},
		getTitle 		: function() {	return $.message("page.title."+this.id, this) },
		getMenuTitle	: function() {	return $.message("page.menu."+this.id, this) },
		
		template : "<div id='#{id}' class='#{className} Window INLINE' #{getAttributes()}>"
				 + "  <div class='Header NOSELECT'>"
				 + "    <table cellspacing=0 cellpadding=0><tr>"
				 + "      <td class='title'>#{getTitle()}</td>"
				 + "      <td class='label' style='padding:0px 5px;'>#{message:UI.forServer}</td>"
				 + "      <td>"
//				 + "        <div class='label ipLabel selectedMemcacheServer'>"
//				 + "           #{MemcacheController:selection.getTitle()}"
//				 + "        </div>"
				 + "        <button id='statsIpMenu' class='light MenuButton selectedMemcacheServer'"
				 + "          onmousedown='MC.serverMenu.showNear(this)'>"
				 + "			#{MemcacheController:selection.getTitle()}"
				 + "        </button>"
				 + "      </td>"
				 + "    </tr></table>"
				 + "  </div>"
				 + "  <div class='Body SQUARE Container'></div>"
				 + "</div>"
	
	}// end prototype
});	// end gear6.MemcachePage


})(jQuery);	// end hidden from global scope
