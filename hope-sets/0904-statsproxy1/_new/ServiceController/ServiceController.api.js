//
//	ServiceController API
// 

(function($) {	// begin hidden from global scope

// Load the application configuration info.
new $.Request.subclass({
	reference : "gear6.ServiceController.ConfigLoader",
	prototype : {
		url			: "api/ServiceController/latest/config",
		
		onSuccess	: function(replyData) {
			// update ServiceController.config with the array of <config> elements passed in
			var deltas = $.xml.updateConfig(ServiceController.config, replyData.configuration.config);

			// notify anyone who cares that the configuration has changed
			if (deltas) ServiceController.notify("configChanged", deltas);
		},
		
		onError	: function() {
			this.showErrors();
		}
	}
});


//  Change authorization level -- use ServiceController.setRole() to access
new $.Request.subclass({
	reference : "gear6.ServiceController.RoleChanger",
	prototype : {
	    url: "api/ServiceController/latest/authorize/#{currentRole}/#{newRole}/#{password}",
		getUrl : function() {
			// encode the password with md5
			if (this.inputData.password) this.inputData.password = hex_md5(this.inputData.password)
			return this.as($.Request, "getUrl");
		}
	}
});



//  Create one or more new servers for a service. 
// 	Register custom onSuccess and onError handlers to process the response.
new $.Request.subclass({
	reference : "gear6.ServiceController.CreateServiceRequest",
	prototype : {
		url 			: "api/ServiceController/latest/create-servers",
		inputTemplate	: 	 "	<data>"
							+"		<service>#{service}</service>"
							+"		<count>#{count}</count>"
							+"		<imageId>#{imageId}</imageId>"
							+"		<vendorType>#{vendorType}</vendorType>"
							+"	</data>",


		onSuccess : function(replyData) {
			$.Notifier.flash($.message("api.createServers.success", this.data));
			// force a reload
			SP.refresh();
		},

		onError : function(errors) {
			$.Notifier.hide();
			$.Notifier.flash(errors);
		}
	}
});
	


//  Attach IPs to a service. 
// 	Register custom onSuccess and onError handlers to process the response.
new $.Request.subclass({
	reference : "gear6.ServiceController.AttachIpsRequest",
	prototype : {
		url				: "api/ServiceController/latest/attach",
		inputTemplate	: "	<data>"
						+ "		<service>#{service}</service>"
						+ "		<ips>#{ips}</ips>"
						+ "	</data>",

		onSuccess : function(replyData) {
			$.Notifier.flash($.message("api.attachIps.success", this.data));
			// force a reload
			SP.refresh();
		},
	
		onError : function(errors) {
			$.Notifier.hide();
			$.Notifier.flash(errors);
		}
	}
});


//  DEtach IPs to a service. 
// 	Register custom onSuccess and onError handlers to process the response.
new $.Request.subclass({
	reference : "gear6.ServiceController.DetachIpsRequest",
	prototype : {
		url				: "api/ServiceController/latest/detach",
		inputTemplate	: "	<data>"
						+ "		<service>#{service}</service>"
						+ "		<ips>#{ips}</ips>"
						+ "	</data>",

		onSuccess : function(replyData) {
			$.Notifier.flash($.message("api.detachIps.success", this.data));
			// force a reload
			SP.refresh();
		},
	
		onError : function(errors) {
			$.Notifier.hide();
			$.Notifier.flash(errors);
		}
	}
});



	
//  Rename a service. 
// 	Updates the serviceView when done.
new $.Request.subclass({
	reference : "gear6.ServiceController.RenameServiceRequest",
	prototype : {
		url				: "api/ServiceController/latest/rename",
		inputTemplate	: "	<data>"
						+ "		<oldname>#{oldName}</oldname>"
						+ "		<newname>#{newName}</newname>"
						+ "	</data>",


		onSuccess : function(replyData) {
			$.Notifier.flash($.message("api.renameService.success", this.data));

			// rename the service on the client
			ServiceController.renameService(service, this.data.newname);
	
			// force a reload
			SP.refresh();
		},
	
		onError : function(errors) {
			$.Notifier.flash(errors);
		}
	}
});
	

//  Stop one or more instances.
// 	Forces a reload when done.
new $.Request.subclass({
	reference : "gear6.ServiceController.StopInstancesRequest",
	prototype : {
		url			: "api/ServiceController/latest/stop/#{ips}",
//REFACTOR:	var subs = { ips : ips.join(","), count : ips.length };

		onSuccess : function(replyData) {
			$.Notifier.flash($.message("api.stopInstances.success", this.data));
	
			// force a reload
			SP.refresh();
		}
	}
});


//  Load the possible machine types for this environment.
new $.Request.subclass({
	reference : "gear6.ServiceController.MachineTypesLoader",
	prototype : {
		url 		: "api/ServiceController/latest/machine-types",
		
		// Process the results.
		onSuccess : function(data, status) {
			SC.machineTypes = data.machineType || [];
			if (! (SC.machineTypes instanceof Array) ) SC.machineTypes = [SC.machineTypes];
			
			// make a map of arch -> machineTypes
			SC.machineTypeMap = {};
			$.forEach(SC.machineTypes, function(type) {
				var arch = type.arch;
				if (!SC.machineTypeMap[arch]) SC.machineTypeMap[arch] = [];
				SC.machineTypeMap[arch].push(type);

				// figure out the titles for each type
				// TODO: is this really * 1024?
				type._memSize = $.number.toBytesString(parseInt(type.memSize) * 1024);
				type._title = $.message("service.machineType.title", type);
			});
		},
		
		// Something went wrong loading the machine types.
		onError : function(errors) {
			$.Notifier.showError(errors);
		}
	}
});


})(jQuery);	// end hidden from global scope
