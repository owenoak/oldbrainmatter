/*	ReportGrid 
	
	Grid that hooks up to a report data set to show/hide columns dynamically.
	Also can handle a "filter" property which tells the server to subset the data.
					
	Copyright (c) 2010, MapR Technology.  All rights reserved.
 */

(function(){	// begin hidden from global scope

Ext.ns("mapr.widgets");

// TODO: 
//		- GB.reconfigure() or model.setConfig()?
//		- view.refresh(true) ???

mapr.widgets.ReportGrid = Ext.extend(mapr.widgets.SelectAllGrid, {
	
	// { col.name -> col } map for ALL columns that this grid might possibly display
	columnMap : undefined,

	// current set of column names, so we don't spin unnecessarily
	colState : undefined,

	// generic grid properties set here for convenience
	stripeRows: true,
	enableColumnHide: true,
	enableColumnMove: true,	
	enableColumnResize: true,
	
	//
	//	grid state is its set of columns
	//

	applyState : function(state) {
		this.setColumns(state);
	},

	//	* return state as a  fields as a comma-separated list of column.name
	//		with "-" or "+" before the name of the sorted field
	//
	//  NOTE: 
	//		* we ignore field widths
	//		* we ignore field grouping
	//		* we don't handle multiple sort
	//		* this breaks down if a dataIndex is used twice...
	//
	getState : function() {
		// figure out sorting first
		var sort = this.store.getSortState() || {field:"",direction:"ASC"},
			sortField = sort.field,
			sortPrefix = (sort.direction == "ASC" ? "+" : "-")
		;
		
		// get the list of fields
		var fields = [], column, i = -1;
		
		// return the list of field names
		while (column = this.colModel.config[++i]) {
			if (column.hidden) continue;
			var field = column.name || column.dataIndex;
			fields[fields.length] = (column.dataIndex == sortField ? sortPrefix : "") + field;
		}
		return fields.join(",");
	},

	
	// 
	//	change columns
	//


	// Set the grid columns to those specified by a comma-separated list of colState.
	//	If a column name starts with "+" or "-", we'll sort by that column as well.
	setColumns : function(colState) {
		// if colState has not changed, forget it
		if (colState == this.colState) return;
		
		this._setColumns(colState);
	},

	// private
	_setColumns : function(colState) {
		// new list of columns
		var newCols = [];

//TODO: other prefix columns?
		if (this.checkColumn) newCols.push(this.checkColumn);
		
		colState = colState.split(",");
		var i = -1, colName, column, sortChar, newSort;
		while (colName = colState[++i]) {
			// figure out sorting first (since sort prefix changes the "colName")
			sortChar = colName.charAt(0);
			if (sortChar == "+" || sortChar == "-") {
				colName = colName.substr(1);
				newSort = {field : colName, direction : (sortChar == "+" ? "ASC" : "DESC")};
			}
			
			column = this.columnMap[colName];
			if (column) {
				newCols.push(column);
			} else {
				console.warn(this,".setColumns(): column named '"+colName+"' not found");
			}
		}

		// update the columnModel's config, which will redraw the list
		this.colModel.setConfig(newCols, false);

		// update the store sort
		var oldSort = this.store.getSortState() || {};
		if (newSort && (newSort.field != oldSort.field || newSort.direction != oldSort.direction)) {
			this.store.setDefaultSort(newSort.field, newSort.direction);
			this.store.sort(newSort.field, newSort.direction);
		}
	},
	
	
	
	//
	//	filter -- added as parameters to the data query
	//

	// set our filter parameter
	//	NOTE: this does not actually reload the data, that happens on refresh (?)
	setFilter : function(filter) {
		if (this.filter == filter) return;
		
		this.filter = filter;
		var store = this.getStore();
		store.setBaseParam("filter", filter);
	}
	
});
Ext.reg("reportgrid", mapr.widgets.ReportGrid);


})();			// end hidden from global scope
