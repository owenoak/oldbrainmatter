/* 
	Different data 'views' we understand 
	-- create instances of these objects for different tables of stats you want to display.
*/
// Copyright (c) 2009-2010, Gear Six, Inc.  Subject to a BSD-style
// license whose text is available at /license.txt on this machine

function View(attributes) {
	for (var key in attributes) this[key] = attributes[key];
	if (this.viewName) SP.views[this.viewName] = this;
}
View.prototype = {
	viewType		: "instance",
	outputElement	: "#statsMain",
	hash			: undefined,


	/** Refresh the view.  Generally asynchronous because it calls "load()" */
	activate : function(options) {
		for (var key in options) {
			this[key] = options[key];
		}
		this.load();
	},
	
	/** Load our data asynchronously.  Data is processed and shown in "onLoadCompleted()". */
	load : function(url) {
		$.api.loadData(this, url || this.getUrl());
	},
	
	onLoadCompleted : undefined,
	
	/** View is going away. */
	hide : function() {},
	
	
	draw : function(outputElement, title) {
		if (!outputElement) outputElement = this.outputElement;
		$(outputElement).html(this.outputTableHTML(this, title));
	},
	

	/** Show the view.	Same code runs for all views.
		This will highlight the correct tab, view selector, serviceView and/or instance
		via the call to SP.updateViewElements
	*/
	updateViewElements : function() {
		// first update the main view elements
		SP.updateViewElements();

		if (this.viewType == "overview") {
			// hide the stats windows
			$("#statsDisplay").hide();

			// show all of the serviceWindows
			$(".ServiceView").show();

		} else {
		
			if (this.outputElement == "#traffic") {
				$("#statsTablesOuter").hide();
				$("#trafficWindow").show();

			} else {
				// hide the graph window
				$("#trafficWindow").hide();

				// hide the right and bottom stats windows as appropriate
				var outer = $("#statsTablesOuter");
				$("#statsRightWindow").toggle(this.showRightTable);
				$("#statsBottomWindow").toggle(this.showBottomTable);
				outer.show();
			}

			// and show the stats section
			$("#statsDisplay").show();
		}

		// set the title of the view's main data window
		$(this.outputElement+"Title").html(this.title);

		// if we were instructed to scroll the element into view
		if (this.scrollIntoView) {
			$(this.outputElement).scrollIntoView();

			// don't scroll into view next time unless specifically asked to
			this.scrollIntoView = false;
		}
	},


	message : function(name, type, subs) {
		if (SP.showingGear6Item() == true) {
			return $.message([this.itemType, name, "gear6", type], subs) ||
				   $.message([this.itemType, name, type], subs);
		} else {
			return $.message([this.itemType, name, type], subs);
		}
	},
	
	getHash : function() {
		return $.string.interpolate(this.hash, this);
	},
	
	getUrl : function() {
		return $.string.interpolate(this.dataUrl, this);
	},
	
	toString : function() {
		return "[View "+this.viewName+"]";
	}
}


