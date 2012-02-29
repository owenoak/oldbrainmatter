(function($) {	// begin hidden from global scope


new $.Container.subclass({
	reference 	: "$.DataTable",
	collector	: "$.DataTables",
	mixins 		: "$.Selective,",

	prototype : {
		className		: "DataTable",
		rowClassName	: "stat",
		messagePrefix	: "stat",
		showAsWindow	: false,		// if true, we draw with the windowTemplate
		columns 		: undefined,	// array of RowViewerColumns, will be converted automatically
		data			: undefined,	// array of 'rows' to draw
		isClickable		: undefined,	// if true, implement an "onRowClick" method to do something when they click a row
		sortColumn		: undefined,	// key of the currently-sorted column
		sortAscending	: false,		// if true, we sort with larger numbers higher in the table
		doubleUp		: false,		// if true, we repeat the columns twice in the table
		_alwaysRedraw		: true,			// redraw the entire thing when we redraw

		selectedRow		: undefined,	// index of the selected row

		//
		//	special setters
		//
		
		setColumns : function(columns) {
			if (typeof columns === "string") columns = columns.split(",");
			this.columns = $.forEach(columns, function(column) {
				if (typeof column === "string") {
					column = { key : column };
				}
				column.controller = this;
				return new $.DataColumn(column);
			}, this);
		},

		setShowAsWindow : function(value) {
			if (value == true) this.template = this.windowTemplate;
			this.showAsWindow = value;
		},


		selectRow : function(index) {
			this.selectedRow = index;
			if (!this.$element) return;
			// remove highlight from previous row
			this.$element.find("tr.HIGHLIGHT[index!="+index+"]").removeClass("HIGHLIGHT");
			this.$element.find("tr[index="+index+"]").addClass("HIGHLIGHT");
		},

		//
		//	drawing
		//
		
		getTableHtml : function() {
			if (this.data == null) return $.expand(this.noDataTemplate, this);
			if (this.data.length == 0) return $.expand(this.emptyDataTemplate, this);

			// sort if necessary before outputting
			if (this.sortColumn) this.sortData();
		

			var output = 
				"<table"
					// single, static row handler
					+ (this.isClickable ? " class='clickable' "
										+"onclick='return "+this.getReference()
											+"._onRowClick(event||window.event)'"
									  : "")
					+">";
			
			
			output += this.getHeaderHtml();
			output += this.getRowsHtml();
			
			output += "</table>";
			return output;		
		},
		
		getHeaderHtml : function() {
			var output = "";
			// output column headers
			output += "<tr class='"+this.rowClassName+"'"
							+ " onclick='return "+this.getReference()
											+"._onHeaderClick(event||window.event)'"
						 +">"
			output += this.getHeaderRowHtml();
			output += "</tr>";
			return output;			
		},
		
		getHeaderRowHtml : function() {
			var output = "";
			
			// output the set of headers
			$.forEach(this.columns, function(column) {
				if (column.showIf && column.showIf() != true) return;
				output += this.getHeaderCellHtml(column);
			}, this);
			
			// if we're doubling up, output the headers again
			if (this.doubleUp) {
				output += "<th class='separator'>&nbsp;</th>";
				$.forEach(this.columns, function(column) {
					if (column.showIf && column.showIf() != true) return;
					output += this.getHeaderCellHtml(column);
				}, this);
			}
			return output;
		},
		
		getHeaderCellHtml : function(column) {
			var output = "";
			var isSorted  = (this.sortColumn == column.key),
				className = column.getClassName() 
						  + (column.isSortable ? " sortable" : "")
						  + (isSorted ? " sort"+ (this.sortAscending ? "Up" : "Down") : ""),
				hint = column.getColumnHint() || ""
			;
			if (hint) hint = " tooltip='"+hint+"'";
			output += "<th class='"+className+"'"
						 + hint
						 + " key='"+column.key+"'"
					+ ">"
							+column.getColumnTitle()
					+ "</th>";
			return output;
		},
		
		getRowsHtml : function() {
			var data = this.data, secondSet, output = "";
			
			if (this.doubleUp) {
				// split the data in half and process it twice
				var half = Math.ceil(this.data.length / 2),
					data = this.data.slice(0, half),
					secondSet = this.data.slice(half)
				;
			}
	
			// output each row of data
			$.forEach(data, function(row, index) {
				if (row == null) return;
				
				var className = this.rowClassName
								 +(index % 2 ? " odd" : " even")
								 +(index === this.selectedRow ? " HIGHLIGHT" : "")
				;
				output += "<tr class='"+className+"'"+" index='"+index+"'>";

				// output from the first set
				$.forEach(this.columns, function(column) {
					if (column.showIf && column.showIf() != true) return;
					output += column.getHtml(row);
				});
				
				// output from the second set if present
				if (secondSet) {
					output += "<th class='separator'>&nbsp;</th>";
					$.forEach(this.columns, function(column) {
						if (column.showIf && column.showIf() != true) return;
						output += column.getHtml(secondSet[index]||{});
					});
				}

				output += "</tr>";
			}, this);
			return output;
		},


		getTitle : function(){
			return $.message("page.title."+this.id, this);
		},

		//
		//	sorting
		//

		//REFACTOR: sort on server?
		sortData : function() {
			var column = this.getColumn(this.sortColumn),
				type = column.type,
				numericSort = (column.sortTypes[type] == "number")
			;
			
			$.list.sortBy(this.data, this.sortColumn, this.sortAscending, numericSort);
		},
		
		
		//
		//	event handlers
		//

		// handle a click on a row
		onRowClick : function(rowIndex) {},

		// (internal method, use "onRowClick" instead)
		_onRowClick : function(event) {
			event = $.event.fix(event);
			var target = event.target, rowIndex;
			while (target && target != this.$element[0]) {
				rowIndex = target.getAttribute("index");
				if (rowIndex != null) break;
				target = target.parentNode;
			}
			if (!rowIndex) return;
			this.onRowClick(rowIndex);
		},
		
		// (internal method, you shouldn't have to override this)
		_onHeaderClick : function(event) {
			event = $.event.fix(event);
			var target = event.target, key;
			while (target && target != this.$element[0]) {
				key = target.getAttribute("key");
				if (key != null) break;
				target = target.parentNode;
			}
			if (!key) return;

			var column = this.getColumn(key);
			if (!column.isSortable) return;
			if (this.sortColumn == key) {
				this.sortAscending = !this.sortAscending;
			}

			this.sortColumn = key;
			this.draw();	// will sort for us
		},
		



		//
		//	utility
		//
		
		getColumn : function(key) {
			return $.list.byProperty(this.columns, "key", key);
		},
		
		getMessage : function(suffix, subs) {
			var value;
			if (MemcacheController.selection.isGear6) {
				// HACK: breaks encapsulation, for a single override  :-(
				value = $.message([this.messagePrefix, suffix, "gear6"], subs);
			}
			if (!value) value = $.message([this.messagePrefix, suffix], subs);
			return value;
		},

		
		template  : "<div id='#{id}' class='#{className} Container #{_cssClass}' #{getAttributes()}>"
					+"#{getTableHtml()}"
					+"</div>",

		windowTemplate : "<div id='#{id}' style='#{windowStyle}' class='DataTableWindow Window INLINE'>"
						+"	<div class='Header NOSELECT'>"
						+"		#{getTitle()}"
						+"	</div>"
						+"	<div class='Body SQUARE'>"
						+"		<div class='#{className} Container #{_cssClass}' #{getAttributes()}>"
						+"			#{getTableHtml()}"
						+"		</div>"
						+"	</div>"
						+"</div>",


		// shown when we have no data object at all (eg: when initially loading)
		noDataTemplate : "<div class='emptyMessage'>#{message:UI.noDataMessage}</div>",
		
		// shown when we have a data object, but it is empty
		emptyDataTemplate : "<div class='emptyMessage'>#{message:UI.emptyDataMessage}</div>"
	}
});


new $.Class({
	reference : "$.DataColumn",
	prototype : {
		key 		: undefined,		// row[key] which holds the data
		className 	: undefined,		// special css class name
		isSortable 	: false,			// is this column sortable?
		type 		: "string",			// data type
		
		getMessage : function(suffix) {
			return this.controller.getMessage(suffix);
		},
		
		getIdentifier : function() {
			return this.key;
		},
		
		// column title
		getColumnTitle : function() {
			return this.getMessage(this.key+".title");
		},
		
		getColumnHint : function() {
			return this.getMessage(this.key+".hint");
		},
		
		// data type -- we'll look in the message dictionary under our key and fall back to 'type'
		getType : function() {
			return this.getMessage(this.key+".type") || this.type;
		},

		// css classname for the column
		getClassName : function(type) {
			return (this.className || this.key) + " "+this.getType()+"Type";
		},
		
		// internal value for this row
		getValue : function(row) {
			var value = row[this.key];
			// HACK: compensate for <value type='blah'>realValue</value>
			if (typeof value === "object" && value.value != null) value = value.value;
			return value;
		},

		// displayed value for the row, formatted according to our type
		getDisplayValue : function(row, value) {
			var type = this.getType(),
				formatter = this.valueFormatters[type]
			;
			if (formatter) return formatter.apply(this, [value, row]);
			return value;
		},

		// hint HTML for the cell, passed value and displayValue
		getHint : function(row, value, displayValue) {
			var hint = this.getMessage(this.key+".hint") || "";
			if (value != displayValue) {
				hint = "("+value+")" + (hint ? " "+hint : hint);
			}
			return hint;
		},
				
		getHtml : function(row) {
			var value = this.getValue(row);
			this._displayValue = this.getDisplayValue(row, value);
			var hint = this.getHint(row, value, this._displayValue);
			this._hint = (hint ? " tooltip='"+hint+"'" : "");
			return $.expand(this.template, this);
		},
		
		template : "<td class='#{getClassName()}'#{_hint}>#{_displayValue}</td>",
		
		
		// Static set of formatting functions, applied with 'this' as the Column.
		//	NOTE: add an entry to "sortTypes" when you add a new formatter!
		valueFormatters : {
			string : function(value) {
				if (this.maxLength) return $.string.truncate(value, this.maxLength);
				return value;
			},

			actions : function(value) {
				if (this.maxLength) return $.string.truncate(value, this.maxLength);
				return value;
			},
			
			number : function(value, row){
				if (!isNaN(value)) return $.number.commaize(value);
				return value;
			},
			
			duration : function(value, row) {
				return $.date.printDuration(value, true);
			},
			
			seconds : function(value, row) {
				return $.date.print(value * 1000);
			},
			
			bytes : function(value, row) {
				if (!isNaN(value)) return $.number.toBytesString(value, 2);
				return value;
			},
			
			MB : function(value, row) {
				if (!isNaN(value)) return $.number.toBytesString(value*1024*1024, 2);
				return value;
			},
			
			percent : function(value, row) {
				if (!this.totalKey) throw TypeError("Column must specify a totalKey to use 'percent' type");
				var total = row[this.totalKey] || 0;
				return $.number.printValueWithPercentage(value, total);
			},

			bytesPercent : function(value, row) {
				if (!this.totalKey) throw TypeError("Column must specify a totalKey to use 'bytesPercent' type");
				var total = row[this.totalKey] || 0;
				return $.number.printBytesWithPercentage(value, total);
			}
			
		},
		
		sortTypes : {
			number : "number",
			duration : "number",
			seconds : "number",
			bytes : "number",
			percent : "number",
			bytesPercent : "number",
			MB : "number"
		}
	}
});


new $.DataTable.subclass({
	reference : "$.KeyValueTable",
	prototype : {
		className : "KeyValueTable DataTable",
		columns : [
			new $.DataColumn({
				key : "key",
				
				getDisplayValue : function(row, value) {
					return this.getMessage(value+".title") || value;
				},
				
				getHint : function(row, value, displayValue) {
					var hint = this.getMessage(value+".hint");
					return "("+value+")" + (hint ? " "+hint : "");
				}
			}),
			
			new $.DataColumn({
				key : "value"
			})
		]
	}
});

})(jQuery);
