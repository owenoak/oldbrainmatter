//
// add view methods/properties to the Gear6.MemcacheInstance class
//
Gear6.MemcacheInstance.nextColor = 0;
Object.extend(Gear6.MemcacheInstance.prototype, {
	prepareToDraw : function() {
		DataWidget.prototype.prepareToDraw.apply(this, arguments);
		var snapshot = this.snapshot;
		
		// figure out the color
		snapshot.color = this.service.getColor();
		
		// call the generic getUsageData method
		//	which decodes the wierd server properties into a series of graphs,
		//		snapshot.flash
		//		snapshot.dram
		//		snapshot.items
		//	(see base MemcacheInstace and DataWidget classes)
		snapshot.flash = this.getFlashUsage();
		snapshot.dram = this.getDramUsage();
		snapshot.items = this.getItemsUsage();
		
		// always draw the DRAM bar
		snapshot.dram.barHTML = this.getAllocationBarHTML(snapshot.dram, this.module.snapshot.dram);

		// draw the Flash bar if necessary
		if (this.service.isFlashEnabled()) {
			snapshot.flash.barHTML = this.getAllocationBarHTML(snapshot.flash, this.module.snapshot.flash);
		}
	},
	
	getAllocationBarHTML : function(graph, moduleGraph) {
		if (graph.total == 0) {
			// don't draw the bar at all if the size will be zero
			return "";
		} else {
			this.snapshot.graph = graph;
			graph.width = (graph.total / moduleGraph.total).toPercent(2,true);
			// if it's non-zero, make a minimum width
			if (graph.width < 2) {
				graph.width = "5px";
			} else {
				graph.width += "%";
			}
			return this.BarTemplate.evaluate(this);
		}
	},
	
	BarTemplate : new Template(
		"<div class='AllocationBar #{snapshot.color}Service'\
			style='width:#{snapshot.graph.width}'\
			onmouseover='MS.prototype.hoverTooltip.onTargetEnter(event, this, #{service.globalRef}, \"#{snapshot.ip}\")' \
			onmouseout ='MS.prototype.hoverTooltip.onTargetLeave(event, this, #{service.globalRef})'\
			onmousemove='MS.prototype.hoverTooltip.onTargetMove(event, this, #{service.globalRef})'\
			onclick='#{service.globalRef}.onClick(Event.extend(event||window.event))'\
		>\
			<div class='Used'\
				style='width:#{snapshot.graph.Percent}'\
			></div>\
			<div class='ServiceTitle'>#{service.id}</div>\
		</div>"
	)
	
});