// simple key:value stats
function StatsView(attributes) {
	for (var key in attributes) this[key] = attributes[key];
	if (this.viewName) SP.views[this.viewName] = this;
}
StatsView.prototype = new View({
	outputElement	: "#statsMain",
	columns			: "key value",
	itemType		: "stat",
	sortUp			: false,
	hash			: "##{viewName}/#{instance.name}",

	showRightTable	: false,
	showBottomTable : false,
	
	onLoadCompleted : function(data) {
		this.data = data;
		this.list = data.stat || [];
		if (! (this.list instanceof Array) ) this.list = [this.list];

		if (this.sort) this.sortData();
		
		if (this.splitRows) {
			// split into 2 columns
			var table = [];
			var max = Math.ceil(this.list.length / 2);
			for (var i = 0; i < max; i++) {
				var otherRow = this.list[i+max];
				var row = {
					key : this.list[i].key,
					value : this.list[i].value,
					key2 : (otherRow ? otherRow.key : ""),
					value2 : (otherRow ? otherRow.value : "")
				};
				table.push(row);
			}
			this.list = table;
		}

		this.draw();
		this.updateViewElements();
	},

	outputTableHTML : function(view, title, list, columns, sortCols, sort, rowCheck) {
		if (!title) title = this.viewName;
		if (!list) list = this.list;
		if (!columns) columns = this.columns;
		if (!sortCols) sortCols = this.sortCols;
		if (sortCols && typeof sortCols == "string") sortCols = sortCols.split(" ");
		if (!sort) sort = this.sort;
		
		if (typeof columns == "string") columns = columns.split(" ");
		var me = this,
		columnTitles = $.map(columns, function(colName, index) {
			return me.message(colName, "title") || colName;
			});
		
		// output a table with the stats -- better way to do this generically?
		var catRef = "SP.views[\""+this.viewName+"\"]",
		output = 
		"<div class='StatsTable' id='"+title+"Stats'>\n"
		+ (list.length == 0 
		   ? 
		   "<div class='emptyMessage'>"+$.message("UI.noDataToShow")+"</div>"
		   : 
		   
		   "<table>\n"
		   // header
		   +"<tr class='"+this.itemType+"'>"
		   + $.map(columns, function(column, index) {
			   var sortable = (sortCols && sortCols.indexOf(column) > -1 ?
					   " sortable" : "");
			   var sorted = (sort == column ? 
					 " sorted" : "");
			   return "<th class='"+column+sortable+sorted+"'"
				   + (sortable ? "onclick='"+catRef+".sortClick(\""+column+"\")'" : "")
				   +">"
				   +columnTitles[index]
				   +"</th>";
			   }).join("")
		   +"</tr>\n"
		   // list of rows
		   + $.map(list, function(item, index) {
			   // if rowCheck supplied and it is a function, call 
			   // it.  If it returns false, don't output this row.
			   if (typeof rowCheck == "function") {
				   if (!rowCheck(item, index)) {
				   return "";
				   }
			   }
			   
			   return "<tr class='"+me.itemType+" " 
				   + (index % 2 == 0 ? "even" : "odd") 
				   + (me.clickable ? " clickable" : "")
				   +"'"
				   + (me.clickable ? " onclick='"+catRef+".itemClick("+index+")'" : "")
				   + ">"
				   + $.map(columns, function(column) {
					   var value = item[column];
					   if (me[column+"CellHTML"]) {
					   return me[column+"CellHTML"](column, value, item, index);
					   } else {
					   return me.outputCellHTML(column, value);
					   }
				   }).join("")
				   +"</tr>";
			   
			   }).join("\n")
		   + "</table>"
		   )
		+"</div>"
		;
		
		return output;
	},

	
	outputCellHTML : function(className, value, hint, action) {
		if (value == null) value = "--";
		return "<td class='"+className+"'"
					+(hint ? " tooltip='"+hint+"'" : "") 
					+(action ? "onclick='"+action+"'" : "")
				+ ">"
						+value
				+"</td>";
	},

	valueCellHTML : function(column, value, item, index) {
		var title = this.message(value, "title");
		hint = this.message(value, "hint");
		if (title && hint) hint = "("+value+") "+hint;
	
		// key changes based on the column we're looking at
		var key = (column == "value2" ? item.key2 : item.key);

		switch(key) {
		case "pid":
			break;			  // do nothing to PID -- no commas wanted
		case "uptime":
			// change seconds to "3 days, 21 minutes etc"
			value = $.date.printDuration(value, true);
			break;
		case "time": 
			value = $.date.print(value * 1000);	// convert sec to msec
			break;
		default:
			// commaize numbers
			if (!isNaN(value)) {
				// it is a number
				value = $.number.commaize(value);
			}
			break;
		}
		return this.outputCellHTML(column, title||value, hint);
	},

	value2CellHTML : function(column, value, item, index) {
		return this.valueCellHTML(column, value, item, index);
	}, 

	keyCellHTML : function(column, value, item, index) {
		var title = this.message(value, "title");
		hint = this.message(value, "hint");
		if (title && hint) hint = "("+value+") "+hint;
		return this.outputCellHTML(column, title||value, hint);
	},

	key2CellHTML : function(column, value, item, index) {
		return this.keyCellHTML(column, value, item, index);
	},
	
	emptyCellHTML : function(column, value, item, index) {
		return this.outputCellHTML(column, "&nbsp;");
	},
	
	
	// default sort routine
	sortClick : function(sortCol) {
		if (this.sort == sortCol) {
			this.sortUp = !this.sortUp;
		}
		
		this.sort = sortCol;
		this.sortData();
	},

	sortData : function() {
		var table = this.table || this.list;
		var sortCol = this.sort;
		var isStringColumn = false;	 // default to numbers.
		if (table[0] != undefined) {
			isStringColumn = typeof table[0][sortCol] == "string"; 
		}
	
		if (this.sortUp) {
			if (isStringColumn) {
				table.sort(function(a,b) {
					a = (a[sortCol] || "").toLowerCase();
					b = (b[sortCol] || "").toLowerCase();
					if (a == b) return 0;
					return (a > b ? -1 : 1);
				});
			} else {
				table.sort(function(a,b) {
					if (a[sortCol] == b[sortCol]) return 0;
					return (a[sortCol] > b[sortCol] ? -1 : 1);
				});
			}
		} else {
			if (isStringColumn) {
				table.sort(function(a,b) {
					a = (a[sortCol] || "").toLowerCase();
					b = (b[sortCol] || "").toLowerCase();
					if (a == b) return 0;
					return (a < b ? -1 : 1);
				});
			} else {
				table.sort(function(a,b) {
					if (a[sortCol] == b[sortCol]) return 0;
					return (a[sortCol] < b[sortCol] ? -1 : 1);
				});
			}
		}
		this.draw();
	},
	
	getStat : function(property, value) {
		for (var i = 0, item; item = this.list[i++];) {
			if (item[property] == value) return item;
		}
	}
});


