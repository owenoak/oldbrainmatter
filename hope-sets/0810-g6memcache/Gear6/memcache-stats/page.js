// -*- Mode: javascript; tab-width: 4; javascript-indent-level: 4; indent-tabs-mode: t -*-

var
  MSEC_PER_HOUR = 60 * 60 * 1000,
  MSEC_PER_MINUTE = 60 * 1000
  ;

// TODO: convert this to our standard 'Page' concept ala the other
// pages in the system
var page = {
	testingOperations 	: Cookie.get("testingOperations") == "true",

	//
	//	URLs for getting the data for this screen
	//

	// get the list of services (from an XML file)
	serviceTreeUrl 		: '/admin/launch?script=xg&name=/memcache/config/service/**',
	serviceTreeTestUrl 	: '/test/data/memcache-stats/services.xml',

	// base url for getting the normal charts
	chartUrl			: '/admin/launch?script=rh&template=memcache-get-xml',
	chartTestUrl 		: '/test/data/memcache-stats/master_chart_response-small.xml?',	

	// url for determining the timzone offset
	timezoneUrl 		: '/admin/launch?script=rh&template=get_mc_stats',
	timezoneTestUrl		: '/test/data/memcache-stats/timezone.js',	

	// default selections for the details screen
	detailsDefaults		:  {
          detailsServices	: window.currentService || "Appliance",
          detailsType 		: "composite",
          // one hour time range
	  //          detailsRange		: (NOW.getTime() - (1 * MSEC_PER_HOUR)) 
	  //                                  + ":" + NOW.getTime(),
          detailsRange		: (new Date().getTime() - (1 * MSEC_PER_HOUR)) 
	                        + ":" + new Date().getTime(),
          detailsLive		: true
        },
	
	// tree of services and instances (initialized below page declaration);
	serviceTree : undefined,


	// id/title for the details 'service'
	detailsTabId 	: "$$details",
	detailsTabTitle: "Details",

	// id/title for the 'appliance'
	applianceId : "Appliance", 
	applianceTitle:"Appliance",
	
	// live/historical data indicator
	liveDataTitle : "Live Data",
	historicalDataTitle : "Historical Data",
	

	// 
	//	initialize the tabs  (called at the bottom of the page)
	//
	initTabs : function() {
            // figure out the initial tab to display
            //     (either 'Appliance' or a service's tab)
	    if (currentService == undefined) {
	      initialTab = page.serviceTree[0].id;
	    } else {
	      initialTab = currentService;
	    }

	    // create the tab container and add tabs for all services + details
	    page.statsTabs = new TabContainer({
	          id : "statsTabs",
		  onselect : page.selectServiceTab,
		  children : []
	    }).draw();
		
	    // add tabs for all of the services
	    page.serviceTree.forEach(function(service) {
			page.statsTabs.addTab({
				tabid : service.id,
				title : service.title || service.id,
				selected : (initialTab == service.id)
			});
	    });
		
	    // add the list of graph sections to the tabs (and hide them initially)
	    page.statsTabs.addChild.apply(page.statsTabs, page.graphSections);
	    page.hideGraphs();
	    
	    // add the details form (and hide it initially as well)
	    page.statsTabs.addChild(detailsForm);
	    page.hideDetails();
	    
// DO NOT select initial tab -- someone else is already doing this
//	    page.selectServiceTab(initialTab);

	    // set window.onresize to call our resize method
	    window.onresize = this.onResize.bind(this);
	    
	    // call resize to set sizes up properly
	    this.onResize();
        },


	onResize : function(event) {
		// only the details form has to be manually sized
		detailsForm.onResize();		
	},
	
	// select a service tab at the top of the screen
	selectServiceTab : function (serviceId) {
		page.currentTab = serviceId;
	
		if (serviceId == page.detailsTabId) {
			page.hideGraphs();
			page.showDetails();

		} else {
			page.hideDetails();
			page.showGraphs();
		}
	},

	// show the details tab (with an optional service specified)
	showDetails : function(serviceId) {
		serviceId = serviceId || window.currentService || "Appliance";
                //console.warn("showDetails");
		if (serviceId != null) {
			detailsForm.getControl("detailsServices").onSelectService(serviceId);
		} else {
		  if (currentService != "Appliance") {
		    detailsForm.getControl("detailsServices").onSelectService(currentService);
		  }
		}

		// actually show the form & the graph
		detailsForm.show();
		// enable the time slider (should happen automatically?)
		detailsForm.getControl("detailsRange").enable();

		// enable the detailsChart		
		if (page.detailsChart) page.detailsChart.enable();
		
		// and kick off an initial load of the data
		page.getDetailsChartData(detailsForm.value.data);
	},


	hideDetails : function() {
		detailsForm.hide();
		detailsForm.getControl("detailsRange").disable();
		if (page.detailsChart) {
			page.detailsChart.disable();
		}
	},
	
	
	// show and hide the normal graph sections
	showGraphs : function() {
		page.graphSections.invoke("show");

		// update the elements which hold the name of the service
		var title = (page.currentTab == page.applianceId ? 
						" Web Cache Appliance" : 
						" service '"+page.currentTab+"'"
					);
		$$(".serviceTitle").invoke("update", title);
	
		if (page.isGear6Service(page.currentTab)) {
			ChartSections.syncSection.show();
		} else {
			ChartSections.syncSection.hide();
		}
		if (page.currentTab == page.applianceId) {
			ChartSections.responseTimeSection.hide();
		} else {
			ChartSections.responseTimeSection.show();
		}
		MemcacheCharts.invoke("update");
	},
	
	hideGraphs : function() {
		page.graphSections.invoke("hide");
	},
	
	
	isGear6Service : function(serviceId) {
		return (packages[serviceId] == "memcached-gear6");
	},


	//	get the tree of services and instances from an XML file
	getServiceInfo : function() {
		var url = (page.testingOperations ? page.serviceTreeTestUrl : page.serviceTreeUrl),
			callParams = {
				method: "get",
				asynchronous: false,
				evalJS: false
			},
			response = new Ajax.Request(url, callParams)
		;
	
		var xml = response.transport.responseXML,

		    // list of services and instances
		    // 		NOTE: manually add the appliance and details row
		    serviceList = [
                        { id : page.applianceId,  title:page.applianceTitle  },
                        { id : page.detailsTabId, title:page.detailsTabTitle }
		    ],
 		    service = null
		;
		forEachTag(xml, "node", 
			   function(node){
			     var c = parseXMLRoot(node);
			     var a = c.name.split("/");
			     //    /memcache/config/service/NAME/image        = package name
			     //    /memcache/config/service/NAME/enable       = true/false
			     //	  /memcache/config/service/NAME/address/ADDR = IPADDR
			     // 0       1      2       3     4     5      6
			     // (split considers the null string before the initial
			     // slash to be the first element.  Uhhh, OK.
			     //console.log("@ ("+a.length+")"+c.name);
			     switch(a.length) {
			     case 5:
			       // console.log("* service "+a[4]);
			       service = { id : a[4],
					   image: "",
					   instances : []
			       };
			       serviceList.push(service);
			       break;
			     case 6:
			       if (a[5] == "image") {
				 service.image = c.value;
			       } else if (a[5] == "enable") {
				 service.enable = c.value;
			       }
			     case 7:
			       if (a[5] == "address") {
				 // console.log("**	address "+a[6]);
				 service.instances.push({id: a[6]});
			       } else {
				 // console.log("--	skipping "+c.name);
			       }
			       break;
			     default:
			       // console.log("--	skipping "+c.name);
			     }
			   }
		);
		return serviceList;
	},
	
	// the details form has been updated -- update the data!
  getDetailsChartData : function(data) {
    // forget it if the details tab page is not currently visible
    if (page.currentTab != page.detailsTabId) return;
    
    if (data == null) data = detailsForm.value.data;
    
    // console.log("update chart: ", data);
    getDetailsChartData(data);
    // getDetailsChartData will do the setXML()
    var service = detailsForm.getControl("detailsServices").openService;
  },

  getTimezoneInfo : function() {
      var url = (page.testingOperations ? page.timezoneTestUrl : page.timezoneUrl),
            callParams = {
            method: "post",
            asynchronous: false,
            evalJS: false,
            postBody: "", 
        };

        // we have the request, send it
      var response = new Ajax.Request(url, callParams);
      eval(response.transport.responseText);
   }
}

