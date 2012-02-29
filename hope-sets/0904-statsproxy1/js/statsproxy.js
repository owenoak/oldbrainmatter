/*
 *	statsproxy Web UI
 */
// Copyright (c) 2009-2010, Gear Six, Inc.  Subject to a BSD-style
// license whose text is available at /license.txt on this machine

window.StatsProxy = window.SP = {
	// list of "views" we understand 
	// filled in below
	views : {},
	
	/** Name of the default view to show.  MUST be a non-gear6only service view. */
	defaultView : 'traffic_composite',

	/** Pointer to the last service view we've shown. */
	lastServiceView : undefined,

	/** Pointer to the current 'view' we're displaying */
	view : undefined,
	

	/** List of service objects. */
	services : [],	
	
	/** Map of service.name -> service object. */
	serviceMap : {},
	
	
	/** NAME of the currently selected instance.  Note: it may go out of scope at any time! */
	selectedInstance : undefined,
	
	/** List of all instance names. */
	instanceNames : [],

	/** Map of instance.name -> instance object. */
	instanceMap : {},

	
	/** Default configuration data for the application. */
	config : {
		mode : "cloud",			// "appliance" or "cloud"
		appname : "Gear6 Memcached",
		version : "v 1.0",
		maxDataSamples : 500,
		timezoneOffset : 0,
		timezoneName : "GMT",
		storageEnabled : false,
		reporter : "off"
	},
	
	// default authState
	authState: "modify",

	// # of seconds for auto-refresh
	pollInterval : 15,

	// data series we know about
	dataSeriesMap : {
		'composite'				: { 		 },
		'get_hits'				: { abbr:'h' },
		'get_misses'			: { abbr:'m' },
		'cmd_get'				: { abbr:'g' },
		'cmd_set'				: { abbr:'s' },
		'bytes_written'			: { abbr:'w' },
		'bytes_read'			: { abbr:'r' },
		'evictions'				: { abbr:'e' },
		'curr_items'			: { abbr:'i' },
		'curr_connections'		: { abbr:'c' },
		'connection_structures'	: { abbr:'n' }
//		,'sync_queue_size'		: { abbr:'q' }
	},


	// store the traffic start/end time on the view
	//	so it is shared by all charts

	// default timeframe is one hour back from 'now'
	trafficStart		: -1 * $.date.MSEC_PER_HOUR,
	trafficEnd			: "now",


	/** List of possible SERVICE states: */
	serviceStates : ["pending","running","shutting-down","terminated"],

	/** List of possible INSTANCE states: */
	serviceStates : ["connected","disconnected","re-connected"],
	

	/** Begin initialization.  
		Note that this asynchronously loads the message file and then loads the config file.
	 */
	init : function () {
		// set things up so we'll redraw the current data when the window.location.hash changes...
		$(window).bind('hashchange', SP.loadFromHash);
		
		// ... and so we'll redraw and when the window resizes
		$(window).bind('resize', SP.resize);
		
		// fire resize immediately to lay things out
		SP.resize();

		// start watching the body element for tooltip messages
		$.ghettoTip.startWatchingBody();

		// load the message file
		$.api.loadMessageFile();

		// then load the config file, which will kick off the current view when it finishes
		$.api.loadAppConfig();

		// load the machineTypes list
		if (SP.config.mode == "cloud") {
			//	$.api.loadMachineTypes();
		}
	},
	
	
	/** Initialize views -- called after the message file finishes loading. */
	initViews : function() {
		// initialize the list of graphs we know about
		SP.initTrafficGraphs();

		// initialize the list of data series we know about
		SP.initStatsViews();

		// set up the lastServiceView to be the defaultView
		//  this way if we switch from appliance to service mode,
		//	we'll end up in the last view that we saw
		SP.lastServiceView = SP.views[SP.defaultView];

		// set the title for each unnamed view from the message dictionary
		$.each(SP.views, function(viewName, view) {
			if (!view.title) {
				view.title = $.message("view.title."+this.viewName);
			}
		});

		// set up auto-polling
		SP.setUpPolling();

		// set up authorization menu
		SP.setUpAuth();
	},


	/** Reload the main app configuration file.  
		The appropriate view will be reloaded automatically once the config file completes.
	 */
	reload : function() {
		$.api.loadAppConfig()
	},



	/** Get a pointer to the current service.
	*/
	getService : function() {
		var instance = SP.getInstance();
		return instance.service;
	},


	/** Get a pointer to the current instance.
		If what we think of as the current instance is out of scope,
		will try to select the instance for the machine that we're loaded from.
		If *that* didn't work, we'll select the first instance of the first service.
	*/
	getInstance : function() {
		if (SP.selectedInstance == null) {
			if (SP.instanceMap[window.location.hostname]) {
				SP.selectedInstance = window.location.hostname;
			}
		}
		
		var instance = SP.instanceMap[SP.selectedInstance] || SP.services[0].instances[0];
		SP.selectedInstance = instance.name;
		return instance;
	},


	/** Select a particular service.  
		Note that this boils down to selecting a particular instance. 
	*/
	selectService : function(serviceName) {
		// get pointers to the service and the currently selected instance
		var service = SP.serviceMap[serviceName] || SP.services[0],
			instance = SP.getInstance()
		;
		// if there is no current instance,
		//	or the current instance is not in this service
		if (!instance || instance.service != service) {
			// select the first instance of the service
			instance = service.instances[0];
		}
		SP.selectInstance(instance.name);
	},

	/** Select a particular instance, and show a view for it. */
	selectInstance : function(instanceName) {
		// TODO: better error handling here
		//			maybe switch to overview with an error?
		if (!SP.instanceMap[instanceName]) throw "trying to select invalid instance";
		
		SP.selectedInstance = instanceName;
		// if we're in an overview mode, switch to the last service views
		if (SP.view.viewType == "overview") {
			SP.selectView(SP.lastServiceView);
		} else {
			SP.selectView(SP.view);
		}
	},

	/** Select the view for the current instance/service.
	
		Note that this only sets the url#hash to the desired view.
		SP.loadFromHash() will be called automatically when the hash changes,
		and that will call SP.showCurrentView() which does the actual showing of the view.
	*/
	selectView : function(viewName, overwriteUrl) {
		// tell the old view to 
		if (SP.view) SP.view.hide();
		
		SP.view = (typeof viewName == "string" ? SP.views[viewName] : viewName);
		if (!SP.view) SP.view = SP.views[SP.defaultView];

		// if we're not dealing with an overview
		if (SP.view.viewType != "overview") {
			// make sure the view is valid for this instance type
			var instance = SP.getInstance();
			if (instance.gear6 == false && SP.view.gear6only) {
				SP.view = SP.lastServiceView;
				if (SP.view.gear6only) SP.view = SP.views[SP.defaultView];
			}

			// remember the last serviceView we have displayed
			SP.lastServiceView = SP.view;

			SP.view.instance = instance;
			SP.view.service = SP.getService();
		}

		// update the hash, which will cause the view to actually be DRAWN in a little bit
		SP.setHash(SP.view.getHash(), overwriteUrl);
		
		// update the generic parts of the view display quickly
		SP.updateViewElements();

		// if a service has its drawer open, close it
		$.serviceView.closeDrawer();
	},
	
	
	/** Set the hash of the window.  
		If overwriteUrl is set, does a replace() so the current location is not in the history.
	*/
	setHash : function(hash, overwriteUrl) {
		var url = window.location.href,
			hashChar = url.indexOf("#")
		;
		if (hashChar > -1) url = url.substr(0, hashChar);
		url += hash;
		if (url == window.location.href) return;
		
		if (overwriteUrl) {
			window.location.replace(url);
		} else {
			window.location = url;
		}
	},
	
	// load the query represented in the window.location.hash
	// NOTE: this can be called anonymously!
	loadFromHash : function() {
		// if there is no hash, select the default view so we get a hash
		//	this makes back to the first 'page' work
		if (!window.location.hash) {
			SP.selectView(SP.defaultView, true);
		}
		
		var options = SP.parseHash(window.location.hash);
		var isValidView = true;

		SP.view = SP.views[options.view] || SP.views[SP.defaultView];
		if (SP.view.viewType != "overview") {
			// figure out which instance we're supposed to show
			//	either the one specified in the hash, or the selected instance
			var instance = SP.instanceMap[options.instanceName];
			if (!instance && options.instanceName) isValidView = false;
			if (!instance) instance = SP.getInstance();

			// make sure the view is something we can display for that instance
			if (instance.gear6 == false && SP.view.gear6only) {
				SP.view = SP.lastServiceView;
				if (SP.view.gear6only) SP.view = SP.views[SP.defaultView];
				isValidView = false;
			}
			var service = instance.service;

			options.instance = instance;
			options.service = service;
	
			// remember what view we're actually on
			SP.selectedInstance = instance.name;
			SP.lastServiceView = SP.view;
		}
		delete options.view;

		if (isValidView) {
			// tell the appropriate view to draw
			SP.view.activate(options);
		} else {
			// call selectView again with the new view
			//	and tell it to overwrite the old URL
			SP.selectView(SP.view, true);
		}
	},


	// doing a REST-y hash:
	//	hash has format:
	//		#<view>
	//		#<view>/<instance>
	//		#<view>/<dataId>/<instance>?<param>=<value>&<param>=<value>
	//	everything is optional
	parseHash : function(hash) {
		var output = {};
		if (hash) {
			var ampSplit = hash.substr(1).split("&"),
				params = ampSplit[0].split("/"),
				output = {}
			;
			
			output.view = params[0];

			// stats view
			if (params.length == 2) {
				output.instanceName = params[1];
				
			} 
			// traffic view
			else if (params.length == 3) {
				output.view = output.view + "_" + params[1];
				output.instanceName = params[2];
			}
			
			for (var i = 1; i < ampSplit.length; i++) {
				var item = ampSplit[i].split("="),
					key = item[0],
					value = item[1]
				;
				output[key] = value;
			}
		}
		
		if (!output.view) output.view = SP.defaultView;
		return output;
	},


	/** Show the view.  Same code runs for all views.
		This is also responsible for highlighting 
		 the correct tab, view selector, serviceView and/or instance as appropriate for the view.
	*/
	updateViewElements : function() {
		var instance = SP.getInstance(),
			service  = SP.getService(),
			view	 = SP.view,
			tab
		;

		// hide the menu & dialog, just in case
		$.menu.hide();
		$.dialog.hide();

		// set the gear6 flag on the body
		var isGear6 = instance && instance.gear6;
		$("body").toggleClass("isGear6", isGear6)
				 .toggleClass("isNotGear6", !isGear6)
		;

		// remove the highlight from all service tabs
		$("LI[service].Selected").removeClass("Selected");

		// remove the highlight from all view selectors
		$("LI[view].Selected").removeClass("Selected");

		// highlight the selector for this view (tab or viewSelector item)
		$("LI[view="+view.viewName+"]").addClass("Selected");

		// remove the highlight from all instances
		$(".MemcacheInstance.Selected").removeClass("Selected");

		if (view.viewType != "overview") {
			// highlight the current instance's row
			$(".MemcacheInstance[instance='"+instance.name+"']").addClass("Selected");

			// hide all of the serviceWindows except for the selected service
			$(".ServiceView").hide();
			$(".ServiceView[service="+service.name+"]").show();

			// highlight the current service's tab
			service.tab.addClass("Selected");
			tab = service.tab;

			// show the IP address
			$(".ipMenuButton").html(instance.name);
			$(".ipLabel").html(instance.name);
		} else {
			tab = $("LI[view="+view.viewName+"]");
		}

		// if not overview, make sure the tab is visible
		SP.showTab(tab);

		// update the window title
		if (SP.view.viewType == "overview" || !service) {
			document.title = $.message("window.title.noService", window);
		} else {
			if (service._unnamed) {
				document.title = $.message("window.title.unnamedService", window);
			} else {
				document.title = $.message("window.title.namedService", window);
			}
		}
	},





	// initialize the list of services/instances
	updateConfiguration : function(serviceConfig) {
		// get the serviceConfig.config and update the SP.config with that
		// yeah, yeah, I know, that's hella confusing -- TODO: rename
		SP.config = $.xml.arrayToObject(serviceConfig.config, "name", "value", SP.config);

		SP.authState = SP.config.role;

		// set up the timezone stuff
		$.date.setTimezone(SP.config.timezoneOffset, SP.config.timezoneName);

		// update the last request timefield
		if (serviceConfig) this.updateTime(serviceConfig.time);

		// show the appname and version items
		var appname = SP.config.appname;
		if (SP.config.serviceProvider) {
			appname = $.message("UI.appnamePlusProvider", SP.config);
		}
		$("#appname").html(appname);
		$("#version").html(SP.config.version);
		

		// set classes on the body that correspond to the current configuation
		var role = SP.config.role,
			loggedIn = (role != "none"),
			canModify = (role == "modify" || role == "super"),
			canCreate = (role == "super"),
			canChangeRole = (SP.config.authorization == "enabled")
			replicationOn = (SP.config.replication == "on")
			hasStorage = (SP.config.storageEnabled)
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
				
				"inCloudMode" : SP.config.mode == "cloud",
				"inApplianceMode" : SP.config.mode == "appliance"
			}
		);		

		SP.updateAuthDisplay();
	},
	

	/** Update the list of services/instances. */
	updateServiceList : function(serviceConfig) {
		var services = serviceConfig.service;
		// if there are no services, don't do anything
 		if (services == undefined) return;
		// make sure we have an ARRAY of services, in case there's only one in the config file
		if (! (services instanceof Array)) services = serviceConfig.service = [services];

		services = services.sort(function(a,b){
				return a.name > b.name;
			});

		// clone the current service lists
		var oldServiceList = [].concat(SP.services);
		
		// clear the old instance list and map
		SP.instanceNames = [];
		SP.instanceMap = {};
		
		// iterate through the list of services:
		//	- if the service already exists, update it
		//	- otherwise create it
		$.each(services, function(index, parameters) {

			// service instances will be in 'parameters.instance' if any are defined
			//	rename to 'instances' and make sure they're an array
			var instances = parameters.instance;
			if (!instances) 				instances = [];
			else if (!(instances instanceof Array)) 	instances = [instances];
			delete parameters.instance;
			parameters.instances = instances.sort(function(a,b){return a.ip > b.ip;});

			// if no name provided, take the 'identifier' of the first instance
			if (!parameters.name) {
				parameters._unnamed = true;
				parameters.name = parameters.instances[0].ip;
			}
			
			var service = SP.serviceMap[parameters.name];
			
			// create the service - this will create its 'tab' and 'view' elements
			if (!service) {
				// note: this calls updateService() at the appropriate point
				service = SP.createService(parameters);
			} 
			// remove from the oldServiceList so we can make sure everyone got processed
			else {
				var index = $.inArray(service, oldServiceList);
				if (index != -1) oldServiceList.splice(index, 1);
			}

			// update the service with the new parameters
			SP.updateService(service, parameters);
			
			// and update the service display
			$.serviceView.update(service);
		});
		
		// if there were any services which were not in the new serviceConfig
		//	destroy them to remove them from the UI 
		if (oldServiceList.length) {
			$.each(oldServiceList, function(index, service) {
				SP.destroyService(service);
			});
		}

		var menuHTML = [];
		// iterate through the servers and create the instance menus
		$.each(SP.services, function(index, service) {
			menuHTML.push("<ul wd='"+(service._unnamed ? "Server" : "Pool")+"'>",
							"<span class='serviceLabel'>"
								+ $.message(service._unnamed 
										? "service.memcacheServer.title" 
										: "service.memcachePool.title"
								  )
								+ "&nbsp;" + service.name
								+ "</span>",
							"<div class='Inset'>");
			$.each(service.instances, function(index, instance) {
				menuHTML.push($.string.interpolate($.templates.InstanceMenuTemplate, instance));
			});
			menuHTML.push("</div>","</ul>");
		});

		// set up the instance menu
		$.menu.initialize(menuHTML.join("\n"), 
						  {
							menuContainer : "#instancesMenu",
							callback : "SP.onInstanceClick(this)"
						  }
		);
		$(".ipLabel").toggle(SP.instanceNames.length == 1);
		$(".ipMenuButton").toggle(SP.instanceNames.length > 1);
		
		// show the list of tabs
		$("#tabContainer").show();
		
		// and resize to make sure the tabs fit
		SP.resize();
	},
	
	
	/** Create a new service from raw parameters.
		NOTE: assumes that the service does not already exist!
	 */
	createService : function(service) {
		// register the service
		SP.services.push(service);
		SP.serviceMap[service.name] = service;
		service._collapsed = $.cookies.get("statsproxy-expanded-"+service.name) == "true";
		return service;		
	},

	/** Rename a service on the client (assumes rename on server has succeeded already). */
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

	

	/** Update a service with new parameters. */
	updateService : function(service, parameters) {
		// copy the properties from the parameters to the service
		$.extend(service, parameters);
		
		// is this a gear6 package?
		service.pkg = service['package'] || "";		// "package" is a reserved word in JS
		service.gear6 = (service.pkg.toLowerCase().indexOf("gear6") > -1);

		// convert the service start date to a date
		service.startDate = $.date.parseISO8601(parameters.startDate) || "";
		
		// generate a list and map of the instances of this service
		service.instanceMap = {};

		service.instanceNames = $.map(service.instances, function(instance) {
			// point back to the service
			instance.service = service;
			instance.id = instance.ip + ":" + instance.port;
			
			// "name" of the instance varies based on the "mode"
			instance.name = (SP.config.mode == "cloud" ? instance.ip : instance.id);
			instance.gear6 = service.gear6;

			// make sure the rehashState is set
			if (!instance.rehashState) instance.rehashState = "disabled";
			if (instance.rehashState != "disabled") {
				instance._rehashMessage = $.message("instance.rehash.title",instance);
			}

			// add the instance to the global instances and instanceMap
			SP.instanceNames.push(instance.name);
			SP.instanceMap[instance.name] = instance;
			
			// add the instance to the service instance map
			service.instanceMap[instance.name] = instance;

			return instance.name;
		});

		var count = (service.instances ? service.instances.length : 0);
		service._type = (service._unnamed ? "Server" : "Pool");
		service._instanceCount = count;
	
		// define the "arch" of the service as the arch of the first instance
		service.arch = service.instances[0].arch;

		// process each instance
		service.memory = service.free = service.used = 0;
		if (service.instances) {
			$.each(service.instances, function(index, instance) {
				// sum the instance memory data for the service
				service.memory += instance.memory || 0;
				service.used += instance.used || 0;
				service.free += instance.free || 0;
			});
		}

		// start off expanded
		if (service._collapsed == null) service._collapsed = false;

		// create a tab for the service if necessary
		if (!service.tab) {
			service.tab = $($.string.interpolate($.templates.ServiceTabTemplate, service));
			$("#serviceTabs").append(service.tab);
		};

		// create a view for the service if necessary
		if (!service.view) {
			service.view = $($.string.interpolate($.templates.ServiceTemplate, service));
			$("#serviceDisplay").append(service.view);
		}
		
		// stick the service.tab and service.view at the end of their containers
		//	this will ensure that they're always in the same order as the config.xml file
		
		return service;
	},

	getInstanceReporterStatus : function(instance) {
		var globalReporterOff = SP.config.reporter != "on";
		if (globalReporterOff) {
			return "disabled";
		} else if (instance.reporter == "off") {
			return "false";
		} else if (instance.reporter == "view") {
			return "true";
		}
	},
	
	/** Return an object with data we'll use to show a usageGraph. */
	formatMemoryData : function(memory, free, used, label, hint) {
		if (!memory) memory = 0;
		if (!free) free = 0;
		if (!used) used = 0;
		if (!label) label = $.message("UI.memoryGraph.label");
		if (!hint) hint = $.message("UI.memoryGraph.hint");
		
		var data = {
			total : memory,
			totalGB : Math.round(memory * 100 / (1024*1024*1024)) / 100,
			
			free : free,
			freeGB : Math.round(free * 100 / (1024*1024*1024)) / 100,
			
			used : free,
			usedGB : Math.round(used * 100 / (1024*1024*1024)) / 100,
			
			freePercent : (memory == 0 ? "0%" : Math.round(free * 100 / memory) + "%"),
			usedPercent : (memory == 0 ? "0%" : Math.round(used * 100 / memory) + "%")
		}
		
		data.label = $.string.interpolate(label, data);
		data.hint = $.string.interpolate(hint, data);
		
		return data;
	},
	
	
	/** Destroy a service and associated screen representation. */
	destroyService : function(service) {
		// remove the service from the service list and service maps
		var name = service.name;
		if (name) {
			delete SP.serviceMap[name];
			var index = $.inArray(service, SP.services);
			if (index != -1) SP.services.splice(index, 1);
		}

		// if there is a tab for this service, remove it
		if (service.tab) {
			service.tab.remove();
			delete service.tab;
		}
		
		// if there is a view for this service, remove it
		if (service.view) {
			service.view.remove();
			delete service.view;
		}

		service.destroyed = true;
	},


	/** Create a new instance and assign it to service.
		NOTE: assumes that the instance does not already exist, but the service does!
	 */
	createInstance : function(service, parameters) {},
	
	/** Update an instance with new parameters. */
	updateInstance : function(instance, parameters) {},

	/** Destroy an instance and associated screen representation. */
	destroyInstance : function(instance) {},
	
	

	// initialize the different data series we can display
	initStatsViews : function() {},

	// initialize the different data series we can display
	initTrafficGraphs : function() {
		// stick the RangeSlider template in place
		$("#trafficSliderContainer").html($.templates.RangeSliderTemplate);
		
		var seriesMap = SP.dataSeriesMap;
		
		var trafficSelectors = "";
		
		// get names and colors of the series from the messages file
		for (var seriesId in seriesMap) {
			var series = seriesMap[seriesId];
			series.id = series.dataId = seriesId;
			series.title = $.message("traffic.title."+ seriesId);
			series.menu = $.message("traffic.menu."+ seriesId);
			series.color = $.message("traffic.color."+ seriesId);
			series.viewName = "traffic_"+series.id;
			
			// create a view for the series
			series.view = new TrafficView(series);

			// create the selector for the series
			trafficSelectors += $.string.interpolate($.templates.TrafficViewItemTemplate, series);
		}
		// stick all of the selectors in the trafficList
		$("#trafficList").html(trafficSelectors);
	},


	//
	//	show the current view
	//
	
	/** Refresh with data from the server. 
		Sequence is as follows:
			1) load config file (asynchronous)
			2) after that loads, it calls "SP.loadFromHash()" which loads the view again
			3) after all outstanding calls are executed, $.api will start the refresh timer again
	*/
	refresh : function() {
		SP.stopRefreshTimer();
		$.api.loadAppConfig();
	},

	/** Window resize -- tell the current view to resize (for chart view mostly). */
	resize : function() {
		// resize the main part of the UI to take up at least the full height of the window
		var topHeight = $("#top").height(),
			bottomHeight = $("#bottom").height(),
			windowHeight = $(window).height(),
			mainHeight = windowHeight - (bottomHeight+topHeight+20)
		;
		$("#main").css("minHeight", mainHeight);
		
		SP.resizeTabs();

		if (SP.view && SP.view.resize) SP.view.resize();
	},

	resizeTabs : function() {
		// get pointers to all of the pieces only once
		if (!SP._tabElements) {
			SP._tabElements = {
				tabs : $("#serviceTabs"),
				bar : $("#tabBar"),
				scroller : $(".TabScroller"),
				leftButton : $(".TabScrollLeft"),
				rightButton : $(".TabScrollRight")
			}
		}

		var tabsWidth = SP._tabElements.tabs.width(),
			barWidth  = SP._tabElements.bar.width()
		;
		if (tabsWidth == 0) return;
		
		if (tabsWidth > barWidth) {
			SP._tabElements.bar.addClass("scrolling");
		} else {
			SP._tabElements.bar.removeClass("scrolling");
		}
		
		SP.scrollTabsTo();
	},
	
	scrollTabsTo : function(newScrollLeft, fromTimer) {
		// if we're not scrolling, reset the scroll
		if (! SP._tabElements.bar.hasClass("scrolling")) {
			SP._tabElements.tabs.css("left", 0);
			return;
		}

		var startScroll = parseInt(SP._tabElements.tabs.css("left"));
		if (newScrollLeft == null) newScrollLeft = startScroll;
		var tabsWidth = SP._tabElements.tabs.width(),
			scrollerWidth = SP._tabElements.scroller.width(),
			minLeft = (scrollerWidth - tabsWidth)
		;
		newScrollLeft = Math.round(Math.min(0, Math.max(minLeft, newScrollLeft)));
		SP._tabElements.leftButton.toggleClass("disabled", (newScrollLeft == 0));
		SP._tabElements.rightButton.toggleClass("disabled", (newScrollLeft == minLeft));

		// if we're not scrolling from a timer, animate the scroll
		if (!fromTimer) {
			SP._tabElements.tabs.animate({left:newScrollLeft}, 100);
		} else {
			SP._tabElements.tabs.css("left", newScrollLeft);
		}
	},
	
	onTabScrollDown : function(button) {
		var delta = (button == "left" ? -20 : 20);
		button = SP._tabElements[button+"Button"];
		button.addClass("Selected");
		var interval;
		function scroll() {
			var tabsLeft  = parseInt(SP._tabElements.tabs.css("left"));
			SP.scrollTabsTo(tabsLeft - delta, true);
			if (button.hasClass("disabled")) stopScrolling();
		}
		function stopScrolling() {
			clearInterval(interval);
			button.removeClass("Selected");
		}

		interval = setInterval(scroll, 50);
		// register one-time handlers on mouseup to stop scrolling
		$(document.body).one("mouseup", stopScrolling);
		
		// scroll once immediately to handle a quick click
		scroll();
		return false;
	},
	
	/** Make sure the tab is visible in the scroll region */
	showTab : function(tab) {
		// if we're not scrolling, reset the scroll
		if (! SP._tabElements.bar.hasClass("scrolling")) SP.scrollTabsTo(0);

		// forget it if we're not scrolling
		if (! SP._tabElements.bar.hasClass("scrolling")) return;

		// don't show the overview tab
		var viewName = tab.attr("view");
		if (viewName == "overview") return;
		
		// Fudge numbers make the scrolling line up on the edges of the button
		var scrollLeftFudge = 0,
			scrollRightFudge = -2
		;
	
		tab = $(tab);
		if (tab.length == 0) return;
		
		var tabLeft = tab.position().left,
			tabRight = tabLeft + tab.outerWidth(),
			tabScroll = parseInt(SP._tabElements.tabs.css("left")),
			scrollerWidth = SP._tabElements.scroller.width(),
			visibleLeft = (-1 * tabScroll)
			visibleRight = visibleLeft + scrollerWidth
		;
		// if scrolled off to the left
		if (tabLeft < visibleLeft) {
			SP.scrollTabsTo( (-1 * tabLeft) + scrollLeftFudge);
		}
		// if scrolled off to the right
		else if (tabRight > visibleRight) {
			SP.scrollTabsTo((scrollerWidth - tabRight) + scrollRightFudge);
		}
	},


	// update the time range for the current chart
	// NOTE: this does NOT update the hash
	selectChartRange : function(start, end) {
		SP.trafficStart = start;
		SP.trafficEnd = end;
		SP.view.activate();
	},

	// return true if the selected service is a gear6 service
	showingGear6Item : function() {
		return (SP.getInstance().gear6 == true);
	},

	// server results have a number of interesting attributes encoded in the main element
	//	show some of them in the UI "chrome"
	updateChrome : function(data) {
		// update the last request timefield
		if (data.time) this.updateTime(data.time);
	},
	
	// update the 'last request time' field
	// NOTE: "dateString" is ALWAYS in GMT, and we ALWAYS want to display in GMT,
	//			so ignore the timezoneOffset in $.date.print() below
	updateTime : function(dateString) {
		var time = $.date.parseISO8601(dateString);
		if (time == null || isNaN(time)) return;
		// convert to a nice locale-string
		time = $.date.print(time, 0, true);
		$("#time").html(time);
	},
	 
 	//
 	// authorization
 	//
 
 	authStates : ['none', 'view', 'modify', 'super'],
 	logInItems : ['-chooseRole', 'view', 'modify'],//, 'super'],
 	logOutItems : ['-youCan', 'none','-orChooseRole', 'view', 'modify'],//, 'super'],
	setUpAuth : function() {
		$.menu.initialize(SP.logInItems, 
	        {
			    menuContainer : "#logInMenu",
				transformer   : SP.getAuthMessage,
				callback      : "SP.authMenuCallback(this)"
		   	}
		 );

		$.menu.initialize(SP.logOutItems, 
	        {
			    menuContainer : "#logOutMenu",
				transformer   : SP.getAuthMessage,
				callback      : "SP.authMenuCallback(this)"
		   	}
		 );

		SP.updateAuthDisplay();
	},
 
	/** Callback when the auth menu's value has changed. */
	authMenuCallback : function(element) {
		$.menu.hide();
		var newstate = element.getAttribute("itemvalue");
		if (SP.authStates.indexOf(newstate) > SP.authStates.indexOf(SP.authState)) {
			SP.showPasswordPrompt(SP.authState, newstate);
		} else {
			$.api.changeAuthorizationLevel(SP.authState, newstate, "");
		}
		SP.updateAuthDisplay();
		// do other authy stuff here
	},
	
	logOut : function() {
		$.api.changeAuthorizationLevel(SP.authState, "none", "");
	},
	
	updateAuthDisplay : function() {
		if (SP.config.role == "none") $("#accessLevelNotice").show();
		var message = $.message("auth.menu.title", {authState: SP.getAuthMessage(SP.authState)});
		$("#roleMenuButton").html(message);
	},
	 	
 	getAuthMessage : function(suffix) {
 		return $.message("auth.state."+suffix) || suffix;
 	},

	//
	//	poll interval
	//
	
	pollingIntervals : [5, 10, 15, 30, 60, "-", 120, 300, 600, "-", 0],
	setUpPolling : function() {
		$.menu.initialize(SP.pollingIntervals, 
						  {
							menuContainer : "#pollingMenu",
							transformer : SP.getPollMessage,
							callback : "SP.pollMenuCallback(this)"
						  }
		);
		
		SP.setPollInterval(parseInt($.cookies.get("statsproxy:refresh")), false);
	},
	
	/** Callback when the poll menu's value has changed. */
	pollMenuCallback : function(element) {
		$.menu.hide();
		var seconds = parseInt(element.getAttribute("itemvalue"));
		if (!isNaN(SP.pollInterval)) SP.setPollInterval(seconds);
	},
	
	/** Change the polling interval.  
		If setting to 0, stops refreshing.
		If setting to anything else, calls refresh immediately.
	 */
	setPollInterval : function(seconds, startTimer) {
		SP.pollInterval = parseInt(seconds);
		if (isNaN(SP.pollInterval)) SP.pollInterval = 15;
		
		$("#pollingInterval").html($.message("refresh.menu.title", 
											 {timeMessage: SP.getPollMessage(SP.pollInterval)}));

		// remember the value in a cookie for reload
		if ($.cookies.get("statsproxy:refresh") != ""+SP.pollInterval) {
			$.cookies.set("statsproxy:refresh", SP.pollInterval);
		}
		
		// restart the timer, as appropriate
		if (startTimer != false) SP.startRefreshTimer();
	},
	
	getPollMessage : function(seconds) {
		if (seconds == 0) {
			return $.message("refresh.off");
		} else if (seconds <= 60) {
			return $.message("refresh.seconds", {number:seconds});
		} else {
			return $.message("refresh.minutes", {number:seconds/60});
		}
	},

	/** Start the refresh timer.  Called automatically when refresh completes. */
	startRefreshTimer : function() {
		SP.stopRefreshTimer();
		if (SP.pollInterval != 0) {
			SP._refreshTimer = setTimeout(SP.refresh, SP.pollInterval * 1000);
		}
	},
	
	/** Stop the refresh timer. */
	stopRefreshTimer : function() {
		if (SP._refreshTimer) clearTimeout(SP._refreshTimer);
		delete SP._refreshTimer;
	},
	
		
	
	//
	//	event handlers from the UI
	//

	// click on one of the view selector items
	onViewClick : function(element) {
		var viewName = element.getAttribute("view");
		SP.selectView(viewName);
	},
	
	onServiceClick : function(element) {
		SP.selectService(element.getAttribute('service'), null, true);
	},
	
	onInstanceClick : function(element) {
		$.menu.hide();
		SP.selectInstance(element.getAttribute('itemvalue'), true);
	},
	
	onShowInstanceMenu : function(element) {
		$.menu.show(element, "#instancesMenu", SP.selectedInstance)	
	},
	
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

	showPasswordPrompt : function(oldLevel, newLevel) {
		var message = $.message("auth.prompt", {level: newLevel});
		var password = prompt(message);
		if (password == null) return;
		// CALL AUTH TO CLOUD HERE
		$.api.changeAuthorizationLevel(oldLevel, newLevel, password);
	},
	
	showSupportPage : function() {
		var firstInstance = SP.instanceMap[SP.instanceNames[0]];
		SP.vendorType = (firstInstance ? firstInstance.vendorType : "unknown"),
		SP.appNameString = $("#appname").html();
		
		var page = $.message("UI.support.link");
		var wd = window.open(page, "Gear6Support");
	},
	
	reloadPage : function() {
		window.location.reload();
	}
}