//
//	tabular stats (eg: 'slabs' section
//
function TabularStatsView(attributes) {
	for (var key in attributes) this[key] = attributes[key];
	if (this.viewName) SP.views[this.viewName] = this;
}
TabularStatsView.prototype = new StatsView({
	itemIdChunk : 0,
	keyChunk : 1,
	listPrefixes : [],
	
	
	onLoadCompleted : function(data) {
		this.data = data;
		this.list = data.stat || [];
		if (! (this.list instanceof Array) ) this.list = [this.list];

		if (this.sort) this.sortData();
		
		if (this.splitRows) {
			// split into 2 columns
			var table = [];
			var max = Math.ceil(this.list.length / 2);
			for (var i = 0; i < max; i++) {
				var otherRow = this.list[i+max];
				var row = {
					key : this.list[i].key,
					value : this.list[i].value,
					key2 : (otherRow ? otherRow.key : ""),
					value2 : (otherRow ? otherRow.value : "")
				};
				table.push(row);
			}
			this.list = table;
		}

		var map = this.map = {},
			list = [],
			table = []
		;
		var me = this;
		$.map(this.list, function(stat, index) {
			var split = stat.key.split(":");
			if	( stat.key.indexOf(":") == -1 
			  || (me.listPrefixes.indexOf(split[0]) != -1)) {
				list.push(stat);
			} else {
				if (split.length == 1) return;
				var id = split[me.itemIdChunk], key = split[me.keyChunk];
				if (!map[id]) table.push(map[id] = {id : parseInt(id)});
				map[id][key] = stat.value;
			}
		});

		this.list = list;
		this.table = table;
		
		if (this.sort) this.sortData(); 
		this.draw();
		this.updateViewElements();
	},

	draw : function(outputElement, title) {
		if (!outputElement) outputElement = this.outputElement;

		// select the proper list of columns
		if (SP.showingGear6Item()) {
			$.map(this.tables, function(tab, index) {
			if (tab.gear6Columns != undefined) {
				tab.columns = tab.gear6Columns;
			}
			});
		} else {
			$.map(this.tables, function(tab, index) {
			if (tab.stockColumns != undefined) {
				tab.columns = tab.stockColumns;
			}
			});
		}

		var me = this;
		$.map(this.tables, function(table, index) {
			var outputElement = table.outputElement || "#statsMain";
			$(outputElement).html(me.outputTableHTML(me, table.title, me[table.list], table.columns, table.sortCols, table.sort));

			var titleMsg = $.message(["view","title",table.title]) || table.title;
			$(outputElement+"Title").html($.string.interpolate(titleMsg, table));
		});
	}
});



