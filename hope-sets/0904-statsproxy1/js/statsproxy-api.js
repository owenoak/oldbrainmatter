/* 
 *	Statsproxy client-server API.  
 *  All rights reserved.
 *
 */
// Copyright (c) 2009-2010, Gear Six, Inc.  Subject to a BSD-style
// license whose text is available at /license.txt on this machine


/** OVERRIDE the default onError handler to flash the error message. */
$.api.defaults.onError = function(callParams, errorMessages) {
	console.log("Error loading '"+callParams.url+"'");
	console.log(callParams, errorMessages);
	$.notifier.flashError(errorMessages);
}

/** OVERRIDE $.api._allCallsCompleted() to start the refresh timer again. */
$.api._allCallsCompleted = function() {
	SP.startRefreshTimer();
}



/** Load the message file for the app. 
	Performs message substitutions in the HTML and initializes views when completed.
	
	Call as:  	$.api.loadMessageFile();
*/
$.api.register("loadMessageFile", 
	{
		url 		: "lang/messages.en.txt",
		ajaxOptions : {
			dataType	: "text",
			cache		: false
		},
		
		onSuccess : function(textData) {
			$.message.processMessageFile(textData);
			$.string.getPageTemplates();
			SP.initViews();
		}
	}
);
	
	
/** Load (or re-load) the main application config file. 
	Updates configuration and serviceList, then reloads the current view when loaded.
	
	Call as:  	$.api.loadAppConfig();
*/
$.api.register("loadAppConfig", 
	{

		url 		: "api/MemcacheServer/latest/config",
		
		/** The config file has finished loading -- process the results. */
		onSuccess : function(configRoot, status) {
			// our serviceConfig object will be the JSONified memcacheConfig object from the file.
			SP.serviceConfig = configRoot.memcacheConfig;
			
			// set up the config data
			SP.updateConfiguration(SP.serviceConfig);
	
			// update the list of services and instances
			SP.updateServiceList(SP.serviceConfig);
	
			// load the query contained in the hash 
			if (SP.config.role != "none") SP.loadFromHash();
			
			$.notifier.hide();
		},
		
		/* Something went wrong loading the config -- show a generic error. 
			TODO: do something smarter here...
		*/
		onError : function(callParams, errorMessages, service, view, data) {
			$.notifier.showError(errorMessages);
		}
	}
);


/** Load stats or traffic data for a particular view. 
	Updates the view with the new data when loaded.
	
	Call as:  	$.api.loadData(view, url);
*/
$.api.register("loadData", 
    {
		// note: URL for will be supplied to execute() below
		callAs : function(view, url) {
			$.api.call("loadData", 
				{	
					substitutions : view,
					url : url,
					onSuccess : function(data){ 
						// actual data we process is the first child of data
						for (var key in data) {
							data = data[key];
							break;
						}
						SP.updateChrome(data);
						$.notifier.hide();
						view.onLoadCompleted(data) 
					}
				}
			);
		}
    }
);

	
	
/** Create one or more new servers for a service. 
	Updates the serviceView when loaded.
	
	Call as 	$.api.createServers(service, serviceView, data);
*/
$.api.register("createServers", 
	{
		url 		: "api/ServiceController/latest/create-servers",
		data 		: 	 "<request>"
						+"	<data>"
						+"		<service>#{service}</service>"
						+"		<count>#{count}</count>"
						+"		<imageId>#{imageId}</imageId>"
						+"		<vendorType>#{vendorType}</vendorType>"
						+"	</data>"
						+"</request>",

		ajaxOptions : {
			type 		: "POST",
			dataType	: "xml"
		},

		callAs : function(service, view, data) {
			$.api.call("createServers",
						{
							substitutions : data,
							callbackArgs : [service, view, data]
						}
					  );
		},
	
		onSuccess : function(replyData, service, view, data) {
			$.notifier.flash($.message("api.createServers.success", data));
			if (view) $.serviceView.forms.addServers.onSaveSuccess(view);
			
			// force a reload
			SP.reload();
		},
	
		onError : function(callParams, errorMessages, service, view, data) {
			$.notifier.hide();
			if (view) {
				$.serviceView.forms.addServers.onSaveError(errorMessages, view);
			} else {
				$.notifier.flash(errorMessages);
			}
		}
	}
);
	

