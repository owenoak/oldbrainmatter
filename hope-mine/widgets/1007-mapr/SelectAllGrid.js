/*	SelectAllGrid, SelectAllModel and SelectAllToolbar
	
	SelectAllGrid is a subclass of GridPanel which shows checkboxes (grid.showChecks) 
	and enables select-all, for selecting items outside of the scope of the current data set.
	
	SelectAllModel is subclass of CheckboxSelectionModel which handles the checkboxes bit.  
	After creation, grid.checkColumn is the checkboxes column.
	
	SelectAllToolbar has buttons for selecting visible/all/none, as well as a paging
	toolbar.  Use 	grid.toolbarParts	to set the buttons actually displayed.
	
	Copyright (c) 2010, MapR Technology.  All rights reserved.
 */

(function(){	// begin hidden from global scope

Ext.ns("mapr.widgets");

mapr.widgets.SelectAllGrid = Ext.extend(Ext.grid.GridPanel, {
	// if true, we show checkboxes
	showChecks : true,

	// if true, we can only select one item at a time
	singleSelect : false,
	
	// if true, we auto-create a selectAllToolbar 
	//	IGNORED if showChecks is false
	showSelectionToolbar : true,
	
	// toolbarParts string for selectAllToolbar
	//	leave blank to use the default
	toolbarParts : undefined,

	// message to show for number of selected items
	//	{0} is # selected
	//	{1} is total rows
	selectionMsg : $tx("<b>{{selected}} of {{total}}</b> items selected"),
	


	// grid defaults
	region : "center",
	viewConfig : {
		forceFit : true,
		flexFit : true
	},
	
	initComponent : function() {
		// HACKY having to include this here..
		if (!this.store && this.storeConstructor) {
			this.store = new this.storeConstructor(this.storeDefaults||{});
		};
	
		// notify that we do the "selectionchanged" event
		this.addEvents("selectionchanged");

		if (this.showChecks) {
			// set up the selection model		
			this.checkColumn = new mapr.widgets.SelectAllModel({singleSelect:this.singleSelect});
			this.selModel = this.checkColumn;

			// push the checkColumn into the list of columns
			this.columns.unshift(this.checkColumn);
		} else {
			// create an explicit rowSelectionModel
			this.selModel = new Ext.grid.RowSelectionModel({singleSelect:this.singleSelect});
		}

		if (this.showSelectionToolbar) {
			var options = { grid:this, store:this.store };
			if (this.toolbarParts) {
				options.toolbarParts = this.toolbarParts;
			} else {
				var tb = mapr.widgets.SelectAllToolbar.prototype;
				options.toolbarParts = 
					(this.showChecks ? tb.selectToolbarParts +"," : "")
					+ "->," 
					+ tb.refreshToolbarParts;
			}
			this.bbar = new mapr.widgets.SelectAllToolbar(options);
	
			if (this.bbar.selectionDisplay) {
				this.selectionDisplay = this.bbar.selectionDisplay;
			}
		}
		mapr.widgets.SelectAllGrid.superclass.initComponent.apply(this, arguments);
	},
	
	initEvents : function() {
		mapr.widgets.SelectAllGrid.superclass.initEvents.apply(this, arguments);
		
		// observe our own "selectionchange" event to fire a single "selectionchanged" event
		var changeTask = new Ext.util.DelayedTask(this.onSelectionChanged, this),
			onChange = (function() { changeTask.delay(0) }).bind(this)
		;
		this.selModel.on("selectionchange", onChange);
		this.store.on("load", onChange);	
	},
	
	
	// return the "1 of 20 items selected" message
	getSelectionMsg : function() {
		var cfg = {
				selected : this.selModel.getSelectedCount(),
				total : this.selModel.getTotalCount()
		};
		return $msg.expand(this.selectionMsg, cfg);
	},
	
	// return array of selected objects
	//	SPECIAL:  adds to the array the following properties:
	//	.allSelected	==	true if "selectAll" is on and rows not on client are selected
	//	.count			==	total number of selected rows (== .length if .selectAll == false)
	//	.filter			==  filter which matches this selection
	getSelection : function(property) {
		var selection = mapr.widgets.SelectAllGrid.superclass.getSelection.apply(this, arguments);
		selection.allSelected = this.selModel.allSelected;
		selection.count = this.selModel.getSelectedCount();
		selection.filter = this.getSelectedFilter();
		return selection;
	},

	// filter key (terse name) for identifying records in the filter
	filterIdKey : "id",
	// filter property (long name) for identifying records in the filter
	filterIdProp : "id",
	
	// filter indicating that EVERYTHING should be affected
	selectAllFilter : "[id=all]",
	
	// return the filter expression which matches the selected records
	getSelectedFilter : function() {
		var filter;
		if (this.selModel.allSelected && this.owner) {
			filter = this.owner.getFilter();
		} else {
			var selection = this.selModel.getSelections();
			filter = mapr.widgets.filter.encode(selection, this.filterIdKey, this.filterIdProp);
		}
		if (filter == "") filter = this.selectAllFilter;
		return filter;
	},

	// onSelectionChanged - fired ONCE after many quick changes to the selection
	//	default is to fire a "selectionchanged" event
	//		signature:  <grid>, <selection>, <selCount>, <selAll>
	//	also updated a 'selectionDisplay' element with number of selected items
	onSelectionChanged : function() {
		this.fireEvent("selectionchanged", 
						this, 
						this.selModel.getSelections(), 
						this.selModel.getSelectedCount(), 
						this.selModel.allSelected
					  );
		if (this.selectionDisplay) this.selectionDisplay.setText(this.getSelectionMsg());
	}

});	// end mapr.widgets.SelectAllGrid
Ext.reg("selectallgrid", mapr.widgets.SelectAllGrid);





//
//
//	SelectAllModel
//
//
mapr.widgets.SelectAllModel = Ext.extend(Ext.grid.CheckboxSelectionModel, {
	// if true, everything in the current store is selected, not just what's in our selection
	allSelected : false,
	
	getInMemoryCount : function() {
		return this.grid.store.getCount();
	},
	
	// return the number of rows which are selected
	//	takes the allSelected flag into account
	getSelectedCount : function() {
		if (this.allSelected) {
			return this.getTotalCount();
		} else {
			return this.selections.getCount();
		}
	},
	
	// fired once when our selection finishes changing, or after load
	//
	//	has the grid fire event "selectionchanged" with values:  
	//			<selection>, <selectionCount>, <allSelected>
	//
	//  if we have a "selectionDisplay", we update that with the selectionMsg
	onSelectionChanged : function() {
		this.grid.onSelectionChanged();
	},
	
	// override selectAll to set the "allSelected" flag
	selectAll : function() {
		if (this.isLocked()) return;
		
		mapr.widgets.SelectAllModel.superclass.selectAll.apply(this, arguments);

		// only set the allSelected flag if there are more items than will fit in memory
		if (this.getTotalCount() > this.getInMemoryCount()) this.allSelected = true;
	},
	
	
	// override selectRow to clear the "allSelected" flag
	selectRow : function() {
		this.allSelected = false;
		mapr.widgets.SelectAllModel.superclass.selectRow.apply(this, arguments);
	},


	// override selectRow to clear the "allSelected" flag
	deselectRow : function() {
		this.allSelected = false;
		mapr.widgets.SelectAllModel.superclass.deselectRow.apply(this, arguments);
	},
	
	
	// select the visible set of rows
	selectVisible : function() {
		// NOTE: this is dependent on the selectionModel ignoring selection 
		//	of things that are not in the current strore...
		this.selectRange(0, this.getTotalCount());
	}
});




//
//
//	SelectAllToolbar
//
//
var T = Ext.Toolbar;

mapr.widgets.SelectAllToolbar = Ext.extend(Ext.PagingToolbar, {
	// named parts to display in the toolbar
	// default is .selectToolbarParts -> .refreshToolbarParts
	toolbarParts : undefined,

	selectToolbarParts : "sp10,Select:,visibleButton,allButton,noneButton,sp20,selectionDisplay",
	refreshToolbarParts : "first,prev,sp10,displayItem,sp10,next,last,refresh,sp5",
	prependButtons : true,
	
	pageSize : 50,
	
    displayMsg : $tx("{0} - {1} of {2}"),
    emptyMsg   : $tx("No items to display"),
			
//	toolbarParts : "first,prev,sp10,displayItem,sp10,next,last,refresh",
	parts : {
		first : function() {
			return new T.Button({
				tooltip: this.firstText,
				overflowText: this.firstText,
				iconCls: 'icon-first',
				disabled: true,
				handler: this.moveFirst,
				scope: this
			});
		},
		
		prev : function() {
			return new T.Button({
				tooltip: this.prevText,
				overflowText: this.prevText,
				iconCls: 'icon-prev',
				disabled: true,
				handler: this.movePrevious,
				scope: this
			});
		},
		
		displayItem : function() {
			return new T.TextItem({});
		},
		
		next : function() {
			return new T.Button({
				tooltip: this.nextText,
				overflowText: this.nextText,
				iconCls: 'icon-next',
				disabled: true,
				handler: this.moveNext,
				scope: this
			});
		},
		
		last : function() {
			return new T.Button({
				tooltip: this.lastText,
				overflowText: this.lastText,
				iconCls: 'icon-last',
				disabled: true,
				handler: this.moveLast,
				scope: this
			});
		},
		
		refresh : function() {
			return new T.Button({
				tooltip: this.refreshText,
				overflowText: this.refreshText,
				iconCls: 'icon-refresh',
				handler: this.doRefresh,
				scope: this
			});
		},
		
		sp5  : {	xtype : "spacer", width:5	},
		sp10 : {	xtype : "spacer", width:10	},
		sp20 : {	xtype : "spacer", width:20	},
		
		visibleButton : function() {
			return new T.Button({
				text:$tx("Visible"),
				cls : "btn-link",
				handler : this.selectVisible,
				scope : this
			});
		},
		allButton : function() {
			return new T.Button({
				text:$tx("All"),
				cls : "btn-link",
				handler : this.selectAll,
				scope : this
			});
		},
		noneButton : function() {
			return new T.Button({
				text:$tx("None"),
				cls : "btn-link",
				handler : this.selectNone,
				scope : this
			});
		},
		selectionDisplay : function() {
			return new T.TextItem({});
		}
	},

	initComponent : function(){
		var parts = this.getToolbarItems();
		
		var userItems = this.items || this.buttons || [];
		if (this.prependButtons) {
			this.items = userItems.concat(parts);
		}else{
			this.items = parts.concat(userItems);
		}
		delete this.buttons;

		// skip PagingToolbar init
		Ext.Toolbar.prototype.initComponent.call(this);

		this.addEvents('change','beforechange');
		this.on('afterlayout', this.onFirstLayout, this, {single: true});
		this.cursor = 0;
		this.bindStore(this.store, true);
	},
	
	getToolbarItems : function() {
		var parts = this.toolbarParts;
		if (parts == null) {
			parts = this.selectToolbarParts + ",->," + this.refreshToolbarParts;
		}
		if (typeof parts == "string") parts = parts.split(",");

		for (var i = 0; i < parts.length; i++) {
			parts[i] = this.getPart(parts[i]);
		}
	
		return parts;	
	},

	// private
	onLoad : function(store, r, o){
		if(!this.rendered){
			this.dsLoaded = [store, r, o];
			return;
		}
		var p = this.getParams();
		this.cursor = (o.params && o.params[p.start]) ? o.params[p.start] : 0;
		var d = this.getPageData(), ap = d.activePage, ps = d.pages;

		if (this.afterTextItem) {
			this.afterTextItem.setText(String.format(this.afterPageText, d.pages));
		}
		if (this.first) this.first.setDisabled(ap == 1);
		if (this.prev) this.prev.setDisabled(ap == 1);
		if (this.next) this.next.setDisabled(ap == ps);
		if (this.last) this.last.setDisabled(ap == ps);
		if (this.refresh) this.refresh.enable();
		this.updateInfo();
		this.fireEvent('change', this, d);
	},

	// private
	onLoadError : function(){
		if(!this.rendered){
			return;
		}
		if (this.refresh) this.refresh.enable();
	},
	
	
	// event handlers for the selection buttons
	selectAll : function() {
		this.grid.getSelectionModel().selectAll();
	},
	
	selectVisible : function() {
		this.grid.getSelectionModel().selectVisible();
	},
	
	selectNone : function() {
		this.grid.getSelectionModel().clearSelections();
	}
	
});

Ext.reg('selectalltoolbar', mapr.widgets.SelectAllToolbar);





})();			// end hidden from global scope