//
// 'clients' stats
//
function ClientsView(attributes) {
	for (var key in attributes) this[key] = attributes[key];
	if (this.viewName) SP.views[this.viewName] = this;
}
ClientsView.prototype = new StatsView({
	columns : "hostname address accesses",
	itemType : "client",
	selectedClient : undefined,

	onLoadCompleted : function(data) {
		this.data = data;
		this.list = data.client || [];
		if (! (this.list instanceof Array) ) this.list = [this.list];
		if (this.sort) this.sortData();
		this.draw();
		this.updateViewElements();
		
		if (this.selectedClient) {
			this.showKeysForClient(this.selectedClient);
		}
	},

	hide : function() {
		// forget the selected key
		delete this.selectedClient;
		if (this.viewName == "clients") this.showRightTable = false;
	},

	addressCellHTML : function(column, value, item, index) {
		var value = item.ip + ":" + item.port;
		return this.outputCellHTML(column, value);
	},
	
	getClientRow : function(client) {
		if (this.list) {
			client = client.split(":");
			for (var i = 0; i < this.list.length; i++) {
				if (this.list[i].ip == client[0] && this.list[i].port == client[1]) return i;
			}
		}
		return -1;
	},

	showKeysForClient : function(client, rowNum) {
		// highlight the appropriate row
		if (rowNum == null) rowNum = this.getClientRow(client);

		// if we couldn't find that client in the list, forget it
		if (rowNum == -1) {
			delete this.selectedClient;
			return;
		}
		
		var table = $("#"+this.viewName+"Stats");
		table.find("tr").removeClass("selected");
		table.find("tr:nth-child("+(rowNum+2)+")").addClass("selected");

		var keys = SP.views.keysForClient;
		keys.title = $.message("view.title.keysForClient",{client:client}); 
		keys.client = client;
		keys.instance = this.instance;
		keys.load();

		this.showRightTable = true;
		this.selectedClient = client;
	},

	
	itemClick : function(rowNum) {
		// show the associated keys table for this client
		var client = this.list[rowNum].ip + ":" + this.list[rowNum].port;
		this.showKeysForClient(client, rowNum, true);
	}
});



