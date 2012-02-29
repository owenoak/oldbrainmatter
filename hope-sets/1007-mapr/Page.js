/*
	Page class, encapsulates loadable 'pages' of functionality.

	Individual pages we can show are actually initialized in the file "pages.js", 
	which is loaded after this file.
	
	Copyright (c) 2010, MapR Technology.  All rights reserved.
 */

(function() {	// begin hidden from global scope


mapr.Page = Ext.extend(Ext.util.Observable, {
	// flag so we know when we're dealing with a Page object
	isAPage : true,
	
	// Construct with arbitrary configuration parameters.
	// Also registers the page and makes the pageSelector automatically.
	constructor : function(cfg) {
		if (cfg) Ext.apply(this, cfg);
		if (!this.id) throw "Pages must specify an id parameter";
		PageManager.register(this, id);
		this.makePageSelector();

		// necessary for dirtybuttons to work...
		this.addEvents("formchanged");
	},

	//
	//	instance properties
	//
	
	// Id of the page.  Must be a legal id, eg:  "nodes"
	//	Pages register with the PageManager via id after being created.
	//  Also serves as:
	//		- the primary hash identifier for the page.
	//	
	id : undefined,
	
	// Name of the page's section for the pageSelector (will be translated).
	section : undefined,
	
	// "state" that the UI is displaying, from the hash state
	// Each page can only be in one state at a time.
	state : "",
	
	// Callbacks to execute when the page UI is activated
	// These are set by passing callbacks into page.activate().
	//
	// Note that 
	activateCallbacks : undefined,
	

	// Type of this page:
	//		"tab" 		== full-screen page, in the outer tab bar
	//		"wizard"	== (FUTURE) step-by-step wizard which overlays current page
	//		"dialog"	== (FUTURE) modal pop-up dialog which overlays current page
	//		"window"	== (FUTURE) non-modal window
	//		"portlet"	== (FUTURE) portlet for the home page
	type : "tab",

	// Title of this page, as shown in the PageSelector.
	title : undefined,

	// Has the page been fully loaded into memory?
	//	Values: false (unloaded), true (fully loaded), "loading" (loading underway).
	loadState : false,
	
	// Array of script files to load when loading the page.
	scripts : undefined,
	
	// Array of css files to load when loading the page.
	styles : undefined,
	
	
	// Top-level UI object for your page (likely a Panel or a Window).
	// Created/accessed by page.createUI();
	//
	// You should count on this control being destroyed() at any time, 
	//	and be able to re-create it easily.
	ui : undefined,
	
	
	// We assume that all pages, regardless of type, are rendered in some container.
	// Created/accesses by page.getPart("container");
	//
	// For page.type=="page" components, this is a tab in the ui.main tabPanel.
	// For page.type=="window" components, this is a Window, etc.
	container : undefined,
	
	
	// "Parts" of the page
	// 	partName -> cfg object(s) for the pieces that make up the page.
	//
	//	Use page.getPart(partName) or page.getParts(partName) to instantiate the parts.
	//	After that, the part(s) will be available as page[partName].
	//
	//	To inherit part config from a superclass, initialize your parts with:
	//	
	//		parts : {
	//			...
	//			somePart : util.mergeDefaults(superclass.prototype.parts.somePart, {...})
	//			...
	//		}
	//
	parts : {
		
		// ui defaults
		ui : {
			xtype : "panel",
			layout : "border"		// Note: we actually have doubly-nested BorderLayouts
		},

	
		// defaults for outer component for tab-type pages
		container : {
			xtype : "panel",
			layout : "fit",
			bodyCssClass : "transparent"
		},
		
		// set up pointers and events for tab-type page outer components
		containerDefaults : function() {
			return {
				page:this, 
				title:this.title,
				listeners : {
					"activate" : this.onContainerActivated,
					"deactivate" : this.onContainerDeactivated,
					"beforeclose" : this.onBeforeCloseContainer,
					"close" : this.onCloseContainer,
					scope : this
				}
			};
		},
		
		// window buttons -- default is references to other parts
		buttons : [
			"@okButton",
			"@cancelButton"
		],
		
		// default ok button
		okButton : {
			xtype : "button",
			plugins : "dirtybutton",
			title : $tx("OK"),
			disableWhenClean : true,
			disableWhenSaving : true,
			handler:function() {
				this.owner.onSave(true);
			}
		},
		
		// default apply button
		applyButton : {
			xtype : "button",
			plugins : "dirtybutton",
			title : $tx("Apply"),
			disableWhenClean : true,
			disableWhenSaving : true,
			handler:function() {
				this.owner.onSave(false);
			}
		},

		// default cancel/close button
		cancelButton : {
			xtype : "button",
			plugins : "dirtybutton",
			title : $tx("Close"),
			dirtyTitle : $tx("Cancel"),
			handler:function() {
				this.owner.onCancel();
			}
		}

	},
	

	//
	//	instance methods
	//
	
	// "activate" the page:
	//	- load it if necessary (and a later callback will activate our UI again)
	//	- otherwise calls activateUI to actually show
	//
	//  <state> is a state string (eg: from the url #hash)
	//	<callbacks> is an array of methods to call when we've finished activating
	//
	//	NOTE: if we end up NOT activating right away (cause someone else snuck in
	//			before we finished loading) <callbacks> will NOT be executed.
	activate : function(state, callbacks) {
		if (PM.DEBUG) console.info(this+".activate(",state,",",callbacks,"): loadState:", this.loadState);
		if (state === undefined) state = this.state;
		this.setState(state);
		if (callbacks !== undefined) this.activateCallbacks = callbacks;

		// if we haven't been loaded at all, load now
		if (this.loadState === false) {
			this._load();
		}

		// if we're already fully loaded, just activate the UI
		if (this.loadState === true) {
			PM.active = this;
			this._activateUI();
			return true;
		}

		// return false to signal that we've not finished loading
		return false;
	},
	
	
	// (private) "activate" the page UI with the current page.state
	//	Assumes that the page is already loaded.
	//	This will create the page UI elements if necessary.
	//	This will also ensure that we're showing according to page.state.
	//
	// NOTE: this will be completely different for different page.types
	_activateUI : function() {
		if (PM.DEBUG) console.info(this+"_activateUI");
		// if our UI has not already been created, create it and return immediately
		//	(it will call activateUI again)
		if (!this.ui) {
			this.createUI();

			var container = this.getContainer();
			container.add(this.ui);

			// init plugins AFTER the UI has been set up
			this.initPlugins();

//TODO: make this an event?
			this.afterCreateUI();
		}
		
		// activate our main component (tab or window)
		this.activateContainer();

		// show the current page state (set before we get here)
		this.showState();
		
		if (this.type == "tab") PM.showing(this);
		
		// save the "state" of the page in the hash
		this.saveState();		

		// notify that we've been activated
		this.afterActivateUI();
		
		// do the first refresh immediately
		//	later refreshes will come from the PageManager
		this.refresh();
		
		return true;
	},
	

	// called after UI is activated
//TODO: recast as an event
	afterActivateUI : function() {},

	
	// "deactivate" the page
	//	- page is no longer visible, so stop any background processes, etc
	//	- note that this does NOT destroy() ui elements, use page.destroy() for that
	deactivate : function() {},
	
	
	// (private) Load the page scripts and stylesheets dynamically.
	// Returns true if page is already loaded, false if asynch loading underway.
	//
	//	<callbacks> is array of methods to execute after page finishes loading.
	//  If the page is already loaded, executes <callbacks> immediately.
	//	If the page is currently in the process of loading, enqueues <callbacks>
	//	to be loaded after page load completes.
	//	
	_load : function() {
		// bail immediately if we're already loading or loaded
		if (this.loadState === true || this.loadState === "loading") return;
		if (PM.DEBUG) console.info(this+"._load()");
		
		// load any required stylesheets
		// Note that callbacks will not wait for stylesheets to load.
		if (this.styles) mapr.Loader.loadStyles(this.styles);
		
		// if there are scripts to load, defer the callbacks until that is done
		if (this.scripts) {
			this.loadState = "loading";
			// loadScripts will return true if all have been loaded
			//	and will execute the whenDone callback in any case
//TODO: errback?
			var whenDone = this._loaded.bind(this);
			return mapr.Loader.loadScripts(this.scripts, whenDone);
		}
		// nothing to load		
		else {
			this.loadState = true;
		}
	},
	

	// (private) Loading has completed.
	//	Tells the pageManager that we've loaded, which will call 
	//	our activate() routine again if we're still the next page to show.
	_loaded : function() {
		if (PM.DEBUG) console.info(this+"._loaded()");
		this.loadState = true;

		// Tell the pageManager that we've finished loading.
		// PM will call page._activateUI() to actually display our UI
		//	if we're still the next thing to be loaded.
		PM.pageLoaded(this);
		
		return true;
	},
	
	
	// Create the page UI components dynamically, stored as page.ui.
	//		
	//	Default implementation creates the "ui" component via
	//		page.getPart("ui")
	//	which will use page.parts.ui to define the component,
	//	you are free to completely override this.
	//
	//	Note: the page components may be destroyed() at any time,
	//	so you may have to re-create the components.
	//
	//	Note: this will not be called if page.ui is already set.
	createUI : function() {
		this.getPart("ui");
	},
	

	// called after UI is created
//TODO: recast as an event
	afterCreateUI : function() {},

	// Page is being destroyed, flush ALL data structures and components.
// TODO: recast as an event
//		 default implementation?
	destroy : function() {},


	
	//
	//	state and refresh
	//

	// set the state
	//	NOTE: many pages store the state variable as something else
	// override to do that here
	setState : function(state) {
		this.state = state;
	},


	// Return the "state" parameter for the page.
	getState : function() {	return this.id + (this.state ? ":" + this.state : "");	},


	// show the current page state (saved in page.state)
	showState : function(){},

	// Save the state to the hash
	saveState : function() {
		PM.setHistory(this.getState());
	},
	

	// Refresh the page dynamically (called on a timer).
	// Use page.state to figure out exactly what to show.
//TODO: recast as an event
	refresh : function() {},	
	
	
	//
	//	page selector
	//
	
	
	// make the pageSelector item for the page
	makePageSelector : function() {
		ui.pageSelector.addPage(this);
	},


	//
	//	main component
	//
	
	
	// Create and return a top-level tabPanel for this page.
	// Adds it to the main UI, but does not activate it.
	// OVERRIDE FOR OTHER PAGE TYPES
	getContainer : function() {
		if (!this.container) {
			// add to the main UI
			ui.tabPanel.add(this.getPart("container"));
		}
		
		return this.container;
	},

	
	// activate our outer component
	// NOTE: this implementation is for 'tab' type pages
	// OVERRIDE FOR OTHER PAGE TYPES
	activateContainer : function() {
		ui.tabPanel.activate(this.container);
	},
	

	// set the page title, generally reflected in the container title
	setTitle : function(title) {
		this.container.setTitle(title);
	},
	
	//
	// outer-component-related events
	//
	
	// our outer component has been activated
	onContainerActivated : function() {
		if (PM.active != this) {
			this._activateUI();
		}
	},
	
	// our outer component has been deactivated
	onContainerDeactivated : function() {
		this.deactivate();
	},
	
	// our outer component is about to be closed
	//	(return false to cancel close)
	onBeforeCloseContainer : function() {},
	
	// our outer component has been closed
	onCloseContainer : function() {
		this.destroy();
	},
	

	//
	//	if you have a grid on your page, 
	//	automatically enable/disable actions when grid selection changes
	//
	//	hook this up with:
	//		yourgrid.on("selectionchanged", this.onSelectionChanged, this);
	onSelectionChanged : function(grid, selection, count, allSelected) {
		if (!this.actions) return;
		for (var key in this.actions) {
			var it = this.actions[key], 
				state = it.initialConfig.selectionState,
				handler = it.initialConfig.onSelectionChanged
			;
			if (state) {
				var enabled = (count >= 2 ? state[2] : state[count]);
				it.setDisabled(!enabled);
			}
			
			if (handler) {
				handler.call(it, grid, selection, count, allSelected);
			}
		}
	},
	
	
	//
	//	util
	//

	// get our prototype
	getProto : function() {
		return this.constructor.prototype;
	},
	
	
	// steal 'plugins' concept from Component
	initPlugins : function() {
		if(this.plugins){
			if(Ext.isArray(this.plugins)){
				for(var i = 0, len = this.plugins.length; i < len; i++){
					this.plugins[i] = this.initPlugin(this.plugins[i]);
				}
			}else{
				this.plugins = this.initPlugin(this.plugins);
			}
		}
	},

	// steal 'plugins' concept from Component
    initPlugin : function(p){
        if(p.ptype && !Ext.isFunction(p.init)){
            p = Ext.ComponentMgr.createPlugin(p);
        }else if(Ext.isString(p)){
            p = Ext.ComponentMgr.createPlugin({
                ptype: p
            });
        }
        p.init(this);
        return p;
    }

});


// add "parts" capability to Pages
Ext.override(mapr.Page, mapr.Parts);



// page which encapsulates a form
mapr.FormPage = Ext.extend(mapr.Page, {
	// dirtyForms -- make sure to include this if you add other plugins
	plugins : "dirtyform",

	// show buttons at "bottom", "top", "both" or false
	showButtons : "both",

	parts : {
		container : {
			inherit : true,
			layout : "border",
			// little stubby toolbar
			tbar : { cls:"x-toolbar-stub", items : [{xtype:"label",text:""}] }
		},

		ui : {
			xtype : "form",
			region : "center",
			margins :"5 0 0 0",
			padding:20,		// TODO: this is too much, but scrolling is wierd otherwise
			autoScroll : true
		},

		
		// set up pointers and events for window-type page outer components
		uiDefaults : function(name, cfg) {
			// get buttons as config objects, so we can add them twice
			var buttons = this.getParts("buttons", null, true),
				show = this.showButtons
			;
			if (show == "top" || show == "both") {
				cfg.tbar = { cls:"x-toolbar-roundtop", items : buttons };
			} else {
				// make a little stubby toolbar so things look right
				cfg.tbar = { items : [] };
			}
			if (show == "bottom" || show == "both") {
				cfg.bbar = { items : buttons };
			}
			return cfg;
		}
	},

	// update the form to show the values, from formDialog.getFormValues()
	showState : function() {
		this.setValues(this.getFormInputs());
	},
	
	// get the inputs for the form when initially shown (generally based on page.state)
	getFormInputs : function() {	return {}	},

	// clear state when we're hidden, in case the form is shown again
	onContainerDeactivated : function() {
		delete this.state;
	}
});



mapr.Page.prototype.toString = function() {
	return "[Page "+this.id+"]";
}


})();			// end hidden from global scope