/** Attach IPs to a service. 
	Updates the serviceView when loaded.
	
	Call as 	$.api.attachIps(service, serviceView, data);
*/
$.api.register("attachIps", 
	{
		url		: "api/ServiceController/latest/attach",
		data		: "<request><data><service>#{service}</service><ips>#{ips}</ips></data></request>",
		ajaxOptions : {
			type 		: "POST",
			dataType 	: "xml"
		},

		callAs : function(service, view, data) {
			$.api.call("attachIps",
						{
							substitutions : data,
							callbackArgs : [service, view, data]
						}
					  );
		},
	
		onSuccess : function(replyData, service, view, data) {
			$.notifier.flash($.message("api.attachIps.success", data));
			if (view) $.serviceView.forms.addServers.onSaveSuccess(view);
	
			// force a reload
			SP.reload();
		},
	
		onError : function(callParams, errorMessages, service, view, data) {
			$.notifier.hide();

			// called from a service tray
			if (view) {
				$.serviceView.forms.addServers.onSaveError(errorMessages, view);
			} else {
				$.notifier.flashError(errorMessages);
			}
		}		
	}
);


/** Detach IPs to a service. 
	Updates the serviceView when loaded.
	
	Call as 	$.api.detachIps(service, serviceView, data);
*/
$.api.register("detachIps", 
	{
		url		: "api/ServiceController/latest/detach",
		data		: "<request><data><service>#{service}</service><ips>#{ips}</ips></data></request>",
		ajaxOptions : {
			type 		: "POST",
			dataType 	: "xml"
		},

		callAs : function(instances, view, data) {
			$.api.call("detachIps",
						{
							substitutions : data,
							callbackArgs : [instances, view, data]
						}
					  );
		},
	
		onSuccess : function(replyData, instances, view, data) {
			$.notifier.flash($.message("api.detachIps.success", data));
			// force a reload
			SP.reload();
		},

		onError : function(callParams, errorMessages, instances, view, data) {
			$.notifier.flashError(errorMessages);
		}
	}
);
	

	
/** Rename a service. 
	Updates the serviceView when done.
	
	Call as 	$.api.renameService(service, serviceView, data);
*/
$.api.register("renameService", 
	{
		url	: "api/ServiceController/latest/rename",
		data	: "<request><data><oldname>#{oldName}</oldname><newname>#{newName}</newname></data></request>",
		ajaxOptions : {
			type 		: "POST",
			dataType 	: "xml"
		},
	
		callAs : function(service, view, data) {
			$.api.call("renameService",
				{
					substitutions : data,
					callbackArgs : [service, view, data]
				}
			  );
		},
		
		onSuccess : function(replyData, service, view, data) {
			$.notifier.flash($.message("api.renameService.success", data));
			if (view) $.serviceView.forms.renameService.onSaveSuccess(view);
	
			// rename the service on the client
			SP.renameService(service, data.newname);
	
			// force a reload
			SP.reload();
		},
	
		onError : function(callParams, errorMessages, service, view, data) {
			if (view) {
				$.serviceView.forms.renameService.onSaveError(errorMessages, view);
			} else {
				$.notifier.flash(errorMessages);
			}
		}
	}
);
	
	
/** Stop one or more instances.
	`instances` is an array of instance objects.
	Forces a reload when done.

		
	Call as 	$.api.stopInstances(instances);
*/
$.api.register("stopInstances", 
	{
		url			: "api/ServiceController/latest/stop/#{ips}",
		ajaxOptions : {
			type 		: "POST",
			dataType 	: "xml"
		},
		
		callAs : function(instances) {
			// get the list of instance ips from the instances array
			var ips = [];
			$.each(instances, function(index, instance) {
				ips.push(instance.ip);
			});
			
			var subs = { ips : ips.join(","), count : ips.length };
			
			$.api.call("stopInstances",
						{
							substitutions : subs,
							callbackArgs : [ips, subs]
						}
					  );
		},
	
		onSuccess : function(replyData, ips, subs) {
			$.notifier.flash($.message("api.stopInstances.success", subs));
	
			// force a reload
			SP.reload();
		}
	}
);


	
/** Start or stop reporting for an instance. 
	Updates the instanceView inline when done.  (Does NOT reload).
	
	Call as:	$.api.toggleReporter("start", instance, instanceView);
				$.api.toggleReporter("stop",  instance, instanceView);
*/
$.api.register("toggleReporter", 
	{
		url			: "api/MemcacheServer/latest/config/instance/#{ip}:#{port}/#{operation}-reporting",
		ajaxOptions	: {
			type 		: "GET",
            dataType	: "xml"
		},
		
		callAs : function(operation, instance, instanceView) {
			var data = {
				operation	: operation,
				ip 			: instance.ip,
				port        : (instance.port || 11211)
			}
			// console.log("toggleReporter: op="+operation+" on "+data.ip+":"+data.port);
			$.api.call("toggleReporter",
						{
							substitutions : data,
							callbackArgs : [instance, instanceView, data]
						}
					  );
		},
		
		onSuccess : function(replyData, instance, instanceView, data) {
			var operation = data.operation;
			// show the appropriate message
			var message = (operation == "start" 
								? "api.startReporter.success" 
								: "api.stopReporter.success"
						);
	
			$.notifier.flash($.message(message, data));
	
			// update the instance in memory
			instance.reporterEnabled = (operation == "start");
			
			// and have the view update as well
			if (instanceView) $.serviceView.onToggleReporterSucceeded(instance, instanceView);
		}
	}
);