//
// 'keys' stats
//
function KeysView(attributes) {
	for (var key in attributes) this[key] = attributes[key];
	if (this.viewName) SP.views[this.viewName] = this;
}
KeysView.prototype = new StatsView({
	hash			: "##{viewName}/#{instance.name}",
	columns			: "value length gets sets all reads writes total",
	itemType		: "key",
	clickable		: true,
	sortUp		: false,
	keyDisplayLength: 32,
	
	// sort columns
// TODO: enable the below and add 'sort' to the hash above to turn sorting on
//	sortCols : "rank all sets gets total reads writes",
//	sort : "rank",
	
	
	client : "",		// undefined, "top", or <ip:port>
	
	onLoadCompleted : function(data) {
		this.data = data;
		this.list = data.key || [];
		if (! (this.list instanceof Array) ) this.list = [this.list];

		if (this.sort) this.sortData();
		this.draw();
		this.updateViewElements();

		if (this.selectedKey) {
			this.showClientsForKey(this.selectedKey);
		}
	},
	
	hide : function() {
		// forget the selected key
		delete this.selectedKey;
		if (this.viewName == "keys") this.showRightTable = false;
	},

	valueCellHTML : function(column, value, item, index) {
		var truncatedValue = this.truncateKey(value), hint = "";
		if (value != truncatedValue) {
			hint = value;
			value = truncatedValue;
		}
		return this.outputCellHTML(column, value, hint);
	},
	
	truncateKey : function(value) {
		var length = value.length;
		if (length <= this.keyDisplayLength) return value;

		var firstSplit = Math.floor(this.keyDisplayLength*2/3),
			secondSplit = this.keyDisplayLength - firstSplit
		;
		return value.substr(0,firstSplit) + "&hellip;"
				+ value.substr(length - secondSplit);
	},
	
	totalCellHTML : function(column, value, item, index) { 
		return this.outputCellHTML(column, value);
	},

	readsCellHTML : function(column, value, item, index) { 
		return this.outputCellHTML(column, value);
	},
	
	writesCellHTML : function(column, value, item, index) { 
		return this.outputCellHTML(column, value);
	},
	
	itemClick : function(rowNum) {
		// now show the associaated clients table for this key
		var key = this.list[rowNum].value;
		this.showClientsForKey(key, rowNum);
	},
	
	showClientsForKey : function(key, rowNum) {
		// highlight the appropriate row
		if (rowNum == null) rowNum = this.getKeyRow(key);

		// if we couldn't find that client in the list, forget it
		if (rowNum == -1) {
			delete this.selectedKey;
			return;
		}
		
		var table = $("#"+this.viewName+"Stats");
		table.find("tr").removeClass("selected");
		table.find("tr:nth-child("+(rowNum+2)+")").addClass("selected");


		// now show the associaated clients table for this key
		var clients = SP.views.clientsForKey;
		clients.key = key;
		clients.instance = this.instance;
		clients.key64 = $.string.toSmartBase64(key);
		clients.title = $.message("view.title.clientsForKey",{key:this.truncateKey(key)}); 
		clients.load();
		
		this.selectedKey = key;
		this.showRightTable = true;
	},
	
	getKeyRow : function(key) {
		if (this.list) {
			for (var i = 0; i < this.list.length; i++) {
				if (this.list[i].value == key) return i;
			}
		}
		return -1;
	},
	
	sortClick : function(sortCol) {
		if (this.sort == sortCol) {
			this.sortUp = !this.sortUp;
		}

		this.sort = sortCol;
	this.sortData();
	}
});



//
//	Traffic section
//
//	 Chart types are enumerated in SP.dataSeriesMap and the message dictionary.
//
function TrafficView(attributes) {
	for (var key in attributes) this[key] = attributes[key];
	if (this.viewName) SP.views[this.viewName] = this;
}
TrafficView.prototype = new View({
	viewType		: "instance",
	outputElement		: "#traffic",
	dataId			: "composite",
	defaultDataId		: "composite",

	liveData		: true,
	
	dataUrl			: "api/MemcacheServer/latest/#{instance.id}/data/#{dataId}?start=#{_start}&end=#{_end}&samples=#{_samples}",
	hash			: "##{viewName}/#{instance.name}",


	/** Show the view. */
	activate : function(hash) {
		if (hash) {
			for (var key in hash) {
				if (key == 'id') this.dataId = hash.id;
				else this[key] = hash[key];
			}
		}

		// make sure that we're displaying a data id that we can actually draw
		if (!SP.dataSeriesMap[this.dataId]) this.dataId = this.defaultDataId;

		this.load();
	},

	load : function(url) {
		// munge the start and end into date strings if necessary
		if (SP.trafficEnd == "now") {
			this._start = Math.round(SP.trafficStart / 1000);  // convert to seconds for the server
			this._end = SP.trafficEnd;
		} else {
			this._start = $.date.printIso8601(SP.trafficStart, $.date.timezoneOffset);
			this._end	= $.date.printIso8601(SP.trafficEnd,   $.date.timezoneOffset);
		}
		var width = $.chart.getWidth() || SP.config.maxDataSamples;
		this._samples = Math.min(SP.config.maxDataSamples, width);
		
		$.api.loadData(this, url || this.getUrl() );
	},
	
	onLoadCompleted : function(data) {
		this.serverData = data;
		this.draw();
		this.updateViewElements();
	},

	draw : function() {
		// update the slider
		$.slider.update(SP.trafficStart, SP.trafficEnd);

		// update the title and live indicator
		var liveIndicator = $.message((SP.trafficEnd == "now" 
											? "traffic.data.liveTitle" 
											: "traffic.data.historicalTitle")
									  )
		;
		$("#trafficTitle").html(this.title);
		$("#trafficLiveIndicator").html(liveIndicator);

		$.chart.update(this.serverData);
	},
	
	resize : function() {
		// wait 500 msec to redraw so we don't hammer the chart
		if (this._resizeTimer) clearTimeout(this._resizeTimer)
		this._resizeTimer = setTimeout(function(){	$.chart.resize() }, 500);
	},
	
	setDataId : function(dataId) {
		this.dataId = dataId;
	},
	
	// start and end are timestamps
	setRange : function(start, end) {
//console.warn("info.setRange ",start, ",", end);
		if (start != null) SP.trafficStart = start;
		if (end != null) SP.trafficEnd = end;
		$.slider.setRange(SP.trafficStart, SP.trafficEnd);
	}

});





