/*
	ReportPage, encapsulates grid with filter fields and "report" functionality.
	Copyright (c) 2010, MapR Technology.  All rights reserved.
 */

(function() {	// begin hidden from global scope

mapr.ReportPage = Ext.extend(mapr.Page, {
	
	// list of reports (MUST OVERRIDE)
	reports : undefined,
	
	// default report (MUST OVERRIDE)
	defaultReport : undefined,		//TODO: get from preference?

	// default filter is empty
	defaultFilter : "",
	
	// max number of grid nodes to load
	gridNodeCount : 50,
	
	// name of the current report
	_report : "",

	// text version of the current filter
	_filter : "",
	
	
	// update the display to match the current this.state
	//	state is:		<pageid>:<report>:<filter>
	showState : function() {
		if (this.state) {
			var state = this.state.split(":"),
				report = state[0] || "",
				filter = state[1] || ""
			;
		} else {
			var report = this.defaultReport,
				filter = this.defaultFilter
			;
		}
		
		this.selectReport(report);
		this.setFilter(filter);
	},
	
	getState : function() {
		var state = this.id;
		if (this._report || this._filter) state += ":" + this._report;
		if (this._filter) state += ":" + this._filter;
		return state;
	},


	createUI : function() {
		var page = this;
		// create our components based on our .parts
		this.getPart("filter");
		this.getPart("grid" );
		this.getPart("ui", {items: [this.filter, this.grid]});
	},
	
	
	afterCreateUI : function() {
		mapr.ReportPage.superclass.afterCreateUI.call(this);
		
		// relayout the page when the filter resizes
		this.filter.on("resize", function(filter, width, height) {
			if (!height) return;
			this.ui.doLayout();
		}, this);
		
		
		// when the filter changes, refresh to show the new filter value
		this.filter.on("filterChanged", function(filter, filterString, expressions) {
			if (filterString == this._filter) return;
			this._filter = filterString;
			this.saveState();
		}, this);
				
		// observe the "selectionchanged" event of the grid
		this.grid.on("selectionchanged", this.onSelectionChanged, this);
	},
	
	// get the current filter
	//	split out so pages can put custom clauses in the filter as desired
	getFilter : function() {
		return this._filter || "";
	},

//TODO: start tree load at current load point
//TODO: re-select selected node
	refresh : function() {
		mapr.ReportPage.superclass.refresh.call(this);

		this.grid.setFilter(this.getFilter());
		
		// and reload the node list
		this.grid.store.load({params:{start:0, limit:page.gridNodeCount}});
	},


	parts : {

		// "ui" -- outer container
		ui : {
			xtype : "panel",
			layout : "border",		// Note: we actually have doubly-nested BorderLayouts
			border : false,
			bodyCssClass : "transparent"
		},
	
		// (cfg: Constructor for...) Pointer to our FilterPanel (top-right).
		filter : {
			xtype : "filter.form",
			region:"north",
			height:100
		},
		
		// (cfg: Constructor for...) Pointer to our FilterGridPanel (bottom-right)
		grid : {
			xtype : "reportgrid",
			region : "center",
			flex:1,
			border:true,
			margins:"4 0 0 0"
		}
		
	}, // end .parts

	//
	//	
	//


	//
	//	report management
	//
	//	NOTE: assumes that we have a page.reportButton
	// 

	// report was selected (generally from the reportButton or via page back and forth)
	// update it and save state
	onSelectReport : function(name) {
		this.selectReport(name);
		this.saveState();
	},
	
	
	selectReport : function(name) {
		var report = this.reports[name];
		if (!report) return;

		this._report = name;
		if (report.columns) {
			this.grid.applyState(report.columns);
		}
		
		// update the reportButton's title
		if (this.reportButton) this.reportButton.select(name);
	},
	
	//	
	//	filter management
	//
	onSetFilter : function(filter) {
		this.setFilter(filter);
		this.saveState();
	},
	
	setFilter : function(filter) {
		this._filter = filter;
		if (filter == "") {
			this.filter.deactivate();
		} else {
			this.filter.setFilter(filter);
			this.filter.activate();
		}
	}
	

});	// end ReportPage

})();			// end hide from global scope
