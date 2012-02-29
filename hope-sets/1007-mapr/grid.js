/*	Generic grid changes.
	Copyright (c) 2010, MapR Technology.  All rights reserved.
 */

(function(){	// begin hidden from global scope


// Convenience function to get selection for a grid.
//	If you pass a property name, returns that property of each selected record.
//	Otherwise returns pointer to the records themselves.
//	returns empty list if no selection
Ext.grid.GridPanel.prototype.getSelection = function(property) {
	var selection = this.getSelectionModel().getSelections() || [];
	if (property && selection.length) {
		var record, i = -1;
		while (record = selection[++i]) {
			selection[i] = record.get(property);
		}
	}
	return selection;
}

// 	Return the first selected item for a grid.
//	If you pass a property name, returns that property of the selected record.
//	Returns undefined if no selection.
Ext.grid.GridPanel.prototype.getSelected = function(property) {
	var sel = this.getSelection(property);
	if (sel) return sel[0];
}

Ext.grid.RowSelectionModel.prototype.getSelectedCount = function() {
	return (this.selections ? this.selections.getCount() : 0);
}


//	override GridPanel.initComponent to create a store 
//	 if grid.storeConstructor is set and grid.store is NOT set
oldInit = Ext.grid.GridPanel.prototype.initComponent;
Ext.grid.GridPanel.prototype.initComponent = function() {
	if (!this.store && this.storeConstructor) {
		this.store = new this.storeConstructor(this.storeDefaults||{});
	};
	return oldInit.apply(this, arguments);
}


// add methods to all SelectionModel classes
Ext.grid.AbstractSelectionModel.prototype.getTotalCount = function() {
	return this.grid.store.getTotalCount();
};




//
//	new grid column xtypes
//

Ext.ns("mapr.widget");

// set column defaults
Ext.grid.Column.prototype.width = 100;

// icon column
//	map field values to icon names in column.options
Ext.grid.Column.types.icon = Ext.extend(Ext.grid.Column, {
	width: 30,
	resizable : false,
	// map of value -> icon name
	options : undefined,
	renderer : function(value) {
		var icon = this.options[value];
		return (icon ? util.icon(icon) : "");
	}
});


// heartbeat column
Ext.grid.Column.types.heartbeat = Ext.extend(Ext.grid.Column, {
	align : "right",
	width : 80,
	renderer : function(value, metaData, record, row, col, store) {
		return util.format(value,"heartbeat:0");
	}
});



// standard date column
Ext.grid.Column.types.date = Ext.extend(Ext.grid.DateColumn, {
	width : 130,
	format : mapr.dateFormat
});


// date shown as a delta between then and "now" (where now is the current time)
//	(eg:  3 minutes from now,  5 hours ago)
Ext.grid.Column.types.timedelta = Ext.extend(Ext.grid.Column, {
	width : 130,
	renderer : function(value, metaData, record, row, col, store) {
		return util.format(value,"heartbeat:0");
	}
});



// percent column
Ext.grid.Column.types.percent = Ext.extend(Ext.grid.Column, {
	width : 50,
	align : "right",
	resizable : false,
	renderer : function(value, metaData, record, row, col, store) {
		return value + "%";
	}
});


// short integer column
Ext.grid.Column.types.shortint = Ext.extend(Ext.grid.Column, {
	width : 50,
	align : "right",
	resizable : false
});


// long integer column
Ext.grid.Column.types.longint = Ext.extend(Ext.grid.Column, {
	width : 75,
	align : "right"
});


// bytes
Ext.grid.Column.types.bytes = Ext.extend(Ext.grid.Column, {
	// format:  first letter should be start units, last letter is end units 
	//	or "*" for smart conversion
	format : "m2*",
	
	// message to display if the value is 0.  Will be expanded() with the record.data
	zeroMsg : "",
	
	width : 75,
	align : "right",
	renderer : function(value, metaData, record, row, col, store) {
		if (value == 0 && this.zeroMsg) return $msg.expand(this.zeroMsg, record.data);
		return util.formatters.b2b(value, this.format)
	}
});



/*** 
 *
 * BUGS in Grid/ColumnModel/etc code
 *
 ***/


// bug in colModel.setConfig() was causing values from custom xtypes to be ignored
Ext.grid.ColumnModel.prototype.setConfig = function(config, initial){
	var i, c, len;
	if(!initial){ // cleanup
		delete this.totalWidth;
		for(i = 0, len = this.config.length; i < len; i++){
			c = this.config[i];
			if(c.setEditor){
				//check here, in case we have a special column like a CheckboxSelectionModel
				c.setEditor(null);
			}
		}
	}

	// backward compatibility
//MOW: the below was causing column widths set in custom column xtypes to be ignored
//	this.defaults = Ext.apply({
//		width: this.defaultWidth,
//		sortable: this.defaultSortable
//	}, this.defaults);

	this.config = config;
	this.lookup = {};

	for(i = 0, len = config.length; i < len; i++){
		c = Ext.applyIf(config[i], this.defaults);
		// if no id, create one using column's ordinal position
		if(Ext.isEmpty(c.id)){
			c.id = i;
		}
		if(!c.isColumn){
			var Cls = Ext.grid.Column.types[c.xtype || 'gridcolumn'];
			c = new Cls(c);
			config[i] = c;
		}
		this.lookup[c.id] = c;
	}
	if(!initial){
		this.fireEvent('configchange', this);
	}
};


// bug in gridView.getColumnData() is causing problems if there are more columns
//	in the grid than there are fields in the datastore
Ext.grid.GridView.prototype.getColumnData = function(){
	// build a map for all the columns
	var cs       = [],
		cm       = this.cm,
		colCount = cm.getColumnCount();

	for (var i = 0; i < colCount; i++) {
		var name = cm.getDataIndex(i) || cm.config[i].name;
		cs[i] = {
// MOW: the following is bad
//			name    : (!Ext.isDefined(name) ? this.ds.fields.get(i).name : name),
			name    : name,
			renderer: cm.getRenderer(i),
			scope   : cm.getRendererScope(i),
			id      : cm.getColumnId(i),
			style   : this.getColumnStyle(i)
		};
	}

	return cs;
};


//
//	GridView flexFit
//
// Enhance GridView to have a "flexFit" property to go with "forceFit"
//	in a "flexFit" grid, grid will always attempt to be at least as big
//	as the main grid panel.  If there's extra space, it will be 
//	allocated to grid columns which have a "flex" property.
//
//	OVERRIDE: this is fairly likely to break when upgrading Ext
//
//TODO: can we make this work w/o the scrollbar always being shown?


// add two properties to columns:
//	flex : amount of flexible space this column wants, (int, default = 0)
//	minWidth : for flex columns, minimum size for the column (int, default = undefined)
Ext.grid.ColumnModel.prototype.getFlex = function(colIndex) {
	return this.config[colIndex].flex || 0;
}

Ext.grid.ColumnModel.prototype.getMinWidth = function(colIndex) {
	return this.config[colIndex].minWidth;
}

Ext.grid.ColumnModel.prototype.setMinWidth = function(colIndex, width) {
	this.config[colIndex].minWidth = width;
}


// override initElements() to NOT allow horizontal scrolling if flexFit
Ext.grid.GridView.prototype._initElements = Ext.grid.GridView.prototype.initElements;
Ext.grid.GridView.prototype.initElements = function() {
	this._initElements.apply(this, arguments);
	if (this.forceFit && this.flexFit) {
		this.scroller.setStyle('overflow-x', 'auto');
	}
}


// old fitColums command
Ext.grid.GridView.prototype._fitNonFlexColumns = Ext.grid.GridView.prototype.fitColumns;


// SET THIS TO TRUE TO DEBUG SIZING
var debug = false;

Ext.grid.GridView.prototype._fitFlexColumns = function(preventRefresh, onlyExpand, justMovedColumn){
	var colModel = this.cm,
		domWidth = this.grid.getGridEl().getWidth(true)-this.getScrollOffset()
	;

	// if not initialized, so don't screw up the default widths
	if(domWidth < 20) return;
if (debug) console.group("fitting ",this);

	// extra is the extra width we have to distribute
	var col,
		colCount = colModel.getColumnCount(),
		flex = 0,
		flexData = [],
		flexTotal = 0,
		flexMinWidth = 0,
		flexWidth = 0,
		nonFlexWidth = 0,
		lastVisibleCol = 0,
		colWidth,
		colMinWidth,
		foundFlexColumn = false
	;
	for (col = 0; col < colCount; col++){
		if (colModel.isHidden(col)) continue;
		
		colWidth = colModel.getColumnWidth(col);
		flex = colModel.getFlex(col);

		// don't flex a column if they just resized it...
		if (flex) { // && col != justMovedColumn) {
			flexTotal += flex;
			flexWidth += colWidth;
			colMinWidth = colModel.getMinWidth(col) || this.grid.minColumnWidth;
			flexMinWidth += colMinWidth;

			flexData.push(col);
			flexData.push(flex);
			flexData.push(colMinWidth);
			foundFlexColumn = true;
		} else {
if (debug) console.info(col, colWidth);
			nonFlexWidth += colWidth;
		}

		lastVisibleCol = col;
	}

if (debug) console.warn("found flex ",foundFlexColumn);

	// if there are no flex cols, give all extra to the last visible column
	//	 taking advantage of the fact that "colWidth" is the width of this column
	if (!foundFlexColumn) {
		col = lastVisibleCol;

		// figure out the minWidth of the column
		colMinWidth = colModel.getMinWidth(col);
		// if the column doesn't have a minWidth specified,
		//	remember its current width as its minWidth, for next time around
		if (!colMinWidth) {
			colMinWidth = colWidth;
			colModel.setMinWidth(col, colWidth);
		}
		
		flexData.push(lastVisibleCol);
		flexData.push(1);
		flexData.push(colMinWidth);


		// the column is now "flexible" so remove its width from nonFlexWidth
		nonFlexWidth -= colWidth;
		// and add its minWidth to the flex*Widths
		flexWidth += colMinWidth;
		flexMinWidth += colMinWidth;
		flexTotal = 1;
	}

if (debug) console.warn("dom:",domWidth,"flex:",flexWidth,"non:",nonFlexWidth,"flexmin:",flexMinWidth);

	// if we're exactly the right size, or already scrolling horizontally, forget it
	if (foundFlexColumn && domWidth == flexWidth + nonFlexWidth) {
if (debug) console.warn("bailing");
if (debug) console.groupEnd();
		return false;
	}
	
	// distribute at least the flexMinWidth amount of space
	flexTotal = Math.max(1, flexTotal);
	var spaceToDistribute = Math.max(domWidth - nonFlexWidth, flexMinWidth),
		remainder = spaceToDistribute,
//XXX: limiting fraction to 1 -- is this right?
		flexFraction = flexTotal/ spaceToDistribute   //Math.min(1, spaceToDistribute / flexTotal)
	;
if (debug) console.warn(spaceToDistribute, flexTotal, flexFraction);
	while (flexData.length) {
		col = flexData.shift();
		flex = flexData.shift();
		colMinWidth = flexData.shift();

		// if last column, take all the remaining space
		if (flexData.length == 0) {
			colWidth = remainder;
		}
		// otherwise take the proportion according to the column's flex
		else {
if (debug) console.warn("std:",spaceToDistribute,"flex:", flex,"ff:", flexFraction);
			colWidth = Math.floor(spaceToDistribute * flex * flexFraction);
		}
if (debug) console.warn("remainder", remainder, colWidth, colMinWidth);
		// make sure we're not smaller than the colMinWidth
		colWidth = Math.max(colWidth, colMinWidth);

		// don't be greater than 500 px (?)
//		colWidth = Math.min(colWidth, 500);
				
		// do the actual adjustment, suppressing the "widthchange" event
		colModel.setColumnWidth(col, colWidth, true);

		// subtract colWidth from remainder so the last column comes out even
		remainder -= colWidth;
	}

	if(preventRefresh !== true){
		this.updateAllColumnWidths();
	}
if (debug) console.groupEnd();
	return true;
};

// actual fitColumns just branchs based on whether the grid is "flexFit" or not
Ext.grid.GridView.prototype.fitColumns = function(preventRefresh, onlyExpand, justMovedColumn) {
	// take a flexFit on the gridView or the GridPanel
	var isFlexGrid = this.flexFit || this.grid.flexFit;
	if (isFlexGrid) {
		return this._fitFlexColumns(preventRefresh, onlyExpand, justMovedColumn);
	} else {
		return this._fitNonFlexColumns(preventRefresh, onlyExpand, justMovedColumn);
	}
}




/*** 
 *
 * BUGS in Store code
 *
 ***/



// change store.load() so it will send the  field.mapping  (if defined) to the server field
//	as the sort parameter, rather than field.name
Ext.data.Store.prototype.load = function(options) {
	options = Ext.apply({}, options);
	this.storeOptions(options);
	if(this.sortInfo && this.remoteSort){
		var pn = this.paramNames;
		options.params = Ext.apply({}, options.params);
		var sortField = this.sortInfo.field,
			field = this.fields.get(sortField)
		;
		if (field) {
			sortField = field.mapping || field.name;	
		}
		options.params[pn.sort] = sortField;
		options.params[pn.dir] = this.sortInfo.direction;
	}
	try {
		return this.execute('read', null, options); // <-- null represents rs.  No rs for load actions.
	} catch(e) {
		this.handleException(e);
		return false;
	}
};


})();			// end hidden from global scope