/******
 *
 * Create the actual stat views we can show
 *
 *******/

//
// raw stats
//
new StatsView({
	viewName:"basic",
	dataUrl : "api/MemcacheServer/latest/#{instance.id}/stats/basic",
	splitRows : true,
	columns : "key value empty key2 value2"
});

new StatsView({
	viewName:"health",
	gear6only : true,					// only for gear6 services
	dataUrl : "api/MemcacheServer/latest/#{instance.id}/stats/health",
	outputElement : "#statsMain"
});

new StatsView({
	viewName:"replication",
	gear6only : true,					// only for gear6 services
	dataUrl : "api/MemcacheServer/latest/#{instance.id}/stats/replication",
	outputElement : "#statsMain"
});


//
//	"tabular" stats
//
new TabularStatsView({	
	viewName: "slabs",
	gear6only : true,					// only for gear6 services
	dataUrl : "api/MemcacheServer/latest/#{instance.id}/stats/slabs",
	sortCols : "id name chunk_size chunks_per_slab total_slabs total_chunks used_chunks free_chunks",
	tables : [
		{	list : "table",
			title : "slabs",
	columns : "id name chunk_size chunks_per_slab total_slabs total_chunks used_chunks free_chunks",
	gear6Columns : "id name chunk_size chunks_per_slab total_slabs total_chunks used_chunks free_chunks",
	stockColumns : "id chunk_size chunks_per_page total_pages total_chunks used_chunks free_chunks free_chunks_end"
		}
	],

	used_chunksCellHTML : function(column, value, item, index) {
		var master = parseInt(item.total_chunks) || 0;
		value = $.number.printValueWithPercentage(value, master);
		return this.outputCellHTML(column, value);
	},

	free_chunksCellHTML : function(column, value, item, index) {
		var master = parseInt(item.total_chunks) || 0;
		value = $.number.printValueWithPercentage(value, master);
		return this.outputCellHTML(column, value);
	}
});

new TabularStatsView({	
	viewName: "items",
	itemIdChunk : 1,
	keyChunk : 2,
	dataUrl : "api/MemcacheServer/latest/#{instance.id}/stats/items",
	tables : [
		{	list : "table",
			title : "items",
			columns	 : "id number age evicted evicted_time outofmemory tailrepairs",
			gear6Columns  : "id number age evicted evicted_time outofmemory tailrepairs",
			stockColumns  : "id number age evicted outofmemory",
			sortCols : "id number age evicted evicted_time outofmemory tailrepairs"
		}
	]
});

