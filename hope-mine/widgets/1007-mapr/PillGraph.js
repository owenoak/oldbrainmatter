/*
	"PillGraph" and "UsageGraph" form widgets and grid columns
	Copyright (c) 2010, MapR Technology.  All rights reserved.
 */


(function() {	// begin hidden from global scope


// properties/methods common to PillGraph and PillGraphColumn
var PillGraphProps = {
	// format string for percent values (see util.format)
	percentFormat : "percent:0",
	
	// css class to add to the .pill-graph element
	cls : "",

	// theshold map:
	//	for each key in the map, if percent is between max and min, we'll add that key as
	//	a css class on pill-container, default is to color the pill-fill
	thresholdMap : undefined,

	// expandable string for the label inside the pill, passed a pointer to .record
	//	record.graph can be used to get values (see setValue)
	graphLabel : $tx("{{_graph.percent}}%"),
	
	// expandable string for the hover tooltip, passed a pointer to .record
	//	record.graph can be used to get values (see setValue)
	graphTip : "",
	
	// name of the field used to express percent
	name : undefined,

	// return the graph data
	//	simple PillGraph just returns percent, more advanced graphs may set other things
	getGraphData : function(record) {
		return {
			percent : util.format(this.getPercent(record), this.percentFormat)
		};
	},
	
	// record._graph will be the graph data
	getGraphLabel : function(record) {
		return $msg.expand(this.graphLabel, record);
	},

	// record._graph will be the graph data
	getGraphTip : function(record) {
		return (this.graphTip ? $msg.expand(this.graphTip, record) : "");
	},
	
	// return the first matching class from our thresholdMap
	getThresholdClass : function(record) {
		var percent = record._graph.percent;
		if (this.thresholdMap) {
			for (var cls in this.thresholdMap) {
				var min = this.thresholdMap[cls].min,
					max = this.thresholdMap[cls].max,
					match = true
				;
				if (min != null && percent < min) continue;
				if (max != null && percent > max) continue;
				return cls;
			}
		}
	},
	
	// return the actual HTML for the graph
	getGraphHTML : function(percent, label, cls, width) {
		return "<div class='pill-graph "+(cls||"")+"' style='width:"+width+"'>"
				 + "<div class='pill-graph-fill' style='width:"+percent+"%'></div>"
				 + "<span class='pill-graph-label'>"+label+"</span>"
			 + "</div>";
	}
};


// PillGraph form widget which shows a single percentage value
//
// NOTE: you must set pillgraph.owner, which must have owner.record which returns
//			simple object to get values from
mapr.widgets.PillGraph = Ext.extend(
	Ext.form.Field, 
	util.mergeDefaults(
		PillGraphProps,
		{
			// width of the entire thing -- percentage of container or fixed width
			width : "100%",

			// render an outer div, we'll set the contents in setValue
			defaultAutoCreate : {tag:"div", type:"pill-container"},
		
			// function which gets the record to use for determining values
			getRecord : function() {
				return util.protoClone(this.owner.record||{});
			},
			
			// return the percent:  record[this.name]
			getPercent : function(record) {
				return (parseFloat(record[this.name]) || 0);
			},
			
			// value is the percent
			setValue : function(percent) {
				var record = this.getRecord();
				var data = record._graph = this.getGraphData(record);
		
				var percent = Math.range(0, data.percent, 100),
					cls 	= [	this.cls, 
								this.getThresholdClass(record),
								(data.percent > 98 ? "pill-graph-round-end" : "")
							  ].join(" "),
					label 	= this.getGraphLabel(record)
				;
				// actually set the HTML
				var html = this.getGraphHTML(percent, label, cls, this.width);
				this.el.dom.innerHTML = html;
				
				// show tooltip if defined
				var tip = this.getGraphTip(record);
				if (tip) {
					if (!this.tip) this.tip = new Ext.ToolTip({target:this.el, html:"tooltip"});
					this.tip.setHTML(tip);
				}
			}
		}
	)
);
Ext.reg("pillgraph", mapr.widgets.PillGraph);



// properties/methods common to UsageGraph and UsageGraphColumn
var UsageGraphProps = {
	// format string for numeric values (see util.format)
	numberFormat : "0",

	// string to use as the label for the tooltip (skipped if empty)
	tipLabel : undefined,

	// units (for formatting in default label tooltip)
	units : "",
	
	// expandable string for the label inside the pill, passed a pointer to .record
	//	record.graph can be used to get values (see setValue)
	graphLabel : $tx("{{_graph.percent}}% of {{_graph.total}}{{_graph.units}} in use"),
	
	// expandable string for the hover tooltip, passed a pointer to .record
	//	record._graph can be used to get values (see setValue)
	graphTip : $tx(  "{{_graph.tipLabel}}"
					+"<table style='pill-graph-tip'>"
					+"<tr>"
						+"<td class='pill-graph-tip-label'>Used:</td>"
						+"<td class='pill-graph-tip-amount'>{{_graph.used}}{{_graph.units}}</td>"
						+"<td class='pill-graph-tip-percent'>({{_graph.percent}}%)</td>"
					+"</tr><tr>"
						+"<td class='pill-graph-tip-label'>Free:</td>"
						+"<td class='pill-graph-tip-amount'>{{_graph.free}}{{_graph.units}}</td>"
						+"<td class='pill-graph-tip-percent'>({{_graph.freePercent}}%)</td>"
					+"</tr><tr>"
						+"<td class='pill-graph-tip-label'>Total:</td>"
						+"<td class='pill-graph-tip-amount'>{{_graph.total}}{{_graph.units}}</td>"
					+"</tr></table>"
				),
	
	// expandable string for label of the tooltip
	//	record._graph can be used to get values (see setValue)
	graphTipLabel : $tx("<div class='pill-graph-tip-header'>{{_graph.tipLabel}}</div>"),
	
	// return the graph data
	//	simple PillGraph just returns percent, more advanced graphs may set other things
	getGraphData : function(record) {
		var used  = this.getUsed(record)
			total = this.getTotal(record),
			free  = (total - used),
			percent = (total != 0 ? used*100/total : 0),
			freePercent = (total != 0 ? free*100/total : 0)
		;
		
		return {
			units 		 : this.units,
			total 		 : util.format(total, this.numberFormat),
			used  		 : util.format(used, this.numberFormat),
			free  		 : util.format(free, this.numberFormat),
			percent  	 : util.format(percent, this.percentFormat),
			freePercent  : util.format(freePercent, this.percentFormat)
		};
	},

	// record._graph will be the graph data
	getGraphTip : function(record) {
		if (this.tipLabel) record._graph.tipLabel = $msg.expand(this.tipLabel, record);
		return (this.graphTip ? $msg.expand(this.graphTip, record) : "");
	}
};


// PillGraph which shows "used vs. total" percentage
//
// NOTE: you must set pillgraph.owner, which must have owner.record which returns
//			simple object to get values from
mapr.widgets.UsageGraph = Ext.extend(mapr.widgets.PillGraph, 
	util.mergeDefaults(
		UsageGraphProps,
		{
			// name of the "total" field
			totalName : undefined,
			
			getUsed : function(record) {
				return parseFloat(record[this.name]) || 0;
			},
			
			getTotal : function(record) {
				return parseFloat(record[this.totalName]) || 0;
			}
		}
	)
);
Ext.reg("usagegraph", mapr.widgets.UsageGraph);







// PillGraph Grid Column
//	.dataIndex should map to a "percent" value
mapr.widgets.PillGraphColumn = Ext.extend(
	Ext.grid.Column, 
	util.mergeDefaults(
		PillGraphProps,
		{
			// default to 100 pixels wide
			width:100, 
			
			// return the percent value
			getPercent : function(record) {
				return (parseFloat(record[this.dataIndex]) || 0);
			},
			
			renderer : function(value, metaData, record, rowIndex, colIndex, store) {
				// get a clone of the actual data pointer
				record = util.protoClone(record.data);
				var data = record._graph = this.getGraphData(record);
	
				var percent = Math.range(0, data.percent, 100),
					cls 	= [	this.cls, 
								this.getThresholdClass(record),
								(data.percent > 98 ? "pill-graph-round-end" : "")
							  ].join(" "),
					label 	= this.getGraphLabel(record)
				;
				var html = this.getGraphHTML(percent, label, cls, "100%");
				return html;
			}
		}
	)
);
Ext.grid.Column.types["pillgraph"] = mapr.widgets.PillGraphColumn;




// UsageGraph Grid Column
//	.dataIndex should map to a "used" value
//	.totalIndex should map to a "total" value
mapr.widgets.UsageGraphColumn = Ext.extend(
	mapr.widgets.PillGraphColumn, 
	util.mergeDefaults(
		UsageGraphProps,
		{
			// name of the "total" field
			totalName : undefined,
			
			// get the used value
			getUsed : function(record) {
				return parseFloat(record[this.dataIndex]) || 0;
			},
			
			// get the total value
			getTotal : function(record) {
				return parseFloat(record[this.totalIndex]) || 0;
			}
		}
	)
);
Ext.grid.Column.types["usagegraph"] = mapr.widgets.UsageGraphColumn;




})();			// end hidden from global scope
