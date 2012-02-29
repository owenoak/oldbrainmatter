/*
	TreeReportPage, encapsulates tree/list detail with filter fields and "report" functionality.
	Copyright (c) 2010, MapR Technology.  All rights reserved.
 */

(function() {	// begin hidden from global scope


mapr.TreeReportPage = Ext.extend(mapr.ReportPage, {
	// default path to select is empty
	defaultPath : "",
	
	// currently selected path item
	_path : "",

	// tree's data store
	treeStore : undefined,
	
	// max number of tree nodes to load
	treeNodeCount : 200,
	
	// update the display to match the current this.state
	//	state is:		<pageid>:<report>:<selectedPath>:<filter>
	showState : function() {
		if (this.state) {
			var state = this.state.split(":"),
				report = state[0] || "",
				path   = state[1] || "",
				filter = state[2] || ""
			;
		} else {
			var report = this.defaultReport,
				path   = this.defaultPath,
				filter = this.defaultFilter
			;
		}
		
		this.selectReport(report);
		this.selectPath(path);
		this.setFilter(filter);
	},
	
	getState : function() {
		var state = this.id;
		if (this._report || this._path || this._filter) state += ":" + this._report;
		if (this._path || this._filter) state += ":" + this._path;
		if (this._filter) state += ":" + this._filter;
		return state;
	},


	createUI : function() {
		var page = this;
		// create our components based on our .parts
		this.getPart("filter");
		this.getPart("tree");
		this.getPart("grid");
		this.getPart("bottomPanel", {items: [this.tree, this.grid]});
		this.getPart("ui", {items: [this.filter, this.bottomPanel]});
	},

	afterCreateUI : function() {
		mapr.TreeReportPage.superclass.afterCreateUI.call(this);
		
		// when the tree selection changes, refresh to show the new filter value
		this.tree.on("rowclick", function(tree, rowNumber) {
			// if something is selected in the tree, add that to the filter
			this._path = this.tree.getSelectedPath();
			this.saveState();
		}, this);


		// when the topo store loads, select the correct path
		this.tree.store.on("load", function(store) {
			this.tree.selectPath(this._path);
		}, this);
	},


//TODO: start tree load at current load point
//TODO: re-select selected node
	refresh : function() {
		// superclass method reloads the grid
		mapr.TreeReportPage.superclass.refresh.call(this);
		
		// also reload the topo
		this.tree.store.load({params:{start:0, limit:page.treeNodeCount}});	
	},

	getFilter : function() {
		// set the node list filter...
		var filter = this._filter || "";
		if (this._path) {
			filter = "[rp=*"+this._path+"]" + (filter ? "and" + filter : "");
		}
		return filter;
	},


	parts : {

		// "ui" -- outer container
		ui : {
			xtype : "panel",
			layout : "border",		// Note: we actually have doubly-nested BorderLayouts
			border:false,
			bodyCssClass : "transparent"
		},
	
		// (cfg: Constructor for...) Pointer to our FilterPanel (top-right).
		filter : {
			xtype : "filter.form",
			region:"north",
			height:100
		},
		
		// (cfg: Constructor for...) Pointer to our FilterTreePanel (bottom-left).
		tree : {
			xtype : "grid",
			region:"west",
			width:200,
			split:true,
			minSize:100,
			collapsible:true,
			collapseMode:"mini",
			animCollapse:false,
			border:true,
			cls : "panelBottom",
			cmargins : "0 5 0 0"
		},
		
		// (cfg: Constructor for...) Pointer to our FilterGridPanel (bottom-right)
		grid : {
			xtype : "reportgrid",
			region : "center",
			flex:1,
			border:true
		},
	
		// bottom layout, encloses tree and grid	
		bottomPanel : {
			xtype : "panel",
			region:"center",
			header:false,
			frame:false,
			border:false,
			layout:"border",
			margins:"4 0 0 0",
			bodyCssClass : "transparent"
		}
		
	}, // end .parts

	//
	//	path management
	//
	onSelectPath : function(path) {
		this.selectPath(path);
		this.saveState();
	},
	
	selectPath : function(path) {
		this._path = path;
// tree row selection happens automatically when tree loads
//		this.tree.selectPath(path);
	}

});	// end TreeReportPage

})();			// end hide from global scope