new TabularStatsView({	
	viewName: "memory",
	dataUrl : "api/MemcacheServer/latest/#{instance.id}/stats/memory",
	listPrefixes : ["malloc"],
	showRightTable	: true,
	tables : [
		{	list : "list", 
			title : "memory",
			columns : "key value"
		},
		
		{	list : "table", 
			title : "memory2",
			columns : "name bytes evictions",
			sortCols : "name bytes evictions",
			outputElement : "#statsRight"
		}			
	],
	
	valueCellHTML : function(column, value, item, index) {
		switch (item.key) {
			case "total_in_use":
			case "total_free":
				master = parseInt(this.getStat("key", "total_bytes").value);
				value = $.number.printValueWithPercentage(value, master);
		}
		return this.outputCellHTML(column, value);
	}
});

new TabularStatsView({
	viewName:"storage",
	gear6only : true,					// only for gear6 services
	dataUrl : "api/MemcacheServer/latest/#{instance.id}/stats/storage",
	nameDisplayLength : 8,
	tables : [
		{	list : "table",
			title : "storage",
			columns : "id name total_bytes total_in_use dirty_data bytes_read read_MBPS bytes_written "
					+ "write_MBPS eff_write_MBPS average_write_size write_idle_percentage "
					+ "evictions total_lock",

			sortCols : "id name total_bytes total_in_use dirty_data bytes_read bytes_written "
					 + "write_MBPS eff_write_MBPS average_write_size write_idle_percentage "
					 + "read_MBPS evictions total_lock"
		}
	],

	rowCheck : function(item, index) {
		// check to see if the storage name matches a linux device
		// ("/dev/" at the beginning of the string):
		//		return true (and show this row) if it does, false
		//		(and don't show the row) if it doesn't
		if ( /^\/dev\//.exec(item.name)) {
		return true;
		} else {
		return null;
		}
	},

	nameCellHTML : function(column, value, item, index) {
		var length = value.length, hint = "";
		if (length > this.nameDisplayLength) {
			hint = value;
			value = hint.substr(0,this.nameDisplayLength) + "...";
		}
		return this.outputCellHTML(column, value, hint);
	},

	total_in_useCellHTML : function(column, value, item, index) {
		var master = parseInt(item.total_bytes) || 0;
		value = $.number.printValueWithPercentage(value, master, "B ");
		return this.outputCellHTML(column, value);
	},

	dirty_dataCellHTML : function(column, value, item, index) {
		var master = parseInt(item.total_bytes) || 0;
		value = $.number.printValueWithPercentage(value, master, "B ");
		return this.outputCellHTML(column, value);
	},
	
	eff_write_MBPSCellHTML : function(column, value, item, index) {
		var master = parseInt(item.write_MBPS) || 0;
		value = $.number.printValueWithPercentage(value, master, "MB/S ");
		return this.outputCellHTML(column, value);
	}
});


//
// clients stats
//
new ClientsView({
	viewName:"clients",
	dataUrl : "api/MemcacheServer/latest/#{instance.id}/stats/clients",
	columns : "rank hostname address accesses actions",
	clickable : true,
	actionsCellHTML : function(column, value, item, index) {
		return this.outputCellHTML(column, this.message("showTopKeys","title"));
	}
});

new ClientsView({
	viewName:"clientsForKey",
	columns : "rank hostname address accesses",
	dataUrl : "api/MemcacheServer/latest/#{instance.id}/stats/clients/key/#{key64}",
	outputElement : "#statsRight",
	showRightTable : true
});

//
// keys stats
//
new KeysView({
	viewName: "keys",
	columns	: "rank value gets sets all reads writes total",
	keyDisplayLength: 16,
	dataUrl : "api/MemcacheServer/latest/#{instance.id}/stats/keys"//?sort=#{sort}",

});

new KeysView({
	hash : "",		// don't remember that we're looking at this
	viewName: "keysForClient",
	dataUrl : "api/MemcacheServer/latest/#{instance.id}/stats/keys/client/#{client}",//?sort=#{sort}",
	clickable : false,
	columns			: "rank value gets sets all reads writes total",
	keyDisplayLength: 12,
	outputElement : "#statsRight",
	showRightTable : true
});


//
//	Overview section
//
new View({
	viewName		: "overview",
	viewType		: "overview",
	hash			: "#overview",

	activate : function() {
		this.updateViewElements();
	}
});