// load the services tree data up-front
page.serviceTree = page.getServiceInfo();
// get timezone info too.
page.getTimezoneInfo();


// variables to set up the tick marks and start/end ranges in the time slider
var NOW = new Date(),
	SLIDER_RANGE_START = NOW.getTime() - Date.MSEC_IN_ONE_DAY,
	SLIDER_RANGE_END = NOW.getTime(),
	
	// TODAY and YESTERDAY are used to set up the slider ticks and tick labels
	//	they are RELATIVE TO THE SERVER TIMEZONE
	TODAY = new Date(NOW.clone().set(0,0,0) - Date.prototype.timeZoneOffset||0),
	YESTERDAY = TODAY.clone().addDays(-1)
;



//
// Create a custom Chart object specific to these graphs
//
var MemcacheChart = Class.create(Chart, {
	klass	: "MemcacheChart",
		
	initializeProperties : function($super) {
		$super();

		var baseUrl = (page.testingOperations ? page.chartTestUrl : page.chartUrl);

		if (this.chds == null) {
			// master chart
			this.applianceURL = baseUrl + "&var_op=series";
			this.serviceURL  = baseUrl + "&var_op=series&var_service=";
			this.width	= (Prototype.Browser.IE ? "680" : "100%");
			this.height   = "300";
   
		} else {
			this.applianceURL = baseUrl + "&var_op=ops&var_mcop=" + this.chds;
			this.serviceURL  = baseUrl + "&var_op=ops&var_mcop=" + this.chds + "&var_service=";
			this.width	= (Prototype.Browser.IE ? "320" : "100%");
			this.height   = "150";
		} 
	},

	getUpdateUrl : function() {
		return (page.currentTab == page.applianceId ? 
					this.applianceURL : 
					this.serviceURL + page.currentTab
				);
	}
});

