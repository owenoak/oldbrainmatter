/*
	PageManager class:
	Copyright (c) 2010, MapR Technology.  All rights reserved.


	Duties:
		- Loads mapr.Pages in and out of memory.
		- Manages browser back-and-forth buttons via Ext.History
		- Manages ui.refreshTimer, keeping track of when dialogs are open, etc.

 */

(function() {	// begin hidden from global scope

// global pointer to the mage map
window.pages = {};

window.PM = PageManager = Ext.apply(new Ext.util.Observable, {

	//
	//	debug -- set the following to true to debug the page loading process
	//
	DEBUG : Ext.util.Cookies.get("debugPM"),
	
	
	//
	//	properties
	//

	// map of page.id -> page object
	pages : window.pages,
	
	// id of the default start page if none is specified in the initial hash
	//	or if we can't find a page
	//	set in src/pages.js
	startPage : undefined,
	
	// pointer to the current page we're displaying
	active : undefined,

	// pointer to the "next" page to display (see PM.show() )
	//	used when the user tries to navigate to a page that is not yet loaded
	next : undefined,


	//
	//	public methods
	//

	
	// They've just logged in successfully.
	//	Figure out what to show based on:
	//		- window.hash
	//		- cookie uiLastPage
	//		- PM.startPage
	// (called anonymously)
	onLoggedIn : function() {
		var hash = (""+window.location.hash).substr(1),
			cookie = Ext.util.Cookies.get("uiLastPage")
		;
		// clear the cookie if it was set before
		if (cookie) Ext.util.Cookies.clear("uiLastPage");

		if (hash) {
			if (PM.DEBUG) console.warn("PM.onLoggedIn(): starting with hash: ",hash);
			PM.onHistoryChange(hash);
		} else if (cookie) {
			if (PM.DEBUG) console.warn("PM.onLoggedIn(): starting with cookie: ",cookie);
			PM.onHistoryChange(cookie);		
		} else {
			if (PM.DEBUG) console.warn("PM.onLoggedIn(): showing startPage: ",PM.startPage);
			PM.show(PM.startPage);
		}

		PM.refresh.setCondition("loggedOut", false);
		
	},
	
	// They've just logged out.
	//	Remember the current page in a cookie so we can reload that page on login.
	// (called anonymously)
	onLoggedOut : function() {
		var hash = (""+window.location.hash).substr(1);
		Ext.util.Cookies.set("uiLastPage", hash);

		PM.refresh.setCondition("loggedOut", true);
	},
	
	
	// Register a page.
	register : function(page) {
		PM.pages[page.id] = page;
	},

	// Return a pointer to a registered page, specified by id or by pointer.
	// NOTE: the page may not be fully loaded!
	get : function(pageId) {
		var page = (typeof pageId === "string" ? PM.pages[pageId] : pageId);
		if (!page || !page.isAPage) throw "PageManager.get("+pageId+"): page not found";
		return page;
	},

	
	// Show a particular page.
	//	state is the "state" of the page, generally a hash string
	show : function(page, state, callback) {
		if (PM.DEBUG) console.info("PM.show(",[page,state,callback],")");
		try {
			page = PM.get(page);
		} catch (e) {
			console.info("Couldn't load page: ",e);
			return PM.show(PM.startPage);
		}

		// try to activate the page
		//	this will return false if the page is currently loading
		var loaded = page.activate(state, callback);
//TODO: handle "dialog" and "window" type pages differently???
		if (!loaded) {
//TODO: show loading message?
			if (PM.DEBUG) console.info("page "+page," is loading");
			this.next = page;
		}
	},
	
	
	// Called when a page finishes showing
	showing : function(page) {
		if (PM.DEBUG) console.info("page "+page," is showing");
		this.active = page;
		window.page = page;
		delete this.next;
	},
	
	// page has finished loading
	//	if it is PM.next, we'll activate it
	pageLoaded : function(page) {
		if (page === this.next) this.show(page);
	},
	
	
	// Called by Ext.History when the location.hash changes.
	//	We use this to update the current page.
	onHistoryChange : function(hash) {
		hash = unescape(hash);
		if (PM.DEBUG) console.warn("history change "+hash);
		hash = hash.split(":");
		var pageId = hash[0], 
			state = hash.slice(1).join(":"),
			page
		;
		try {
			page = this.get(pageId);
		} catch (e) {
			return this.onHistoryChange(this.startPage);
		}
		
		if (this.active === page && page.state === state) return;
		if (PM.DEBUG) console.info("PM.onHistoryChange(): showing page from history ",[page,state]);
		this.show(page, state);
	},
	
	
	// Set the location.hash, generally because we've navigated to a new page.
	setHistory : function(hash) {
		Ext.History.add(hash);
	},
	

	
	//
	//	refresh timer stuff
	//
	refresh : {
		// default refresh timer delay -- 15 seconds
		delay : 15000,
		
		// pointer to the current refresh timer
		_timer : undefined,
		
		// conditions:  we only run the refresh timer if all of these states are false
		_skipRefreshConditions : {},

		// set a refresh condition -- may start the refresh timer if all conditions are met
		setCondition : function(condition, state, fireImmediately) {
			if (PM.DEBUG) console.info("PageManager.refresh.setCondition(",condition,",",state,")");
			// set the state in our condition variable
			this._skipRefreshConditions[condition] = !!state;
			
			// check the conditions to see if we should start the timer again
			this._checkAndRestart(fireImmediately);
		},
		
		// check the skipRefreshConditions to see if we should start the timer
		//	if fireImmediately is true and all conditions are false, we _fire() right away.
		_checkAndRestart : function(fireImmediately) {
			var conditions = this._skipRefreshConditions;

			// if ANY conditions are truthy, we should NOT start the timer
			for (var key in conditions) {
				if (conditions[key]) {
					this._stop();
					return;// console.info("condition "+key+" is true");
				}
			}
			
			// NONE of the conditions are truthy -- start the timer
			if (fireImmediately) 	this._fire();
			else					this._start();
		},
		
		// start the refresh timer
		_start : function() {
			this._stop();
			this._timer = setTimeout(function(){ PM.refresh._fire() }, this.delay);
		},
		
		// stop the refresh timer
		_stop : function() {
			if (this._timer) clearTimeout(this._timer);
			delete this._timer;
		},
		
		// fire the refresh timer and restart the timer if appropriate
		_fire : function() {
			this._stop();
//			console.warn("PM.refresh._fire()");
			PM.fireEvent("refresh", this);
			this._checkAndRestart();
		}
	},
	
	
	toString : function() { return "PageManager" }
	
});	// end PageManager


// add events that others can listen to
PM.addEvents("refresh", "pageLoad", "pageUnload");

// observe api.login events to start/start the refresh timer
api.on("loggedOut", PM.onLoggedOut);
api.on("loggedIn", PM.onLoggedIn);




//
//	watch the history manager "change" event to show the proper page
//
Ext.History.on("change", PM.onHistoryChange, PM);

// initialize the history manager
//	NOTE: you MUST create a hidden field and iFrame in your page (yuck), eg:
//		<form id="history-form" class="x-hidden">
//		    <input type="hidden" id="x-history-field" />
//		    <iframe id="x-history-frame"></iframe>
//		</form>
Ext.History.init();

})();			// end hidden from global scope
