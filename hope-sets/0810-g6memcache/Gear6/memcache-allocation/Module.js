// -*- Mode: javascript; javascript-indent-level: 4; indent-tabs-mode: t -*-
//
// add view methods/properties to the Gear6.Module class
//
Object.extend(Gear6.Module.prototype, {
    parentId				: "Gear6Modules",
	autoDraw				: true,
	drawDetails 			: false,

	// don't highlight diffs in the module (bays have their own setting below)
	highlightDifferences 	: false,	

	graphUnits				: 2 * Math.GB,		// units for the allocation graph 
							//	-- 1 graphUnit = 1 pixel of height
	minheight               : 16,			// minimum height for graph - should be enough 
													// to let service name show

	//
	// instance methods
	//
	
	prepareToDraw : function() {
		DataWidget.prototype.prepareToDraw.apply(this, arguments);
		var snapshot = this.snapshot;
		
		// indicator if this is a master node
		snapshot.master = (this.data.role == "master" ? this.messages.masterModule : "");

		// Dram graph - calculate size based on our data
		this.getDramUsage(snapshot);
		snapshot.dram.height = (snapshot.totalRam / this.graphUnits).floor().max(this.minheight) + "px"

		// Flash graph - calculate sizes based on actual child bays
		this.getFlashUsage(snapshot);
		snapshot.flash.height = (snapshot.totalFlash / this.graphUnits).floor().max(this.minheight) + "px";

		// prepare the instances to draw
		this.instances = this.getMemcacheInstances();
		this.instances.invoke("prepareToDraw");

		// prepare the reserved system memory piece
		snapshot.reservedWidth = 
		  ((window.reservedMemory * Math.MB) / snapshot.totalRam).toPercent(2,true) + "%";

		// draw the dram pieces
		snapshot.graph = snapshot.dram;
		snapshot.dram.headerGraphHTML = this.HeaderGraphTemplate.evaluate(this);
		snapshot.dram.instancesHTML = this.getInstancesDramHTML();
		snapshot.dram.allocationGraphHTML = this.AllocationGraphTemplate.evaluate(this);
		snapshot.dram.graph = snapshot.graph;

		// draw the flash pieces
		snapshot.graph = snapshot.flash;
		snapshot.flash.headerGraphHTML = this.HeaderGraphTemplate.evaluate(this);
		snapshot.flash.instancesHTML = this.getInstancesFlashHTML();
		snapshot.flash.allocationGraphHTML = this.AllocationGraphTemplate.evaluate(this);
		snapshot.flash.graph = snapshot.graph;
	},
	
	getInstancesDramHTML : function() {
        return this.SystemBarTemplate.evaluate(this) +
            this.instances.collect(function(instance) {
			return instance.snapshot.dram.barHTML || "";
		}).join("");
	},
	
	getInstancesFlashHTML : function() {
		return this.instances.collect(function(instance) {
			return (instance.snapshot.flash ? instance.snapshot.flash.barHTML : "");
		}).join("");
	},
	
	
	OuterTemplate : new Template(
		"<div class='Section #{snapshot.dram.errorClassName} #{snapshot.flash.errorClassName}'>\
			<div class='SectionHeader noselect' round='mediumT'>\
				<table class='SectionHeaderTable' width='100%' height='100%' cellspacing='0' cellpadding='0'><tr>\
					<td class='SectionHeaderCell CollapserCell TitleCell' \
						onclick='#{globalRef}.toggle()'\
					>\
						<span class='SectionTitle'>\
							#{snapshot.name} \
							#{snapshot.master}\
						</span>\
					</td>\
					#{snapshot.dram.headerGraphHTML}\
					#{snapshot.flash.headerGraphHTML}\
				</tr></table>\
			</div>\
			<div class='SectionBody' round='mediumB'>\
				<table class='AllocationGraphOuterTable' cellspacing=0 cellpadding=0>\
					#{snapshot.dram.allocationGraphHTML}\
					#{snapshot.flash.allocationGraphHTML}\
				</table>\
			</div>\
		</div>"

	),

	HeaderGraphTemplate : new Template(
		"<td class='GraphTd'>\
			 <span class='GraphTitle'>#{snapshot.graph.title}: </span>\
			 <div class='UsageGraph'>\
				<div updateThis='#{snapshot.graph.name}.graph.Percent:width:' \
					 style='width: #{snapshot.graph.Percent};' \
					 class='UsageGraphUsed low #{snapshot.graph.errorClassName}'></div>\
			</div>\
			<span class='GraphPercent' updateThis='#{snapshot.graph.name}.graph.Ratio'>#{snapshot.graph.Ratio}</span>\
		</td>"
	),
	
	AllocationGraphTemplate : new Template(
		"<tr>\
			<td class='topLabel'>\
				<table width=100% cellspacing=0 cellpadding=0><tr>\
					<td class='title #{snapshot.graph.errorClassName}'>\
						#{snapshot.graph.title}\
						(<span>#{snapshot.graph.Ratio}</span>)\
						<span class='value'>#{snapshot.graph.message}</span>\
					</td>\
					<td class='right #{snapshot.graph.errorClassName}'>\
						<span class='label'>Allocated:</span>           \
						<span class='value'>#{snapshot.graph.Used}</span>\
						<span class='label'>Total:</span>\
						<span class='value'>#{snapshot.graph.Total}</span>\
					</td>\
				</tr></table>\
			</td>\
		</tr>\
		<tr>\
			<td class='AllocationGraphTD'>\
				<div class='AllocationGraph #{snapshot.graph.errorClassName}' style='height:#{snapshot.graph.height}'>\
					#{snapshot.graph.instancesHTML}\
				</div>\
			</td>\
		</tr>"
    ),
	SystemBarTemplate : new Template(
		"<div class='AllocationBar SystemReservedMemory'\
			style='width:#{snapshot.reservedWidth}'>\
			<div class='ServiceTitle'>System</div>\
		</div>"
	)
});