var ChartSection = Class.create(Section, {
	klass : "ChartSection",
	show : function() {
		this.$main.style.display = "block";
		if (this.expanded) this.enableChildren();
	}
});


// create the sections for the different graphs
page.graphSections = [
	 new ChartSection({
		id	: "masterSection",
		cookieId  : "masterSection",
		templateId : "ChartMasterSectionTemplate",
		children  : [
					 new MemcacheChart({ 
						parentId:"masterSection_Master", 
								 id	: "Master", 
								 chds  : null,
								 title : "Overall Statistics for" 
						})
					 ]
	}),
 
	 new ChartSection({
		id	: "getsHitsSection",
		cookieId  : "getsHitsSection",
		templateId   : "ChartSectionTemplate",
		expanded  : false,
		children  : [
					 new MemcacheChart({ 
						 parentId:"getsHitsSection_Get_Hits", 
								 id	: 'Get_Hits',
								 chds  : 'get_hits',
								 title : "Get Hits/sec for" }),
					 new MemcacheChart({ 
						 parentId:"getsHitsSection_Get_Misses", 
								 id	: 'Get_Misses', 
								 chds  : 'get_misses', 
								 title : "Get Misses/sec for" })
					 ]
	}),
 
	 new ChartSection({
		id	: "getsSection",
		cookieId  : "getsSection",
		templateId   : "ChartSectionTemplate",
		expanded  : false,
		children  : [
					 new MemcacheChart({ parentId:"getsSection_Gets",  id: 'Gets',	chds: 'cmd_get', title: "Gets/sec for" }),
					 new MemcacheChart({ parentId:"getsSection_Sets",   id: 'Sets',	chds: 'cmd_set', title: "Sets/sec for" })
					 ]
	}),
 
	 new ChartSection({
		id	: "bytesSection",
		cookieId  : "bytesSection",
		templateId   : "ChartSectionTemplate",
		expanded  : false,
		children  : [
			new MemcacheChart({ 
				parentId:"bytesSection_Bytes_Written",   
				id: 'Bytes_Written',  
				chds: 'bytes_written', 
				title: "Bytes Sent/sec for" }),
			new MemcacheChart({ 
				parentId:"bytesSection_Bytes_Read",   
				id: 'Bytes_Read',  
				chds: 'bytes_read', 
				title: "Bytes Received/sec for" })
		 ]
	}),
 
	 new ChartSection({
		id	: "evictionsSection",
		cookieId  : "evictionsSection",
		templateId   : "ChartSectionTemplate",
		expanded  : false,
		children  : [
			 new MemcacheChart({ 
				 parentId:"evictionsSection_Evictions",  
				 id: 'Evictions',   
				 chds: 'evictions',   
				 title: "Evictions/sec for" }),
			 new MemcacheChart({ 
				 parentId:"evictionsSection_Items",  
				 id: 'Items',  
				 chds: 'curr_items',  
				 title: "Items for" })
		]
	}),
 
	 new ChartSection({
		id	: "itemsSection",
		cookieId  : "itemsSection",
		templateId   : "ChartSectionTemplate",
		expanded  : false,
		children  : [
			 new MemcacheChart({ 
				 parentId:"itemsSection_Connection_Structures",   
				 id: 'Connection_Structures',
				 chds: 'connection_structures',  
				 title: "Connection Structures for" }),
			 new MemcacheChart({ 
				 parentId:"itemsSection_Connections",   
				 id: 'Connections',  
				 chds: 'curr_connections', 
				 title: "Connections for" })
		 ]
	}),
 
	new ChartSection({
		id		: "responseTimeSection",
		cookieId   : "responseTimeSection",
		templateId : "ChartSectionTemplate",
		expanded   : false,
		children   : [
			new MemcacheChart({ 
			      parentId :"responseTimeSection_getTimeUs", 
			      id: 'getTimeUs',
			      chds: 'getTimeUs', 
			      title: "Get Response time (us) for" }),
			new MemcacheChart({ 
			      parentId :"responseTimeSection_setTimeUs", 
			      id: 'setTimeUs',
			      chds: 'setTimeUs', 
			      title: "Set Response time (us) for" })
		
		]
	      }),

	new ChartSection({
		id		: "syncSection",
		cookieId   : "syncSection",
		templateId : "ChartSectionTemplate",
		expanded   : false,
		children   : [
			new MemcacheChart({ 
				parentId :"syncSection_sync_queue_size1", 
				id: 'Sync_Queue_Size1',
				chds: 'sync_queue_size1', 
				title: "Sync Queue size (instance 1) for" }),
			new MemcacheChart({ 
				parentId:"syncSection_sync_queue_size2",	
				id: 'Sync_Queue_Size2',   
				chds: 'sync_queue_size2',  
				title: "Sync Queue size (instance 2) for" })
		]
	})
];

