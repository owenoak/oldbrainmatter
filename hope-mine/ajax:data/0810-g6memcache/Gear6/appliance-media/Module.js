//
// add view methods/properties to the Gear6.Module class
//
Object.extend(Gear6.Module.prototype, {
	parentId			: "Gear6Modules",
	autoDraw			: true,
	
	// don't highlight diffs in the module (bays have their own setting below)
	highlightDifferences : false,	
	updateElementSelector : ".SectionHeader",
	

	//
	// instance methods
	//
	
	// callback when the server has loaded the details to be displayed for a bay
	showBayDetails : function(bayId, data) {
		this.getBay(bayId).showDetails(data);
	},
	
	
	prepareToDraw : function() {
		DataWidget.prototype.prepareToDraw.apply(this, arguments);
		
		var snapshot = this.snapshot;
		
		// indicator if this is a master node
		snapshot.master = (this.data.role == "master" ? this.messages.masterModule : "");
		
		// Dram graph
		snapshot.dramGraphTotal = Math.ceil(this.data.totalRam / (1024*1024*1024));
		snapshot.dramGraphPercent = Math.min(100,Math.ceil(this.data.allocRam * 100 / this.data.totalRam)) + "%";
		snapshot.dramGraph = this.DramGraphTemplate.evaluate(this);

		// total Flash graph
		this.aggregateFlashUsage(snapshot);		// calculate based on child bays
		snapshot.flashGraphTotal = Math.ceil(snapshot.totalFlash / (1024*1024*1024));
        if ( snapshot.totalFlash == 0) {
            snapshot.flashGraphPercent = "0%";  // no flash means none can be allocated
        } else {
            snapshot.flashGraphPercent = Math.ceil(snapshot.allocFlash * 100 / snapshot.totalFlash) + "%";
        }
		snapshot.flashGraph = this.FlashGraphTemplate.evaluate(this);
		
		// possible critical or warning button in top
		snapshot.headerClassName = "SectionHeader roundTOPmedium noselect";
		this.aggregateWarnings(snapshot);
		if (snapshot.warningStatus) {
			snapshot.headerClassName += " Section" + snapshot.warningStatus;
			snapshot.headerWarning = this.WarningIconTemplate.evaluate(this);
//			snapshot.headerWarning = "("+snapshot.warningStatus+")";
		} else {
			snapshot.headerWarning = "";
		}
	},
	
	
	// aggregate warnings from children 
	//	-- show "Critical" or "Warning" button if any bays are in that state
	aggregateWarnings : function(snapshot) {
		var status = "";
		for (var i = 0; i < this.bays.length; i++) {
			var bay = this.bays[i];
			if (bay.data.status == "empty") continue;
			if (bay.data.health == "critical") status = "Critical";
			else if (bay.data.health == "warning" && !status) status = "Warning";
		}
		snapshot.warningStatus = status;
	},

	OuterTemplate : new Template(
		"<div class='Section'>\
			<div class='#{snapshot.headerClassName}' updateThis='headerClassName:class'>\
				<table width='100%' height='100%' cellspacing='0' cellpadding='0'><tr>\
					<td class='SectionHeaderCell CollapserCell' \
						onclick='#{globalRef}.toggle()'\
					>\
						<span class='SectionTitle'>\
							#{snapshot.name} \
							#{snapshot.master}\
						</span>\
						<span updateThis='headerWarning'>#{snapshot.headerWarning}</span>\
					</td>\
					#{snapshot.dramGraph}\
					#{snapshot.flashGraph}\
				</tr></table>\
			</div>\
		\
			<div class='SectionBody roundBOTTOMmedium'>\
				<table class='MemcacheBayOuterTable' width='100%' cellspacing='0' cellpadding='0'>\
				<tr>\
					<td class='MemcacheBayCell'>\
						<div class='MemcacheBayContainer Container01 ContainerTop'>\
							#{snapshot.baysItemHTML.0}\
						</div></td>\
					<td class='MemcacheBayCell'>\
						<div class='MemcacheBayContainer Container03 ContainerTop'>\
							#{snapshot.baysItemHTML.2}\
						</div></td>\
					<td class='MemcacheBayCell'>\
						<div class='MemcacheBayContainer Container05 ContainerTop'>\
							#{snapshot.baysItemHTML.4}\
						</div></td>\
				</tr><tr>\
					<td class='MemcacheBayCell'>\
						<div class='MemcacheBayContainer Container02 ContainerBottom'>\
							#{snapshot.baysItemHTML.1}\
						</div></td>\
					<td class='MemcacheBayCell'>\
						<div class='MemcacheBayContainer Container04 ContainerBottom'>\
							#{snapshot.baysItemHTML.3}\
						</div></td>\
					<td class='MemcacheBayCell'>\
						<div class='MemcacheBayContainer Container06 ContainerBottom'>\
							#{snapshot.baysItemHTML.5}\
						</div></td>\
				</tr>\
				</table>\
			</div>\
		</div>"

	),

	WarningIconTemplate : new Template(
		"<span class='inline_block #{snapshot.warningStatus}Icon'>&nbsp;</span>"
	),
	
	DramGraphTemplate : new Template(
		"<td class='dramGraphTitle'>#{snapshot.dramGraphTotal} GB DRAM</td>\
		<td class='dramGraph'>\
			<div class='UsageGraph'>\
				<div updateThis='dramGraphPercent:width' style='width: #{snapshot.dramGraphPercent};' class='UsageGraphUsed low'></div>\
			</div>\
		</td>\
		<td class='dramGraphPercent' updateThis='dramGraphPercent'>#{snapshot.dramGraphPercent}</td>"
	),
	
	FlashGraphTemplate : new Template(
		"<td class='flashGraphTitle'>#{snapshot.flashGraphTotal} GB Flash</td>\
		<td class='flashGraph'>\
			<div class='UsageGraph'>\
				<div updateThis='flashGraphPercent:width' style='width: #{snapshot.flashGraphPercent};' class='UsageGraphUsed low'></div>\
			</div>\
		</td>\
		<td class='flashGraphPercent' updateThis='flashGraphPercent'>#{snapshot.flashGraphPercent}</td>"
	)	
});