/** Load the possible machine types for this environment.
	TODO: skip this if we're in appliance mode?
	
	Call as:  	$.api.loadMachineTypes();
*/
$.api.register("loadMachineTypes", 
	{

		url 		: "api/ServiceController/latest/machine-types",
		
		/** Process the results. */
		onSuccess : function(data, status) {
			SP.machineTypes = data.machineType || [];
			if (! (SP.machineTypes instanceof Array) ) SP.machineTypes = [SP.machineTypes];
			
			// make a map of arch -> machineTypes
			SP.machineTypeMap = {};
			$.each(SP.machineTypes, function(index, type) {
				var arch = type.arch;
				if (!SP.machineTypeMap[arch]) SP.machineTypeMap[arch] = [];
				SP.machineTypeMap[arch].push(type);

				// figure out the titles for each type
				// TODO: is this really * 1024?
				type._memSize = $.number.toBytesString(parseInt(type.memSize) * 1024);
				type._title = $.message("service.machineType.title", type);
			});
		},
		
		/* Something went wrong loading the machine types. */
		onError : function(callParams, errorMessages, service, view, data) {
			$.notifier.showError(errorMessages);
		}
	}
);

/** Change authorization level 

	Call as: $.api.changeAuthorizationLevel(oldLevel, newLevel, password);
*/

$.api.register("changeAuthorizationLevel",
	{
	    url: "api/ServiceController/latest/authorize/#{oldLevel}/#{newLevel}/#{password}",
		ajaxOptions : {
		    type : "POST",
			dataType : "xml"
		},

		callAs : function(oldLevel, newLevel, pw) {
			var pwHash = hex_md5(pw);
			$.api.call("changeAuthorizationLevel", 
					   {
					   substitutions : {oldLevel:oldLevel, newLevel:newLevel, password:pwHash}
					   });
		},

		onSuccess : function(replyData) {
			SP.reload();
			$.notifier.flash($.message("api.changeAuthorizationLevel.success"));
		}, 

		/* Something went wrong. */
		onError : function(callParams, errorMessages, service, view, data) {
			$.notifier.showError(errorMessages);
		}
	}
);