/* NEW Details tab */ 
var detailsForm = new DynaForm({
	visible 	: false,
	id 		: "statsDetails",

	// get the list of default parameters from page.detailsDefaults
	value		: new DataWidget({ data : page.detailsDefaults }),


	onAfterDraw : function() {
		// create the chart BEFORE calling onAfterDraw()
		page.detailsChart = new Chart(
			{ 
			    parentId:'detailsChartContainer',   
			    id: 'detailsChart',
			    width:  (Prototype.Browser.IE ? "500" : "100%"), // NOTE: IE can't do 100%
			    height: (Prototype.Browser.IE ? "255" : "100%"),
			    flashFileUrl : '/charts/StackedArea2D.swf?ChartNoDataText=Loading, please wait...',
			    autoUpdate : false
			    //so looks like you could have a custom "onUpdateSucceeded" in the page.detailsChart
			    //which called the getDetailsChartData function explicitly
			    //(remember to set 'autoUpdate' to true in the chart if you do this)
			    // XXX
			}
		);
		page.detailsChart.draw();

		DynaForm.prototype.onAfterDraw.apply(this);
	},

	// TODO: make this call page.fetchDetailsChartData()
	onControlChanged : function(control) {
		DynaForm.prototype.onControlChanged.call(this, control);

		// call the 'getDetailsChartData' routine which will fetch the new data from the server
		// ONLY DO THIS IF THE CONTROL IS DEFINED
		//	OTHERWISE WE'LL CALL THIS TWICE ON INIT
		if (control) page.getDetailsChartData(this.value.data);

		// show/hide the "live data" indicator
		var indicatorTitle = (this.value.data.detailsLive ? 
				      page.liveDataTitle : 
				      page.historicalDataTitle
				      );
		statsData.indicatorTitle = indicatorTitle;
		// $$("#liveDataIndicator .inner")[0].innerHTML = indicatorTitle;
	},
	
	
	controls 	: [
		new ItemSelector({
			id : "detailsType",
			reference : "detailsType",
			options : {
				"composite"			: "Overall Statistics",
				"get_hits"			: "Get Hits/sec",
				"get_misses"			: "Get Misses/sec",
				"cmd_get"			: "Gets/sec",
				"cmd_set"			: "Sets/sec",
				"bytes_written"			: "Bytes Sent/sec",
				"bytes_read"			: "Bytes Received/sec",
				"evictions"			: "Evictions/sec",
				"curr_items"			: "Items",
				"curr_connections"		: "Connections",
				"connection_structures"	        : "Connection Structures",
				"setTimeUs"                     : "Set Response Time (us)",
				"getTimeUs"                     : "Get Response Time (us)",
				"connectTimeUs"               : "Connect Time (us)"
				// "sync_queue_size"		: "Sync Queue Size"
			},
			optionClasses : {
				// "sync_queue_size"		: "gear6OnlyOption"
				"setTimeUs": "serviceOnlyOption",
				"getTimeUs": "serviceOnlyOption",
				"connectTimeUs": "serviceOnlyOption",
			},
			optionColours : {
				"get_hits" :     "99CC00",
				"get_misses" :   "B42D33",
				"cmd_get" :      "F47836",
				"cmd_set" :      "005C8A",
				"bytes_read" :   "005c8A",
				"bytes_written": "F47836",
				"evictions" :    "DE006B",
				"curr_items" :   "666666",
				"connection_structures" :   "333333",
				"curr_connections" :   "333333",
				"setTimeUs" : "005C8A",
				"getTimeUs" : "F47836",
				"connectTimeUs" : "333333",
		    }
		}),

		new ServiceTreeSelector({
			id : "detailsServices",
			reference : "detailsServices",
			services : page.serviceTree
		}),

		new TimeRangeSlider({
			id : "detailsRange",
			changeOn : "up",
			reference : "detailsRange",
			trackMin : SLIDER_RANGE_START,	// (defined at top of file)
			trackMax : SLIDER_RANGE_END,	// (defined at top of file)
			trackWidth : "100%",
			minRange   : 5 * MSEC_PER_MINUTE,
			showNowIndicator : true,

			// custom setValue to note in the form when they're in the 'live' state
			setValue : function(value, updateElement) {
				TimeRangeSlider.prototype.setValue.apply(this, arguments);
				this.controller.value.data.detailsLive = (Math.abs(this.rangeEnd - this.trackMax) < 1000);
				// if we're getting historical data, put up a "loading" display
				if (!this.controller.value.data.detailsLive) {
				  page.detailsChart.setXML("<chart></chart>");
				}
			},

			ticks : [
				// midnight YESTERDAY
				[	YESTERDAY.getTime(), YESTERDAY.toRangeString(true,0), "StrongRangeTick"],
				[	YESTERDAY.getTime() + ( 1 * MSEC_PER_HOUR), "", "LightRangeTick"],
				[	YESTERDAY.getTime() + ( 2 * MSEC_PER_HOUR), "", "LightRangeTick"],
				[	YESTERDAY.getTime() + ( 3 * MSEC_PER_HOUR), "", "LightRangeTick"],
				[	YESTERDAY.getTime() + ( 4 * MSEC_PER_HOUR), "", "LightRangeTick"],
				[	YESTERDAY.getTime() + ( 5 * MSEC_PER_HOUR), "", "LightRangeTick"],
				[	YESTERDAY.getTime() + ( 6 * MSEC_PER_HOUR), "6:00", "RangeTick"],
				[	YESTERDAY.getTime() + ( 7 * MSEC_PER_HOUR), "", "LightRangeTick"],
				[	YESTERDAY.getTime() + ( 8 * MSEC_PER_HOUR), "", "LightRangeTick"],
				[	YESTERDAY.getTime() + ( 9 * MSEC_PER_HOUR), "", "LightRangeTick"],
				[	YESTERDAY.getTime() + (10 * MSEC_PER_HOUR), "", "LightRangeTick"],
				[	YESTERDAY.getTime() + (11 * MSEC_PER_HOUR), "", "LightRangeTick"],
				[	YESTERDAY.getTime() + (12 * MSEC_PER_HOUR), "12:00", "RangeTick"],
				[	YESTERDAY.getTime() + (13 * MSEC_PER_HOUR), "", "LightRangeTick"],
				[	YESTERDAY.getTime() + (14 * MSEC_PER_HOUR), "", "LightRangeTick"],
				[	YESTERDAY.getTime() + (15 * MSEC_PER_HOUR), "", "LightRangeTick"],
				[	YESTERDAY.getTime() + (16 * MSEC_PER_HOUR), "", "LightRangeTick"],
				[	YESTERDAY.getTime() + (17 * MSEC_PER_HOUR), "", "LightRangeTick"],
				[	YESTERDAY.getTime() + (18 * MSEC_PER_HOUR), "18:00", "RangeTick"],
				[	YESTERDAY.getTime() + (19 * MSEC_PER_HOUR), "", "LightRangeTick"],
				[	YESTERDAY.getTime() + (20 * MSEC_PER_HOUR), "", "LightRangeTick"],
				[	YESTERDAY.getTime() + (21 * MSEC_PER_HOUR), "", "LightRangeTick"],
				[	YESTERDAY.getTime() + (22 * MSEC_PER_HOUR), "", "LightRangeTick"],
				[	YESTERDAY.getTime() + (23 * MSEC_PER_HOUR), "", "LightRangeTick"],
				// midnight TODAY
				[	TODAY.getTime(), TODAY.toRangeString(true,0), "StrongRangeTick"],
				[	TODAY.getTime() + ( 1 * MSEC_PER_HOUR), "", "LightRangeTick"],
				[	TODAY.getTime() + ( 2 * MSEC_PER_HOUR), "", "LightRangeTick"],
				[	TODAY.getTime() + ( 3 * MSEC_PER_HOUR), "", "LightRangeTick"],
				[	TODAY.getTime() + ( 4 * MSEC_PER_HOUR), "", "LightRangeTick"],
				[	TODAY.getTime() + ( 5 * MSEC_PER_HOUR), "", "LightRangeTick"],
				[	TODAY.getTime() + ( 6 * MSEC_PER_HOUR), "6:00", "RangeTick"],
				[	TODAY.getTime() + ( 7 * MSEC_PER_HOUR), "", "LightRangeTick"],
				[	TODAY.getTime() + ( 8 * MSEC_PER_HOUR), "", "LightRangeTick"],
				[	TODAY.getTime() + ( 9 * MSEC_PER_HOUR), "", "LightRangeTick"],
				[	TODAY.getTime() + (10 * MSEC_PER_HOUR), "", "LightRangeTick"],
				[	TODAY.getTime() + (11 * MSEC_PER_HOUR), "", "LightRangeTick"],
				[	TODAY.getTime() + (12 * MSEC_PER_HOUR), "12:00", "RangeTick"],
				[	TODAY.getTime() + (13 * MSEC_PER_HOUR), "", "LightRangeTick"],
				[	TODAY.getTime() + (14 * MSEC_PER_HOUR), "", "LightRangeTick"],
				[	TODAY.getTime() + (15 * MSEC_PER_HOUR), "", "LightRangeTick"],
				[	TODAY.getTime() + (16 * MSEC_PER_HOUR), "", "LightRangeTick"],
				[	TODAY.getTime() + (17 * MSEC_PER_HOUR), "", "LightRangeTick"],
				[	TODAY.getTime() + (18 * MSEC_PER_HOUR), "18:00", "RangeTick"],
				[	TODAY.getTime() + (19 * MSEC_PER_HOUR), "", "LightRangeTick"],
				[	TODAY.getTime() + (20 * MSEC_PER_HOUR), "", "LightRangeTick"],
				[	TODAY.getTime() + (21 * MSEC_PER_HOUR), "", "LightRangeTick"],
				[	TODAY.getTime() + (22 * MSEC_PER_HOUR), "", "LightRangeTick"],
				[	TODAY.getTime() + (23 * MSEC_PER_HOUR), "", "LightRangeTick"],
				// range start and end
				[ 	SLIDER_RANGE_START, new Date(SLIDER_RANGE_START).toRangeString(true), "StrongRangeTick"]
//				[	NOW.getTime(), "Now", "StrongRangeTick"]	// END IS DONE AUTOMATICALLY
			]
		})
	],

    FormTemplate : new Template("\
		<div class='DynaForm StatsDetailsForm'>\
		  <table width='100%' height='100px' cellspacing=0 cellpadding=0 Xborder=2>\
		    <tr> \
			<td class='rightColumn'>\
			<table class='rightColumn' height='100%' cellspacing=0 cellpadding=0>\
		  	  	<tr><td> \
					<div class='Section roundALLmedium NoExpand'>\
					<div class='SectionHeader roundTOPmedium noselect'>\
					<div class='SectionHeaderCell SectionTitle'>Show Graph:</div>\
					</div>\
						<div class='SectionBody roundBOTTOMmedium SectionBodyCell' \
						style='width:80%'> \
					  <span id='detailsType'></span> \
						   </div> \
					 </div> \
				 </td></tr>\
			     <tr><td height=100% style='padding-top:10px'>\
					<div class='Section roundALLmedium NoExpand'>\
						<div class='SectionHeader roundTOPmedium noselect'> \
						<div class='SectionHeaderCell SectionTitle'>For:</div>\
						</div>\
						<div class='rightColumn SectionBody SectionBodyScroll roundBOTTOMmedium SectionBodyCell'>\
						<span id='detailsServices'></span>\
					</div> \
					</div>\
			    </td></tr>\
			</table>\
					</td>\
					<td class='mainColumn' style='vertical-align:top'>\
						<table class='mainColumn' height='100%' cellspacing=0 cellpadding=0>\
							<tr><td height=100% style='vertical-align:top'>\
									<div class='Section roundALLmedium NoExpand' style='height:98%; background:white'>\
										<div id='detailsChartContainer' style='width:98%;height:98%;'></div>\
									</div>\
							</td></tr>\
							<tr><td style='height:65px;padding-top:10px'>\
									<div class='Section roundALLmedium NoExpand' style='height:65px'>\
										<div class='SectionBody roundALLmedium SectionBodyCell' \
											style='width:auto;padding:10px 25px 10px 15px;'>\
											<span id='detailsRange'></span>\
										</div>\
									</div>\
							</td></tr>\
						</table>\
					</td>\
				</tr>\
			</table>\
		</div>\
	")	
});



page.initTabs();


