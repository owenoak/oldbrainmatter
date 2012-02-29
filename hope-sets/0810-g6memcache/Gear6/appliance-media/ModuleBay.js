//
// add view methods/properties to the Gear6.ModuleBay class
//
Object.extend(Gear6.ModuleBay.prototype, {
	updateDifferences 	: function(){ return !this.majorChange && this.module.expanded },

	// set to false to disable highlight flash when values change
	highlightDifferences : false,

	//
	highlightParams : {
		statusLink : "skip"
	},

	getMainElement : function() {
		var parent = this.module.$main;
		if (!parent) return;
		this.$main = $(this.id);
		return this.$main;
	},
	
	prepareToDraw : function() {
		DataWidget.prototype.prepareToDraw.apply(this, arguments);
		var snapshot = this.snapshot,
			data = this.data
		;

		// if status has changed to/from empty, we need a major redraw
		if (this.lastSnapshot && data.status != this.lastSnapshot.status) {
			if (this.debugUpdate) console.info(this,"changing status from ",
									this.lastSnapshot.status," to ",data.status);
				this.majorChange = true;
		}

		// if enabled has changed from true to false or vice versa, we
		// need a major redraw
		if (this.lastSnapshot && data.enabled != this.lastSnapshot.enabled) {
			if (this.debugUpdate) console.info(this,"changing enabled from ",
									this.lastSnapshot.enabled," to ",data.enabled);
				this.majorChange = true;
		}

		// if health has changed
		// need a major redraw
		if (this.lastSnapshot && data.health != this.lastSnapshot.health) {
			if (this.debugUpdate) console.info(this,"changing health from ",
									this.lastSnapshot.health," to ",data.health);
				this.majorChange = true;
		}
		
		// we're basically in one of four modes:
		//	* empty bay		-- "Empty"
		//	* flash drive	-- "Flash"
		//	* var disk		-- "System"
        //  * unknown disk  -- "Unknown"

        if (data.status == "empty") {
            snapshot.mode = "Empty";
        } else {
            switch (data.type) {
            case "cache device": 	snapshot.mode = "Flash"; break;
            case "OS var drive": 	snapshot.mode = "System"; break;
            case "OS boot drive": 	snapshot.mode = "System"; break;
            case "unknown":
            default:             	snapshot.mode = "Unknown"; break;
            }
        }
		snapshot.Status = data.status.capitalize();
		
		snapshot.Enabled = (this.enabled ? "Enabled" : "Disabled");
		snapshot.toggleEnabled = (this.enabled ? "Disable" : "Enable");

		snapshot.healthMode = (data.health == "warning" 
								? "Warning" 
								:	(data.health == "critical" ? "Critical" : "Normal")
						);

		snapshot.mainClassName = "MemcacheBay roundALLmedium " + snapshot.mode;
		snapshot.bayNum = this.index + 1;

		switch (snapshot.mode) {
			case "Flash":
			case "System":
            case "Unknown":				
                if (snapshot.mode == "Flash") {
                    // Flash specific stuff
				snapshot.title = data.g6Model;
				
				// lifetime graph
				var percent = Math.round(data.lifeRemain / 5) * 5;				// 5% chunks
				snapshot.lifetimePercent = Math.min(100, Math.max(0, percent));	// pin to 0-100
				snapshot.lifetimeHTML = this.LifetimeTemplate.evaluate(this);
				snapshot.lifetimeLabel = "Lifetime&nbsp;";
                } else if (snapshot.mode == "System") {
				// system-specific stuff
					snapshot.title = this.messages.systemTitle;
					snapshot.lifetimeHTML = this.DiskIconTemplate.evaluate(this);
					snapshot.lifetimeLabel = "&nbsp;";
				} else if (snapshot.mode == "Unknown") {
                    snapshot.title = this.messages.unknownTitle;
					snapshot.lifetimeHTML = this.DiskIconTemplate.evaluate(this);
					snapshot.lifetimeLabel = "&nbsp;";
				}

                // common to all drives
				snapshot.mainClassName += " " + snapshot.healthMode;

				// status (which is a button or empty)
				if 		(data.health == "critical") {
					snapshot.warningStatus = "Critical";
					snapshot.statusLink = this.module.WarningIconTemplate.evaluate(this);
				}
				else if (data.health == "warning")  {
					snapshot.warningStatus = "Warning";
					snapshot.statusLink = this.module.WarningIconTemplate.evaluate(this);
				}
				else {
					snapshot.warningStatus = "";
					snapshot.statusLink = " ";
				}


				switch (data.status) {
					case "online":
						var readBytes  = (data.readBytes || 0).toBytesString(),
							writeBytes = (data.writeBytes || 0).toBytesString()
						;
						
						snapshot.ioReadQty  = parseInt(readBytes);
						snapshot.ioWriteQty = parseInt(writeBytes);

						snapshot.ioReadUnits  = readBytes.split(" ")[1] || "";
						if (snapshot.ioReadUnits) 	snapshot.ioReadUnits += "/s";

						snapshot.ioWriteUnits = writeBytes.split(" ")[1] || "";
						if (snapshot.ioWriteUnits) 	snapshot.ioWriteUnits += "/s";
						
						snapshot.readTitle  = "Read: " + (data.readBytes  || 0).commaize() + " Bytes per second";
						snapshot.writeTitle = "Written: " + (data.writeBytes || 0).commaize() + " Bytes per second";
						
						snapshot.readHTML  = this.ReadBytesTemplate.evaluate(this);
						snapshot.writeHTML = this.WriteBytesTemplate.evaluate(this);
						
						// usage graph
						snapshot.usage = this.formatGraphData("dram", "DRAM", 
									data.totalBytes,
									data.allocBytes,
									"bytes", 0);
						snapshot.usageHTML = this.UsageGraphTemplate.evaluate(this);
						
						snapshot.innerHTML = this.DriveTemplate.evaluate(this);

						break;
					
					case "offline":
                        if (this.enabled) {
                                snapshot.usageHTML = this.messages.usage.offline;
                                snapshot.innerHTML = this.OfflineTemplate.evaluate(this);
                            } else {
                                snapshot.usageHTML = this.messages.usage.disabled;
                                snapshot.innerHTML = this.DisabledTemplate.evaluate(this);
                            }
						break;

					case "unknown":
						snapshot.usageHTML = this.messages.usage.unknown;
						snapshot.innerHTML = this.UnknownTemplate.evaluate(this);
						break;

					case "error":
						snapshot.usageHTML = this.messages.usage.error;
						snapshot.innerHTML = this.OfflineTemplate.evaluate(this);
						break;

				}// switch (data.status)
			
				break;
				
			case "Empty":
				snapshot.title = "&nbsp";
				snapshot.innerHTML = this.EmptyBayTemplate.evaluate(this);
		
		}// switch (snapshot.mode)
	},
	
	OuterTemplate : new Template(
		"<div id='#{id}' class='#{snapshot.mainClassName}' updateThis='mainClassName:class'>\
			<table class='MemcacheBayTable' cellspacing='0' cellpadding='0' border='0'>\
				<tr>\
					<td class='Header roundTOPmedium'>\
						<table class='headerTable #{snapshot.status}' updateThis='status:class' cellspacing=0 cellpadding=0><tr>\
							<td><div class='Title' title='Click for details' onclick='#{globalRef}.titleClick()'>#{snapshot.title}</div></td>\
							<td class='Status' updateThis='statusLink'>#{snapshot.statusLink}</td>\
							<td class='BayNum'>#{snapshot.name}</td>\
						</tr></table>\
					</td>\
				</tr>\
				<tr><td class='roundBLmedium'>\
						#{snapshot.innerHTML}\
					</td>\
				</tr>\
			</table>\
		</div>"	
	),

	DriveTemplate : new Template(
		"<table class='infoTable roundBLmedium' cellspacing=0 cellpadding=0 border=0>\
			<tr>\
				<td class='label topLabel innerLabelCell'>&nbsp;</td>\
				<td class='label topLabel ioCell'>I/O</td>\
				<td class='label topLabel usageCell'>Allocated</td>\
				<td class='label topLabel lifetimeCell'>#{snapshot.lifetimeLabel}</td>\
			</tr>\
			<tr>\
				<td class='label'> R:</td>\
				<td class='value ioReadQty' updateThis='readHTML' >#{snapshot.readHTML}</td>\
				<td class='usageCell value' updateThis='usageHTML' rowspan=2>\
					#{snapshot.usageHTML}\
				</td>\
				<td class='lifetimeCell value roundBRmedium' updateThis='lifetimeHTML' rowspan=2>\
					#{snapshot.lifetimeHTML}\
				</td>\
			</tr>\
			<tr>\
				<td class='label roundBLmedium'> W:</td>\
				<td class='value ioWriteQty' updateThis='writeHTML' >#{snapshot.writeHTML}</td>\
			</tr>\
		</table>"
	),

	OfflineTemplate : new Template(
		"<table class='infoTable roundBLmedium' cellspacing=0 cellpadding=0 border=0>\
			<tr>\
				<td class='offlineCell value' updateThis='usageHTML' rowspan='2'>\
					#{snapshot.usageHTML}\
				</td>\
				<td class='label topLabel lifetimeCell'>#{snapshot.lifetimeLabel}</td>\
			</tr>\
			<tr>\
				<td class='lifetimeCell value roundBRmedium' updateThis='lifetimeHTML' rowspan=2>\
					#{snapshot.lifetimeHTML}\
				</td>\
			</tr>\
		</table>"
	),
	
    DisabledTemplate : new Template(
		"<table class='infoTable roundBLmedium' cellspacing=0 cellpadding=0 border=0>\
			<tr>\
				<td class='unknownCell value' updateThis='usageHTML' rowspan='2'>\
					#{snapshot.usageHTML}\
				</td>\
				<td class='label topLabel lifetimeCell'>#{snapshot.lifetimeLabel}</td>\
			</tr>\
			<tr>\
				<td class='lifetimeCell value roundBRmedium' updateThis='lifetimeHTML' rowspan=2>\
					#{snapshot.lifetimeHTML}\
				</td>\
			</tr>\
		</table>"
	),
	
	EmptyBayTemplate : new Template(
		"<table class='infoTable roundBLmedium' cellspacing=0 cellpadding=0><tr>\
			<td class='roundBRmedium roundBLmedium EmptyBayMessage'>#{messages.emptyTitle}</td>\
		</tr></table>"
	),
	
	
	UsageGraphTemplate : new Template(
		"<div class='UsageGraph'>\
			<div style='width: #{snapshot.usage.Percent};' class='UsageGraphUsed low'></div>\
		</div>\
		<div class='hint'>#{snapshot.usage.Percent} <nobr>(#{snapshot.usage.Total})</nobr></div>"
	),
	
	ReadBytesTemplate : new Template(
		"<span title='#{snapshot.readTitle}' class='helpCursor'>\
			#{snapshot.ioReadQty}\
			<span class='hint ioUnits'>#{snapshot.ioReadUnits}</span>\
		</span>"
	),

	WriteBytesTemplate : new Template(
		"<span title='#{snapshot.writeTitle}' class='helpCursor'>\
			#{snapshot.ioWriteQty}\
			<span class='hint ioUnits'>#{snapshot.ioWriteUnits}</span>\
		</span>"
	),
	
	// lifetime graph
	LifetimeTemplate : new Template(
		"<span class='SpeedoGraphSmall SpeedoGraphSmall#{snapshot.lifetimePercent}'></span>"
	),
	
	DiskIconTemplate : new Template(
		"<span class='SpeedoDisk'></span>"
	),


	// they clicked on the title of this module
	titleClick : function() {	
		page.beginOperation("Gear6.ModuleBay.getDetails", 
                            {
                                moduleId:this.module.id,
                                bayId:this.data.name
                             });
	},

    // do toggling of a cache device's enable state
    toggleEnable : function() 
    {
        page.beginOperation("Gear6.ModuleBay.setEnable",
           {
                moduleId   : this.module.id,
                bayId      : this.data.name,
                g6SerialNo : this.data.g6SerialNo,
                enabled    : !(this.enabled)
          });
    },
	
	// they clicked the 'enable/disable' button
	toggleEnableClick : function() 
    {
        if (this.enabled && (this.data.status == "online")) { 
             g6Confirm("Confirm save", 
                       "Cache device "+this.data.g6SerialNo+" is online; "
                           +"Are you sure you want to disable it?",
                       "OK", "Cancel", 
                       this.toggleEnable.bind(this));
         } else {
             this.toggleEnable();
         }
	},
	
	setEnable : function(enabled) {
		this.enabled = enabled;
		if (!Gear6.ModuleBay.dialog || !Gear6.ModuleBay.dialog._drawn) return;

		// HACK -- make a unique id for the enable/disable cell so we can update it directly		
		var cell = $("g6DetailsEnableCell");
		if (!cell) return;

		cell.innerHTML = (enabled ? "Enabled" : "Disabled") + " " + 
						"(<a href='javascript:"+this.globalRef+".toggleEnableClick()'>" +
							(enabled ? "Disable" : "Enable") +
						"</a>)";
	},

	// Show details of one particular bay.
	//	Called after the server finishes loading the data to display
	showDetails : function(data) {
		this.prepareToDraw();
		this.prepareToDrawDetails(data);

		var html = this.DetailsTemplate.evaluate(this);
		var title = this.messages.detailsTitle.interpolate(this);
		
		// only create one dialog for all bays
		if (!Gear6.ModuleBay.dialog) {
			Gear6.ModuleBay.dialog = new Dialog();
		}
		
		Gear6.ModuleBay.dialog.show({
			dialogClassName:"BayDetailsDialog "+this.snapshot.warningStatus,
			title:title, 
			contents:html
		});
	},
	
	prepareToDrawDetails : function(data) {
		if (this.snapshot.mode == "System") {
			this.snapshot.g6Model = "System Drive";
			this.snapshot.lifetime = "---";
			this.snapshot.g6SerialNo = "---";
		} else {
			this.snapshot.lifetime = this.snapshot.lifeRemain+"%";
		}
		
		this.snapshot.bayNum = parseInt(this.data.id.match(/(\d+)/));

		this.snapshot.toggleEnable = (this.enabled ? "Disable" : "Enable");
        if (window.privileged == "0") {
            this.snapshot.enableDisabledHTML = this.EnabledDisabledTemplateUnpriv.evaluate(this);
        } else {
            this.snapshot.enableDisabledHTML = this.EnabledDisabledTemplate.evaluate(this);
        }

		var output = "", 
			bay = this,
			statusMap = {
				ok : "OK",
				warning : "Warning",
				critical : "Critical"
			}
		;
		data.forEach(function(row) {
			if (!row) return;
			row.health = statusMap[row.status];
			bay.snapshot.row = row;
			output += bay.DetailsRowTemplate.evaluate(bay);
		});
		this.snapshot.detailsRowsHTML = output;
		
		this.snapshot.warningStatus = this.snapshot.warningStatus || "OK";
	},

	// details view
	DetailsTemplate : new Template(
		"<div class='BayDetails'>\
				<table class='BayDetailsHeader #{snapshot.warningStatus} roundALLmedium' cellspacing='0' cellpadding='0'>\
				<tr>\
					<td class='label'>Model:</td>\
					<td class='value'>#{snapshot.g6Model}</td>\
					<td class='label'>Health:</td>\
					<td class='value'>#{snapshot.warningStatus}</td>\
				</tr>\
\
				<tr>\
					<td class='label'>Serial Number:</td>\
					<td class='value'>#{snapshot.g6SerialNo}</td>\
					<td class='label'>Status:</td>\
					<td class='value'>#{snapshot.Status}</td>\
				</tr>\
\
				<tr>\
					<td class='label'>Part Number:</td>\
					<td class='value'>#{snapshot.g6PartNo}</td>\
					<td class='label'>Enabled:</td>\
                    #{snapshot.enableDisabledHTML}\
				</tr>\
\
				<tr>\
					<td class='label'>Revision:</td>\
					<td class='value'>#{snapshot.g6Revision}</td>\
					<td class='label'>Estimated Life Remaining:</td>\
					<td class='value'>#{snapshot.lifetime}</td>\
				</tr>\
\
				<tr>\
					<td class='label'>Firmware Version:</td>\
					<td class='value'>#{snapshot.firmware}</td>\
					<td class='label'>Allocated/Total:</td>\
					<td class='value'>#{snapshot.usage.Used} / #{snapshot.usage.Total} (#{snapshot.usage.Percent})</td>\
				</tr>\
			</table>\
			<table class='BayDetailsBody roundALLmedium' cellspacing='0' cellpadding='0'>\
				<tr>\
					<td class='label Name'>SMART Attribute</td>\
					<td class='label Type'>Type</td>\
					<td class='label Raw'>Raw Value</td>\
					<td class='label Normal'>Normal</td>\
					<td class='label Thres'>Thres</td>\
					<td class='label Status'>Status</td>\
				</tr>\
				#{snapshot.detailsRowsHTML}\
			</table>\
		</div>"
	),
	
    EnabledDisabledTemplate : new Template(
        "<td class='value' id='g6DetailsEnableCell'>#{snapshot.Enabled} \
			(<a href='javascript:#{globalRef}.toggleEnableClick()'>#{snapshot.toggleEnable}</a>)\
		</td>"
    ), 

    EnabledDisabledTemplateUnpriv : new Template(
        "<td class='value' id='g6DetailsEnableCell'>#{snapshot.Enabled}</td>"
    ),

	DetailsRowTemplate : new Template(
		"<tr class='#{snapshot.row.health}'>\
			<td class='value Name'>#{snapshot.row.name}</td>\
			<td class='value Type'>#{snapshot.row.type}</td>\
			<td class='value Raw'>#{snapshot.row.raw}</td>\
			<td class='value Normal'>#{snapshot.row.norm}</td>\
			<td class='value Thres'>#{snapshot.row.thresh}</td>\
			<td class='value Status'>#{snapshot.row.health}</td>\
		</tr>\n"
	)

});
