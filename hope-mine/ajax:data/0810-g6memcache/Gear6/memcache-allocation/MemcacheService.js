//
// add view methods/properties to the Gear6.MemcacheService class
//

Gear6.MemcacheService.nextColor = 0;
Object.extend(Gear6.MemcacheService.prototype, {

	//
	//	colors for different services
	//

	colors : $w("Blue Orange Purple"),
	getColor : function() {
		if (this.color) return this.color;
		var next = (this.constructor.nextColor++ % this.colors.length);
		return (this.color = this.colors[next]);
	},
	
	
	//
	// click -- bring up the edit dialog
	//
	
	onClick : function(event) {
		this.hoverTooltip.hide();
        this.onEditService();
	},
	

	// they clicked the 'Edit' link for this service
	onEditService : function() {
        if (window.privileged != "0") {
            // can't edit services if no 
            MemcacheService.editor.open(this, "edit");
        }
		return undefined;		// so anchor that calls this doesn't actually navigate
	},



	//
	//	hover: show details
	//

	// create a single tooltip for all services since only one will be shown at a time
	hoverTooltip : new Tooltip(),

	prepareToDraw : function(instanceIp) {
		DataWidget.prototype.prepareToDraw.apply(this, arguments);
		var snapshot = this.snapshot;
		
		snapshot.enabled   = (this.data.enabled ? "Enabled" : "Disabled");
		snapshot.mirroring = this.getReplicationTitle();

		// get usage data or the 'service' column   (skip the 'instance' calculations)
		snapshot.service = {
			dram  : this.getServiceDramUsage(),
			flash : this.getServiceFlashUsage(),
			items : this.getServiceItemsUsage()
		}
		
		// get info for the memory thermometer at the bottom of the hover
		snapshot.memoryUsage = this.getMemoryUsage();

		// instance has already been drawn at this point
		//	so just get its instance data to draw the tooltip
		snapshot.instanceIp = instanceIp;
		snapshot.instance = this.getInstance(instanceIp).snapshot;
	},

	getTooltipData : function(instanceIp) {
		this.prepareToDraw(instanceIp);
		return {
			className : "ServiceTooltip",
			title : this.TooltipTitleTemplate.evaluate(this),
			contents : (this.isFlashEnabled()
						  ? this.Gear6TooltipContentsTemplate.evaluate(this)
// TURNING OFF USAGE BAR 'CAUSE IT'S CAUSING LAYOUT PROBLEMS IN IE
						  	+ this.UsageBarTemplate.evaluate(this)
						  : this.ContentsTemplate.evaluate(this)
					   )
		};
	},
	

	TooltipTitleTemplate : new Template(
		"<table><tr>\
			<td class='service'>\
				<span class='Label'>Service:</span>\
				#{id}\
			</td>\
			<td class='Hint'>(click to edit)</td>\
		</tr></table>"
	),
	
	ContentsTemplate : new Template(
		"<div class='details'>\
			<span class='detail'>#{snapshot.enabled}</span>\
			&bull;\
			<span class='detail'>#{snapshot.packageName}</span>\
		</div>\
		\
		<table class='infoTable' round='medium' cellspacing=0 cellpadding=0>\
			<tr>\
				<td class='topLabel' round='mediumTL'>DRAM</td>\
				<td class='topLabel'				 >instance #{snapshot.instance.ip}</td>\
				<td class='topLabel' round='mediumTR'>entire service</td>\
			</tr>\
			<tr>\
				<td class='label'>Used</td>\
				<td class='value'>#{snapshot.instance.dram.Used}</td>\
				<td class='value'>#{snapshot.service.dram.Used}</td>\
			</tr>\
			<tr>\
				<td class='label'>Free</td>\
				<td class='value'>#{snapshot.instance.dram.Free}</td>\
				<td class='value'>#{snapshot.service.dram.Free}</td>\
			</tr>\
			<tr>\
				<td class='label heavyBottom'>Total</td>\
				<td class='value heavyBottom'>#{snapshot.instance.dram.Total}</td>\
				<td class='value heavyBottom'>#{snapshot.service.dram.Total}</td>\
			</tr>\
		</table>"
	),
	
	Gear6TooltipContentsTemplate : new Template(
		"<div class='details'>\
			<span class='detail'>#{snapshot.enabled}</span>\
			&bull;\
			<span class='detail'>#{snapshot.mirroring}</span>\
			&bull;\
			<span class='detail'>#{snapshot.packageName}</span>\
		</div>\
		\
		<table class='infoTable' round='medium' cellspacing=0 cellpadding=0>\
			<tr>\
				<td class='topLabel' round='mediumTL'>DRAM</td>\
				<td class='topLabel value'				 >instance #{snapshot.instance.ip}</td>\
				<td class='topLabel value' round='mediumTR'>entire service</td>\
			</tr>\
			<tr>\
				<td class='label'>Item Buffer Size</td>\
				<td class='value'>#{snapshot.instance.dram.Used}</td>\
				<td class='value'>#{snapshot.service.dram.Used}</td>\
			</tr>\
			<tr>\
				<td class='label'>Item Management Overhead</td>\
				<td class='value'>#{snapshot.instance.dram.Free}</td>\
				<td class='value'>#{snapshot.service.dram.Free}</td>\
			</tr>\
			<tr>\
				<td class='label heavyBottom'>Total Allocated</td>\
				<td class='value heavyBottom'>#{snapshot.instance.dram.Total}</td>\
				<td class='value heavyBottom'>#{snapshot.service.dram.Total}</td>\
			</tr>\
\
			<tr><td class='topLabel'>Flash</td>\
				<td class='topLabel hint' colspan=2>&nbsp;</td>\
			</tr>\
			<tr>\
				<td class='label'>Used Flash Memory</td>\
				<td class='value'>#{snapshot.instance.flash.Used}</td>\
				<td class='value'>#{snapshot.service.flash.Used}</td>\
			</tr>\
			<tr>\
				<td class='label'>Free Flash Memory</td>\
				<td class='value'>#{snapshot.instance.flash.Free}</td>\
				<td class='value'>#{snapshot.service.flash.Free}</td>\
			</tr>\
			<tr>\
				<td class='label heavyBottom'>Total Allocated</td>\
				<td class='value heavyBottom'>#{snapshot.instance.flash.Total}</td>\
				<td class='value heavyBottom'>#{snapshot.service.flash.Total}</td>\
			</tr>\
\
			<tr><td class='topLabel'>Item Count</td>\
				<td class='topLabel hint' colspan=2>&nbsp;</td>\
			</tr>\
			<tr>\
				<td class='label'>Items Used</td>\
				<td class='value'>#{snapshot.instance.items.Used}</td>\
				<td class='value'>#{snapshot.service.items.Used}</td>\
			</tr>\
			<tr>\
				<td round='mediumBL' class='label'>Items Allocated</td>\
				<td round='mediumBR' class='value'>#{snapshot.instance.items.Total}</td>\
				<td round='mediumBR' class='value'>#{snapshot.service.items.Total}</td>\
			</tr>\
		</table>"
	),
	
	UsageBarTemplate : new Template(
		"<div class='UsageGraph HBarGraph'>\
			<div class='GraphBar'>\
				<div style='background-color: rgb(134, 179, 0); width: #{snapshot.memoryUsage.FlashPercent}'\
					 class='BarSegment' title='Flash memory : #{snapshot.service.flash.Total}'>\
				</div><div style='background-color: rgb(244, 120, 54); width: #{snapshot.memoryUsage.BufferPercent};' \
					class='BarSegment' title='Item buffer : #{snapshot.service.dram.Used}'>\
				</div><div style='background-color: rgb(187, 187, 187); width: #{snapshot.memoryUsage.OverheadPercent};' \
					class='BarSegment' title='Item Mgmt : #{snapshot.service.dram.Free}'>\
				</div>\
			</div>\
\
			<table cellspacing='0' cellpadding='0' round='large' class='LegendTable'>\
			<tr>\
				<td class='ItemLabelTd'>\
					<span class='Title'>Total Size</span>\
					<br/>\
					<span item='0' class='DisplayValue'>#{snapshot.memoryUsage.Total}</span>\
				</td>\
				<td class='LegendSeparatorTd'><div></div></td>\
\
				<td class='ColorKeyTd'>\
					<div style='background-color: rgb(134, 179, 0);' class='ColorKey'></div>\
				</td>\
				<td class='ItemLabelTd'>\
					<span class='Title'>Flash memory</span>\
					<br/>\
					<span item='1' class='DisplayValue'>#{snapshot.service.flash.Total}</span>\
				</td>\
				<td class='LegendSeparatorTd'>\
					<div></div>\
				</td>\
				<td class='ColorKeyTd'>\
					<div style='background-color: rgb(244, 120, 54);' class='ColorKey'/>\
				</td>\
				<td class='ItemLabelTd'>\
					<span class='Title'>Item buffer</span>\
					<br/>\
					<span item='2' class='DisplayValue'>#{snapshot.service.dram.Used}</span>\
				</td>\
				<td class='LegendSeparatorTd'><div></div></td>\
\
				<td class='ColorKeyTd'>\
					<div style='background-color: rgb(187, 187, 187);' class='ColorKey'/>\
		 		</td>\
				<td class='ItemLabelTd'>\
					<span class='Title'>Item Mgmt</span>\
					<br/>\
					<span item='3' class='DisplayValue'>#{snapshot.service.dram.Free}</span>\
				</td>\
			</tr>\
			</table>\
		</div>"
	)
	
});


