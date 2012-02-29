(function($) {	// begin hidden from global scope


window.MSV = new $.Window.subclass({
	reference : "gear6.MemcacheServiceView",
	collector : "gear6.MemcacheServiceViews",
	
	// create a new ServiceView every time a service is created
	observations : [
		{target:gear6.MemcacheService, event:"createdItem", callback:"onMemcacheServiceCreated"}
	],

	Class : {
		// create a summaryView for each service that is created
		onMemcacheServiceCreated : function(service) {
			service.summaryView = new this({service:service});
		}
	},
	prototype : {
		preferencePrefix : "MemcacheService-",
		
		getIdentifier : function() {
			return $.string.toLegalId(this.serviceName);
		},
		$parent : "#overview",
		
		onCreate : function() {
			this.draw();
		},
		
		// special setters
		setService : function(service) {
			if (this.service) this.ignore(this.service);
			
			this.service = service;
			this.serviceName = service.name;

			// observe the service's changed and destroy events
			this.observe(this.service, "changed", "onServiceChanged");
			this.observe(this.service, "destroyed", "onServiceDestroyed");
		},
	
		// The service was changed, change our display as well.
		//	deltas is an object of the values which actually changed.
		onServiceChanged : function(deltas) {
			console.debug(this, " onServiceChanged");
			console.dir(deltas);
		},
	
		// the service was destroyed -- get rid of us as well
		onServiceDestroyed : function() {
			this.destroy();
		},


        //! update the view for the service
        onDraw : function() {
        	var service = this.service;
        	
            //
            // massage service display data
            //
    
            // get HTML for each server
            this._serversHTML = "";
            this._rehashing = false;
            this._showPublicIps = false;
            this._serverIps = [];
	
			// usage graph
    		this._memory = 0;
    		this._used = 0;
    		this._free = 0;
    
            if (service.servers) {
                $.forEach(service.servers, function(server) {
					// server memory graph
					this._memory += server.memory || 0;
					this._used += server.used || 0;
					this._free += server.free || 0;

                	this._serverIps.push(server.ip);

                    // should we show the publicIP field for the server?
                    server._showPublicIp = (server.publicIp != null && server.publicIp != server.ip);

                    // should we show the entire column?
                	this._showPublicIps = this._showPublicIps || server._showPublicIp;
                
                    // get the server memory graph data
                    server.graph = $.number.formatMemoryGraph(
                                            server.memory, 
                                            server.free, 
                                            server.used, 
                                            $.message("instance.memoryGraph.label"), 
                                            $.message("instance.memoryGraph.hint")
                                        );
                    server._memcacheStateTitle = 
                        $.message("instance.memcacheState."+server.memcacheState) || server.memcacheState;
                    server._statusTitle =
                        $.message("instance.status."+server.status) || server.status;
                    
                    server._reporterTitle = this.getReporterTitle(server);
    
                    // get the 'info' for the server
                    //  we show this as a hover over the 'info' button
                    var infoItems = [
                        // start with identifier
                        {   name : $.message("instance.info.identifier.title"),     
                            value : server.getTitle() || (server.hostname + " (" + server.ip + ":" + server.port + ")")
                        }
                    ];
                    if (server.imageId) {
                        infoItems.push(
                            {   name : $.message("instance.info.imageId.title"),
                                value : server.imageId
                            }
                        );
                    }
                    if (server.vendorType) {
                        infoItems.push(
                            {   name : $.message("instance.info.vendorType.title"),
                                value : server.vendorType
                            }
                        );
                    }
                    // and add an entry for each server config item
                    if (server.config) {
                        for (var i = 0, config; config = server.config[i++];) {
                            var name = $.message("instance.info."+config.name+".title") 
                                        || config.name;
                            infoItems.push({name:name, value : config.value});
                        }
                    }
                    
                    // format the 'info' for display
                    // Note that we will eventually show this as a hover,
                    //  for now just formatting to go in a 'title' attribute, which is not as pretty.
                    var output = [];
                    for (var i = 0, item; item = infoItems[i++];) {
                        output.push("["+item.name + "|" + item.value + "]");
                    }
                    server._info = "["+output.join("")+"]";
                    
                    if (server.rehashState == "enabled") this._rehashing = true;
                    server._selected = (server == MemcacheController.selection ? "HIGHLIGHT" : "");
                    
                    // get the HTML for the server
                    server.html = $.string.interpolate($.templates.MemcacheServerTemplate, server);
                    this._serversHTML += server.html;
                }, this);	// end $.forEach
            }
    
    		this._serverIps = this._serverIps.join(",");
    
            this._serversHTML = $.string.interpolate($.templates.MemcacheServersTemplate, this);
    
            // set up the values for the 'messageType' selector
            if (SP.machineTypeMap) {
                var machineTypes = SC.machineTypeMap[service.arch];
                this._machineTypeOptions = "";
                $.each(machineTypes, function(index, type) {
                        this._machineTypeOptions += "<option value='"+type.vendorType+"'>"
                            + type._title
                            + "</option>\n";
                    });
            }
    
            // set up the service graph
            this._graph = $.number.formatMemoryGraph(
                                    this._memory, 
                                    this._free, 
                                    this._used, 
                                    $.message("service.memoryGraph.label"), 
                                    $.message("service.memoryGraph.hint")
                                );
    
		},
		
		onDrawn : function() {
            this.updateElements();
        },
    
        updateElements : function() {
			var service = this.service, view = this.$element;

			//REFACTOR: convert to classes and do in a single $.toggleClasses() call

			view.toggleClass("MemcachePool"   , service._type === "Pool");
			view.toggleClass("MemcacheService", service._type !== "Pool");

            view.attr("service", service.getIdentifier());
            view.attr("status", this.status);
            view.attr("rehashing", this._rehashing);
        	view.attr("showPublicIps", this._showPublicIps);
        	
            // update ALL of the html of ALL of the servers at once
            var windowBody = view.find(".Container");
            windowBody.html(this._serversHTML);

            view.find(".machineType").html(this._machineTypeOptions);
    
    		// add the Clippy element
    		if (this._lastServerIps != this._serverIps) {
    			// LAME -- have to hard-code color of window here...
    			var color = (this._type == "Pool" ?  "#6b8e00" : "#888888"),
    				clippyHTML = $.Clippy.getHTML(this._serverIps, color)
    			;
	    		view.find(".clippyContainer").html(clippyHTML);
	    		this._lastServerIps = this._serverIps
	    	}
    
            // update the dynamic parts of the service view
            $.string.updateParts(view.find("[part]"), this);
        },


		// initialize the correct form when a window is opened
		openDrawer : function(drawerName) {
			var form = this[drawerName];
			if (!form) {
				var formOptions = {
					serviceView 	: this,
					id				: this.getIdentifier(),
					service			: this.service,
					$parent 	: this.$element.find(".formContainer")
				}, form;
				
				switch (drawerName) {
					case "addServersForm" : 
						form = new ServiceController.AddServersForm(formOptions); break;

					case "renameServiceForm" : 
						form = new ServiceController.RenameServiceForm(formOptions); break;
				}
				this[drawerName] = form;
				form.draw();
			} else {
				form.updateElements();
			}
			
			this.as($.Window, "openDrawer", arguments);
            return false;
		},
		
		
		//
		// custom functions for drawing bits
		//
		serverCountMessage : function() {
			var msg = "service.serverCount" + (this.service.servers.length == 1 ? "1" : "N");
			return $.message(msg, this);
		},

        getReporterTitle : function(server) {
            var on = server.reporterEnabled == "true" || server.reporterEnabled == true;
            return $.message("instance.actions.reporter.title."+on);
        },
		
		template : "template:MemcacheServiceView",
	}	
});


})(jQuery);	// end hidden from global scope
