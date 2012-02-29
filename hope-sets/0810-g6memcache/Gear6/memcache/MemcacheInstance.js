//
// add view methods/properties to the Gear6.MemcacheInstance class
//
Object.extend(Gear6.MemcacheInstance.prototype, {
	// debugUpdate : true,
	highlightParams : {
		hostnameHTML : "skip",
		ipHTML : "skip"
	},

	getMainElement : function() {
		if (!this.service._drawn) return [];
		var parent = this.service.$main;
		this.$mainElements = parent.select(".MemcacheInstance"+this.index);
		this.$main = this.$mainElements[0];
		return this.$mainElements;
	},

//	initializeProperties : function() {
//		this.id = this.ip;
//	},


	prepareToDraw : function(mode) {
		DataWidget.prototype.prepareToDraw.apply(this);
		var snapshot = this.snapshot;

		// mode is one of "normal", "master", "slave", "progress" or (null == "normal")
		if (mode == null) mode = "normal";

		snapshot.className = "MemcacheInstance"+this.index;		// TOCHECK
		snapshot.moduleTitle = (this.data.module == 0 ? "m--" : "m0"+this.data.module);

		if (this.service.isFlashEnabled()) {
			snapshot.graph = this.getFlashUsage(0);
		} else {
			snapshot.graph = this.getDramUsage(0);
		}
		
		if (this.isGear6Package() && this.service.data.enabled) {
			// make IPs be links to MCR/Statsproxy  IF gear6 + enabled
			snapshot.ipHTML			= this.IPTemplateG6.evaluate(this);
			snapshot.hostnameHTML	= this.HostNameTemplateG6.evaluate(this);
		} else {
			snapshot.ipHTML			= this.IPTemplate.evaluate(this);
			snapshot.hostnameHTML	= this.HostNameTemplate.evaluate(this);
		}

        if (window.capability == "admin") {
            snapshot.actionsHTML = this.ActionsTemplateAdmin.evaluate(this);
        } else {
            snapshot.actionsHTML = this.ActionsTemplateUnpriv.evaluate(this);
        }

		snapshot.usageGraphHTML = this.UsageGraphTemplate.evaluate(this);
		snapshot.usageHTML = this.UsageTemplate.evaluate(this);

		if (mode == "progress" || this.data.mirrorState == "initializing-slave") {
			var progress = this.data.syncItemsProcessed / this.data.syncItemsInitial;
			snapshot.progress = {
				Percent : (progress).toPercent(0, true) + "%"
			}
			snapshot.progress.graphHTML = this.ProgressGraphTemplate.evaluate(this);
            
		}
		return this;
	},

	// return the HTML for a row in 'normal' mode
	getNormalHTML : function() {
		this.prepareToDraw("normal");
		return this.NormalTemplate.evaluate(this);
	},

	// return the HTML for a row in 'initializing-master' mode
	getMasterHTML : function(masterRowSpan) {
		this.prepareToDraw("master");
		this.snapshot.masterRowSpan = masterRowSpan;
		return this.MasterTemplate.evaluate(this);
	},

	// return the HTML for a row in 'initializing-slave' mode
	getSlaveHTML : function() {
		this.prepareToDraw("slave");
		return this.SlaveTemplate.evaluate(this);
	},

	// return the progress graph HTML for a row in 'initializing-slave' mode
	getProgressHTML : function() {
		this.prepareToDraw("progress");
		return this.ProgressTemplate.evaluate(this);
	},

	//
	//	instance templates
	//
	NormalTemplate : new Template(
			"<tr class='MemcacheInstance MemcacheInstanceNormal #{snapshot.className}'>\
				<td class='MemcacheInstanceCell moduleCell' updateThis='moduleTitle'>#{snapshot.moduleTitle}</td>\
				<td class='MemcacheInstanceCell hostnameCell' updateThis='hostnameHTML'>#{snapshot.hostnameHTML}</td>\
				<td class='MemcacheInstanceCell ipCell' updateThis='ipHTML'>#{snapshot.ipHTML}</td>\
				<td class='MemcacheInstanceCell maskCell' updateThis='mask'>#{snapshot.mask}</td>\
				<td class='MemcacheInstanceCell usageGraphCell' updateThis='usageGraphHTML'>#{snapshot.usageGraphHTML}</td>\
				<td class='MemcacheInstanceCell usageCell' updateThis='usageHTML'>#{snapshot.usageHTML}</td>\
				<td class='MemcacheInstanceCell actionsCell'>#{snapshot.actionsHTML}</td>\
			</tr>"
	),

	MasterTemplate : new Template(
			"<tr class='MemcacheInstance MemcacheInstanceMaster #{snapshot.className}'>\
				<td class='MemcacheInstanceCell moduleCell' updateThis='moduleTitle' \
					rowspan='#{snapshot.masterRowSpan}'>#{snapshot.moduleTitle}</td>\
				<td class='MemcacheInstanceCell hostnameCell' updateThis='hostnameHTML'>#{snapshot.hostnameHTML}</td>\
				<td class='MemcacheInstanceCell ipCell' updateThis='ipHTML'>#{snapshot.ipHTML}</td>\
				<td class='MemcacheInstanceCell maskCell' updateThis='mask'>#{snapshot.mask}</td>\
				<td class='MemcacheInstanceCell usageGraphCell' updateThis='usageGraphHTML'\
					rowspan='#{snapshot.masterRowSpan}'>#{snapshot.usageGraphHTML}</td>\
				<td class='MemcacheInstanceCell usageCell' updateThis='usageHTML'\
					rowspan='#{snapshot.masterRowSpan}'>#{snapshot.usageHTML}</td>\
				<td class='MemcacheInstanceCell actionsCell'>#{snapshot.actionsHTML}</td>\
			</tr>"
	),

	SlaveTemplate : new Template(
			"<tr class='MemcacheInstance MemcacheInstanceSlave #{snapshot.className}'>\
				<td class='MemcacheInstanceCell hostnameCell' updateThis='hostnameHTML'>#{snapshot.hostnameHTML}</td>\
				<td class='MemcacheInstanceCell ipCell' updateThis='ipHTML'>#{snapshot.ipHTML}</td>\
				<td class='MemcacheInstanceCell maskCell' updateThis='mask'>#{snapshot.mask}</td>\
				<td class='MemcacheInstanceCell actionsCell'>#{snapshot.actionsHTML}</td>\
			</tr>"
	),

	ProgressTemplate : new Template(
		"<tr class='MemcacheInstanceProgress #{snapshot.className}'>\
			<td class='MemcacheInstanceCell moduleCell' updateThis='moduleTitle'>#{snapshot.moduleTitle}</td>\
			<td class='MemcacheInstanceCell progressCell' updateThis='progress.graphHTML' colspan='6'>\
				#{snapshot.progress.graphHTML}\
			</td> \
		</tr>"
	),

	ProgressGraphTemplate : new Template(
		"<div class='inline_block ProgressDisplay'>\
			Initializing Mirroring:\
			<div class='inline_block ProgressGraph'>\
				<div class='ProgressGraphUsed' style='width:#{snapshot.progress.Percent}'></div>\
			</div>\
			#{snapshot.progress.Percent} Complete\
		</div>"
	),

	UsageGraphTemplate : new Template(
		"<div class='MemcacheUsageGraph'\
			><div class='MemcacheUsageGraphUsed low' \
				style='width:#{snapshot.graph.Percent};'></div\
		></div>"
	),

	UsageTemplate : new Template(
		"#{snapshot.graph.Used} (#{snapshot.graph.Percent})"
	),


	ActionsTemplateAdmin : new Template(
		"<a href='javascript:#{service.globalRef}.onRemoveInstance(\"#{snapshot.ip}\")'>Remove</a>"
	),

	ActionsTemplateUnpriv : new Template(
		"<i>No&nbsp;Permission</i>"
	),

    // IP/Host should look like this: http://10.3.6.238:20480/index.html#category=basic&service=bbb-svc&instance=10.3.6.238:16385

	IPTemplateG6 : new Template(
		"<a href='http://#{snapshot.ip}:#{snapshot.statsport}/index.html#category=basic&service=#{service.id}&instance=#{snapshot.ip}:#{service.data.tcpPort}' target='_blank'>#{snapshot.ip}</a>"
	),

	IPTemplate : new Template(
		"<a href='http://#{snapshot.ip}:#{snapshot.statsport}/index.html#category=basic&service=#{service.id}&instance=#{snapshot.ip}:#{service.data.tcpPort}' target='_blank'>#{snapshot.ip}</a>"
	),

	HostNameTemplateG6 : new Template(
		"<a href='http://#{snapshot.ip}:#{snapshot.statsport}/index.html#category=basic&service=#{service.id}&instance=#{snapshot.ip}:#{service.data.tcpPort}' target='_blank'>#{snapshot.hostname}</a>"
	),

	HostNameTemplate : new Template(
		"<a href='http://#{snapshot.ip}:#{snapshot.statsport}/index.html#category=basic&service=#{service.id}&instance=#{snapshot.ip}:#{service.data.tcpPort}' target='_blank'>#{snapshot.hostname}</a>"
	)


});
