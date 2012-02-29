/*
 *	statsproxy Web UI
 */
// Copyright (c) 2009-2010, Gear Six, Inc.  Subject to a BSD-style
// license whose text is available at /license.txt on this machine

// declare the main "gear6" variable (aliased as "g6" for console debugging)
window.gear6 = window.g6 = {};


// Create a gear6-specific StackedRequest subclass
new $.StackedRequest.subclass(
{
	reference : "gear6.StackedRequest",
	prototype : {
		order:"serial", 
		stopOnError:"continue",
		url : "../api/ServiceController/latest"		//REFACTOR
	}	// end prototype
});


// "StatsProxy" or, more commonly, "SP" is our application controller
window.app = window.StatsProxy = window.SP = new $.Controller({
	// url prefix for all static files
	filePrefix : "",

	// url prefix for all requests (ServiceController, etc)
	requestPrefix : "api/",	//REFACTOR

	// # of seconds for auto-refresh
	refreshInterval : 15,

	// name -> pointer for controllers we deal with
	controllers : {},

	// page to show if we don't know what to show
	defaultPage : undefined,


	// select a page
	//	when we just want to re-show the current page, will be called without a 'page' argument
	select : function(page) {
//console.group('app.select',page);
		if (page) {
			this.as($.Selective, "select", arguments);
		}
		// showing the page is done in refresh()
		//this.selection.show();
//console.groupEnd();
	},
	
	deselect : function(page) {
//console.group('app.DEselect',page);
		page.hide();	
//console.groupEnd();
	},

	/** List of possible SERVICE states: */
	serviceStates : ["pending","running","shutting-down","terminated"],

	/** List of possible INSTANCE states: */
	serviceStates : ["connected","disconnected","re-connected"],

	

	/** Begin initialization on browser load.  
		Note that this asynchronously loads the message file and then loads the config file.
	 */
	onLoad : function () {
		$.Notifier.notifierParentElement = "#main";
		$.Notifier.show("Loading");
		
		// set up browser events and observations
		this.setUpEvents();
		
		// start loading our initial data
		this.loadInitialData();
	},
	
	// special initial loader
	loadInitialData : function() {
		// special callback after the initial load
		this.requestQueue.onSuccess = function() {
			SP.onInitialDataLoaded();
		}
	
		// load the message dictionary (only happens once at app startup)
		this.addRequest(new $.message.Loader());

		// call "refresh" to gather active refresh requests and execute the queue
		this.refresh();
	},
	
	// this is called after we load:
	//		- the message dictionary
	//		- config() data for all of the active services
	//
	onInitialDataLoaded : function() {
		// load the machineTypes list
		// TODO: skipping for now (why?)
		// if (ServiceController.config.mode == "cloud") {
		//	this.addRequest(new ServiceController.loadMachineTypesRequest());
		// }

		// resize to make sure everytihing fits
		this.notify("resize");
		
		$.Notifier.hide();
		
		// start the refresh timer
		this.startRefreshTimer();

		// call hashChanged to do load the initial service/server/whatever
		this.onHashChanged();
	},



	// set up browser events and observations
	setUpEvents : function() {
		//
		// observations
		//
		
		// observe the ServiceController's 'configChanged' event
		SP.observe(ServiceController, "configChanged", "onConfigChanged");

		//
		// browser events
		//
		
		// redraw the current data when the window.location.hash changes
		$(window).bind('hashchange', function(){SP.onHashChanged()});
		
		// and tell views to resize and when the window resizes
		$(window).bind('resize', function(){SP.notify("resize")});
		
		// fire resize immediately to lay things out
		SP.notify("resize");

	},
	
	
	// Update the html to reflect the ServiceController configuration when it changes.
	onConfigChanged : function(deltas) {
		var config = ServiceController.config;
		
		// set up the timezone stuff
		$.date.setTimezone(config.timezoneOffset, config.timezoneName);

		// show the appname and version items
		config._appName = (config.serviceProvider ? $.message("UI.appnamePlusProvider", config)
												  : config._appName);
		$("#appname").html(config._appname);
		$("#version").html(config.version);
		
		// set classes on the body that correspond to the current configuation
		var role = config.role,
			loggedIn = (role != "none"),
			canModify = (role == "modify" || role == "super"),
			canCreate = (role == "super"),
			canChangeRole = (config.authorization == "enabled")
			replicationOn = (config.replication == "on")
			hasStorage = (config.storageEnabled)
		;
		
		$("body").toggleClasses(
			{
				"loggedIn" : loggedIn,
				"loggedOut" : !loggedIn,
				
				"canModify" : canModify,
				"cantModify" : !canModify,
				
				"canCreate" : canCreate,
				"cantCreate" : !canCreate,
				
				"canChangeRole" : canChangeRole,
				"cantChangeRole" : !canChangeRole,
				
				"hasStorage" : hasStorage,
				"hasNoStorage" : !hasStorage,
				
				"replicationOn" : replicationOn,
				"replicationOff" : !replicationOn,
				
				"inCloudMode" : config.mode == "cloud",
				"inApplianceMode" : config.mode == "appliance"
			}
		);		

		// show the 'login' message and make the roleMenuButton match
		var authReminder = $.message("auth.reminder");
		if (config.role == "none") {
			$.Notifier.show(authReminder);
			$("#roleMenuButton .Title").html($.message("auth.menuButton.loggedOut.title"));
		} else {
			$.Notifier.hideIf(authReminder);
			$("#roleMenuButton .Title").html($.message("auth.menuButton.loggedIn.title"));
		}
	},
	


	 
 	//
 	// authorization
 	//
 
	// menu to switch roles
 	roleMenu : new $.Menu({
 		id 				: "roleMenu",
 		selectable 		: false,
		displaySelector : "#roleMenuButton",
 		
 		loggedInItems 	: ['-chooseRole', 'view', 'modify'],//, 'super'],
 		loggedOutItems 	: ['-youCan', 'none','-orChooseRole', 'view', 'modify'],//, 'super'],

		onSelect : function(role) {
			SP.setRole(role);
		},

 		getItemTitle : function(suffix) {
			return $.message("auth.state."+suffix) || suffix; 		
 		},

		getDisplayHtml : function(role, title) {
			return $.message("auth.menu.title", {role: role, title:title});
		},
		
		show : function(event, menuButton) {
			// change the list of menu items depending on the current role
			if (ServiceController.config.role == "none") {
				this.setItems(this.loggedOutItems);
			} else {
				this.setItems(this.loggedInItems);
			}
			return this.as($.Menu, "show", arguments);
		}
 	}),
 
 	// change the role
	//	- shows a password prompt if the're escalating the level
	setRole : function(newRole) {
		var currentRole = ServiceController.config.role,
			password = ""
		;
		if (newRole === currentRole) return;
		
		if ($.list.indexOf(ServiceController.roles, newRole) > $.list.indexOf(ServiceController.roles, currentRole)) {
			var message = $.message("auth.prompt", {level: newRole});
			var password = prompt(message);
			if (password == null) return;
		}
		
		this.addRequest(new ServiceController.RoleChanger({
			inputData : {
				currentRole : currentRole,
				newRole : newRole,
				password: password
			},
			onSuccess : function() {
				$.Notifier.flash($.message("api.changeAuthorizationLevel.success"));
			},
			
			onError : function() {
				this.showErrors();
			}
		}), true);
		this.refresh();
	},
	
	// log out (set role to 'none')
	logOut : function() {
		this.setRole("none");
	},


	//! Set the hash of the window.  
	//	If overwriteUrl is set, does a replace() so the current location is not in the history.
	currentHash : undefined,
	setHash : function(hash, overwriteUrl) {
		if (hash.charAt(0) != "#") hash = "#"+hash;
		
		var url = window.location.href,
			hashChar = url.indexOf("#")
		;
		// remove hash from the original href
		if (hashChar > -1) url = url.substr(0, hashChar);
		url += hash;
		if (url == window.location.href) return;

		// remember the hash BEFORE navigating
		//	otherwise Chrome Mac will fire hashChanged before we're through
		this.currentHash = hash;
//console.debug("hash set to ",hash);
		if (overwriteUrl) {
			window.location.replace(url);
		} else {
			window.location = url;
		}
	},
	
	// The hash has reportedly changed:
	//	If it is different that SP.currentHash, navigate to that page
	onHashChanged : function() {
		var hash = window.location.hash || "";
		if (hash == SP.currentHash) return; //console.debug("hash not changed");
//console.debug("hash changed to ",hash);
		SP.currentHash = hash;
		
		// figure out which page the hash refers to
		var page = $.Page.byHash(hash) || this.selection || this.defaultPage;
		page.controller.loadFromHash(hash, page);
	},
	
	
	
	//
	//	refresh
	//

	//! Refresh anyone who's waiting for data.  Called on a timer.
	//	Basically, we just send the "refresh" notification, which tells observers
	//	to enqueue their requests, then execute the request.
	refresh : function() {
//console.group("SP.refresh");
		// stop the refresh timer (in case this was called manually)
		if (this.refreshTimer) this.refreshTimer.stop();

		// tell anyone who is watching that it's time to refresh
		this.notify("refresh", this.requestQueue);
		
		//REFACTOR: do this via notify?
		if (this.selection) this.selection.onRefresh(this.requestQueue);
		
		// and execute the current request (which starts another one)
		this.executeRequest();
		
		// tell the current page to show
		if (this.selection) this.selection.show();
		
		// start the refresh timer again
//REFACTOR: do this when a refresh completes normally instead?
		if (this.refreshTimer) this.refreshTimer.start();
//console.groupEnd("SP.refresh");
	},

	//! Refresh the entire page (hard reset to the javascript)
	reloadPage : function() {
		window.location.reload();
	},

	
	// statsproxy manages a requestQueue (StackedRequest) so other things can just 
	//	add their requests to the queue and things will be executed all together
	requestQueue : new gear6.StackedRequest(),
	
	// add a request to the current queue
	addRequest : function(request, serial, stopOnError) {
		this.requestQueue.addRequest(request, serial, stopOnError);
	},
	
	
	// execute the current queue (and start a new one)
	// REFACTOR: make sure there's only one queue open?
	executeRequest : function() {
		var queue = this.requestQueue;
		// if the queue is empty, skip it
		if (queue.requests.length === 0) return;
		
		// create a new queue
		this.requestQueue = new gear6.StackedRequest();

		// and tell the current queue to go!
		queue.execute();

		// store the last queue so we can inspect it
		this._lastRequestQueue = queue;
	},

	// Window resize -- tell the current view to resize (for chart view mostly).
	onResize : function() {
		// resize the main part of the UI to take up at least the full height of the window
		var topHeight = $("#top").height(),
			bottomHeight = $("#bottom").height(),
			windowHeight = $(window).height(),
			mainHeight = windowHeight - (bottomHeight+topHeight+20)
		;
		$("#main").css("minHeight", mainHeight);
		
		//REFACTOR: do this via notify?
		if (SP.selection && SP.selection.onResize) SP.selection.onResize();
	},
	

	//
	//	refresh interval/menu
	//
//APP
	startRefreshTimer : function() {
		// create the refreshTimer (autoStart will start it)
//REFACTOR: give this a 'condition' ?
		this.refreshTimer = new $.Timer({
			id 		: "SP.refreshTimer", 
			interval 	: this.refreshInterval,
			cookie		: "statsproxy:refresh",
			autoStart	: false
		});

		this.refreshMenu.select(this.refreshTimer.interval);

		// observe the "fire" event of the timer
		this.observe(this.refreshTimer, "fire", "refresh");
		
		this.refreshTimer.start();
	},
	
	stopRefreshTimer : function() {
		this.refreshTimer.stop();
	},
	
	
//APP	
	refreshMenu : new $.Menu({
		id 				: "refreshMenu",
		items 			: [5, 10, 15, 30, 60, "-", 120, 300, 600, "-", 0],
		displaySelector	: "#refreshMenuButton .Title",
		selectable		: true,

		onSelect 		: function(seconds) {
			SP.refreshTimer.setInterval(seconds);
//			if (interval !== 0) SP.refresh();
		},

		getItemTitle 	: function(seconds) {
			if (seconds == 0) return $.message("refresh.off");
			if (seconds <= 60) return $.message("refresh.seconds", {number:seconds});
			return $.message("refresh.minutes", {number:seconds/60});
		},
		
		getDisplayHtml 	: function(seconds, title) {
			return $.message("refresh.menu.title", {timeMessage: title});
		}
	}),
	
	

	/** Rename a service on the client (assumes rename on server has succeeded already). */
//REFACTOR
	renameService : function(service, newName) {
		var oldName = service.name;

		// update the service object itself
		service.name = newName;

		// update the serviceMap
		delete SP.serviceMap[oldName];
		SP.serviceMap[newName] = service;

		// update the service tab
		$.serviceView.update(service);
	},

	



	//
	//	show the current view
	//
	

	// return true if the selected service is a gear6 service
//REFACTOR
	showingGear6Item : function() {
		return (SP.getInstance().gear6 == true);
	},

	// update the 'last request time' field
	// NOTE: "dateString" is ALWAYS in GMT, and we ALWAYS want to display in GMT,
	//			so ignore the timezoneOffset in $.date.print() below
//REFACTOR
	updateTime : function(dateString) {
		var time = $.date.parseISO8601(dateString);
		if (time == null || isNaN(time)) return;
		// convert to a nice locale-string
		time = $.date.print(time, 0, true);
		$("#time").html(time);
	},
	 


	//
	//	event handlers from the UI
	//


	
//REFACTOR
	onAddToOverviewClick : function(inErrorState) {
		var message = $.message("UI.addToOverview.prompt");
		if (inErrorState) message = $.message("UI.invalidFormat") + "\n\n" + message;
		var ips = prompt(message);
		if (ips == null) return;
		
		ips = $.trim(ips);
		try {
			ips = $.form.validate.ipAddresses(ips);
		} catch (e) {
			return SP.onAddToOverviewClick(true);
		}
		$.api.attachIps(null, null, {ips:ips});
	},

	
	showSupportPage : function() {
		var firstInstance = MemcacheServer.instances[0];
		SP.vendorType = (firstInstance ? firstInstance.vendorType : "unknown"),
		SP.appNameString = SC.config._appname;
		
		var page = $.message("UI.support.link");
		var wd = window.open(page, "Gear6Support");
	},
	
	
	toString : function() {	return "StatsProxy" }
});	// end statsProxy




